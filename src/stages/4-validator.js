/**
 * Stage 4: Blueprint Validator
 *
 * STAGE NUMBERING NOTE:
 * This file is numbered "4-validator.js" even though it's Stage 3 in the pipeline.
 * The numbering reflects the historical evolution of the codebase:
 *
 * Original pipeline (5 stages):
 *   1. Analyzer (prompt analysis)
 *   2. Planner (design planning)
 *   3. Generator (blueprint generation)
 *   4. Validator (this file)
 *   5. Builder (execution)
 *
 * Optimized pipeline (3 stages):
 *   1. Analyzer (prompt analysis)
 *   2. Generator (unified design + blueprint generation in single LLM call)
 *   4. Validator (validation + repair) ← kept original numbering
 *   5. Builder (execution)
 *
 * The file is named "4-validator.js" to maintain consistency with existing documentation,
 * tests, and deployment scripts that reference this stage number.
 */

import { validateBlueprint as validateBlueprintSchema, getValidationErrors } from '../config/schemas.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { GeminiClient } from '../llm/gemini-client.js';
import { WorldEditValidator } from '../validation/worldedit-validator.js';
import { QualityValidator } from '../validation/quality-validator.js';
import { validateGeometry } from '../validation/geometry-validator.js';
import { validateTreeQuality, fixTreeQuality, isOrganicBuild } from '../validation/organic-quality.js';
import { validateConnectivity, formatConnectivityIssuesForRepair } from '../validation/spatial-validator.js';
import { getOperationMetadata } from '../config/operations-registry.js';
import { isValidBlock } from '../config/blocks.js';
import { normalizeBlueprint } from '../utils/normalizer.js';
import { getResolvedVersion } from '../config/version-resolver.js';
import {
  getValidationProfile,
  detectBuildType,
  validateWithProfile,
  validateStructuralRequirements
} from '../validation/validation-profiles.js';

// Debug mode - set via environment variable
const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';
const DEBUG_VALIDATION = process.env.BOB_DEBUG_VALIDATION === 'true';

/**
 * Log validation stage with timestamp (for DEBUG_VALIDATION)
 */
function logValidationStage(stage, result) {
  if (!DEBUG_VALIDATION) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VAL ${ts}] Stage ${stage}: ${result.errors?.length || 0} errors`);
}

// Creative build types where allowlist is optional (LLM picks blocks freely)
const CREATIVE_BUILD_TYPES = [
  'pixel_art', 'statue', 'character', 'art', 'logo',
  'design', 'custom', 'sculpture', 'monument', 'figure'
];

/**
 * Validate and repair blueprint
 * @param {Object} blueprint - Generated blueprint from Stage 2
 * @param {Object} analysis - Prompt analysis from Stage 1
 * @param {string} apiKey - Gemini API key (for LLM-based repairs)
 * @returns {Promise<Object>} - Validation result with repaired blueprint
 */
export async function validateBlueprint(blueprint, analysis, apiKey) {
  let retries = 0;
  let qualityScore = null;

  if (DEBUG) {
    console.log('\n┌─────────────────────────────────────────────────────────');
    console.log('│ DEBUG: Blueprint Validation Starting');
    console.log('├─────────────────────────────────────────────────────────');
    console.log(`│ Blueprint steps: ${blueprint.steps?.length || 0}`);
    console.log(`│ Build Type: ${analysis.buildType}`);
    console.log(`│ Features: ${analysis.hints?.features?.join(', ') || 'none'}`);
    console.log(`│ Max retries: ${SAFETY_LIMITS.maxRetries}`);
    console.log('└─────────────────────────────────────────────────────────\n');
  }

  // Phase 0: Required Fields Check (fail fast)
  const requiredFieldsErrors = validateRequiredFields(blueprint);
  if (requiredFieldsErrors.length > 0) {
    logValidationStage('RequiredFields', { errors: requiredFieldsErrors });
    console.error('Blueprint missing required fields:');
    requiredFieldsErrors.forEach(err => console.error(`   - ${err}`));
    return {
      valid: false,
      blueprint,
      errors: requiredFieldsErrors
    };
  }

  // Phase 1: Normalization (before validation loop)
  const normResult = normalizeBlueprint(blueprint);
  logValidationStage('Normalization', { errors: normResult.errors });

  if (normResult.changes.length > 0 && DEBUG) {
    console.log('Normalization changes:', normResult.changes);
  }

  // Unresolved placeholders are critical errors
  if (normResult.errors.length > 0) {
    console.error('Normalization errors (unresolved placeholders):');
    normResult.errors.forEach(err => console.error(`   - ${err}`));
    return {
      valid: false,
      blueprint,
      errors: normResult.errors
    };
  }

  let currentBlueprint = normResult.blueprint;

  while (retries < SAFETY_LIMITS.maxRetries) {
    const errors = [];
    const buildType = analysis?.buildType || 'house';

    // ═══════════════════════════════════════════════════════════════════════════
    // PARALLEL VALIDATION: Run independent validation phases concurrently
    // Performance optimization from CLAUDE.md Priority 2
    // ═══════════════════════════════════════════════════════════════════════════

    // Define all parallelizable validation phases
    const parallelValidations = [
      // 1. JSON Schema Validation
      async () => {
        const isValidSchema = validateBlueprintSchema(currentBlueprint);
        if (!isValidSchema) {
          return getValidationErrors(validateBlueprintSchema).map(e => `Schema: ${e}`);
        }
        return [];
      },

      // 2. Block Validation (Minecraft blocks)
      async () => {
        const invalidMinecraftBlocks = validateMinecraftBlocks(currentBlueprint);
        logValidationStage('BlockValidation', { errors: invalidMinecraftBlocks.length > 0 ? ['block errors'] : [] });
        if (invalidMinecraftBlocks.length > 0) {
          return [`Invalid Minecraft blocks: ${invalidMinecraftBlocks.join(', ')}`];
        }
        return [];
      },

      // 2.5. Placeholder Token Validation
      async () => {
        const placeholderErrors = validateNoPlaceholderTokens(currentBlueprint);
        logValidationStage('PlaceholderValidation', { errors: placeholderErrors });
        return placeholderErrors;
      },

      // 3. Operation parameter validation
      async () => validateOperationParams(currentBlueprint),

      // 4. Coordinate Bounds Checking
      async () => validateCoordinateBounds(currentBlueprint, analysis),

      // 5. Feature Completeness Check
      async () => validateFeatures(currentBlueprint, analysis),

      // 5.5. Build-type-specific operation validation
      async () => validateBuildTypeOperations(currentBlueprint, analysis),

      // 5.6. Geometry validation
      async () => {
        const geometryResult = validateGeometry(currentBlueprint, buildType);
        return geometryResult.valid ? [] : geometryResult.errors;
      },

      // 6. Volume and Step Limits
      async () => validateLimits(currentBlueprint),

      // 7. WorldEdit Validation (returns object with errors and stats)
      async () => {
        const weResult = WorldEditValidator.validateWorldEditOps(currentBlueprint);
        return { type: 'worldedit', ...weResult };
      },

      // 8. Profile-Based Validation
      async () => {
        const detectedBuildType = detectBuildType(currentBlueprint, analysis);
        const profile = getValidationProfile(detectedBuildType);
        const profileResult = validateWithProfile(currentBlueprint, {
          buildType: detectedBuildType,
          intent: analysis
        });
        logValidationStage('ProfileValidation', {
          errors: profileResult.errors,
          profile: profile.id,
          qualityScore: profileResult.qualityScore
        });
        return { type: 'profile', profile, ...profileResult };
      },

      // 8.5. Legacy Quality Validation
      async () => {
        const quality = QualityValidator.scoreBlueprint(currentBlueprint, analysis);
        return { type: 'quality', ...quality };
      },

      // 9. CSD Phase Balance Validation (CLAUDE.md: Core → Structure → Detail)
      async () => {
        const csdResult = validateCSDPhaseBalance(currentBlueprint);
        logValidationStage('CSDPhaseBalance', { errors: csdResult.warnings });
        return { type: 'csd', ...csdResult };
      }
    ];

    // Run all validations in parallel
    const parallelResults = await Promise.all(parallelValidations.map(fn => fn()));

    // Process parallel results
    let weValidation = { valid: true, errors: [], stats: {} };
    let profileValidation = { errors: [], warnings: [], qualityScore: 1, safetyPassed: true };
    let profile = { id: 'default', name: 'Default' };

    for (const result of parallelResults) {
      if (Array.isArray(result)) {
        // Simple error array
        errors.push(...result);
      } else if (result?.type === 'worldedit') {
        // WorldEdit result
        weValidation = result;
        if (!result.valid) {
          errors.push(...result.errors);
        }
      } else if (result?.type === 'profile') {
        // Profile validation result
        profileValidation = result;
        profile = result.profile;
        if (result.errors.length > 0) {
          errors.push(...result.errors.map(e =>
            typeof e === 'string' ? e : `${e.code}: ${e.message}`
          ));
        }
        if (DEBUG) {
          console.log(`  [Profile] Using validation profile: ${profile.name} (${profile.id})`);
          console.log(`  [Profile] Quality score: ${(result.qualityScore * 100).toFixed(1)}%`);
          if (result.warnings.length > 0) {
            console.log(`  [Profile] Warnings: ${result.warnings.map(w => w.message).join(', ')}`);
          }
        }
      } else if (result?.type === 'quality') {
        // Quality score result (handled below)
        qualityScore = result;
      } else if (result?.type === 'csd') {
        // CSD Phase Balance result (warnings only, no hard failures per CLAUDE.md)
        if (DEBUG && result.warnings?.length > 0) {
          console.log('  [CSD] Phase balance warnings:');
          for (const warning of result.warnings) {
            console.log(`    ⚠ ${warning.code}: ${warning.message}`);
          }
          if (result.percentages) {
            console.log(`    Phase distribution: Core=${result.percentages.core.toFixed(1)}%, Structure=${result.percentages.structure.toFixed(1)}%, Detail=${result.percentages.detail.toFixed(1)}%`);
          }
        }
        // Store CSD info on blueprint for downstream use (non-blocking)
        currentBlueprint._csdPhases = result.phases;
        currentBlueprint._csdWarnings = result.warnings;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SEQUENTIAL POST-PROCESSING: Phases with side effects run after parallel
    // ═══════════════════════════════════════════════════════════════════════════

    // 5.7. Organic quality validation (may auto-fix - must run sequentially)
    if (isOrganicBuild({ buildType })) {
      let organicResult = validateTreeQuality(currentBlueprint);
      let autoFixed = false;

      if (organicResult && !organicResult.valid && organicResult.checks?.noUnnaturalGeometry?.passed === false) {
        currentBlueprint = fixTreeQuality(currentBlueprint);
        autoFixed = true;
        organicResult = validateTreeQuality(currentBlueprint);
        if (DEBUG) {
          console.log('  -> Auto-fixed organic quality issues');
        }
      }

      if (!organicResult.valid) {
        errors.push(...organicResult.errors.map(e => `Organic quality: ${e}`));
      } else if (autoFixed && DEBUG) {
        console.log('  -> Organic quality re-check passed after fixes');
      }
    }

    // 5.8. Spatial connectivity validation (stores issues on blueprint)
    // Skip connectivity checks for organic builds (trees, nature) where floating is natural
    const organicBuildTypes = ['tree', 'organic', 'nature', 'plant', 'terrain', 'landscape'];
    const isOrganicBuildType = organicBuildTypes.includes(currentBlueprint.buildType?.toLowerCase());

    if (!isOrganicBuildType) {
      const connectivityResult = validateConnectivity(currentBlueprint, { verbose: DEBUG });
      logValidationStage('Connectivity', { errors: connectivityResult.issues });
      if (connectivityResult.hasWarnings) {
        // Store connectivity issues for potential repair prompt enhancement
        currentBlueprint._connectivityIssues = connectivityResult.issues;

        // Only add as errors if there are severe issues
        const severeIssues = connectivityResult.issues.filter(i => i.severity === 'error');
        if (severeIssues.length > 0) {
          errors.push(...severeIssues.map(i => `Connectivity: ${i.message}`));
        }

        // Log warnings even if not blocking
        if (DEBUG && connectivityResult.issues.length > 0) {
          console.log('  [Spatial] Connectivity warnings:');
          for (const issue of connectivityResult.issues) {
            console.log(`    [${issue.severity}] ${issue.type}: ${issue.message}`);
          }
        }
      }
    } else if (DEBUG) {
      console.log('  [Spatial] Skipping connectivity validation for organic build type:', currentBlueprint.buildType);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QUALITY SCORING: Combine profile and legacy quality scores
    // ═══════════════════════════════════════════════════════════════════════════

    // Combine profile quality with legacy quality
    const combinedQualityScore = Math.min(profileValidation.qualityScore, qualityScore?.score || 1);

    // Only fail on quality if profile says it should AND legacy validator agrees
    if (SAFETY_LIMITS.requireFeatureCompletion && !profileValidation.safetyPassed) {
      errors.push(
        `Blueprint fails safety checks for profile '${profile.name}'`
      );
    }

    // Quality warnings (non-blocking) from profile
    if (profileValidation.warnings.length > 0 && DEBUG) {
      console.log('  [Profile] Quality warnings (non-blocking):');
      for (const warning of profileValidation.warnings) {
        console.log(`    - ${warning.code}: ${warning.message}`);
      }
    }

    // Store combined quality info
    qualityScore = {
      ...qualityScore,
      profileScore: profileValidation.qualityScore,
      profileGrade: profileValidation.qualityGrade,
      profile: profile.id,
      combinedScore: combinedQualityScore,
      passed: combinedQualityScore >= SAFETY_LIMITS.minQualityScore
    };

    // If no errors, validation successful
    if (errors.length === 0) {
      console.log('✓ Blueprint validation passed');
      console.log(`  Quality score: ${(qualityScore.score * 100).toFixed(1)}%`);
      if (weValidation.stats.worldEditCommands > 0) {
        console.log(`  WorldEdit commands: ${weValidation.stats.worldEditCommands}`);
        console.log(`  WorldEdit blocks: ${weValidation.stats.worldEditBlocks}`);
      }
      console.log(`  Total operations: ${currentBlueprint.steps.length}`);

      if (DEBUG) {
        console.log('\n┌─────────────────────────────────────────────────────────');
        console.log('│ DEBUG: Validation PASSED');
        console.log('├─────────────────────────────────────────────────────────');
        console.log(`│ Attempts: ${retries + 1}`);
        console.log(`│ Quality: ${(qualityScore.score * 100).toFixed(1)}%`);
        console.log(`│ Quality bonuses: ${qualityScore.bonuses?.join(', ') || 'none'}`);
        console.log('└─────────────────────────────────────────────────────────\n');
      }

      return {
        valid: true,
        blueprint: currentBlueprint,
        errors: [],
        quality: qualityScore,
        worldedit: weValidation.stats
      };
    }

    if (retries < SAFETY_LIMITS.maxRetries - 1) {
      console.log(`⚠ Validation failed (attempt ${retries + 1}/${SAFETY_LIMITS.maxRetries})`);
      errors.forEach(err => console.log(`   - ${err}`));
      if (qualityScore) {
        console.log(`  Quality score: ${(qualityScore.score * 100).toFixed(1)}%`);
      }
      console.log('  Attempting repair...');

      if (DEBUG) {
        console.log('\n┌─────────────────────────────────────────────────────────');
        console.log(`│ DEBUG: Validation FAILED - Attempt ${retries + 1}/${SAFETY_LIMITS.maxRetries}`);
        console.log('├─────────────────────────────────────────────────────────');
        console.log('│ Errors:');
        for (const err of errors) {
          console.log(`│   • ${err}`);
        }
        if (qualityScore?.penalties?.length > 0) {
          console.log('│ Quality Penalties:');
          for (const penalty of qualityScore.penalties) {
            console.log(`│   • ${penalty}`);
          }
        }
        console.log('├─────────────────────────────────────────────────────────');
        console.log('│ Attempting LLM repair...');
        console.log('└─────────────────────────────────────────────────────────\n');
      }

      try {
        const client = new GeminiClient(apiKey);

        // Enhance errors with connectivity issue details if present
        let enhancedErrors = [...errors];
        if (currentBlueprint._connectivityIssues?.length > 0) {
          const connectivityDetails = formatConnectivityIssuesForRepair(currentBlueprint._connectivityIssues);
          enhancedErrors.push(connectivityDetails);
        }

        currentBlueprint = await client.repairBlueprint(
          currentBlueprint,
          enhancedErrors,
          analysis,
          qualityScore
        );
        retries++;

        if (DEBUG) {
          console.log('\n┌─────────────────────────────────────────────────────────');
          console.log('│ DEBUG: Repair Response Received');
          console.log('├─────────────────────────────────────────────────────────');
          console.log(`│ New steps count: ${currentBlueprint.steps?.length || 0}`);
          const paletteInfo = currentBlueprint.palette
            ? (Array.isArray(currentBlueprint.palette)
              ? currentBlueprint.palette.join(', ')
              : `${Object.keys(currentBlueprint.palette).length} types`)
            : 'none';
          console.log(`│ New palette: ${paletteInfo}`);
          console.log('└─────────────────────────────────────────────────────────\n');
        }
      } catch (repairError) {
        console.error(`  Repair failed: ${repairError.message}`);
        if (DEBUG) {
          console.log('\n┌─────────────────────────────────────────────────────────');
          console.log('│ DEBUG: Repair FAILED');
          console.log('├─────────────────────────────────────────────────────────');
          console.log(`│ Error: ${repairError.message}`);
          console.log('└─────────────────────────────────────────────────────────\n');
        }
        break;
      }
    } else {
      break;
    }
  }

  // Final validation failed
  const finalErrors = [];
  if (!validateBlueprintSchema(currentBlueprint)) {
    finalErrors.push(...getValidationErrors(validateBlueprintSchema));
  }

  // Block validation (Minecraft blocks only - no allowlist)
  const finalInvalidMinecraft = validateMinecraftBlocks(currentBlueprint);
  if (finalInvalidMinecraft.length > 0) {
    finalErrors.push(`Invalid Minecraft blocks: ${finalInvalidMinecraft.join(', ')}`);
  }

  finalErrors.push(...validateOperationParams(currentBlueprint));
  finalErrors.push(...validateCoordinateBounds(currentBlueprint, analysis));
  finalErrors.push(...validateFeatures(currentBlueprint, analysis));
  finalErrors.push(...validateLimits(currentBlueprint));

  console.error('Blueprint validation failed after all retries');
  console.error('  Final errors:');
  finalErrors.forEach(err => console.error(`   - ${err}`));

  return {
    valid: false,
    blueprint: currentBlueprint,
    errors: finalErrors
  };
}

function validateOperationParams(blueprint) {
  const errors = [];

  for (let i = 0; i < (blueprint.steps || []).length; i++) {
    const step = blueprint.steps[i];
    const meta = getOperationMetadata(step.op);
    if (!meta) {
      errors.push(`Step ${i}: Unknown operation '${step.op}'`);
      continue;
    }

    errors.push(...validateStepParams(step, meta, `Step ${i}`));

    if (step.fallback) {
      if (!step.fallback.op) {
        errors.push(`Step ${i}: Fallback missing op`);
      } else {
        const fallbackMeta = getOperationMetadata(step.fallback.op);
        if (!fallbackMeta) {
          errors.push(`Step ${i}: Unknown fallback operation '${step.fallback.op}'`);
        } else {
          errors.push(...validateStepParams(step.fallback, fallbackMeta, `Step ${i} fallback`));
        }
      }
    }
  }

  return errors;
}

function validateStepParams(step, meta, label) {
  const errors = [];

  if (meta.requiredParams) {
    for (const param of meta.requiredParams) {
      if (step[param] === undefined || step[param] === null) {
        errors.push(`${label}: Missing required param '${param}'`);
      }
    }
  }

  if (meta.requiredOneOf) {
    for (const group of meta.requiredOneOf) {
      const hasAny = group.some((param) => step[param] !== undefined && step[param] !== null);
      if (!hasAny) {
        errors.push(`${label}: Missing one of [${group.join(', ')}]`);
      }
    }
  }

  if (meta.blockSuffix && step.block && !step.block.includes(meta.blockSuffix)) {
    errors.push(`${label}: Block '${step.block}' must include '${meta.blockSuffix}'`);
  }

  return errors;
}

/**
 * Validate that no unresolved placeholder tokens remain in the blueprint
 * Placeholders like $primary, $secondary must be resolved from palette
 */
function validateNoPlaceholderTokens(blueprint) {
  const errors = [];
  const PLACEHOLDER_REGEX = /^\$\w+$/;

  for (let i = 0; i < (blueprint.steps || []).length; i++) {
    const step = blueprint.steps[i];
    if (step.block && PLACEHOLDER_REGEX.test(step.block)) {
      const key = step.block.substring(1);
      if (!blueprint.palette?.[key]) {
        errors.push(`Step ${i}: Unresolved placeholder '${step.block}' not in palette`);
      }
    }
    // Check fallback too
    if (step.fallback?.block && PLACEHOLDER_REGEX.test(step.fallback.block)) {
      const key = step.fallback.block.substring(1);
      if (!blueprint.palette?.[key]) {
        errors.push(`Step ${i} fallback: Unresolved placeholder '${step.fallback.block}' not in palette`);
      }
    }
  }
  return errors;
}

/**
 * Validate that required fields are present in the blueprint
 * This is a fail-fast check before other validations
 */
function validateRequiredFields(blueprint) {
  const errors = [];

  if (!blueprint) {
    errors.push('Missing required field: blueprint is null or undefined');
    return errors;
  }

  // Check palette
  if (!blueprint.palette ||
    (Array.isArray(blueprint.palette) && blueprint.palette.length === 0) ||
    (typeof blueprint.palette === 'object' && !Array.isArray(blueprint.palette) && Object.keys(blueprint.palette).length === 0)) {
    errors.push('Missing required field: palette (must be non-empty array or object)');
  }

  // Check size
  if (!blueprint.size) {
    errors.push('Missing required field: size');
  } else {
    if (!blueprint.size.width || blueprint.size.width <= 0) {
      errors.push('Missing required field: size.width (must be positive integer)');
    }
    if (!blueprint.size.height || blueprint.size.height <= 0) {
      errors.push('Missing required field: size.height (must be positive integer)');
    }
    if (!blueprint.size.depth || blueprint.size.depth <= 0) {
      errors.push('Missing required field: size.depth (must be positive integer)');
    }
  }

  // Check steps
  if (!blueprint.steps || !Array.isArray(blueprint.steps) || blueprint.steps.length === 0) {
    errors.push('Missing required field: steps (must be non-empty array)');
  }

  return errors;
}

/**
 * Validate that all blocks are valid Minecraft blocks
 * This allows ANY valid Minecraft block (no allowlist restrictions)
 */
function validateMinecraftBlocks(blueprint, minecraftVersion = null) {
  // Use resolved version or fallback to 1.20.1
  let version;
  try {
    version = minecraftVersion || getResolvedVersion();
  } catch {
    version = '1.20.1'; // Fallback if resolver not initialized
  }
  const invalidBlocks = [];

  // Check palette - handle both array and object formats
  if (blueprint.palette) {
    const paletteBlocks = Array.isArray(blueprint.palette)
      ? blueprint.palette
      : Object.values(blueprint.palette);

    for (const block of paletteBlocks) {
      if (!isValidBlock(block, version)) {
        invalidBlocks.push(block);
      }
    }
  }

  // Check steps
  for (const step of blueprint.steps || []) {
    if (step.block && !isValidBlock(step.block, version)) {
      if (!invalidBlocks.includes(step.block)) {
        invalidBlocks.push(step.block);
      }
    }
  }

  return invalidBlocks;
}

/**
 * CSD Phase Classification v1.1
 * Classifies operations into CORE, STRUCTURE, or DETAIL phases
 * per CLAUDE.md "Core → Structure → Detail (CSD) Build Philosophy"
 *
 * v1.1 Hygiene fixes:
 * - Added missing ops: fill, hollow_box, smart_wall, smart_floor, pixel_art
 * - Added EXCLUDED list for movement/system ops that don't count toward totals
 */
const CSD_PHASE_CLASSIFICATION = {
  // CORE: Primary mass operations (25-35% of build)
  // Large volume fills that establish the bounding shape
  CORE: ['we_fill', 'we_walls', 'we_cylinder', 'we_sphere', 'we_pyramid',
         'box', 'wall', 'fill', 'hollow_box'],

  // STRUCTURE: Secondary forms that break up core (30-40% of build)
  // Intermediate complexity, roofs, procedural surfaces
  STRUCTURE: ['three_d_layers', 'roof_gable', 'roof_hip', 'roof_flat', 'smart_roof',
              'outline', 'smart_wall', 'smart_floor', 'we_replace'],

  // DETAIL: Texture, accents, carving (30-40% of build, MANDATORY)
  // Fine-grained ops, single blocks, creative pixel work
  DETAIL: ['set', 'line', 'slab', 'stairs', 'door', 'window_strip', 'fence_connect',
           'balcony', 'spiral_staircase', 'lantern', 'trapdoor', 'flower_pot',
           'pixel_art'],

  // EXCLUDED: Movement and system ops that don't represent build content
  // These are filtered out before calculating phase percentages
  EXCLUDED: ['move', 'cursor_reset', 'site_prep']
};

/**
 * Classify a single operation into CSD phase
 * @param {Object} step - Blueprint operation step
 * @returns {string|null} - 'CORE', 'STRUCTURE', 'DETAIL', or null for excluded ops
 */
function classifyCSDPhase(step) {
  if (!step || !step.op) return 'DETAIL'; // Default to detail for safety

  const op = step.op.toLowerCase();

  // EXCLUDED: Movement and system ops don't count toward CSD balance
  if (CSD_PHASE_CLASSIFICATION.EXCLUDED.includes(op)) return null;

  // Any operation using "air" block is DETAIL (carving)
  if (step.block === 'air') return 'DETAIL';

  if (CSD_PHASE_CLASSIFICATION.CORE.includes(op)) return 'CORE';
  if (CSD_PHASE_CLASSIFICATION.STRUCTURE.includes(op)) return 'STRUCTURE';
  if (CSD_PHASE_CLASSIFICATION.DETAIL.includes(op)) return 'DETAIL';

  // Default: unrecognized ops fall to STRUCTURE (conservative)
  return 'STRUCTURE';
}

/**
 * Validate CSD phase balance per CLAUDE.md requirements
 * Returns WARNINGS only (no hard failures per implementation rules)
 *
 * Contract thresholds:
 * - CORE: 25-35%
 * - STRUCTURE: 30-40%
 * - DETAIL: 30-40% (MANDATORY, minimum 10 operations)
 */
function validateCSDPhaseBalance(blueprint) {
  const warnings = [];
  const steps = blueprint.steps || [];

  if (steps.length === 0) return { warnings, phases: {}, excluded: 0 };

  // Classify all steps, filtering out EXCLUDED ops (movement, system)
  const phases = { CORE: 0, STRUCTURE: 0, DETAIL: 0 };
  let excludedCount = 0;

  for (const step of steps) {
    const phase = classifyCSDPhase(step);
    if (phase === null) {
      excludedCount++;
    } else {
      phases[phase]++;
    }
  }

  // Total for percentage calculation excludes movement/system ops
  const total = phases.CORE + phases.STRUCTURE + phases.DETAIL;

  // Edge case: all ops were excluded (e.g., pure cursor movement blueprint)
  if (total === 0) {
    return { warnings, phases, excluded: excludedCount, percentages: { core: 0, structure: 0, detail: 0 } };
  }

  const detailPercent = (phases.DETAIL / total) * 100;
  const corePercent = (phases.CORE / total) * 100;

  // Check DETAIL minimum (CLAUDE.md: "fewer than 10 detail operations = FAILED")
  // Per instruction: emit WARNING only, not hard failure
  if (phases.DETAIL < 10) {
    warnings.push({
      code: 'CSD_DETAIL_COUNT',
      message: `Detail phase has only ${phases.DETAIL} operations (minimum: 10). Build may appear flat or unfinished.`,
      severity: 'warning'
    });
  }

  // Check DETAIL percentage (CLAUDE.md: 30-40%)
  if (detailPercent < 25) {
    warnings.push({
      code: 'CSD_DETAIL_PERCENT',
      message: `Detail phase is ${detailPercent.toFixed(1)}% of operations (expected: 30-40%). Consider adding texture, accents, or carving.`,
      severity: 'warning'
    });
  }

  // Check CORE percentage (shouldn't dominate)
  if (corePercent > 50) {
    warnings.push({
      code: 'CSD_CORE_HEAVY',
      message: `Core phase is ${corePercent.toFixed(1)}% of operations (expected: 25-35%). Build may appear boxy or simplistic.`,
      severity: 'warning'
    });
  }

  return {
    warnings,
    phases,
    excluded: excludedCount,
    percentages: {
      core: corePercent,
      structure: (phases.STRUCTURE / total) * 100,
      detail: detailPercent
    }
  };
}

/**
 * Build-type-specific operation guidance
 * Provides warnings instead of strict enforcement
 */
const BUILD_TYPE_OPERATION_GUIDANCE = {
  tree: {
    avoid: ['window_strip', 'door', 'roof_gable', 'roof_hip', 'roof_flat', 'we_walls', 'we_pyramid', 'balcony', 'spiral_staircase'],
    reason: 'Trees typically use fill/we_fill for volumes, line for branches'
  },
  statue: {
    avoid: ['window_strip', 'roof_gable', 'roof_hip', 'roof_flat', 'door'],
    reason: 'Statues use fill/set/we_sphere for organic sculpting'
  },
  pixel_art: {
    avoid: ['hollow_box', 'roof_gable', 'we_sphere', 'we_cylinder'],
    reason: 'Pixel art should use pixel_art operation or set operations'
  },
  house: {
    recommended: ['hollow_box', 'door', 'window_strip', 'roof_gable'],
    reason: 'Houses should have walls, door, windows, roof'
  }
};

/**
 * Validate that blueprint uses appropriate operations for its build type
 * Provides warnings instead of hard errors
 */
function validateBuildTypeOperations(blueprint, analysis) {
  const errors = [];
  const buildType = analysis?.buildType;

  if (!buildType || !BUILD_TYPE_OPERATION_GUIDANCE[buildType]) {
    return errors; // No guidance for this build type
  }

  const guidance = BUILD_TYPE_OPERATION_GUIDANCE[buildType];
  const usedOps = blueprint.steps?.map(s => s.op) || [];

  // Check avoided operations (warnings, not hard errors)
  if (guidance.avoid) {
    const unexpectedOps = usedOps.filter(op => guidance.avoid.includes(op));
    if (unexpectedOps.length > 0) {
      errors.push(
        `Warning: ${buildType} uses unexpected operations: ${unexpectedOps.join(', ')}. ${guidance.reason}`
      );

      if (DEBUG) {
        console.log('\n┌─────────────────────────────────────────────────────────');
        console.log('│ DEBUG: Build Type Guidance Warning');
        console.log('├─────────────────────────────────────────────────────────');
        console.log(`│ Build type: ${buildType}`);
        console.log(`│ Unexpected ops: ${unexpectedOps.join(', ')}`);
        console.log(`│ Reason: ${guidance.reason}`);
        console.log('└─────────────────────────────────────────────────────────\n');
      }
    }
  }

  return errors;
}

/**
 * Check if coordinate is within bounds, with auto-expansion for slight overflows
 */
function validateCoordinateBounds(blueprint, analysis) {
  const errors = [];
  const dimensions = blueprint.size || analysis?.hints?.dimensions;

  if (!dimensions) {
    errors.push('Missing blueprint size for bounds validation');
    return errors;
  }

  // Track max observed coordinates
  let maxX = dimensions.width;
  let maxY = dimensions.height;
  let maxZ = dimensions.depth;
  let expanded = false;

  const MAX_EXPANSION = 10; // Allow 10% or fixed block expansion

  for (let i = 0; i < (blueprint.steps || []).length; i++) {
    const step = blueprint.steps[i];

    // Check all coordinate keys: from, to, pos, base, center
    const coordKeys = ['from', 'to', 'pos', 'base', 'center'];
    for (const key of coordKeys) {
      if (step[key]) {
        if (step[key].x >= maxX) {
          if (step[key].x < maxX + MAX_EXPANSION) { maxX = step[key].x + 1; expanded = true; }
          else errors.push(`Step ${i}: '${key}.x' out of bounds (${step[key].x} >= ${dimensions.width})`);
        }
        if (step[key].y >= maxY) {
          if (step[key].y < maxY + MAX_EXPANSION) { maxY = step[key].y + 1; expanded = true; }
          else errors.push(`Step ${i}: '${key}.y' out of bounds (${step[key].y} >= ${dimensions.height})`);
        }
        if (step[key].z >= maxZ) {
          if (step[key].z < maxZ + MAX_EXPANSION) { maxZ = step[key].z + 1; expanded = true; }
          else errors.push(`Step ${i}: '${key}.z' out of bounds (${step[key].z} >= ${dimensions.depth})`);
        }

        // Also check negatives (impossible in standard blueprints, but good safety)
        if (step[key].x < 0) errors.push(`Step ${i}: '${key}.x' negative`);
        if (step[key].y < 0) errors.push(`Step ${i}: '${key}.y' negative`);
        if (step[key].z < 0) errors.push(`Step ${i}: '${key}.z' negative`);
      }
    }

    // Check fallback coordinates
    if (step.fallback) {
      for (const key of coordKeys) {
        if (step.fallback[key]) {
          // Logic repeated for fallback, or just skip strict bounds on fallback if purely recovery? 
          // Better to enforce bounds but allow expansion
          if (step.fallback[key].x >= maxX) {
            if (step.fallback[key].x < maxX + MAX_EXPANSION) { maxX = step.fallback[key].x + 1; expanded = true; }
            else errors.push(`Step ${i} fallback: '${key}.x' out of bounds`);
          }
          if (step.fallback[key].y >= maxY) {
            if (step.fallback[key].y < maxY + MAX_EXPANSION) { maxY = step.fallback[key].y + 1; expanded = true; }
            else errors.push(`Step ${i} fallback: '${key}.y' out of bounds`);
          }
          if (step.fallback[key].z >= maxZ) {
            if (step.fallback[key].z < maxZ + MAX_EXPANSION) { maxZ = step.fallback[key].z + 1; expanded = true; }
            else errors.push(`Step ${i} fallback: '${key}.z' out of bounds`);
          }
        }
      }
    }
  }

  // If we expanded safely, update the blueprint dimensions
  if (expanded && errors.length === 0) {
    if (DEBUG) console.log(`Auto-expanded blueprint size from ${dimensions.width}x${dimensions.height}x${dimensions.depth} to ${maxX}x${maxY}x${maxZ}`);
    blueprint.size.width = maxX;
    blueprint.size.height = maxY;
    blueprint.size.depth = maxZ;
  }

  return errors;
}

/**
 * Validate that required features are present
 * Only validates for structured builds (not creative builds)
 * NOTE: This is ADVISORY only - we log warnings but don't fail validation
 */
function validateFeatures(blueprint, analysis) {
  const errors = [];
  const buildType = analysis?.buildType || 'house';
  const requiredFeatures = analysis?.hints?.features || [];
  const stepOps = (blueprint.steps || []).map(s => s.op);
  const stepBlocks = (blueprint.steps || []).map(s => s.block || '').filter(b => b);

  // Skip feature validation for creative/simple builds
  const creativeBuildTypes = ['pixel_art', 'statue', 'character', 'art', 'sculpture', 'platform', 'tree'];
  if (creativeBuildTypes.includes(buildType)) {
    return errors;
  }

  // For structured builds (house, castle, etc.), log warnings but don't fail
  // LLM can implement features in many ways

  // Check for door (many ways to implement)
  if (requiredFeatures.includes('door')) {
    const hasDoor = stepOps.includes('door') ||
      stepOps.includes('set') ||
      stepBlocks.some(b => b.includes('door'));
    if (!hasDoor && DEBUG) {
      console.log('  ⚠ Advisory: No explicit door operation found (may be acceptable)');
    }
  }

  // Check for windows (many ways to implement)
  if (requiredFeatures.includes('windows')) {
    const hasWindows = stepOps.includes('window_strip') ||
      stepOps.filter(op => op === 'set').length > 1 ||
      stepBlocks.some(b => b.includes('glass') || b.includes('pane'));
    if (!hasWindows && DEBUG) {
      console.log('  ⚠ Advisory: No explicit window operation found (may be acceptable)');
    }
  }

  // Check for roof (MANY ways to implement - don't be strict!)
  // LLM can use: roof_gable, roof_hip, roof_flat, smart_roof, we_pyramid, 
  // stairs, box, wall, fill, we_fill, etc.
  if (requiredFeatures.includes('roof')) {
    const hasRoofOp = stepOps.includes('roof_gable') ||
      stepOps.includes('roof_hip') ||
      stepOps.includes('roof_flat') ||
      stepOps.includes('smart_roof') ||
      stepOps.includes('we_pyramid');

    // Also check for roof-like blocks (stairs, slabs)
    const hasRoofBlocks = stepBlocks.some(b =>
      b.includes('stairs') || b.includes('slab') || b.includes('roof')
    );

    // If no explicit roof operation AND no roof-like blocks, log warning
    if (!hasRoofOp && !hasRoofBlocks && DEBUG) {
      console.log('  ⚠ Advisory: No explicit roof operation found (may be acceptable)');
    }
  }

  // Return empty - we converted all checks to advisory warnings
  return errors;
}

/**
 * Validate volume and step count limits
 * NOTE: Width/depth limits are converted to warnings to allow creative freedom
 * Only height > 256 (Minecraft world limit) and step count remain as hard errors
 */
function validateLimits(blueprint) {
  const errors = [];
  const warnings = [];

  // Check step count (rough proxy for complexity) - KEEP AS ERROR (safety)
  if ((blueprint.steps || []).length > SAFETY_LIMITS.maxSteps) {
    errors.push(`Too many steps (>${SAFETY_LIMITS.maxSteps})`);
  }

  // Check total volume - CONVERT TO WARNING for creative freedom
  const { width, height, depth } = blueprint.size || {};
  if (width && height && depth) {
    const volume = width * height * depth;
    if (volume > SAFETY_LIMITS.maxBlocks) {
      warnings.push(`Large build volume: ${volume.toLocaleString()} blocks (limit: ${SAFETY_LIMITS.maxBlocks.toLocaleString()})`);
    }
  }

  // Check dimension bounds
  // WIDTH - CONVERT TO WARNING (allow creative large builds)
  if (width && width > SAFETY_LIMITS.maxWidth) {
    warnings.push(`Wide build: ${width} blocks (soft limit: ${SAFETY_LIMITS.maxWidth})`);
  }

  // DEPTH - CONVERT TO WARNING (allow creative large builds)
  if (depth && depth > SAFETY_LIMITS.maxDepth) {
    warnings.push(`Deep build: ${depth} blocks (soft limit: ${SAFETY_LIMITS.maxDepth})`);
  }

  // HEIGHT - KEEP AS ERROR (Minecraft world hard limit is 256)
  if (height && height > SAFETY_LIMITS.maxHeight) {
    errors.push(`Height exceeds Minecraft world limit (${height} > ${SAFETY_LIMITS.maxHeight})`);
  }

  // Check palette size - handle both array and object formats
  if (blueprint.palette) {
    const paletteSize = Array.isArray(blueprint.palette)
      ? blueprint.palette.length
      : Object.keys(blueprint.palette).length;

    if (paletteSize > SAFETY_LIMITS.maxUniqueBlocks) {
      warnings.push(`Large palette: ${paletteSize} unique blocks (limit: ${SAFETY_LIMITS.maxUniqueBlocks})`);
    }
  }

  // Log warnings but don't fail validation
  if (warnings.length > 0 && DEBUG) {
    console.log('┌─────────────────────────────────────────────────────────');
    console.log('│ VALIDATOR: Dimension Warnings (not errors)');
    console.log('├─────────────────────────────────────────────────────────');
    warnings.forEach(w => console.log(`│ ⚠ ${w}`));
    console.log('└─────────────────────────────────────────────────────────');
  }

  return errors;
}

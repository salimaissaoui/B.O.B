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

    // 1. JSON Schema Validation
    const isValidSchema = validateBlueprintSchema(currentBlueprint);
    if (!isValidSchema) {
      errors.push(...getValidationErrors(validateBlueprintSchema).map(e => `Schema: ${e}`));
    }

    // 2. Block Validation (Always check Minecraft blocks - no allowlist)
    const buildType = analysis?.buildType || 'house';
    const invalidMinecraftBlocks = validateMinecraftBlocks(currentBlueprint);
    if (invalidMinecraftBlocks.length > 0) {
      errors.push(`Invalid Minecraft blocks: ${invalidMinecraftBlocks.join(', ')}`);
    }
    logValidationStage('BlockValidation', { errors: invalidMinecraftBlocks.length > 0 ? ['block errors'] : [] });

    // 2.5. Placeholder Token Validation
    const placeholderErrors = validateNoPlaceholderTokens(currentBlueprint);
    if (placeholderErrors.length > 0) {
      errors.push(...placeholderErrors);
    }
    logValidationStage('PlaceholderValidation', { errors: placeholderErrors });

    // 3. Operation parameter validation
    const opErrors = validateOperationParams(currentBlueprint);
    errors.push(...opErrors);

    // 4. Coordinate Bounds Checking
    const boundsErrors = validateCoordinateBounds(currentBlueprint, analysis);
    errors.push(...boundsErrors);

    // 5. Feature Completeness Check (only for structured builds)
    const featureErrors = validateFeatures(currentBlueprint, analysis);
    errors.push(...featureErrors);

    // 5.5. Build-type-specific operation validation
    const buildTypeErrors = validateBuildTypeOperations(currentBlueprint, analysis);
    errors.push(...buildTypeErrors);

    // 5.6. Geometry validation (structural correctness)
    const geometryResult = validateGeometry(currentBlueprint, buildType);
    if (!geometryResult.valid) {
      errors.push(...geometryResult.errors);
    }

    // 5.7. Organic quality validation (trees, plants)
    if (isOrganicBuild({ buildType })) {
      const organicResult = validateTreeQuality(currentBlueprint);
      if (!organicResult.valid) {
        errors.push(...organicResult.errors.map(e => `Organic quality: ${e}`));
        // Auto-fix if possible
        if (organicResult.score >= 0.5) {
          currentBlueprint = fixTreeQuality(currentBlueprint);
          if (DEBUG) {
            console.log('  → Auto-fixed organic quality issues');
          }
        }
      }
    }

    // 5.8. Spatial connectivity validation (gaps, floating components)
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

    // 6. Volume and Step Limits
    const limitErrors = validateLimits(currentBlueprint);
    errors.push(...limitErrors);

    // 7. WorldEdit Validation
    const weValidation = WorldEditValidator.validateWorldEditOps(currentBlueprint);
    if (!weValidation.valid) {
      errors.push(...weValidation.errors);
    }

    // 8. Quality Validation (always run for scoring, even if other errors exist)
    qualityScore = QualityValidator.scoreBlueprint(currentBlueprint, analysis);
    if (SAFETY_LIMITS.requireFeatureCompletion && !qualityScore.passed) {
      errors.push(
        `Blueprint quality too low: ${(qualityScore.score * 100).toFixed(1)}% ` +
        `(minimum: ${SAFETY_LIMITS.minQualityScore * 100}%)`
      );
      errors.push(...qualityScore.penalties);
    }

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

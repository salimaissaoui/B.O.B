import { validateBlueprint as validateBlueprintSchema, getValidationErrors } from '../config/schemas.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { GeminiClient } from '../llm/gemini-client.js';
import { WorldEditValidator } from '../validation/worldedit-validator.js';
import { QualityValidator } from '../validation/quality-validator.js';
import { validateGeometry } from '../validation/geometry-validator.js';
import { getOperationMetadata } from '../config/operations-registry.js';
import { isValidBlock } from '../config/blocks.js';

// Debug mode - set via environment variable
const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

// Creative build types where allowlist is optional (LLM picks blocks freely)
const CREATIVE_BUILD_TYPES = [
  'pixel_art', 'statue', 'character', 'art', 'logo',
  'design', 'custom', 'sculpture', 'monument', 'figure'
];

/**
 * Stage 3: Validate and repair blueprint
 * @param {Object} blueprint - Generated blueprint
 * @param {Object} analysis - Prompt analysis from Stage 1
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object>} - Validation result with repaired blueprint
 */
export async function validateBlueprint(blueprint, analysis, apiKey) {
  let currentBlueprint = blueprint;
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
        currentBlueprint = await client.repairBlueprint(
          currentBlueprint,
          errors,
          analysis,
          qualityScore
        );
        retries++;

        if (DEBUG) {
          console.log('\n┌─────────────────────────────────────────────────────────');
          console.log('│ DEBUG: Repair Response Received');
          console.log('├─────────────────────────────────────────────────────────');
          console.log(`│ New steps count: ${currentBlueprint.steps?.length || 0}`);
          console.log(`│ New palette: ${currentBlueprint.palette?.join(', ') || 'none'}`);
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

  console.error('✗ Blueprint validation failed after all retries');
  console.error('✗ Blueprint validation failed after all retries');
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
 * Validate that all blocks are valid Minecraft blocks
 * This allows ANY valid Minecraft block (no allowlist restrictions)
 */
function validateMinecraftBlocks(blueprint, minecraftVersion = '1.20.1') {
  const invalidBlocks = [];

  // Check palette
  for (const block of blueprint.palette || []) {
    if (!isValidBlock(block, minecraftVersion)) {
      invalidBlocks.push(block);
    }
  }

  // Check steps
  for (const step of blueprint.steps || []) {
    if (step.block && !isValidBlock(step.block, minecraftVersion)) {
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
 * Validate coordinate bounds
 */
function validateCoordinateBounds(blueprint, analysis) {
  const errors = [];
  const dimensions = blueprint.size || analysis?.hints?.dimensions;
  if (!dimensions) {
    errors.push('Missing blueprint size for bounds validation');
    return errors;
  }
  const { width, depth, height } = dimensions;

  for (let i = 0; i < (blueprint.steps || []).length; i++) {
    const step = blueprint.steps[i];

    // Check all coordinate keys: from, to, pos, base, center
    const coordKeys = ['from', 'to', 'pos', 'base', 'center'];
    for (const key of coordKeys) {
      if (step[key]) {
        if (!isWithinBounds(step[key], width, height, depth)) {
          errors.push(`Step ${i}: '${key}' coordinate out of bounds`);
        }
      }
    }

    // Check fallback coordinates if present
    if (step.fallback) {
      for (const key of coordKeys) {
        if (step.fallback[key]) {
          if (!isWithinBounds(step.fallback[key], width, height, depth)) {
            errors.push(`Step ${i} fallback: '${key}' coordinate out of bounds`);
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Check if coordinate is within bounds
 */
function isWithinBounds(coord, width, height, depth) {
  return coord.x >= 0 && coord.x < width &&
    coord.y >= 0 && coord.y < height &&
    coord.z >= 0 && coord.z < depth;
}

/**
 * Validate that required features are present
 * Only validates for structured builds (not creative builds)
 */
function validateFeatures(blueprint, analysis) {
  const errors = [];
  const buildType = analysis?.buildType || 'house';
  const requiredFeatures = analysis?.hints?.features || [];
  const stepOps = (blueprint.steps || []).map(s => s.op);

  // Skip feature validation for creative builds
  const creativeBuildTypes = ['pixel_art', 'statue', 'character', 'art', 'sculpture'];
  if (creativeBuildTypes.includes(buildType)) {
    return errors;
  }

  // For structured builds (house, castle, etc.), validate features
  if (requiredFeatures.includes('door')) {
    const hasDoor = stepOps.includes('door') || stepOps.includes('set');
    if (!hasDoor) {
      errors.push('Structured build missing door feature');
    }
  }

  // Check for windows (should have window_strip or set operations)
  if (requiredFeatures.includes('windows')) {
    const hasWindows = stepOps.includes('window_strip') ||
      stepOps.filter(op => op === 'set').length > 1;
    if (!hasWindows) {
      errors.push('Missing windows feature');
    }
  }

  // Check for roof
  if (requiredFeatures.includes('roof')) {
    const hasRoof = stepOps.includes('roof_gable') ||
      stepOps.includes('roof_hip') ||
      stepOps.includes('roof_flat');
    if (!hasRoof) {
      errors.push('Missing roof feature');
    }
  }

  return errors;
}

/**
 * Validate volume and step count limits
 */
function validateLimits(blueprint) {
  const errors = [];

  // Check step count (rough proxy for complexity)
  if ((blueprint.steps || []).length > SAFETY_LIMITS.maxSteps) {
    errors.push(`Too many steps (>${SAFETY_LIMITS.maxSteps})`);
  }

  // Check total volume
  const { width, height, depth } = blueprint.size || {};
  if (width && height && depth) {
    const volume = width * height * depth;
    if (volume > SAFETY_LIMITS.maxBlocks) {
      errors.push(`Volume exceeds limit (${volume} > ${SAFETY_LIMITS.maxBlocks})`);
    }
  }

  // Check dimension bounds
  if (width && width > SAFETY_LIMITS.maxWidth) {
    errors.push(`Width exceeds limit (${width} > ${SAFETY_LIMITS.maxWidth})`);
  }
  if (depth && depth > SAFETY_LIMITS.maxDepth) {
    errors.push(`Depth exceeds limit (${depth} > ${SAFETY_LIMITS.maxDepth})`);
  }
  if (height && height > SAFETY_LIMITS.maxHeight) {
    errors.push(`Height exceeds limit (${height} > ${SAFETY_LIMITS.maxHeight})`);
  }

  // Check palette size
  if ((blueprint.palette || []).length > SAFETY_LIMITS.maxUniqueBlocks) {
    errors.push(`Too many unique blocks in palette (${blueprint.palette.length} > ${SAFETY_LIMITS.maxUniqueBlocks})`);
  }

  return errors;
}

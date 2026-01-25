import { validateBlueprint, getValidationErrors } from '../config/schemas.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { GeminiClient } from '../llm/gemini-client.js';
import { WorldEditValidator } from '../validation/worldedit-validator.js';
import { QualityValidator } from '../validation/quality-validator.js';
import { getOperationMetadata } from '../config/operations-registry.js';

/**
 * Stage 4: Validate and repair blueprint
 * @param {Object} blueprint - Generated blueprint
 * @param {string[]} allowlist - Valid block list
 * @param {Object} designPlan - Original design plan
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object>} - Validation result with repaired blueprint
 */
export async function validateAndRepair(blueprint, allowlist, designPlan, apiKey) {
  let currentBlueprint = blueprint;
  let retries = 0;
  let qualityScore = null;

  while (retries < SAFETY_LIMITS.maxRetries) {
    const errors = [];

    // 1. JSON Schema Validation
    const isValidSchema = validateBlueprint(currentBlueprint);
    if (!isValidSchema) {
      errors.push(...getValidationErrors(validateBlueprint).map(e => `Schema: ${e}`));
    }

    // 2. Block Allowlist Validation
    const invalidBlocks = validateBlockAllowlist(currentBlueprint, allowlist);
    if (invalidBlocks.length > 0) {
      errors.push(`Invalid blocks used: ${invalidBlocks.join(', ')}`);
    }

    // 3. Operation parameter validation
    const opErrors = validateOperationParams(currentBlueprint);
    errors.push(...opErrors);

    // 4. Coordinate Bounds Checking
    const boundsErrors = validateCoordinateBounds(currentBlueprint, designPlan);
    errors.push(...boundsErrors);

    // 5. Feature Completeness Check (basic)
    const featureErrors = validateFeatures(currentBlueprint, designPlan);
    errors.push(...featureErrors);

    // 6. Volume and Step Limits
    const limitErrors = validateLimits(currentBlueprint);
    errors.push(...limitErrors);

    // 7. WorldEdit Validation
    const weValidation = WorldEditValidator.validateWorldEditOps(currentBlueprint);
    if (!weValidation.valid) {
      errors.push(...weValidation.errors);
    }

    // 8. Quality Validation (always run for scoring, even if other errors exist)
    qualityScore = QualityValidator.scoreBlueprint(currentBlueprint, designPlan);
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
      return {
        valid: true,
        blueprint: currentBlueprint,
        errors: [],
        quality: qualityScore,
        worldedit: weValidation.stats
      };
    }
    
    // If errors and retries available, attempt repair
    if (retries < SAFETY_LIMITS.maxRetries - 1) {
      console.log(`⚠ Validation failed (attempt ${retries + 1}/${SAFETY_LIMITS.maxRetries})`);
      console.log(`  Errors: ${errors.length} issues found`);
      if (qualityScore) {
        console.log(`  Quality score: ${(qualityScore.score * 100).toFixed(1)}%`);
      }
      console.log('  Attempting repair...');

      try {
        const client = new GeminiClient(apiKey);
        currentBlueprint = await client.repairBlueprint(
          currentBlueprint,
          errors,
          designPlan,
          allowlist,
          qualityScore
        );
        retries++;
      } catch (repairError) {
        console.error(`  Repair failed: ${repairError.message}`);
        break;
      }
    } else {
      break;
    }
  }
  
  // Final validation failed
  const finalErrors = [];
  if (!validateBlueprint(currentBlueprint)) {
    finalErrors.push(...getValidationErrors(validateBlueprint));
  }
  const finalInvalidBlocks = validateBlockAllowlist(currentBlueprint, allowlist);
  if (finalInvalidBlocks.length > 0) {
    finalErrors.push(`Invalid blocks used: ${finalInvalidBlocks.join(', ')}`);
  }
  finalErrors.push(...validateOperationParams(currentBlueprint));
  finalErrors.push(...validateCoordinateBounds(currentBlueprint, designPlan));
  finalErrors.push(...validateFeatures(currentBlueprint, designPlan));
  finalErrors.push(...validateLimits(currentBlueprint));
  
  console.error('✗ Blueprint validation failed after all retries');
  console.error(`  Final errors: ${finalErrors.join(', ')}`);
  
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
 * Validate that all blocks in blueprint are in allowlist
 */
function validateBlockAllowlist(blueprint, allowlist) {
  const invalidBlocks = [];
  
  // Check palette
  for (const block of blueprint.palette || []) {
    if (!allowlist.includes(block)) {
      invalidBlocks.push(block);
    }
  }
  
  // Check steps
  for (const step of blueprint.steps || []) {
    if (step.block && !allowlist.includes(step.block)) {
      if (!invalidBlocks.includes(step.block)) {
        invalidBlocks.push(step.block);
      }
    }
  }
  
  return invalidBlocks;
}

/**
 * Validate coordinate bounds
 */
function validateCoordinateBounds(blueprint, designPlan) {
  const errors = [];
  const dimensions = blueprint.size || designPlan?.dimensions;
  if (!dimensions) {
    errors.push('Missing blueprint size for bounds validation');
    return errors;
  }
  const { width, depth, height } = dimensions;
  
  for (let i = 0; i < (blueprint.steps || []).length; i++) {
    const step = blueprint.steps[i];
    
    // Check 'from' coordinates
    if (step.from) {
      if (!isWithinBounds(step.from, width, height, depth)) {
        errors.push(`Step ${i}: 'from' coordinate out of bounds`);
      }
    }
    
    // Check 'to' coordinates
    if (step.to) {
      if (!isWithinBounds(step.to, width, height, depth)) {
        errors.push(`Step ${i}: 'to' coordinate out of bounds`);
      }
    }
    
    // Check 'pos' coordinates
    if (step.pos) {
      if (!isWithinBounds(step.pos, width, height, depth)) {
        errors.push(`Step ${i}: 'pos' coordinate out of bounds`);
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
 */
function validateFeatures(blueprint, designPlan) {
  const errors = [];
  const requiredFeatures = designPlan.features || [];
  const stepOps = (blueprint.steps || []).map(s => s.op);
  
  // Check for door (should have 'set' operations for door placement)
  if (requiredFeatures.includes('door')) {
    const hasSetOps = stepOps.includes('set');
    if (!hasSetOps) {
      errors.push('Missing door feature (no set operations)');
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

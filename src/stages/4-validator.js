import { validateBlueprint, getValidationErrors } from '../config/schemas.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { GeminiClient } from '../llm/gemini-client.js';

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
    
    // 3. Coordinate Bounds Checking
    const boundsErrors = validateCoordinateBounds(currentBlueprint, designPlan);
    errors.push(...boundsErrors);
    
    // 4. Feature Completeness Check
    const featureErrors = validateFeatures(currentBlueprint, designPlan);
    errors.push(...featureErrors);
    
    // 5. Volume and Step Limits
    const limitErrors = validateLimits(currentBlueprint);
    errors.push(...limitErrors);
    
    // If no errors, validation successful
    if (errors.length === 0) {
      console.log('✓ Blueprint validation passed');
      return { valid: true, blueprint: currentBlueprint, errors: [] };
    }
    
    // If errors and retries available, attempt repair
    if (retries < SAFETY_LIMITS.maxRetries - 1) {
      console.log(`⚠ Validation failed (attempt ${retries + 1}/${SAFETY_LIMITS.maxRetries})`);
      console.log(`  Errors: ${errors.join(', ')}`);
      console.log('  Attempting repair...');
      
      try {
        const client = new GeminiClient(apiKey);
        currentBlueprint = await client.repairBlueprint(
          currentBlueprint,
          errors,
          designPlan,
          allowlist
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
  finalErrors.push(...validateBlockAllowlist(currentBlueprint, allowlist));
  finalErrors.push(...validateCoordinateBounds(currentBlueprint, designPlan));
  
  console.error('✗ Blueprint validation failed after all retries');
  console.error(`  Final errors: ${finalErrors.join(', ')}`);
  
  return { 
    valid: false, 
    blueprint: currentBlueprint, 
    errors: finalErrors 
  };
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
  const { width, depth, height } = designPlan.dimensions;
  
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
  if ((blueprint.steps || []).length > 1000) {
    errors.push('Too many steps (>1000)');
  }
  
  // Check total volume
  const { width, height, depth } = blueprint.size || {};
  if (width && height && depth) {
    const volume = width * height * depth;
    if (volume > SAFETY_LIMITS.maxBlocks) {
      errors.push(`Volume exceeds limit (${volume} > ${SAFETY_LIMITS.maxBlocks})`);
    }
  }
  
  // Check palette size
  if ((blueprint.palette || []).length > SAFETY_LIMITS.maxUniqueBlocks) {
    errors.push(`Too many unique blocks in palette (${blueprint.palette.length} > ${SAFETY_LIMITS.maxUniqueBlocks})`);
  }
  
  return errors;
}

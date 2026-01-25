import { GeminiClient } from '../llm/gemini-client.js';
import { validateDesignPlan, getValidationErrors } from '../config/schemas.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { analyzePrompt } from '../config/build-types.js';

// Debug mode - set via environment variable
const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

/**
 * Stage 1: Generate high-level design plan from user prompt
 * @param {string} userPrompt - Natural language building request
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object>} - Validated design plan
 */
export async function generateDesignPlan(userPrompt, apiKey) {
  if (!userPrompt || typeof userPrompt !== 'string') {
    throw new Error('Invalid user prompt');
  }

  // Comprehensive prompt analysis
  const analysis = analyzePrompt(userPrompt);
  
  if (DEBUG) {
    console.log('\n┌─────────────────────────────────────────────────────────');
    console.log('│ DEBUG: Prompt Analysis');
    console.log('├─────────────────────────────────────────────────────────');
    console.log(`│ User Prompt: "${userPrompt}"`);
    console.log('│');
    console.log(`│ TYPE: ${analysis.type.type} (${analysis.type.confidence} confidence)`);
    console.log(`│   Matched: "${analysis.type.matchedKeyword || 'none'}"`);
    if (analysis.type.reason) {
      console.log(`│   Reason: ${analysis.type.reason}`);
    }
    console.log('│');
    if (analysis.theme) {
      console.log(`│ THEME: ${analysis.theme.name}`);
      console.log(`│   Matched: "${analysis.theme.matchedKeyword}"`);
      console.log(`│   Materials: ${analysis.theme.materials.primary}, ${analysis.theme.materials.secondary}`);
    } else {
      console.log('│ THEME: none (using type defaults)');
    }
    console.log('│');
    console.log(`│ SIZE: ${analysis.size.size}${analysis.size.matchedWord ? ` (matched: "${analysis.size.matchedWord}")` : ' (default)'}`);
    console.log(`│   Dimensions: ${analysis.dimensions.width}x${analysis.dimensions.height}x${analysis.dimensions.depth}`);
    console.log('│');
    console.log(`│ FEATURES: ${analysis.features.slice(0, 5).join(', ')}${analysis.features.length > 5 ? '...' : ''}`);
    console.log(`│ OPERATIONS: ${analysis.operations.preferred.slice(0, 4).join(', ')}`);
    console.log('└─────────────────────────────────────────────────────────\n');
  }

  const client = new GeminiClient(apiKey);
  
  try {
    const designPlan = await client.generateDesignPlan(userPrompt);
    clampDesignPlanDimensions(designPlan);
    
    // Validate against schema
    const isValid = validateDesignPlan(designPlan);
    
    if (!isValid) {
      const errors = getValidationErrors(validateDesignPlan);
      if (DEBUG) {
        console.log('\n┌─────────────────────────────────────────────────────────');
        console.log('│ DEBUG: Design Plan Validation FAILED');
        console.log('├─────────────────────────────────────────────────────────');
        console.log(`│ Errors: ${errors.join(', ')}`);
        console.log('│ Raw Design Plan:');
        console.log(JSON.stringify(designPlan, null, 2).split('\n').map(l => '│   ' + l).join('\n'));
        console.log('└─────────────────────────────────────────────────────────\n');
      }
      throw new Error(`Design plan validation failed: ${errors.join(', ')}`);
    }
    
    console.log('✓ Design plan generated successfully');
    console.log(`  Dimensions: ${designPlan.dimensions.width}x${designPlan.dimensions.height}x${designPlan.dimensions.depth}`);
    console.log(`  Style: ${designPlan.style}`);
    console.log(`  Features: ${designPlan.features.join(', ')}`);
    if (designPlan.buildType) {
      console.log(`  Build Type: ${designPlan.buildType}`);
    }
    
    if (DEBUG) {
      console.log('\n┌─────────────────────────────────────────────────────────');
      console.log('│ DEBUG: Design Plan Complete');
      console.log('├─────────────────────────────────────────────────────────');
      console.log(JSON.stringify(designPlan, null, 2).split('\n').map(l => '│ ' + l).join('\n'));
      console.log('└─────────────────────────────────────────────────────────\n');
    }
    
    return designPlan;
  } catch (error) {
    if (DEBUG) {
      console.log('\n┌─────────────────────────────────────────────────────────');
      console.log('│ DEBUG: Design Plan Generation FAILED');
      console.log('├─────────────────────────────────────────────────────────');
      console.log(`│ Error: ${error.message}`);
      console.log(`│ Stack: ${error.stack?.split('\n').slice(0, 3).join('\n│        ')}`);
      console.log('└─────────────────────────────────────────────────────────\n');
    }
    throw new Error(`Design planning failed: ${error.message}`);
  }
}

function clampDesignPlanDimensions(designPlan) {
  if (!designPlan?.dimensions) {
    return;
  }

  const { width, depth, height } = designPlan.dimensions;
  const clampedWidth = clamp(width, 1, SAFETY_LIMITS.maxWidth);
  const clampedDepth = clamp(depth, 1, SAFETY_LIMITS.maxDepth);
  const clampedHeight = clamp(height, 1, SAFETY_LIMITS.maxHeight);

  if (clampedWidth !== width || clampedDepth !== depth || clampedHeight !== height) {
    console.warn(
      `⚠ Clamping design plan dimensions to limits: ` +
      `${width}x${height}x${depth} -> ${clampedWidth}x${clampedHeight}x${clampedDepth}`
    );
    designPlan.dimensions.width = clampedWidth;
    designPlan.dimensions.depth = clampedDepth;
    designPlan.dimensions.height = clampedHeight;
  }
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

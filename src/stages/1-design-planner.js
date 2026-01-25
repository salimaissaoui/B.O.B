import { GeminiClient } from '../llm/gemini-client.js';
import { validateDesignPlan, getValidationErrors } from '../config/schemas.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { analyzePrompt } from '../config/build-types.js';
import { detectTreeType, detectDetailLevel } from '../config/tree-types.js';

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
    throw new Error('Invalid user prompt: must be a non-empty string');
  }

  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Invalid API key: Gemini API key required');
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

    // Fill in missing required fields from analysis if LLM didn't provide them
    ensureRequiredFields(designPlan, analysis);

    // For tree builds, detect tree type and detail level
    if (analysis.type?.type === 'tree') {
      designPlan.treeType = detectTreeType(userPrompt);
      designPlan.detailLevel = detectDetailLevel(userPrompt);

      if (DEBUG) {
        console.log('\n┌─────────────────────────────────────────────────────────');
        console.log('│ DEBUG: Tree Type Detection');
        console.log('├─────────────────────────────────────────────────────────');
        console.log(`│ Tree Type: ${designPlan.treeType}`);
        console.log(`│ Detail Level: ${designPlan.detailLevel}`);
        console.log('└─────────────────────────────────────────────────────────\n');
      }

      console.log(`  Tree Type: ${designPlan.treeType}`);
      console.log(`  Detail Level: ${designPlan.detailLevel}`);
    }
    
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

/**
 * Ensure all required schema fields are present, filling from analysis if missing
 * This handles cases where the LLM returns incomplete responses
 */
function ensureRequiredFields(designPlan, analysis) {
  // Ensure dimensions
  if (!designPlan.dimensions) {
    designPlan.dimensions = analysis.dimensions;
    console.warn('⚠ LLM missing dimensions, using analyzed defaults');
  }
  
  // Ensure style
  if (!designPlan.style) {
    designPlan.style = analysis.theme?.name || analysis.typeInfo?.name || 'default';
    console.warn(`⚠ LLM missing style, using: ${designPlan.style}`);
  }
  
  // Ensure materials
  if (!designPlan.materials) {
    designPlan.materials = {
      primary: analysis.materials?.primary || 'oak_planks',
      secondary: analysis.materials?.secondary || 'oak_log',
      accent: analysis.materials?.accent || 'stripped_oak_log',
      roof: analysis.materials?.roof || 'oak_stairs',
      windows: analysis.materials?.windows || 'glass_pane',
      door: analysis.materials?.door || 'oak_door'
    };
    console.warn('⚠ LLM missing materials, using analyzed defaults');
  } else if (!designPlan.materials.primary) {
    // Materials object exists but is missing primary
    designPlan.materials.primary = analysis.materials?.primary || 'oak_planks';
  }
  
  // Ensure features
  if (!designPlan.features || !Array.isArray(designPlan.features) || designPlan.features.length === 0) {
    designPlan.features = analysis.features || ['walls', 'roof', 'door'];
    console.warn(`⚠ LLM missing features, using: ${designPlan.features.join(', ')}`);
  }
  
  // Also ensure buildType for downstream processing
  if (!designPlan.buildType) {
    designPlan.buildType = analysis.type?.type || 'house';
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

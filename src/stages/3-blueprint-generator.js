import { GeminiClient } from '../llm/gemini-client.js';
import { validateBlueprint, getValidationErrors } from '../config/schemas.js';
import { BUILD_TYPES } from '../config/build-types.js';

// Debug mode - set via environment variable
const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

/**
 * Stage 3: Generate executable blueprint from design plan
 * @param {Object} designPlan - High-level design plan
 * @param {string[]} allowlist - Validated block allowlist
 * @param {string} apiKey - Gemini API key
 * @param {boolean} worldEditAvailable - Whether WorldEdit is available
 * @returns {Promise<Object>} - Blueprint object
 */
export async function generateBlueprint(designPlan, allowlist, apiKey, worldEditAvailable = false) {
  if (!designPlan || !allowlist || allowlist.length === 0) {
    throw new Error('Invalid design plan or allowlist');
  }

  const buildType = designPlan.buildType || 'house';
  const typeInfo = BUILD_TYPES[buildType];

  if (DEBUG) {
    console.log('\n┌─────────────────────────────────────────────────────────');
    console.log('│ DEBUG: Blueprint Generation');
    console.log('├─────────────────────────────────────────────────────────');
    console.log(`│ Build Type: ${buildType} (${typeInfo?.name || 'unknown'})`);
    console.log(`│ Dimensions: ${designPlan.dimensions.width}x${designPlan.dimensions.height}x${designPlan.dimensions.depth}`);
    console.log(`│ Allowlist: ${allowlist.join(', ')}`);
    console.log(`│ WorldEdit: ${worldEditAvailable ? 'ENABLED' : 'DISABLED'}`);
    console.log(`│ Features: ${designPlan.features?.join(', ') || 'none'}`);
    if (typeInfo?.primaryOperations || typeInfo?.primaryOperation) {
      console.log(`│ Recommended Ops: ${typeInfo.primaryOperations?.join(', ') || typeInfo.primaryOperation}`);
    }
    console.log('└─────────────────────────────────────────────────────────\n');
  }

  const client = new GeminiClient(apiKey);

  try {
    const blueprint = await client.generateBlueprint(designPlan, allowlist, worldEditAvailable);
    
    // Basic schema validation
    const isValid = validateBlueprint(blueprint);
    
    if (!isValid) {
      const errors = getValidationErrors(validateBlueprint);
      if (DEBUG) {
        console.log('\n┌─────────────────────────────────────────────────────────');
        console.log('│ DEBUG: Blueprint Schema Validation FAILED');
        console.log('├─────────────────────────────────────────────────────────');
        console.log(`│ Errors: ${errors.join(', ')}`);
        console.log('│ Blueprint size:', blueprint?.size);
        console.log('│ Blueprint palette:', blueprint?.palette?.slice(0, 5), '...');
        console.log('│ Blueprint steps count:', blueprint?.steps?.length);
        console.log('└─────────────────────────────────────────────────────────\n');
      }
      throw new Error(`Blueprint validation failed: ${errors.join(', ')}`);
    }
    
    console.log('✓ Blueprint generated successfully');
    console.log(`  Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);
    console.log(`  Palette: ${blueprint.palette.length} blocks`);
    console.log(`  Steps: ${blueprint.steps.length} operations`);
    
    if (DEBUG) {
      // Count operations by type
      const opCounts = {};
      for (const step of blueprint.steps) {
        opCounts[step.op] = (opCounts[step.op] || 0) + 1;
      }
      
      console.log('\n┌─────────────────────────────────────────────────────────');
      console.log('│ DEBUG: Blueprint Details');
      console.log('├─────────────────────────────────────────────────────────');
      console.log('│ Operations breakdown:');
      for (const [op, count] of Object.entries(opCounts)) {
        console.log(`│   ${op}: ${count}`);
      }
      console.log('│ Palette: ' + blueprint.palette.join(', '));
      console.log('├─────────────────────────────────────────────────────────');
      console.log('│ First 3 steps:');
      for (let i = 0; i < Math.min(3, blueprint.steps.length); i++) {
        const step = blueprint.steps[i];
        console.log(`│   [${i}] ${step.op}: ${JSON.stringify(step).slice(0, 80)}...`);
      }
      if (blueprint.steps.length > 3) {
        console.log(`│   ... and ${blueprint.steps.length - 3} more steps`);
      }
      console.log('└─────────────────────────────────────────────────────────\n');
    }
    
    return blueprint;
  } catch (error) {
    if (DEBUG) {
      console.log('\n┌─────────────────────────────────────────────────────────');
      console.log('│ DEBUG: Blueprint Generation FAILED');
      console.log('├─────────────────────────────────────────────────────────');
      console.log(`│ Error: ${error.message}`);
      console.log(`│ Build Type: ${buildType}`);
      console.log(`│ Design Plan:`, JSON.stringify(designPlan, null, 2).split('\n').slice(0, 10).map(l => '│   ' + l).join('\n'));
      console.log('└─────────────────────────────────────────────────────────\n');
    }
    throw new Error(`Blueprint generation failed: ${error.message}`);
  }
}

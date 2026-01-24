import { GeminiClient } from '../llm/gemini-client.js';
import { validateBlueprint, getValidationErrors } from '../config/schemas.js';

/**
 * Stage 3: Generate executable blueprint from design plan
 * @param {Object} designPlan - High-level design plan
 * @param {string[]} allowlist - Validated block allowlist
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object>} - Blueprint object
 */
export async function generateBlueprint(designPlan, allowlist, apiKey) {
  if (!designPlan || !allowlist || allowlist.length === 0) {
    throw new Error('Invalid design plan or allowlist');
  }

  const client = new GeminiClient(apiKey);
  
  try {
    const blueprint = await client.generateBlueprint(designPlan, allowlist);
    
    // Basic schema validation
    const isValid = validateBlueprint(blueprint);
    
    if (!isValid) {
      const errors = getValidationErrors(validateBlueprint);
      throw new Error(`Blueprint validation failed: ${errors.join(', ')}`);
    }
    
    console.log('✓ Blueprint generated successfully');
    console.log(`  Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);
    console.log(`  Palette: ${blueprint.palette.length} blocks`);
    console.log(`  Steps: ${blueprint.steps.length} operations`);
    
    return blueprint;
  } catch (error) {
    throw new Error(`Blueprint generation failed: ${error.message}`);
  }
}

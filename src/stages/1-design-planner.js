import { GeminiClient } from '../llm/gemini-client.js';
import { validateDesignPlan, getValidationErrors } from '../config/schemas.js';

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

  const client = new GeminiClient(apiKey);
  
  try {
    const designPlan = await client.generateDesignPlan(userPrompt);
    
    // Validate against schema
    const isValid = validateDesignPlan(designPlan);
    
    if (!isValid) {
      const errors = getValidationErrors(validateDesignPlan);
      throw new Error(`Design plan validation failed: ${errors.join(', ')}`);
    }
    
    console.log('✓ Design plan generated successfully');
    console.log(`  Dimensions: ${designPlan.dimensions.width}x${designPlan.dimensions.height}x${designPlan.dimensions.depth}`);
    console.log(`  Style: ${designPlan.style}`);
    console.log(`  Features: ${designPlan.features.join(', ')}`);
    
    return designPlan;
  } catch (error) {
    throw new Error(`Design planning failed: ${error.message}`);
  }
}

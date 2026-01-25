import { GeminiClient } from '../llm/gemini-client.js';
import { unifiedBlueprintPrompt } from '../llm/prompts/unified-blueprint.js';

// Debug mode - set via environment variable
const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

/**
 * Stage 2: Generate complete blueprint (single LLM call)
 * Merges design planning + blueprint generation into one step
 *
 * @param {Object} analysis - Prompt analysis from Stage 1
 * @param {string} apiKey - Gemini API key
 * @param {boolean} worldEditAvailable - Whether WorldEdit is available
 * @returns {Promise<Object>} - Complete blueprint
 */
export async function generateBlueprint(analysis, apiKey, worldEditAvailable = false) {
  if (!analysis || typeof analysis !== 'object') {
    throw new Error('Invalid analysis: must be an object');
  }

  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Invalid API key: Gemini API key required');
  }

  const { userPrompt, buildType } = analysis;

  if (DEBUG) {
    console.log('\n┌─────────────────────────────────────────────────────────');
    console.log('│ DEBUG: Unified Blueprint Generation');
    console.log('├─────────────────────────────────────────────────────────');
    console.log(`│ User Prompt: "${userPrompt}"`);
    console.log(`│ Build Type: ${buildType}`);
    console.log(`│ Theme: ${analysis.theme?.name || 'default'}`);
    console.log(`│ Suggested Dimensions: ${analysis.hints.dimensions.width}x${analysis.hints.dimensions.height}x${analysis.hints.dimensions.depth}`);
    console.log(`│ WorldEdit: ${worldEditAvailable ? 'ENABLED' : 'DISABLED'}`);
    console.log('└─────────────────────────────────────────────────────────\n');
  }

  try {
    // Generate unified prompt (design + blueprint in one)
    const prompt = unifiedBlueprintPrompt(analysis, worldEditAvailable);

    // Call LLM with unified prompt
    const client = new GeminiClient(apiKey);
    const blueprint = await client.generateContent({
      prompt,
      temperature: 0.5,
      responseFormat: 'json'
    });

    // Basic structure validation
    if (!blueprint.size || !blueprint.palette || !blueprint.steps) {
      throw new Error('Invalid blueprint structure: missing required fields (size, palette, or steps)');
    }

    if (!Array.isArray(blueprint.steps) || blueprint.steps.length === 0) {
      throw new Error('Blueprint must have at least one step');
    }

    // Add metadata
    blueprint.generationMethod = 'unified_llm';
    blueprint.buildType = buildType;
    blueprint.theme = analysis.theme?.theme || 'default';

    if (DEBUG) {
      console.log('\n┌─────────────────────────────────────────────────────────');
      console.log('│ DEBUG: Blueprint Generated');
      console.log('├─────────────────────────────────────────────────────────');
      console.log(`│ Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);
      console.log(`│ Palette: ${blueprint.palette.length} blocks`);
      console.log(`│ Steps: ${blueprint.steps.length} operations`);
      console.log('│ Operations breakdown:');
      const opCounts = {};
      for (const step of blueprint.steps) {
        opCounts[step.op] = (opCounts[step.op] || 0) + 1;
      }
      for (const [op, count] of Object.entries(opCounts)) {
        console.log(`│   ${op}: ${count}`);
      }
      console.log('└─────────────────────────────────────────────────────────\n');
    }

    console.log('✓ Blueprint generated successfully (unified method)');
    console.log(`  Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);
    console.log(`  Blocks: ${blueprint.palette.length} types`);
    console.log(`  Steps: ${blueprint.steps.length} operations`);

    return blueprint;
  } catch (error) {
    if (DEBUG) {
      console.log('\n┌─────────────────────────────────────────────────────────');
      console.log('│ DEBUG: Blueprint Generation FAILED');
      console.log('├─────────────────────────────────────────────────────────');
      console.log(`│ Error: ${error.message}`);
      console.log(`│ Build Type: ${buildType}`);
      console.log('└─────────────────────────────────────────────────────────\n');
    }
    throw new Error(`Blueprint generation failed: ${error.message}`);
  }
}

export default generateBlueprint;

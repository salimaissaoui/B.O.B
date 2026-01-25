import { GeminiClient } from '../llm/gemini-client.js';
import { unifiedBlueprintPrompt } from '../llm/prompts/unified-blueprint.js';
import { optimizeBuildOrder } from './optimization/layering.js';
import { generateFromWebReference } from '../services/sprite-reference.js';

// Debug mode - set via environment variable
const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

/**
 * Extract subject from pixel art prompt
 */
function extractPixelArtSubject(userPrompt) {
  return userPrompt.toLowerCase()
    .replace(/pixel\s*art/gi, '')
    .replace(/build/gi, '')
    .replace(/a\s+/gi, '')
    .trim();
}

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

  // PIXEL ART: Use dedicated sprite generation with better prompting
  if (buildType === 'pixel_art') {
    const subject = extractPixelArtSubject(userPrompt);
    console.log(`🎨 Generating pixel art for: "${subject}"`);

    try {
      const spriteBlueprint = await generateFromWebReference(subject, apiKey);
      if (spriteBlueprint) {
        console.log('✓ Sprite generated successfully');
        console.log(`  Size: ${spriteBlueprint.size.width}x${spriteBlueprint.size.height}`);
        return spriteBlueprint;
      }
    } catch (spriteError) {
      console.warn(`\n┌─────────────────────────────────────────────────────────`);
      console.warn(`│ ⚠ SPRITE GENERATION FAILED`);
      console.warn(`├─────────────────────────────────────────────────────────`);
      console.warn(`│ Reason: ${spriteError.message}`);
      console.warn(`│ Fallback: Using standard LLM generation`);
      console.warn(`└─────────────────────────────────────────────────────────\n`);
    }
  }

  try {
    // Generate unified prompt (design + blueprint in one)
    const prompt = unifiedBlueprintPrompt(analysis, worldEditAvailable);

    // Call LLM with streaming for real-time feedback
    const client = new GeminiClient(apiKey);
    console.log('🤖 Generating blueprint (streaming)...');

    let progressDots = 0;
    let blueprint = await client.streamContent({
      prompt,
      temperature: 0.5,
      onProgress: (progress) => {
        progressDots++;
        // Show live progress every few chunks
        process.stdout.write(`\r  Thinking... ${'.'.repeat(progressDots % 10 + 1).padEnd(10)} (${Math.round(progress.bytesReceived / 1024)}KB)`);
      }
    });

    // Clear progress line
    process.stdout.write('\r' + ' '.repeat(60) + '\r');

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

    // VALIDATION: For pixel_art buildType, ensure pixel_art operation is used
    if (buildType === 'pixel_art') {
      const hasPixelArtOp = blueprint.steps.some(step => step.op === 'pixel_art');
      if (!hasPixelArtOp) {
        throw new Error(
          'Pixel art generation failed: LLM did not generate pixel_art operation. ' +
          'This usually means the sprite is too complex or the prompt was misunderstood. ' +
          'Try a simpler subject or be more specific.'
        );
      }
    }

    // OPTIMIZATION: Reorder steps for structural integrity (bottom-up)
    blueprint = optimizeBuildOrder(blueprint);

    // FEATURE: Always add site prep as first step
    if (blueprint.steps[0].op !== 'site_prep') {
      blueprint.steps.unshift({
        op: 'site_prep'
      });
    }

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

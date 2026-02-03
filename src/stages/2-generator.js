import { GeminiClient } from '../llm/gemini-client.js';
import { unifiedBlueprintPrompt } from '../llm/prompts/unified-blueprint.js';
import { optimizeBuildOrder } from './optimization/layering.js';
import { generateFromWebReference } from '../services/sprite-reference.js';
import { routeProceduralBuild } from '../generators/index.js';
import { optimizeBlueprint } from '../utils/blueprint-optimizer.js';
import { getBlueprintCache } from '../llm/blueprint-cache.js';

// Debug mode - set via environment variable
const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

// Blueprint cache - CLAUDE.md Priority 2: LLM Response Caching (24h TTL)
const blueprintCache = getBlueprintCache();

/**
 * Extract subject from pixel art prompt
 */
function extractPixelArtSubject(userPrompt) {
  return userPrompt.toLowerCase()
    .replace(/pixel\s*art/gi, '')
    .replace(/build/gi, '')
    .replace(/\ba\b/gi, '')  // Only match standalone "a" (word boundary)
    .trim();
}

/**
 * Generate a simple platform blueprint (deterministic, no LLM needed)
 */
function generatePlatformBlueprint(analysis) {
  const { hints } = analysis;
  const dims = hints.dimensions || { width: 10, depth: 10 };
  const width = dims.width || 10;
  const depth = dims.depth || dims.width || 10;
  const height = dims.height || 1;

  // Extract material
  const material = hints.materials?.primary || 'stone';

  console.log(`📦 Generating simple platform: ${width}x${depth}x${height} ${material}`);

  return {
    buildType: 'platform',
    theme: 'default',
    size: { width, height, depth },
    palette: { primary: material },
    steps: [
      { op: 'site_prep' },
      {
        op: 'we_fill',
        from: { x: 0, y: 0, z: 0 },
        to: { x: width - 1, y: height - 1, z: depth - 1 },
        block: '$primary'
      }
    ],
    generationMethod: 'deterministic_platform'
  };
}

/**
 * Stage 2: Generate complete blueprint (single LLM call)
 * Merges design planning + blueprint generation into one step
 *
 * @param {Object} analysis - Prompt analysis from Stage 1
 * @param {string} apiKey - Gemini API key
 * @param {boolean} worldEditAvailable - Whether WorldEdit is available
 * @param {Object} reference - Reference analysis from Stage 0
 * @returns {Promise<Object>} - Complete blueprint
 */
export async function generateBlueprint(analysis, apiKey, worldEditAvailable = false, reference = { hasReference: false }) {
  if (!analysis || typeof analysis !== 'object') {
    throw new Error('Invalid analysis: must be an object');
  }

  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Invalid API key: Gemini API key required');
  }

  const { userPrompt, buildType, libraryBlueprint } = analysis;

  // FAST PATH 1: Use library blueprint if available
  if (libraryBlueprint) {
    console.log(`📚 Using library blueprint: ${libraryBlueprint.templateName || 'template'}`);

    // Ensure site_prep is first
    if (libraryBlueprint.steps && libraryBlueprint.steps[0]?.op !== 'site_prep') {
      libraryBlueprint.steps.unshift({ op: 'site_prep' });
    }

    return {
      ...libraryBlueprint,
      generationMethod: 'library_template'
    };
  }

  // FAST PATH 2: Simple platforms don't need LLM
  if (buildType === 'platform' && analysis.hints?.explicitDimensions) {
    return generatePlatformBlueprint(analysis);
  }

  // FAST PATH 3: Procedural generators for consistent, elegant builds
  const proceduralBlueprint = routeProceduralBuild(analysis);
  if (proceduralBlueprint) {
    console.log(`✨ Using procedural generator for: ${buildType}`);

    // Feature: Add site prep as first step if missing
    if (proceduralBlueprint.steps && proceduralBlueprint.steps[0]?.op !== 'site_prep') {
      proceduralBlueprint.steps.unshift({ op: 'site_prep' });
    }

    return proceduralBlueprint;
  }

  // CACHE CHECK: Look up cached blueprint before LLM call
  // Only cache non-image-reference builds (images are unique)
  const cacheKey = !reference.hasReference
    ? blueprintCache.generateKey(userPrompt, buildType, worldEditAvailable)
    : null;

  if (cacheKey) {
    const cachedBlueprint = blueprintCache.get(cacheKey);
    if (cachedBlueprint) {
      console.log(`📦 Cache HIT: Using cached blueprint (key: ${cacheKey.substring(0, 12)}...)`);
      const stats = blueprintCache.getStats();
      console.log(`   Cache stats: ${stats.hits} hits, ${stats.misses} misses (${stats.hitRate}% hit rate)`);

      // Return a copy to prevent mutation of cached data
      return JSON.parse(JSON.stringify(cachedBlueprint));
    }
  }

  if (DEBUG) {
    console.log('\n┌─────────────────────────────────────────────────────────');
    console.log('│ DEBUG: Unified Blueprint Generation');
    console.log('├─────────────────────────────────────────────────────────');
    console.log(`│ User Prompt: "${userPrompt}"`);
    console.log(`│ Build Type: ${buildType}`);
    console.log(`│ Theme: ${analysis.theme?.name || 'default'}`);
    console.log(`│ Suggested Dimensions: ${analysis.hints.dimensions.width}x${analysis.hints.dimensions.height}x${analysis.hints.dimensions.depth}`);
    console.log(`│ WorldEdit: ${worldEditAvailable ? 'ENABLED' : 'DISABLED'}`);
    console.log(`│ Cache Key: ${cacheKey || 'N/A (image reference)'}`);
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

  // Use image analysis from Stage 0 if available
  const imagePayload = reference.hasReference ? reference.imagePayload : null;
  const visualAnalysis = reference.hasReference ? reference.analysis : null;

  // Add visual analysis results as a specific hint
  if (visualAnalysis) {
    analysis.hints.visualAnalysis = visualAnalysis;
    console.log('  ✨ Integrating visual analysis into generation hints');
  }

  try {
    // Generate unified prompt (design + blueprint in one)
    const prompt = unifiedBlueprintPrompt(analysis, worldEditAvailable, !!imagePayload);

    if (DEBUG) {
      console.log('\n--- FINAL PROMPT SENT TO GEMINI ---');
      console.log(prompt);
      console.log('------------------------------------\n');
    }

    // Call LLM with fallback strategy
    // Attempt 1: Streaming (for better UX)
    const client = new GeminiClient(apiKey);
    let blueprint = null;

    try {
      console.log('[LLM] streaming=true attempt=1');
      console.log('🤖 Generating blueprint (streaming)...');

      let progressDots = 0;
      blueprint = await client.streamContent({
        prompt,
        images: imagePayload ? [imagePayload] : [],
        temperature: 0.5,
        onProgress: (progress) => {
          progressDots++;
          // Show live progress every few chunks
          process.stdout.write(`\r  Thinking... ${'.'.repeat(progressDots % 10 + 1).padEnd(10)} (${Math.round(progress.bytesReceived / 1024)}KB)`);
        }
      });

      // Clear progress line
      process.stdout.write('\r' + ' '.repeat(60) + '\r');
      console.log('[LLM] streaming=true success');

    } catch (streamError) {
      // Clear progress line if failed mid-stream
      process.stdout.write('\r' + ' '.repeat(60) + '\r');
      console.warn(`[LLM] streaming failed: ${streamError.message}. Retrying with streaming=false`);

      // Attempt 2: Non-streaming (Fallback)
      try {
        console.log('[LLM] streaming=false attempt=2');
        console.log('🤖 Generating blueprint (fallback mode)...');

        blueprint = await client.generateContent({
          prompt,
          images: imagePayload ? [imagePayload] : [],
          temperature: 0.5,
          responseFormat: 'json'
        });

        console.log('[LLM] streaming=false success');
      } catch (fallbackError) {
        console.error(`[LLM] non-streaming failed: ${fallbackError.message}`);
        throw new Error(`All generation attempts failed. Stream error: ${streamError.message}. Fallback error: ${fallbackError.message}`);
      }
    }

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
    // DISABLED: Conflicts with Cursor-relative movements
    // blueprint = optimizeBuildOrder(blueprint);

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
      const debugPaletteCount = Array.isArray(blueprint.palette)
        ? blueprint.palette.length
        : Object.keys(blueprint.palette || {}).length;
      console.log(`│ Palette: ${debugPaletteCount} blocks`);
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
    const paletteCount = Array.isArray(blueprint.palette)
      ? blueprint.palette.length
      : Object.keys(blueprint.palette || {}).length;
    console.log(`  Blocks: ${paletteCount} types`);
    console.log(`  Steps: ${blueprint.steps.length} operations`);

    // POST-PROCESS: Optimize the blueprint (fix coords, merge ops)
    const optimized = optimizeBlueprint(blueprint);

    // CACHE STORE: Save successful LLM-generated blueprint
    if (cacheKey) {
      blueprintCache.set(cacheKey, optimized);
      console.log(`📦 Cache STORE: Blueprint cached (key: ${cacheKey.substring(0, 12)}...)`);
    }

    return optimized;
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

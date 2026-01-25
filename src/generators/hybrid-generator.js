/**
 * Hybrid Blueprint Generator
 * Intelligently chooses between algorithmic and LLM-based generation
 */

import { generateCastle } from './castle-builder.js';
import { generatePixelArt } from './pixel-art-builder.js';
import { generateHouse } from './house-builder.js';
import { GeminiClient } from '../llm/gemini-client.js';

/**
 * Generate blueprint using best available method
 * @param {Object} designPlan - Design plan
 * @param {string[]} allowlist - Allowed blocks
 * @param {string} apiKey - Gemini API key (optional for algorithmic builds)
 * @param {boolean} worldEditAvailable - Whether WorldEdit is available
 * @returns {Promise<Object>} - Blueprint object
 */
export async function generateBlueprintHybrid(designPlan, allowlist, apiKey, worldEditAvailable = false) {
  const buildType = designPlan.buildType || 'house';
  const description = designPlan.description?.toLowerCase() || '';

  console.log(`Hybrid generator: Analyzing build type "${buildType}"...`);

  try {
    // Try algorithmic generation first for supported types
    if (shouldUseAlgorithmic(buildType, description, designPlan)) {
      console.log('  → Using algorithmic generation (fast, deterministic)');
      return generateAlgorithmic(buildType, designPlan, allowlist, worldEditAvailable);
    }

    // Fall back to LLM generation for custom/complex builds
    console.log('  → Using LLM generation (flexible, slower)');
    if (!apiKey) {
      throw new Error('API key required for LLM-based generation');
    }
    return await generateWithLLM(designPlan, allowlist, apiKey, worldEditAvailable);

  } catch (algorithmicError) {
    // If algorithmic fails, try LLM as fallback
    console.warn(`  ⚠ Algorithmic generation failed: ${algorithmicError.message}`);

    if (!apiKey) {
      throw algorithmicError; // Can't fall back without API key
    }

    console.log('  → Falling back to LLM generation...');
    return await generateWithLLM(designPlan, allowlist, apiKey, worldEditAvailable);
  }
}

/**
 * Determine if algorithmic generation should be used
 */
function shouldUseAlgorithmic(buildType, description, designPlan) {
  // Castle: Use algorithmic if dimensions are suitable
  if (buildType === 'castle') {
    const { width, depth } = designPlan.dimensions;
    return width >= 15 && depth >= 15 && width <= 100 && depth <= 100;
  }

  // Pixel art: Use algorithmic for known patterns
  if (buildType === 'pixel_art') {
    const patterns = [
      'heart', 'smiley', 'face', 'creeper', 'sword', 'star',
      'arrow', 'cross', 'plus', 'checkerboard'
    ];
    return patterns.some(pattern => description.includes(pattern));
  }

  // House: Use algorithmic for simple houses (not custom/complex requests)
  if (buildType === 'house') {
    const { width, height, depth } = designPlan.dimensions;
    const features = designPlan.features || [];

    // Use algorithmic if:
    // - Dimensions are reasonable (5-30 blocks)
    // - Features are standard (door, windows, roof, chimney, porch)
    const isReasonableSize = width >= 5 && width <= 30 &&
                             depth >= 5 && depth <= 30 &&
                             height >= 5 && height <= 20;

    const standardFeatures = ['door', 'window', 'roof', 'chimney', 'porch', 'entrance'];
    const hasOnlyStandardFeatures = features.every(f =>
      standardFeatures.some(sf => f.toLowerCase().includes(sf))
    );

    return isReasonableSize && (features.length === 0 || hasOnlyStandardFeatures);
  }

  // Future: Add more algorithmic builders here
  // - Towers
  // - Bridges
  // - Basic trees

  return false;
}

/**
 * Generate blueprint algorithmically
 */
function generateAlgorithmic(buildType, designPlan, allowlist, worldEditAvailable) {
  switch (buildType) {
    case 'castle':
      return generateCastle(designPlan, allowlist, worldEditAvailable);

    case 'pixel_art':
      return generatePixelArt(designPlan, allowlist);

    case 'house':
      return generateHouse(designPlan, allowlist, worldEditAvailable);

    default:
      throw new Error(`No algorithmic generator for build type: ${buildType}`);
  }
}

/**
 * Generate blueprint using LLM
 */
async function generateWithLLM(designPlan, allowlist, apiKey, worldEditAvailable) {
  const client = new GeminiClient(apiKey);
  const blueprint = await client.generateBlueprint(designPlan, allowlist, worldEditAvailable);

  // Mark as LLM-generated for debugging
  blueprint.generationMethod = 'llm';

  return blueprint;
}

/**
 * Get supported algorithmic build types and patterns
 */
export function getSupportedAlgorithmicBuilds() {
  return {
    house: {
      name: 'House',
      description: 'Simple house with walls, roof, windows, and door',
      features: ['door', 'windows', 'roof', 'chimney', 'porch'],
      minDimensions: { width: 5, height: 5, depth: 5 },
      maxDimensions: { width: 30, height: 20, depth: 30 }
    },
    castle: {
      name: 'Castle',
      description: 'Medieval castle with walls, towers, and keep',
      minDimensions: { width: 15, height: 10, depth: 15 },
      maxDimensions: { width: 100, height: 256, depth: 100 }
    },
    pixel_art: {
      name: 'Pixel Art',
      description: 'Simple pixel art patterns',
      patterns: [
        'heart', 'smiley', 'face', 'creeper', 'sword',
        'star', 'arrow', 'cross', 'plus', 'checkerboard'
      ],
      minDimensions: { width: 3, height: 3, depth: 1 },
      maxDimensions: { width: 64, height: 64, depth: 1 }
    }
  };
}

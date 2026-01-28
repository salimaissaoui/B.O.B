import { detectBuildType, detectTheme, analyzePrompt as analyzeBuildTypes } from '../config/build-types.js';
import { retrieveBlueprint } from '../library/blueprint-library.js';

const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

/**
 * Stage 1: Lightweight analyzer (no LLM)
 * Extracts hints from prompt for generator guidance
 *
 * This stage is fast and deterministic - no API calls.
 * It provides suggestions that the generator can use or override.
 */

/**
 * Enhanced build type detection with additional heuristics
 */
function enhancedBuildTypeDetection(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  // PIXEL ART DETECTION - highest priority patterns
  const pixelArtPatterns = [
    /\bpixel\s*art\b/i,
    /\bpixelart\b/i,
    /\bsprite\b/i,
    /\b8-?bit\b/i,
    /\b16-?bit\b/i,
    /\bretro\s*(game|style)?\b/i,
    /\bmosaic\b/i,
    /\blogo\b/i,
    /\bfrom\s+image\b/i
  ];

  for (const pattern of pixelArtPatterns) {
    if (pattern.test(prompt)) {
      return { type: 'pixel_art', confidence: 'high', reason: 'Pixel art keyword detected' };
    }
  }

  // PLATFORM DETECTION - simple flat structures
  const platformPatterns = [
    /\bplatform\b/i,
    /\bflat\b.*\b(only|just)\b/i,
    /\b(only|just)\b.*\bflat\b/i,
    /\bfoundation\s*only\b/i,
    /\bfloor\s*only\b/i,
    /\bpad\b/i,
    /\bslab\b.*\b(only|just)\b/i,
    /\b\d+\s*x\s*\d+\b.*\b(only|just|simple)\b/i,  // "10x10 stone only"
    /\b(simple|basic)\b.*\b\d+\s*x\s*\d+\b/i       // "simple 10x10 stone"
  ];

  for (const pattern of platformPatterns) {
    if (pattern.test(prompt)) {
      return { type: 'platform', confidence: 'high', reason: 'Platform/flat structure detected' };
    }
  }

  // TREE DETECTION - organic builds
  const treePatterns = [
    /\btree\b/i,
    /\boak\s*tree\b/i,
    /\bspruce\s*tree\b/i,
    /\bbirch\s*tree\b/i,
    /\bwillow\b/i,
    /\bcherry\s*(tree|blossom)\b/i
  ];

  for (const pattern of treePatterns) {
    if (pattern.test(prompt)) {
      return { type: 'tree', confidence: 'high', reason: 'Tree/organic structure detected' };
    }
  }

  // Fall back to standard detection
  return null;
}

/**
 * Extract explicit dimensions from prompt (e.g., "10x10", "20x15x30")
 */
function extractDimensions(prompt) {
  // Match patterns like "10x10", "20x15", "5x5x5"
  const match = prompt.match(/(\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+))?/i);
  if (match) {
    return {
      width: parseInt(match[1], 10),
      depth: parseInt(match[2], 10),
      height: match[3] ? parseInt(match[3], 10) : null,
      explicit: true
    };
  }
  return null;
}

/**
 * Extract explicit material from prompt
 * Order matters: more specific materials checked first (e.g., "cobblestone" before "stone")
 */
function extractMaterial(prompt) {
  // Array of [keyword, block] pairs - order matters!
  // More specific patterns come first to avoid substring matching issues
  const materialPatterns = [
    ['cobblestone', 'cobblestone'],
    ['cobble', 'cobblestone'],
    ['blackstone', 'blackstone'],
    ['sandstone', 'sandstone'],
    ['deepslate', 'deepslate_bricks'],
    ['stone', 'stone'],
    ['dark oak', 'dark_oak_planks'],
    ['oak', 'oak_planks'],
    ['spruce', 'spruce_planks'],
    ['birch', 'birch_planks'],
    ['nether brick', 'nether_bricks'],
    ['brick', 'bricks'],
    ['quartz', 'quartz_block'],
    ['white concrete', 'white_concrete'],
    ['gray concrete', 'gray_concrete'],
    ['black concrete', 'black_concrete'],
    ['concrete', 'white_concrete'],
    ['prismarine', 'prismarine_bricks']
  ];

  const lowerPrompt = prompt.toLowerCase();
  for (const [keyword, block] of materialPatterns) {
    if (lowerPrompt.includes(keyword)) {
      return { block, keyword, explicit: true };
    }
  }
  return null;
}

/**
 * Main analysis function
 */
export function analyzePrompt(userPrompt) {
  // Use existing analysis from build-types.js
  const analysis = analyzeBuildTypes(userPrompt);

  // Enhanced build type detection (checks for pixel_art, platform, tree first)
  const enhancedType = enhancedBuildTypeDetection(userPrompt);

  // Standard detection
  const buildTypeInfo = detectBuildType(userPrompt);
  const themeInfo = detectTheme(userPrompt);

  // Use enhanced detection if it found something with high confidence
  const finalBuildType = enhancedType?.confidence === 'high'
    ? enhancedType.type
    : buildTypeInfo.type;

  // Extract explicit dimensions and materials
  const explicitDimensions = extractDimensions(userPrompt);
  const explicitMaterial = extractMaterial(userPrompt);

  // Try to retrieve a matching blueprint from library
  let libraryBlueprint = null;
  try {
    libraryBlueprint = retrieveBlueprint({
      userPrompt,
      buildType: finalBuildType
    });
  } catch (e) {
    // Library retrieval is optional
    if (DEBUG) {
      console.log(`Blueprint library: ${e.message}`);
    }
  }

  // Build hints with explicit overrides
  const dimensions = explicitDimensions || analysis.dimensions;
  const materials = explicitMaterial
    ? { ...analysis.materials, primary: explicitMaterial.block }
    : analysis.materials;

  const result = {
    userPrompt,
    buildType: finalBuildType,
    buildTypeInfo: enhancedType || buildTypeInfo,
    theme: themeInfo,
    quality: analysis.quality,  // Quality modifiers (beautiful, majestic, etc.)
    hints: {
      dimensions,
      materials,
      features: analysis.features,
      size: analysis.size?.size || 'medium',
      operations: analysis.operations,
      explicitDimensions: !!explicitDimensions,
      explicitMaterial: !!explicitMaterial,
      qualityLevel: analysis.quality?.quality || 'standard',
      qualityTips: analysis.quality?.tips || []
    },
    libraryBlueprint
  };

  if (DEBUG) {
    console.log('\n┌─────────────────────────────────────────────────────────');
    console.log('│ ANALYZER: Prompt Analysis');
    console.log('├─────────────────────────────────────────────────────────');
    console.log(`│ Prompt: "${userPrompt}"`);
    console.log(`│ Build Type: ${finalBuildType}`);
    console.log(`│ Theme: ${themeInfo?.theme || 'default'}`);
    console.log(`│ Size: ${result.hints.size}`);
    console.log(`│ Quality: ${result.hints.qualityLevel}${analysis.quality?.modifiers?.length ? ` (${analysis.quality.modifiers.join(', ')})` : ''}`);
    if (explicitDimensions) {
      console.log(`│ Explicit Dimensions: ${explicitDimensions.width}x${explicitDimensions.depth}${explicitDimensions.height ? 'x' + explicitDimensions.height : ''}`);
    }
    if (explicitMaterial) {
      console.log(`│ Explicit Material: ${explicitMaterial.block}`);
    }
    if (libraryBlueprint) {
      console.log(`│ Library Match: ${libraryBlueprint.templateName || 'found'}`);
    }
    console.log('└─────────────────────────────────────────────────────────\n');
  }

  return result;
}

export default analyzePrompt;

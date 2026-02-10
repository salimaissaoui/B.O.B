import { detectBuildType, detectTheme, analyzePrompt as analyzeBuildTypes } from '../config/build-types.js';
import { INTENT_SCALE_MAP } from '../config/creative-scales.js';
import { detectCharacter } from '../config/character-palettes.js';

import { DEBUG } from '../utils/debug.js';

/**
 * Detect intent-based scale from prompt
 * Maps descriptive words to scale categories for dimension selection
 * @param {string} prompt - User's build request
 * @returns {Object} - { scale: string, matchedKeyword: string|null, dimensions: { min, max, default } }
 */
function detectIntentScale(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  const scaleKeywords = {
    tiny: ['tiny', 'miniature', 'mini'],
    small: ['small', 'little', 'compact'],
    medium: ['medium', 'normal', 'standard'],
    large: ['large', 'big', 'grand'],
    massive: ['massive', 'huge', 'enormous'],
    towering: ['towering', 'soaring', 'sky-high'],
    colossal: ['colossal', 'gigantic', 'epic', 'legendary', 'ancient']
  };

  // Check in priority order (most specific first)
  for (const scale of ['colossal', 'towering', 'massive', 'large', 'medium', 'small', 'tiny']) {
    const keywords = scaleKeywords[scale];
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerPrompt)) {
        return {
          scale,
          matchedKeyword: keyword,
          dimensions: INTENT_SCALE_MAP[scale] || INTENT_SCALE_MAP.medium
        };
      }
    }
  }

  return {
    scale: 'medium',
    matchedKeyword: null,
    dimensions: INTENT_SCALE_MAP.medium
  };
}

/**
 * Infer theme for palette selection based on prompt and build type
 * @param {string} prompt - User's build request
 * @param {string} buildType - Detected build type
 * @returns {Object} - { theme: string, suggestedPaletteSize: number, lockPalette: boolean }
 */
function inferThemeForPalette(prompt, buildType) {
  const lowerPrompt = prompt.toLowerCase();

  const themes = {
    organic: {
      patterns: ['tree', 'forest', 'nature', 'plant', 'garden', 'jungle'],
      suggestedPaletteSize: 4,
      lockPalette: true
    },
    fantasy: {
      patterns: ['magic', 'enchanted', 'mystical', 'wizard', 'fairy', 'dragon'],
      suggestedPaletteSize: 6,
      lockPalette: false
    },
    medieval: {
      patterns: ['castle', 'fortress', 'medieval', 'knight', 'keep'],
      suggestedPaletteSize: 6,
      lockPalette: false
    },
    modern: {
      patterns: ['modern', 'futuristic', 'sleek', 'contemporary', 'minimalist'],
      suggestedPaletteSize: 5,
      lockPalette: false
    },
    gothic: {
      patterns: ['gothic', 'dark', 'evil', 'haunted', 'vampire'],
      suggestedPaletteSize: 5,
      lockPalette: false
    },
    natural: {
      patterns: ['natural', 'organic', 'rustic', 'wooden', 'cabin'],
      suggestedPaletteSize: 4,
      lockPalette: true
    }
  };

  for (const [themeName, themeConfig] of Object.entries(themes)) {
    for (const pattern of themeConfig.patterns) {
      if (lowerPrompt.includes(pattern)) {
        return {
          theme: themeName,
          suggestedPaletteSize: themeConfig.suggestedPaletteSize,
          lockPalette: themeConfig.lockPalette
        };
      }
    }
  }

  // Default based on build type
  if (buildType === 'tree') {
    return { theme: 'organic', suggestedPaletteSize: 4, lockPalette: true };
  }

  return { theme: 'default', suggestedPaletteSize: 5, lockPalette: false };
}

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

  // TREEHOUSE DETECTION - must come BEFORE tree detection!
  const treehousePatterns = [
    /\btree\s*house\b/i,
    /\btreehouse\b/i,
    /\btree\s*fort\b/i,
    /\btree\s*cabin\b/i
  ];

  for (const pattern of treehousePatterns) {
    if (pattern.test(prompt)) {
      return { type: 'treehouse', confidence: 'high', reason: 'Treehouse structure detected' };
    }
  }

  // TREE DETECTION - organic builds (after treehouse check)
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
 * Detect image URL or reference in prompt
 */
function extractImageSource(prompt) {
  const urlRegex = /(https?:\/\/[^\s]+)/i;
  const match = prompt.match(urlRegex);

  if (match) {
    return {
      url: match[1],
      hasImage: true
    };
  }

  // Check for "from image" or similar but without URL (might be provided via separate mechanism later)
  if (/\bfrom\s+(image|photo|picture)\b/i.test(prompt)) {
    return {
      url: null,
      hasImage: true
    };
  }

  return {
    url: null,
    hasImage: false
  };
}

/**
 * Main analysis function
 */
export function analyzePrompt(userPrompt) {
  // Use existing analysis from build-types.js
  const analysis = analyzeBuildTypes(userPrompt);

  // Detect image source
  const imageSource = extractImageSource(userPrompt);

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

  // NEW: Intent-based scale detection
  const intentScale = detectIntentScale(userPrompt);

  // NEW: Theme inference for palette
  const themeInference = inferThemeForPalette(userPrompt, finalBuildType);

  // Build hints with explicit overrides
  // Use intent scale dimensions if no explicit dimensions provided
  let dimensions = explicitDimensions || analysis.dimensions;

  // Scale dimensions based on intent ONLY if we don't have type-specific dimensions
  // This prevents overriding specific dimensions (like tall trees) with generic boxes
  const libraryBlueprint = null; // Explicitly null as library is disabled

  if (intentScale.scale !== 'medium' && !explicitDimensions && !analysis.dimensions) {
    const scaleDims = intentScale.dimensions;
    dimensions = {
      width: scaleDims.default,
      height: scaleDims.default,
      depth: scaleDims.default
    };
  }

  const materials = explicitMaterial
    ? { ...analysis.materials, primary: explicitMaterial.block }
    : analysis.materials;

  // NEW: Detect iconic characters (Pikachu, Mario, etc.)
  const character = detectCharacter(userPrompt);

  const result = {
    userPrompt,
    buildType: finalBuildType,
    buildTypeInfo: enhancedType || buildTypeInfo,
    theme: themeInfo,
    quality: analysis.quality,  // Quality modifiers (beautiful, majestic, etc.)
    intentScale,  // Intent-based scale detection
    themeInference,  // Theme inference for palette
    character,  // NEW: Detected iconic character (if any)
    imageSource, // NEW: Detected image URL or reference
    hints: {
      dimensions,
      materials,
      features: analysis.features,
      size: analysis.size?.size || intentScale.scale || 'medium',
      operations: analysis.operations,
      explicitDimensions: !!explicitDimensions,
      explicitMaterial: !!explicitMaterial,
      qualityLevel: analysis.quality?.quality || 'standard',
      qualityTips: analysis.quality?.tips || [],
      // Palette hints from theme inference
      suggestedPaletteSize: themeInference.suggestedPaletteSize,
      lockPalette: themeInference.lockPalette
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
    console.log(`│ Intent Scale: ${intentScale.scale}${intentScale.matchedKeyword ? ` (matched: "${intentScale.matchedKeyword}")` : ''}`);
    console.log(`│ Quality: ${result.hints.qualityLevel}${analysis.quality?.modifiers?.length ? ` (${analysis.quality.modifiers.join(', ')})` : ''}`);
    console.log(`│ Palette Theme: ${themeInference.theme} (${themeInference.suggestedPaletteSize} blocks, lock: ${themeInference.lockPalette})`);
    if (explicitDimensions) {
      console.log(`│ Explicit Dimensions: ${explicitDimensions.width}x${explicitDimensions.depth}${explicitDimensions.height ? 'x' + explicitDimensions.height : ''}`);
    }
    if (explicitMaterial) {
      console.log(`│ Explicit Material: ${explicitMaterial.block}`);
    }
    if (libraryBlueprint) {
      console.log(`│ Library Match: ${libraryBlueprint.templateName || 'found'}`);
    }
    if (character) {
      console.log(`│ 🎨 Character: ${character.name} (${Object.keys(character.colors).length} colors)`);
    }
    console.log('└─────────────────────────────────────────────────────────\n');
  }

  return result;
}

export default analyzePrompt;

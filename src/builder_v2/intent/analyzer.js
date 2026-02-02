/**
 * Builder v2 Intent Analyzer
 *
 * Converts user prompts into structured BuildIntentV2 objects
 * without using LLM (deterministic extraction).
 */

import { randomUUID } from 'crypto';

/**
 * Category detection patterns
 */
const CATEGORY_PATTERNS = {
  landmark: [
    /\b(eiffel|statue of liberty|big ben|colosseum|taj mahal|pyramid|sphinx|tower of pisa|great wall|acropolis|parthenon|kremlin|burj|empire state|chrysler)\b/i,
    /\b(famous|landmark|monument|iconic)\b/i
  ],
  architecture: [
    /\b(house|home|mansion|castle|fortress|palace|church|cathedral|temple|mosque|tower|skyscraper|building|barn|cabin|cottage|villa|apartment|hotel|shop|store|restaurant|cafe|office|warehouse|factory|school|hospital|library|museum|theater|stadium|arena|bridge)\b/i
  ],
  organic: [
    /\b(tree|forest|garden|flower|plant|bush|shrub|hedge|vine|grass|mushroom|coral|rock|mountain|hill|cliff|cave|island|waterfall|river|lake|ocean|volcano)\b/i
  ],
  statue: [
    /\b(statue|sculpture|figure|monument|bust|effigy|3d\s*(model|figure|character))\b/i,
    /\bstatue\s+of\b/i
  ],
  pixel_art: [
    /\b(pixel\s*art|sprite|2d|flat|retro|8[- ]?bit|16[- ]?bit)\b/i,
    /\b(pixel|pixelated)\b/i
  ],
  abstract: [
    /\b(abstract|geometric|fractal|pattern|spiral|helix|tesseract|mobius|impossible|optical\s*illusion)\b/i
  ]
};

/**
 * Scale detection patterns
 */
const SCALE_PATTERNS = {
  tiny: /\b(tiny|mini|miniature|micro|small|little)\b/i,
  small: /\b(small|compact|modest)\b/i,
  medium: /\b(medium|moderate|normal|regular|standard)\b/i,
  large: /\b(large|big|grand|spacious)\b/i,
  massive: /\b(massive|huge|enormous|gigantic|vast)\b/i,
  colossal: /\b(colossal|epic|legendary|monumental|immense|towering)\b/i
};

/**
 * Complexity detection patterns
 */
const COMPLEXITY_PATTERNS = {
  simple: /\b(simple|basic|plain|minimal|easy)\b/i,
  moderate: /\b(moderate|decent|nice|good)\b/i,
  complex: /\b(complex|detailed|intricate|elaborate|fancy|ornate)\b/i,
  intricate: /\b(intricate|highly\s*detailed|masterpiece|exceptional|impressive|stunning|beautiful)\b/i
};

/**
 * Style detection patterns
 * NOTE: Order matters - more specific patterns (gothic) should come before broader ones (medieval)
 */
const STYLE_PATTERNS = {
  gothic: /\b(gothic|dark|spooky|haunted|vampire)\b/i,
  medieval: /\b(medieval|castle|knight|fortress|dungeon)\b/i,
  modern: /\b(modern|contemporary|minimalist|sleek|futuristic)\b/i,
  rustic: /\b(rustic|wooden|cabin|barn|country|farmhouse)\b/i,
  oriental: /\b(oriental|asian|japanese|chinese|pagoda|temple|zen)\b/i,
  fantasy: /\b(fantasy|magical|wizard|elven|fairy|enchanted|mystical)\b/i,
  organic: /\b(organic|natural|living|overgrown)\b/i,
  industrial: /\b(industrial|factory|steampunk|mechanical|iron|steel)\b/i
};

/**
 * Feature extraction patterns
 */
const FEATURE_PATTERNS = {
  interior: /\b(interior|inside|furnished|decorated|rooms?)\b/i,
  lighting: /\b(light(s|ing|ed)?|lantern|torch|glow|illuminat)\b/i,
  garden: /\b(garden|yard|lawn|landscap)\b/i,
  balcony: /\b(balcon(y|ies)|terrace|deck|patio)\b/i,
  tower: /\b(tower|spire|turret)\b/i,
  basement: /\b(basement|cellar|underground)\b/i,
  pool: /\b(pool|pond|fountain|water\s*feature)\b/i,
  garage: /\b(garage|parking|carport)\b/i,
  chimney: /\b(chimney|fireplace|hearth)\b/i,
  porch: /\b(porch|veranda|entrance)\b/i
};

/**
 * Dimension extraction patterns
 */
const DIMENSION_PATTERNS = {
  width: /(\d+)\s*(?:x|\*|by|wide|width|w)/i,
  height: /(\d+)\s*(?:tall|high|height|h|blocks?\s*(?:tall|high))/i,
  depth: /(\d+)\s*(?:deep|depth|d|long|length)/i,
  explicit: /(\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+))?/i
};

/**
 * Material extraction patterns
 */
const MATERIAL_KEYWORDS = {
  stone: ['stone', 'cobblestone', 'granite', 'diorite', 'andesite'],
  brick: ['brick', 'bricks', 'red brick'],
  wood: ['wood', 'wooden', 'oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark oak', 'mangrove', 'cherry'],
  concrete: ['concrete'],
  quartz: ['quartz', 'white'],
  sandstone: ['sandstone', 'sand'],
  prismarine: ['prismarine', 'underwater', 'ocean'],
  nether: ['nether', 'netherrack', 'blackstone', 'basalt'],
  end: ['end', 'purpur', 'end stone']
};

/**
 * Extract reference subject (for landmarks/statues)
 */
function extractReference(prompt) {
  // Famous landmarks
  const landmarkMatch = prompt.match(/\b(eiffel\s*tower|statue\s*of\s*liberty|big\s*ben|colosseum|taj\s*mahal|great\s*pyramid|sphinx|tower\s*of\s*pisa|great\s*wall|parthenon|burj\s*khalifa|empire\s*state|chrysler\s*building)\b/i);
  if (landmarkMatch) {
    return landmarkMatch[0].toLowerCase().replace(/\s+/g, '_');
  }

  // Character statues
  const characterMatch = prompt.match(/\b(pikachu|mario|luigi|link|zelda|sonic|kirby|creeper|steve|alex|enderman|villager|iron\s*golem|dragon|phoenix|griffin|unicorn|mermaid|centaur)\b/i);
  if (characterMatch) {
    return characterMatch[0].toLowerCase().replace(/\s+/g, '_');
  }

  // Generic "statue of X"
  const statueOfMatch = prompt.match(/statue\s+of\s+(?:a\s+)?(\w+)/i);
  if (statueOfMatch) {
    return statueOfMatch[1].toLowerCase();
  }

  return null;
}

/**
 * Detect category from prompt
 */
function detectCategory(prompt) {
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        return category;
      }
    }
  }
  return 'architecture';  // Default
}

/**
 * Detect subcategory based on category and prompt
 */
function detectSubcategory(prompt, category) {
  const subcategories = {
    architecture: {
      house: /\b(house|home|mansion|villa|cottage|cabin)\b/i,
      castle: /\b(castle|fortress|palace|citadel)\b/i,
      tower: /\b(tower|lighthouse|watchtower|bell\s*tower)\b/i,
      church: /\b(church|cathedral|chapel|temple|mosque|shrine)\b/i,
      commercial: /\b(shop|store|restaurant|cafe|inn|tavern|hotel|bar|pub)\b/i,
      industrial: /\b(factory|warehouse|mill|forge|smithy|workshop)\b/i
    },
    organic: {
      tree: /\b(tree|oak|birch|spruce|willow)\b/i,
      garden: /\b(garden|flower|bush|hedge)\b/i,
      terrain: /\b(mountain|hill|cliff|cave|rock)\b/i,
      water: /\b(waterfall|river|lake|pond|fountain)\b/i
    },
    statue: {
      character: /\b(pikachu|mario|sonic|character|person|figure)\b/i,
      animal: /\b(dragon|horse|eagle|lion|wolf|bear|cat|dog)\b/i,
      abstract: /\b(abstract|geometric|monument)\b/i
    }
  };

  const categoryPatterns = subcategories[category];
  if (!categoryPatterns) return null;

  for (const [sub, pattern] of Object.entries(categoryPatterns)) {
    if (pattern.test(prompt)) {
      return sub;
    }
  }

  return null;
}

/**
 * Detect scale from prompt
 */
function detectScale(prompt) {
  // Check explicit size keywords
  for (const [scale, pattern] of Object.entries(SCALE_PATTERNS)) {
    if (pattern.test(prompt)) {
      return scale;
    }
  }

  // Check for explicit dimensions
  const dimMatch = prompt.match(DIMENSION_PATTERNS.explicit);
  if (dimMatch) {
    const width = parseInt(dimMatch[1]);
    const maxDim = Math.max(width, parseInt(dimMatch[2]) || width, parseInt(dimMatch[3]) || width);

    if (maxDim <= 10) return 'tiny';
    if (maxDim <= 25) return 'small';
    if (maxDim <= 50) return 'medium';
    if (maxDim <= 100) return 'large';
    if (maxDim <= 200) return 'massive';
    return 'colossal';
  }

  return 'medium';  // Default
}

/**
 * Detect complexity from prompt
 */
function detectComplexity(prompt) {
  for (const [complexity, pattern] of Object.entries(COMPLEXITY_PATTERNS)) {
    if (pattern.test(prompt)) {
      return complexity;
    }
  }
  return 'moderate';  // Default
}

/**
 * Detect style from prompt
 */
function detectStyle(prompt) {
  for (const [style, pattern] of Object.entries(STYLE_PATTERNS)) {
    if (pattern.test(prompt)) {
      return style;
    }
  }
  return null;
}

/**
 * Extract features from prompt
 */
function extractFeatures(prompt) {
  const features = [];

  for (const [feature, pattern] of Object.entries(FEATURE_PATTERNS)) {
    if (pattern.test(prompt)) {
      features.push(feature);
    }
  }

  return features;
}

/**
 * Extract explicit dimensions from prompt
 */
function extractDimensions(prompt) {
  const result = {};

  // Try explicit WxHxD format
  const explicitMatch = prompt.match(DIMENSION_PATTERNS.explicit);
  if (explicitMatch) {
    result.width = parseInt(explicitMatch[1]);
    result.height = parseInt(explicitMatch[2]);
    if (explicitMatch[3]) {
      result.depth = parseInt(explicitMatch[3]);
    }
    return result;
  }

  // Try individual dimensions
  const heightMatch = prompt.match(DIMENSION_PATTERNS.height);
  if (heightMatch) {
    result.height = parseInt(heightMatch[1]);
  }

  const widthMatch = prompt.match(DIMENSION_PATTERNS.width);
  if (widthMatch) {
    result.width = parseInt(widthMatch[1]);
  }

  const depthMatch = prompt.match(DIMENSION_PATTERNS.depth);
  if (depthMatch) {
    result.depth = parseInt(depthMatch[1]);
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Extract material preferences from prompt
 */
function extractMaterials(prompt) {
  const result = {
    required: [],
    preferred: [],
    forbidden: []
  };

  const lower = prompt.toLowerCase();

  // Check for explicit material mentions
  for (const [category, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        result.preferred.push(category);
        break;
      }
    }
  }

  // Check for "no X" patterns
  const noMatch = lower.match(/no\s+(stone|wood|glass|concrete|brick)/gi);
  if (noMatch) {
    for (const match of noMatch) {
      const material = match.replace(/no\s+/i, '').toLowerCase();
      result.forbidden.push(material);
    }
  }

  return result;
}

/**
 * Normalize prompt text
 */
function normalizePrompt(raw) {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Analyze prompt and generate BuildIntentV2
 *
 * @param {string} prompt - User's build request
 * @param {Object} context - Execution context
 * @param {boolean} context.worldEditAvailable - Whether WorldEdit is detected
 * @param {string} context.serverVersion - Minecraft server version
 * @param {Object} [context.imageAnalysis] - Optional image analysis results
 * @returns {Object} BuildIntentV2 object
 */
export function analyzeIntentV2(prompt, context = {}) {
  const normalized = normalizePrompt(prompt);
  const category = detectCategory(normalized);

  // Build intent object, omitting null/undefined values
  const subcategory = detectSubcategory(normalized, category);
  const reference = extractReference(normalized);
  const dimensions = extractDimensions(normalized);
  const style = detectStyle(normalized);

  const intent = {
    version: '2.0',
    id: randomUUID(),
    timestamp: new Date().toISOString(),

    prompt: {
      raw: prompt,
      normalized,
      language: 'en'
    },

    intent: {
      category,
      scale: detectScale(normalized),
      complexity: detectComplexity(normalized)
    },

    constraints: {
      materials: extractMaterials(normalized),
      features: extractFeatures(normalized)
    },

    context: {
      worldEditAvailable: context.worldEditAvailable || false,
      serverVersion: context.serverVersion || '1.20.1',
      hasImageReference: !!context.imageAnalysis
    }
  };

  // Add optional fields only if they have values
  if (subcategory) intent.intent.subcategory = subcategory;
  if (reference) intent.intent.reference = reference;
  if (dimensions) intent.constraints.dimensions = dimensions;
  if (style) intent.constraints.style = style;
  if (context.imageAnalysis) intent.context.imageAnalysis = context.imageAnalysis;

  return intent;
}

export default {
  analyzeIntentV2,
  detectCategory,
  detectScale,
  detectComplexity,
  extractFeatures,
  extractDimensions,
  extractMaterials,
  normalizePrompt
};

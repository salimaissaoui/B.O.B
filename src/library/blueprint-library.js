/**
 * Blueprint Library
 *
 * Manages curated blueprint templates for common build types.
 * Provides retrieval by keywords and parameter substitution.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

// Blueprint cache
let blueprintCache = null;
let blueprintsPath = null;

/**
 * Initialize the blueprint library
 */
function initLibrary() {
  if (blueprintCache) return blueprintCache;

  // Find blueprints directory
  const possiblePaths = [
    join(__dirname, '../../assets/blueprints'),
    join(process.cwd(), 'assets/blueprints'),
    join(process.cwd(), 'B.O.B/assets/blueprints')
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      blueprintsPath = path;
      break;
    }
  }

  if (!blueprintsPath) {
    console.warn('Blueprint library not found');
    blueprintCache = [];
    return blueprintCache;
  }

  // Load all blueprint files
  blueprintCache = [];
  try {
    const files = readdirSync(blueprintsPath).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const content = readFileSync(join(blueprintsPath, file), 'utf-8');
        const blueprint = JSON.parse(content);
        blueprint._filename = file;
        blueprintCache.push(blueprint);
      } catch (error) {
        console.warn(`Failed to load blueprint ${file}: ${error.message}`);
      }
    }

    if (DEBUG) {
      console.log(`Blueprint library loaded: ${blueprintCache.length} templates`);
    }
  } catch (error) {
    console.warn(`Failed to read blueprints directory: ${error.message}`);
  }

  return blueprintCache;
}

/**
 * Calculate relevance score for a blueprint against keywords
 */
function calculateRelevance(blueprint, keywords, buildType) {
  let score = 0;
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  const allText = [
    blueprint.name || '',
    blueprint.description || '',
    ...(blueprint.tags || [])
  ].join(' ').toLowerCase();

  // Exact buildType match is highest priority
  if (blueprint.buildType === buildType) {
    score += 100;
  }

  // Tag matches
  for (const tag of (blueprint.tags || [])) {
    const lowerTag = tag.toLowerCase();
    for (const keyword of lowerKeywords) {
      if (lowerTag === keyword) {
        score += 50; // Exact tag match
      } else if (lowerTag.includes(keyword) || keyword.includes(lowerTag)) {
        score += 20; // Partial tag match
      }
    }
  }

  // Name/description matches
  for (const keyword of lowerKeywords) {
    if (allText.includes(keyword)) {
      score += 10;
    }
  }

  return score;
}

/**
 * Extract keywords from user prompt
 */
function extractKeywords(prompt) {
  // Remove common words and extract significant terms
  const stopWords = new Set([
    'a', 'an', 'the', 'build', 'make', 'create', 'construct',
    'me', 'please', 'can', 'you', 'i', 'want', 'need',
    'with', 'and', 'or', 'of', 'for', 'to', 'in', 'on'
  ]);

  return prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Find best matching blueprint for a prompt
 *
 * @param {string} prompt - User's build request
 * @param {string} buildType - Detected build type
 * @returns {Object|null} Best matching blueprint or null
 */
export function findBlueprint(prompt, buildType) {
  const blueprints = initLibrary();
  if (blueprints.length === 0) return null;

  const keywords = extractKeywords(prompt);

  if (DEBUG) {
    console.log(`Blueprint search: type=${buildType}, keywords=${keywords.join(', ')}`);
  }

  // Score all blueprints
  const scored = blueprints.map(bp => ({
    blueprint: bp,
    score: calculateRelevance(bp, keywords, buildType)
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return best match if score is above threshold
  if (scored[0] && scored[0].score >= 50) {
    if (DEBUG) {
      console.log(`Blueprint match: ${scored[0].blueprint.name} (score: ${scored[0].score})`);
    }
    return scored[0].blueprint;
  }

  return null;
}

/**
 * Parse dimension string like "10x10" or "20x15x30"
 */
function parseDimensions(prompt) {
  // Match patterns like "10x10", "20x15", "5x5x5"
  const match = prompt.match(/(\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+))?/i);
  if (match) {
    return {
      width: parseInt(match[1], 10),
      depth: parseInt(match[2], 10),
      height: match[3] ? parseInt(match[3], 10) : null
    };
  }
  return null;
}

/**
 * Extract material from prompt
 */
function extractMaterial(prompt) {
  const materials = {
    'stone': 'stone',
    'cobblestone': 'cobblestone',
    'cobble': 'cobblestone',
    'oak': 'oak_planks',
    'spruce': 'spruce_planks',
    'birch': 'birch_planks',
    'dark oak': 'dark_oak_planks',
    'brick': 'bricks',
    'sandstone': 'sandstone',
    'quartz': 'quartz_block',
    'concrete': 'white_concrete',
    'white concrete': 'white_concrete',
    'gray concrete': 'gray_concrete',
    'black concrete': 'black_concrete'
  };

  const lowerPrompt = prompt.toLowerCase();
  for (const [keyword, block] of Object.entries(materials)) {
    if (lowerPrompt.includes(keyword)) {
      return block;
    }
  }
  return null;
}

/**
 * Substitute parameters in a blueprint template
 *
 * @param {Object} template - Blueprint template
 * @param {Object} params - Parameter values to substitute
 * @returns {Object} Blueprint with substituted values
 */
export function applyParameters(template, params) {
  // Deep clone template
  const result = JSON.parse(JSON.stringify(template.template || template));

  // Merge default parameters with provided params
  const defaults = {};
  if (template.parameters) {
    for (const [key, config] of Object.entries(template.parameters)) {
      defaults[key] = config.default;
    }
  }
  const finalParams = { ...defaults, ...params };

  // Recursive parameter substitution
  function substitute(obj) {
    if (typeof obj === 'string') {
      // Replace ${param} patterns
      return obj.replace(/\$\{([^}]+)\}/g, (match, expr) => {
        // Handle simple variable substitution
        if (finalParams[expr] !== undefined) {
          return finalParams[expr];
        }
        // Handle expressions like ${width-1}
        try {
          // Create a safe evaluation context
          const context = { ...finalParams, Math };
          const fn = new Function(...Object.keys(context), `return ${expr}`);
          return fn(...Object.values(context));
        } catch {
          return match; // Return original if evaluation fails
        }
      });
    } else if (Array.isArray(obj)) {
      return obj.map(substitute);
    } else if (obj && typeof obj === 'object') {
      const newObj = {};
      for (const [key, value] of Object.entries(obj)) {
        newObj[key] = substitute(value);
      }
      return newObj;
    }
    return obj;
  }

  const substituted = substitute(result);

  // Convert string numbers to actual numbers in size
  if (substituted.size) {
    for (const key of ['width', 'height', 'depth']) {
      if (typeof substituted.size[key] === 'string') {
        substituted.size[key] = parseInt(substituted.size[key], 10);
      }
    }
  }

  // Convert coordinates in steps
  if (substituted.steps) {
    for (const step of substituted.steps) {
      for (const key of ['from', 'to', 'pos', 'base', 'center']) {
        if (step[key]) {
          for (const coord of ['x', 'y', 'z']) {
            if (typeof step[key][coord] === 'string') {
              step[key][coord] = parseInt(step[key][coord], 10) || 0;
            }
          }
        }
      }
    }
  }

  return substituted;
}

/**
 * Try to retrieve and adapt a blueprint from the library
 *
 * @param {Object} analysis - Analysis from Stage 1
 * @returns {Object|null} Adapted blueprint or null
 */
export function retrieveBlueprint(analysis) {
  const { userPrompt, buildType } = analysis;

  // Find matching template
  const template = findBlueprint(userPrompt, buildType);
  if (!template) {
    if (DEBUG) {
      console.log('No matching blueprint template found');
    }
    return null;
  }

  // Extract parameters from prompt
  const params = {};

  // Dimensions from prompt
  const dims = parseDimensions(userPrompt);
  if (dims) {
    if (dims.width) params.width = dims.width;
    if (dims.depth) params.depth = dims.depth;
    if (dims.height) params.height = dims.height;
  }

  // Material from prompt
  const material = extractMaterial(userPrompt);
  if (material) {
    params.block = material;
    params.wallBlock = material;
  }

  // Apply parameters
  const blueprint = applyParameters(template, params);

  // Add metadata
  blueprint.buildType = buildType;
  blueprint.generationMethod = 'library_template';
  blueprint.templateName = template.name;

  if (DEBUG) {
    console.log(`Blueprint retrieved from library: ${template.name}`);
    console.log(`  Parameters: ${JSON.stringify(params)}`);
  }

  return blueprint;
}

/**
 * List all available blueprints
 */
export function listBlueprints() {
  const blueprints = initLibrary();
  return blueprints.map(bp => ({
    name: bp.name,
    description: bp.description,
    buildType: bp.buildType,
    tags: bp.tags
  }));
}

export default {
  findBlueprint,
  applyParameters,
  retrieveBlueprint,
  listBlueprints
};

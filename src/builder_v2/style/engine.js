/**
 * Builder v2 Style Engine
 *
 * Resolves semantic palette tokens to valid Minecraft blocks.
 * Handles gradients, trims, and theme-based styling.
 */

import { isValidBlock } from '../../config/blocks.js';

/**
 * Theme palettes - semantic tokens to block mappings
 */
export const THEME_PALETTES = {
  medieval: {
    primary: 'stone_bricks',
    secondary: 'cobblestone',
    accent: 'mossy_stone_bricks',
    trim: 'cracked_stone_bricks',
    wood_primary: 'oak_planks',
    wood_log: 'oak_log',
    wood_stripped: 'stripped_oak_log',
    roof: 'spruce_stairs',
    roof_slab: 'spruce_slab',
    floor: 'oak_planks',
    glass: 'glass_pane',
    light: 'lantern',
    metal: 'iron_bars',
    door: 'oak_door',
    fence: 'oak_fence'
  },

  modern: {
    primary: 'white_concrete',
    secondary: 'gray_concrete',
    accent: 'black_concrete',
    trim: 'light_gray_concrete',
    wood_primary: 'stripped_oak_log',
    wood_log: 'stripped_birch_log',
    wood_stripped: 'stripped_birch_log',
    roof: 'smooth_quartz_slab',
    roof_slab: 'smooth_quartz_slab',
    floor: 'polished_diorite',
    glass: 'glass',
    light: 'sea_lantern',
    metal: 'iron_block',
    door: 'iron_door',
    fence: 'iron_bars'
  },

  gothic: {
    primary: 'deepslate_bricks',
    secondary: 'polished_deepslate',
    accent: 'chiseled_deepslate',
    trim: 'deepslate_tiles',
    wood_primary: 'dark_oak_planks',
    wood_log: 'dark_oak_log',
    wood_stripped: 'stripped_dark_oak_log',
    roof: 'dark_oak_stairs',
    roof_slab: 'dark_oak_slab',
    floor: 'polished_blackstone_bricks',
    glass: 'gray_stained_glass_pane',
    light: 'soul_lantern',
    metal: 'chain',
    door: 'dark_oak_door',
    fence: 'nether_brick_fence'
  },

  rustic: {
    primary: 'oak_planks',
    secondary: 'spruce_planks',
    accent: 'stripped_oak_log',
    trim: 'oak_log',
    wood_primary: 'oak_planks',
    wood_log: 'oak_log',
    wood_stripped: 'stripped_oak_log',
    roof: 'spruce_stairs',
    roof_slab: 'spruce_slab',
    floor: 'spruce_planks',
    glass: 'glass_pane',
    light: 'torch',
    metal: 'iron_bars',
    door: 'oak_door',
    fence: 'oak_fence'
  },

  oriental: {
    primary: 'white_concrete',
    secondary: 'dark_prismarine',
    accent: 'red_concrete',
    trim: 'gold_block',
    wood_primary: 'dark_oak_planks',
    wood_log: 'dark_oak_log',
    wood_stripped: 'stripped_dark_oak_log',
    roof: 'dark_oak_stairs',
    roof_slab: 'dark_oak_slab',
    floor: 'polished_andesite',
    glass: 'glass_pane',
    light: 'lantern',
    metal: 'gold_block',
    door: 'dark_oak_door',
    fence: 'dark_oak_fence'
  },

  fantasy: {
    primary: 'purpur_block',
    secondary: 'end_stone_bricks',
    accent: 'amethyst_block',
    trim: 'crying_obsidian',
    wood_primary: 'crimson_planks',
    wood_log: 'crimson_stem',
    wood_stripped: 'stripped_crimson_stem',
    roof: 'purpur_stairs',
    roof_slab: 'purpur_slab',
    floor: 'polished_blackstone',
    glass: 'magenta_stained_glass_pane',
    light: 'end_rod',
    metal: 'amethyst_block',
    door: 'crimson_door',
    fence: 'crimson_fence'
  },

  organic: {
    primary: 'moss_block',
    secondary: 'rooted_dirt',
    accent: 'azalea_leaves',
    trim: 'oak_log',
    wood_primary: 'oak_planks',
    wood_log: 'oak_log',
    wood_stripped: 'stripped_oak_log',
    roof: 'azalea_leaves',
    roof_slab: 'oak_slab',
    floor: 'grass_block',
    glass: 'glass_pane',
    light: 'glow_lichen',
    metal: 'chain',
    door: 'oak_door',
    fence: 'oak_fence'
  },

  industrial: {
    primary: 'smooth_stone',
    secondary: 'iron_block',
    accent: 'copper_block',
    trim: 'exposed_copper',
    wood_primary: 'stripped_spruce_log',
    wood_log: 'spruce_log',
    wood_stripped: 'stripped_spruce_log',
    roof: 'stone_brick_slab',
    roof_slab: 'smooth_stone_slab',
    floor: 'polished_andesite',
    glass: 'glass',
    light: 'redstone_lamp',
    metal: 'iron_bars',
    door: 'iron_door',
    fence: 'iron_bars'
  },

  default: {
    primary: 'stone_bricks',
    secondary: 'oak_planks',
    accent: 'cracked_stone_bricks',
    trim: 'cobblestone',
    wood_primary: 'oak_planks',
    wood_log: 'oak_log',
    wood_stripped: 'stripped_oak_log',
    roof: 'oak_stairs',
    roof_slab: 'oak_slab',
    floor: 'oak_planks',
    glass: 'glass_pane',
    light: 'torch',
    metal: 'iron_bars',
    door: 'oak_door',
    fence: 'oak_fence'
  }
};

/**
 * Block substitution table for version compatibility
 */
export const SUBSTITUTION_TABLE = {
  // Modern blocks -> Classic fallbacks
  'polished_blackstone_bricks': ['stone_bricks', 'cobblestone'],
  'deepslate_bricks': ['stone_bricks', 'cobblestone'],
  'deepslate_tiles': ['stone_brick_slab', 'cobblestone'],
  'polished_deepslate': ['polished_andesite', 'stone'],
  'chiseled_deepslate': ['chiseled_stone_bricks', 'stone_bricks'],
  'calcite': ['quartz_block', 'white_concrete'],
  'tuff': ['andesite', 'stone'],
  'copper_block': ['cut_copper', 'orange_terracotta'],
  'exposed_copper': ['copper_block', 'orange_terracotta'],
  'weathered_copper': ['copper_block', 'cyan_terracotta'],
  'oxidized_copper': ['cyan_terracotta', 'prismarine'],
  'amethyst_block': ['purpur_block', 'magenta_concrete'],
  'moss_block': ['green_concrete', 'lime_wool'],
  'rooted_dirt': ['dirt', 'coarse_dirt'],
  'azalea_leaves': ['oak_leaves', 'spruce_leaves'],
  'glow_lichen': ['torch', 'glowstone'],
  'crying_obsidian': ['obsidian', 'purple_concrete'],
  'crimson_planks': ['dark_oak_planks', 'nether_bricks'],
  'crimson_stem': ['dark_oak_log', 'nether_bricks'],
  'warped_planks': ['cyan_terracotta', 'prismarine'],
  'warped_stem': ['cyan_terracotta', 'prismarine'],
  'chain': ['iron_bars', 'air'],
  'lantern': ['torch', 'glowstone'],
  'soul_lantern': ['torch', 'glowstone'],
  'sea_lantern': ['glowstone', 'jack_o_lantern'],
  'end_rod': ['torch', 'glowstone'],

  // Colored blocks
  'white_concrete': ['quartz_block', 'white_wool'],
  'black_concrete': ['obsidian', 'black_wool'],
  'gray_concrete': ['stone', 'gray_wool'],
  'light_gray_concrete': ['smooth_stone', 'light_gray_wool'],

  // Glass
  'tinted_glass': ['glass', 'black_stained_glass'],
  'gray_stained_glass_pane': ['glass_pane', 'black_stained_glass_pane'],
  'magenta_stained_glass_pane': ['glass_pane', 'pink_stained_glass_pane']
};

/**
 * Gradient block progressions (light to dark)
 */
export const GRADIENT_PROGRESSIONS = {
  stone: ['smooth_stone', 'stone', 'cobblestone', 'stone_bricks', 'cracked_stone_bricks', 'mossy_cobblestone'],
  wood_oak: ['stripped_oak_log', 'oak_planks', 'oak_log'],
  concrete_gray: ['white_concrete', 'light_gray_concrete', 'gray_concrete', 'black_concrete'],
  terracotta: ['white_terracotta', 'light_gray_terracotta', 'brown_terracotta', 'black_terracotta']
};

/**
 * Resolve a semantic block token to a valid Minecraft block
 * @param {string} token - Semantic token or block name
 * @param {string} theme - Theme name
 * @param {string} serverVersion - Server version for compatibility
 * @returns {string} Valid Minecraft block name
 */
export function resolveBlock(token, theme = 'default', serverVersion = '1.20.1') {
  // If it's already a valid block, return it
  if (isValidBlock(token, serverVersion)) {
    return token;
  }

  // Check if it's a palette reference ($primary, $secondary, etc.)
  if (token.startsWith('$')) {
    const paletteKey = token.slice(1);
    const palette = THEME_PALETTES[theme] || THEME_PALETTES.default;
    const resolved = palette[paletteKey];

    if (resolved) {
      return resolveBlock(resolved, theme, serverVersion);
    }
  }

  // Check if it's a semantic token in the palette
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.default;
  if (palette[token]) {
    return resolveBlock(palette[token], theme, serverVersion);
  }

  // Try substitution
  const substitutes = SUBSTITUTION_TABLE[token];
  if (substitutes) {
    for (const sub of substitutes) {
      if (isValidBlock(sub, serverVersion)) {
        console.warn(`[StyleEngine] Substituted ${token} → ${sub}`);
        return sub;
      }
    }
  }

  // Last resort: return stone
  console.error(`[StyleEngine] No valid substitute for ${token}, using stone`);
  return 'stone';
}

/**
 * Resolve an entire palette to valid blocks
 * @param {Object} palette - Style palette with semantic tokens
 * @param {string} theme - Theme name
 * @param {string} serverVersion - Server version
 * @returns {Object} Resolved palette with valid block names
 */
export function resolvePalette(palette, theme = 'default', serverVersion = '1.20.1') {
  const resolved = {};

  for (const [key, value] of Object.entries(palette)) {
    resolved[key] = resolveBlock(value, theme, serverVersion);
  }

  return resolved;
}

/**
 * Apply gradient to a Y-range
 * @param {number} y - Y coordinate
 * @param {number} minY - Minimum Y of structure
 * @param {number} maxY - Maximum Y of structure
 * @param {string} baseBlock - Base block type
 * @param {Object} gradient - Gradient configuration
 * @returns {string} Block to use at this Y level
 */
export function applyGradient(y, minY, maxY, baseBlock, gradient) {
  if (!gradient || !gradient.direction) {
    return baseBlock;
  }

  const height = maxY - minY;
  if (height <= 0) return baseBlock;

  // Find progression for this block type
  let progression = null;
  for (const [key, blocks] of Object.entries(GRADIENT_PROGRESSIONS)) {
    if (blocks.includes(baseBlock)) {
      progression = blocks;
      break;
    }
  }

  if (!progression) return baseBlock;

  // Calculate position in gradient
  const normalized = (y - minY) / height;
  const position = gradient.direction === 'up' ? normalized : 1 - normalized;

  // Map intensity to step size
  const intensityMultiplier = {
    subtle: 0.3,
    moderate: 0.6,
    strong: 1.0
  }[gradient.intensity] || 0.5;

  // Calculate index in progression
  const centerIndex = progression.indexOf(baseBlock);
  if (centerIndex === -1) return baseBlock;

  const offset = Math.round((position - 0.5) * progression.length * intensityMultiplier);
  const targetIndex = Math.max(0, Math.min(progression.length - 1, centerIndex + offset));

  return progression[targetIndex];
}

/**
 * Get theme palette
 * @param {string} theme - Theme name
 * @returns {Object} Theme palette
 */
export function getThemePalette(theme) {
  return THEME_PALETTES[theme] || THEME_PALETTES.default;
}

/**
 * Check if a block is valid for a given version
 * @param {string} block - Block name
 * @param {string} serverVersion - Server version
 * @returns {boolean} Whether block is valid
 */
export function isBlockValid(block, serverVersion = '1.20.1') {
  return isValidBlock(block, serverVersion);
}

/**
 * Get substitute for invalid block
 * @param {string} block - Invalid block name
 * @param {string} serverVersion - Server version
 * @returns {string|null} Substitute block or null
 */
export function getSubstitute(block, serverVersion = '1.20.1') {
  const substitutes = SUBSTITUTION_TABLE[block];
  if (!substitutes) return null;

  for (const sub of substitutes) {
    if (isValidBlock(sub, serverVersion)) {
      return sub;
    }
  }

  return null;
}

export default {
  resolveBlock,
  resolvePalette,
  applyGradient,
  getThemePalette,
  isBlockValid,
  getSubstitute,
  THEME_PALETTES,
  SUBSTITUTION_TABLE,
  GRADIENT_PROGRESSIONS
};

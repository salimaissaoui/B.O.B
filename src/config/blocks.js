import { getResolvedVersion } from './version-resolver.js';

// Comprehensive Minecraft 1.20.1 block registry
export const BLOCK_CATEGORIES = {
  building: [
    'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks',
    'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks',
    'oak_log', 'spruce_log', 'birch_log', 'jungle_log',
    'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log',
    'stripped_oak_log', 'stripped_spruce_log', 'stripped_birch_log', 'stripped_jungle_log',
    'stripped_acacia_log', 'stripped_dark_oak_log', 'stripped_mangrove_log', 'stripped_cherry_log',
    'oak_wood', 'spruce_wood', 'birch_wood', 'jungle_wood',
    'acacia_wood', 'dark_oak_wood', 'mangrove_wood', 'cherry_wood',
    'stripped_oak_wood', 'stripped_spruce_wood', 'stripped_birch_wood', 'stripped_jungle_wood',
    'stripped_acacia_wood', 'stripped_dark_oak_wood', 'stripped_mangrove_wood', 'stripped_cherry_wood',
    'stone', 'cobblestone', 'mossy_cobblestone', 'stone_bricks',
    'mossy_stone_bricks', 'cracked_stone_bricks', 'chiseled_stone_bricks',
    'smooth_stone', 'smooth_stone_slab',
    'granite', 'polished_granite', 'diorite', 'polished_diorite', 'andesite', 'polished_andesite',
    'deepslate', 'cobbled_deepslate', 'polished_deepslate', 'deepslate_bricks', 'deepslate_tiles',
    'sandstone', 'smooth_sandstone', 'chiseled_sandstone', 'cut_sandstone',
    'red_sandstone', 'smooth_red_sandstone', 'chiseled_red_sandstone', 'cut_red_sandstone',
    'bricks', 'prismarine', 'prismarine_bricks', 'dark_prismarine',
    'quartz_block', 'smooth_quartz', 'chiseled_quartz_block', 'quartz_bricks', 'quartz_pillar',
    'purpur_block', 'purpur_pillar', 'end_stone', 'end_stone_bricks',
    'copper_block', 'exposed_copper', 'weathered_copper', 'oxidized_copper',
    'cut_copper', 'exposed_cut_copper', 'weathered_cut_copper', 'oxidized_cut_copper',
    'waxed_copper_block', 'waxed_exposed_copper', 'waxed_weathered_copper', 'waxed_oxidized_copper',
    'white_concrete', 'light_gray_concrete', 'gray_concrete',
    'black_concrete', 'brown_concrete', 'red_concrete',
    'orange_concrete', 'yellow_concrete', 'lime_concrete',
    'green_concrete', 'cyan_concrete', 'light_blue_concrete',
    'blue_concrete', 'purple_concrete', 'magenta_concrete', 'pink_concrete',
    'white_terracotta', 'light_gray_terracotta', 'gray_terracotta',
    'black_terracotta', 'brown_terracotta', 'red_terracotta',
    'orange_terracotta', 'yellow_terracotta', 'lime_terracotta',
    'green_terracotta', 'cyan_terracotta', 'light_blue_terracotta',
    'blue_terracotta', 'purple_terracotta', 'magenta_terracotta', 'pink_terracotta', 'terracotta',
    'white_glazed_terracotta', 'light_gray_glazed_terracotta', 'gray_glazed_terracotta',
    'black_glazed_terracotta', 'brown_glazed_terracotta', 'red_glazed_terracotta',
    'orange_glazed_terracotta', 'yellow_glazed_terracotta', 'lime_glazed_terracotta',
    'green_glazed_terracotta', 'cyan_glazed_terracotta', 'light_blue_glazed_terracotta',
    'blue_glazed_terracotta', 'purple_glazed_terracotta', 'magenta_glazed_terracotta', 'pink_glazed_terracotta',
    'white_wool', 'light_gray_wool', 'gray_wool', 'black_wool',
    'brown_wool', 'red_wool', 'orange_wool', 'yellow_wool',
    'lime_wool', 'green_wool', 'cyan_wool', 'light_blue_wool',
    'blue_wool', 'purple_wool', 'magenta_wool', 'pink_wool',
    'mud_bricks', 'packed_mud', 'bamboo_block', 'stripped_bamboo_block', 'bamboo_planks',
    'bamboo_mosaic', 'nether_bricks', 'red_nether_bricks', 'cracked_nether_bricks', 'chiseled_nether_bricks',
    'blackstone', 'polished_blackstone', 'polished_blackstone_bricks', 'chiseled_polished_blackstone',
    'gilded_blackstone', 'crying_obsidian', 'obsidian', 'glowstone', 'shroomlight', 'sea_lantern'
  ],

  decorative: [
    'glass', 'white_stained_glass', 'light_gray_stained_glass',
    'gray_stained_glass', 'black_stained_glass', 'brown_stained_glass',
    'red_stained_glass', 'orange_stained_glass', 'yellow_stained_glass',
    'lime_stained_glass', 'green_stained_glass', 'cyan_stained_glass',
    'light_blue_stained_glass', 'blue_stained_glass',
    'purple_stained_glass', 'magenta_stained_glass', 'pink_stained_glass',
    'glass_pane', 'white_stained_glass_pane', 'light_gray_stained_glass_pane',
    'oak_stairs', 'spruce_stairs', 'birch_stairs', 'jungle_stairs',
    'acacia_stairs', 'dark_oak_stairs', 'stone_stairs',
    'cobblestone_stairs', 'brick_stairs', 'stone_brick_stairs',
    'sandstone_stairs', 'red_sandstone_stairs', 'quartz_stairs',
    'oak_slab', 'spruce_slab', 'birch_slab', 'jungle_slab',
    'acacia_slab', 'dark_oak_slab', 'stone_slab',
    'cobblestone_slab', 'brick_slab', 'stone_brick_slab',
    'sandstone_slab', 'red_sandstone_slab', 'quartz_slab',
    'oak_fence', 'spruce_fence', 'birch_fence', 'jungle_fence',
    'acacia_fence', 'dark_oak_fence', 'nether_brick_fence'
  ],

  functional: [
    'oak_door', 'spruce_door', 'birch_door', 'jungle_door',
    'acacia_door', 'dark_oak_door', 'iron_door',
    'oak_trapdoor', 'spruce_trapdoor', 'birch_trapdoor',
    'torch', 'lantern', 'soul_lantern', 'jack_o_lantern',
    'ladder', 'chest', 'crafting_table', 'furnace'
  ],

  natural: [
    'dirt', 'grass_block', 'sand', 'gravel', 'clay',
    'oak_leaves', 'spruce_leaves', 'birch_leaves', 'jungle_leaves', 'acacia_leaves', 'dark_oak_leaves', 'mangrove_leaves', 'cherry_leaves', 'azalea_leaves', 'flowering_azalea_leaves',
    'water', 'lava', 'snow', 'ice', 'glow_lichen',
    'vine', 'lily_pad', 'cactus', 'sugar_cane', 'brown_mushroom', 'red_mushroom',
    'flower_pot', 'dandelion', 'poppy', 'blue_orchid', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'oxeye_daisy', 'cornflower', 'lily_of_the_valley',
    'wheat', 'carrots', 'potatoes', 'beetroots', 'pumpkin', 'melon', 'hay_block'
  ],

  // Special blocks (used internally for operations like undo)
  special: [
    'air'
  ]
};

// Flatten all blocks into a single registry
export const ALL_BLOCKS = [
  ...BLOCK_CATEGORIES.building,
  ...BLOCK_CATEGORIES.decorative,
  ...BLOCK_CATEGORIES.functional,
  ...BLOCK_CATEGORIES.natural,
  ...BLOCK_CATEGORIES.special
];

// Version compatibility map
export const VERSION_COMPATIBILITY = {
  '1.20.1': ALL_BLOCKS,
  '1.20': ALL_BLOCKS,
  '1.19': ALL_BLOCKS.filter(b => !b.includes('cherry'))
};

/**
 * Validate if a block exists in the target Minecraft version
 * @param {string} blockName - The block name to validate
 * @param {string} version - Minecraft version (uses resolved version if not specified)
 * @returns {boolean} - True if block exists in version
 */
export function isValidBlock(blockName, version = null) {
  // Use resolved version or fallback to 1.20.1
  let effectiveVersion;
  try {
    effectiveVersion = version || getResolvedVersion();
  } catch {
    effectiveVersion = '1.20.1'; // Fallback if resolver not initialized
  }
  // Normalize: remove minecraft: prefix
  const normalizedName = blockName.replace(/^minecraft:/, '');
  const versionBlocks = VERSION_COMPATIBILITY[effectiveVersion] || ALL_BLOCKS;
  return versionBlocks.includes(normalizedName);
}

/**
 * Get valid blocks from a list for a specific version
 * @param {string[]} blockList - List of block names
 * @param {string} version - Minecraft version (uses resolved version if not specified)
 * @returns {string[]} - Filtered list of valid blocks
 */
export function getValidBlocks(blockList, version = null) {
  return blockList.filter(block => isValidBlock(block, version));
}

/**
 * Suggest alternative blocks if a block is invalid
 * @param {string} blockName - The invalid block name
 * @param {string} version - Minecraft version (uses resolved version if not specified)
 * @returns {string[]} - Suggested alternatives
 */
export function suggestAlternatives(blockName, version = null) {
  if (isValidBlock(blockName, version)) {
    return [blockName];
  }

  // Use resolved version or fallback
  let effectiveVersion;
  try {
    effectiveVersion = version || getResolvedVersion();
  } catch {
    effectiveVersion = '1.20.1';
  }

  // Simple fuzzy matching by category
  const versionBlocks = VERSION_COMPATIBILITY[effectiveVersion] || ALL_BLOCKS;
  const category = blockName.split('_')[1] || blockName.split('_')[0];

  return versionBlocks
    .filter(b => b.includes(category))
    .slice(0, 3);
}

/**
 * Color palette for pixel art - maps common colors to best Minecraft blocks
 * Wool is recommended for vibrant colors, concrete for solid flat colors,
 * terracotta for muted/earthy tones
 */
export const PIXEL_ART_PALETTE = {
  // Basic colors - using wool for vibrancy
  red: 'red_wool',
  orange: 'orange_wool',
  yellow: 'yellow_wool',
  lime: 'lime_wool',
  green: 'green_wool',
  cyan: 'cyan_wool',
  light_blue: 'light_blue_wool',
  blue: 'blue_wool',
  purple: 'purple_wool',
  magenta: 'magenta_wool',
  pink: 'pink_wool',
  white: 'white_wool',
  light_gray: 'light_gray_wool',
  gray: 'gray_wool',
  black: 'black_wool',
  brown: 'brown_wool',

  // Concrete alternatives (more saturated, flat look)
  bright_red: 'red_concrete',
  bright_orange: 'orange_concrete',
  bright_yellow: 'yellow_concrete',
  bright_lime: 'lime_concrete',
  bright_green: 'green_concrete',
  bright_cyan: 'cyan_concrete',
  bright_light_blue: 'light_blue_concrete',
  bright_blue: 'blue_concrete',
  bright_purple: 'purple_concrete',
  bright_magenta: 'magenta_concrete',
  bright_pink: 'pink_concrete',
  bright_white: 'white_concrete',
  bright_black: 'black_concrete',

  // Skin tones and special colors
  skin_light: 'orange_terracotta',
  skin_medium: 'brown_terracotta',
  skin_dark: 'brown_wool',
  gold: 'gold_block',
  tan: 'sandstone',
  cream: 'birch_planks',
  beige: 'smooth_sandstone',

  // Metallic and special
  silver: 'iron_block',
  dark_gray: 'gray_concrete',
  navy: 'blue_terracotta',
  maroon: 'red_terracotta',
  olive: 'green_terracotta',
  teal: 'cyan_terracotta',
  coral: 'pink_terracotta',
  peach: 'pink_terracotta',

  // Fire/flame colors
  flame_red: 'red_wool',
  flame_orange: 'orange_wool',
  flame_yellow: 'yellow_wool',

  // Transparent/empty
  transparent: 'air',
  empty: 'air',
  none: 'air'
};

/**
 * Get recommended blocks for pixel art based on a color description
 * @param {string} colorName - Descriptive color name
 * @returns {string} - Best matching Minecraft block
 */
export function getPixelArtBlock(colorName) {
  const normalized = colorName.toLowerCase().replace(/[^a-z_]/g, '_');

  // Direct match
  if (PIXEL_ART_PALETTE[normalized]) {
    return PIXEL_ART_PALETTE[normalized];
  }

  // Partial match
  for (const [key, block] of Object.entries(PIXEL_ART_PALETTE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return block;
    }
  }

  // Default to white if no match
  return 'white_wool';
}

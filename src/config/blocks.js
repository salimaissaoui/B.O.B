// Comprehensive Minecraft 1.20.1 block registry
export const BLOCK_CATEGORIES = {
  building: [
    'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 
    'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks',
    'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 
    'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log',
    'stone', 'cobblestone', 'mossy_cobblestone', 'stone_bricks', 
    'mossy_stone_bricks', 'granite', 'polished_granite',
    'diorite', 'polished_diorite', 'andesite', 'polished_andesite',
    'sandstone', 'smooth_sandstone', 'red_sandstone', 'smooth_red_sandstone',
    'bricks', 'prismarine', 'prismarine_bricks', 'dark_prismarine',
    'quartz_block', 'smooth_quartz', 'purpur_block', 'end_stone_bricks',
    'white_concrete', 'light_gray_concrete', 'gray_concrete', 
    'black_concrete', 'brown_concrete', 'red_concrete', 
    'orange_concrete', 'yellow_concrete', 'lime_concrete', 
    'green_concrete', 'cyan_concrete', 'light_blue_concrete', 
    'blue_concrete', 'purple_concrete', 'magenta_concrete', 'pink_concrete',
    'white_wool', 'light_gray_wool', 'gray_wool', 'black_wool',
    'brown_wool', 'red_wool', 'orange_wool', 'yellow_wool',
    'lime_wool', 'green_wool', 'cyan_wool', 'light_blue_wool',
    'blue_wool', 'purple_wool', 'magenta_wool', 'pink_wool'
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
    'torch', 'lantern', 'soul_lantern',
    'ladder', 'chest', 'crafting_table', 'furnace'
  ],
  
  natural: [
    'dirt', 'grass_block', 'sand', 'gravel', 'clay',
    'oak_leaves', 'spruce_leaves', 'birch_leaves',
    'water', 'lava', 'snow', 'ice'
  ]
};

// Flatten all blocks into a single registry
export const ALL_BLOCKS = [
  ...BLOCK_CATEGORIES.building,
  ...BLOCK_CATEGORIES.decorative,
  ...BLOCK_CATEGORIES.functional,
  ...BLOCK_CATEGORIES.natural
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
 * @param {string} version - Minecraft version (default: 1.20.1)
 * @returns {boolean} - True if block exists in version
 */
export function isValidBlock(blockName, version = '1.20.1') {
  const versionBlocks = VERSION_COMPATIBILITY[version] || ALL_BLOCKS;
  return versionBlocks.includes(blockName);
}

/**
 * Get valid blocks from a list for a specific version
 * @param {string[]} blockList - List of block names
 * @param {string} version - Minecraft version
 * @returns {string[]} - Filtered list of valid blocks
 */
export function getValidBlocks(blockList, version = '1.20.1') {
  return blockList.filter(block => isValidBlock(block, version));
}

/**
 * Suggest alternative blocks if a block is invalid
 * @param {string} blockName - The invalid block name
 * @param {string} version - Minecraft version
 * @returns {string[]} - Suggested alternatives
 */
export function suggestAlternatives(blockName, version = '1.20.1') {
  if (isValidBlock(blockName, version)) {
    return [blockName];
  }
  
  // Simple fuzzy matching by category
  const versionBlocks = VERSION_COMPATIBILITY[version] || ALL_BLOCKS;
  const category = blockName.split('_')[1] || blockName.split('_')[0];
  
  return versionBlocks
    .filter(b => b.includes(category))
    .slice(0, 3);
}

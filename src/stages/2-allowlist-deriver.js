import { getValidBlocks, isValidBlock } from '../config/blocks.js';
import { SAFETY_LIMITS } from '../config/limits.js';

// Default complementary blocks to enhance builds
const COMPLEMENTARY_BLOCKS = {
  // Stairs/slabs for primary materials
  oak_planks: ['oak_stairs', 'oak_slab', 'oak_fence', 'oak_trapdoor'],
  spruce_planks: ['spruce_stairs', 'spruce_slab', 'spruce_fence', 'spruce_trapdoor'],
  dark_oak_planks: ['dark_oak_stairs', 'dark_oak_slab', 'dark_oak_fence', 'dark_oak_trapdoor'],
  birch_planks: ['birch_stairs', 'birch_slab', 'birch_fence', 'birch_trapdoor'],
  cobblestone: ['cobblestone_stairs', 'cobblestone_slab', 'cobblestone_wall', 'mossy_cobblestone'],
  stone_bricks: ['stone_brick_stairs', 'stone_brick_slab', 'stone_brick_wall', 'cracked_stone_bricks'],
  deepslate_bricks: ['deepslate_brick_stairs', 'deepslate_brick_slab', 'deepslate_brick_wall', 'polished_deepslate'],
  blackstone: ['blackstone_stairs', 'blackstone_slab', 'blackstone_wall', 'polished_blackstone'],
  quartz_block: ['quartz_stairs', 'quartz_slab', 'smooth_quartz', 'chiseled_quartz_block'],
  sandstone: ['sandstone_stairs', 'sandstone_slab', 'sandstone_wall', 'cut_sandstone'],
  packed_ice: ['blue_ice', 'ice', 'snow_block', 'white_stained_glass'],
  purpur_block: ['purpur_stairs', 'purpur_slab', 'purpur_pillar', 'end_stone_bricks'],
};

// Essential detail blocks every build should consider
const DETAIL_BLOCKS = [
  'torch',
  'lantern',
  'chain',
  'iron_bars',
  'flower_pot',
  'ladder',
  'chest',
  'crafting_table',
  'furnace',
  'bookshelf',
];

/**
 * Stage 2: Derive block allowlist from design plan
 * @param {Object} designPlan - High-level design plan
 * @param {string} minecraftVersion - Target Minecraft version
 * @returns {string[]} - Validated block allowlist
 */
export function deriveBlockAllowlist(designPlan, minecraftVersion = '1.20.1') {
  const blockSet = new Set();
  
  // Extract blocks from materials section
  if (designPlan.materials) {
    for (const [category, block] of Object.entries(designPlan.materials)) {
      if (typeof block === 'string' && block.length > 0) {
        blockSet.add(block);
      }
      // Handle array values (e.g., colors for pixel art)
      if (Array.isArray(block)) {
        block.forEach(b => {
          if (typeof b === 'string' && b.length > 0) {
            blockSet.add(b);
          }
        });
      }
    }
  }
  
  // Extract from palette if present
  if (designPlan.palette && Array.isArray(designPlan.palette)) {
    designPlan.palette.forEach(b => {
      if (typeof b === 'string' && b.length > 0) {
        blockSet.add(b);
      }
    });
  }
  
  // Extract from features that might contain block hints
  if (designPlan.features && Array.isArray(designPlan.features)) {
    for (const feature of designPlan.features) {
      // Features like "stone_pillars" or "oak_beams" hint at materials
      const featureLower = String(feature).toLowerCase();
      for (const material of Object.keys(COMPLEMENTARY_BLOCKS)) {
        if (featureLower.includes(material.split('_')[0])) {
          blockSet.add(material);
        }
      }
    }
  }
  
  // Add complementary blocks for existing materials (stairs, slabs, etc.)
  const currentBlocks = Array.from(blockSet);
  for (const block of currentBlocks) {
    const complements = COMPLEMENTARY_BLOCKS[block];
    if (complements) {
      // Add first 2 complements (stairs/slab) to enhance builds
      complements.slice(0, 2).forEach(c => blockSet.add(c));
    }
  }
  
  // Always include basic lighting
  blockSet.add('torch');
  if (designPlan.theme === 'gothic' || designPlan.theme === 'medieval') {
    blockSet.add('lantern');
    blockSet.add('chain');
  }
  
  // Convert to array and validate
  const blockList = Array.from(blockSet);
  const validBlocks = getValidBlocks(blockList, minecraftVersion);
  
  // Check for invalid blocks
  const invalidBlocks = blockList.filter(b => !isValidBlock(b, minecraftVersion));
  if (invalidBlocks.length > 0) {
    console.warn(`⚠ Invalid blocks removed: ${invalidBlocks.join(', ')}`);
  }
  
  // Enforce unique block limit
  if (validBlocks.length > SAFETY_LIMITS.maxUniqueBlocks) {
    console.warn(`⚠ Too many unique blocks (${validBlocks.length}). Limiting to ${SAFETY_LIMITS.maxUniqueBlocks}`);
    return validBlocks.slice(0, SAFETY_LIMITS.maxUniqueBlocks);
  }
  
  // Ensure minimum variety for quality builds
  const MIN_BLOCKS = 6;
  if (validBlocks.length < MIN_BLOCKS && validBlocks.length > 0) {
    console.log(`  Adding detail blocks to enhance build variety...`);
    const primary = validBlocks[0];
    const complements = COMPLEMENTARY_BLOCKS[primary] || [];
    for (const c of complements) {
      if (validBlocks.length >= MIN_BLOCKS) break;
      if (isValidBlock(c, minecraftVersion) && !validBlocks.includes(c)) {
        validBlocks.push(c);
      }
    }
    // Add some detail blocks
    for (const d of DETAIL_BLOCKS) {
      if (validBlocks.length >= MIN_BLOCKS) break;
      if (isValidBlock(d, minecraftVersion) && !validBlocks.includes(d)) {
        validBlocks.push(d);
      }
    }
  }
  
  if (validBlocks.length === 0) {
    throw new Error('No valid blocks found in design plan materials');
  }
  
  console.log(`✓ Block allowlist derived: ${validBlocks.length} unique blocks`);
  console.log(`  Blocks: ${validBlocks.join(', ')}`);
  
  return validBlocks;
}

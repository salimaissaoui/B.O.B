import { getValidBlocks, isValidBlock } from '../config/blocks.js';
import { SAFETY_LIMITS } from '../config/limits.js';

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
    }
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
  
  if (validBlocks.length === 0) {
    throw new Error('No valid blocks found in design plan materials');
  }
  
  console.log(`✓ Block allowlist derived: ${validBlocks.length} unique blocks`);
  console.log(`  Blocks: ${validBlocks.join(', ')}`);
  
  return validBlocks;
}

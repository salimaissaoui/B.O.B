/**
 * Slab Operation
 * Places top or bottom slab blocks
 */

/**
 * Place slab blocks
 * @param {Object} step - Operation parameters
 * @param {Object} step.pos - Position {x, y, z}
 * @param {string} step.block - Block type (must end with '_slab')
 * @param {string} step.half - Position ('top', 'bottom')
 */
export function slab(step) {
  if (!step.pos || !step.block) {
    throw new Error('slab operation requires pos and block parameters');
  }

  if (!step.block.includes('slab')) {
    throw new Error('slab operation requires a slab block type');
  }

  // For now, return single block placement
  // Block state for top/bottom is handled by block name in some versions
  return [{
    x: step.pos.x,
    y: step.pos.y,
    z: step.pos.z,
    block: step.block
  }];
}

/**
 * Stairs Operation
 * Places oriented stair blocks
 */

/**
 * Place stair blocks with proper orientation
 * @param {Object} step - Operation parameters
 * @param {Object} step.pos - Position {x, y, z}
 * @param {string} step.block - Block type (must end with '_stairs')
 * @param {string} step.facing - Direction ('north', 'south', 'east', 'west')
 * @param {string} step.half - Position ('top', 'bottom')
 */
export function stairs(step) {
  if (!step.pos || !step.block) {
    throw new Error('stairs operation requires pos and block parameters');
  }

  if (!step.block.includes('stairs')) {
    throw new Error('stairs operation requires a stair block type');
  }

  const facing = step.facing || 'north';
  const half = step.half || 'bottom';

  // For now, return single block placement
  // In future, could add blockstate data for orientation
  return [{
    x: step.pos.x,
    y: step.pos.y,
    z: step.pos.z,
    block: step.block
  }];
}

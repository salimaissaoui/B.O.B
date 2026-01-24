/**
 * Door Operation
 * Places door with proper orientation
 */

/**
 * Place a door block (handles 2-block tall doors)
 * @param {Object} step - Operation parameters
 * @param {Object} step.pos - Position {x, y, z} (bottom block)
 * @param {string} step.block - Door block type
 * @param {string} step.facing - Direction ('north', 'south', 'east', 'west')
 * @param {string} step.half - Which half ('upper', 'lower')
 */
export function door(step) {
  if (!step.pos || !step.block) {
    throw new Error('door operation requires pos and block parameters');
  }

  if (!step.block.includes('door')) {
    throw new Error('door operation requires a door block type');
  }

  const blocks = [];

  // Place bottom door block
  blocks.push({
    x: step.pos.x,
    y: step.pos.y,
    z: step.pos.z,
    block: step.block
  });

  // Place top door block (doors are 2 blocks tall)
  blocks.push({
    x: step.pos.x,
    y: step.pos.y + 1,
    z: step.pos.z,
    block: step.block
  });

  return blocks;
}

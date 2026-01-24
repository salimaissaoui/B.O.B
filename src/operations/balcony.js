/**
 * Balcony Operation
 * Creates a protruding balcony with railing
 */

/**
 * Create a balcony
 * @param {Object} step - Operation parameters
 * @param {Object} step.base - Base position {x, y, z} (attachment point)
 * @param {string} step.block - Floor block type
 * @param {string} step.railing - Railing block type (fence, wall, etc.)
 * @param {number} step.width - Width of balcony
 * @param {number} step.depth - How far it extends out
 * @param {string} step.facing - Direction balcony faces ('north', 'south', 'east', 'west')
 */
export function balcony(step) {
  if (!step.base || !step.block) {
    throw new Error('balcony requires base and block parameters');
  }

  const blocks = [];
  const width = step.width || 5;
  const depth = step.depth || 3;
  const facing = step.facing || 'north';
  const railing = step.railing || step.block.replace('planks', 'fence');

  // Determine offset based on facing direction
  let offsetX = 0;
  let offsetZ = 0;
  let railingOffset = { x: 0, z: 0 };

  switch (facing) {
    case 'north': // Extends toward -Z
      offsetZ = -depth;
      railingOffset = { x: 0, z: -depth };
      break;
    case 'south': // Extends toward +Z
      offsetZ = 0;
      railingOffset = { x: 0, z: depth };
      break;
    case 'east': // Extends toward +X
      offsetX = 0;
      railingOffset = { x: depth, z: 0 };
      break;
    case 'west': // Extends toward -X
      offsetX = -depth;
      railingOffset = { x: -depth, z: 0 };
      break;
  }

  // Create floor
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      const floorX = step.base.x + offsetX + (facing === 'north' || facing === 'south' ? x : z);
      const floorZ = step.base.z + offsetZ + (facing === 'north' || facing === 'south' ? z : x);

      blocks.push({
        x: floorX,
        y: step.base.y,
        z: floorZ,
        block: step.block
      });
    }
  }

  // Add railing around edges
  // Front railing
  for (let i = 0; i < width; i++) {
    const railX = step.base.x + railingOffset.x + (facing === 'north' || facing === 'south' ? i : 0);
    const railZ = step.base.z + railingOffset.z + (facing === 'north' || facing === 'south' ? 0 : i);

    blocks.push({
      x: railX,
      y: step.base.y + 1,
      z: railZ,
      block: railing
    });
  }

  // Side railings
  for (let i = 0; i < depth; i++) {
    // Left side
    blocks.push({
      x: step.base.x + offsetX + (facing === 'north' || facing === 'south' ? 0 : i),
      y: step.base.y + 1,
      z: step.base.z + offsetZ + (facing === 'north' || facing === 'south' ? i : 0),
      block: railing
    });

    // Right side
    blocks.push({
      x: step.base.x + offsetX + (facing === 'north' || facing === 'south' ? width - 1 : i),
      y: step.base.y + 1,
      z: step.base.z + offsetZ + (facing === 'north' || facing === 'south' ? i : width - 1),
      block: railing
    });
  }

  return blocks;
}

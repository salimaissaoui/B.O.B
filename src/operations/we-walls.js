/**
 * WorldEdit Walls Operation
 * Creates hollow structure using //walls command
 */

/**
 * Calculate approximate wall blocks for a cuboid
 */
function calculateWallBlocks(from, to) {
  const width = Math.abs(to.x - from.x + 1);
  const height = Math.abs(to.y - from.y + 1);
  const depth = Math.abs(to.z - from.z + 1);

  // Calculate surface area minus top and bottom
  const walls = 2 * (width * height) + 2 * (depth * height);
  return walls;
}

/**
 * WorldEdit walls operation
 * Returns operation descriptor for WorldEdit executor
 */
export function weWalls(step) {
  // Validate required parameters
  if (!step.from || !step.to || !step.block) {
    throw new Error('we_walls requires from, to, and block parameters');
  }

  // Return operation descriptor
  return {
    type: 'worldedit',
    command: 'walls',
    from: step.from,
    to: step.to,
    block: step.block,
    estimatedBlocks: calculateWallBlocks(step.from, step.to),
    fallback: {
      op: 'hollow_box',
      from: step.from,
      to: step.to,
      block: step.block
    }
  };
}

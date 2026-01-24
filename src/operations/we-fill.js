/**
 * WorldEdit Fill Operation
 * Fills a large rectangular region using //set command
 */

/**
 * Calculate volume of a cuboid
 */
function calculateVolume(from, to) {
  return Math.abs(to.x - from.x + 1) *
         Math.abs(to.y - from.y + 1) *
         Math.abs(to.z - from.z + 1);
}

/**
 * WorldEdit fill operation
 * Returns operation descriptor for WorldEdit executor
 */
export function weFill(step) {
  // Validate required parameters
  if (!step.from || !step.to || !step.block) {
    throw new Error('we_fill requires from, to, and block parameters');
  }

  // Return operation descriptor (not actual blocks)
  // Builder will execute via WorldEditExecutor
  return {
    type: 'worldedit',
    command: 'fill',
    from: step.from,
    to: step.to,
    block: step.block,
    estimatedBlocks: calculateVolume(step.from, step.to),
    fallback: {
      op: 'fill',
      from: step.from,
      to: step.to,
      block: step.block
    }
  };
}

/**
 * WorldEdit Replace Operation
 * Replaces blocks in selection using //replace command
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
 * WorldEdit replace operation
 * Returns operation descriptor for WorldEdit executor
 */
export function weReplace(step) {
  // Validate required parameters
  if (!step.from || !step.to || !step.fromBlock || !step.toBlock) {
    throw new Error('we_replace requires from, to, fromBlock, and toBlock parameters');
  }

  // Return operation descriptor
  return {
    type: 'worldedit',
    command: 'replace',
    from: step.from,
    to: step.to,
    fromBlock: step.fromBlock,
    toBlock: step.toBlock,
    block: step.toBlock, // For compatibility
    estimatedBlocks: calculateVolume(step.from, step.to) * 0.5, // Assume 50% replacement
    fallback: null // No simple vanilla fallback for replace
  };
}

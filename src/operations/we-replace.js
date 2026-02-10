/**
 * WorldEdit Replace Operation
 * Replaces blocks in selection using //replace command
 */

import { calculateVolume } from '../utils/coordinates.js';

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

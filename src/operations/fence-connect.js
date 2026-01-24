/**
 * Fence Connect Operation
 * Creates auto-connecting fence lines
 */

/**
 * Create a line of fence blocks
 * @param {Object} step - Operation parameters
 * @param {Object} step.from - Start position {x, y, z}
 * @param {Object} step.to - End position {x, y, z}
 * @param {string} step.block - Fence block type
 */
export function fenceConnect(step) {
  if (!step.from || !step.to || !step.block) {
    throw new Error('fence_connect requires from, to, and block parameters');
  }

  if (!step.block.includes('fence')) {
    throw new Error('fence_connect requires a fence block type');
  }

  const blocks = [];
  const from = step.from;
  const to = step.to;

  // Determine primary axis
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;

  // Create line along primary axis
  if (Math.abs(dx) >= Math.abs(dz)) {
    // Line along X axis
    const steps = Math.abs(dx);
    const xDir = dx > 0 ? 1 : -1;

    for (let i = 0; i <= steps; i++) {
      blocks.push({
        x: from.x + i * xDir,
        y: from.y + Math.floor((i / steps) * dy),
        z: from.z + Math.floor((i / steps) * dz),
        block: step.block
      });
    }
  } else {
    // Line along Z axis
    const steps = Math.abs(dz);
    const zDir = dz > 0 ? 1 : -1;

    for (let i = 0; i <= steps; i++) {
      blocks.push({
        x: from.x + Math.floor((i / steps) * dx),
        y: from.y + Math.floor((i / steps) * dy),
        z: from.z + i * zDir,
        block: step.block
      });
    }
  }

  return blocks;
}

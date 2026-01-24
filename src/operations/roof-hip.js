/**
 * Hip Roof Operation
 * Creates a four-sided sloped roof
 */

/**
 * Create a hip roof (four-sided pyramid-like roof)
 * @param {Object} step - Operation parameters
 * @param {Object} step.from - Base corner {x, y, z}
 * @param {Object} step.to - Opposite corner {x, y, z}
 * @param {string} step.block - Roof block type (stairs or slabs)
 * @param {number} step.peakHeight - Height of roof peak
 */
export function roofHip(step) {
  if (!step.from || !step.to || !step.block) {
    throw new Error('roof_hip requires from, to, and block parameters');
  }

  const blocks = [];
  const peakHeight = step.peakHeight || 4;

  const minX = Math.min(step.from.x, step.to.x);
  const maxX = Math.max(step.from.x, step.to.x);
  const minZ = Math.min(step.from.z, step.to.z);
  const maxZ = Math.max(step.from.z, step.to.z);
  const baseY = Math.max(step.from.y, step.to.y);

  const width = maxX - minX + 1;
  const depth = maxZ - minZ + 1;

  // Build roof layers from bottom to top
  for (let layer = 0; layer < peakHeight; layer++) {
    const inset = layer;

    // Skip if inset is too large for current dimensions
    if (inset * 2 >= width || inset * 2 >= depth) {
      break;
    }

    // Create rectangular layer with inset
    for (let x = minX + inset; x <= maxX - inset; x++) {
      for (let z = minZ + inset; z <= maxZ - inset; z++) {
        // Only place blocks on the edge of this layer
        const isEdge =
          x === minX + inset ||
          x === maxX - inset ||
          z === minZ + inset ||
          z === maxZ - inset;

        if (isEdge) {
          blocks.push({
            x: x,
            y: baseY + layer,
            z: z,
            block: step.block
          });
        }
      }
    }
  }

  return blocks;
}

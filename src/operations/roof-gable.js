/**
 * Roof gable operation - Creates a triangular/gabled roof
 * @param {Object} step - Step configuration
 * @param {Object} step.from - Starting coordinate {x, y, z}
 * @param {Object} step.to - Ending coordinate {x, y, z}
 * @param {string} step.block - Block type (typically stairs)
 * @param {number} step.peakHeight - Height of the peak above base
 * @returns {Array} - List of block placements {x, y, z, block}
 */
export function roofGable(step) {
  const { from, to, block } = step;

  if (!from || !to || !block) {
    throw new Error('Roof gable operation requires from, to, and block');
  }

  // Calculate default peakHeight based on roof dimensions if not provided
  const width = Math.abs(to.x - from.x) + 1;
  const depth = Math.abs(to.z - from.z) + 1;
  const peakHeight = step.peakHeight || Math.ceil(Math.min(width, depth) / 2) + 1;
  
  const blocks = [];
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minZ = Math.min(from.z, to.z);
  const maxZ = Math.max(from.z, to.z);
  const baseY = Math.min(from.y, to.y);

  // Calculate max offset at base level (half the width, rounded down)
  const halfWidth = Math.floor(width / 2);
  const halfDepth = Math.floor(depth / 2);

  if (width >= depth) {
    // Gable runs along Z axis (peak along Z)
    const centerX = Math.floor((minX + maxX) / 2);

    for (let z = minZ; z <= maxZ; z++) {
      for (let h = 0; h < peakHeight; h++) {
        const y = baseY + h;
        // Offset DECREASES with height to form a peak (narrowing upward)
        const offset = Math.max(0, halfWidth - h);

        // Place blocks on both sides of center
        for (let x = centerX - offset; x <= centerX + offset; x++) {
          if (x >= minX && x <= maxX) {
            blocks.push({ x, y, z, block });
          }
        }
      }
    }
  } else {
    // Gable runs along X axis (peak along X)
    const centerZ = Math.floor((minZ + maxZ) / 2);

    for (let x = minX; x <= maxX; x++) {
      for (let h = 0; h < peakHeight; h++) {
        const y = baseY + h;
        // Offset DECREASES with height to form a peak (narrowing upward)
        const offset = Math.max(0, halfDepth - h);

        // Place blocks on both sides of center
        for (let z = centerZ - offset; z <= centerZ + offset; z++) {
          if (z >= minZ && z <= maxZ) {
            blocks.push({ x, y, z, block });
          }
        }
      }
    }
  }
  
  return blocks;
}

/**
 * Window strip operation - Creates a row of windows with spacing
 * @param {Object} step - Step configuration
 * @param {Object} step.from - Starting coordinate {x, y, z}
 * @param {Object} step.to - Ending coordinate {x, y, z}
 * @param {string} step.block - Block type (typically glass_pane)
 * @param {number} step.spacing - Spacing between windows (default: 2)
 * @returns {Array} - List of block placements {x, y, z, block}
 */
export function windowStrip(step) {
  const { from, to, block, spacing = 2 } = step;
  
  if (!from || !to || !block) {
    throw new Error('Window strip operation requires from, to, and block');
  }
  
  const blocks = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  
  // Determine primary axis
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const absZ = Math.abs(dz);
  
  if (absX >= absY && absX >= absZ) {
    // Windows along X axis
    const axisStep = dx >= 0 ? 1 : -1;
    for (let x = from.x; dx >= 0 ? x <= to.x : x >= to.x; x += axisStep * spacing) {
      blocks.push({ x, y: from.y, z: from.z, block });
    }
  } else if (absY >= absX && absY >= absZ) {
    // Windows along Y axis
    const axisStep = dy >= 0 ? 1 : -1;
    for (let y = from.y; dy >= 0 ? y <= to.y : y >= to.y; y += axisStep * spacing) {
      blocks.push({ x: from.x, y, z: from.z, block });
    }
  } else {
    // Windows along Z axis
    const axisStep = dz >= 0 ? 1 : -1;
    for (let z = from.z; dz >= 0 ? z <= to.z : z >= to.z; z += axisStep * spacing) {
      blocks.push({ x: from.x, y: from.y, z, block });
    }
  }
  
  return blocks;
}

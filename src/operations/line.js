/**
 * Line operation - Creates a line of blocks between two points
 * @param {Object} step - Step configuration
 * @param {Object} step.from - Starting coordinate {x, y, z}
 * @param {Object} step.to - Ending coordinate {x, y, z}
 * @param {string} step.block - Block type
 * @returns {Array} - List of block placements {x, y, z, block}
 */
export function line(step) {
  const { from, to, block } = step;
  
  if (!from || !to || !block) {
    throw new Error('Line operation requires from, to, and block');
  }
  
  const blocks = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  
  const steps = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
  
  if (steps === 0) {
    // Single block
    return [{ x: from.x, y: from.y, z: from.z, block }];
  }
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(from.x + dx * t);
    const y = Math.round(from.y + dy * t);
    const z = Math.round(from.z + dz * t);
    
    blocks.push({ x, y, z, block });
  }
  
  return blocks;
}

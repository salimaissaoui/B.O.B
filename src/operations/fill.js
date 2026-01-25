import { calculateBounds } from '../utils/coordinates.js';

/**
 * Fill operation - Creates a solid rectangular area
 * @param {Object} step - Step configuration
 * @param {Object} step.from - Starting coordinate {x, y, z}
 * @param {Object} step.to - Ending coordinate {x, y, z}
 * @param {string} step.block - Block type
 * @returns {Array} - List of block placements {x, y, z, block}
 */
export function fill(step) {
  const { from, to, block } = step;

  if (!from || !to || !block) {
    throw new Error('Fill operation requires from, to, and block');
  }

  const blocks = [];
  const { minX, maxX, minY, maxY, minZ, maxZ } = calculateBounds(from, to);
  
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        blocks.push({ x, y, z, block });
      }
    }
  }
  
  return blocks;
}

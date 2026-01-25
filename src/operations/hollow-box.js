import { calculateBounds } from '../utils/coordinates.js';

/**
 * Hollow box operation - Creates a hollow rectangular structure (walls only)
 * @param {Object} step - Step configuration
 * @param {Object} step.from - Starting coordinate {x, y, z}
 * @param {Object} step.to - Ending coordinate {x, y, z}
 * @param {string} step.block - Block type
 * @returns {Array} - List of block placements {x, y, z, block}
 */
export function hollowBox(step) {
  const { from, to, block } = step;

  if (!from || !to || !block) {
    throw new Error('Hollow box operation requires from, to, and block');
  }

  const blocks = [];
  const { minX, maxX, minY, maxY, minZ, maxZ } = calculateBounds(from, to);
  
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        // Only place blocks on the edges
        const isEdge = (
          x === minX || x === maxX ||
          y === minY || y === maxY ||
          z === minZ || z === maxZ
        );
        
        if (isEdge) {
          blocks.push({ x, y, z, block });
        }
      }
    }
  }
  
  return blocks;
}

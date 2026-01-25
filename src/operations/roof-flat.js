import { calculateBounds } from '../utils/coordinates.js';

/**
 * Roof flat operation - Creates a flat roof
 * @param {Object} step - Step configuration
 * @param {Object} step.from - Starting coordinate {x, y, z}
 * @param {Object} step.to - Ending coordinate {x, y, z}
 * @param {string} step.block - Block type
 * @returns {Array} - List of block placements {x, y, z, block}
 */
export function roofFlat(step) {
  const { from, to, block } = step;

  if (!from || !to || !block) {
    throw new Error('Roof flat operation requires from, to, and block');
  }

  const { minX, maxX, maxY, minZ, maxZ } = calculateBounds(from, to);
  const blocks = [];

  // Use the higher Y coordinate for the roof level
  const roofY = maxY;
  
  // Create a flat plane at the roof level
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      blocks.push({ x, y: roofY, z, block });
    }
  }
  
  return blocks;
}

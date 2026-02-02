/**
 * Cylinder Component
 *
 * Generates cylindrical structures for organic builds and statues.
 */

import { randomUUID } from 'crypto';

/**
 * Generate a cylinder structure
 * @param {Object} params - Cylinder parameters
 * @param {Object} params.position - Base center position
 * @param {number} params.radius - Cylinder radius
 * @param {number} params.height - Cylinder height
 * @param {boolean} params.hollow - Hollow interior (default: false)
 * @param {string} params.block - Block type
 * @param {number} params.taperTop - Top radius multiplier for tapering (default: 1.0)
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function cylinder(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    radius = 3,
    height = 10,
    hollow = false,
    block = '$primary',
    taperTop = 1.0,
    scale = 1
  } = params;

  const r = Math.max(1, Math.round(radius * scale));
  const h = Math.round(height * scale);

  // Return a cylinder primitive
  return [{
    id: randomUUID(),
    type: 'cylinder',
    base: { ...position },
    radius: r,
    height: h,
    hollow,
    block,
    taperTop,
    layer: 0
  }];
}

export default cylinder;

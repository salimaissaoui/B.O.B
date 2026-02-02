/**
 * Sphere Component
 *
 * Generates spherical structures for organic builds and statues.
 */

import { randomUUID } from 'crypto';

/**
 * Generate a sphere structure
 * @param {Object} params - Sphere parameters
 * @param {Object} params.position - Center position
 * @param {number} params.radius - Sphere radius
 * @param {boolean} params.hollow - Hollow interior (default: false)
 * @param {string} params.block - Block type
 * @param {boolean} params.hemisphere - Only top half (default: false)
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function sphere(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    radius = 5,
    hollow = false,
    block = '$primary',
    hemisphere = false,
    scale = 1
  } = params;

  const r = Math.max(1, Math.round(radius * scale));

  // Return a sphere primitive (WorldEdit will handle if available)
  return [{
    id: randomUUID(),
    type: 'sphere',
    center: { ...position },
    radius: r,
    hollow,
    block,
    hemisphere,
    layer: 0
  }];
}

export default sphere;

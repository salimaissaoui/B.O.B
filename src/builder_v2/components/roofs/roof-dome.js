/**
 * Dome Roof Component
 *
 * Generates hemispherical dome roofs.
 */

/**
 * Generate a dome roof structure
 * @param {Object} params - Dome parameters
 * @param {Object} params.position - Base position (center at base level)
 * @param {number} params.radius - Dome radius
 * @param {number} params.heightRatio - Height as ratio of radius (default: 1.0 = hemisphere)
 * @param {boolean} params.hollow - Hollow interior (default: true)
 * @param {string} params.block - Dome block
 * @param {string} params.capBlock - Optional cap block at top
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function roofDome(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    radius = 5,
    heightRatio = 1.0,
    hollow = true,
    block = '$primary',
    capBlock = '$accent',
    scale = 1
  } = params;

  const primitives = [];
  let idCounter = 0;
  const nextId = () => `roof_dome_${idCounter++}`;
  const r = Math.max(1, Math.round(radius * scale));
  const height = Math.round(r * heightRatio);

  // Use sphere primitive with hollow option
  primitives.push({
    id: nextId(),
    type: 'sphere',
    center: { ...position },
    radius: r,
    hollow,
    block,
    layer: 0
  });

  // We need to cut the bottom half (below position.y)
  // This is handled by constraining the sphere generation

  // Add decorative cap at top
  if (capBlock) {
    primitives.push({
      id: nextId(),
      type: 'set',
      pos: {
        x: position.x,
        y: position.y + height,
        z: position.z
      },
      block: capBlock,
      layer: 1
    });
  }

  return primitives;
}

export default roofDome;

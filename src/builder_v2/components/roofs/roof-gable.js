/**
 * Gable Roof Component
 *
 * Generates pitched gable roofs with optional overhang.
 */

/**
 * Generate a gable roof structure
 * @param {Object} params - Roof parameters
 * @param {Object} params.position - Base position (corner at eave level)
 * @param {number} params.width - X span
 * @param {number} params.depth - Z span
 * @param {number} params.pitch - Roof pitch angle factor (default: 0.5)
 * @param {number} params.overhang - Overhang beyond walls (default: 1)
 * @param {string} params.direction - Ridge direction: 'ns' or 'ew'
 * @param {string} params.block - Stair block for roof
 * @param {string} params.slabBlock - Slab for ridge cap
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function roofGable(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    width = 10,
    depth = 10,
    pitch = 0.5,
    overhang = 1,
    direction = 'ew',  // Ridge runs east-west
    block = '$roof',
    slabBlock = '$roof_slab',
    scale = 1
  } = params;

  const primitives = [];
  let idCounter = 0;
  const nextId = () => `roof_gable_${idCounter++}`;
  const w = Math.round(width * scale);
  const d = Math.round(depth * scale);
  const oh = Math.round(overhang * scale);

  // Calculate roof height based on pitch
  const span = direction === 'ew' ? d : w;
  const roofHeight = Math.ceil(span / 2 * pitch);

  // Generate roof layers
  if (direction === 'ew') {
    // Ridge runs east-west, slopes on north and south
    for (let layer = 0; layer <= roofHeight; layer++) {
      const layerZ = layer;
      const layerWidth = Math.max(0, Math.ceil(span / 2) - layer);

      if (layerWidth <= 0) continue;

      // South slope
      for (let x = -oh; x < w + oh; x++) {
        primitives.push({
          id: nextId(),
          type: 'stairs',
          pos: {
            x: position.x + x,
            y: position.y + layer,
            z: position.z - oh + layerZ
          },
          block,
          facing: 'north',
          layer
        });
      }

      // North slope
      for (let x = -oh; x < w + oh; x++) {
        primitives.push({
          id: nextId(),
          type: 'stairs',
          pos: {
            x: position.x + x,
            y: position.y + layer,
            z: position.z + d + oh - 1 - layerZ
          },
          block,
          facing: 'south',
          layer
        });
      }
    }

    // Ridge cap (slabs at the peak)
    const ridgeZ = position.z + Math.floor(d / 2);
    for (let x = -oh; x < w + oh; x++) {
      primitives.push({
        id: nextId(),
        type: 'slab',
        pos: {
          x: position.x + x,
          y: position.y + roofHeight,
          z: ridgeZ
        },
        block: slabBlock,
        half: 'bottom',
        layer: roofHeight + 1
      });
    }
  } else {
    // Ridge runs north-south, slopes on east and west
    for (let layer = 0; layer <= roofHeight; layer++) {
      const layerX = layer;
      const layerDepth = Math.max(0, Math.ceil(span / 2) - layer);

      if (layerDepth <= 0) continue;

      // West slope
      for (let z = -oh; z < d + oh; z++) {
        primitives.push({
          id: nextId(),
          type: 'stairs',
          pos: {
            x: position.x - oh + layerX,
            y: position.y + layer,
            z: position.z + z
          },
          block,
          facing: 'east',
          layer
        });
      }

      // East slope
      for (let z = -oh; z < d + oh; z++) {
        primitives.push({
          id: nextId(),
          type: 'stairs',
          pos: {
            x: position.x + w + oh - 1 - layerX,
            y: position.y + layer,
            z: position.z + z
          },
          block,
          facing: 'west',
          layer
        });
      }
    }

    // Ridge cap
    const ridgeX = position.x + Math.floor(w / 2);
    for (let z = -oh; z < d + oh; z++) {
      primitives.push({
        id: nextId(),
        type: 'slab',
        pos: {
          x: ridgeX,
          y: position.y + roofHeight,
          z: position.z + z
        },
        block: slabBlock,
        half: 'bottom',
        layer: roofHeight + 1
      });
    }
  }

  // Gable ends (triangular fill)
  if (direction === 'ew') {
    // West gable
    for (let layer = 0; layer < roofHeight; layer++) {
      const gableWidth = Math.ceil(span / 2) - layer - 1;
      if (gableWidth <= 0) continue;

      for (let dz = -gableWidth; dz <= gableWidth; dz++) {
        primitives.push({
          id: nextId(),
          type: 'set',
          pos: {
            x: position.x - oh,
            y: position.y + layer,
            z: position.z + Math.floor(d / 2) + dz
          },
          block: '$primary',
          layer: layer + roofHeight + 2
        });
      }
    }

    // East gable
    for (let layer = 0; layer < roofHeight; layer++) {
      const gableWidth = Math.ceil(span / 2) - layer - 1;
      if (gableWidth <= 0) continue;

      for (let dz = -gableWidth; dz <= gableWidth; dz++) {
        primitives.push({
          id: nextId(),
          type: 'set',
          pos: {
            x: position.x + w + oh - 1,
            y: position.y + layer,
            z: position.z + Math.floor(d / 2) + dz
          },
          block: '$primary',
          layer: layer + roofHeight + 2
        });
      }
    }
  }

  return primitives;
}

export default roofGable;

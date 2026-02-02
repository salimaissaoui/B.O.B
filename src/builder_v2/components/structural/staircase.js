/**
 * Staircase Component
 *
 * Generates regular and spiral staircases.
 */

import { randomUUID } from 'crypto';

/**
 * Generate a staircase structure
 * @param {Object} params - Staircase parameters
 * @param {Object} params.position - Base position (start of stairs)
 * @param {number} params.height - Total vertical rise
 * @param {string} params.style - 'straight', 'spiral', 'l_shaped'
 * @param {string} params.direction - 'north', 'south', 'east', 'west'
 * @param {number} params.width - Stair width (default: 3)
 * @param {number} params.radius - Spiral radius (for spiral style)
 * @param {string} params.block - Stair block type
 * @param {string} params.slabBlock - Landing slab block
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function staircase(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    height = 8,
    style = 'straight',
    direction = 'north',
    width = 3,
    radius = 3,
    block = '$roof',  // Uses stair blocks typically
    slabBlock = '$roof_slab',
    scale = 1
  } = params;

  const primitives = [];
  const h = Math.round(height * scale);
  const w = Math.round(width * scale);
  const r = Math.round(radius * scale);

  if (style === 'spiral') {
    // Spiral staircase
    const stepsPerRevolution = Math.max(8, r * 4);
    const angleStep = (2 * Math.PI) / stepsPerRevolution;
    const yStep = h / (h * 2);  // Half-block per step

    for (let step = 0; step < h * 2; step++) {
      const angle = step * angleStep;
      const y = position.y + Math.floor(step * yStep);

      // Stair block position
      const x = position.x + Math.round(Math.cos(angle) * r);
      const z = position.z + Math.round(Math.sin(angle) * r);

      // Determine facing based on angle
      const facing = angle < Math.PI / 4 ? 'east'
        : angle < 3 * Math.PI / 4 ? 'north'
        : angle < 5 * Math.PI / 4 ? 'west'
        : angle < 7 * Math.PI / 4 ? 'south'
        : 'east';

      primitives.push({
        id: randomUUID(),
        type: 'stairs',
        pos: { x, y, z },
        block,
        facing,
        layer: step
      });

      // Support blocks (platform under stairs)
      primitives.push({
        id: randomUUID(),
        type: 'set',
        pos: { x, y: y - 1, z },
        block: slabBlock
      });
    }

    // Central pillar
    primitives.push({
      id: randomUUID(),
      type: 'line',
      from: { x: position.x, y: position.y, z: position.z },
      to: { x: position.x, y: position.y + h, z: position.z },
      block: '$secondary'
    });
  } else {
    // Straight staircase
    const dirVectors = {
      north: { x: 0, z: -1 },
      south: { x: 0, z: 1 },
      east: { x: 1, z: 0 },
      west: { x: -1, z: 0 }
    };
    const dir = dirVectors[direction] || dirVectors.north;

    for (let step = 0; step < h; step++) {
      const stepX = position.x + dir.x * step;
      const stepY = position.y + step;
      const stepZ = position.z + dir.z * step;

      // Width of stair (perpendicular to direction)
      const perpX = dir.z;
      const perpZ = dir.x;

      for (let wIdx = 0; wIdx < w; wIdx++) {
        const offset = wIdx - Math.floor(w / 2);

        primitives.push({
          id: randomUUID(),
          type: 'stairs',
          pos: {
            x: stepX + perpX * offset,
            y: stepY,
            z: stepZ + perpZ * offset
          },
          block,
          facing: direction,
          layer: step
        });
      }
    }
  }

  return primitives;
}

export default staircase;

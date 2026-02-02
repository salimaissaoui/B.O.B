/**
 * Staircase Component
 *
 * Generates regular and spiral staircases with guaranteed walkability.
 *
 * Key features:
 * - 4-neighbor connectivity (Manhattan adjacency) between successive steps
 * - Interpolation blocks when position delta > 1
 * - Wedge support under stairs for walkability
 * - Facing direction based on movement vector
 */

import { randomUUID } from 'crypto';

/**
 * Calculate Manhattan distance between two positions (2D)
 */
function manhattanDistance2D(x1, z1, x2, z2) {
  return Math.abs(x2 - x1) + Math.abs(z2 - z1);
}

/**
 * Interpolate blocks between two positions to ensure connectivity
 * Returns array of {x, z} positions forming a connected path
 */
function interpolatePath(x1, z1, x2, z2) {
  const path = [];
  const dx = x2 - x1;
  const dz = z2 - z1;
  const steps = Math.max(Math.abs(dx), Math.abs(dz));

  if (steps <= 1) {
    return path; // No interpolation needed
  }

  // Bresenham-like interpolation for connected path
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = Math.round(x1 + dx * t);
    const z = Math.round(z1 + dz * t);
    path.push({ x, z });
  }

  return path;
}

/**
 * Calculate stair facing direction based on movement vector
 * @param {number} dx - X movement direction
 * @param {number} dz - Z movement direction
 * @returns {string} Facing direction: 'north', 'south', 'east', 'west'
 */
function calculateFacingFromMovement(dx, dz) {
  // Stairs face the direction you're walking FROM (opposite of movement)
  if (Math.abs(dx) > Math.abs(dz)) {
    return dx > 0 ? 'west' : 'east';
  } else {
    return dz > 0 ? 'north' : 'south';
  }
}

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
 * @param {string} params.supportBlock - Support/platform block
 * @param {boolean} params.clockwise - Spiral direction (default: true)
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
    supportBlock = '$secondary',
    clockwise = true,
    scale = 1
  } = params;

  const primitives = [];
  const h = Math.round(height * scale);
  const w = Math.round(width * scale);
  const r = Math.round(Math.max(2, radius * scale)); // Minimum radius of 2

  if (style === 'spiral') {
    // Spiral staircase with guaranteed connectivity
    // Use 12 steps per revolution for smoother spiral
    const stepsPerRevolution = 12;
    const spiralDirection = clockwise ? 1 : -1;

    let prevX = null;
    let prevZ = null;
    let prevY = null;

    // Each step rises by 1 block (not 0.5)
    for (let step = 0; step < h; step++) {
      const angle = spiralDirection * (step / stepsPerRevolution) * 2 * Math.PI;
      const y = position.y + step;

      // Stair block position
      const x = position.x + Math.round(Math.cos(angle) * r);
      const z = position.z + Math.round(Math.sin(angle) * r);

      // Calculate movement direction for facing
      let dx = 0, dz = 0;
      if (prevX !== null) {
        dx = x - prevX;
        dz = z - prevZ;
      } else {
        // First step: calculate from next position
        const nextAngle = spiralDirection * ((step + 1) / stepsPerRevolution) * 2 * Math.PI;
        const nextX = position.x + Math.round(Math.cos(nextAngle) * r);
        const nextZ = position.z + Math.round(Math.sin(nextAngle) * r);
        dx = nextX - x;
        dz = nextZ - z;
      }

      const facing = calculateFacingFromMovement(dx, dz);

      // Add interpolation blocks if there's a gap (Manhattan distance > 1)
      if (prevX !== null) {
        const distance = manhattanDistance2D(prevX, prevZ, x, z);

        if (distance > 1) {
          // Add connecting wedge/platform blocks to bridge the gap
          const interpolated = interpolatePath(prevX, prevZ, x, z);

          for (const pos of interpolated) {
            // Add slab at previous Y level to create walkable bridge
            primitives.push({
              id: randomUUID(),
              type: 'set',
              pos: { x: pos.x, y: prevY, z: pos.z },
              block: slabBlock,
              layer: step - 1
            });

            // Add support under the slab
            primitives.push({
              id: randomUUID(),
              type: 'set',
              pos: { x: pos.x, y: prevY - 1, z: pos.z },
              block: supportBlock,
              layer: step - 1
            });
          }
        }
      }

      // Add main stair block with proper facing
      primitives.push({
        id: randomUUID(),
        type: 'stairs',
        pos: { x, y, z },
        block,
        facing,
        layer: step
      });

      // Add wedge support platform (makes stairs more walkable)
      primitives.push({
        id: randomUUID(),
        type: 'set',
        pos: { x, y: y - 1, z },
        block: supportBlock,
        layer: step
      });

      // Add inner support block (towards center) for structural integrity
      const innerX = position.x + Math.round(Math.cos(angle) * (r - 1));
      const innerZ = position.z + Math.round(Math.sin(angle) * (r - 1));

      if (innerX !== x || innerZ !== z) {
        primitives.push({
          id: randomUUID(),
          type: 'set',
          pos: { x: innerX, y: y - 1, z: innerZ },
          block: supportBlock,
          layer: step
        });
      }

      prevX = x;
      prevZ = z;
      prevY = y;
    }

    // Central pillar for structural support
    primitives.push({
      id: randomUUID(),
      type: 'line',
      from: { x: position.x, y: position.y, z: position.z },
      to: { x: position.x, y: position.y + h, z: position.z },
      block: supportBlock,
      layer: 0
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

        // Add support block under each stair
        if (step > 0) {
          primitives.push({
            id: randomUUID(),
            type: 'set',
            pos: {
              x: stepX + perpX * offset,
              y: stepY - 1,
              z: stepZ + perpZ * offset
            },
            block: supportBlock,
            layer: step
          });
        }
      }
    }
  }

  return primitives;
}

export default staircase;

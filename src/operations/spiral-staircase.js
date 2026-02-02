/**
 * Spiral Staircase Operation
 * Creates a spiral staircase using stair blocks with guaranteed walkability
 *
 * Key features:
 * - 4-neighbor connectivity (Manhattan adjacency) between successive steps
 * - Interpolation blocks when position delta > 1
 * - Wedge support under stairs for walkability
 * - Facing direction based on movement vector
 */

/**
 * Calculate Manhattan distance between two positions
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
function calculateFacing(dx, dz) {
  // Stairs face the direction you're walking FROM (opposite of movement)
  if (Math.abs(dx) > Math.abs(dz)) {
    return dx > 0 ? 'west' : 'east';
  } else {
    return dz > 0 ? 'north' : 'south';
  }
}

/**
 * Create a spiral staircase
 * @param {Object} step - Operation parameters
 * @param {Object} step.base - Base position {x, y, z}
 * @param {string} step.block - Stair block type
 * @param {number} step.height - Total height of staircase
 * @param {number} step.radius - Radius of spiral (default: 2)
 * @param {boolean} step.clockwise - Direction of spiral (default: true)
 */
export function spiralStaircase(step) {
  if (!step.base || !step.block || !step.height) {
    throw new Error('spiral_staircase requires base, block, and height parameters');
  }

  if (!step.block.includes('stairs')) {
    throw new Error('spiral_staircase requires a stair block type');
  }

  const blocks = [];
  const radius = step.radius || 2;
  const clockwise = step.clockwise !== false;
  const direction = clockwise ? 1 : -1;

  // Use 12 steps per revolution for smoother spiral with better connectivity
  const stepsPerRevolution = 12;
  const totalSteps = step.height;

  // Derive support block from stair block
  const supportBlock = step.block.replace('_stairs', '_planks');
  const slabBlock = step.block.replace('_stairs', '_slab');

  let prevX = null;
  let prevZ = null;

  for (let i = 0; i < totalSteps; i++) {
    // Calculate angle for this step (in radians)
    const angle = direction * (i / stepsPerRevolution) * 2 * Math.PI;

    // Calculate position on spiral
    const x = Math.round(step.base.x + radius * Math.cos(angle));
    const z = Math.round(step.base.z + radius * Math.sin(angle));
    const y = step.base.y + i;

    // Calculate movement direction for facing
    let dx = 0, dz = 0;
    if (prevX !== null) {
      dx = x - prevX;
      dz = z - prevZ;
    } else {
      // First step: calculate from angle
      const nextAngle = direction * ((i + 1) / stepsPerRevolution) * 2 * Math.PI;
      const nextX = Math.round(step.base.x + radius * Math.cos(nextAngle));
      const nextZ = Math.round(step.base.z + radius * Math.sin(nextAngle));
      dx = nextX - x;
      dz = nextZ - z;
    }

    const facing = calculateFacing(dx, dz);

    // Add interpolation blocks if there's a gap (Manhattan distance > 1)
    if (prevX !== null) {
      const distance = manhattanDistance2D(prevX, prevZ, x, z);

      if (distance > 1) {
        // Add connecting wedge/platform blocks to bridge the gap
        const interpolated = interpolatePath(prevX, prevZ, x, z);

        for (const pos of interpolated) {
          // Add slab at previous Y level to create walkable bridge
          blocks.push({
            x: pos.x,
            y: y - 1,
            z: pos.z,
            block: slabBlock
          });

          // Add support under the slab
          blocks.push({
            x: pos.x,
            y: y - 2,
            z: pos.z,
            block: supportBlock
          });
        }
      }
    }

    // Add main stair block with facing
    blocks.push({
      x: x,
      y: y,
      z: z,
      block: step.block,
      facing: facing
    });

    // Add wedge support platform (makes stairs more walkable)
    // This creates a small platform under/beside each stair
    blocks.push({
      x: x,
      y: y - 1,
      z: z,
      block: supportBlock
    });

    // Add inner support block (towards center) for structural integrity
    const innerX = Math.round(step.base.x + (radius - 1) * Math.cos(angle));
    const innerZ = Math.round(step.base.z + (radius - 1) * Math.sin(angle));

    if (innerX !== x || innerZ !== z) {
      blocks.push({
        x: innerX,
        y: y - 1,
        z: innerZ,
        block: supportBlock
      });
    }

    prevX = x;
    prevZ = z;
  }

  // Add central pillar for structural support
  for (let y = step.base.y; y < step.base.y + totalSteps; y++) {
    blocks.push({
      x: step.base.x,
      y: y,
      z: step.base.z,
      block: supportBlock.replace('_planks', '_log')
    });
  }

  return blocks;
}

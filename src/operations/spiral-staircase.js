/**
 * Spiral Staircase Operation
 * Creates a spiral staircase using stair blocks
 */

/**
 * Create a spiral staircase
 * @param {Object} step - Operation parameters
 * @param {Object} step.base - Base position {x, y, z}
 * @param {string} step.block - Stair block type
 * @param {number} step.height - Total height of staircase
 * @param {number} step.radius - Radius of spiral (default: 2)
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
  const stepsPerRevolution = 8; // 8 steps per full circle
  const totalSteps = step.height;

  for (let i = 0; i < totalSteps; i++) {
    // Calculate angle for this step (in radians)
    const angle = (i / stepsPerRevolution) * 2 * Math.PI;

    // Calculate position on spiral
    const x = Math.round(step.base.x + radius * Math.cos(angle));
    const z = Math.round(step.base.z + radius * Math.sin(angle));
    const y = step.base.y + i;

    // Add stair block
    blocks.push({
      x: x,
      y: y,
      z: z,
      block: step.block
    });

    // Add support block below (except for first step)
    if (i > 0) {
      blocks.push({
        x: x,
        y: y - 1,
        z: z,
        block: step.block.replace('_stairs', '_planks') // Use planks for support
      });
    }
  }

  return blocks;
}

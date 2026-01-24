/**
 * WorldEdit Cylinder Operation
 * Creates cylinders using //cyl or //hcyl command
 */

/**
 * Calculate approximate cylinder volume
 */
function calculateCylinderVolume(radius, height, hollow = false) {
  const volume = Math.floor(Math.PI * radius * radius * height);
  return hollow ? Math.floor(volume * 0.4) : volume; // Hollow is ~40% of solid
}

/**
 * WorldEdit cylinder operation
 * Returns operation descriptor for WorldEdit executor
 */
export function weCylinder(step) {
  // Validate required parameters
  if (!step.radius || !step.height || !step.block) {
    throw new Error('we_cylinder requires radius, height, and block parameters');
  }

  if (!step.base && !step.pos) {
    throw new Error('we_cylinder requires base or pos parameter for center position');
  }

  const base = step.base || step.pos;
  const hollow = step.hollow || false;

  // Return operation descriptor
  return {
    type: 'worldedit',
    command: 'cylinder',
    base: base,
    radius: step.radius,
    height: step.height,
    block: step.block,
    hollow: hollow,
    estimatedBlocks: calculateCylinderVolume(step.radius, step.height, hollow),
    fallback: null // No simple vanilla fallback for cylinders
  };
}

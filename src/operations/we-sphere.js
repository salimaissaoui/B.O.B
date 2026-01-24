/**
 * WorldEdit Sphere Operation
 * Creates spheres using //sphere or //hsphere command
 */

/**
 * Calculate approximate sphere volume
 */
function calculateSphereVolume(radius, hollow = false) {
  const volume = Math.floor((4 / 3) * Math.PI * radius * radius * radius);
  return hollow ? Math.floor(volume * 0.3) : volume; // Hollow is ~30% of solid
}

/**
 * WorldEdit sphere operation
 * Returns operation descriptor for WorldEdit executor
 */
export function weSphere(step) {
  // Validate required parameters
  if (!step.radius || !step.block) {
    throw new Error('we_sphere requires radius and block parameters');
  }

  if (!step.center && !step.pos && !step.base) {
    throw new Error('we_sphere requires center, pos, or base parameter for center position');
  }

  const center = step.center || step.pos || step.base;
  const hollow = step.hollow || false;

  // Return operation descriptor
  return {
    type: 'worldedit',
    command: 'sphere',
    center: center,
    radius: step.radius,
    block: step.block,
    hollow: hollow,
    estimatedBlocks: calculateSphereVolume(step.radius, hollow),
    fallback: null // No simple vanilla fallback for spheres
  };
}

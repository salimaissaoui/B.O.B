/**
 * WorldEdit Pyramid Operation
 * Creates pyramids using //pyramid or //hpyramid command
 */

/**
 * Calculate approximate pyramid volume
 */
function calculatePyramidVolume(height, hollow = false) {
  const volume = Math.floor((height * height * height) / 3);
  return hollow ? Math.floor(volume * 0.3) : volume; // Hollow is ~30% of solid
}

/**
 * WorldEdit pyramid operation
 * Returns operation descriptor for WorldEdit executor
 */
export function wePyramid(step) {
  // Validate required parameters
  if (!step.height || !step.block) {
    throw new Error('we_pyramid requires height and block parameters');
  }

  if (!step.base && !step.pos) {
    throw new Error('we_pyramid requires base or pos parameter for center position');
  }

  const base = step.base || step.pos;
  const hollow = step.hollow || false;

  // Return operation descriptor
  return {
    type: 'worldedit',
    command: 'pyramid',
    base: base,
    height: step.height,
    block: step.block,
    hollow: hollow,
    estimatedBlocks: calculatePyramidVolume(step.height, hollow),
    fallback: {
      op: 'roof_gable',
      from: {
        x: base.x - step.height,
        y: base.y,
        z: base.z - step.height
      },
      to: {
        x: base.x + step.height,
        y: base.y + step.height,
        z: base.z + step.height
      },
      block: step.block,
      peakHeight: step.height
    }
  };
}

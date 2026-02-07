/**
 * WorldEdit Cylinder Operation
 * Creates cylinders using //cyl or //hcyl command
 * Supports tapered cylinders via topRadius parameter
 */

/**
 * Calculate approximate cylinder volume
 */
function calculateCylinderVolume(radius, height, hollow = false) {
  const volume = Math.floor(Math.PI * radius * radius * height);
  return hollow ? Math.floor(volume * 0.4) : volume; // Hollow is ~40% of solid
}

/**
 * Calculate approximate tapered cylinder (frustum) volume
 */
function calculateTaperedVolume(bottomRadius, topRadius, height, hollow = false) {
  // Frustum volume formula: V = (π/3) * h * (r1² + r1*r2 + r2²)
  const volume = Math.floor(
    (Math.PI / 3) * height * (
      bottomRadius * bottomRadius +
      bottomRadius * topRadius +
      topRadius * topRadius
    )
  );
  return hollow ? Math.floor(volume * 0.4) : volume;
}

/**
 * WorldEdit cylinder operation
 * Returns operation descriptor for WorldEdit executor
 *
 * Supports:
 * - Uniform cylinder: radius + height
 * - Tapered cylinder: radius + topRadius + height (stacked circles)
 * - Cone: radius + topRadius=0 + height
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
  const bottomRadius = step.radius;
  const topRadius = step.topRadius !== undefined ? step.topRadius : step.radius;

  // If uniform cylinder (no taper), return single operation
  if (topRadius === bottomRadius) {
    return {
      type: 'worldedit',
      command: 'cylinder',
      base: base,
      radius: bottomRadius,
      height: step.height,
      block: step.block,
      hollow: hollow,
      estimatedBlocks: calculateCylinderVolume(bottomRadius, step.height, hollow),
      fallback: null
    };
  }

  // Tapered cylinder: generate stacked cylinder sections with decreasing radii
  // Each section is 1-2 blocks tall depending on total height
  const operations = [];
  const height = step.height;
  const radiusDiff = bottomRadius - topRadius;

  // Determine number of sections based on radius difference
  // More sections = smoother taper
  const numSections = Math.max(3, Math.min(height, Math.abs(radiusDiff) + 2));
  const sectionHeight = Math.max(1, Math.floor(height / numSections));

  let currentY = base.y;
  let remainingHeight = height;

  for (let i = 0; i < numSections && remainingHeight > 0; i++) {
    // Linear interpolation for radius at this section
    const t = i / (numSections - 1);
    const sectionRadius = Math.round(bottomRadius - (radiusDiff * t));

    // Last section gets remaining height
    const thisHeight = (i === numSections - 1)
      ? remainingHeight
      : Math.min(sectionHeight, remainingHeight);

    if (sectionRadius > 0 && thisHeight > 0) {
      operations.push({
        type: 'worldedit',
        command: 'cylinder',
        base: { x: base.x, y: currentY, z: base.z },
        radius: sectionRadius,
        height: thisHeight,
        block: step.block,
        hollow: hollow,
        estimatedBlocks: calculateCylinderVolume(sectionRadius, thisHeight, hollow),
        fallback: null,
        _taperSection: i + 1 // Debug info
      });
    }

    currentY += thisHeight;
    remainingHeight -= thisHeight;
  }

  // Return array of operations for tapered cylinder
  // The executor should handle arrays of operations
  return {
    type: 'worldedit_batch',
    command: 'tapered_cylinder',
    operations: operations,
    base: base,
    bottomRadius: bottomRadius,
    topRadius: topRadius,
    height: step.height,
    block: step.block,
    hollow: hollow,
    estimatedBlocks: calculateTaperedVolume(bottomRadius, topRadius, step.height, hollow),
    fallback: null
  };
}

/**
 * Cone operation - convenience wrapper for tapered cylinder with topRadius=0
 */
export function weCone(step) {
  return weCylinder({
    ...step,
    topRadius: 0
  });
}

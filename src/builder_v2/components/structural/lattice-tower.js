/**
 * Lattice Tower Component
 *
 * Generates Eiffel Tower-style lattice structures with
 * tapered legs, cross-bracing, and observation platforms.
 */

import { randomUUID } from 'crypto';

/**
 * Generate a lattice tower structure
 * @param {Object} params - Tower parameters
 * @param {Object} params.position - Base position {x, y, z}
 * @param {number} params.height - Total height (default: 100)
 * @param {number} params.baseWidth - Base footprint width (default: 40)
 * @param {number} params.taperRatio - Top width as ratio of base (default: 0.2)
 * @param {number} params.legCount - Number of legs (4 for square, 3 for triangular)
 * @param {Object[]} params.platforms - Platform definitions [{height, width, depth}]
 * @param {Object} params.materials - Material overrides
 * @param {number} params.scale - Scale multiplier
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function latticeTower(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    height = 100,
    baseWidth = 40,
    taperRatio = 0.2,
    legCount = 4,
    platforms = [
      { heightRatio: 0.33, widthRatio: 0.6 },
      { heightRatio: 0.66, widthRatio: 0.4 },
      { heightRatio: 1.0, widthRatio: 0.2 }
    ],
    materials = {},
    scale = 1,
    rng
  } = params;

  const primitives = [];
  const h = Math.round(height * scale);
  const bw = Math.round(baseWidth * scale);
  const topWidth = Math.round(bw * taperRatio);

  // Material selections
  const legBlock = materials.leg || materials.primary || '$secondary';
  const braceBlock = materials.brace || materials.accent || '$accent';
  const platformBlock = materials.platform || materials.primary || '$primary';

  // Center of tower at ground level
  const centerX = position.x + Math.floor(bw / 2);
  const centerZ = position.z + Math.floor(bw / 2);

  // Generate legs (4 corners tapering inward)
  const legPositions = legCount === 4 ? [
    { x: 0, z: 0 },           // SW
    { x: bw - 1, z: 0 },      // SE
    { x: 0, z: bw - 1 },      // NW
    { x: bw - 1, z: bw - 1 }  // NE
  ] : [
    { x: Math.floor(bw / 2), z: 0 },        // S
    { x: 0, z: bw - 1 },                    // NW
    { x: bw - 1, z: bw - 1 }                // NE
  ];

  // Generate each leg as a series of line segments
  const segmentHeight = Math.floor(h / 10);

  for (let seg = 0; seg < 10; seg++) {
    const startY = seg * segmentHeight;
    const endY = (seg + 1) * segmentHeight;

    // Calculate width at start and end of segment
    const startRatio = 1 - (seg / 10) * (1 - taperRatio);
    const endRatio = 1 - ((seg + 1) / 10) * (1 - taperRatio);

    for (let legIdx = 0; legIdx < legPositions.length; legIdx++) {
      const legBase = legPositions[legIdx];

      // Start and end positions for this leg segment
      const startX = position.x + Math.round(legBase.x * startRatio + (bw / 2) * (1 - startRatio));
      const startZ = position.z + Math.round(legBase.z * startRatio + (bw / 2) * (1 - startRatio));
      const endX = position.x + Math.round(legBase.x * endRatio + (bw / 2) * (1 - endRatio));
      const endZ = position.z + Math.round(legBase.z * endRatio + (bw / 2) * (1 - endRatio));

      // Leg segment
      primitives.push({
        id: randomUUID(),
        type: 'line',
        from: { x: startX, y: position.y + startY, z: startZ },
        to: { x: endX, y: position.y + endY, z: endZ },
        block: legBlock,
        layer: 0
      });

      // Cross bracing (diagonal between legs)
      if (seg % 2 === 0 && legIdx < legPositions.length - 1) {
        const nextLeg = legPositions[(legIdx + 1) % legPositions.length];
        const nextStartX = position.x + Math.round(nextLeg.x * startRatio + (bw / 2) * (1 - startRatio));
        const nextStartZ = position.z + Math.round(nextLeg.z * startRatio + (bw / 2) * (1 - startRatio));

        primitives.push({
          id: randomUUID(),
          type: 'line',
          from: { x: startX, y: position.y + startY, z: startZ },
          to: { x: nextStartX, y: position.y + startY + Math.floor(segmentHeight / 2), z: nextStartZ },
          block: braceBlock,
          layer: 1
        });
      }
    }

    // Horizontal bracing ring at segment boundaries
    if (seg % 3 === 0 || seg === 9) {
      const ringRatio = 1 - (seg / 10) * (1 - taperRatio);
      const ringWidth = Math.round(bw * ringRatio);
      const ringOffset = Math.round((bw - ringWidth) / 2);

      primitives.push({
        id: randomUUID(),
        type: 'hollow_box',
        from: {
          x: position.x + ringOffset,
          y: position.y + startY,
          z: position.z + ringOffset
        },
        to: {
          x: position.x + ringOffset + ringWidth - 1,
          y: position.y + startY,
          z: position.z + ringOffset + ringWidth - 1
        },
        block: braceBlock,
        layer: 1
      });
    }
  }

  // Generate platforms
  for (const platform of platforms) {
    const platY = position.y + Math.round(h * platform.heightRatio);
    const platWidth = Math.round(bw * (platform.widthRatio || 0.5));
    const platOffset = Math.round((bw - platWidth) / 2);

    // Platform floor
    primitives.push({
      id: randomUUID(),
      type: 'box',
      from: {
        x: position.x + platOffset,
        y: platY,
        z: position.z + platOffset
      },
      to: {
        x: position.x + platOffset + platWidth - 1,
        y: platY,
        z: position.z + platOffset + platWidth - 1
      },
      block: platformBlock,
      layer: 2
    });

    // Platform railing (if not top)
    if (platform.heightRatio < 1.0) {
      primitives.push({
        id: randomUUID(),
        type: 'hollow_box',
        from: {
          x: position.x + platOffset,
          y: platY + 1,
          z: position.z + platOffset
        },
        to: {
          x: position.x + platOffset + platWidth - 1,
          y: platY + 1,
          z: position.z + platOffset + platWidth - 1
        },
        block: '$fence',
        layer: 3
      });
    }
  }

  // Top spire
  const topY = position.y + h;
  const spireHeight = Math.round(h * 0.1);

  primitives.push({
    id: randomUUID(),
    type: 'line',
    from: { x: centerX, y: topY, z: centerZ },
    to: { x: centerX, y: topY + spireHeight, z: centerZ },
    block: legBlock,
    layer: 4
  });

  return primitives;
}

export default latticeTower;

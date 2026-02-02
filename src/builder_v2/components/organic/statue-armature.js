/**
 * Statue Armature Component
 *
 * Generates humanoid/creature armatures using spheres and cylinders.
 * Perfect for 3D statues without pixel art.
 */

import { randomUUID } from 'crypto';

/**
 * Generate a statue armature
 * @param {Object} params - Armature parameters
 * @param {Object} params.position - Base position (feet)
 * @param {number} params.height - Total height
 * @param {string} params.style - 'humanoid', 'quadruped', 'creature'
 * @param {boolean} params.symmetry - Mirror left/right (default: true)
 * @param {Object[]} params.segments - Custom segment definitions
 * @param {Object} params.proportions - Body proportions override
 * @param {Object} params.materials - Material overrides per body part
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function statueArmature(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    height = 20,
    style = 'humanoid',
    symmetry = true,
    segments = null,
    proportions = {},
    materials = {},
    scale = 1,
    rng
  } = params;

  const primitives = [];
  const h = Math.round(height * scale);

  // Default proportions for humanoid
  const defaultProportions = {
    headRatio: 0.15,
    torsoRatio: 0.35,
    legRatio: 0.45,
    armLength: 0.4,
    shoulderWidth: 0.3,
    hipWidth: 0.2
  };

  const p = { ...defaultProportions, ...proportions };

  // Material defaults
  const headBlock = materials.head || materials.skin || '$primary';
  const torsoBlock = materials.torso || materials.body || '$secondary';
  const limbBlock = materials.limb || materials.body || '$secondary';
  const accentBlock = materials.accent || '$accent';

  if (style === 'humanoid') {
    // Calculate body part sizes
    const headSize = Math.max(2, Math.round(h * p.headRatio));
    const torsoHeight = Math.round(h * p.torsoRatio);
    const legHeight = Math.round(h * p.legRatio);
    const armLength = Math.round(h * p.armLength);
    const shoulderWidth = Math.round(h * p.shoulderWidth);
    const hipWidth = Math.round(h * p.hipWidth);

    // Legs
    const legY = position.y;
    const legRadius = Math.max(1, Math.round(hipWidth / 4));

    if (symmetry) {
      // Left leg
      primitives.push({
        id: randomUUID(),
        type: 'cylinder',
        base: { x: position.x - Math.floor(hipWidth / 4), y: legY, z: position.z },
        radius: legRadius,
        height: legHeight,
        hollow: false,
        block: limbBlock,
        layer: 0
      });

      // Right leg
      primitives.push({
        id: randomUUID(),
        type: 'cylinder',
        base: { x: position.x + Math.floor(hipWidth / 4), y: legY, z: position.z },
        radius: legRadius,
        height: legHeight,
        hollow: false,
        block: limbBlock,
        layer: 0
      });
    }

    // Torso
    const torsoY = legY + legHeight;
    const torsoWidth = Math.max(2, Math.round(shoulderWidth));
    const torsoDepth = Math.max(1, Math.round(torsoWidth * 0.6));

    primitives.push({
      id: randomUUID(),
      type: 'box',
      from: {
        x: position.x - Math.floor(torsoWidth / 2),
        y: torsoY,
        z: position.z - Math.floor(torsoDepth / 2)
      },
      to: {
        x: position.x + Math.floor(torsoWidth / 2),
        y: torsoY + torsoHeight - 1,
        z: position.z + Math.floor(torsoDepth / 2)
      },
      block: torsoBlock,
      layer: 1
    });

    // Arms
    const armY = torsoY + torsoHeight - 2;
    const armRadius = Math.max(1, Math.round(legRadius * 0.8));

    if (symmetry) {
      // Left arm
      primitives.push({
        id: randomUUID(),
        type: 'cylinder',
        base: {
          x: position.x - Math.floor(torsoWidth / 2) - armRadius,
          y: armY - armLength + 1,
          z: position.z
        },
        radius: armRadius,
        height: armLength,
        hollow: false,
        block: limbBlock,
        layer: 2
      });

      // Right arm
      primitives.push({
        id: randomUUID(),
        type: 'cylinder',
        base: {
          x: position.x + Math.floor(torsoWidth / 2) + armRadius,
          y: armY - armLength + 1,
          z: position.z
        },
        radius: armRadius,
        height: armLength,
        hollow: false,
        block: limbBlock,
        layer: 2
      });
    }

    // Neck
    const neckY = torsoY + torsoHeight;
    const neckHeight = Math.max(1, Math.round(headSize * 0.3));

    primitives.push({
      id: randomUUID(),
      type: 'cylinder',
      base: { x: position.x, y: neckY, z: position.z },
      radius: Math.max(1, Math.round(headSize * 0.3)),
      height: neckHeight,
      hollow: false,
      block: headBlock,
      layer: 3
    });

    // Head
    const headY = neckY + neckHeight;
    const headRadius = Math.max(1, Math.round(headSize / 2));

    primitives.push({
      id: randomUUID(),
      type: 'sphere',
      center: { x: position.x, y: headY + headRadius, z: position.z },
      radius: headRadius,
      hollow: false,
      block: headBlock,
      layer: 4
    });

    // Base/platform
    const baseSize = Math.max(shoulderWidth, hipWidth) + 2;
    primitives.push({
      id: randomUUID(),
      type: 'box',
      from: {
        x: position.x - Math.floor(baseSize / 2),
        y: position.y - 1,
        z: position.z - Math.floor(baseSize / 2)
      },
      to: {
        x: position.x + Math.floor(baseSize / 2),
        y: position.y - 1,
        z: position.z + Math.floor(baseSize / 2)
      },
      block: accentBlock,
      layer: 5
    });
  } else if (style === 'quadruped') {
    // Four-legged creature
    const bodyLength = Math.round(h * 0.6);
    const bodyHeight = Math.round(h * 0.3);
    const legHeight = Math.round(h * 0.4);
    const headSize = Math.round(h * 0.2);

    // Body (horizontal box)
    primitives.push({
      id: randomUUID(),
      type: 'box',
      from: {
        x: position.x - Math.floor(bodyHeight / 2),
        y: position.y + legHeight,
        z: position.z - Math.floor(bodyLength / 2)
      },
      to: {
        x: position.x + Math.floor(bodyHeight / 2),
        y: position.y + legHeight + bodyHeight - 1,
        z: position.z + Math.floor(bodyLength / 2)
      },
      block: torsoBlock,
      layer: 1
    });

    // Four legs
    const legPositions = [
      { x: -Math.floor(bodyHeight / 3), z: -Math.floor(bodyLength / 3) },
      { x: Math.floor(bodyHeight / 3), z: -Math.floor(bodyLength / 3) },
      { x: -Math.floor(bodyHeight / 3), z: Math.floor(bodyLength / 3) },
      { x: Math.floor(bodyHeight / 3), z: Math.floor(bodyLength / 3) }
    ];

    for (const leg of legPositions) {
      primitives.push({
        id: randomUUID(),
        type: 'cylinder',
        base: {
          x: position.x + leg.x,
          y: position.y,
          z: position.z + leg.z
        },
        radius: Math.max(1, Math.round(bodyHeight / 6)),
        height: legHeight,
        hollow: false,
        block: limbBlock,
        layer: 0
      });
    }

    // Head
    primitives.push({
      id: randomUUID(),
      type: 'sphere',
      center: {
        x: position.x,
        y: position.y + legHeight + bodyHeight,
        z: position.z - Math.floor(bodyLength / 2) - Math.floor(headSize / 2)
      },
      radius: Math.floor(headSize / 2),
      hollow: false,
      block: headBlock,
      layer: 2
    });
  }

  // Custom segments override everything
  if (segments && Array.isArray(segments)) {
    for (const seg of segments) {
      primitives.push({
        id: randomUUID(),
        type: seg.type || 'sphere',
        center: seg.center ? {
          x: position.x + seg.center.x,
          y: position.y + seg.center.y,
          z: position.z + seg.center.z
        } : undefined,
        base: seg.base ? {
          x: position.x + seg.base.x,
          y: position.y + seg.base.y,
          z: position.z + seg.base.z
        } : undefined,
        radius: seg.radius,
        height: seg.height,
        hollow: seg.hollow || false,
        block: seg.block || '$primary',
        layer: seg.layer || 0
      });
    }
  }

  return primitives;
}

export default statueArmature;

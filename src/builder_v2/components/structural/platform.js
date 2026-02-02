/**
 * Platform Component
 *
 * Generates platforms with optional railings and support columns.
 */

import { randomUUID } from 'crypto';

/**
 * Generate a platform structure
 * @param {Object} params - Platform parameters
 * @param {Object} params.position - Base position (corner)
 * @param {number} params.width - X dimension
 * @param {number} params.depth - Z dimension
 * @param {number} params.thickness - Floor thickness (default: 1)
 * @param {boolean} params.railings - Add railings (default: true)
 * @param {boolean} params.supports - Add support columns (default: false)
 * @param {number} params.supportHeight - Height of supports if enabled
 * @param {string} params.floorBlock - Floor block
 * @param {string} params.railingBlock - Railing block
 * @param {string} params.supportBlock - Support column block
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function platform(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    width = 10,
    depth = 10,
    thickness = 1,
    railings = true,
    supports = false,
    supportHeight = 4,
    floorBlock = '$primary',
    railingBlock = '$fence',
    supportBlock = '$secondary',
    scale = 1
  } = params;

  const primitives = [];
  const w = Math.round(width * scale);
  const d = Math.round(depth * scale);
  const t = Math.round(thickness * scale);

  // Support columns (if enabled)
  if (supports && supportHeight > 0) {
    const columnPositions = [
      { x: 0, z: 0 },
      { x: w - 1, z: 0 },
      { x: 0, z: d - 1 },
      { x: w - 1, z: d - 1 }
    ];

    for (const col of columnPositions) {
      primitives.push({
        id: randomUUID(),
        type: 'line',
        from: {
          x: position.x + col.x,
          y: position.y - supportHeight,
          z: position.z + col.z
        },
        to: {
          x: position.x + col.x,
          y: position.y - 1,
          z: position.z + col.z
        },
        block: supportBlock,
        layer: 0
      });
    }
  }

  // Floor
  primitives.push({
    id: randomUUID(),
    type: 'box',
    from: { ...position },
    to: {
      x: position.x + w - 1,
      y: position.y + t - 1,
      z: position.z + d - 1
    },
    block: floorBlock,
    layer: 1
  });

  // Railings
  if (railings) {
    const railY = position.y + t;

    // North edge
    primitives.push({
      id: randomUUID(),
      type: 'line',
      from: { x: position.x, y: railY, z: position.z + d - 1 },
      to: { x: position.x + w - 1, y: railY, z: position.z + d - 1 },
      block: railingBlock,
      layer: 2
    });

    // South edge
    primitives.push({
      id: randomUUID(),
      type: 'line',
      from: { x: position.x, y: railY, z: position.z },
      to: { x: position.x + w - 1, y: railY, z: position.z },
      block: railingBlock,
      layer: 2
    });

    // East edge
    primitives.push({
      id: randomUUID(),
      type: 'line',
      from: { x: position.x + w - 1, y: railY, z: position.z },
      to: { x: position.x + w - 1, y: railY, z: position.z + d - 1 },
      block: railingBlock,
      layer: 2
    });

    // West edge
    primitives.push({
      id: randomUUID(),
      type: 'line',
      from: { x: position.x, y: railY, z: position.z },
      to: { x: position.x, y: railY, z: position.z + d - 1 },
      block: railingBlock,
      layer: 2
    });
  }

  return primitives;
}

export default platform;

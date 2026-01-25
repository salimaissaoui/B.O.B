/**
 * Coordinate Utilities
 * Common coordinate calculations used across operations
 */

/**
 * Calculate normalized bounds from two coordinate points
 * Ensures min <= max for all axes
 *
 * @param {Object} from - Start coordinates {x, y, z}
 * @param {Object} to - End coordinates {x, y, z}
 * @returns {Object} Normalized bounds { minX, maxX, minY, maxY, minZ, maxZ, width, height, depth }
 */
export function calculateBounds(from, to) {
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);
  const minZ = Math.min(from.z, to.z);
  const maxZ = Math.max(from.z, to.z);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const depth = maxZ - minZ + 1;

  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    width,
    height,
    depth
  };
}

/**
 * Calculate center point between two coordinates
 *
 * @param {Object} from - Start coordinates {x, y, z}
 * @param {Object} to - End coordinates {x, y, z}
 * @returns {Object} Center point { x, y, z }
 */
export function calculateCenter(from, to) {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
    z: (from.z + to.z) / 2
  };
}

/**
 * Calculate volume of a region
 *
 * @param {Object} from - Start coordinates {x, y, z}
 * @param {Object} to - End coordinates {x, y, z}
 * @returns {number} Volume in blocks
 */
export function calculateVolume(from, to) {
  const bounds = calculateBounds(from, to);
  return bounds.width * bounds.height * bounds.depth;
}

/**
 * Check if a coordinate is within bounds
 *
 * @param {Object} pos - Position to check {x, y, z}
 * @param {Object} from - Start of region {x, y, z}
 * @param {Object} to - End of region {x, y, z}
 * @returns {boolean} True if pos is within bounds
 */
export function isWithinBounds(pos, from, to) {
  const bounds = calculateBounds(from, to);
  return (
    pos.x >= bounds.minX && pos.x <= bounds.maxX &&
    pos.y >= bounds.minY && pos.y <= bounds.maxY &&
    pos.z >= bounds.minZ && pos.z <= bounds.maxZ
  );
}

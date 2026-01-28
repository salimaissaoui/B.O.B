/**
 * World Validator
 *
 * Pre-build validation for chunk loading and world boundaries.
 * Prevents builds from failing due to unloaded chunks or Y-boundary violations.
 */

// Minecraft 1.20+ world boundaries
const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 320;
const EFFECTIVE_HEIGHT = WORLD_MAX_Y - WORLD_MIN_Y; // 384

/**
 * Validate build area before execution
 * @param {Object} bot - Mineflayer bot instance
 * @param {Object} startPos - Build start position {x, y, z}
 * @param {Object} size - Build dimensions {width, height, depth}
 * @returns {Object} Validation result {valid, warnings, clampedSize, chunksLoaded, chunksNeeded}
 */
export function validateBuildArea(bot, startPos, size) {
  const result = {
    valid: true,
    warnings: [],
    clampedSize: { ...size },
    chunksLoaded: 0,
    chunksNeeded: 0,
    yClampApplied: false
  };

  // 1. Validate Y boundaries
  const yValidation = validateYBoundaries(startPos, size);
  if (yValidation.clamped) {
    result.warnings.push(yValidation.warning);
    result.clampedSize.height = yValidation.clampedHeight;
    result.yClampApplied = true;
  }

  // 2. Check chunk loading status
  if (bot && bot.world) {
    const chunkStatus = checkChunksLoaded(bot, startPos, size);
    result.chunksLoaded = chunkStatus.loaded;
    result.chunksNeeded = chunkStatus.total;

    if (chunkStatus.loaded < chunkStatus.total) {
      result.warnings.push(
        `Only ${chunkStatus.loaded}/${chunkStatus.total} chunks loaded. ` +
        `Some blocks may fail to place. Consider moving closer to build site.`
      );
    }

    // If most chunks are unloaded, mark as invalid
    if (chunkStatus.loaded < chunkStatus.total * 0.5) {
      result.valid = false;
      result.warnings.push(
        'More than 50% of required chunks are unloaded. ' +
        'Please move closer to the build location.'
      );
    }
  }

  // 3. Validate world borders (if applicable)
  const borderValidation = validateWorldBorder(bot, startPos, size);
  if (!borderValidation.valid) {
    result.valid = false;
    result.warnings.push(borderValidation.warning);
  }

  return result;
}

/**
 * Validate and clamp Y boundaries
 * @param {Object} startPos - Build start position
 * @param {Object} size - Build dimensions
 * @returns {Object} {clamped, warning, clampedHeight}
 */
export function validateYBoundaries(startPos, size) {
  const buildMinY = startPos.y;
  const buildMaxY = startPos.y + size.height - 1;

  let clamped = false;
  let warning = '';
  let clampedHeight = size.height;

  // Check lower boundary
  if (buildMinY < WORLD_MIN_Y) {
    clamped = true;
    warning = `Build extends below world minimum (Y=${WORLD_MIN_Y}). Bottom will be clipped.`;
    // Adjust height to fit within boundaries
    const overflow = WORLD_MIN_Y - buildMinY;
    clampedHeight = size.height - overflow;
  }

  // Check upper boundary
  if (buildMaxY > WORLD_MAX_Y) {
    clamped = true;
    const overflow = buildMaxY - WORLD_MAX_Y;
    clampedHeight = size.height - overflow;
    warning = `Build extends above world maximum (Y=${WORLD_MAX_Y}). Top will be clipped.`;
  }

  return { clamped, warning, clampedHeight };
}

/**
 * Check if all required chunks are loaded
 * @param {Object} bot - Mineflayer bot instance
 * @param {Object} startPos - Build start position
 * @param {Object} size - Build dimensions
 * @returns {Object} {loaded, total, unloadedChunks}
 */
export function checkChunksLoaded(bot, startPos, size) {
  const chunksNeeded = new Set();
  const unloadedChunks = [];

  // Calculate all chunk coordinates covered by the build
  const minChunkX = Math.floor(startPos.x / 16);
  const maxChunkX = Math.floor((startPos.x + size.width - 1) / 16);
  const minChunkZ = Math.floor(startPos.z / 16);
  const maxChunkZ = Math.floor((startPos.z + size.depth - 1) / 16);

  for (let cx = minChunkX; cx <= maxChunkX; cx++) {
    for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
      const chunkKey = `${cx},${cz}`;
      chunksNeeded.add(chunkKey);

      if (!isChunkLoaded(bot, cx * 16, cz * 16)) {
        unloadedChunks.push({ x: cx, z: cz });
      }
    }
  }

  return {
    loaded: chunksNeeded.size - unloadedChunks.length,
    total: chunksNeeded.size,
    unloadedChunks
  };
}

/**
 * Check if a specific chunk is loaded
 * @param {Object} bot - Mineflayer bot instance
 * @param {number} worldX - World X coordinate (not chunk coordinate)
 * @param {number} worldZ - World Z coordinate (not chunk coordinate)
 * @returns {boolean} True if chunk is loaded
 */
export function isChunkLoaded(bot, worldX, worldZ) {
  if (!bot || !bot.world) {
    return false;
  }

  try {
    const chunkX = Math.floor(worldX / 16);
    const chunkZ = Math.floor(worldZ / 16);

    // Try to get the chunk column
    const column = bot.world.getColumn(chunkX, chunkZ);
    return column !== null && column !== undefined;
  } catch (error) {
    return false;
  }
}

/**
 * Validate against world border (if set on server)
 * @param {Object} bot - Mineflayer bot instance
 * @param {Object} startPos - Build start position
 * @param {Object} size - Build dimensions
 * @returns {Object} {valid, warning}
 */
export function validateWorldBorder(bot, startPos, size) {
  // Default world border (vanilla default is 60M, but servers often set smaller)
  const DEFAULT_BORDER = 30000000;

  // Calculate build extents
  const maxX = Math.abs(startPos.x + size.width);
  const maxZ = Math.abs(startPos.z + size.depth);

  if (maxX > DEFAULT_BORDER || maxZ > DEFAULT_BORDER) {
    return {
      valid: false,
      warning: `Build may exceed world border (max: ${DEFAULT_BORDER})`
    };
  }

  return { valid: true, warning: '' };
}

/**
 * Clamp a world position to valid Y boundaries
 * @param {Object} pos - Position {x, y, z}
 * @returns {Object} Clamped position
 */
export function clampToWorldBoundaries(pos) {
  return {
    x: pos.x,
    y: Math.max(WORLD_MIN_Y, Math.min(WORLD_MAX_Y, pos.y)),
    z: pos.z
  };
}

/**
 * Safe block access that handles unloaded chunks
 * @param {Object} bot - Mineflayer bot instance
 * @param {Object} pos - Position {x, y, z}
 * @returns {Object|null} Block at position or null if unloaded
 */
export function safeBlockAt(bot, pos) {
  if (!bot || !bot.blockAt) {
    return null;
  }

  try {
    // Check Y boundaries
    if (pos.y < WORLD_MIN_Y || pos.y > WORLD_MAX_Y) {
      return null;
    }

    // Check if chunk is loaded (only if bot.world is available)
    if (bot.world && typeof bot.world.getColumn === 'function') {
      if (!isChunkLoaded(bot, pos.x, pos.z)) {
        return null; // Chunk genuinely unloaded
      }
    }

    // Fall back to direct blockAt (works for mocks and simple bots)
    return bot.blockAt(pos);
  } catch (error) {
    // blockAt can throw if chunk is unloaded
    return null;
  }
}

/**
 * Wait for chunks to load around a position
 * @param {Object} bot - Mineflayer bot instance
 * @param {Object} centerPos - Center position
 * @param {number} radius - Chunk radius to wait for
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<boolean>} True if chunks loaded, false if timeout
 */
export async function waitForChunksLoaded(bot, centerPos, radius = 2, timeoutMs = 10000) {
  const startTime = Date.now();
  const centerChunkX = Math.floor(centerPos.x / 16);
  const centerChunkZ = Math.floor(centerPos.z / 16);

  while (Date.now() - startTime < timeoutMs) {
    let allLoaded = true;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;

        if (!isChunkLoaded(bot, chunkX * 16, chunkZ * 16)) {
          allLoaded = false;
          break;
        }
      }
      if (!allLoaded) break;
    }

    if (allLoaded) {
      return true;
    }

    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

// Export constants for use elsewhere
export const WORLD_BOUNDARIES = {
  MIN_Y: WORLD_MIN_Y,
  MAX_Y: WORLD_MAX_Y,
  EFFECTIVE_HEIGHT
};

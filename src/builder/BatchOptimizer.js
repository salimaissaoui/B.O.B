import { optimizeBlockGroups } from '../stages/optimization/batching.js';
import { calculateDistance } from '../utils/pathfinding-helper.js';
import { WORLD_BOUNDARIES } from '../validation/world-validator.js';

/**
 * BatchOptimizer
 *
 * Handles build optimization:
 * - Build order optimization (Y-level, distance, block type sorting)
 * - Block-to-WorldEdit batching (delegates to RLE and 2D rectangle optimizers)
 * - Volume calculation
 */
export class BatchOptimizer {
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * Optimize build order for efficient placement
   * Sorts blocks by: 1) Y-level (bottom to top), 2) Distance from bot, 3) Block type
   */
  optimizeBuildOrder(blocks, startPos) {
    if (!blocks || blocks.length === 0) {
      return blocks;
    }

    const botPos = this.bot?.entity?.position || startPos;

    return blocks.sort((a, b) => {
      const posA = a.pos || a;
      const posB = b.pos || b;

      if (posA.y !== posB.y) {
        return posA.y - posB.y;
      }

      const worldPosA = this.calculateWorldPosition(posA, startPos);
      const worldPosB = this.calculateWorldPosition(posB, startPos);

      const distA = calculateDistance(botPos, worldPosA);
      const distB = calculateDistance(botPos, worldPosB);

      if (Math.abs(distA - distB) > 0.1) {
        return distA - distB;
      }

      const blockA = a.block || '';
      const blockB = b.block || '';
      return blockA.localeCompare(blockB);
    });
  }

  /**
   * Batch blocks into WorldEdit operations using RLE optimizer
   */
  batchBlocksToWorldEdit(blocks, startPos) {
    return optimizeBlockGroups(blocks, 10);
  }

  /**
   * Calculate world position from relative position with Y clamping
   */
  calculateWorldPosition(relativePos, startPos) {
    const worldY = Math.floor(startPos.y + relativePos.y);
    return {
      x: Math.floor(startPos.x + relativePos.x),
      y: Math.max(WORLD_BOUNDARIES.MIN_Y, Math.min(WORLD_BOUNDARIES.MAX_Y, worldY)),
      z: Math.floor(startPos.z + relativePos.z)
    };
  }

  /**
   * Calculate volume of a region
   */
  calculateVolume(from, to) {
    const dx = Math.abs(to.x - from.x) + 1;
    const dy = Math.abs(to.y - from.y) + 1;
    const dz = Math.abs(to.z - from.z) + 1;
    return dx * dy * dz;
  }
}

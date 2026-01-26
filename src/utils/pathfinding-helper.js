/**
 * Pathfinding Helper
 * Handles bot movement and pathfinding for build operations
 */

import { Vec3 } from 'vec3';

export class PathfindingHelper {
  constructor(bot) {
    this.bot = bot;
    this.pathfinder = null;

    // Check if pathfinder plugin is available
    if (bot && bot.pathfinder) {
      this.pathfinder = bot.pathfinder;
    }
  }

  /**
   * Check if pathfinding is available
   * @returns {boolean} - True if pathfinder is available
   */
  isAvailable() {
    return this.pathfinder !== null && this.bot && this.bot.entity;
  }

  /**
   * Ensure bot is in range of a position
   * @param {Object} position - Target position {x, y, z}
   * @param {number} maxDistance - Maximum acceptable distance (default: 4.5)
   * @returns {Promise<boolean>} - True if bot is in range or successfully moved
   */
  async ensureInRange(position, maxDistance = 4.5) {
    if (!this.isAvailable()) {
      // Pathfinding not available, assume in range
      return true;
    }

    try {
      const botPos = this.bot.entity.position;
      const targetVec = new Vec3(position.x, position.y, position.z);
      const distance = botPos.distanceTo(targetVec);

      // Already in range
      if (distance <= maxDistance) {
        return true;
      }

      // Too far, attempt to move closer
      console.log(`  → Moving to position (${distance.toFixed(1)} blocks away)...`);

      // Use pathfinder to move to position
      const goal = new this.pathfinder.goals.GoalNear(
        position.x,
        position.y,
        position.z,
        maxDistance
      );

      await this.bot.pathfinder.goto(goal);

      // Verify we're now in range
      const newDistance = this.bot.entity.position.distanceTo(targetVec);
      const success = newDistance <= maxDistance;

      if (success) {
        console.log(`  → Reached position (${newDistance.toFixed(1)} blocks away)`);
      } else {
        console.warn(`  → Could not reach position (${newDistance.toFixed(1)} blocks away)`);
      }

      return success;

    } catch (error) {
      console.warn(`  → Pathfinding failed: ${error.message}`);

      // Attempt to teleport if pathfinding fails
      if (this.bot && typeof this.bot.chat === 'function') {
        console.log(`  → Attempting teleport...`);
        this.bot.chat(`/tp @s ${position.x} ${position.y} ${position.z}`);

        // Wait for teleport to complete
        await this.sleep(500);

        // Check if teleport succeeded
        const newDistance = this.bot.entity.position.distanceTo(
          new Vec3(position.x, position.y, position.z)
        );

        return newDistance <= maxDistance + 2; // Allow some tolerance for teleport
      }

      return false;
    }
  }

  /**
   * Move bot to a specific position
   * @param {Object} position - Target position {x, y, z}
   * @param {number} range - Acceptable distance from target (default: 1)
   * @returns {Promise<boolean>} - True if movement succeeded
   */
  async moveTo(position, range = 1) {
    return this.ensureInRange(position, range);
  }

  /**
   * Check if bot can reach a position
   * @param {Object} position - Target position {x, y, z}
   * @returns {Promise<boolean>} - True if position is reachable
   */
  async canReach(position) {
    if (!this.isAvailable()) {
      return true; // Assume reachable if pathfinding unavailable
    }

    try {
      const goal = new this.pathfinder.goals.GoalBlock(
        position.x,
        position.y,
        position.z
      );

      // Check if path exists without actually moving
      const path = await this.bot.pathfinder.getPathTo(
        this.pathfinder.movements,
        goal,
        1000 // Timeout in ms
      );

      return path && path.status === 'success';

    } catch (error) {
      // If pathfinding check fails, assume unreachable
      return false;
    }
  }

  /**
   * Stop current pathfinding movement
   */
  stop() {
    if (this.isAvailable() && this.pathfinder.isMoving) {
      this.pathfinder.stop();
    }
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Calculate Euclidean distance between two positions
 * @param {Object} posA - First position {x, y, z}
 * @param {Object} posB - Second position {x, y, z}
 * @returns {number} - Distance in blocks
 */
export function calculateDistance(posA, posB) {
  if (!posA || !posB) {
    return Infinity;
  }

  const dx = (posA.x || 0) - (posB.x || 0);
  const dy = (posA.y || 0) - (posB.y || 0);
  const dz = (posA.z || 0) - (posB.z || 0);

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Pathfinding Helper - Assists bot movement and range checking
 * 
 * Helps ensure the bot can reach build locations and optimizes movement.
 */

export class PathfindingHelper {
  constructor(bot) {
    this.bot = bot;
    this.pathfinder = null;

    // Check if mineflayer-pathfinder is available
    try {
      if (bot && bot.pathfinder) {
        this.pathfinder = bot.pathfinder;
      }
    } catch (error) {
      console.warn('Pathfinder plugin not available');
    }
  }

  /**
   * Check if pathfinding is available
   * @returns {boolean} True if pathfinder is loaded
   */
  isAvailable() {
    return this.pathfinder !== null && this.bot && this.bot.entity;
  }

  /**
   * Ensure bot is in range of target position
   * @param {Object} position - Target position {x, y, z}
   * @param {number} range - Required range (default: 4.5 blocks)
   * @returns {Promise<boolean>} True if bot reached position or is already in range
   */
  async ensureInRange(position, range = 4.5) {
    if (!this.isAvailable()) {
      return false;
    }

    const botPos = this.bot.entity.position;
    const distance = calculateDistance(botPos, position);

    // Already in range
    if (distance <= range) {
      return true;
    }

    // Try to move closer
    try {
      const goal = new this.pathfinder.goals.GoalNear(
        position.x,
        position.y,
        position.z,
        range
      );

      await this.pathfinder.goto(goal);
      return true;
    } catch (error) {
      console.warn(`Pathfinding failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Move to exact position
   * @param {Object} position - Target position {x, y, z}
   * @returns {Promise<boolean>} True if reached position
   */
  async moveTo(position) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const goal = new this.pathfinder.goals.GoalBlock(
        position.x,
        position.y,
        position.z
      );

      await this.pathfinder.goto(goal);
      return true;
    } catch (error) {
      console.warn(`Movement failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop current pathfinding
   */
  stop() {
    if (this.pathfinder) {
      this.pathfinder.stop();
    }
  }
}

/**
 * Calculate 3D distance between two positions
 * @param {Object} posA - First position {x, y, z}
 * @param {Object} posB - Second position {x, y, z}
 * @returns {number} Distance in blocks
 */
export function calculateDistance(posA, posB) {
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  const dz = posA.z - posB.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate 2D distance (ignoring Y axis)
 * @param {Object} posA - First position {x, y, z}
 * @param {Object} posB - Second position {x, y, z}
 * @returns {number} Distance in blocks
 */
export function calculateDistance2D(posA, posB) {
  const dx = posA.x - posB.x;
  const dz = posA.z - posB.z;
  return Math.sqrt(dx * dx + dz * dz);
}

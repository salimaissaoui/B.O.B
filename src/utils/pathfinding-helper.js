import pathfinderPkg from 'mineflayer-pathfinder';
const { goals } = pathfinderPkg;

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
    return this.pathfinder !== null;
  }

  async ensureInRange(position, range = 4.5) {
    if (!this.isAvailable()) {
      return false;
    }

    const botPos = this.bot.entity.position;

    // Already in range
    if (this.isInRange(position, range)) {
      return true;
    }

    // Try to move closer
    try {
      const goal = new goals.GoalNear(
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
   * Check if bot is in range of target
   * @param {Object} targetPos - Target position {x, y, z}
   * @param {number} range - Range in blocks (default: 4.5)
   * @returns {boolean} True if in range
   */
  isInRange(targetPos, range = 4.5) {
    if (!this.bot || !this.bot.entity) {
      return false;
    }
    return isInRange(this.bot.entity.position, targetPos, range);
  }

  /**
   * Get distance to target
   * @param {Object} targetPos - Target position {x, y, z}
   * @returns {number} Distance in blocks
   */
  getDistanceToTarget(targetPos) {
    if (!this.bot || !this.bot.entity) {
      return Infinity;
    }
    return calculateDistance(this.bot.entity.position, targetPos);
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
 * Check if position is within range
 * @param {Object} botPos - Bot position {x, y, z}
 * @param {Object} targetPos - Target position {x, y, z}
 * @param {number} range - Range in blocks (default: 4.5)
 * @returns {boolean} True if within range
 */
export function isInRange(botPos, targetPos, range = 4.5) {
  if (!botPos || !targetPos) return false;
  return calculateDistance(botPos, targetPos) <= range;
}

/**
 * Calculate approach position towards target
 * @param {Object} targetPos - Target position {x, y, z}
 * @param {Object} currentPos - Current position {x, y, z}
 * @param {number} range - Desired range from target (default: 4)
 * @returns {Object} Approach position {x, y, z}
 */
export function calculateApproachPosition(targetPos, currentPos, range = 4) {
  const distance = calculateDistance(targetPos, currentPos);

  // Already in range or at target
  if (distance <= range) {
    return currentPos;
  }

  // Calculate unit direction vector
  const direction = {
    x: (currentPos.x - targetPos.x) / distance,
    y: (currentPos.y - targetPos.y) / distance,
    z: (currentPos.z - targetPos.z) / distance
  };

  // Calculate position at 'range' distance from target
  return {
    x: Math.floor(targetPos.x + direction.x * range),
    y: Math.floor(targetPos.y + direction.y * range),
    z: Math.floor(targetPos.z + direction.z * range)
  };
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

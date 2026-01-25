/**
 * Pathfinding Helper
 * Handles bot positioning and movement for block placement
 */

import { goals } from 'mineflayer-pathfinder';

const PLACEMENT_RANGE = 4; // Standard block placement range in Minecraft

/**
 * Calculate distance between two positions
 * @param {Object} pos1 - First position {x, y, z}
 * @param {Object} pos2 - Second position {x, y, z}
 * @returns {number} Distance
 */
export function calculateDistance(pos1, pos2) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if position is within placement range
 * @param {Object} botPos - Bot position {x, y, z}
 * @param {Object} targetPos - Target position {x, y, z}
 * @param {number} range - Maximum range (default: 4)
 * @returns {boolean} True if in range
 */
export function isInRange(botPos, targetPos, range = PLACEMENT_RANGE) {
  return calculateDistance(botPos, targetPos) <= range;
}

/**
 * Calculate optimal position to approach target
 * @param {Object} targetPos - Target block position {x, y, z}
 * @param {Object} currentPos - Current bot position {x, y, z}
 * @returns {Object} Optimal approach position {x, y, z}
 */
export function calculateApproachPosition(targetPos, currentPos) {
  // Calculate direction vector from target to current
  const dx = currentPos.x - targetPos.x;
  const dy = currentPos.y - targetPos.y;
  const dz = currentPos.z - targetPos.z;
  
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  // If already close, return current position
  if (distance <= PLACEMENT_RANGE) {
    return currentPos;
  }
  
  // Calculate position at PLACEMENT_RANGE distance from target
  const ratio = (PLACEMENT_RANGE - 0.5) / distance; // Slightly inside range for safety
  
  return {
    x: Math.floor(targetPos.x + dx * ratio),
    y: Math.floor(targetPos.y + dy * ratio),
    z: Math.floor(targetPos.z + dz * ratio)
  };
}

/**
 * Move bot to be within range of target position
 * @param {Object} bot - Mineflayer bot instance
 * @param {Object} targetPos - Target position {x, y, z}
 * @param {number} range - Maximum range (default: 4)
 * @returns {Promise<boolean>} True if successfully moved/already in range
 */
export async function ensureInRange(bot, targetPos, range = PLACEMENT_RANGE) {
  if (!bot || !bot.entity || !bot.entity.position) {
    throw new Error('Bot not initialized or missing position');
  }

  const botPos = bot.entity.position;
  
  // Check if already in range
  if (isInRange(botPos, targetPos, range)) {
    return true;
  }

  // Check if pathfinder is available
  if (!bot.pathfinder) {
    console.warn('Pathfinder not loaded - bot cannot move to target');
    return false;
  }

  try {
    // Create goal to get near the target position
    const goal = new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, range - 0.5);
    
    // Set movement goal
    bot.pathfinder.setGoal(goal);
    
    // Wait for bot to reach goal or timeout after 10 seconds
    const timeout = 10000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const currentPos = bot.entity.position;
      if (isInRange(currentPos, targetPos, range)) {
        bot.pathfinder.setGoal(null); // Clear goal
        return true;
      }
      
      // Small delay to avoid busy waiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Timeout - check if close enough
    const finalPos = bot.entity.position;
    const inRange = isInRange(finalPos, targetPos, range);
    
    if (!inRange) {
      console.warn(`Pathfinding timeout - bot at ${finalPos.x.toFixed(1)}, ${finalPos.y.toFixed(1)}, ${finalPos.z.toFixed(1)}, target at ${targetPos.x}, ${targetPos.y}, ${targetPos.z}`);
    }
    
    bot.pathfinder.setGoal(null); // Clear goal
    return inRange;
    
  } catch (error) {
    console.warn(`Pathfinding failed: ${error.message}`);
    bot.pathfinder.setGoal(null); // Clear goal on error
    return false;
  }
}

/**
 * Move bot to optimal build position for a list of blocks
 * @param {Object} bot - Mineflayer bot instance
 * @param {Array} blocks - Array of block positions
 * @returns {Promise<boolean>} True if successfully positioned
 */
export async function moveToOptimalBuildPosition(bot, blocks) {
  if (!blocks || blocks.length === 0) {
    return true;
  }

  if (!bot || !bot.entity || !bot.entity.position) {
    throw new Error('Bot not initialized or missing position');
  }

  // Calculate center point of all blocks
  let sumX = 0, sumY = 0, sumZ = 0;
  for (const block of blocks) {
    sumX += block.x || block.pos?.x || 0;
    sumY += block.y || block.pos?.y || 0;
    sumZ += block.z || block.pos?.z || 0;
  }

  const centerPos = {
    x: Math.floor(sumX / blocks.length),
    y: Math.floor(sumY / blocks.length),
    z: Math.floor(sumZ / blocks.length)
  };

  // Try to move near the center position
  return ensureInRange(bot, centerPos, PLACEMENT_RANGE);
}

/**
 * PathfindingHelper class for managing bot movement
 */
export class PathfindingHelper {
  constructor(bot) {
    this.bot = bot;
    this.placementRange = PLACEMENT_RANGE;
  }

  /**
   * Check if bot is in range of target
   * @param {Object} targetPos - Target position
   * @returns {boolean} True if in range
   */
  isInRange(targetPos) {
    if (!this.bot || !this.bot.entity || !this.bot.entity.position) {
      return false;
    }
    return isInRange(this.bot.entity.position, targetPos, this.placementRange);
  }

  /**
   * Ensure bot is within range of target
   * @param {Object} targetPos - Target position
   * @returns {Promise<boolean>} True if in range
   */
  async ensureInRange(targetPos) {
    return ensureInRange(this.bot, targetPos, this.placementRange);
  }

  /**
   * Move to optimal position for building
   * @param {Array} blocks - List of blocks to build
   * @returns {Promise<boolean>} True if positioned
   */
  async moveToOptimalPosition(blocks) {
    return moveToOptimalBuildPosition(this.bot, blocks);
  }

  /**
   * Calculate distance to target
   * @param {Object} targetPos - Target position
   * @returns {number} Distance
   */
  getDistanceToTarget(targetPos) {
    if (!this.bot || !this.bot.entity || !this.bot.entity.position) {
      return Infinity;
    }
    return calculateDistance(this.bot.entity.position, targetPos);
  }

  /**
   * Check if pathfinder is available
   * @returns {boolean} True if pathfinder is loaded
   */
  isAvailable() {
    return this.bot && this.bot.pathfinder !== undefined;
  }
}

/**
 * Inventory Manager
 * Handles inventory validation and material tracking for builds
 */

export class InventoryManager {
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * Validate if bot has required materials for a blueprint
   * @param {Object} blueprint - Blueprint to validate
   * @returns {Object} - Validation result { valid: boolean, missing: Array }
   */
  validateForBlueprint(blueprint) {
    if (!this.bot || !this.bot.inventory) {
      // If bot doesn't have inventory access, assume valid
      return { valid: true, missing: [] };
    }

    try {
      // Count required blocks from blueprint steps
      const requiredBlocks = this.countRequiredBlocks(blueprint);

      // Get available blocks from bot inventory
      const availableBlocks = this.countAvailableBlocks();

      // Check for missing materials
      const missing = [];

      for (const [blockType, requiredCount] of Object.entries(requiredBlocks)) {
        const availableCount = availableBlocks[blockType] || 0;

        if (availableCount < requiredCount) {
          missing.push({
            block: blockType,
            required: requiredCount,
            available: availableCount,
            shortage: requiredCount - availableCount
          });
        }
      }

      return {
        valid: missing.length === 0,
        missing,
        required: requiredBlocks,
        available: availableBlocks
      };

    } catch (error) {
      console.warn(`Inventory validation error: ${error.message}`);
      // On error, return valid to allow build to proceed
      return { valid: true, missing: [], error: error.message };
    }
  }

  /**
   * Count required blocks from blueprint
   * @param {Object} blueprint - Blueprint to analyze
   * @returns {Object} - Block counts { blockType: count }
   */
  countRequiredBlocks(blueprint) {
    const blockCounts = {};

    if (!blueprint.steps || !Array.isArray(blueprint.steps)) {
      return blockCounts;
    }

    for (const step of blueprint.steps) {
      // Handle different operation types
      if (step.block) {
        const blockType = this.resolveBlockName(step.block, blueprint.palette);
        if (blockType !== 'air') {
          blockCounts[blockType] = (blockCounts[blockType] || 0) + (step.count || 1);
        }
      }

      // For operations that generate blocks
      if (step.blocks && Array.isArray(step.blocks)) {
        for (const block of step.blocks) {
          const blockType = this.resolveBlockName(block.block || block, blueprint.palette);
          if (blockType !== 'air') {
            blockCounts[blockType] = (blockCounts[blockType] || 0) + 1;
          }
        }
      }

      // Estimate blocks for volume operations
      if (step.estimatedBlocks && step.estimatedBlocks > 0) {
        const blockType = this.resolveBlockName(step.block, blueprint.palette);
        if (blockType !== 'air') {
          blockCounts[blockType] = (blockCounts[blockType] || 0) + step.estimatedBlocks;
        }
      }
    }

    return blockCounts;
  }

  /**
   * Resolve block name from palette if needed
   * @param {string} blockName - Block name or palette reference
   * @param {Object} palette - Blueprint palette
   * @returns {string} - Resolved block name
   */
  resolveBlockName(blockName, palette) {
    if (!blockName) return 'air';

    // Check if it's a palette reference (starts with $)
    if (blockName.startsWith('$') && palette) {
      const key = blockName.substring(1);
      return palette[key] || 'stone';
    }

    return blockName;
  }

  /**
   * Count available blocks in bot inventory
   * @returns {Object} - Block counts { blockType: count }
   */
  countAvailableBlocks() {
    const blockCounts = {};

    if (!this.bot || !this.bot.inventory || typeof this.bot.inventory.items !== 'function') {
      return blockCounts;
    }

    try {
      const items = this.bot.inventory.items();

      for (const item of items) {
        if (item && item.name) {
          blockCounts[item.name] = (blockCounts[item.name] || 0) + item.count;
        }
      }
    } catch (error) {
      console.warn(`Error reading inventory: ${error.message}`);
    }

    return blockCounts;
  }

  /**
   * Check if bot has enough of a specific block type
   * @param {string} blockType - Block type to check
   * @param {number} count - Required count
   * @returns {boolean} - True if enough blocks available
   */
  hasEnough(blockType, count) {
    const available = this.countAvailableBlocks();
    return (available[blockType] || 0) >= count;
  }
}

/**
 * Format validation result for display
 * @param {Object} validation - Validation result from InventoryManager
 * @returns {string} - Formatted message
 */
export function formatValidationResult(validation) {
  if (validation.error) {
    return `⚠ Inventory check failed: ${validation.error}`;
  }

  if (validation.valid) {
    return '✓ All required materials available';
  }

  let message = '⚠ Missing materials:\n';

  for (const item of validation.missing) {
    message += `  - ${item.block}: need ${item.required}, have ${item.available} (short ${item.shortage})\n`;
  }

  return message.trim();
}

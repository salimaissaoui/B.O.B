/**
 * Inventory Manager - Tracks and validates material availability
 * 
 * Helps ensure the bot has required materials before starting a build.
 * In Creative mode, this always returns valid=true.
 * In Survival mode, checks actual inventory against blueprint requirements.
 */

export class InventoryManager {
  constructor(bot) {
    this.bot = bot;
    this.isCreativeMode = true; // Assume creative by default
  }

  /**
   * Validate that bot has materials needed for blueprint
   * @param {Object} blueprint - Blueprint to validate
   * @returns {Object} { valid: boolean, missing: Array, available: Object }
   */
  validateForBlueprint(blueprint) {
    // In creative mode, always valid
    if (this.isCreativeMode) {
      return {
        valid: true,
        missing: [],
        available: {},
        mode: 'creative'
      };
    }

    // Extract required materials from blueprint
    const required = this.extractRequiredMaterials(blueprint);
    const available = this.getAvailableMaterials();
    const missing = [];

    for (const [block, count] of Object.entries(required)) {
      const availableCount = available[block] || 0;
      if (availableCount < count) {
        missing.push({
          block,
          needed: count,
          available: availableCount,
          shortage: count - availableCount
        });
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      available,
      required,
      mode: 'survival'
    };
  }

  /**
   * Extract required materials from blueprint
   * @param {Object} blueprint - Blueprint object
   * @returns {Object} Material counts { blockName: count }
   */
  extractRequiredMaterials(blueprint) {
    const materials = {};

    // Count palette materials
    if (blueprint.palette) {
      const paletteBlocks = Array.isArray(blueprint.palette)
        ? blueprint.palette
        : Object.values(blueprint.palette);

      for (const block of paletteBlocks) {
        materials[block] = (materials[block] || 0) + 1;
      }
    }

    // Estimate from steps (rough approximation)
    for (const step of blueprint.steps || []) {
      if (step.block) {
        // Estimate block count based on operation type
        const estimatedCount = this.estimateBlockCount(step);
        materials[step.block] = (materials[step.block] || 0) + estimatedCount;
      }
    }

    return materials;
  }

  /**
   * Estimate block count for a step
   * @param {Object} step - Build step
   * @returns {number} Estimated block count
   */
  estimateBlockCount(step) {
    // Simple estimation based on operation type
    if (step.size) {
      const { x = 1, y = 1, z = 1 } = step.size;
      return x * y * z;
    }

    if (step.from && step.to) {
      const dx = Math.abs(step.to.x - step.from.x) + 1;
      const dy = Math.abs(step.to.y - step.from.y) + 1;
      const dz = Math.abs(step.to.z - step.from.z) + 1;
      return dx * dy * dz;
    }

    // Default estimate
    return 10;
  }

  /**
   * Get available materials from bot inventory
   * @returns {Object} Available materials { blockName: count }
   */
  getAvailableMaterials() {
    if (!this.bot || !this.bot.inventory) {
      return {};
    }

    const materials = {};
    const items = this.bot.inventory.items();

    for (const item of items) {
      if (item && item.name) {
        materials[item.name] = (materials[item.name] || 0) + item.count;
      }
    }

    return materials;
  }

  /**
   * Check if bot is in creative mode
   * @returns {boolean} True if creative mode
   */
  checkCreativeMode() {
    // Check if bot has creative mode indicators
    if (this.bot && this.bot.game) {
      this.isCreativeMode = this.bot.game.gameMode === 'creative' || this.bot.game.gameMode === 1;
    }
    return this.isCreativeMode;
  }
}

/**
 * Format validation result for display
 * @param {Object} result - Validation result
 * @returns {string} Formatted string
 */
export function formatValidationResult(result) {
  if (result.mode === 'creative') {
    return '✓ Creative mode - unlimited materials';
  }

  if (result.valid) {
    return `✓ All required materials available (${Object.keys(result.required).length} types)`;
  }

  let output = '⚠ Missing materials:\n';
  for (const item of result.missing) {
    output += `  - ${item.block}: need ${item.needed}, have ${item.available} (short ${item.shortage})\n`;
  }
  return output;
}

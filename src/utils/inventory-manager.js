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
      const {
        x,
        y,
        z,
        width,
        height,
        depth
      } = step.size;
      const sizeX = x ?? width ?? 1;
      const sizeY = y ?? height ?? 1;
      const sizeZ = z ?? depth ?? 1;
      return sizeX * sizeY * sizeZ;
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

  /**
   * Get count of a specific item in inventory
   * @param {string} itemName - Name of item
   * @returns {number} Item count
   */
  getItemCount(itemName) {
    const materials = this.getAvailableMaterials();
    return materials[itemName] || 0;
  }

  /**
   * Check if bot has at least a certain amount of an item
   * @param {string} itemName - Name of item
   * @param {number} count - Required count
   * @returns {boolean} True if bot has enough
   */
  hasItem(itemName, count = 1) {
    return this.getItemCount(itemName) >= count;
  }
}

/**
 * Calculate material requirements from blueprint
 * @param {Object} blueprint - Blueprint object
 * @returns {Map<string, number>} Material requirements { blockName: count }
 */
export function calculateMaterialRequirements(blueprint) {
  const requirements = new Map();
  if (!blueprint || !blueprint.steps) return requirements;

  const resolveBlock = (blockName) => {
    if (!blockName) return 'air';
    if (blockName.startsWith('$')) {
      const key = blockName.substring(1);
      if (blueprint.palette && blueprint.palette[key]) {
        return blueprint.palette[key];
      }
      return 'stone'; // Default fallback
    }
    return blockName;
  };

  for (const step of blueprint.steps) {
    if (step.block) {
      const block = resolveBlock(step.block);
      if (block === 'air') continue;

      let count = 1;
      if (step.size) {
        const {
          x,
          y,
          z,
          width,
          height,
          depth
        } = step.size;
        const sizeX = x ?? width ?? 1;
        const sizeY = y ?? height ?? 1;
        const sizeZ = z ?? depth ?? 1;
        count = sizeX * sizeY * sizeZ;
      } else if (step.from && step.to) {
        count = (Math.abs(step.to.x - step.from.x) + 1) *
          (Math.abs(step.to.y - step.from.y) + 1) *
          (Math.abs(step.to.z - step.from.z) + 1);
      }

      requirements.set(block, (requirements.get(block) || 0) + count);
    }
  }

  return requirements;
}

/**
 * Scan bot inventory and aggregate items
 * @param {Object} bot - Mineflayer bot
 * @returns {Map<string, number>} Map of item name to count
 */
export function scanInventory(bot) {
  const inventory = new Map();
  if (!bot || !bot.inventory) return inventory;

  const items = bot.inventory.items();
  for (const item of items) {
    if (item && item.name) {
      inventory.set(item.name, (inventory.get(item.name) || 0) + item.count);
    }
  }
  return inventory;
}

/**
 * Validate that bot has materials needed for blueprint
 * @param {Object} bot - Mineflayer bot
 * @param {Object} blueprint - Blueprint to validate
 * @returns {Object} Validation result
 */
export function validateMaterials(bot, blueprint) {
  const requirements = calculateMaterialRequirements(blueprint);
  const inventory = scanInventory(bot);
  const hasInventory = bot && bot.inventory !== undefined;

  const missing = new Map();
  let totalRequired = 0;
  let missingBlockTypes = 0;

  if (!hasInventory) {
    return {
      valid: true,
      hasInventory: false,
      requirements,
      inventory,
      missing,
      summary: {
        totalRequired: 0,
        uniqueBlockTypes: requirements.size,
        missingBlockTypes: 0
      }
    };
  }

  for (const [block, needed] of requirements.entries()) {
    totalRequired += needed;
    const available = inventory.get(block) || 0;
    if (available < needed) {
      missing.set(block, needed - available);
      missingBlockTypes++;
    }
  }

  return {
    valid: missing.size === 0,
    hasInventory,
    requirements,
    inventory,
    missing,
    summary: {
      totalRequired,
      uniqueBlockTypes: requirements.size,
      missingBlockTypes
    }
  };
}

/**
 * Format material list for display
 * @param {Map<string, number>} requirements - Map of materials
 * @returns {string} Formatted string
 */
export function formatMaterialList(requirements) {
  if (!requirements || requirements.size === 0) {
    return 'No materials required';
  }

  const lines = [];
  for (const [block, count] of requirements.entries()) {
    lines.push(`${block}: ${count}`);
  }
  return lines.join('\n');
}

/**
 * Format validation result for display (Legacy support for Builder)
 * @param {Object} result - Validation result
 * @returns {string} Formatted string
 */
export function formatValidationResult(result) {
  if (result.mode === 'creative') {
    return '✓ Creative mode - unlimited materials';
  }

  if (result.valid) {
    return `✓ All required materials available (${result.summary?.uniqueBlockTypes || 0} types)`;
  }

  let output = '⚠ Missing materials:\n';
  if (result.missing instanceof Map) {
    for (const [block, shortage] of result.missing.entries()) {
      output += `  - ${block}: short ${shortage}\n`;
    }
  } else if (Array.isArray(result.missing)) {
    for (const item of result.missing) {
      output += `  - ${item.block}: need ${item.needed}, have ${item.available} (short ${item.shortage})\n`;
    }
  }
  return output;
}

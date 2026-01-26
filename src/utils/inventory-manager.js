/**
 * Inventory Management System
 * Handles material validation and inventory tracking for builds
 */

/**
 * Scan bot inventory and count items
 * @param {Object} bot - Mineflayer bot instance
 * @returns {Map} Map of item name to count
 */
export function scanInventory(bot) {
  const inventory = new Map();
  
  if (!bot || !bot.inventory || !bot.inventory.items) {
    return inventory;
  }

  for (const item of bot.inventory.items()) {
    const itemName = item.name;
    const currentCount = inventory.get(itemName) || 0;
    inventory.set(itemName, currentCount + item.count);
  }

  return inventory;
}

/**
 * Calculate required materials from a blueprint
 * @param {Object} blueprint - Validated blueprint
 * @returns {Map} Map of block type to required count
 */
export function calculateMaterialRequirements(blueprint) {
  const requirements = new Map();

  if (!blueprint || !blueprint.steps) {
    return requirements;
  }

  // Helper to resolve palette variables
  const resolveBlock = (blockName) => {
    if (!blockName) return 'air';
    if (blockName.startsWith('$')) {
      const key = blockName.substring(1);
      if (blueprint.palette && blueprint.palette[key]) {
        return blueprint.palette[key];
      }
      // Fallback if palette key missing - log warning and use stone as safe default
      console.warn(`Missing palette variable: ${key}, using 'stone' as fallback`);
      return 'stone';
    }
    return blockName;
  };

  // Count blocks from steps
  for (const step of blueprint.steps) {
    // Skip non-placement operations
    if (['move', 'cursor_reset', 'site_prep', 'clear_area'].includes(step.op)) {
      continue;
    }

    // Handle direct block placement
    if (step.block && !step.size) {
      const blockType = resolveBlock(step.block);
      if (blockType !== 'air') {
        const current = requirements.get(blockType) || 0;
        requirements.set(blockType, current + 1);
      }
    }

    // Handle volume-based operations
    if (step.size) {
      const volume = (step.size.width || 1) * (step.size.height || 1) * (step.size.depth || 1);
      const blockType = resolveBlock(step.block || step.material);
      if (blockType !== 'air') {
        const current = requirements.get(blockType) || 0;
        requirements.set(blockType, current + volume);
      }
    }

    // Handle blocks array (for operations that specify multiple blocks)
    if (step.blocks && Array.isArray(step.blocks)) {
      for (const blockSpec of step.blocks) {
        const blockType = resolveBlock(blockSpec.block || blockSpec);
        if (blockType !== 'air') {
          const current = requirements.get(blockType) || 0;
          requirements.set(blockType, current + 1);
        }
      }
    }
  }

  return requirements;
}

/**
 * Check if required materials are available for a blueprint
 * @param {Object} bot - Mineflayer bot instance
 * @param {Object} blueprint - Validated blueprint
 * @returns {Object} Validation result with detailed info
 */
export function validateMaterials(bot, blueprint) {
  const inventory = scanInventory(bot);
  const requirements = calculateMaterialRequirements(blueprint);
  
  const missing = new Map();
  const available = new Map();
  
  // If bot has no inventory system (e.g., in tests or when using WorldEdit exclusively),
  // assume all materials are available
  const hasInventory = !!(bot && bot.inventory && typeof bot.inventory.items === 'function');
  
  for (const [blockType, required] of requirements) {
    const inInventory = inventory.get(blockType) || 0;
    available.set(blockType, inInventory);
    
    // Only check for missing materials if bot has inventory system
    if (hasInventory && inInventory < required) {
      missing.set(blockType, required - inInventory);
    }
  }

  const hasMissingMaterials = missing.size > 0;

  return {
    valid: !hasMissingMaterials,
    requirements,
    available,
    missing,
    hasInventory,
    summary: {
      totalRequired: Array.from(requirements.values()).reduce((sum, count) => sum + count, 0),
      totalAvailable: Array.from(available.values()).reduce((sum, count) => sum + count, 0),
      uniqueBlockTypes: requirements.size,
      missingBlockTypes: missing.size
    }
  };
}

/**
 * Format material requirements for display
 * @param {Map} requirements - Material requirements map
 * @returns {string} Formatted string
 */
export function formatMaterialList(requirements) {
  if (requirements.size === 0) {
    return 'No materials required';
  }

  const lines = [];
  for (const [blockType, count] of requirements) {
    lines.push(`  - ${blockType}: ${count}`);
  }
  return lines.join('\n');
}

/**
 * Format validation result for display
 * @param {Object} validation - Validation result from validateMaterials()
 * @returns {string} Formatted string
 */
export function formatValidationResult(validation) {
  const lines = [
    '┌─────────────────────────────────────────────────────────',
    '│ MATERIAL VALIDATION'
  ];

  if (validation.valid) {
    lines.push('├─────────────────────────────────────────────────────────');
    lines.push('│ Status: ✓ All materials available');
    lines.push(`│ Total blocks: ${validation.summary.totalRequired}`);
    lines.push(`│ Block types: ${validation.summary.uniqueBlockTypes}`);
  } else if (!validation.hasInventory) {
    lines.push('├─────────────────────────────────────────────────────────');
    lines.push('│ Status: ℹ No inventory system (using chat commands)');
    lines.push(`│ Total blocks: ${validation.summary.totalRequired}`);
    lines.push(`│ Block types: ${validation.summary.uniqueBlockTypes}`);
  } else {
    lines.push('├─────────────────────────────────────────────────────────');
    lines.push('│ Status: ⚠ Missing materials');
    lines.push(`│ Missing types: ${validation.summary.missingBlockTypes}`);
    lines.push('│');
    lines.push('│ Missing materials:');
    for (const [blockType, count] of validation.missing) {
      const available = validation.available.get(blockType) || 0;
      const required = validation.requirements.get(blockType) || 0;
      lines.push(`│   ${blockType}: ${available}/${required} (need ${count} more)`);
    }
  }

  lines.push('└─────────────────────────────────────────────────────────');
  return lines.join('\n');
}

/**
 * InventoryManager class for centralized inventory operations
 */
export class InventoryManager {
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * Scan current inventory
   * @returns {Map} Inventory map
   */
  scan() {
    return scanInventory(this.bot);
  }

  /**
   * Check if materials are available for blueprint
   * @param {Object} blueprint - Blueprint to validate
   * @returns {Object} Validation result
   */
  validateForBlueprint(blueprint) {
    return validateMaterials(this.bot, blueprint);
  }

  /**
   * Get count of a specific item
   * @param {string} itemName - Item name
   * @returns {number} Count
   */
  getItemCount(itemName) {
    const inventory = this.scan();
    return inventory.get(itemName) || 0;
  }

  /**
   * Check if bot has at least N of an item
   * @param {string} itemName - Item name
   * @param {number} count - Required count
   * @returns {boolean} True if has enough
   */
  hasItem(itemName, count = 1) {
    return this.getItemCount(itemName) >= count;
  }
}

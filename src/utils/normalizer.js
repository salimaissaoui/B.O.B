/**
 * Blueprint Normalization Layer
 *
 * Handles:
 * - Block name aliases (singular → plural, typos)
 * - Hollow boolean coercion (string → boolean)
 * - Placeholder token detection
 * - Full blueprint normalization with change tracking
 */

import { DEBUG } from './debug.js';

/**
 * Block name aliases - maps common variants to valid Minecraft block names
 */
export const BLOCK_ALIASES = {
  // Leaf variants (singular → plural)
  'oak_leaf': 'oak_leaves',
  'spruce_leaf': 'spruce_leaves',
  'birch_leaf': 'birch_leaves',
  'jungle_leaf': 'jungle_leaves',
  'acacia_leaf': 'acacia_leaves',
  'dark_oak_leaf': 'dark_oak_leaves',
  'cherry_leaf': 'cherry_leaves',
  'mangrove_leaf': 'mangrove_leaves',
  'azalea_leaf': 'azalea_leaves',
  'flowering_azalea_leaf': 'flowering_azalea_leaves',

  // Common typos and shortcuts
  'cobble': 'cobblestone',
  'stone_brick': 'stone_bricks',
  'oakplanks': 'oak_planks',
  'oak_plank': 'oak_planks',
  'spruce_plank': 'spruce_planks',
  'birch_plank': 'birch_planks',
  'jungle_plank': 'jungle_planks',
  'acacia_plank': 'acacia_planks',
  'dark_oak_plank': 'dark_oak_planks',
  'mangrove_plank': 'mangrove_planks',
  'cherry_plank': 'cherry_planks',
  'bamboo_plank': 'bamboo_planks',
  'glass_block': 'glass',

  // Generic mappings (LLM often uses these)
  'grass': 'grass_block',
  'wood': 'oak_log',
  'planks': 'oak_planks',
  'brick': 'bricks',
  'leaves': 'oak_leaves',
  'log': 'oak_log',

  // Wool shortcuts
  'wool': 'white_wool',

  // Concrete shortcuts
  'concrete': 'white_concrete',

  // Glass pane shortcuts
  'glass_panes': 'glass_pane',

  // Nether brick singular
  'nether_brick': 'nether_bricks',
  'red_nether_brick': 'red_nether_bricks',

  // Deepslate variants
  'deepslate_brick': 'deepslate_bricks',
  'deepslate_tile': 'deepslate_tiles',

  // Prismarine
  'prismarine_brick': 'prismarine_bricks',

  // Mud brick
  'mud_brick': 'mud_bricks',

  // Quartz
  'quartz': 'quartz_block',
  'quartz_brick': 'quartz_bricks',

  // End stone
  'end_stone_brick': 'end_stone_bricks',

  // Polished blackstone
  'polished_blackstone_brick': 'polished_blackstone_bricks'
};

/**
 * Placeholder tokens that must be resolved from palette
 * These are used by LLMs as semantic placeholders
 */
export const PLACEHOLDER_TOKENS = [
  '$primary',
  '$secondary',
  '$accent',
  '$roof',
  '$window',
  '$floor',
  '$door',
  '$trim',
  '$base',
  '$detail',
  '$wall',
  '$foundation',
  '$frame',
  '$support',
  '$decoration'
];

/**
 * Normalize a block name
 * - Removes minecraft: prefix
 * - Applies alias mappings
 * @param {string} blockName - Block name to normalize
 * @returns {string} - Normalized block name
 */
export function normalizeBlockName(blockName) {
  if (!blockName || typeof blockName !== 'string') return blockName;

  // Remove minecraft: prefix
  let normalized = blockName.replace(/^minecraft:/, '');

  // Convert to lowercase for matching
  const lower = normalized.toLowerCase();

  // Apply alias if exists
  if (BLOCK_ALIASES[lower]) {
    return BLOCK_ALIASES[lower];
  }

  return normalized;
}

/**
 * Coerce hollow value to boolean
 * Handles string "true"/"false" from LLM outputs
 * @param {*} value - Value to coerce
 * @returns {boolean} - Coerced boolean value
 */
export function coerceHollow(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  // Default to false for undefined/null/other
  return false;
}

/**
 * Check if a value is an unresolved placeholder token
 * @param {string} value - Value to check
 * @returns {boolean} - True if value is a placeholder token
 */
export function isUnresolvedPlaceholder(value) {
  if (!value || typeof value !== 'string') return false;
  return PLACEHOLDER_TOKENS.includes(value) || /^\$\w+$/.test(value);
}

/**
 * Resolve a placeholder from the palette
 * @param {string} placeholder - Placeholder token (e.g., '$primary')
 * @param {Object|Array} palette - Blueprint palette
 * @returns {string|null} - Resolved block name or null if not found
 */
export function resolvePlaceholder(placeholder, palette) {
  if (!placeholder || !palette) return null;

  // Extract key from $token format
  const key = placeholder.startsWith('$') ? placeholder.substring(1) : placeholder;

  // Object palette: { primary: 'stone', secondary: 'oak_planks' }
  if (typeof palette === 'object' && !Array.isArray(palette)) {
    return palette[key] || null;
  }

  // Array palette: not directly resolvable by key
  return null;
}

/**
 * Normalize an entire blueprint
 * - Normalizes all block names in palette and steps
 * - Coerces hollow values
 * - Resolves placeholders from palette
 * - Reports changes, warnings, and errors
 *
 * @param {Object} blueprint - Blueprint to normalize
 * @returns {Object} - { blueprint, changes, warnings, errors }
 */
export function normalizeBlueprint(blueprint) {
  const changes = [];
  const warnings = [];
  const errors = [];

  if (!blueprint) {
    errors.push('Blueprint is null or undefined');
    return { blueprint, changes, warnings, errors };
  }

  // Deep clone to avoid mutating original
  const normalized = JSON.parse(JSON.stringify(blueprint));

  // 1. Normalize palette
  if (normalized.palette) {
    if (Array.isArray(normalized.palette)) {
      // Array palette
      for (let i = 0; i < normalized.palette.length; i++) {
        const original = normalized.palette[i];
        const normalizedBlock = normalizeBlockName(original);
        if (normalizedBlock !== original) {
          changes.push(`Palette[${i}]: '${original}' → '${normalizedBlock}'`);
          normalized.palette[i] = normalizedBlock;
        }
      }
    } else if (typeof normalized.palette === 'object') {
      // Object palette
      for (const key of Object.keys(normalized.palette)) {
        const original = normalized.palette[key];
        const normalizedBlock = normalizeBlockName(original);
        if (normalizedBlock !== original) {
          changes.push(`Palette.${key}: '${original}' → '${normalizedBlock}'`);
          normalized.palette[key] = normalizedBlock;
        }
      }
    }
  }

  // 2. Normalize steps
  if (Array.isArray(normalized.steps)) {
    for (let i = 0; i < normalized.steps.length; i++) {
      const step = normalized.steps[i];

      // Normalize block name
      if (step.block) {
        // Check for unresolved placeholder
        if (isUnresolvedPlaceholder(step.block)) {
          const resolved = resolvePlaceholder(step.block, normalized.palette);
          if (resolved) {
            changes.push(`Step ${i} block: '${step.block}' → '${resolved}' (resolved from palette)`);
            step.block = resolved;
          } else {
            errors.push(`Step ${i}: Unresolved placeholder '${step.block}' not found in palette`);
          }
        } else {
          // Standard block normalization
          const original = step.block;
          const normalizedBlock = normalizeBlockName(original);
          if (normalizedBlock !== original) {
            changes.push(`Step ${i} block: '${original}' → '${normalizedBlock}'`);
            step.block = normalizedBlock;
          }
        }
      }

      // Coerce hollow to boolean
      if (step.hollow !== undefined) {
        const original = step.hollow;
        const coerced = coerceHollow(original);
        if (coerced !== original) {
          changes.push(`Step ${i} hollow: '${original}' → ${coerced}`);
          step.hollow = coerced;
        }
      }

      // Normalize fallback if present
      if (step.fallback) {
        if (step.fallback.block) {
          if (isUnresolvedPlaceholder(step.fallback.block)) {
            const resolved = resolvePlaceholder(step.fallback.block, normalized.palette);
            if (resolved) {
              changes.push(`Step ${i} fallback block: '${step.fallback.block}' → '${resolved}'`);
              step.fallback.block = resolved;
            } else {
              errors.push(`Step ${i} fallback: Unresolved placeholder '${step.fallback.block}'`);
            }
          } else {
            const original = step.fallback.block;
            const normalizedBlock = normalizeBlockName(original);
            if (normalizedBlock !== original) {
              changes.push(`Step ${i} fallback block: '${original}' → '${normalizedBlock}'`);
              step.fallback.block = normalizedBlock;
            }
          }
        }

        if (step.fallback.hollow !== undefined) {
          const original = step.fallback.hollow;
          const coerced = coerceHollow(original);
          if (coerced !== original) {
            changes.push(`Step ${i} fallback hollow: '${original}' → ${coerced}`);
            step.fallback.hollow = coerced;
          }
        }
      }
    }

    // 3. Auto-centering logic - detect bounds and shift for better alignment
    // Find absolute bounds of all operations
    const bounds = calculateAbsoluteBounds(normalized.steps);

    if (bounds.minX !== Infinity) {
      const shiftX = -bounds.minX;
      const shiftZ = -bounds.minZ;
      // We don't shift Y because builds should stay on their intended vertical level (grounding is handled elsewhere)

      if (shiftX !== 0 || shiftZ !== 0) {
        changes.push(`Auto-centering: shifting horizontally by (${shiftX}, ${shiftZ})`);
        shiftCoordinates(normalized.steps, shiftX, 0, shiftZ);

        // Update size to match bounding box + small padding
        if (normalized.size) {
          normalized.size.width = (bounds.maxX - bounds.minX) + 1;
          normalized.size.depth = (bounds.maxZ - bounds.minZ) + 1;
        }
      }
    }

    // 4. Normalize negative coordinates (Safety check after shift/centering)
    const safetyBounds = calculateAbsoluteBounds(normalized.steps);
    if (safetyBounds.minX < 0 || safetyBounds.minY < 0 || safetyBounds.minZ < 0) {
      const shiftX = safetyBounds.minX < 0 ? -safetyBounds.minX : 0;
      const shiftY = safetyBounds.minY < 0 ? -safetyBounds.minY : 0;
      const shiftZ = safetyBounds.minZ < 0 ? -safetyBounds.minZ : 0;

      changes.push(`Safety shift: adjusting by (${shiftX}, ${shiftY}, ${shiftZ}) to prevent negative coordinates`);
      shiftCoordinates(normalized.steps, shiftX, shiftY, shiftZ);

      if (normalized.size) {
        normalized.size.width += shiftX;
        normalized.size.height += shiftY;
        normalized.size.depth += shiftZ;
      }
    }
  }

  // Debug logging
  if (DEBUG && changes.length > 0) {
    console.log('\n┌─────────────────────────────────────────────────────────');
    console.log('│ DEBUG: Blueprint Normalization');
    console.log('├─────────────────────────────────────────────────────────');
    console.log(`│ Changes: ${changes.length}`);
    for (const change of changes) {
      console.log(`│   • ${change}`);
    }
    if (warnings.length > 0) {
      console.log(`│ Warnings: ${warnings.length}`);
      for (const warning of warnings) {
        console.log(`│   ⚠ ${warning}`);
      }
    }
    if (errors.length > 0) {
      console.log(`│ Errors: ${errors.length}`);
      for (const error of errors) {
        console.log(`│   ✗ ${error}`);
      }
    }
    console.log('└─────────────────────────────────────────────────────────\n');
  }

  return { blueprint: normalized, changes, warnings, errors };
}

/**
 * Calculate absolute bounds for all operations in a blueprint
 */
export function calculateAbsoluteBounds(steps) {
  const coordKeys = ['from', 'to', 'pos', 'base', 'center'];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const step of steps) {
    for (const key of coordKeys) {
      if (step[key]) {
        const c = step[key];
        if (typeof c.x === 'number') { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x); }
        if (typeof c.y === 'number') { minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y); }
        if (typeof c.z === 'number') { minZ = Math.min(minZ, c.z); maxZ = Math.max(maxZ, c.z); }
      }
    }

    // Handle specialist operations with radius or size
    if (step.radius) {
      const center = step.center || step.base || { x: 0, y: 0, z: 0 };
      const r = step.radius;
      minX = Math.min(minX, center.x - r); maxX = Math.max(maxX, center.x + r);
      minY = Math.min(minY, center.y - r); maxY = Math.max(maxY, center.y + r);
      minZ = Math.min(minZ, center.z - r); maxZ = Math.max(maxZ, center.z + r);
    }

    if (step.size) {
      const base = step.from || { x: 0, y: 0, z: 0 };
      minX = Math.min(minX, base.x); maxX = Math.max(maxX, base.x + step.size.x);
      minY = Math.min(minY, base.y); maxY = Math.max(maxY, base.y + step.size.y);
      minZ = Math.min(minZ, base.z); maxZ = Math.max(maxZ, base.z + step.size.z);
    }
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/**
 * Shift all coordinates in a set of steps
 */
export function shiftCoordinates(steps, dx, dy, dz) {
  const coordKeys = ['from', 'to', 'pos', 'base', 'center'];

  for (const step of steps) {
    for (const key of coordKeys) {
      if (step[key]) {
        if (typeof step[key].x === 'number') step[key].x += dx;
        if (typeof step[key].y === 'number') step[key].y += dy;
        if (typeof step[key].z === 'number') step[key].z += dz;
      }
    }
    // Handle fallback coords
    if (step.fallback) {
      for (const key of coordKeys) {
        if (step.fallback[key]) {
          if (typeof step.fallback[key].x === 'number') step.fallback[key].x += dx;
          if (typeof step.fallback[key].y === 'number') step.fallback[key].y += dy;
          if (typeof step.fallback[key].z === 'number') step.fallback[key].z += dz;
        }
      }
    }
  }
}

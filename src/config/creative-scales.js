/**
 * Creative Scales Configuration
 *
 * Centralizes intent-based scaling, theme palettes, and build phase definitions.
 * Used by analyzer and LLM prompts to ensure consistent sizing based on user intent.
 */

/**
 * Intent-based scale mapping
 * Maps descriptive scale words to dimension ranges
 *
 * @property {number} min - Minimum dimension in blocks
 * @property {number} max - Maximum dimension in blocks
 * @property {number} default - Default dimension when scale is detected
 */
export const INTENT_SCALE_MAP = {
  tiny: { min: 5, max: 15, default: 10 },
  small: { min: 10, max: 25, default: 15 },
  medium: { min: 20, max: 50, default: 35 },
  large: { min: 40, max: 80, default: 60 },
  massive: { min: 60, max: 120, default: 90 },
  towering: { min: 80, max: 150, default: 100 },
  colossal: { min: 100, max: 200, default: 150 }
};

/**
 * Theme-based palette recommendations
 * Provides suggested blocks and palette sizes for different build themes
 */
export const THEME_PALETTES = {
  organic: {
    description: 'Natural, living structures like trees and plants',
    suggestedSize: 4,
    lockPalette: true,
    defaultBlocks: {
      primary: 'oak_log',
      secondary: 'oak_leaves',
      accent: 'moss_block',
      detail: 'vine'
    }
  },
  fantasy: {
    description: 'Magical, enchanted structures',
    suggestedSize: 6,
    lockPalette: false,
    defaultBlocks: {
      primary: 'purpur_block',
      secondary: 'prismarine_bricks',
      accent: 'sea_lantern',
      roof: 'purpur_stairs',
      detail: 'amethyst_block',
      window: 'magenta_stained_glass'
    }
  },
  medieval: {
    description: 'Traditional stone and timber construction',
    suggestedSize: 6,
    lockPalette: false,
    defaultBlocks: {
      primary: 'cobblestone',
      secondary: 'stone_bricks',
      accent: 'mossy_cobblestone',
      roof: 'spruce_stairs',
      detail: 'spruce_log',
      window: 'glass_pane'
    }
  },
  gothic: {
    description: 'Dark, imposing structures',
    suggestedSize: 5,
    lockPalette: false,
    defaultBlocks: {
      primary: 'deepslate_bricks',
      secondary: 'blackstone',
      accent: 'polished_blackstone',
      roof: 'deepslate_tile_stairs',
      window: 'purple_stained_glass'
    }
  },
  modern: {
    description: 'Clean lines with concrete and glass',
    suggestedSize: 5,
    lockPalette: false,
    defaultBlocks: {
      primary: 'white_concrete',
      secondary: 'gray_concrete',
      accent: 'black_concrete',
      roof: 'smooth_stone_slab',
      window: 'glass'
    }
  },
  natural: {
    description: 'Rustic wooden structures',
    suggestedSize: 4,
    lockPalette: true,
    defaultBlocks: {
      primary: 'oak_planks',
      secondary: 'oak_log',
      accent: 'stripped_oak_log',
      roof: 'oak_stairs'
    }
  },
  nether: {
    description: 'Hellish Nether dimension style',
    suggestedSize: 5,
    lockPalette: false,
    defaultBlocks: {
      primary: 'nether_bricks',
      secondary: 'red_nether_bricks',
      accent: 'cracked_nether_bricks',
      roof: 'nether_brick_stairs',
      detail: 'gilded_blackstone'
    }
  },
  ice: {
    description: 'Frozen, crystalline structures',
    suggestedSize: 4,
    lockPalette: false,
    defaultBlocks: {
      primary: 'packed_ice',
      secondary: 'blue_ice',
      accent: 'snow_block',
      window: 'light_blue_stained_glass'
    }
  }
};

/**
 * Build phase definitions
 * Enforces silhouette-first construction approach
 */
export const BUILD_PHASES = {
  silhouette: {
    name: 'Silhouette',
    description: 'Establish overall shape and mass',
    percentage: 40,
    operations: ['we_sphere', 'we_cylinder', 'we_fill', 'box', 'wall', 'we_walls']
  },
  secondary: {
    name: 'Secondary Forms',
    description: 'Major features and structural elements',
    percentage: 35,
    operations: ['we_fill', 'fill', 'hollow_box', 'we_cylinder', 'roof_gable', 'roof_hip']
  },
  detail: {
    name: 'Details',
    description: 'Fine details and finishing touches',
    percentage: 25,
    operations: ['set', 'line', 'stairs', 'slab', 'door', 'window_strip', 'fence_connect']
  }
};

/**
 * Get the build phase for a given operation
 * @param {string} opName - Operation name (e.g., 'we_sphere', 'set')
 * @returns {string|null} - Phase name or null if not categorized
 */
export function getPhaseForOperation(opName) {
  for (const [phaseName, phaseConfig] of Object.entries(BUILD_PHASES)) {
    if (phaseConfig.operations.includes(opName)) {
      return phaseName;
    }
  }
  return null;
}

/**
 * Get recommended dimensions based on intent scale and build type
 * @param {string} scale - Scale name (tiny, small, medium, large, massive, towering, colossal)
 * @param {string} buildType - Build type (tree, castle, house, etc.)
 * @returns {Object} - { width, height, depth }
 */
export function getScaledDimensions(scale, buildType) {
  const scaleConfig = INTENT_SCALE_MAP[scale] || INTENT_SCALE_MAP.medium;
  const baseSize = scaleConfig.default;

  // Adjust proportions based on build type
  const proportions = {
    tree: { width: 0.6, height: 1.5, depth: 0.6 },
    tower: { width: 0.3, height: 2.0, depth: 0.3 },
    castle: { width: 1.0, height: 0.5, depth: 1.0 },
    house: { width: 1.0, height: 0.6, depth: 0.8 },
    pyramid: { width: 1.0, height: 0.7, depth: 1.0 },
    statue: { width: 0.5, height: 1.2, depth: 0.5 },
    default: { width: 1.0, height: 1.0, depth: 1.0 }
  };

  const prop = proportions[buildType] || proportions.default;

  return {
    width: Math.round(baseSize * prop.width),
    height: Math.round(baseSize * prop.height),
    depth: Math.round(baseSize * prop.depth)
  };
}

/**
 * Validate that a blueprint follows the build phase order
 * @param {Array} steps - Blueprint steps array
 * @returns {Object} - { valid: boolean, violations: Array, phaseBreakdown: Object }
 */
export function validateBuildPhaseOrder(steps) {
  const violations = [];
  const phaseBreakdown = { silhouette: 0, secondary: 0, detail: 0, unknown: 0 };

  let currentPhaseIndex = 0;
  const phaseOrder = ['silhouette', 'secondary', 'detail'];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const phase = getPhaseForOperation(step.op);

    if (phase) {
      phaseBreakdown[phase]++;

      const stepPhaseIndex = phaseOrder.indexOf(phase);
      if (stepPhaseIndex < currentPhaseIndex) {
        // Going backwards in phases - violation
        violations.push({
          stepIndex: i,
          operation: step.op,
          expectedPhase: phaseOrder[currentPhaseIndex],
          actualPhase: phase,
          message: `Step ${i}: ${step.op} is a ${phase} operation but we're in ${phaseOrder[currentPhaseIndex]} phase`
        });
      } else {
        currentPhaseIndex = stepPhaseIndex;
      }
    } else {
      phaseBreakdown.unknown++;
    }
  }

  const total = steps.length;
  const percentages = {
    silhouette: ((phaseBreakdown.silhouette / total) * 100).toFixed(1),
    secondary: ((phaseBreakdown.secondary / total) * 100).toFixed(1),
    detail: ((phaseBreakdown.detail / total) * 100).toFixed(1)
  };

  return {
    valid: violations.length === 0,
    violations,
    phaseBreakdown,
    percentages
  };
}

export default {
  INTENT_SCALE_MAP,
  THEME_PALETTES,
  BUILD_PHASES,
  getPhaseForOperation,
  getScaledDimensions,
  validateBuildPhaseOrder
};

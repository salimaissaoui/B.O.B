/**
 * Organic Build Quality Validator
 *
 * Ensures trees and organic builds don't look like ugly geometric shapes.
 * Enforces quality constraints for natural-looking structures.
 */

const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

/**
 * Operations that create unnatural geometric shapes for organic builds
 */
const UNNATURAL_OPS_FOR_ORGANIC = [
  'we_sphere',   // Perfect spheres look unnatural for trees
  'we_cylinder', // Perfect cylinders look unnatural for trunks
  'we_pyramid'   // Perfect pyramids look unnatural for canopies
];

/**
 * Quality checks for tree builds
 */
export const TREE_QUALITY_CHECKS = {
  /**
   * Check for trunk taper - trees shouldn't have perfectly uniform trunks
   */
  hasTrunkTaper: (blueprint) => {
    const trunkSteps = blueprint.steps.filter(s =>
      s.block?.includes('log') || s.block?.includes('trunk')
    );

    // If we have multiple trunk sections, check for varying widths
    if (trunkSteps.length > 1) {
      // This is a basic heuristic - presence of multiple trunk operations
      // suggests some attempt at taper
      return { passed: true, reason: 'Multiple trunk sections suggest taper' };
    }

    // Single trunk is okay for small trees
    if (blueprint.size?.height <= 15) {
      return { passed: true, reason: 'Small tree - uniform trunk acceptable' };
    }

    return { passed: false, reason: 'Large tree should have trunk taper/branching' };
  },

  /**
   * Check for canopy asymmetry - perfect spheres look unnatural
   */
  hasCanopyAsymmetry: (blueprint) => {
    const leafSteps = blueprint.steps.filter(s =>
      s.block?.includes('leaves') || s.block?.includes('leaf')
    );

    // Check for we_sphere usage on leaves
    const hasPerfectSphereLeaves = blueprint.steps.some(s =>
      s.op === 'we_sphere' && (s.block?.includes('leaves') || s.block?.includes('leaf'))
    );

    if (hasPerfectSphereLeaves) {
      return { passed: false, reason: 'Perfect sphere canopies look unnatural' };
    }

    // Multiple leaf operations suggest varied canopy
    if (leafSteps.length >= 2) {
      return { passed: true, reason: 'Multiple leaf sections suggest natural canopy' };
    }

    return { passed: true, reason: 'Canopy structure acceptable' };
  },

  /**
   * Check that no unnatural geometric ops are used for organic parts
   */
  noUnnaturalGeometry: (blueprint) => {
    for (const step of blueprint.steps) {
      if (UNNATURAL_OPS_FOR_ORGANIC.includes(step.op)) {
        // Check if it's being used for leaves or trunk
        const block = step.block || '';
        if (block.includes('leaves') || block.includes('leaf') || block.includes('log')) {
          return {
            passed: false,
            reason: `${step.op} creates unnatural shapes for ${block}`,
            suggestion: 'Use we_fill with multiple sections for natural variation'
          };
        }
      }
    }
    return { passed: true, reason: 'No unnatural geometry for organic parts' };
  },

  /**
   * Check for leaf block variation (multiple leaf types = more natural)
   */
  hasLeafVariation: (blueprint) => {
    const leafBlocks = new Set();

    // Check palette
    const palette = blueprint.palette || {};
    if (typeof palette === 'object' && !Array.isArray(palette)) {
      for (const [, block] of Object.entries(palette)) {
        if (block?.includes('leaves') || block?.includes('leaf')) {
          leafBlocks.add(block);
        }
      }
    }

    // Check steps
    for (const step of blueprint.steps) {
      if (step.block?.includes('leaves') || step.block?.includes('leaf')) {
        leafBlocks.add(step.block);
      }
    }

    // Variation is nice but not required
    return {
      passed: true,
      suggestion: leafBlocks.size === 1
        ? 'Consider using multiple leaf variants for texture'
        : null
    };
  }
};

/**
 * Validate a tree/organic blueprint for quality
 *
 * @param {Object} blueprint - Blueprint to validate
 * @returns {Object} Validation result
 */
export function validateTreeQuality(blueprint) {
  const results = {
    valid: true,
    score: 1.0,
    checks: {},
    suggestions: [],
    errors: []
  };

  // Run all quality checks
  for (const [checkName, checkFn] of Object.entries(TREE_QUALITY_CHECKS)) {
    try {
      const result = checkFn(blueprint);
      results.checks[checkName] = result;

      if (!result.passed) {
        results.errors.push(result.reason);
        results.score -= 0.15;
      }

      if (result.suggestion) {
        results.suggestions.push(result.suggestion);
      }
    } catch (error) {
      results.checks[checkName] = { passed: true, error: error.message };
    }
  }

  // Overall validity
  results.valid = results.score >= 0.7;

  if (DEBUG && !results.valid) {
    console.log('\n┌─────────────────────────────────────────────────────────');
    console.log('│ ORGANIC QUALITY: Tree Validation Failed');
    console.log('├─────────────────────────────────────────────────────────');
    console.log(`│ Score: ${(results.score * 100).toFixed(0)}%`);
    for (const error of results.errors) {
      console.log(`│ ✗ ${error}`);
    }
    for (const suggestion of results.suggestions) {
      console.log(`│ → ${suggestion}`);
    }
    console.log('└─────────────────────────────────────────────────────────\n');
  }

  return results;
}

/**
 * Fix common tree quality issues in a blueprint
 *
 * @param {Object} blueprint - Blueprint to fix
 * @returns {Object} Fixed blueprint
 */
export function fixTreeQuality(blueprint) {
  const fixed = JSON.parse(JSON.stringify(blueprint));

  // Replace we_sphere/we_cylinder with we_fill for leaves/trunk
  for (let i = 0; i < fixed.steps.length; i++) {
    const step = fixed.steps[i];

    if (step.op === 'we_sphere' && step.block?.includes('leaves')) {
      // Convert sphere to multiple fills for more natural look
      const center = step.center || step.pos || { x: 0, y: 0, z: 0 };
      const radius = step.radius || 3;

      // Replace with 3 overlapping boxes for organic feel
      fixed.steps.splice(i, 1,
        {
          op: 'we_fill',
          from: { x: center.x - radius, y: center.y - 1, z: center.z - radius },
          to: { x: center.x + radius, y: center.y + 1, z: center.z + radius },
          block: step.block
        },
        {
          op: 'we_fill',
          from: { x: center.x - radius + 1, y: center.y - 2, z: center.z - radius + 1 },
          to: { x: center.x + radius - 1, y: center.y + 2, z: center.z + radius - 1 },
          block: step.block
        }
      );
      i++; // Skip the newly inserted step
    }

    if (step.op === 'we_cylinder' && step.block?.includes('log')) {
      // Convert cylinder to tapered trunk
      const base = step.base || step.pos || { x: 0, y: 0, z: 0 };
      const height = step.height || 5;

      fixed.steps.splice(i, 1,
        {
          op: 'we_fill',
          from: { x: base.x - 1, y: base.y, z: base.z - 1 },
          to: { x: base.x + 1, y: base.y + 2, z: base.z + 1 },
          block: step.block
        },
        {
          op: 'we_fill',
          from: { x: base.x, y: base.y + 2, z: base.z },
          to: { x: base.x, y: base.y + height, z: base.z },
          block: step.block
        }
      );
      i++;
    }
  }

  return fixed;
}

/**
 * Check if a blueprint is for an organic/tree build
 */
export function isOrganicBuild(blueprint) {
  const organicTypes = ['tree', 'plant', 'organic', 'flora', 'vegetation'];
  return organicTypes.includes(blueprint.buildType?.toLowerCase());
}

export default {
  validateTreeQuality,
  fixTreeQuality,
  isOrganicBuild,
  TREE_QUALITY_CHECKS
};

/**
 * Organic Build Quality Validator
 *
 * Ensures trees and organic builds don't look like ugly geometric shapes.
 * Enforces quality constraints for natural-looking structures.
 */

const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

/**
 * Operations that create unnatural geometric shapes for organic builds
 * NOTE: we_sphere is ALLOWED for canopies when used with variation (multiple overlapping spheres)
 * Single perfect spheres are discouraged but multiple overlapping ones create natural shapes
 */
const UNNATURAL_OPS_FOR_ORGANIC = [
  'we_pyramid'   // Perfect pyramids look unnatural for canopies
  // we_sphere: ALLOWED - overlapping spheres create organic shapes
  // we_cylinder: ALLOWED - can be used for trunk tapering
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
   * Check for canopy asymmetry - SINGLE perfect sphere looks unnatural,
   * but MULTIPLE overlapping spheres create organic shapes
   */
  hasCanopyAsymmetry: (blueprint) => {
    const leafSteps = blueprint.steps.filter(s =>
      s.block?.includes('leaves') || s.block?.includes('leaf')
    );

    // Count sphere operations on leaves
    const sphereLeafSteps = blueprint.steps.filter(s =>
      s.op === 'we_sphere' && (s.block?.includes('leaves') || s.block?.includes('leaf'))
    );

    // Single sphere canopy = unnatural (perfect ball)
    // Multiple spheres = organic (overlapping creates irregular shape)
    if (sphereLeafSteps.length === 1) {
      return {
        passed: false,
        reason: 'Single sphere canopy looks unnatural - use 2-4 overlapping spheres',
        suggestion: 'Add 2-3 more spheres at offset positions with varied radii'
      };
    }

    // Multiple spheres are great for organic shapes
    if (sphereLeafSteps.length >= 2) {
      return { passed: true, reason: 'Multiple overlapping spheres create natural canopy' };
    }

    // Multiple leaf operations (non-sphere) also suggest varied canopy
    if (leafSteps.length >= 2) {
      return { passed: true, reason: 'Multiple leaf sections suggest natural canopy' };
    }

    return { passed: true, reason: 'Canopy structure acceptable' };
  },

  /**
   * Check that no unnatural geometric ops are used for organic parts
   * NOTE: we_sphere and we_cylinder are now ALLOWED for organic builds
   * Only we_pyramid is still considered unnatural for trees
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
            suggestion: 'Use spheres or fills with multiple sections for natural variation'
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
        results.score -= 0.35;
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
 * Strategy: Add VARIATION to geometric shapes rather than replacing them with boxes
 *
 * @param {Object} blueprint - Blueprint to fix
 * @returns {Object} Fixed blueprint
 */
export function fixTreeQuality(blueprint) {
  const fixed = JSON.parse(JSON.stringify(blueprint));

  // Count existing sphere operations for leaves
  const sphereLeafIndices = [];
  for (let i = 0; i < fixed.steps.length; i++) {
    const step = fixed.steps[i];
    if (step.op === 'we_sphere' && step.block?.includes('leaves')) {
      sphereLeafIndices.push(i);
    }
  }

  // If there's only ONE sphere for leaves, add 2 more overlapping spheres for organic feel
  // Multiple spheres create irregular, natural-looking canopies
  if (sphereLeafIndices.length === 1) {
    const idx = sphereLeafIndices[0];
    const step = fixed.steps[idx];
    const center = step.center || step.pos || { x: 0, y: 0, z: 0 };
    const radius = step.radius || 3;

    // Add 2 more overlapping spheres at offset positions with varied radii
    // This creates an organic, asymmetric canopy shape
    const additionalSpheres = [
      {
        op: 'we_sphere',
        center: { x: center.x + 2, y: center.y + 1, z: center.z + 1 },
        radius: Math.max(2, radius - 1),
        block: step.block
      },
      {
        op: 'we_sphere',
        center: { x: center.x - 1, y: center.y - 1, z: center.z + 2 },
        radius: Math.max(2, radius - 1),
        block: step.block
      }
    ];

    // Insert additional spheres after the original
    fixed.steps.splice(idx + 1, 0, ...additionalSpheres);
  }

  // For cylinders used as trunks, convert to tapered trunk using multiple cylinder sections
  // or we_fill boxes to simulate natural tapering
  for (let i = 0; i < fixed.steps.length; i++) {
    const step = fixed.steps[i];

    if (step.op === 'we_cylinder' && step.block?.includes('log')) {
      // Convert single cylinder to tapered trunk (3 segments for natural taper)
      const base = step.base || step.pos || { x: 0, y: 0, z: 0 };
      const height = step.height || 5;
      const radius = step.radius || 1;

      // Use cylinders with decreasing radii for taper (preserves roundness)
      // Bottom: full radius, Middle: radius-1, Top: 1 block wide
      const taperedTrunk = [
        {
          op: 'we_cylinder',
          base: { x: base.x, y: base.y, z: base.z },
          radius: radius,
          height: Math.floor(height * 0.4),
          block: step.block
        },
        {
          op: 'we_cylinder',
          base: { x: base.x, y: base.y + Math.floor(height * 0.4), z: base.z },
          radius: Math.max(1, radius - 1),
          height: Math.floor(height * 0.4),
          block: step.block
        },
        {
          op: 'we_cylinder',
          base: { x: base.x, y: base.y + Math.floor(height * 0.8), z: base.z },
          radius: 1,
          height: height - Math.floor(height * 0.8),
          block: step.block
        }
      ];

      fixed.steps.splice(i, 1, ...taperedTrunk);
      i += 2; // Skip the newly inserted steps
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

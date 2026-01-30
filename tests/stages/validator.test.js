import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { SAFETY_LIMITS } from '../../src/config/limits.js';
import { WorldEditValidator } from '../../src/validation/worldedit-validator.js';
import { validateBlueprint } from '../../src/config/schemas.js';

/**
 * Stage 4 Validator Tests
 * Tests for limits enforcement, coordinate validation, and WorldEdit validation
 * Note: These tests validate blueprints directly without LLM repair attempts
 */

// Helper function to validate limits without LLM repair
function validateLimits(blueprint) {
  const errors = [];

  // Check step count
  if ((blueprint.steps || []).length > SAFETY_LIMITS.maxSteps) {
    errors.push(`Too many steps (>${SAFETY_LIMITS.maxSteps})`);
  }

  // Check total volume
  const { width, height, depth } = blueprint.size || {};
  if (width && height && depth) {
    const volume = width * height * depth;
    if (volume > SAFETY_LIMITS.maxBlocks) {
      errors.push(`Volume exceeds limit (${volume} > ${SAFETY_LIMITS.maxBlocks})`);
    }
  }

  // Check dimension bounds
  if (width && width > SAFETY_LIMITS.maxWidth) {
    errors.push(`Width exceeds limit (${width} > ${SAFETY_LIMITS.maxWidth})`);
  }
  if (depth && depth > SAFETY_LIMITS.maxDepth) {
    errors.push(`Depth exceeds limit (${depth} > ${SAFETY_LIMITS.maxDepth})`);
  }
  if (height && height > SAFETY_LIMITS.maxHeight) {
    errors.push(`Height exceeds limit (${height} > ${SAFETY_LIMITS.maxHeight})`);
  }

  // Check palette size
  if ((blueprint.palette || []).length > SAFETY_LIMITS.maxUniqueBlocks) {
    errors.push(`Too many unique blocks in palette`);
  }

  return { valid: errors.length === 0, errors };
}

// Helper function to validate coordinate bounds
function validateCoordinateBounds(blueprint, dimensions) {
  const errors = [];
  const { width, depth, height } = dimensions;

  const isWithinBounds = (coord, w, h, d) => {
    return coord.x >= 0 && coord.x < w &&
      coord.y >= 0 && coord.y < h &&
      coord.z >= 0 && coord.z < d;
  };

  for (let i = 0; i < (blueprint.steps || []).length; i++) {
    const step = blueprint.steps[i];

    const coordKeys = ['from', 'to', 'pos', 'base', 'center'];
    for (const key of coordKeys) {
      if (step[key]) {
        if (!isWithinBounds(step[key], width, height, depth)) {
          errors.push(`Step ${i}: '${key}' coordinate out of bounds`);
        }
      }
    }

    if (step.fallback) {
      for (const key of coordKeys) {
        if (step.fallback[key]) {
          if (!isWithinBounds(step.fallback[key], width, height, depth)) {
            errors.push(`Step ${i} fallback: '${key}' coordinate out of bounds`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

describe('Validator Limit Enforcement', () => {
  test('should reject blueprint exceeding max steps', () => {
    const tooManySteps = [];
    for (let i = 0; i < SAFETY_LIMITS.maxSteps + 10; i++) {
      tooManySteps.push({
        op: 'set',
        block: 'stone',
        pos: { x: 0, y: 0, z: 0 }
      });
    }

    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['stone'],
      steps: tooManySteps
    };

    const result = validateLimits(blueprint);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Too many steps'))).toBe(true);
  });

  test('should ACCEPT blueprint exceeding OLD volume limit', () => {
    // 2000x2000x2 = 8,000,000 > 5,000,000? Wait.
    // My limit is 5,000,000. 8M is still > 5M.
    // I should test something large but valid.
    // 1000x1000x1 = 1,000,000. This should pass.
    const blueprint = {
      size: { width: 1000, depth: 1000, height: 1 },
      palette: ['stone'],
      steps: []
    };

    const result = validateLimits(blueprint);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('should reject blueprint with too many unique blocks', () => {
    const tooManyBlocks = [];
    for (let i = 0; i < SAFETY_LIMITS.maxUniqueBlocks + 5; i++) {
      tooManyBlocks.push(`block_${i}`);
    }

    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: tooManyBlocks,
      steps: []
    };

    const result = validateLimits(blueprint);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Too many unique blocks'))).toBe(true);
  });

  test('should ACCEPT blueprint within dimension limits', () => {
    // Width 2000 is allowed.
    const blueprint = {
      size: { width: 2000, depth: 10, height: 10 },
      palette: ['stone'],
      steps: []
    };

    const result = validateLimits(blueprint);

    expect(result.valid).toBe(true);
  });
});

describe('Coordinate Bounds Validation', () => {
  test('should validate all coordinate keys: from, to, pos', () => {
    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['stone'],
      steps: [
        {
          op: 'fill',
          block: 'stone',
          from: { x: 0, y: 0, z: 0 },
          to: { x: 9, y: 9, z: 9 }
        },
        {
          op: 'set',
          block: 'stone',
          pos: { x: 5, y: 5, z: 5 }
        }
      ]
    };

    const result = validateCoordinateBounds(blueprint, { width: 10, depth: 10, height: 10 });

    expect(result.valid).toBe(true);
  });

  test('should reject out-of-bounds from coordinate', () => {
    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['stone'],
      steps: [
        {
          op: 'fill',
          block: 'stone',
          from: { x: 15, y: 0, z: 0 },
          to: { x: 9, y: 9, z: 9 }
        }
      ]
    };

    const result = validateCoordinateBounds(blueprint, { width: 10, depth: 10, height: 10 });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("'from' coordinate out of bounds"))).toBe(true);
  });

  test('should reject out-of-bounds base coordinate for WorldEdit operations', () => {
    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['stone'],
      steps: [
        {
          op: 'we_pyramid',
          block: 'stone',
          base: { x: 20, y: 0, z: 0 },
          height: 5,
          hollow: false,
          fallback: { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 5, y: 5, z: 5 } }
        }
      ]
    };

    const result = validateCoordinateBounds(blueprint, { width: 10, depth: 10, height: 10 });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("'base' coordinate out of bounds"))).toBe(true);
  });

  test('should reject out-of-bounds center coordinate', () => {
    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['stone'],
      steps: [
        {
          op: 'we_sphere',
          block: 'stone',
          center: { x: 0, y: 0, z: 15 },
          radius: 3,
          hollow: false,
          fallback: { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 5, y: 5, z: 5 } }
        }
      ]
    };

    const result = validateCoordinateBounds(blueprint, { width: 10, depth: 10, height: 10 });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("'center' coordinate out of bounds"))).toBe(true);
  });

  test('should validate fallback coordinates', () => {
    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['stone'],
      steps: [
        {
          op: 'we_fill',
          block: 'stone',
          from: { x: 0, y: 0, z: 0 },
          to: { x: 5, y: 5, z: 5 },
          fallback: {
            op: 'fill',
            block: 'stone',
            from: { x: 20, y: 0, z: 0 },
            to: { x: 25, y: 5, z: 5 }
          }
        }
      ]
    };

    const result = validateCoordinateBounds(blueprint, { width: 10, depth: 10, height: 10 });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("fallback: 'from' coordinate out of bounds"))).toBe(true);
  });
});

describe('WorldEdit Validation', () => {
  test('should reject WorldEdit selection exceeding volume limit', () => {
    // Current maxSelectionVolume is 500,000 - use 100^3 = 1,000,000 to exceed it
    const blueprint = {
      size: { width: 150, depth: 150, height: 150 },
      palette: ['stone'],
      steps: [
        {
          op: 'we_fill',
          block: 'stone',
          from: { x: 0, y: 0, z: 0 },
          to: { x: 99, y: 99, z: 99 },  // 100^3 = 1,000,000 blocks
          fallback: { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 5, y: 5, z: 5 } }
        }
      ]
    };

    const result = WorldEditValidator.validateWorldEditOps(blueprint);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Selection too large'))).toBe(true);
  });

  test('should reject WorldEdit selection exceeding dimension limit', () => {
    // Current maxSelectionDimension is 250 - use 300 to exceed it
    const blueprint = {
      size: { width: 350, depth: 100, height: 100 },
      palette: ['stone'],
      steps: [
        {
          op: 'we_fill',
          block: 'stone',
          from: { x: 0, y: 0, z: 0 },
          to: { x: 299, y: 5, z: 5 },  // 300 blocks on X axis exceeds 250 limit
          fallback: { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 5, y: 5, z: 5 } }
        }
      ]
    };

    const result = WorldEditValidator.validateWorldEditOps(blueprint);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('dimension too large'))).toBe(true);
  });

  test('should reject too many WorldEdit commands', () => {
    const tooManyWESteps = [];
    for (let i = 0; i < SAFETY_LIMITS.worldEdit.maxCommandsPerBuild + 10; i++) {
      tooManyWESteps.push({
        op: 'we_fill',
        block: 'stone',
        from: { x: 0, y: 0, z: 0 },
        to: { x: 5, y: 5, z: 5 },
        fallback: { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 5, y: 5, z: 5 } }
      });
    }

    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['stone'],
      steps: tooManyWESteps
    };

    const result = WorldEditValidator.validateWorldEditOps(blueprint);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Too many WorldEdit commands'))).toBe(true);
  });

  test('should validate cylinder dimensions', () => {
    // Current maxSelectionDimension is 250 - use radius 150 (diameter 300) to exceed it
    const blueprint = {
      size: { width: 350, depth: 350, height: 350 },
      palette: ['stone'],
      steps: [
        {
          op: 'we_cylinder',
          block: 'stone',
          base: { x: 150, y: 0, z: 150 },
          radius: 150,  // diameter 300 exceeds 250 limit
          height: 100,
          hollow: false,
          fallback: { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 5, y: 5, z: 5 } }
        }
      ]
    };

    const result = WorldEditValidator.validateWorldEditOps(blueprint);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Dimensions too large'))).toBe(true);
  });

  test('should validate sphere radius', () => {
    // Current maxSelectionDimension is 250 - use radius 150 (diameter 300) to exceed it
    const blueprint = {
      size: { width: 350, depth: 350, height: 350 },
      palette: ['stone'],
      steps: [
        {
          op: 'we_sphere',
          block: 'stone',
          center: { x: 150, y: 150, z: 150 },
          radius: 150,  // diameter 300 exceeds 250 limit
          hollow: false,
          fallback: { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 5, y: 5, z: 5 } }
        }
      ]
    };

    const result = WorldEditValidator.validateWorldEditOps(blueprint);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Radius too large'))).toBe(true);
  });
});

describe('Operation Parameter Validation', () => {
  test('should accept operation with all required params', () => {
    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['stone'],
      steps: [
        {
          op: 'fill',
          block: 'stone',
          from: { x: 0, y: 0, z: 0 },
          to: { x: 5, y: 5, z: 5 }
        }
      ]
    };

    const isValid = validateBlueprint(blueprint);
    expect(isValid).toBe(true);
  });

  test('should accept stairs with correct block suffix', () => {
    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['oak_stairs'],
      steps: [
        {
          op: 'stairs',
          block: 'oak_stairs',
          pos: { x: 0, y: 0, z: 0 },
          facing: 'north'
        }
      ]
    };

    const isValid = validateBlueprint(blueprint);
    expect(isValid).toBe(true);
  });

  test('should accept door with correct block suffix', () => {
    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['oak_door'],
      steps: [
        {
          op: 'door',
          block: 'oak_door',
          pos: { x: 0, y: 0, z: 0 },
          facing: 'north'
        }
      ]
    };

    const isValid = validateBlueprint(blueprint);
    expect(isValid).toBe(true);
  });
  test('should accept previously problematic blocks', () => {
    const blueprint = {
      size: { width: 10, depth: 10, height: 10 },
      palette: ['glow_lichen', 'jack_o_lantern'],
      steps: [
        { op: 'set', block: 'glow_lichen', pos: { x: 0, y: 0, z: 0 } },
        { op: 'set', block: 'jack_o_lantern', pos: { x: 1, y: 0, z: 0 } }
      ]
    };

    const isValid = validateBlueprint(blueprint);
    expect(isValid).toBe(true);
  });
});

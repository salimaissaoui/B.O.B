/**
 * Builder v2 Schema Validation Tests
 */

import {
  validateIntent,
  validateScene,
  validatePlan,
  validatePlacement,
  formatValidationErrors,
  ErrorCodes
} from '../../src/builder_v2/validate/validators.js';

describe('BuildIntentV2 Schema', () => {
  const validIntent = {
    version: '2.0',
    id: '12345678-1234-1234-1234-123456789012',
    timestamp: new Date().toISOString(),
    prompt: {
      raw: 'Build a house',
      normalized: 'build a house'
    },
    intent: {
      category: 'architecture',
      scale: 'medium',
      complexity: 'moderate'
    },
    constraints: {},
    context: {
      worldEditAvailable: true,
      serverVersion: '1.20.1'
    }
  };

  test('validates correct intent', () => {
    const result = validateIntent(validIntent);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects invalid version', () => {
    const invalid = { ...validIntent, version: '1.0' };
    const result = validateIntent(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe(ErrorCodes.INVALID_VERSION);
  });

  test('rejects missing required fields', () => {
    const invalid = { version: '2.0' };
    const result = validateIntent(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === ErrorCodes.MISSING_REQUIRED)).toBe(true);
  });

  test('rejects invalid category', () => {
    const invalid = {
      ...validIntent,
      intent: { ...validIntent.intent, category: 'invalid_category' }
    };
    const result = validateIntent(invalid);
    expect(result.valid).toBe(false);
  });
});

describe('BuildSceneV2 Schema', () => {
  const validScene = {
    version: '2.0',
    intentId: 'abc-123',
    description: {
      title: 'Test House',
      summary: 'A simple test house'
    },
    bounds: { width: 10, height: 8, depth: 10 },
    style: {
      palette: {
        primary: 'stone_bricks',
        secondary: 'oak_planks',
        accent: 'cobblestone'
      },
      theme: 'medieval'
    },
    components: [
      {
        id: 'main',
        type: 'room',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: { width: 8, height: 6, depth: 8 }
      }
    ]
  };

  test('validates correct scene', () => {
    const result = validateScene(validScene);
    expect(result.valid).toBe(true);
  });

  test('rejects bounds exceeding limits', () => {
    const invalid = {
      ...validScene,
      bounds: { width: 3000, height: 300, depth: 10 }
    };
    const result = validateScene(invalid);
    expect(result.valid).toBe(false);
  });

  test('rejects invalid component type', () => {
    const invalid = {
      ...validScene,
      components: [{
        id: 'bad',
        type: 'nonexistent_component',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: {}
      }]
    };
    const result = validateScene(invalid);
    expect(result.valid).toBe(false);
  });

  test('rejects empty components array', () => {
    const invalid = { ...validScene, components: [] };
    const result = validateScene(invalid);
    expect(result.valid).toBe(false);
  });
});

describe('BuildPlanV2 Schema', () => {
  const validPlan = {
    version: '2.0',
    sceneId: 'abc-123',
    hash: 'a'.repeat(64),
    seed: 12345,
    bounds: { width: 10, height: 8, depth: 10 },
    palette: { primary: 'stone_bricks' },
    geometry: [
      {
        id: 'box1',
        type: 'box',
        from: { x: 0, y: 0, z: 0 },
        to: { x: 5, y: 5, z: 5 },
        block: 'stone_bricks'
      }
    ],
    stats: {
      totalBlocks: 216,
      uniqueBlocks: 1,
      componentsExpanded: 1,
      detailPassesApplied: 0
    }
  };

  test('validates correct plan', () => {
    const result = validatePlan(validPlan);
    expect(result.valid).toBe(true);
  });

  test('rejects invalid hash format', () => {
    const invalid = { ...validPlan, hash: 'invalid' };
    const result = validatePlan(invalid);
    expect(result.valid).toBe(false);
  });
});

describe('PlacementPlanV2 Schema', () => {
  const validPlacement = {
    version: '2.0',
    planId: 'abc-123',
    hash: 'b'.repeat(64),
    strategy: {
      preferWorldEdit: true,
      batchSize: 50000,
      checkpointInterval: 5000
    },
    worldEditBatches: [
      {
        id: 0,
        command: 'set',
        from: { x: 0, y: 0, z: 0 },
        to: { x: 5, y: 5, z: 5 },
        block: 'stone_bricks',
        estimatedBlocks: 216
      }
    ],
    vanillaPlacements: [],
    checkpoints: [],
    stats: {
      worldEditCommands: 3,
      worldEditBlocks: 216,
      vanillaBlocks: 0,
      estimatedTime: 1.2
    }
  };

  test('validates correct placement', () => {
    const result = validatePlacement(validPlacement);
    expect(result.valid).toBe(true);
  });

  test('rejects invalid command', () => {
    const invalid = {
      ...validPlacement,
      worldEditBatches: [{
        ...validPlacement.worldEditBatches[0],
        command: 'invalid_command'
      }]
    };
    const result = validatePlacement(invalid);
    expect(result.valid).toBe(false);
  });
});

describe('formatValidationErrors', () => {
  test('returns empty array for valid result', () => {
    const result = { valid: true, errors: [] };
    expect(formatValidationErrors(result)).toEqual([]);
  });

  test('formats errors correctly', () => {
    const result = {
      valid: false,
      errors: [
        { code: 'MISSING_REQUIRED', path: '/id', message: 'required' }
      ]
    };
    const formatted = formatValidationErrors(result);
    expect(formatted).toHaveLength(1);
    expect(formatted[0]).toContain('MISSING_REQUIRED');
    expect(formatted[0]).toContain('/id');
  });
});

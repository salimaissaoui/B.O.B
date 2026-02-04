/**
 * Landmark Registry Unit Tests
 */

import {
  LANDMARK_REGISTRY,
  findLandmark,
  isKnownLandmark,
  listLandmarks,
  scaleParams,
  calculateBoundsFromConfig
} from '../../../src/builder_v2/landmarks/registry.js';

describe('Landmark Registry', () => {
  describe('LANDMARK_REGISTRY structure', () => {
    test('contains expected landmarks', () => {
      const landmarks = Object.keys(LANDMARK_REGISTRY);
      expect(landmarks).toContain('eiffel');
      expect(landmarks).toContain('statue_of_liberty');
      expect(landmarks).toContain('big_ben');
      expect(landmarks).toContain('taj_mahal');
      expect(landmarks).toContain('pyramid');
      expect(landmarks).toContain('colosseum');
    });

    test('all landmarks have required fields', () => {
      for (const [key, config] of Object.entries(LANDMARK_REGISTRY)) {
        // Check aliases
        expect(config.aliases).toBeDefined();
        expect(Array.isArray(config.aliases)).toBe(true);

        // Check materials
        expect(config.materials).toBeDefined();

        // Either components OR useLegacyOperation
        const hasComponents = Array.isArray(config.components) && config.components.length > 0;
        const hasLegacy = typeof config.useLegacyOperation === 'string';
        expect(hasComponents || hasLegacy).toBe(true);
      }
    });

    test('eiffel tower uses lattice_tower component', () => {
      const eiffel = LANDMARK_REGISTRY.eiffel;
      expect(eiffel.components).toBeDefined();
      expect(eiffel.components.length).toBeGreaterThan(0);

      const tower = eiffel.components.find(c => c.type === 'lattice_tower');
      expect(tower).toBeDefined();
      expect(tower.params.taperRatio).toBeLessThan(0.3);
      expect(tower.params.height).toBeGreaterThan(50);
    });

    test('statue of liberty uses statue_armature component', () => {
      const liberty = LANDMARK_REGISTRY.statue_of_liberty;
      expect(liberty.components).toBeDefined();

      const armature = liberty.components.find(c => c.type === 'statue_armature');
      expect(armature).toBeDefined();

      const pedestal = liberty.components.find(c => c.type === 'platform');
      expect(pedestal).toBeDefined();
    });
  });

  describe('findLandmark', () => {
    test('finds eiffel by exact key', () => {
      const result = findLandmark('eiffel');
      expect(result).not.toBeNull();
      expect(result.key).toBe('eiffel');
    });

    test('finds eiffel by alias "eiffel tower"', () => {
      const result = findLandmark('eiffel tower');
      expect(result).not.toBeNull();
      expect(result.key).toBe('eiffel');
    });

    test('finds eiffel by alias "eiffel_tower"', () => {
      const result = findLandmark('eiffel_tower');
      expect(result).not.toBeNull();
      expect(result.key).toBe('eiffel');
    });

    test('finds eiffel with "the eiffel tower"', () => {
      const result = findLandmark('the eiffel tower');
      expect(result).not.toBeNull();
      expect(result.key).toBe('eiffel');
    });

    test('finds statue of liberty by various names', () => {
      expect(findLandmark('statue of liberty')).not.toBeNull();
      expect(findLandmark('liberty')).not.toBeNull();
      expect(findLandmark('lady liberty')).not.toBeNull();
    });

    test('finds big ben by various names', () => {
      expect(findLandmark('big ben')).not.toBeNull();
      expect(findLandmark('clock tower')).not.toBeNull();
      expect(findLandmark('elizabeth tower')).not.toBeNull();
    });

    test('finds pyramid by various names', () => {
      expect(findLandmark('pyramid')).not.toBeNull();
      expect(findLandmark('pyramids')).not.toBeNull();
      expect(findLandmark('giza')).not.toBeNull();
      expect(findLandmark('great pyramid')).not.toBeNull();
    });

    test('returns null for unknown landmarks', () => {
      expect(findLandmark('random building')).toBeNull();
      expect(findLandmark('my house')).toBeNull();
      expect(findLandmark('generic tower')).toBeNull();
    });

    test('handles null and empty inputs', () => {
      expect(findLandmark(null)).toBeNull();
      expect(findLandmark('')).toBeNull();
      expect(findLandmark(undefined)).toBeNull();
    });

    test('is case insensitive', () => {
      expect(findLandmark('EIFFEL TOWER')).not.toBeNull();
      expect(findLandmark('Eiffel Tower')).not.toBeNull();
      expect(findLandmark('BIG BEN')).not.toBeNull();
    });
  });

  describe('isKnownLandmark', () => {
    test('returns true for known landmarks', () => {
      expect(isKnownLandmark('eiffel tower')).toBe(true);
      expect(isKnownLandmark('statue of liberty')).toBe(true);
      expect(isKnownLandmark('taj mahal')).toBe(true);
    });

    test('returns false for unknown landmarks', () => {
      expect(isKnownLandmark('random structure')).toBe(false);
      expect(isKnownLandmark('house')).toBe(false);
    });
  });

  describe('listLandmarks', () => {
    test('returns array of landmark keys', () => {
      const landmarks = listLandmarks();
      expect(Array.isArray(landmarks)).toBe(true);
      expect(landmarks.length).toBeGreaterThan(5);
      expect(landmarks).toContain('eiffel');
      expect(landmarks).toContain('statue_of_liberty');
    });
  });

  describe('scaleParams', () => {
    test('scales dimension parameters', () => {
      const params = { width: 10, height: 20, depth: 10, name: 'test' };
      const scaled = scaleParams(params, 2);

      expect(scaled.width).toBe(20);
      expect(scaled.height).toBe(40);
      expect(scaled.depth).toBe(20);
      expect(scaled.name).toBe('test'); // Non-dimension unchanged
    });

    test('returns original if scale is 1', () => {
      const params = { width: 10, height: 20 };
      const scaled = scaleParams(params, 1);
      expect(scaled).toBe(params);
    });

    test('handles null params', () => {
      expect(scaleParams(null, 2)).toBeNull();
      expect(scaleParams(undefined, 2)).toBeUndefined();
    });

    test('rounds to nearest integer', () => {
      const params = { width: 10, radius: 5 };
      const scaled = scaleParams(params, 1.5);

      expect(scaled.width).toBe(15);
      expect(scaled.radius).toBe(8); // 5 * 1.5 = 7.5 -> 8
    });
  });

  describe('calculateBoundsFromConfig', () => {
    test('uses defaultBounds when provided', () => {
      const components = [];
      const defaultBounds = { width: 50, height: 100, depth: 50 };
      const bounds = calculateBoundsFromConfig(components, 1, defaultBounds);

      expect(bounds.width).toBe(50);
      expect(bounds.height).toBe(100);
      expect(bounds.depth).toBe(50);
    });

    test('scales defaultBounds by scaleFactor', () => {
      const components = [];
      const defaultBounds = { width: 50, height: 100, depth: 50 };
      const bounds = calculateBoundsFromConfig(components, 2, defaultBounds);

      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(200);
      expect(bounds.depth).toBe(100);
    });

    test('estimates from components if no defaultBounds', () => {
      const components = [
        {
          transform: { position: { x: 0, y: 0, z: 0 } },
          params: { width: 20, height: 30, depth: 20 }
        }
      ];
      const bounds = calculateBoundsFromConfig(components, 1, null);

      expect(bounds.width).toBeGreaterThan(20);
      expect(bounds.height).toBeGreaterThan(30);
      expect(bounds.depth).toBeGreaterThan(20);
    });
  });
});

describe('Landmark Component Integrity', () => {
  test('all component types are valid V2 components', () => {
    const validTypes = [
      'lattice_tower', 'arch', 'column', 'platform', 'staircase',
      'bridge', 'wall_gate', 'tower_top', 'room', 'roof_gable',
      'roof_dome', 'sphere', 'cylinder', 'statue_armature', 'box', 'wall'
    ];

    for (const [key, config] of Object.entries(LANDMARK_REGISTRY)) {
      if (config.components) {
        for (const comp of config.components) {
          expect(validTypes).toContain(comp.type);
        }
      }
    }
  });

  test('eiffel tower has proper taper ratio for realistic shape', () => {
    const eiffel = LANDMARK_REGISTRY.eiffel;
    const tower = eiffel.components.find(c => c.type === 'lattice_tower');

    // Eiffel Tower tapers from ~125m at base to ~18m at top = ~0.14 ratio
    expect(tower.params.taperRatio).toBeGreaterThan(0.1);
    expect(tower.params.taperRatio).toBeLessThan(0.25);
  });

  test('all landmarks have scale mappings', () => {
    for (const [key, config] of Object.entries(LANDMARK_REGISTRY)) {
      expect(config.scale).toBeDefined();
      expect(config.scale.medium).toBeDefined();
    }
  });
});

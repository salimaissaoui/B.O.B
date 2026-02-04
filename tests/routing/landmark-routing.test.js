/**
 * Landmark Routing Integration Tests
 */

import { isKnownLandmark, findLandmark } from '../../src/builder_v2/landmarks/registry.js';
import sceneGenerator from '../../src/builder_v2/llm/scene-generator.js';

describe('Landmark Routing', () => {
  describe('Landmark Detection', () => {
    test('detects eiffel tower variants', () => {
      expect(isKnownLandmark('eiffel tower')).toBe(true);
      expect(isKnownLandmark('build an eiffel tower')).toBe(true);
      expect(isKnownLandmark('make me the eiffel tower')).toBe(true);
      expect(isKnownLandmark('eiffel')).toBe(true);
    });

    test('detects statue of liberty variants', () => {
      expect(isKnownLandmark('statue of liberty')).toBe(true);
      expect(isKnownLandmark('build statue of liberty')).toBe(true);
      expect(isKnownLandmark('lady liberty')).toBe(true);
    });

    test('detects other landmarks', () => {
      expect(isKnownLandmark('big ben')).toBe(true);
      expect(isKnownLandmark('taj mahal')).toBe(true);
      expect(isKnownLandmark('pyramid')).toBe(true);
      expect(isKnownLandmark('colosseum')).toBe(true);
    });

    test('does not detect non-landmarks', () => {
      expect(isKnownLandmark('house')).toBe(false);
      expect(isKnownLandmark('castle')).toBe(false);
      expect(isKnownLandmark('modern building')).toBe(false);
      expect(isKnownLandmark('tower')).toBe(false); // Generic tower, not a landmark
    });
  });

  describe('Landmark Component Mapping', () => {
    test('eiffel tower maps to lattice_tower component', () => {
      const result = findLandmark('eiffel tower');
      expect(result).not.toBeNull();
      expect(result.config.components).toBeDefined();

      const towerComponent = result.config.components.find(c => c.type === 'lattice_tower');
      expect(towerComponent).toBeDefined();
      expect(towerComponent.params.taperRatio).toBeLessThan(0.3);
    });

    test('statue of liberty maps to statue_armature + platform', () => {
      const result = findLandmark('statue of liberty');
      expect(result).not.toBeNull();

      const components = result.config.components;
      expect(components.some(c => c.type === 'statue_armature')).toBe(true);
      expect(components.some(c => c.type === 'platform')).toBe(true);
    });

    test('big ben maps to room + tower_top', () => {
      const result = findLandmark('big ben');
      expect(result).not.toBeNull();

      const components = result.config.components;
      expect(components.some(c => c.type === 'room')).toBe(true);
      expect(components.some(c => c.type === 'tower_top')).toBe(true);
    });

    test('taj mahal maps to platform + room + roof_dome', () => {
      const result = findLandmark('taj mahal');
      expect(result).not.toBeNull();

      const components = result.config.components;
      expect(components.some(c => c.type === 'platform')).toBe(true);
      expect(components.some(c => c.type === 'room')).toBe(true);
      expect(components.some(c => c.type === 'roof_dome')).toBe(true);
    });

    test('pyramid uses legacy operation bridge', () => {
      const result = findLandmark('pyramid');
      expect(result).not.toBeNull();
      expect(result.config.useLegacyOperation).toBe('we_pyramid');
    });
  });

  describe('Scene Generation Integration', () => {
    test('generateFallbackScene produces landmark scene for eiffel', () => {
      const intent = {
        id: 'test-intent-1',
        intent: {
          category: 'landmark',
          reference: 'eiffel tower',
          scale: 'medium'
        },
        rawPrompt: 'build an eiffel tower'
      };

      const scene = sceneGenerator.generateFallbackScene(intent);

      expect(scene).toBeDefined();
      expect(scene.version).toBe('2.0');
      expect(scene.components).toBeDefined();

      // Should have lattice_tower component
      const tower = scene.components.find(c => c.type === 'lattice_tower');
      expect(tower).toBeDefined();
      expect(tower.params.taperRatio).toBeLessThan(0.3);
    });

    test('generateFallbackScene produces landmark scene for statue of liberty', () => {
      const intent = {
        id: 'test-intent-2',
        intent: {
          category: 'landmark',
          reference: 'statue of liberty',
          scale: 'medium'
        },
        rawPrompt: 'build statue of liberty'
      };

      const scene = sceneGenerator.generateFallbackScene(intent);

      expect(scene).toBeDefined();
      expect(scene.components.some(c => c.type === 'platform')).toBe(true);
      expect(scene.components.some(c => c.type === 'statue_armature')).toBe(true);
    });

    test('generateFallbackScene falls back gracefully for unknown landmarks', () => {
      const intent = {
        id: 'test-intent-3',
        intent: {
          category: 'landmark',
          reference: 'unknown monument',
          scale: 'medium'
        },
        rawPrompt: 'build unknown monument'
      };

      const scene = sceneGenerator.generateFallbackScene(intent);

      expect(scene).toBeDefined();
      expect(scene.components.length).toBeGreaterThan(0);
      // Should use generic landmark fallback (room + tower_top)
      expect(scene.components.some(c => c.type === 'room' || c.type === 'tower_top')).toBe(true);
    });

    test('scale parameter affects landmark dimensions', () => {
      const smallIntent = {
        id: 'test-small',
        intent: { category: 'landmark', reference: 'eiffel', scale: 'small' },
        rawPrompt: 'small eiffel tower'
      };

      const largeIntent = {
        id: 'test-large',
        intent: { category: 'landmark', reference: 'eiffel', scale: 'large' },
        rawPrompt: 'large eiffel tower'
      };

      const smallScene = sceneGenerator.generateFallbackScene(smallIntent);
      const largeScene = sceneGenerator.generateFallbackScene(largeIntent);

      // Large should have bigger bounds than small
      expect(largeScene.bounds.height).toBeGreaterThan(smallScene.bounds.height);
      expect(largeScene.bounds.width).toBeGreaterThan(smallScene.bounds.width);
    });
  });

  describe('Material Mapping', () => {
    test('eiffel tower uses iron-based materials', () => {
      const result = findLandmark('eiffel tower');
      const materials = result.config.materials;

      expect(materials.primary).toContain('iron');
    });

    test('statue of liberty uses copper-based materials', () => {
      const result = findLandmark('statue of liberty');
      const materials = result.config.materials;

      expect(materials.primary).toContain('copper');
    });

    test('pyramid uses sandstone materials', () => {
      const result = findLandmark('pyramid');
      const materials = result.config.materials;

      expect(materials.primary).toContain('sandstone');
    });
  });
});

describe('V2 Route Priority', () => {
  test('landmark detection has priority over V1 generic tower', () => {
    // "eiffel tower" should route to landmark, not generic "tower" type
    const landmarkMatch = findLandmark('eiffel tower');
    expect(landmarkMatch).not.toBeNull();
    expect(landmarkMatch.key).toBe('eiffel');

    // The config should have lattice_tower, not generic tower handling
    const hasLatticeTower = landmarkMatch.config.components?.some(
      c => c.type === 'lattice_tower'
    );
    expect(hasLatticeTower).toBe(true);
  });

  test('non-landmark towers do not match landmark registry', () => {
    expect(findLandmark('watch tower')).toBeNull();
    expect(findLandmark('bell tower')).toBeNull();
    expect(findLandmark('radio tower')).toBeNull();
  });
});

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { normalizeBlueprint, isUnresolvedPlaceholder } from '../../src/utils/normalizer.js';

/**
 * Palette Enforcement Tests
 * Tests for ensuring placeholder tokens are properly resolved and palette is correctly used
 */

describe('Palette Enforcement', () => {
  describe('Placeholder Resolution', () => {
    test('should reject blueprint with $secondary when not in palette', () => {
      const blueprint = {
        palette: { primary: 'stone' },  // No 'secondary' defined
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          { op: 'fill', block: '$secondary', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
        ]
      };

      const result = normalizeBlueprint(blueprint);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('$secondary'))).toBe(true);
    });

    test('should resolve $primary when defined in palette', () => {
      const blueprint = {
        palette: { primary: 'stone_bricks' },
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          { op: 'fill', block: '$primary', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
        ]
      };

      const result = normalizeBlueprint(blueprint);

      expect(result.errors).toHaveLength(0);
      expect(result.blueprint.steps[0].block).toBe('stone_bricks');
    });

    test('should reject multiple unresolved placeholders', () => {
      const blueprint = {
        palette: { primary: 'stone' },
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          { op: 'fill', block: '$secondary', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } },
          { op: 'fill', block: '$accent', from: { x: 2, y: 0, z: 0 }, to: { x: 3, y: 1, z: 1 } },
          { op: 'fill', block: '$roof', from: { x: 4, y: 0, z: 0 }, to: { x: 5, y: 1, z: 1 } }
        ]
      };

      const result = normalizeBlueprint(blueprint);

      expect(result.errors.length).toBe(3);
      expect(result.errors.some(e => e.includes('$secondary'))).toBe(true);
      expect(result.errors.some(e => e.includes('$accent'))).toBe(true);
      expect(result.errors.some(e => e.includes('$roof'))).toBe(true);
    });

    test('should reject unresolved placeholders in fallback blocks', () => {
      const blueprint = {
        palette: { primary: 'stone' },
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          {
            op: 'we_fill',
            block: 'stone',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 1, y: 1, z: 1 },
            fallback: { op: 'fill', block: '$accent' }
          }
        ]
      };

      const result = normalizeBlueprint(blueprint);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('$accent'))).toBe(true);
    });

    test('should handle custom placeholder tokens ($custom)', () => {
      const blueprint = {
        palette: { custom: 'diamond_block' },
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          { op: 'fill', block: '$custom', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
        ]
      };

      const result = normalizeBlueprint(blueprint);

      expect(result.errors).toHaveLength(0);
      expect(result.blueprint.steps[0].block).toBe('diamond_block');
    });
  });

  describe('Palette Usage Tracking', () => {
    test('should track when palette blocks are used', () => {
      const blueprint = {
        palette: { primary: 'stone', secondary: 'oak_planks', unused: 'cobblestone' },
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          { op: 'fill', block: '$primary', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } },
          { op: 'fill', block: '$secondary', from: { x: 2, y: 0, z: 0 }, to: { x: 3, y: 1, z: 1 } }
        ]
      };

      // Normalization should resolve both primary and secondary
      const result = normalizeBlueprint(blueprint);

      expect(result.blueprint.steps[0].block).toBe('stone');
      expect(result.blueprint.steps[1].block).toBe('oak_planks');
      // Note: 'unused' key detection would require a separate validation step
    });

    test('should allow direct block names not through placeholder', () => {
      const blueprint = {
        palette: { primary: 'stone' },
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          { op: 'fill', block: 'diamond_block', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
        ]
      };

      const result = normalizeBlueprint(blueprint);

      expect(result.errors).toHaveLength(0);
      expect(result.blueprint.steps[0].block).toBe('diamond_block');
    });
  });

  describe('Array Palette Handling', () => {
    test('should not resolve placeholders with array palette', () => {
      const blueprint = {
        palette: ['stone', 'oak_planks'],  // Array, not object
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          { op: 'fill', block: '$primary', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
        ]
      };

      const result = normalizeBlueprint(blueprint);

      // Should report error since array palettes can't resolve $tokens
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should normalize blocks in array palette', () => {
      const blueprint = {
        palette: ['oak_leaf', 'cobble'],
        size: { width: 5, height: 5, depth: 5 },
        steps: []
      };

      const result = normalizeBlueprint(blueprint);

      expect(result.blueprint.palette).toContain('oak_leaves');
      expect(result.blueprint.palette).toContain('cobblestone');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty palette object', () => {
      const blueprint = {
        palette: {},
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          { op: 'fill', block: '$primary', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
        ]
      };

      const result = normalizeBlueprint(blueprint);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle missing palette', () => {
      const blueprint = {
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
        ]
      };

      const result = normalizeBlueprint(blueprint);

      // Should still work for non-placeholder blocks
      expect(result.blueprint.steps[0].block).toBe('stone');
    });

    test('should preserve non-placeholder blocks in steps', () => {
      const blueprint = {
        palette: { primary: 'stone' },
        size: { width: 5, height: 5, depth: 5 },
        steps: [
          { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } },
          { op: 'fill', block: '$primary', from: { x: 2, y: 0, z: 0 }, to: { x: 3, y: 1, z: 1 } }
        ]
      };

      const result = normalizeBlueprint(blueprint);

      expect(result.blueprint.steps[0].block).toBe('stone');
      expect(result.blueprint.steps[1].block).toBe('stone');  // Resolved from $primary
    });
  });
});

describe('isUnresolvedPlaceholder utility', () => {
  test('should identify $-prefixed tokens', () => {
    expect(isUnresolvedPlaceholder('$primary')).toBe(true);
    expect(isUnresolvedPlaceholder('$foo_bar')).toBe(true);
    expect(isUnresolvedPlaceholder('$x')).toBe(true);
  });

  test('should not match regular blocks', () => {
    expect(isUnresolvedPlaceholder('stone')).toBe(false);
    expect(isUnresolvedPlaceholder('oak_planks')).toBe(false);
    expect(isUnresolvedPlaceholder('primary')).toBe(false);  // No $ prefix
    expect(isUnresolvedPlaceholder('$')).toBe(false);  // Just $, no identifier
  });
});

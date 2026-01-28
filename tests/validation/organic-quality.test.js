import { jest, describe, test, expect } from '@jest/globals';
import {
  validateTreeQuality,
  fixTreeQuality,
  isOrganicBuild
} from '../../src/validation/organic-quality.js';

describe('Organic Quality Validator', () => {
  describe('isOrganicBuild', () => {
    test('should identify tree builds as organic', () => {
      expect(isOrganicBuild({ buildType: 'tree' })).toBe(true);
      expect(isOrganicBuild({ buildType: 'Tree' })).toBe(true);
    });

    test('should identify plant builds as organic', () => {
      expect(isOrganicBuild({ buildType: 'plant' })).toBe(true);
    });

    test('should not identify house builds as organic', () => {
      expect(isOrganicBuild({ buildType: 'house' })).toBe(false);
      expect(isOrganicBuild({ buildType: 'castle' })).toBe(false);
    });
  });

  describe('validateTreeQuality', () => {
    test('should pass a well-designed tree blueprint', () => {
      const blueprint = {
        buildType: 'tree',
        size: { width: 10, height: 15, depth: 10 },
        palette: { trunk: 'oak_log', leaves: 'oak_leaves' },
        steps: [
          { op: 'we_fill', block: 'oak_log', from: { x: 4, y: 0, z: 4 }, to: { x: 5, y: 2, z: 5 } },
          { op: 'we_fill', block: 'oak_log', from: { x: 4, y: 2, z: 4 }, to: { x: 4, y: 8, z: 4 } },
          { op: 'we_fill', block: 'oak_leaves', from: { x: 2, y: 6, z: 2 }, to: { x: 7, y: 8, z: 7 } },
          { op: 'we_fill', block: 'oak_leaves', from: { x: 3, y: 9, z: 3 }, to: { x: 6, y: 10, z: 6 } }
        ]
      };

      const result = validateTreeQuality(blueprint);

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.7);
    });

    test('should flag trees using we_sphere for leaves', () => {
      const blueprint = {
        buildType: 'tree',
        size: { width: 10, height: 15, depth: 10 },
        palette: { trunk: 'oak_log', leaves: 'oak_leaves' },
        steps: [
          { op: 'we_fill', block: 'oak_log', from: { x: 4, y: 0, z: 4 }, to: { x: 4, y: 8, z: 4 } },
          { op: 'we_sphere', block: 'oak_leaves', center: { x: 4, y: 10, z: 4 }, radius: 4 }
        ]
      };

      const result = validateTreeQuality(blueprint);

      expect(result.checks.noUnnaturalGeometry.passed).toBe(false);
      expect(result.errors.some(e => e.includes('unnatural'))).toBe(true);
    });

    test('should flag trees using we_cylinder for trunk', () => {
      const blueprint = {
        buildType: 'tree',
        size: { width: 10, height: 15, depth: 10 },
        palette: { trunk: 'oak_log', leaves: 'oak_leaves' },
        steps: [
          { op: 'we_cylinder', block: 'oak_log', base: { x: 4, y: 0, z: 4 }, radius: 2, height: 10 },
          { op: 'we_fill', block: 'oak_leaves', from: { x: 2, y: 8, z: 2 }, to: { x: 7, y: 12, z: 7 } }
        ]
      };

      const result = validateTreeQuality(blueprint);

      expect(result.checks.noUnnaturalGeometry.passed).toBe(false);
    });

    test('should accept small trees with uniform trunk', () => {
      const blueprint = {
        buildType: 'tree',
        size: { width: 5, height: 10, depth: 5 },
        palette: { trunk: 'oak_log', leaves: 'oak_leaves' },
        steps: [
          { op: 'we_fill', block: 'oak_log', from: { x: 2, y: 0, z: 2 }, to: { x: 2, y: 5, z: 2 } },
          { op: 'we_fill', block: 'oak_leaves', from: { x: 1, y: 4, z: 1 }, to: { x: 3, y: 7, z: 3 } }
        ]
      };

      const result = validateTreeQuality(blueprint);

      expect(result.valid).toBe(true);
    });

    test('should suggest leaf variation when only one type used', () => {
      const blueprint = {
        buildType: 'tree',
        size: { width: 10, height: 15, depth: 10 },
        palette: { trunk: 'oak_log', leaves: 'oak_leaves' },
        steps: [
          { op: 'we_fill', block: 'oak_log', from: { x: 4, y: 0, z: 4 }, to: { x: 4, y: 8, z: 4 } },
          { op: 'we_fill', block: 'oak_leaves', from: { x: 2, y: 6, z: 2 }, to: { x: 7, y: 10, z: 7 } }
        ]
      };

      const result = validateTreeQuality(blueprint);

      expect(result.suggestions.some(s => s.includes('leaf variants'))).toBe(true);
    });
  });

  describe('fixTreeQuality', () => {
    test('should replace we_sphere leaves with multiple fills', () => {
      const blueprint = {
        buildType: 'tree',
        size: { width: 10, height: 15, depth: 10 },
        steps: [
          { op: 'we_sphere', block: 'oak_leaves', center: { x: 4, y: 10, z: 4 }, radius: 3 }
        ]
      };

      const fixed = fixTreeQuality(blueprint);

      // Should have replaced sphere with multiple fills
      expect(fixed.steps.some(s => s.op === 'we_sphere')).toBe(false);
      expect(fixed.steps.filter(s => s.op === 'we_fill').length).toBeGreaterThan(0);
    });

    test('should replace we_cylinder trunk with tapered fills', () => {
      const blueprint = {
        buildType: 'tree',
        size: { width: 10, height: 15, depth: 10 },
        steps: [
          { op: 'we_cylinder', block: 'oak_log', base: { x: 4, y: 0, z: 4 }, radius: 2, height: 8 }
        ]
      };

      const fixed = fixTreeQuality(blueprint);

      // Should have replaced cylinder with fills
      expect(fixed.steps.some(s => s.op === 'we_cylinder')).toBe(false);
      expect(fixed.steps.filter(s => s.op === 'we_fill' && s.block === 'oak_log').length).toBeGreaterThan(0);
    });

    test('should not modify non-organic operations', () => {
      const blueprint = {
        buildType: 'tree',
        size: { width: 10, height: 15, depth: 10 },
        steps: [
          { op: 'we_sphere', block: 'stone', center: { x: 4, y: 0, z: 4 }, radius: 2 },
          { op: 'we_fill', block: 'oak_log', from: { x: 4, y: 0, z: 4 }, to: { x: 4, y: 8, z: 4 } }
        ]
      };

      const fixed = fixTreeQuality(blueprint);

      // Stone sphere should remain (not leaves or trunk)
      expect(fixed.steps.some(s => s.op === 'we_sphere' && s.block === 'stone')).toBe(true);
    });
  });
});

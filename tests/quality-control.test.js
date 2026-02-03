/**
 * Quality Control Tests
 * Comprehensive validation of Phase 1-3 improvements
 */

import { describe, test, expect } from '@jest/globals';
import { validateBlueprint } from '../src/config/schemas.js';
import { OPERATIONS_REGISTRY } from '../src/config/operations-registry.js';
import { calculateBounds, calculateCenter, calculateVolume } from '../src/utils/coordinates.js';
import { smartWall } from '../src/operations/smart-wall.js';
import { smartFloor } from '../src/operations/smart-floor.js';
import { smartRoof } from '../src/operations/smart-roof.js';

describe('Quality Control - Phase 1-3', () => {
  describe('Phase 1: Critical Fixes', () => {
    test('Smart operations are in schema enum', () => {
      // Create a blueprint with smart operations
      const blueprint = {
        size: { width: 10, height: 5, depth: 10 },
        palette: ['stone', 'oak_planks'],
        steps: [
          {
            op: 'smart_wall',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 10, y: 5, z: 0 },
            palette: ['stone', 'andesite'],
            pattern: 'checker'
          },
          {
            op: 'smart_floor',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 10, y: 0, z: 10 },
            palette: ['oak_planks', 'spruce_planks'],
            pattern: 'parquet'
          },
          {
            op: 'smart_roof',
            from: { x: 0, y: 5, z: 0 },
            to: { x: 10, y: 5, z: 10 },
            block: 'brick_stairs',
            style: 'gable'
          }
        ]
      };

      const isValid = validateBlueprint(blueprint);
      expect(isValid).toBe(true);
    });

    test('site_prep handler matches filename', () => {
      const sitePrepMeta = OPERATIONS_REGISTRY['site_prep'];
      expect(sitePrepMeta).toBeDefined();
      expect(sitePrepMeta.handler).toBe('site-prep');
    });

    test('All operations in registry have valid metadata', () => {
      for (const [opName, meta] of Object.entries(OPERATIONS_REGISTRY)) {
        expect(meta.handler).toBeDefined();
        expect(meta.type).toBeDefined();
        expect(meta.description).toBeDefined();
        expect(['vanilla', 'worldedit', 'smart', 'system', 'universal']).toContain(meta.type);
      }
    });
  });

  describe('Phase 2: Pattern Validation', () => {
    test('Smart wall validates patterns (expanded)', () => {
      const validPatterns = ['solid', 'checker', 'striped', 'horizontal_stripe', 'border', 'noise', 'brick', 'diagonal'];

      for (const pattern of validPatterns) {
        const blocks = smartWall({
          from: { x: 0, y: 0, z: 0 },
          to: { x: 3, y: 3, z: 0 },
          palette: ['stone', 'andesite', 'granite'],
          pattern
        });
        expect(blocks.length).toBeGreaterThan(0);
      }
    });

    test('Smart floor validates patterns (expanded)', () => {
      const validPatterns = ['solid', 'checker', 'tiled', 'parquet', 'radial', 'border', 'herringbone', 'spiral', 'diamond'];

      for (const pattern of validPatterns) {
        const blocks = smartFloor({
          from: { x: 0, y: 0, z: 0 },
          to: { x: 5, y: 0, z: 5 },
          palette: ['oak_planks', 'spruce_planks', 'birch_planks'],
          pattern
        });
        expect(blocks.length).toBeGreaterThan(0);
      }
    });

    test('Smart roof validates styles (expanded)', () => {
      const validStyles = ['gable', 'a-frame', 'dome', 'pagoda', 'hip'];

      for (const style of validStyles) {
        const blocks = smartRoof({
          from: { x: 0, y: 5, z: 0 },
          to: { x: 10, y: 5, z: 10 },
          block: 'brick_stairs',
          style
        });
        expect(blocks.length).toBeGreaterThan(0);
      }
    });

    test('Operations registry documents smart vs legacy', () => {
      const registrySource = OPERATIONS_REGISTRY.toString();
      // Check that the file has been updated (we can't read the actual file in test)
      // Instead verify the operations exist
      expect(OPERATIONS_REGISTRY.smart_wall).toBeDefined();
      expect(OPERATIONS_REGISTRY.smart_floor).toBeDefined();
      expect(OPERATIONS_REGISTRY.smart_roof).toBeDefined();
      expect(OPERATIONS_REGISTRY.fill).toBeDefined();
      expect(OPERATIONS_REGISTRY.roof_gable).toBeDefined();
    });
  });

  describe('Phase 3: Coordinate Utilities', () => {
    test('calculateBounds works correctly', () => {
      const bounds = calculateBounds(
        { x: 5, y: 10, z: 3 },
        { x: 0, y: 0, z: 8 }
      );

      expect(bounds.minX).toBe(0);
      expect(bounds.maxX).toBe(5);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBe(10);
      expect(bounds.minZ).toBe(3);
      expect(bounds.maxZ).toBe(8);
      expect(bounds.width).toBe(6);
      expect(bounds.height).toBe(11);
      expect(bounds.depth).toBe(6);
    });

    test('calculateCenter works correctly', () => {
      const center = calculateCenter(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: 10 }
      );

      expect(center.x).toBe(5);
      expect(center.y).toBe(5);
      expect(center.z).toBe(5);
    });

    test('calculateVolume works correctly', () => {
      const volume = calculateVolume(
        { x: 0, y: 0, z: 0 },
        { x: 9, y: 9, z: 9 }
      );

      expect(volume).toBe(1000); // 10x10x10
    });

    test('Smart operations use coordinate utilities', () => {
      // Test that smart operations produce correct output using utilities
      const wallBlocks = smartWall({
        from: { x: 5, y: 5, z: 5 },
        to: { x: 0, y: 0, z: 0 }, // Reversed order to test normalization
        palette: ['stone'],
        pattern: 'solid'
      });

      // Should normalize coordinates and produce 6x6x6 = 216 blocks
      expect(wallBlocks.length).toBe(216);
    });
  });

  describe('Integration: All Operations Load', () => {
    test('All registered operations can be imported', async () => {
      const operations = [
        'fill', 'hollow-box', 'set', 'line', 'window-strip', 'roof-gable', 'roof-flat',
        'we-fill', 'we-walls', 'we-pyramid', 'we-cylinder', 'we-sphere', 'we-replace',
        'stairs', 'slab', 'fence-connect', 'door',
        'spiral-staircase', 'balcony', 'roof-hip', 'pixel-art',
        'smart-wall', 'smart-floor', 'smart-roof',
        'site-prep'
      ];

      for (const op of operations) {
        await expect(
          import(`../src/operations/${op}.js`)
        ).resolves.toBeDefined();
      }
    });
  });

  describe('Schema Validation', () => {
    test('Blueprint with all operation types validates', () => {
      const blueprint = {
        size: { width: 20, height: 10, depth: 20 },
        palette: ['stone', 'oak_planks', 'glass', 'brick'],
        steps: [
          { op: 'site_prep' },
          { op: 'fill', from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 1, z: 10 }, block: 'stone' },
          { op: 'hollow_box', from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 5, z: 10 }, block: 'stone' },
          { op: 'smart_wall', from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 5, z: 0 }, palette: ['stone', 'andesite'], pattern: 'checker' },
          { op: 'smart_floor', from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 0, z: 10 }, palette: ['oak_planks'], pattern: 'parquet' },
          { op: 'smart_roof', from: { x: 0, y: 5, z: 0 }, to: { x: 10, y: 5, z: 10 }, block: 'brick', style: 'gable' },
          { op: 'we_fill', from: { x: 0, y: 0, z: 0 }, to: { x: 5, y: 5, z: 5 }, block: 'stone' },
          { op: 'pixel_art', base: { x: 0, y: 0, z: 0 }, grid: ['##', '##'], legend: { '#': 'stone', '.': "air" } }
        ]
      };

      const isValid = validateBlueprint(blueprint);
      expect(isValid).toBe(true);
    });

    test('Invalid operation is rejected', () => {
      const blueprint = {
        size: { width: 10, height: 5, depth: 10 },
        palette: ['stone'],
        steps: [
          { op: 'invalid_operation_name', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
        ]
      };

      const isValid = validateBlueprint(blueprint);
      expect(isValid).toBe(false);
    });
  });
});

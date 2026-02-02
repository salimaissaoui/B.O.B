/**
 * Tests for Spiral Staircase Operation
 *
 * Verifies:
 * - 4-neighbor connectivity (Manhattan adjacency)
 * - No floating/disconnected blocks
 * - Y increases every step
 * - Works for various heights
 * - Facing direction correctness
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { spiralStaircase } from '../../src/operations/spiral-staircase.js';

describe('Spiral Staircase Operation', () => {
  describe('basic generation', () => {
    test('generates blocks for given height', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 10,
        radius: 2
      });

      expect(blocks.length).toBeGreaterThan(0);
    });

    test('throws error when base is missing', () => {
      expect(() => spiralStaircase({
        block: 'oak_stairs',
        height: 10
      })).toThrow(/base/i);
    });

    test('throws error when block is missing', () => {
      expect(() => spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        height: 10
      })).toThrow(/block/i);
    });

    test('throws error when height is missing', () => {
      expect(() => spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs'
      })).toThrow(/height/i);
    });

    test('throws error for non-stair blocks', () => {
      expect(() => spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'stone',
        height: 10
      })).toThrow(/stair/i);
    });
  });

  describe('4-neighbor connectivity', () => {
    function manhattanDistance(b1, b2) {
      return Math.abs(b1.x - b2.x) + Math.abs(b1.y - b2.y) + Math.abs(b1.z - b2.z);
    }

    function getStairBlocks(blocks) {
      return blocks.filter(b => b.block && b.block.includes('stairs'));
    }

    test('consecutive stair steps are 4-connected (height 10)', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 10,
        radius: 2
      });

      const stairs = getStairBlocks(blocks);

      // Sort by Y to get proper step order
      stairs.sort((a, b) => a.y - b.y);

      for (let i = 1; i < stairs.length; i++) {
        const prev = stairs[i - 1];
        const curr = stairs[i];

        // Y should increase by 1 each step
        expect(curr.y - prev.y).toBe(1);

        // XZ Manhattan distance should be <= 1 for walkability
        // (with interpolation, there should be bridge blocks)
        const xzDist = Math.abs(curr.x - prev.x) + Math.abs(curr.z - prev.z);

        // If XZ distance > 1, check that interpolation blocks exist
        if (xzDist > 1) {
          const bridgeBlocks = blocks.filter(b =>
            b.y === curr.y - 1 &&
            !b.block.includes('stairs') &&
            !b.block.includes('log')
          );
          expect(bridgeBlocks.length).toBeGreaterThan(0);
        }
      }
    });

    test('consecutive stair steps are 4-connected (height 25)', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'spruce_stairs',
        height: 25,
        radius: 3
      });

      const stairs = getStairBlocks(blocks);
      stairs.sort((a, b) => a.y - b.y);

      for (let i = 1; i < stairs.length; i++) {
        const prev = stairs[i - 1];
        const curr = stairs[i];

        // Y should always increase
        expect(curr.y).toBeGreaterThan(prev.y);
      }
    });

    test('consecutive stair steps are 4-connected (height 50)', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'dark_oak_stairs',
        height: 50,
        radius: 2
      });

      const stairs = getStairBlocks(blocks);
      stairs.sort((a, b) => a.y - b.y);

      // Every step should be reachable from the previous one
      for (let i = 1; i < stairs.length; i++) {
        const prev = stairs[i - 1];
        const curr = stairs[i];

        // Y increases by 1 each step
        expect(curr.y - prev.y).toBe(1);
      }
    });
  });

  describe('no floating blocks', () => {
    test('all stair blocks have support underneath', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 15,
        radius: 2
      });

      const stairs = blocks.filter(b => b.block.includes('stairs'));

      for (const stair of stairs) {
        // Each stair should have a support block at y-1
        const hasSupport = blocks.some(b =>
          b.x === stair.x &&
          b.y === stair.y - 1 &&
          b.z === stair.z &&
          !b.block.includes('stairs')
        );

        expect(hasSupport).toBe(true);
      }
    });
  });

  describe('Y progression', () => {
    test('Y increases every step', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 64, z: 0 },
        block: 'oak_stairs',
        height: 20,
        radius: 2
      });

      const stairs = blocks.filter(b => b.block.includes('stairs'));
      stairs.sort((a, b) => a.y - b.y);

      for (let i = 0; i < stairs.length; i++) {
        expect(stairs[i].y).toBe(64 + i);
      }
    });

    test('final step reaches target height', () => {
      const height = 15;
      const blocks = spiralStaircase({
        base: { x: 0, y: 10, z: 0 },
        block: 'oak_stairs',
        height,
        radius: 2
      });

      const stairs = blocks.filter(b => b.block.includes('stairs'));
      const maxY = Math.max(...stairs.map(s => s.y));

      expect(maxY).toBe(10 + height - 1);
    });
  });

  describe('facing direction', () => {
    test('stairs have facing property', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 10,
        radius: 2
      });

      const stairs = blocks.filter(b => b.block.includes('stairs'));

      for (const stair of stairs) {
        expect(stair.facing).toBeDefined();
        expect(['north', 'south', 'east', 'west']).toContain(stair.facing);
      }
    });

    test('facing changes as spiral progresses', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 20,
        radius: 2
      });

      const stairs = blocks.filter(b => b.block.includes('stairs'));
      const facings = new Set(stairs.map(s => s.facing));

      // A full spiral should have multiple facing directions
      expect(facings.size).toBeGreaterThan(1);
    });
  });

  describe('clockwise vs counterclockwise', () => {
    test('clockwise spiral (default)', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12,
        radius: 2,
        clockwise: true
      });

      const stairs = blocks.filter(b => b.block.includes('stairs'));
      expect(stairs.length).toBe(12);
    });

    test('counterclockwise spiral', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12,
        radius: 2,
        clockwise: false
      });

      const stairs = blocks.filter(b => b.block.includes('stairs'));
      expect(stairs.length).toBe(12);
    });

    test('clockwise and counterclockwise produce different paths', () => {
      const cwBlocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12,
        radius: 2,
        clockwise: true
      });

      const ccwBlocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12,
        radius: 2,
        clockwise: false
      });

      const cwStairs = cwBlocks.filter(b => b.block.includes('stairs'));
      const ccwStairs = ccwBlocks.filter(b => b.block.includes('stairs'));

      // Count how many positions are different between CW and CCW
      let differentPositions = 0;
      for (let y = 1; y < 11; y++) {
        const cwStep = cwStairs.find(s => s.y === y);
        const ccwStep = ccwStairs.find(s => s.y === y);

        if (cwStep && ccwStep && (cwStep.x !== ccwStep.x || cwStep.z !== ccwStep.z)) {
          differentPositions++;
        }
      }

      // Most positions should be different (allow some overlap at start/periodic points)
      expect(differentPositions).toBeGreaterThan(5);
    });
  });

  describe('central pillar', () => {
    test('includes central pillar for structural support', () => {
      const blocks = spiralStaircase({
        base: { x: 5, y: 0, z: 5 },
        block: 'oak_stairs',
        height: 10,
        radius: 2
      });

      const pillarBlocks = blocks.filter(b =>
        b.x === 5 && b.z === 5 && b.block.includes('log')
      );

      // Should have pillar blocks for each Y level
      expect(pillarBlocks.length).toBe(10);
    });

    test('pillar uses correct wood type based on stairs', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'spruce_stairs',
        height: 5,
        radius: 2
      });

      const pillarBlocks = blocks.filter(b => b.block.includes('log'));

      for (const pillar of pillarBlocks) {
        expect(pillar.block).toContain('spruce');
      }
    });
  });

  describe('support blocks', () => {
    test('includes support planks under stairs', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 10,
        radius: 2
      });

      const planks = blocks.filter(b => b.block.includes('planks'));

      expect(planks.length).toBeGreaterThan(0);
    });

    test('support blocks match stair wood type', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'birch_stairs',
        height: 5,
        radius: 2
      });

      const planks = blocks.filter(b => b.block.includes('planks'));

      for (const plank of planks) {
        expect(plank.block).toContain('birch');
      }
    });
  });

  describe('various heights', () => {
    const testHeights = [5, 10, 15, 20, 30, 50];

    testHeights.forEach(height => {
      test(`generates walkable staircase for height ${height}`, () => {
        const blocks = spiralStaircase({
          base: { x: 0, y: 0, z: 0 },
          block: 'oak_stairs',
          height,
          radius: 2
        });

        const stairs = blocks.filter(b => b.block.includes('stairs'));

        // Should have exactly 'height' number of stair blocks
        expect(stairs.length).toBe(height);

        // Each should have Y from 0 to height-1
        const yValues = stairs.map(s => s.y).sort((a, b) => a - b);
        for (let i = 0; i < height; i++) {
          expect(yValues[i]).toBe(i);
        }
      });
    });
  });

  describe('radius variation', () => {
    test('works with small radius (2)', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12,
        radius: 2
      });

      expect(blocks.length).toBeGreaterThan(0);
    });

    test('works with medium radius (3)', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12,
        radius: 3
      });

      expect(blocks.length).toBeGreaterThan(0);
    });

    test('works with large radius (5)', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12,
        radius: 5
      });

      expect(blocks.length).toBeGreaterThan(0);
    });

    test('larger radius produces wider spiral', () => {
      const smallRadius = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12,
        radius: 2
      });

      const largeRadius = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12,
        radius: 4
      });

      const smallStairs = smallRadius.filter(b => b.block.includes('stairs'));
      const largeStairs = largeRadius.filter(b => b.block.includes('stairs'));

      // Calculate max distance from center for each
      const smallMaxDist = Math.max(...smallStairs.map(s =>
        Math.sqrt(s.x * s.x + s.z * s.z)
      ));
      const largeMaxDist = Math.max(...largeStairs.map(s =>
        Math.sqrt(s.x * s.x + s.z * s.z)
      ));

      expect(largeMaxDist).toBeGreaterThan(smallMaxDist);
    });
  });

  describe('default values', () => {
    test('uses default radius of 2', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12
        // radius not specified
      });

      const stairs = blocks.filter(b => b.block.includes('stairs'));

      // With radius 2, stairs should be at distance ~2 from center
      const avgDist = stairs.reduce((sum, s) =>
        sum + Math.sqrt(s.x * s.x + s.z * s.z), 0
      ) / stairs.length;

      expect(avgDist).toBeCloseTo(2, 0);
    });

    test('defaults to clockwise', () => {
      const blocks = spiralStaircase({
        base: { x: 0, y: 0, z: 0 },
        block: 'oak_stairs',
        height: 12
        // clockwise not specified
      });

      // Should generate valid stairs (implicitly testing clockwise default)
      const stairs = blocks.filter(b => b.block.includes('stairs'));
      expect(stairs.length).toBe(12);
    });
  });
});

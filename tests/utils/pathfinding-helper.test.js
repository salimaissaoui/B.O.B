/**
 * Tests for Pathfinding Helper
 */

import {
  calculateDistance,
  isInRange,
  calculateApproachPosition,
  PathfindingHelper
} from '../../src/utils/pathfinding-helper.js';

describe('Pathfinding Helper', () => {
  describe('calculateDistance', () => {
    test('calculates distance between two positions', () => {
      const pos1 = { x: 0, y: 0, z: 0 };
      const pos2 = { x: 3, y: 4, z: 0 };
      const distance = calculateDistance(pos1, pos2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    test('calculates zero distance for same position', () => {
      const pos = { x: 10, y: 20, z: 30 };
      const distance = calculateDistance(pos, pos);
      expect(distance).toBe(0);
    });

    test('calculates distance in 3D space', () => {
      const pos1 = { x: 0, y: 0, z: 0 };
      const pos2 = { x: 1, y: 1, z: 1 };
      const distance = calculateDistance(pos1, pos2);
      expect(distance).toBeCloseTo(Math.sqrt(3), 5);
    });
  });

  describe('isInRange', () => {
    test('returns true when within default range', () => {
      const botPos = { x: 0, y: 0, z: 0 };
      const targetPos = { x: 3, y: 0, z: 0 };
      expect(isInRange(botPos, targetPos)).toBe(true); // 3 blocks away
    });

    test('returns false when outside default range', () => {
      const botPos = { x: 0, y: 0, z: 0 };
      const targetPos = { x: 5, y: 0, z: 0 };
      expect(isInRange(botPos, targetPos)).toBe(false); // 5 blocks away
    });

    test('respects custom range parameter', () => {
      const botPos = { x: 0, y: 0, z: 0 };
      const targetPos = { x: 7, y: 0, z: 0 };
      expect(isInRange(botPos, targetPos, 10)).toBe(true); // Custom range 10
      expect(isInRange(botPos, targetPos, 5)).toBe(false); // Custom range 5
    });

    test('returns true when exactly at range boundary', () => {
      const botPos = { x: 0, y: 0, z: 0 };
      const targetPos = { x: 4, y: 0, z: 0 };
      expect(isInRange(botPos, targetPos, 4)).toBe(true);
    });
  });

  describe('calculateApproachPosition', () => {
    test('returns current position when already in range', () => {
      const targetPos = { x: 10, y: 64, z: 10 };
      const currentPos = { x: 12, y: 64, z: 10 };
      const result = calculateApproachPosition(targetPos, currentPos);
      expect(result).toEqual(currentPos);
    });

    test('calculates approach position when far away', () => {
      const targetPos = { x: 0, y: 64, z: 0 };
      const currentPos = { x: 10, y: 64, z: 0 };
      const result = calculateApproachPosition(targetPos, currentPos);
      
      // Should be closer to target than current position
      const distanceBefore = calculateDistance(targetPos, currentPos);
      const distanceAfter = calculateDistance(targetPos, result);
      expect(distanceAfter).toBeLessThan(distanceBefore);
      
      // Should be approximately at placement range (within 4 blocks)
      expect(distanceAfter).toBeLessThanOrEqual(4);
      expect(distanceAfter).toBeGreaterThan(2); // But not too close
    });

    test('floors the calculated position', () => {
      const targetPos = { x: 0, y: 64, z: 0 };
      const currentPos = { x: 10, y: 64, z: 0 };
      const result = calculateApproachPosition(targetPos, currentPos);
      
      expect(Number.isInteger(result.x)).toBe(true);
      expect(Number.isInteger(result.y)).toBe(true);
      expect(Number.isInteger(result.z)).toBe(true);
    });
  });

  describe('PathfindingHelper class', () => {
    test('checks if bot is in range', () => {
      const bot = {
        entity: {
          position: { x: 0, y: 64, z: 0 }
        }
      };
      const helper = new PathfindingHelper(bot);
      
      const nearTarget = { x: 3, y: 64, z: 0 };
      const farTarget = { x: 10, y: 64, z: 0 };
      
      expect(helper.isInRange(nearTarget)).toBe(true);
      expect(helper.isInRange(farTarget)).toBe(false);
    });

    test('calculates distance to target', () => {
      const bot = {
        entity: {
          position: { x: 0, y: 64, z: 0 }
        }
      };
      const helper = new PathfindingHelper(bot);
      
      const target = { x: 3, y: 64, z: 4 };
      const distance = helper.getDistanceToTarget(target);
      expect(distance).toBe(5);
    });

    test('returns infinity when bot has no position', () => {
      const bot = {};
      const helper = new PathfindingHelper(bot);
      
      const target = { x: 0, y: 0, z: 0 };
      const distance = helper.getDistanceToTarget(target);
      expect(distance).toBe(Infinity);
    });

    test('checks pathfinder availability', () => {
      const botWithPathfinder = {
        pathfinder: {}
      };
      const botWithoutPathfinder = {};
      
      const helper1 = new PathfindingHelper(botWithPathfinder);
      const helper2 = new PathfindingHelper(botWithoutPathfinder);
      
      expect(helper1.isAvailable()).toBe(true);
      expect(helper2.isAvailable()).toBe(false);
    });

    test('handles missing bot entity gracefully', () => {
      const bot = {};
      const helper = new PathfindingHelper(bot);
      
      const target = { x: 0, y: 0, z: 0 };
      expect(helper.isInRange(target)).toBe(false);
    });
  });
});

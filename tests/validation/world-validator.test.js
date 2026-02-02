import {
  validateBuildArea,
  validateYBoundaries,
  safeBlockAt,
  scanTerrainFootprint
} from '../../src/validation/world-validator.js';

describe('world-validator', () => {
  describe('validateYBoundaries', () => {
    test('clamps below world minimum', () => {
      const result = validateYBoundaries({ x: 0, y: -70, z: 0 }, { width: 5, height: 10, depth: 5 });
      expect(result.clamped).toBe(true);
      expect(result.clampedHeight).toBe(4);
      expect(result.warning).toContain('below world minimum');
    });

    test('clamps above world maximum', () => {
      const result = validateYBoundaries({ x: 0, y: 318, z: 0 }, { width: 5, height: 10, depth: 5 });
      expect(result.clamped).toBe(true);
      expect(result.clampedHeight).toBe(3);
      expect(result.warning).toContain('above world maximum');
    });

    test('clamps both ends for oversized builds', () => {
      const result = validateYBoundaries({ x: 0, y: -70, z: 0 }, { width: 5, height: 400, depth: 5 });
      expect(result.clamped).toBe(true);
      expect(result.clampedHeight).toBe(385);
      expect(result.warning).toContain('below world minimum');
      expect(result.warning).toContain('above world maximum');
    });
  });

  describe('validateBuildArea', () => {
    test('marks build invalid when most chunks are unloaded', () => {
      const loaded = new Set(['0,0']);
      const bot = {
        world: {
          getColumn: (cx, cz) => (loaded.has(`${cx},${cz}`) ? {} : null)
        }
      };

      const result = validateBuildArea(bot, { x: 0, y: 64, z: 0 }, { width: 32, height: 10, depth: 32 });
      expect(result.valid).toBe(false);
      expect(result.warnings.some(warning => warning.includes('More than 50%'))).toBe(true);
    });

    test('warns but allows build when some chunks are unloaded', () => {
      const loaded = new Set(['0,0', '0,1']);
      const bot = {
        world: {
          getColumn: (cx, cz) => (loaded.has(`${cx},${cz}`) ? {} : null)
        }
      };

      const result = validateBuildArea(bot, { x: 0, y: 64, z: 0 }, { width: 32, height: 10, depth: 32 });
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('chunks loaded'))).toBe(true);
    });
  });

  describe('safeBlockAt', () => {
    test('returns null for out-of-bounds Y', () => {
      const bot = { blockAt: () => ({ name: 'stone' }) };
      const result = safeBlockAt(bot, { x: 0, y: 400, z: 0 });
      expect(result).toBeNull();
    });

    test('returns null when chunk is unloaded', () => {
      const bot = {
        world: {
          getColumn: () => null
        },
        blockAt: () => ({ name: 'stone' })
      };
      const result = safeBlockAt(bot, { x: 0, y: 64, z: 0 });
      expect(result).toBeNull();
    });

    test('returns block when available', () => {
      const bot = {
        blockAt: () => ({ name: 'stone' })
      };
      const result = safeBlockAt(bot, { x: 1, y: 64, z: 1 });
      expect(result).toEqual({ name: 'stone' });
    });
  });

  describe('scanTerrainFootprint', () => {
    test('returns warning when no ground found', () => {
      const bot = {
        blockAt: () => ({ name: 'air' })
      };

      const result = scanTerrainFootprint(bot, { x: 0, y: 10, z: 0 }, { width: 5, depth: 5, height: 5 });
      expect(result.groundFound).toBe(false);
      expect(result.warning).toContain('No solid ground found');
    });

    test('snaps to highest ground when found', () => {
      const bot = {
        blockAt: ({ y }) => (y <= 5 ? { name: 'stone' } : { name: 'air' })
      };

      const result = scanTerrainFootprint(bot, { x: 0, y: 10, z: 0 }, { width: 5, depth: 5, height: 5 });
      expect(result.groundFound).toBe(true);
      expect(result.snapY).toBe(6);
      expect(result.isFlat).toBe(true);
    });
  });
});

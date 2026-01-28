import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import {
  normalizeBlockName,
  coerceHollow,
  isUnresolvedPlaceholder,
  normalizeBlueprint,
  BLOCK_ALIASES,
  PLACEHOLDER_TOKENS
} from '../../src/utils/normalizer.js';

/**
 * Normalizer Tests
 * Tests for block name normalization, hollow coercion, and placeholder detection
 */

describe('normalizeBlockName', () => {
  test('should remove minecraft: prefix', () => {
    expect(normalizeBlockName('minecraft:stone')).toBe('stone');
    expect(normalizeBlockName('minecraft:oak_planks')).toBe('oak_planks');
  });

  test('should normalize leaf variants (singular to plural)', () => {
    expect(normalizeBlockName('oak_leaf')).toBe('oak_leaves');
    expect(normalizeBlockName('spruce_leaf')).toBe('spruce_leaves');
    expect(normalizeBlockName('birch_leaf')).toBe('birch_leaves');
    expect(normalizeBlockName('jungle_leaf')).toBe('jungle_leaves');
    expect(normalizeBlockName('acacia_leaf')).toBe('acacia_leaves');
    expect(normalizeBlockName('dark_oak_leaf')).toBe('dark_oak_leaves');
    expect(normalizeBlockName('cherry_leaf')).toBe('cherry_leaves');
    expect(normalizeBlockName('mangrove_leaf')).toBe('mangrove_leaves');
  });

  test('should normalize common typos and shortcuts', () => {
    expect(normalizeBlockName('cobble')).toBe('cobblestone');
    expect(normalizeBlockName('stone_brick')).toBe('stone_bricks');
    expect(normalizeBlockName('oakplanks')).toBe('oak_planks');
    expect(normalizeBlockName('oak_plank')).toBe('oak_planks');
    expect(normalizeBlockName('glass_block')).toBe('glass');
  });

  test('should normalize generic block names', () => {
    expect(normalizeBlockName('grass')).toBe('grass_block');
    expect(normalizeBlockName('wood')).toBe('oak_log');
    expect(normalizeBlockName('planks')).toBe('oak_planks');
    expect(normalizeBlockName('brick')).toBe('bricks');
  });

  test('should pass through valid block names unchanged', () => {
    expect(normalizeBlockName('stone')).toBe('stone');
    expect(normalizeBlockName('oak_planks')).toBe('oak_planks');
    expect(normalizeBlockName('oak_leaves')).toBe('oak_leaves');
  });

  test('should handle null and undefined gracefully', () => {
    expect(normalizeBlockName(null)).toBe(null);
    expect(normalizeBlockName(undefined)).toBe(undefined);
  });

  test('should be case-insensitive for aliases', () => {
    expect(normalizeBlockName('Oak_Leaf')).toBe('oak_leaves');
    expect(normalizeBlockName('COBBLE')).toBe('cobblestone');
  });
});

describe('coerceHollow', () => {
  test('should return boolean true for string "true"', () => {
    expect(coerceHollow('true')).toBe(true);
    expect(coerceHollow('TRUE')).toBe(true);
    expect(coerceHollow('True')).toBe(true);
  });

  test('should return boolean false for string "false"', () => {
    expect(coerceHollow('false')).toBe(false);
    expect(coerceHollow('FALSE')).toBe(false);
    expect(coerceHollow('False')).toBe(false);
  });

  test('should pass through boolean values unchanged', () => {
    expect(coerceHollow(true)).toBe(true);
    expect(coerceHollow(false)).toBe(false);
  });

  test('should return false for undefined/null/other', () => {
    expect(coerceHollow(undefined)).toBe(false);
    expect(coerceHollow(null)).toBe(false);
    expect(coerceHollow('invalid')).toBe(false);
    expect(coerceHollow(123)).toBe(false);
  });
});

describe('isUnresolvedPlaceholder', () => {
  test('should detect standard placeholder tokens', () => {
    expect(isUnresolvedPlaceholder('$primary')).toBe(true);
    expect(isUnresolvedPlaceholder('$secondary')).toBe(true);
    expect(isUnresolvedPlaceholder('$accent')).toBe(true);
    expect(isUnresolvedPlaceholder('$roof')).toBe(true);
    expect(isUnresolvedPlaceholder('$window')).toBe(true);
    expect(isUnresolvedPlaceholder('$floor')).toBe(true);
    expect(isUnresolvedPlaceholder('$door')).toBe(true);
    expect(isUnresolvedPlaceholder('$trim')).toBe(true);
  });

  test('should detect any $token pattern', () => {
    expect(isUnresolvedPlaceholder('$custom')).toBe(true);
    expect(isUnresolvedPlaceholder('$anytoken')).toBe(true);
  });

  test('should return false for regular block names', () => {
    expect(isUnresolvedPlaceholder('stone')).toBe(false);
    expect(isUnresolvedPlaceholder('oak_planks')).toBe(false);
    expect(isUnresolvedPlaceholder('primary')).toBe(false);  // No $ prefix
  });

  test('should return false for null/undefined', () => {
    expect(isUnresolvedPlaceholder(null)).toBe(false);
    expect(isUnresolvedPlaceholder(undefined)).toBe(false);
  });
});

describe('normalizeBlueprint', () => {
  test('should normalize block names in array palette', () => {
    const blueprint = {
      palette: ['oak_leaf', 'cobble', 'minecraft:stone'],
      size: { width: 5, height: 5, depth: 5 },
      steps: []
    };

    const result = normalizeBlueprint(blueprint);

    expect(result.blueprint.palette).toContain('oak_leaves');
    expect(result.blueprint.palette).toContain('cobblestone');
    expect(result.blueprint.palette).toContain('stone');
    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  test('should normalize block names in object palette', () => {
    const blueprint = {
      palette: { primary: 'oak_leaf', secondary: 'cobble' },
      size: { width: 5, height: 5, depth: 5 },
      steps: []
    };

    const result = normalizeBlueprint(blueprint);

    expect(result.blueprint.palette.primary).toBe('oak_leaves');
    expect(result.blueprint.palette.secondary).toBe('cobblestone');
  });

  test('should normalize block names in steps', () => {
    const blueprint = {
      palette: ['stone'],
      size: { width: 5, height: 5, depth: 5 },
      steps: [
        { op: 'fill', block: 'oak_leaf', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
      ]
    };

    const result = normalizeBlueprint(blueprint);

    expect(result.blueprint.steps[0].block).toBe('oak_leaves');
    expect(result.changes).toContain("Step 0 block: 'oak_leaf' → 'oak_leaves'");
  });

  test('should coerce hollow strings to booleans in steps', () => {
    const blueprint = {
      palette: ['stone'],
      size: { width: 5, height: 5, depth: 5 },
      steps: [
        { op: 'hollow_box', block: 'stone', hollow: 'true', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
      ]
    };

    const result = normalizeBlueprint(blueprint);

    expect(result.blueprint.steps[0].hollow).toBe(true);
  });

  test('should resolve placeholders from object palette', () => {
    const blueprint = {
      palette: { primary: 'stone', secondary: 'oak_planks' },
      size: { width: 5, height: 5, depth: 5 },
      steps: [
        { op: 'fill', block: '$primary', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } },
        { op: 'fill', block: '$secondary', from: { x: 2, y: 0, z: 0 }, to: { x: 3, y: 1, z: 1 } }
      ]
    };

    const result = normalizeBlueprint(blueprint);

    expect(result.blueprint.steps[0].block).toBe('stone');
    expect(result.blueprint.steps[1].block).toBe('oak_planks');
    expect(result.errors).toHaveLength(0);
  });

  test('should report error for unresolved placeholders', () => {
    const blueprint = {
      palette: { primary: 'stone' },  // No 'secondary' key
      size: { width: 5, height: 5, depth: 5 },
      steps: [
        { op: 'fill', block: '$secondary', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
      ]
    };

    const result = normalizeBlueprint(blueprint);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('$secondary');
    expect(result.errors[0]).toContain('not found in palette');
  });

  test('should normalize fallback blocks', () => {
    const blueprint = {
      palette: ['stone', 'cobblestone'],
      size: { width: 5, height: 5, depth: 5 },
      steps: [
        {
          op: 'we_fill',
          block: 'stone',
          from: { x: 0, y: 0, z: 0 },
          to: { x: 1, y: 1, z: 1 },
          fallback: { op: 'fill', block: 'oak_leaf' }
        }
      ]
    };

    const result = normalizeBlueprint(blueprint);

    expect(result.blueprint.steps[0].fallback.block).toBe('oak_leaves');
  });

  test('should handle null blueprint gracefully', () => {
    const result = normalizeBlueprint(null);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('null');
  });

  test('should not mutate the original blueprint', () => {
    const original = {
      palette: ['oak_leaf'],
      size: { width: 5, height: 5, depth: 5 },
      steps: [
        { op: 'fill', block: 'cobble', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } }
      ]
    };

    const originalJson = JSON.stringify(original);
    normalizeBlueprint(original);

    expect(JSON.stringify(original)).toBe(originalJson);
  });
});

describe('BLOCK_ALIASES', () => {
  test('should have all leaf variants', () => {
    const leafTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'cherry', 'mangrove'];
    for (const type of leafTypes) {
      expect(BLOCK_ALIASES[`${type}_leaf`]).toBe(`${type}_leaves`);
    }
  });
});

describe('PLACEHOLDER_TOKENS', () => {
  test('should include standard tokens', () => {
    const standardTokens = ['$primary', '$secondary', '$accent', '$roof', '$window', '$floor', '$door', '$trim', '$base', '$detail'];
    for (const token of standardTokens) {
      expect(PLACEHOLDER_TOKENS).toContain(token);
    }
  });
});

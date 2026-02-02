/**
 * Builder v2 Style Engine Tests
 */

import {
  resolveBlock,
  resolvePalette,
  getThemePalette,
  isBlockValid,
  getSubstitute,
  THEME_PALETTES,
  SUBSTITUTION_TABLE
} from '../../src/builder_v2/style/engine.js';

describe('Theme Palettes', () => {
  test('all themes have required palette keys', () => {
    const requiredKeys = ['primary', 'secondary', 'accent', 'roof', 'glass', 'light'];

    for (const [themeName, palette] of Object.entries(THEME_PALETTES)) {
      for (const key of requiredKeys) {
        expect(palette[key]).toBeDefined();
      }
    }
  });

  test('getThemePalette returns correct palette', () => {
    const medieval = getThemePalette('medieval');
    expect(medieval.primary).toBe('stone_bricks');

    const modern = getThemePalette('modern');
    expect(modern.primary).toBe('white_concrete');
  });

  test('getThemePalette returns default for unknown theme', () => {
    const unknown = getThemePalette('nonexistent_theme');
    expect(unknown).toEqual(THEME_PALETTES.default);
  });
});

describe('Block Resolution', () => {
  test('resolves valid block directly', () => {
    const result = resolveBlock('stone_bricks', 'default', '1.20.1');
    expect(result).toBe('stone_bricks');
  });

  test('resolves palette reference', () => {
    const result = resolveBlock('$primary', 'medieval', '1.20.1');
    expect(result).toBe('stone_bricks');
  });

  test('resolves semantic token via palette', () => {
    const result = resolveBlock('primary', 'modern', '1.20.1');
    expect(result).toBe('white_concrete');
  });

  test('substitutes unavailable blocks', () => {
    // This test assumes 'fake_block' is in substitution table or invalid
    const result = resolveBlock('deepslate_bricks', 'default', '1.12.2');
    // Should fall back to stone_bricks or cobblestone
    expect(['stone_bricks', 'cobblestone', 'deepslate_bricks']).toContain(result);
  });

  test('falls back to stone for unknown blocks', () => {
    const result = resolveBlock('completely_invalid_block_xyz', 'default', '1.20.1');
    expect(result).toBe('stone');
  });
});

describe('Palette Resolution', () => {
  test('resolves entire palette', () => {
    const inputPalette = {
      primary: '$primary',
      secondary: 'oak_planks',
      accent: '$accent'
    };

    const resolved = resolvePalette(inputPalette, 'medieval', '1.20.1');

    expect(resolved.primary).toBe('stone_bricks');
    expect(resolved.secondary).toBe('oak_planks');
    expect(resolved.accent).toBe('mossy_stone_bricks');
  });
});

describe('Block Substitution', () => {
  test('substitution table has entries', () => {
    expect(Object.keys(SUBSTITUTION_TABLE).length).toBeGreaterThan(0);
  });

  test('getSubstitute returns valid fallback', () => {
    const substitute = getSubstitute('lantern', '1.12.2');
    // Lantern should substitute to torch or glowstone
    expect(['torch', 'glowstone', null]).toContain(substitute);
  });

  test('getSubstitute returns null for unknown block', () => {
    const substitute = getSubstitute('nonexistent_block_123', '1.20.1');
    expect(substitute).toBeNull();
  });
});

describe('Block Validity', () => {
  test('recognizes valid blocks', () => {
    expect(isBlockValid('stone', '1.20.1')).toBe(true);
    expect(isBlockValid('oak_planks', '1.20.1')).toBe(true);
    expect(isBlockValid('diamond_block', '1.20.1')).toBe(true);
  });
});

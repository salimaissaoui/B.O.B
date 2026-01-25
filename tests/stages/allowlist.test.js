import { isValidBlock } from '../../src/config/blocks.js';

/**
 * Block validation tests
 * Note: The allowlist derivation stage was removed in the 5→3 pipeline refactor.
 * These tests now focus on block validation which is still used by the validator.
 */

describe('Block Validation', () => {
  test('should validate common Minecraft blocks', () => {
    expect(isValidBlock('oak_planks')).toBe(true);
    expect(isValidBlock('stone')).toBe(true);
    expect(isValidBlock('glass')).toBe(true);
    expect(isValidBlock('glass_pane')).toBe(true);
  });

  test('should validate newly added blocks', () => {
    expect(isValidBlock('stripped_oak_log')).toBe(true);
    expect(isValidBlock('copper_block')).toBe(true);
    expect(isValidBlock('smooth_stone')).toBe(true);
    expect(isValidBlock('deepslate_bricks')).toBe(true);
  });

  test('should reject invalid blocks', () => {
    expect(isValidBlock('invalid_block')).toBe(false);
    expect(isValidBlock('fake_material')).toBe(false);
  });

  test('should validate stair blocks', () => {
    expect(isValidBlock('oak_stairs')).toBe(true);
    expect(isValidBlock('stone_stairs')).toBe(true);
    expect(isValidBlock('cobblestone_stairs')).toBe(true);
  });

  test('should validate slab blocks', () => {
    expect(isValidBlock('oak_slab')).toBe(true);
    expect(isValidBlock('stone_slab')).toBe(true);
  });

  test('should validate door blocks', () => {
    expect(isValidBlock('oak_door')).toBe(true);
    expect(isValidBlock('iron_door')).toBe(true);
  });

  test('should validate fence blocks', () => {
    expect(isValidBlock('oak_fence')).toBe(true);
    expect(isValidBlock('nether_brick_fence')).toBe(true);
  });

  test('should validate wool colors', () => {
    expect(isValidBlock('white_wool')).toBe(true);
    expect(isValidBlock('red_wool')).toBe(true);
    expect(isValidBlock('blue_wool')).toBe(true);
    expect(isValidBlock('black_wool')).toBe(true);
  });

  test('should validate concrete colors', () => {
    expect(isValidBlock('white_concrete')).toBe(true);
    expect(isValidBlock('red_concrete')).toBe(true);
    expect(isValidBlock('blue_concrete')).toBe(true);
    expect(isValidBlock('black_concrete')).toBe(true);
  });
});

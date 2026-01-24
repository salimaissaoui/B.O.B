import { deriveBlockAllowlist } from '../../src/stages/2-allowlist-deriver.js';
import { isValidBlock } from '../../src/config/blocks.js';

describe('Block Allowlist Derivation', () => {
  test('should derive blocks from materials section', () => {
    const designPlan = {
      dimensions: { width: 10, depth: 10, height: 5 },
      style: 'modern',
      materials: {
        walls: 'oak_planks',
        roof: 'oak_stairs',
        floor: 'stone'
      },
      features: ['door', 'windows']
    };

    const allowlist = deriveBlockAllowlist(designPlan);
    
    expect(allowlist).toContain('oak_planks');
    expect(allowlist).toContain('oak_stairs');
    expect(allowlist).toContain('stone');
    expect(allowlist.length).toBeLessThanOrEqual(15);
  });

  test('should handle array of blocks', () => {
    const designPlan = {
      dimensions: { width: 10, depth: 10, height: 5 },
      style: 'modern',
      materials: {
        walls: ['oak_planks', 'spruce_planks'],
        roof: 'oak_stairs'
      },
      features: ['door']
    };

    const allowlist = deriveBlockAllowlist(designPlan);
    
    expect(allowlist).toContain('oak_planks');
    expect(allowlist).toContain('spruce_planks');
    expect(allowlist).toContain('oak_stairs');
  });

  test('should enforce unique block limit', () => {
    const materials = {};
    for (let i = 0; i < 20; i++) {
      materials[`material${i}`] = 'oak_planks';
    }
    materials['material20'] = 'stone';
    materials['material21'] = 'glass';
    
    const designPlan = {
      dimensions: { width: 10, depth: 10, height: 5 },
      style: 'test',
      materials,
      features: ['door']
    };

    const allowlist = deriveBlockAllowlist(designPlan);
    
    expect(allowlist.length).toBeLessThanOrEqual(15);
  });

  test('should filter invalid blocks', () => {
    const designPlan = {
      dimensions: { width: 10, depth: 10, height: 5 },
      style: 'modern',
      materials: {
        walls: 'oak_planks',
        invalid: 'not_a_real_block',
        roof: 'stone'
      },
      features: ['door']
    };

    const allowlist = deriveBlockAllowlist(designPlan);
    
    expect(allowlist).toContain('oak_planks');
    expect(allowlist).toContain('stone');
    expect(allowlist).not.toContain('not_a_real_block');
  });
});

describe('Block Validation', () => {
  test('should validate common Minecraft blocks', () => {
    expect(isValidBlock('oak_planks')).toBe(true);
    expect(isValidBlock('stone')).toBe(true);
    expect(isValidBlock('glass')).toBe(true);
    expect(isValidBlock('glass_pane')).toBe(true);
  });

  test('should reject invalid blocks', () => {
    expect(isValidBlock('invalid_block')).toBe(false);
    expect(isValidBlock('fake_material')).toBe(false);
  });
});

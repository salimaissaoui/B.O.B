import { fill } from '../../src/operations/fill.js';

describe('Fill Operation', () => {
  test('should fill a single block', () => {
    const step = {
      block: 'oak_planks',
      from: { x: 0, y: 0, z: 0 },
      to: { x: 0, y: 0, z: 0 }
    };

    const blocks = fill(step);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ x: 0, y: 0, z: 0, block: 'oak_planks' });
  });

  test('should fill a line along X axis', () => {
    const step = {
      block: 'stone',
      from: { x: 0, y: 0, z: 0 },
      to: { x: 2, y: 0, z: 0 }
    };

    const blocks = fill(step);
    
    expect(blocks).toHaveLength(3);
    expect(blocks).toContainEqual({ x: 0, y: 0, z: 0, block: 'stone' });
    expect(blocks).toContainEqual({ x: 1, y: 0, z: 0, block: 'stone' });
    expect(blocks).toContainEqual({ x: 2, y: 0, z: 0, block: 'stone' });
  });

  test('should fill a 2x2x2 cube', () => {
    const step = {
      block: 'cobblestone',
      from: { x: 0, y: 0, z: 0 },
      to: { x: 1, y: 1, z: 1 }
    };

    const blocks = fill(step);
    
    expect(blocks).toHaveLength(8); // 2*2*2 = 8 blocks
  });

  test('should handle reversed coordinates', () => {
    const step = {
      block: 'glass',
      from: { x: 5, y: 5, z: 5 },
      to: { x: 3, y: 3, z: 3 }
    };

    const blocks = fill(step);
    
    // Should be 3x3x3 = 27 blocks
    expect(blocks).toHaveLength(27);
    
    // Check corners
    expect(blocks).toContainEqual({ x: 3, y: 3, z: 3, block: 'glass' });
    expect(blocks).toContainEqual({ x: 5, y: 5, z: 5, block: 'glass' });
  });

  test('should throw error when missing required parameters', () => {
    expect(() => fill({ block: 'stone' })).toThrow();
    expect(() => fill({ from: { x: 0, y: 0, z: 0 } })).toThrow();
    expect(() => fill({ from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 } })).toThrow();
  });

  test('should fill a large area correctly', () => {
    const step = {
      block: 'dirt',
      from: { x: 0, y: 0, z: 0 },
      to: { x: 9, y: 0, z: 9 }
    };

    const blocks = fill(step);
    
    // Should be 10x1x10 = 100 blocks
    expect(blocks).toHaveLength(100);
    
    // Verify all blocks are at y=0
    blocks.forEach(block => {
      expect(block.y).toBe(0);
      expect(block.block).toBe('dirt');
    });
  });
});

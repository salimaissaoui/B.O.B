import { pixelArt } from '../../src/operations/pixel-art.js';
import fs from 'fs';

describe('pixelArt operation', () => {


  test('generates blocks for a simple grid', () => {
    const step = {
      base: { x: 0, y: 0, z: 0 },
      facing: 'south',
      grid: [
        ['red_wool', 'blue_wool'],
        ['green_wool', 'yellow_wool']
      ]
    };

    try {
      const blocks = pixelArt(step);

      // Grid is 2x2, should produce 4 blocks
      expect(blocks.length).toBe(4);

      // Check that blocks are placed correctly
      // Row 0 is TOP (y=1), Row 1 is BOTTOM (y=0)
      const redBlock = blocks.find(b => b.block === 'red_wool');
      const blueBlock = blocks.find(b => b.block === 'blue_wool');
      const greenBlock = blocks.find(b => b.block === 'green_wool');
      const yellowBlock = blocks.find(b => b.block === 'yellow_wool');

      // Top row (y=1): red at x=0, blue at x=1
      expect(redBlock).toEqual({ x: 0, y: 1, z: 0, block: 'red_wool' });
      expect(blueBlock).toEqual({ x: 1, y: 1, z: 0, block: 'blue_wool' });

      // Bottom row (y=0): green at x=0, yellow at x=1
      expect(greenBlock).toEqual({ x: 0, y: 0, z: 0, block: 'green_wool' });
      expect(yellowBlock).toEqual({ x: 1, y: 0, z: 0, block: 'yellow_wool' });
    } catch (e) {
      fs.writeFileSync('./pixel-debug-failure.txt', `Simple grid failed: ${e.message}`);
      throw e;
    }
  });

  test('skips empty/air pixels', () => {
    const step = {
      base: { x: 0, y: 0, z: 0 },
      facing: 'south',
      grid: [
        ['red_wool', '', 'blue_wool'],
        ['', 'air', ''],
        ['green_wool', '', 'yellow_wool']
      ]
    };

    const blocks = pixelArt(step);

    // Only 4 non-empty blocks
    expect(blocks.length).toBe(4);
    expect(blocks.every(b => b.block !== 'air' && b.block !== '')).toBe(true);
  });

  test('handles facing north (mirrors X)', () => {
    const step = {
      base: { x: 0, y: 0, z: 0 },
      facing: 'north',
      grid: [
        ['red_wool', 'blue_wool']
      ]
    };

    const blocks = pixelArt(step);

    // Facing north mirrors X so red is on the right (x=1)
    const redBlock = blocks.find(b => b.block === 'red_wool');
    const blueBlock = blocks.find(b => b.block === 'blue_wool');

    expect(redBlock.x).toBe(1); // Mirrored
    expect(blueBlock.x).toBe(0);
  });

  test('handles facing east (uses Z axis)', () => {
    const step = {
      base: { x: 0, y: 0, z: 0 },
      facing: 'east',
      grid: [
        ['red_wool', 'blue_wool']
      ]
    };

    const blocks = pixelArt(step);

    // Facing east: built on Z-Y plane, X is constant
    const redBlock = blocks.find(b => b.block === 'red_wool');
    const blueBlock = blocks.find(b => b.block === 'blue_wool');

    expect(redBlock.x).toBe(0);
    expect(redBlock.z).toBe(0);
    expect(blueBlock.x).toBe(0);
    expect(blueBlock.z).toBe(1);
  });

  test('handles facing west (mirrors Z)', () => {
    const step = {
      base: { x: 0, y: 0, z: 0 },
      facing: 'west',
      grid: [
        ['red_wool', 'blue_wool']
      ]
    };

    const blocks = pixelArt(step);

    // Facing west mirrors Z
    const redBlock = blocks.find(b => b.block === 'red_wool');
    const blueBlock = blocks.find(b => b.block === 'blue_wool');

    expect(redBlock.z).toBe(1); // Mirrored
    expect(blueBlock.z).toBe(0);
  });

  test('applies base offset correctly', () => {
    const step = {
      base: { x: 10, y: 20, z: 30 },
      facing: 'south',
      grid: [
        ['red_wool']
      ]
    };

    const blocks = pixelArt(step);

    expect(blocks[0]).toEqual({ x: 10, y: 20, z: 30, block: 'red_wool' });
  });

  test('throws error for missing parameters', () => {
    expect(() => pixelArt({})).toThrow('Pixel art requires base position and grid array');
    expect(() => pixelArt({ base: { x: 0, y: 0, z: 0 } })).toThrow('Pixel art requires base position and grid array');
    expect(() => pixelArt({ grid: [] })).toThrow('Pixel art requires base position and grid array');
  });

  test('throws error for empty grid', () => {
    // grid: [] throws "Pixel art requires base position..."
    expect(() => pixelArt({ base: { x: 0, y: 0, z: 0 }, grid: [] })).toThrow(/requires base position/);
    // grid: [[]] throws "grid cannot be empty" (width 0)
    expect(() => pixelArt({ base: { x: 0, y: 0, z: 0 }, grid: [[]] })).toThrow(/empty/);
  });

  test('handles larger pixel art (charizard-like shape)', () => {
    // Simple 8x8 dragon silhouette
    const step = {
      base: { x: 0, y: 0, z: 0 },
      facing: 'south',
      grid: [
        ['', '', 'orange_wool', 'orange_wool', '', '', '', ''],
        ['', 'orange_wool', 'orange_wool', 'orange_wool', 'orange_wool', '', '', ''],
        ['orange_wool', 'orange_wool', 'black_wool', 'orange_wool', 'orange_wool', '', '', 'yellow_wool'],
        ['orange_wool', 'orange_wool', 'orange_wool', 'orange_wool', '', '', 'yellow_wool', 'red_wool'],
        ['', 'orange_wool', 'orange_wool', 'orange_wool', 'orange_wool', 'yellow_wool', 'red_wool', ''],
        ['', '', 'orange_wool', '', 'orange_wool', 'orange_wool', '', ''],
        ['', '', 'orange_wool', '', '', 'orange_wool', '', ''],
        ['', 'orange_wool', '', '', '', '', 'orange_wool', '']
      ]
    };

    const blocks = pixelArt(step);
    const orange = blocks.filter(b => b.block === 'orange_wool').length;
    const yellow = blocks.filter(b => b.block === 'yellow_wool').length;
    const red = blocks.filter(b => b.block === 'red_wool').length;
    const black = blocks.filter(b => b.block === 'black_wool').length;

    try {
      fs.writeFileSync('./pixel-debug.txt', `Total: ${blocks.length}\nOrange: ${orange}\nYellow: ${yellow}\nRed: ${red}\nBlack: ${black}`);
    } catch (e) { }

    // Check color distribution
    try {
      expect(blocks.length).toBeGreaterThan(20);
      expect(orange).toBeGreaterThan(0);
      expect(yellow).toBeGreaterThan(0);
      expect(red).toBeGreaterThan(0);
      expect(black).toBeGreaterThan(0);
    } catch (assertionError) {
      fs.writeFileSync('./pixel-assertion-error.txt', `Assertion Failed: ${assertionError.message}\n${assertionError.stack}`);
      throw assertionError;
    }
  });
});

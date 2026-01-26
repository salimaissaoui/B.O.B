import { pixelArt } from '../../src/operations/pixel-art.js';

describe('pixelArt edge cases', () => {
    test('handles large pixel art (32x32)', () => {
        const grid = Array(32).fill(null).map(() =>
            Array(32).fill('orange_wool')
        );
        const step = {
            base: { x: 0, y: 0, z: 0 },
            facing: 'south',
            grid
        };
        const blocks = pixelArt(step);
        // 32 * 32 = 1024 blocks
        expect(blocks.length).toBe(1024);
    });

    test('autofixes jagged grid by padding and centering', () => {
        const grid = [
            ['red_wool', 'blue_wool'],
            ['green_wool'] // Missing one element, should be padded
        ];
        const step = {
            base: { x: 0, y: 0, z: 0 },
            facing: 'south',
            grid
        };

        // Should NOT throw
        const blocks = pixelArt(step);
        // 2 in top row, 1 in bottom row (plus padding which is skipped because it's 'air')
        expect(blocks.length).toBe(3);
    });

    test('handles invalid block names gracefully (passes through)', () => {
        const grid = [['invalid_block_xyz']];
        const step = {
            base: { x: 0, y: 0, z: 0 },
            facing: 'south',
            grid
        };
        const blocks = pixelArt(step);
        expect(blocks[0].block).toBe('invalid_block_xyz');
    });

    test('handles negative coordinates', () => {
        const grid = [['red_wool']];
        const step = {
            base: { x: -100, y: 56, z: -100 },
            facing: 'south',
            grid
        };
        const blocks = pixelArt(step);
        expect(blocks[0].x).toBe(-100);
        expect(blocks[0].y).toBe(56);
        expect(blocks[0].z).toBe(-100);
    });

    test('handles world height limits', () => {
        const grid = [['red_wool']];
        const step = {
            base: { x: 0, y: 319, z: 0 },
            facing: 'south',
            grid
        };
        const blocks = pixelArt(step);
        expect(blocks[0].y).toBe(319);
    });

    test('handles case-insensitive facing', () => {
        const grid = [['red_wool']];
        const step = {
            base: { x: 0, y: 10, z: 0 },
            facing: 'NORTH',
            grid
        };
        const blocks = pixelArt(step);
        // North mirrors X. Column 0 of width 1 is index 0. (1-1-0) = 0.
        expect(blocks[0].x).toBe(0);
    });
});

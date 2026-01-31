/**
 * Tests for Schematic and Function Exporters
 *
 * Verifies:
 * - Blueprint flattening works correctly
 * - Schematic data structure is valid
 * - Function commands are properly formatted
 * - Export creates files in expected format
 */

import { jest } from '@jest/globals';
import { mkdirSync, existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

const { SchematicExporter } = await import('../../src/export/schematic-exporter.js');
const { FunctionExporter } = await import('../../src/export/function-exporter.js');
const { exportBlueprint } = await import('../../src/export/index.js');

// Test output directory
const TEST_OUTPUT = './test-exports';

describe('SchematicExporter', () => {
    let exporter;

    beforeAll(() => {
        // Clean and create test directory
        if (existsSync(TEST_OUTPUT)) {
            rmSync(TEST_OUTPUT, { recursive: true });
        }
        mkdirSync(TEST_OUTPUT, { recursive: true });
        exporter = new SchematicExporter({ outputPath: TEST_OUTPUT });
    });

    afterAll(() => {
        rmSync(TEST_OUTPUT, { recursive: true, force: true });
    });

    describe('flattenBlueprint', () => {
        test('flattens fill operations into blocks', () => {
            const blueprint = {
                palette: {},
                steps: [{
                    op: 'fill',
                    from: { x: 0, y: 0, z: 0 },
                    to: { x: 2, y: 0, z: 0 },
                    block: 'stone'
                }]
            };

            const blocks = exporter.flattenBlueprint(blueprint);
            expect(blocks.length).toBe(3);
            expect(blocks).toContainEqual({ x: 0, y: 0, z: 0, block: 'stone' });
            expect(blocks).toContainEqual({ x: 1, y: 0, z: 0, block: 'stone' });
            expect(blocks).toContainEqual({ x: 2, y: 0, z: 0, block: 'stone' });
        });

        test('flattens wall operations (only edges)', () => {
            const blueprint = {
                palette: {},
                steps: [{
                    op: 'wall',
                    from: { x: 0, y: 0, z: 0 },
                    to: { x: 2, y: 0, z: 2 },
                    block: 'cobblestone'
                }]
            };

            const blocks = exporter.flattenBlueprint(blueprint);
            // 3x1x3 walls = edges only = 8 blocks (not center)
            expect(blocks.length).toBe(8);
            // Center block should not exist
            expect(blocks).not.toContainEqual({ x: 1, y: 0, z: 1, block: 'cobblestone' });
        });

        test('flattens set operations (single block)', () => {
            const blueprint = {
                palette: {},
                steps: [{
                    op: 'set',
                    pos: { x: 5, y: 10, z: 15 },
                    block: 'diamond_block'
                }]
            };

            const blocks = exporter.flattenBlueprint(blueprint);
            expect(blocks.length).toBe(1);
            expect(blocks[0]).toEqual({ x: 5, y: 10, z: 15, block: 'diamond_block' });
        });

        test('resolves palette variables', () => {
            const blueprint = {
                palette: { wall: 'stone_bricks' },
                steps: [{
                    op: 'set',
                    pos: { x: 0, y: 0, z: 0 },
                    block: '$wall'
                }]
            };

            const blocks = exporter.flattenBlueprint(blueprint);
            expect(blocks[0].block).toBe('stone_bricks');
        });

        test('flattens line operations', () => {
            const blueprint = {
                palette: {},
                steps: [{
                    op: 'line',
                    from: { x: 0, y: 0, z: 0 },
                    to: { x: 4, y: 0, z: 0 },
                    block: 'oak_log'
                }]
            };

            const blocks = exporter.flattenBlueprint(blueprint);
            expect(blocks.length).toBe(5);
        });

        test('later blocks override earlier blocks at same position', () => {
            const blueprint = {
                palette: {},
                steps: [
                    { op: 'set', pos: { x: 0, y: 0, z: 0 }, block: 'stone' },
                    { op: 'set', pos: { x: 0, y: 0, z: 0 }, block: 'diamond_block' }
                ]
            };

            const blocks = exporter.flattenBlueprint(blueprint);
            expect(blocks.length).toBe(1);
            expect(blocks[0].block).toBe('diamond_block');
        });
    });

    describe('calculateBounds', () => {
        test('calculates correct bounding box', () => {
            const blocks = [
                { x: 0, y: 0, z: 0, block: 'stone' },
                { x: 10, y: 5, z: 20, block: 'stone' }
            ];

            const bounds = exporter.calculateBounds(blocks);
            expect(bounds.minX).toBe(0);
            expect(bounds.maxX).toBe(10);
            expect(bounds.width).toBe(11);
            expect(bounds.height).toBe(6);
            expect(bounds.depth).toBe(21);
        });

        test('handles empty blocks array', () => {
            const bounds = exporter.calculateBounds([]);
            expect(bounds.width).toBe(1);
            expect(bounds.height).toBe(1);
            expect(bounds.depth).toBe(1);
        });
    });

    describe('export', () => {
        test('creates schematic file', async () => {
            const blueprint = {
                buildType: 'test',
                theme: 'default',
                size: { width: 3, height: 1, depth: 3 },
                palette: {},
                steps: [{
                    op: 'fill',
                    from: { x: 0, y: 0, z: 0 },
                    to: { x: 2, y: 0, z: 2 },
                    block: 'stone'
                }]
            };

            const path = await exporter.export(blueprint, 'test_schematic');
            expect(existsSync(path)).toBe(true);

            const data = JSON.parse(readFileSync(path, 'utf-8'));
            expect(data.Version).toBe(2);
            expect(data.Width).toBe(3);
            expect(data.Height).toBe(1);
            expect(data.Length).toBe(3);
            expect(data.Metadata.BOBVersion).toBeDefined();
        });

        test('throws on empty blueprint', async () => {
            const blueprint = { steps: [] };
            await expect(exporter.export(blueprint, 'empty'))
                .rejects.toThrow('no blocks');
        });
    });
});

describe('FunctionExporter', () => {
    let exporter;

    beforeAll(() => {
        if (!existsSync(TEST_OUTPUT)) {
            mkdirSync(TEST_OUTPUT, { recursive: true });
        }
        exporter = new FunctionExporter({ outputPath: TEST_OUTPUT });
    });

    afterAll(() => {
        rmSync(TEST_OUTPUT, { recursive: true, force: true });
    });

    describe('generateCommands', () => {
        test('generates setblock commands', () => {
            const blocks = [
                { x: 0, y: 0, z: 0, block: 'stone' },
                { x: 1, y: 0, z: 0, block: 'stone' }
            ];

            const commands = exporter.generateCommands(blocks, {});
            expect(commands.length).toBeGreaterThan(0);
            expect(commands.some(c => c.includes('minecraft:stone'))).toBe(true);
        });

        test('uses relative coordinates with ~', () => {
            const blocks = [{ x: 5, y: 10, z: 15, block: 'diamond_block' }];
            const commands = exporter.generateCommands(blocks, {});

            expect(commands[0]).toContain('~5');
            expect(commands[0]).toContain('~10');
            expect(commands[0]).toContain('~15');
        });
    });

    describe('export', () => {
        test('creates mcfunction file with header', async () => {
            const blueprint = {
                buildType: 'test',
                theme: 'default',
                description: 'Test build',
                palette: {},
                steps: [{
                    op: 'set',
                    pos: { x: 0, y: 0, z: 0 },
                    block: 'stone'
                }]
            };

            const path = await exporter.export(blueprint, 'test_function');
            expect(existsSync(path)).toBe(true);

            const content = readFileSync(path, 'utf-8');
            expect(content).toContain('# B.O.B Generated Build Function');
            expect(content).toContain('Build Type: test');
            expect(content).toContain('minecraft:stone');
        });
    });
});

describe('exportBlueprint (unified API)', () => {
    beforeAll(() => {
        if (!existsSync(TEST_OUTPUT)) {
            mkdirSync(TEST_OUTPUT, { recursive: true });
        }
    });

    afterAll(() => {
        rmSync(TEST_OUTPUT, { recursive: true, force: true });
    });

    const testBlueprint = {
        buildType: 'test',
        palette: {},
        steps: [{ op: 'set', pos: { x: 0, y: 0, z: 0 }, block: 'stone' }]
    };

    test('exports to schem format', async () => {
        const path = await exportBlueprint(
            testBlueprint, 'schem', 'unified_test', { outputPath: TEST_OUTPUT }
        );
        expect(path).toContain('.schem');
        expect(existsSync(path)).toBe(true);
    });

    test('exports to mcfunction format', async () => {
        const path = await exportBlueprint(
            testBlueprint, 'mcfunction', 'unified_func', { outputPath: TEST_OUTPUT }
        );
        expect(path).toContain('.mcfunction');
        expect(existsSync(path)).toBe(true);
    });

    test('throws for unsupported format', async () => {
        await expect(exportBlueprint(testBlueprint, 'invalid', 'test'))
            .rejects.toThrow('Unsupported export format');
    });
});

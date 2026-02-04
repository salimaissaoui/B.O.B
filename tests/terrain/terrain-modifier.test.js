/**
 * Terrain Modifier Tests
 *
 * Tests for terrain modification operations like flatten, level, smooth.
 * Verifies:
 * - Area flattening to target height
 * - Terrain smoothing
 * - Fill and clear operations
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "Terrain Modification"
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
    TerrainModifier,
    TerrainOperation,
    calculateAverageHeight,
    findHighestPoint,
    findLowestPoint,
    generateFlattenCommands,
    generateSmoothCommands
} from '../../src/terrain/terrain-modifier.js';

describe('Terrain Modifier - Height Analysis', () => {
    describe('calculateAverageHeight', () => {
        test('calculates average from height map', () => {
            const heightMap = [
                [64, 65, 64],
                [65, 66, 65],
                [64, 65, 64]
            ];

            const avg = calculateAverageHeight(heightMap);

            // (64+65+64+65+66+65+64+65+64) / 9 = 64.67
            expect(avg).toBeCloseTo(64.67, 1);
        });

        test('handles uniform height map', () => {
            const heightMap = [
                [64, 64, 64],
                [64, 64, 64]
            ];

            const avg = calculateAverageHeight(heightMap);
            expect(avg).toBe(64);
        });

        test('handles empty height map', () => {
            const avg = calculateAverageHeight([]);
            expect(avg).toBe(0);
        });
    });

    describe('findHighestPoint', () => {
        test('finds highest point in height map', () => {
            const heightMap = [
                [64, 65, 64],
                [65, 70, 65],
                [64, 65, 64]
            ];

            const highest = findHighestPoint(heightMap);

            expect(highest.height).toBe(70);
            expect(highest.x).toBe(1);
            expect(highest.z).toBe(1);
        });

        test('handles empty height map', () => {
            const highest = findHighestPoint([]);
            expect(highest.height).toBe(-Infinity);
        });
    });

    describe('findLowestPoint', () => {
        test('finds lowest point in height map', () => {
            const heightMap = [
                [64, 65, 64],
                [65, 60, 65],
                [64, 65, 64]
            ];

            const lowest = findLowestPoint(heightMap);

            expect(lowest.height).toBe(60);
            expect(lowest.x).toBe(1);
            expect(lowest.z).toBe(1);
        });
    });
});

describe('Terrain Modifier - Command Generation', () => {
    describe('generateFlattenCommands', () => {
        test('generates fill commands for area below target', () => {
            const heightMap = [
                [60, 60],
                [60, 60]
            ];
            const origin = { x: 0, y: 0, z: 0 };
            const targetHeight = 64;

            const commands = generateFlattenCommands(heightMap, origin, targetHeight, 'dirt');

            expect(commands.length).toBeGreaterThan(0);
            expect(commands[0].type).toBe('fill');
        });

        test('generates clear commands for area above target', () => {
            const heightMap = [
                [70, 70],
                [70, 70]
            ];
            const origin = { x: 0, y: 0, z: 0 };
            const targetHeight = 64;

            const commands = generateFlattenCommands(heightMap, origin, targetHeight, 'dirt');

            expect(commands.length).toBeGreaterThan(0);
            // Should have commands to remove blocks above target
            const clearCommands = commands.filter(c => c.type === 'clear' || c.block === 'air');
            expect(clearCommands.length).toBeGreaterThan(0);
        });

        test('generates no commands when already at target', () => {
            const heightMap = [
                [64, 64],
                [64, 64]
            ];
            const origin = { x: 0, y: 0, z: 0 };
            const targetHeight = 64;

            const commands = generateFlattenCommands(heightMap, origin, targetHeight, 'dirt');

            // May have surface layer command but should be minimal
            expect(commands.length).toBeLessThanOrEqual(1);
        });
    });

    describe('generateSmoothCommands', () => {
        test('generates smoothing commands for rough terrain', () => {
            const heightMap = [
                [64, 70, 64],
                [70, 64, 70],
                [64, 70, 64]
            ];
            const origin = { x: 0, y: 0, z: 0 };

            const commands = generateSmoothCommands(heightMap, origin, 'grass_block');

            expect(commands.length).toBeGreaterThan(0);
        });

        test('generates minimal commands for already smooth terrain', () => {
            const heightMap = [
                [64, 64, 64],
                [64, 65, 64],
                [64, 64, 64]
            ];
            const origin = { x: 0, y: 0, z: 0 };

            const commands = generateSmoothCommands(heightMap, origin, 'grass_block');

            // Should have very few or no changes
            expect(commands.length).toBeLessThan(5);
        });
    });
});

describe('TerrainOperation class', () => {
    test('creates flatten operation', () => {
        const op = new TerrainOperation({
            type: 'flatten',
            area: { x1: 0, z1: 0, x2: 20, z2: 20 },
            targetHeight: 64,
            block: 'stone'
        });

        expect(op.type).toBe('flatten');
        expect(op.targetHeight).toBe(64);
        expect(op.block).toBe('stone');
    });

    test('creates smooth operation', () => {
        const op = new TerrainOperation({
            type: 'smooth',
            area: { x1: 0, z1: 0, x2: 20, z2: 20 },
            iterations: 3
        });

        expect(op.type).toBe('smooth');
        expect(op.iterations).toBe(3);
    });

    test('creates fill operation', () => {
        const op = new TerrainOperation({
            type: 'fill',
            area: { x1: 0, z1: 0, x2: 10, z2: 10 },
            fromY: 60,
            toY: 64,
            block: 'dirt'
        });

        expect(op.type).toBe('fill');
        expect(op.fromY).toBe(60);
        expect(op.toY).toBe(64);
    });

    test('validates area dimensions', () => {
        const op = new TerrainOperation({
            type: 'flatten',
            area: { x1: 0, z1: 0, x2: 20, z2: 20 },
            targetHeight: 64
        });

        expect(op.getAreaWidth()).toBe(21);
        expect(op.getAreaDepth()).toBe(21);
        expect(op.getAreaSize()).toBe(441);
    });
});

describe('TerrainModifier class', () => {
    let modifier;

    beforeEach(() => {
        modifier = new TerrainModifier();
    });

    describe('Operation planning', () => {
        test('plans flatten operation', () => {
            const plan = modifier.planOperation({
                type: 'flatten',
                center: { x: 100, y: 64, z: 100 },
                radius: 10,
                targetHeight: 64,
                block: 'stone'
            });

            expect(plan.type).toBe('flatten');
            expect(plan.area).toBeDefined();
            expect(plan.estimatedCommands).toBeGreaterThan(0);
        });

        test('plans smooth operation', () => {
            const plan = modifier.planOperation({
                type: 'smooth',
                center: { x: 100, y: 64, z: 100 },
                radius: 15,
                iterations: 2
            });

            expect(plan.type).toBe('smooth');
            expect(plan.iterations).toBe(2);
        });

        test('plans clear operation', () => {
            const plan = modifier.planOperation({
                type: 'clear',
                center: { x: 100, y: 64, z: 100 },
                radius: 10,
                fromY: 64,
                toY: 100
            });

            expect(plan.type).toBe('clear');
        });
    });

    describe('WorldEdit command generation', () => {
        test('generates //set commands for simple fill', () => {
            const commands = modifier.generateWorldEditCommands({
                type: 'fill',
                area: { x1: 0, z1: 0, x2: 10, z2: 10 },
                fromY: 60,
                toY: 64,
                block: 'stone'
            });

            expect(commands.length).toBeGreaterThan(0);
            expect(commands.some(c => c.includes('//set') || c.includes('//fill'))).toBe(true);
        });

        test('generates //replace commands for surface layer', () => {
            const commands = modifier.generateWorldEditCommands({
                type: 'surface',
                area: { x1: 0, z1: 0, x2: 10, z2: 10 },
                block: 'grass_block',
                depth: 1
            });

            expect(commands.length).toBeGreaterThan(0);
        });
    });

    describe('Area calculation', () => {
        test('calculates area from center and radius', () => {
            const area = modifier.calculateArea({
                center: { x: 100, z: 100 },
                radius: 10
            });

            expect(area.x1).toBe(90);
            expect(area.z1).toBe(90);
            expect(area.x2).toBe(110);
            expect(area.z2).toBe(110);
        });

        test('calculates area from corners', () => {
            const area = modifier.calculateArea({
                corner1: { x: 0, z: 0 },
                corner2: { x: 20, z: 30 }
            });

            expect(area.x1).toBe(0);
            expect(area.z1).toBe(0);
            expect(area.x2).toBe(20);
            expect(area.z2).toBe(30);
        });
    });

    describe('Validation', () => {
        test('rejects area exceeding max size', () => {
            expect(() => {
                modifier.planOperation({
                    type: 'flatten',
                    center: { x: 0, y: 64, z: 0 },
                    radius: 1000, // Too large
                    targetHeight: 64
                });
            }).toThrow(/exceeds maximum/i);
        });

        test('rejects invalid target height', () => {
            expect(() => {
                modifier.planOperation({
                    type: 'flatten',
                    center: { x: 0, y: 64, z: 0 },
                    radius: 10,
                    targetHeight: 500 // Above world limit
                });
            }).toThrow(/height/i);
        });
    });
});

describe('TerrainModifier - Integration', () => {
    test('complete flatten workflow', () => {
        const modifier = new TerrainModifier();

        // Plan the operation
        const plan = modifier.planOperation({
            type: 'flatten',
            center: { x: 0, y: 64, z: 0 },
            radius: 20,
            targetHeight: 64,
            block: 'stone'
        });

        // Generate commands
        const commands = modifier.generateWorldEditCommands(plan);

        expect(plan).toBeDefined();
        expect(commands.length).toBeGreaterThan(0);
    });

    test('complete smooth workflow', () => {
        const modifier = new TerrainModifier();

        const plan = modifier.planOperation({
            type: 'smooth',
            center: { x: 0, y: 64, z: 0 },
            radius: 15,
            iterations: 3
        });

        const commands = modifier.generateWorldEditCommands(plan);

        expect(plan).toBeDefined();
        expect(commands.length).toBeGreaterThan(0);
    });
});

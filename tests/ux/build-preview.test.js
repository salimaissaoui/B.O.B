/**
 * Build Preview Tests
 *
 * Tests for early build preview before execution.
 * Verifies:
 * - Blueprint summary generation
 * - Dimension calculation
 * - Material listing
 * - Block count estimation
 *
 * CLAUDE.md Contract:
 * - Priority 1 UX: "Early Build Preview"
 */

import { describe, test, expect } from '@jest/globals';
import {
    BuildPreview,
    generatePreview,
    formatPreviewMessage,
    estimateBuildTime
} from '../../src/ux/build-preview.js';

describe('BuildPreview - Summary Generation', () => {
    describe('generatePreview', () => {
        test('generates preview from blueprint', () => {
            const blueprint = {
                name: 'Test House',
                operations: [
                    { type: 'box', block: 'oak_planks', width: 10, height: 5, depth: 10 },
                    { type: 'outline', block: 'oak_log', width: 10, height: 5, depth: 10 },
                    { type: 'stairs', block: 'oak_stairs', count: 8 }
                ]
            };

            const preview = generatePreview(blueprint);

            expect(preview).toBeDefined();
            expect(preview.name).toBe('Test House');
            expect(preview.operationCount).toBe(3);
        });

        test('calculates dimensions from operations', () => {
            const blueprint = {
                operations: [
                    { type: 'box', x: 0, y: 0, z: 0, width: 10, height: 5, depth: 8 },
                    { type: 'box', x: 5, y: 5, z: 0, width: 5, height: 3, depth: 8 }
                ]
            };

            const preview = generatePreview(blueprint);

            expect(preview.dimensions.width).toBeGreaterThanOrEqual(10);
            expect(preview.dimensions.height).toBeGreaterThanOrEqual(5);
            expect(preview.dimensions.depth).toBeGreaterThanOrEqual(8);
        });

        test('lists unique materials', () => {
            const blueprint = {
                operations: [
                    { type: 'box', block: 'oak_planks' },
                    { type: 'wall', block: 'stone_bricks' },
                    { type: 'box', block: 'oak_planks' }, // duplicate
                    { type: 'stairs', block: 'oak_stairs' }
                ]
            };

            const preview = generatePreview(blueprint);

            expect(preview.materials).toContain('oak_planks');
            expect(preview.materials).toContain('stone_bricks');
            expect(preview.materials).toContain('oak_stairs');
            expect(preview.materials.length).toBe(3); // no duplicates
        });

        test('estimates total block count', () => {
            const blueprint = {
                operations: [
                    { type: 'box', width: 5, height: 5, depth: 5, block: 'stone' } // 125 blocks
                ]
            };

            const preview = generatePreview(blueprint);

            expect(preview.estimatedBlocks).toBeGreaterThan(0);
        });

        test('handles empty blueprint', () => {
            const blueprint = { operations: [] };
            const preview = generatePreview(blueprint);

            expect(preview.operationCount).toBe(0);
            expect(preview.estimatedBlocks).toBe(0);
            expect(preview.materials.length).toBe(0);
        });
    });
});

describe('BuildPreview - Block Estimation', () => {
    test('estimates blocks for box operation', () => {
        const blueprint = {
            operations: [
                { type: 'box', width: 10, height: 5, depth: 10, block: 'stone' }
            ]
        };

        const preview = generatePreview(blueprint);

        // Box: 10 * 5 * 10 = 500 blocks
        expect(preview.estimatedBlocks).toBe(500);
    });

    test('estimates blocks for outline operation', () => {
        const blueprint = {
            operations: [
                { type: 'outline', width: 10, height: 5, depth: 10, block: 'stone' }
            ]
        };

        const preview = generatePreview(blueprint);

        // Outline is hollow, estimate perimeter * height
        expect(preview.estimatedBlocks).toBeLessThan(500);
        expect(preview.estimatedBlocks).toBeGreaterThan(0);
    });

    test('estimates blocks for wall operation', () => {
        const blueprint = {
            operations: [
                { type: 'wall', width: 10, height: 5, block: 'stone' }
            ]
        };

        const preview = generatePreview(blueprint);

        // Wall: 10 * 5 = 50 blocks
        expect(preview.estimatedBlocks).toBe(50);
    });

    test('sums blocks across multiple operations', () => {
        const blueprint = {
            operations: [
                { type: 'box', width: 5, height: 5, depth: 5, block: 'stone' }, // 125
                { type: 'wall', width: 10, height: 5, block: 'oak_planks' } // 50
            ]
        };

        const preview = generatePreview(blueprint);

        expect(preview.estimatedBlocks).toBe(175);
    });
});

describe('BuildPreview - Time Estimation', () => {
    test('estimates build time based on block count', () => {
        const preview = {
            estimatedBlocks: 1000,
            useWorldEdit: true
        };

        const time = estimateBuildTime(preview);

        expect(time).toBeGreaterThan(0);
        expect(time).toBeLessThan(60000); // Less than 1 minute for 1000 blocks with WE
    });

    test('longer time without WorldEdit', () => {
        const previewWE = { estimatedBlocks: 1000, useWorldEdit: true };
        const previewVanilla = { estimatedBlocks: 1000, useWorldEdit: false };

        const timeWE = estimateBuildTime(previewWE);
        const timeVanilla = estimateBuildTime(previewVanilla);

        expect(timeVanilla).toBeGreaterThan(timeWE);
    });

    test('returns 0 for empty build', () => {
        const preview = { estimatedBlocks: 0 };
        const time = estimateBuildTime(preview);
        expect(time).toBe(0);
    });
});

describe('BuildPreview - Message Formatting', () => {
    test('formats preview as user-readable message', () => {
        const preview = {
            name: 'Medieval House',
            dimensions: { width: 12, height: 8, depth: 10 },
            estimatedBlocks: 500,
            materials: ['oak_planks', 'stone_bricks', 'oak_stairs'],
            operationCount: 15
        };

        const message = formatPreviewMessage(preview);

        expect(message).toContain('Medieval House');
        expect(message).toContain('12');
        expect(message).toContain('8');
        expect(message).toContain('10');
        expect(message).toContain('500');
        expect(message).toContain('oak_planks');
    });

    test('includes warning for large builds', () => {
        const preview = {
            name: 'Giant Castle',
            dimensions: { width: 100, height: 50, depth: 100 },
            estimatedBlocks: 100000,
            materials: ['stone'],
            operationCount: 50
        };

        const message = formatPreviewMessage(preview);

        expect(message.toLowerCase()).toContain('large');
    });

    test('handles missing name gracefully', () => {
        const preview = {
            dimensions: { width: 5, height: 5, depth: 5 },
            estimatedBlocks: 125,
            materials: ['stone'],
            operationCount: 1
        };

        const message = formatPreviewMessage(preview);

        expect(message).toBeDefined();
        expect(message.length).toBeGreaterThan(0);
    });
});

describe('BuildPreview class', () => {
    test('creates preview from blueprint', () => {
        const blueprint = {
            name: 'Test',
            operations: [
                { type: 'box', width: 5, height: 5, depth: 5, block: 'stone' }
            ]
        };

        const preview = new BuildPreview(blueprint);

        expect(preview.getName()).toBe('Test');
        expect(preview.getBlockCount()).toBe(125);
        expect(preview.getMaterials()).toContain('stone');
    });

    test('provides formatted summary', () => {
        const blueprint = {
            operations: [
                { type: 'box', width: 5, height: 5, depth: 5, block: 'stone' }
            ]
        };

        const preview = new BuildPreview(blueprint);
        const summary = preview.getSummary();

        expect(summary).toHaveProperty('dimensions');
        expect(summary).toHaveProperty('estimatedBlocks');
        expect(summary).toHaveProperty('materials');
    });

    test('can check if build exceeds limits', () => {
        const largeBlueprint = {
            operations: [
                { type: 'box', width: 100, height: 100, depth: 100, block: 'stone' }
            ]
        };

        const preview = new BuildPreview(largeBlueprint);

        expect(preview.exceedsBlockLimit(500000)).toBe(true);
        expect(preview.exceedsBlockLimit(2000000)).toBe(false);
    });

    test('can check height limit', () => {
        const tallBlueprint = {
            operations: [
                { type: 'box', x: 0, y: 0, z: 0, width: 5, height: 300, depth: 5, block: 'stone' }
            ]
        };

        const preview = new BuildPreview(tallBlueprint);

        expect(preview.exceedsHeightLimit(256)).toBe(true);
        expect(preview.exceedsHeightLimit(400)).toBe(false);
    });
});

/**
 * Incremental Rendering Tests
 *
 * Tests for real-time block placement feedback.
 * Verifies:
 * - Block-by-block progress updates
 * - Batch progress reporting
 * - Rate limiting of updates
 * - Completion notifications
 *
 * CLAUDE.md Contract:
 * - Priority 1 UX: "Incremental Rendering"
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
    IncrementalRenderer,
    RenderProgress,
    RenderBatch,
    createRenderCallback
} from '../../src/ux/incremental-rendering.js';

describe('IncrementalRenderer - Block Progress', () => {
    let renderer;
    let updates;

    beforeEach(() => {
        renderer = new IncrementalRenderer();
        updates = [];
        renderer.onUpdate((update) => updates.push(update));
    });

    describe('Individual block tracking', () => {
        test('reports single block placed', () => {
            renderer.start(100); // 100 total blocks
            renderer.blockPlaced({ x: 0, y: 64, z: 0 }, 'stone');

            expect(updates.length).toBeGreaterThan(0);
            expect(renderer.getBlocksPlaced()).toBe(1);
        });

        test('tracks progress percentage', () => {
            renderer.start(100);

            for (let i = 0; i < 50; i++) {
                renderer.blockPlaced({ x: i, y: 64, z: 0 }, 'stone');
            }

            expect(renderer.getProgress()).toBe(50);
        });

        test('reports 100% on completion', () => {
            renderer.start(10);

            for (let i = 0; i < 10; i++) {
                renderer.blockPlaced({ x: i, y: 64, z: 0 }, 'stone');
            }

            expect(renderer.getProgress()).toBe(100);
            expect(renderer.isComplete()).toBe(true);
        });
    });

    describe('Batch progress', () => {
        test('reports batch of blocks at once', () => {
            renderer.start(1000);
            renderer.batchPlaced(100);

            expect(renderer.getBlocksPlaced()).toBe(100);
            expect(renderer.getProgress()).toBe(10);
        });

        test('handles multiple batches', () => {
            renderer.start(1000);
            renderer.batchPlaced(250);
            renderer.batchPlaced(250);
            renderer.batchPlaced(500);

            expect(renderer.getBlocksPlaced()).toBe(1000);
            expect(renderer.isComplete()).toBe(true);
        });
    });

    describe('Failed blocks', () => {
        test('tracks failed block placements', () => {
            renderer.start(100);
            renderer.blockPlaced({ x: 0, y: 64, z: 0 }, 'stone');
            renderer.blockFailed({ x: 1, y: 64, z: 0 }, 'stone', 'Out of range');

            expect(renderer.getBlocksPlaced()).toBe(1);
            expect(renderer.getBlocksFailed()).toBe(1);
        });

        test('calculates success rate', () => {
            renderer.start(100);

            for (let i = 0; i < 90; i++) {
                renderer.blockPlaced({ x: i, y: 64, z: 0 }, 'stone');
            }
            for (let i = 0; i < 10; i++) {
                renderer.blockFailed({ x: 90 + i, y: 64, z: 0 }, 'stone', 'Failed');
            }

            expect(renderer.getSuccessRate()).toBe(90);
        });
    });
});

describe('IncrementalRenderer - Update Rate Limiting', () => {
    let renderer;
    let updateCount;

    beforeEach(() => {
        renderer = new IncrementalRenderer({ updateInterval: 100 }); // 100ms minimum between updates
        updateCount = 0;
        renderer.onUpdate(() => updateCount++);
    });

    test('throttles rapid updates', () => {
        renderer.start(1000);

        // Place 100 blocks rapidly
        for (let i = 0; i < 100; i++) {
            renderer.blockPlaced({ x: i, y: 64, z: 0 }, 'stone');
        }

        // Should not emit 100 updates due to throttling
        expect(updateCount).toBeLessThan(100);
    });

    test('always emits final update', () => {
        renderer.start(10);

        for (let i = 0; i < 10; i++) {
            renderer.blockPlaced({ x: i, y: 64, z: 0 }, 'stone');
        }

        // Final update should include completion
        const lastUpdate = renderer.getLastUpdate();
        expect(lastUpdate.complete).toBe(true);
    });

    test('respects custom update interval', () => {
        const fastRenderer = new IncrementalRenderer({ updateInterval: 0 });
        let fastCount = 0;
        fastRenderer.onUpdate(() => fastCount++);

        fastRenderer.start(50);
        for (let i = 0; i < 50; i++) {
            fastRenderer.blockPlaced({ x: i, y: 64, z: 0 }, 'stone');
        }

        // With no throttling, should get more updates
        expect(fastCount).toBeGreaterThan(updateCount);
    });
});

describe('IncrementalRenderer - Update Content', () => {
    let renderer;
    let lastUpdate;

    beforeEach(() => {
        renderer = new IncrementalRenderer();
        renderer.onUpdate((update) => { lastUpdate = update; });
    });

    test('update includes progress percentage', () => {
        renderer.start(100);
        renderer.blockPlaced({ x: 0, y: 64, z: 0 }, 'stone');

        expect(lastUpdate).toHaveProperty('progress');
        expect(lastUpdate.progress).toBe(1);
    });

    test('update includes blocks placed count', () => {
        renderer.start(100);
        renderer.batchPlaced(25);

        expect(lastUpdate).toHaveProperty('blocksPlaced');
        expect(lastUpdate.blocksPlaced).toBe(25);
    });

    test('update includes total blocks', () => {
        renderer.start(500);
        renderer.blockPlaced({ x: 0, y: 64, z: 0 }, 'stone');

        expect(lastUpdate).toHaveProperty('totalBlocks');
        expect(lastUpdate.totalBlocks).toBe(500);
    });

    test('update includes elapsed time', () => {
        renderer.start(100);
        renderer.blockPlaced({ x: 0, y: 64, z: 0 }, 'stone');

        expect(lastUpdate).toHaveProperty('elapsedMs');
        expect(lastUpdate.elapsedMs).toBeGreaterThanOrEqual(0);
    });

    test('update includes estimated remaining time', () => {
        renderer.start(100);

        // Place some blocks to establish rate
        for (let i = 0; i < 10; i++) {
            renderer.blockPlaced({ x: i, y: 64, z: 0 }, 'stone');
        }

        expect(lastUpdate).toHaveProperty('estimatedRemainingMs');
    });
});

describe('RenderProgress class', () => {
    test('creates progress snapshot', () => {
        const progress = new RenderProgress({
            blocksPlaced: 50,
            totalBlocks: 100,
            blocksFailed: 5,
            elapsedMs: 5000
        });

        expect(progress.getPercentage()).toBe(50);
        expect(progress.getSuccessRate()).toBe(90.9); // 50 / 55 * 100
    });

    test('calculates blocks per second', () => {
        const progress = new RenderProgress({
            blocksPlaced: 100,
            totalBlocks: 1000,
            blocksFailed: 0,
            elapsedMs: 10000 // 10 seconds
        });

        expect(progress.getBlocksPerSecond()).toBe(10);
    });

    test('estimates remaining time', () => {
        const progress = new RenderProgress({
            blocksPlaced: 100,
            totalBlocks: 1000,
            blocksFailed: 0,
            elapsedMs: 10000 // 10 blocks/sec rate
        });

        // 900 blocks remaining at 10/sec = 90 seconds = 90000ms
        expect(progress.getEstimatedRemainingMs()).toBeCloseTo(90000, -3);
    });

    test('handles zero elapsed time', () => {
        const progress = new RenderProgress({
            blocksPlaced: 0,
            totalBlocks: 100,
            blocksFailed: 0,
            elapsedMs: 0
        });

        expect(progress.getBlocksPerSecond()).toBe(0);
        expect(progress.getEstimatedRemainingMs()).toBe(Infinity);
    });
});

describe('RenderBatch class', () => {
    test('creates batch update', () => {
        const batch = new RenderBatch({
            startIndex: 0,
            endIndex: 99,
            blockType: 'stone',
            success: true
        });

        expect(batch.getBlockCount()).toBe(100);
        expect(batch.isSuccess()).toBe(true);
    });

    test('tracks batch position', () => {
        const batch = new RenderBatch({
            startIndex: 500,
            endIndex: 599,
            region: { x1: 0, y1: 64, z1: 0, x2: 10, y2: 74, z2: 10 }
        });

        expect(batch.getStartIndex()).toBe(500);
        expect(batch.getEndIndex()).toBe(599);
        expect(batch.getRegion()).toBeDefined();
    });
});

describe('createRenderCallback', () => {
    test('creates callback function', () => {
        const callback = createRenderCallback((progress) => {
            console.log(`${progress.progress}%`);
        });

        expect(typeof callback).toBe('function');
    });

    test('callback receives progress updates', () => {
        const received = [];
        const callback = createRenderCallback((progress) => {
            received.push(progress);
        });

        const renderer = new IncrementalRenderer();
        renderer.onUpdate(callback);
        renderer.start(10);
        renderer.batchPlaced(10);

        expect(received.length).toBeGreaterThan(0);
    });
});

describe('IncrementalRenderer - Lifecycle', () => {
    let renderer;

    beforeEach(() => {
        renderer = new IncrementalRenderer();
    });

    test('start resets state', () => {
        renderer.start(100);
        renderer.batchPlaced(50);

        renderer.start(200); // Reset

        expect(renderer.getBlocksPlaced()).toBe(0);
        expect(renderer.getTotalBlocks()).toBe(200);
    });

    test('stop halts updates', () => {
        let updateCount = 0;
        renderer.onUpdate(() => updateCount++);

        renderer.start(100);
        renderer.batchPlaced(25);
        const countBeforeStop = updateCount;

        renderer.stop();
        renderer.batchPlaced(25); // Should not trigger update

        expect(updateCount).toBe(countBeforeStop);
    });

    test('pause and resume', () => {
        renderer.start(100);
        renderer.batchPlaced(25);

        renderer.pause();
        const pauseTime = renderer.getElapsedMs();

        // Simulate time passing (in real scenario, would actually wait)

        renderer.resume();
        renderer.batchPlaced(25);

        expect(renderer.getBlocksPlaced()).toBe(50);
    });

    test('getSummary returns final stats', () => {
        renderer.start(100);
        renderer.batchPlaced(90);
        renderer.blockFailed({ x: 0, y: 0, z: 0 }, 'stone', 'Failed');

        const summary = renderer.getSummary();

        expect(summary.totalBlocks).toBe(100);
        expect(summary.blocksPlaced).toBe(90);
        expect(summary.blocksFailed).toBe(1);
        expect(summary.successRate).toBeCloseTo(98.9, 0);
    });
});

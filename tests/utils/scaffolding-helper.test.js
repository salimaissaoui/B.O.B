/**
 * Tests for Scaffolding Helper
 *
 * Verifies:
 * - Reach detection
 * - Scaffolding construction logic
 * - Cleanup operations
 */

import { jest } from '@jest/globals';

const { ScaffoldingHelper } = await import('../../src/utils/scaffolding-helper.js');

describe('ScaffoldingHelper', () => {
    let mockBot;
    let mockBuilder;
    let scaffolder;

    beforeEach(() => {
        mockBot = {
            entity: {
                position: { x: 0, y: 64, z: 0, floored: () => ({ x: 0, y: 64, z: 0 }) }
            },
            chat: jest.fn(),
            setControlState: jest.fn()
        };

        mockBuilder = {
            worldEditEnabled: true,
            worldEdit: {
                executeCommand: jest.fn().mockResolvedValue({ confirmed: true })
            }
        };

        scaffolder = new ScaffoldingHelper(mockBot, mockBuilder);
    });

    describe('constructor', () => {
        test('initializes with default settings', () => {
            expect(scaffolder.enabled).toBe(true);
            expect(scaffolder.maxHeight).toBe(64);
            expect(scaffolder.scaffoldBlock).toBe('scaffolding');
            expect(scaffolder.autoCleanup).toBe(true);
        });

        test('starts with empty scaffold positions', () => {
            expect(scaffolder.scaffoldPositions).toEqual([]);
        });
    });

    describe('canReach', () => {
        test('returns true for nearby positions', () => {
            expect(scaffolder.canReach({ x: 0, y: 64, z: 0 })).toBe(true); // Same position
            expect(scaffolder.canReach({ x: 2, y: 65, z: 2 })).toBe(true); // 2 blocks away, 1 up
            expect(scaffolder.canReach({ x: 0, y: 68, z: 0 })).toBe(true); // 4 blocks up (max)
            expect(scaffolder.canReach({ x: 0, y: 61, z: 0 })).toBe(true); // 3 blocks down (max)
        });

        test('returns false for positions too high', () => {
            expect(scaffolder.canReach({ x: 0, y: 70, z: 0 })).toBe(false); // 6 blocks up
            expect(scaffolder.canReach({ x: 0, y: 100, z: 0 })).toBe(false); // Way up
        });

        test('returns false for positions too low', () => {
            expect(scaffolder.canReach({ x: 0, y: 60, z: 0 })).toBe(false); // 4 blocks down
        });

        test('returns false for positions too far horizontally', () => {
            expect(scaffolder.canReach({ x: 10, y: 64, z: 0 })).toBe(false);
            expect(scaffolder.canReach({ x: 0, y: 64, z: 10 })).toBe(false);
        });

        test('returns false if bot has no entity', () => {
            scaffolder.bot = { entity: null };
            expect(scaffolder.canReach({ x: 0, y: 64, z: 0 })).toBe(false);
        });
    });

    describe('buildScaffoldingTo', () => {
        test('returns true if target already reachable', async () => {
            const result = await scaffolder.buildScaffoldingTo({ x: 0, y: 65, z: 0 });
            expect(result).toBe(true);
            expect(scaffolder.scaffoldPositions.length).toBe(0);
        });

        test('returns false if disabled', async () => {
            scaffolder.enabled = false;
            const result = await scaffolder.buildScaffoldingTo({ x: 0, y: 100, z: 0 });
            expect(result).toBe(false);
        });

        test('returns false if height exceeds max', async () => {
            const result = await scaffolder.buildScaffoldingTo({ x: 0, y: 200, z: 0 });
            expect(result).toBe(false);
        });

        test('builds scaffolding for high targets', async () => {
            const result = await scaffolder.buildScaffoldingTo({ x: 0, y: 80, z: 0 });
            expect(result).toBe(true);
            expect(scaffolder.scaffoldPositions.length).toBeGreaterThan(0);
        });
    });

    describe('cleanup', () => {
        test('removes all scaffolding blocks', async () => {
            // Simulate having built some scaffolding
            scaffolder.scaffoldPositions = [
                { x: 0, y: 65, z: 0 },
                { x: 0, y: 66, z: 0 },
                { x: 0, y: 67, z: 0 }
            ];

            const removed = await scaffolder.cleanup();
            expect(removed).toBe(3);
            expect(scaffolder.scaffoldPositions.length).toBe(0);
        });

        test('returns 0 if no scaffolding exists', async () => {
            const removed = await scaffolder.cleanup();
            expect(removed).toBe(0);
        });

        test('skips cleanup if autoCleanup is disabled', async () => {
            scaffolder.autoCleanup = false;
            scaffolder.scaffoldPositions = [{ x: 0, y: 65, z: 0 }];

            const removed = await scaffolder.cleanup();
            expect(removed).toBe(0);
            expect(scaffolder.scaffoldPositions.length).toBe(1); // Still there
        });

        test('removes from top to bottom', async () => {
            scaffolder.scaffoldPositions = [
                { x: 0, y: 65, z: 0 },
                { x: 0, y: 67, z: 0 },
                { x: 0, y: 66, z: 0 }
            ];

            const removeOrder = [];
            scaffolder.removeScaffold = jest.fn(async (pos) => {
                removeOrder.push(pos.y);
            });

            await scaffolder.cleanup();
            expect(removeOrder).toEqual([67, 66, 65]); // Top to bottom
        });
    });

    describe('getStats', () => {
        test('returns correct statistics', () => {
            scaffolder.scaffoldPositions = [{ x: 0, y: 65, z: 0 }];

            const stats = scaffolder.getStats();
            expect(stats.enabled).toBe(true);
            expect(stats.currentBlocks).toBe(1);
            expect(stats.scaffoldBlock).toBe('scaffolding');
            expect(stats.maxHeight).toBe(64);
            expect(stats.autoCleanup).toBe(true);
        });
    });

    describe('reset', () => {
        test('clears scaffold positions without cleanup', () => {
            scaffolder.scaffoldPositions = [
                { x: 0, y: 65, z: 0 },
                { x: 0, y: 66, z: 0 }
            ];

            scaffolder.reset();
            expect(scaffolder.scaffoldPositions.length).toBe(0);
        });
    });
});

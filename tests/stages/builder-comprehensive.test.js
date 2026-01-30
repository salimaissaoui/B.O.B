
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { Builder } from '../../src/stages/5-builder.js';
import { SAFETY_LIMITS } from '../../src/config/limits.js';

jest.setTimeout(20000);

// Mock bot factory (copied and adapted from builder-optimized.test.js)
function createMockBot(options = {}) {
    const inventoryItems = options.initialInventory || [];
    const handlers = {};

    const bot = {
        chat: jest.fn((msg) => {
            // Simulate WorldEdit responses
            if (msg.startsWith('//')) {
                setTimeout(() => {
                    if (handlers['message']) {
                        handlers['message'].forEach(h => h("Operation completed (100 blocks changed)."));
                    }
                }, 10);
            }
        }),
        on: jest.fn((event, handler) => {
            handlers[event] = handlers[event] || [];
            handlers[event].push(handler);
        }),
        waitForTicks: jest.fn().mockResolvedValue(),
        lookAt: jest.fn().mockResolvedValue(),
        activateItem: jest.fn(),
        equip: jest.fn().mockResolvedValue(),
        inventory: {
            findInventoryItem: jest.fn((name) => inventoryItems.find(i => i.name === name) || null)
        },
        entity: {
            position: {
                x: 0, y: 64, z: 0,
                clone: () => ({
                    x: 0, y: 64, z: 0,
                    distanceTo: () => 100
                }),
                distanceTo: () => 100
            }
        },
        blockAt: jest.fn(() => ({ name: 'air' })),
        pathfinder: {
            // Mock pathfinder to verify if it's called
            goto: jest.fn().mockResolvedValue(),
            movements: {},
            setMovements: jest.fn(),
            GoalNear: jest.fn()
        },
        ...options
    };
    return bot;
}

describe('Builder Comprehensive Edge Cases', () => {
    let bot;
    let builder;

    beforeEach(() => {
        bot = createMockBot();
        builder = new Builder(bot);
        // Explicitly mock pathfindingHelper to avoid complexity of real class
        builder.pathfindingHelper = {
            isAvailable: jest.fn().mockReturnValue(true),
            ensureInRange: jest.fn().mockResolvedValue(true),
            goToBlock: jest.fn().mockResolvedValue(true)
        };
    });

    describe('Proximity Check Bypass', () => {
        test('should SKIP pathfinding when WorldEdit is enabled', async () => {
            builder.worldEditEnabled = true;

            // Mock a block placement far away
            const farBlock = { x: 100, y: 64, z: 100 };

            // Execute vanilla block placement (internally checks proximity)
            await builder.placeBlockWithRetry(farBlock, 'stone');

            // Verification: goto should NOT be called because skipRangeCheck should be true
            // when WorldEdit is enabled (remote building access)
            expect(bot.pathfinder.goto).not.toHaveBeenCalled();
        });

        test('should SKIP pathfinding when hasSetblockAccess is true', async () => {
            builder.worldEditEnabled = false;
            builder.hasSetblockAccess = true;

            const farBlock = { x: 100, y: 64, z: 100 };
            await builder.placeBlockWithRetry(farBlock, 'stone');

            expect(bot.pathfinder.goto).not.toHaveBeenCalled();
        });

        test('should USE pathfinding when no remote access', async () => {
            // Ensure pathfinding helper is initialized
            // We need to valid mock PathfindingHelper logic or mock it on the builder
            // But placeBlockWithRetry checks this.pathfindingHelper?.isAvailable()

            // Mock pathfinding helper availability with all required methods
            builder.pathfindingHelper = {
                isAvailable: () => true,
                ensureInRange: jest.fn().mockResolvedValue(true),
                goToBlock: jest.fn().mockResolvedValue(true)
            };
            builder.worldEditEnabled = false;
            builder.hasSetblockAccess = false;
            builder.building = true; // Must be set for placeBlockWithRetry to proceed

            const farBlock = { x: 100, y: 64, z: 100 }; // Far away from (0,64,0)

            // Actually place block
            await builder.placeBlockWithRetry(farBlock, 'stone');

            // Should attempt to ensure in range
            expect(builder.pathfindingHelper.ensureInRange).toHaveBeenCalled();
        });
    });

    describe('Batching Configuration', () => {
        test('should pass pixelArtBatching config to optimizer', async () => {
            // We want to verify that optimizeBlockGroups is called with options
            // but optimizeBlockGroups is an import. We canspy on the method that calls it
            // or we can test the effect.
            // testing the effect is hard without real blocks.
            // Let's rely on checking if the method logic constructs the options object.

            // Actually, we can check if it tries to use 2D optimization for pixel art-like input
            // But that depends on the imported function's behavior.

            // Let's create a scenario that is ONLY optimized by 2D batching (e.g. 50x50 wall)
            // and check if we get a WorldEdit "fill" command instead of 2500 "set" commands
            // IF pixelArtBatching is true.

            SAFETY_LIMITS.pixelArtBatching = true;
            builder.worldEditEnabled = true;

            const wallBlocks = [];
            for (let x = 0; x < 20; x++) {
                for (let y = 0; y < 20; y++) {
                    wallBlocks.push({ x, y, z: 0, name: 'stone' });
                }
            }
            // 400 blocks. 
            // 2D optimization -> 1 fill command (from 0,0,0 to 19,19,0)
            // 1D optimization -> 20 fill commands (one per column/row) or similar

            // We mock the batchBlocksToWorldEdit method? No, we want to test IT.
            // We need to mock optimizeBlockGroups or see the output of batchBlocksToWorldEdit.

            // Let's call batchBlocksToWorldEdit directly
            const result = builder.batchBlocksToWorldEdit(wallBlocks, { x: 0, y: 0, z: 0 });

            // If 2D optimization is working, we expect very few operations
            // For a perfect 20x20 wall of same material, it should contain a rectangle fill

            // NOTE: This assumes the greedy-rectangles logic is working and imported correctly.
            // If result.weOperations has 'isRectangle: true', it used the 2D logic.

            const hasRectangleOp = result.weOperations.some(op => op.isRectangle);
            expect(hasRectangleOp).toBe(true);
        });
    });

    describe('Effective Unlimited Limits', () => {
        test('SAFETY_LIMITS should allow massive values', () => {
            expect(SAFETY_LIMITS.maxBlocks).toBeGreaterThanOrEqual(1000000);
            expect(SAFETY_LIMITS.maxWidth).toBeGreaterThanOrEqual(1000);
            expect(SAFETY_LIMITS.worldEdit.maxSelectionVolume).toBeGreaterThanOrEqual(150000);
        });
    });
});

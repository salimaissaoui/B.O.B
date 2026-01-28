import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { Builder } from '../src/stages/5-builder.js';
import { Vec3 } from 'vec3';

/**
 * Reproduction Test: Builder Positioning Failure
 * 
 * This test simulates the bot standing at (0, 64, 0) and trying to build
 * a vertical wall at (0, 64, 0). This should fail or cause a collision
 * with the bot's current position, forcing it to move.
 */

function createMockBot(options = {}) {
    const listeners = {};
    let position = new Vec3(0, 64, 0);

    return {
        entity: {
            position: position,
            get position() { return position; }
        },
        pathfinder: {
            goto: jest.fn().mockImplementation(async (goal) => {
                // Simulate time passing for pathfinding
                return new Promise(resolve => setTimeout(resolve, 10));
            })
        },
        blockAt: jest.fn().mockReturnValue({ name: 'air' }),
        chat: jest.fn(),
        waitForTicks: jest.fn().mockResolvedValue(),
        inventory: {
            findInventoryItem: jest.fn().mockReturnValue(null)
        }
    };
}

describe('Reproduction: Positioning & Pathfinding Congestion', () => {
    let mockBot;
    let builder;

    beforeEach(() => {
        mockBot = createMockBot();
        builder = new Builder(mockBot);
        builder.worldEditEnabled = false; // Force vanilla to test pathfinding

        // Mock inventory checks
        builder.inventoryManager.validateForBlueprint = () => ({ valid: true, missing: [] });
        builder.inventoryManager.checkCreativeMode = () => true;
    });

    test('should move bot OUT of build volume before placement', async () => {
        const blueprint = {
            buildType: 'structure',
            size: { width: 1, height: 1, depth: 1 },
            palette: ['stone'],
            steps: [
                // Use 'set' operation which directly places a block at the position
                { op: 'set', pos: { x: 0, y: 0, z: 0 }, block: 'stone' }
            ]
        };

        const startPos = { x: 0, y: 64, z: 0 };

        // Bot is currently at 0, 64, 0. The block to be placed is ALSO at 0, 64, 0.
        // This should trigger self-collision detection and move the bot away.

        await builder.executeBlueprint(blueprint, startPos);

        // Assert that pathfinder.goto was called at least once to move the bot away
        expect(mockBot.pathfinder.goto).toHaveBeenCalled();
    });
});

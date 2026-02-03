import { jest, describe, test, expect } from '@jest/globals';
import { Builder } from '../../src/stages/5-builder.js';
import { Vec3 } from 'vec3';

jest.setTimeout(20000);

// Mock bot factory
// Mock bot factory
function createMockBot(options = {}) {
    const inventoryItems = options.initialInventory || [];
    const handlers = {};

    const bot = {
        chat: jest.fn((msg) => {
            // Simulate WorldEdit responses matching expected ACK patterns
            if (msg.startsWith('//sel')) {
                setTimeout(() => {
                    if (handlers['message']) {
                        // Use pattern that matches: /cuboid.*left click|left click.*cuboid/i
                        handlers['message'].forEach(h => h('Cuboid: Left click for position 1'));
                    }
                }, 10);
            } else if (msg.startsWith('//pos1')) {
                setTimeout(() => {
                    if (handlers['message']) {
                        // Matches: lower.includes('set to') && !lower.includes('selection type')
                        handlers['message'].forEach(h => h('First position set to (0, 0, 0).'));
                    }
                }, 10);
            } else if (msg.startsWith('//pos2')) {
                setTimeout(() => {
                    if (handlers['message']) {
                        handlers['message'].forEach(h => h('Second position set to (0, 0, 0).'));
                    }
                }, 10);
            } else if (msg.startsWith('//') || msg.startsWith('/tp')) {
                setTimeout(() => {
                    if (handlers['message']) {
                        handlers['message'].forEach(h => h("100 blocks changed"));
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
        ...options
    };
    return bot;
}

describe('Builder Optimized Logic (Task 3 & 4)', () => {

    describe('WorldEdit Async Flags', () => {
        test('should execute WorldEdit operations without -a flag', async () => {
            const bot = createMockBot();
            const builder = new Builder(bot);
            builder.worldEditEnabled = true;

            // Test Fill
            await builder.executeWorldEditFill({ from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 }, block: 'stone' }, { x: 0, y: 0, z: 0 });
            expect(bot.chat).toHaveBeenCalledWith(expect.stringContaining('//set stone'));
            expect(bot.chat).not.toHaveBeenCalledWith(expect.stringContaining('//set -a'));

            // Test Walls
            await builder.executeWorldEditWalls({ from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 }, block: 'stone' }, { x: 0, y: 0, z: 0 });
            expect(bot.chat).toHaveBeenCalledWith(expect.stringContaining('//walls stone'));
            expect(bot.chat).not.toHaveBeenCalledWith(expect.stringContaining('//walls -a'));

            // Test Sphere
            await builder.executeWorldEditSphere({ center: { x: 0, y: 0, z: 0 }, radius: 5, block: 'stone' }, { x: 0, y: 0, z: 0 });
            expect(bot.chat).toHaveBeenCalledWith(expect.stringContaining('//sphere stone 5'));
            expect(bot.chat).not.toHaveBeenCalledWith(expect.stringContaining('//sphere -a'));
        });
    });


    describe('Refined Teleportation', () => {
        test('should use @s in teleport commands', async () => {
            const bot = createMockBot();
            const builder = new Builder(bot);

            await builder.teleportAndVerify({ x: 500, y: 70, z: 500 });
            expect(bot.chat).toHaveBeenCalledWith(expect.stringContaining('/tp @s 500 70 500'));
        });
    });
});

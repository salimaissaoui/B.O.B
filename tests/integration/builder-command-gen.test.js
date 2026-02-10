
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { Builder } from '../../src/stages/5-builder.js';
import { WorldEditExecutor } from '../../src/worldedit/executor.js';

/**
 * Integration Test: Builder -> WorldEdit Command Generation
 * 
 * Verifies that the Builder stage correctly translates blueprint steps
 * into the exact string commands expected by the WorldEdit/FAWE plugin.
 * This bridges the gap between unit tests (mocks) and actual server execution.
 */

// Mock Bot Factory
function createMockBot(options = {}) {
    const listeners = {};
    let position = { x: 0, y: 64, z: 0 };

    const mockEntity = {
        get position() {
            return {
                ...position,
                distanceTo: (other) => Math.sqrt(
                    Math.pow(position.x - other.x, 2) +
                    Math.pow(position.y - other.y, 2) +
                    Math.pow(position.z - other.z, 2)
                ),
                clone: () => ({
                    ...position,
                    distanceTo: (other) => Math.sqrt(
                        Math.pow(position.x - other.x, 2) +
                        Math.pow(position.y - other.y, 2) +
                        Math.pow(position.z - other.z, 2)
                    )
                })
            };
        },
        set position(val) { position = val; }
    };

    return {
        chat: jest.fn((cmd) => {
            if (cmd.startsWith('/tp')) {
                const match = cmd.match(/\/tp @s (-?\d+) (-?\d+) (-?\d+)/);
                if (match) {
                    position = {
                        x: parseFloat(match[1]),
                        y: parseFloat(match[2]),
                        z: parseFloat(match[3])
                    };
                }
            }
        }),
        on: jest.fn((event, handler) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(handler);
        }),
        emit: (event, ...args) => {
            (listeners[event] || []).forEach(handler => handler(...args));
        },
        blockAt: jest.fn(() => null),
        setBlock: jest.fn(),
        waitForTicks: jest.fn().mockResolvedValue(),
        entity: mockEntity,
        _setPosition: (x, y, z) => { position = { x, y, z }; },
        pathfinder: { goals: {} }, // Enable pathfinding
        ...options
    };
}

describe('Integration: Builder Command Generation', () => {
    let mockBot;
    let builder;
    let executorSpy;

    beforeEach(() => {
        mockBot = createMockBot();
        builder = new Builder(mockBot);

        // We use the REAL WorldEditExecutor, but spy on its executeCommand method
        // This ensures the Builder calls the methods on the Executor correctly,
        // and the Executor validates them correctly.
        builder.worldEdit = new WorldEditExecutor(mockBot);
        builder.worldEditEnabled = true;
        builder.worldEdit.available = true;

        // SPY on executeCommand to capture the exact string sent
        // We mock the return value to simulate success so the builder proceeds
        executorSpy = jest.spyOn(builder.worldEdit, 'executeCommand')
            .mockResolvedValue({ success: true, blocksChanged: 10 });

        // Mock teleportAndVerify to avoid slow timeouts/logic inside unit test
        // After extraction to WorldEditDispatcher, teleportAndVerify lives on weDispatch
        builder.weDispatch.teleportAndVerify = jest.fn().mockResolvedValue(true);
        // Mock autoClearArea to avoid extraneous executor calls
        builder.autoClearArea = jest.fn().mockResolvedValue();
        // Mock sleep to speed up test execution
        builder.sleep = jest.fn().mockResolvedValue();

        // Mock InventoryManager to pass validation
        builder.inventoryManager = {
            validateForBlueprint: jest.fn().mockReturnValue({ valid: true, missing: [] }),
            checkCreativeMode: jest.fn().mockReturnValue(true)
        };

        // Mock PathfindingHelper
        builder.pathfindingHelper = {
            ensureInRange: jest.fn().mockResolvedValue(true),
            isAvailable: jest.fn().mockReturnValue(true)
        };
    });

    test('we_sphere generates correct //sphere command', async () => {
        const step = {
            op: 'we_sphere',
            block: 'diamond_block',
            radius: 5,
            center: { x: 0, y: 0, z: 0 }
        };

        const blueprint = {
            size: { width: 10, depth: 10, height: 10 },
            palette: ['diamond_block'],
            steps: [step]
        };

        await builder.executeBlueprint(blueprint, { x: 100, y: 64, z: 100 });

        // Expected absolute world coordinates
        // StartPos (100, 64, 100) + Relative (0, 0, 0) = 100, 64, 100

        // Builder executes: 
        // 1. /tp 100 64 100 (from executeWorldEditSphere logic)
        // 2. //sphere diamond_block 5

        // Check teleport (Builder function mocked)
        // Since we mocked teleportAndVerify, checking mockBot.chat for /tp will fail
        // Instead we check if the mock was called
        expect(builder.weDispatch.teleportAndVerify).toHaveBeenCalled();

        // Check command (Executor function)
        // Note: Observed behavior shows a second argument {executionDelay: 700}. 
        // We match anything for the second argument to be robust.
        expect(executorSpy).toHaveBeenCalledWith(
            expect.stringContaining('//sphere diamond_block 5'),
            expect.anything()
        );
    });

    test('we_cylinder generates correct //cyl command', async () => {
        const step = {
            op: 'we_cylinder',
            block: 'gold_block',
            radius: 3,
            height: 4,
            base: { x: 2, y: 0, z: 2 }
        };

        const blueprint = {
            size: { width: 10, depth: 10, height: 10 },
            palette: ['gold_block'],
            steps: [step]
        };

        await builder.executeBlueprint(blueprint, { x: 100, y: 64, z: 100 });

        // Target: 102, 64, 102
        expect(builder.weDispatch.teleportAndVerify).toHaveBeenCalled();

        // Check command
        expect(executorSpy).toHaveBeenCalledWith(
            expect.stringContaining('//cyl gold_block 3 4'),
            expect.anything()
        );
    });

    test('we_fill generates correct selection sequence', async () => {
        const step = {
            op: 'we_fill',
            block: 'stone',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 2, y: 2, z: 2 },
            fallback: { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 2, y: 2, z: 2 } }
        };

        const blueprint = {
            size: { width: 10, depth: 10, height: 10 },
            palette: ['stone'],
            steps: [step]
        };

        // We need to mock createSelection/fillSelection to NOT fail on null bot response
        // Wait, 'executeCommand' is what createSelection CALLS.
        // So checking executeCommand calls is exactly what we want.

        await builder.executeBlueprint(blueprint, { x: 100, y: 64, z: 100 });

        // 1. //sel cuboid
        expect(executorSpy).toHaveBeenCalledWith('//sel cuboid');

        // 2. //pos1 100,64,100
        expect(executorSpy).toHaveBeenCalledWith('//pos1 100,64,100');

        // 3. //pos2 102,66,102
        expect(executorSpy).toHaveBeenCalledWith('//pos2 102,66,102');

        // 4. //set stone (Has delay option)
        expect(executorSpy).toHaveBeenCalledWith('//set stone', expect.anything());
    });
});

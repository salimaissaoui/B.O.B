import { jest, describe, test, expect } from '@jest/globals';
import { Builder } from '../../src/stages/5-builder.js';
import { WorldEditExecutor } from '../../src/worldedit/executor.js';

jest.setTimeout(20000);

/**
 * P0 Fix Tests: Builder
 * Tests for mutex, teleport verification, and WorldEdit undo tracking
 */

// Mock bot factory
function createMockBot(options = {}) {
  const listeners = {};
  let position = { x: 0, y: 64, z: 0 };

  const mockEntity = {
    get position() {
      return {
        ...position,
        clone: () => ({
          ...position, distanceTo: (other) => {
            return Math.sqrt(
              Math.pow(position.x - other.x, 2) +
              Math.pow(position.y - other.y, 2) +
              Math.pow(position.z - other.z, 2)
            );
          }
        }),
        distanceTo: (other) => {
          return Math.sqrt(
            Math.pow(position.x - other.x, 2) +
            Math.pow(position.y - other.y, 2) +
            Math.pow(position.z - other.z, 2)
          );
        }
      };
    },
    set position(val) {
      position = val;
    }
  };

  return {
    chat: jest.fn((cmd) => {
      // Simulate teleport by updating position
      if (cmd.startsWith('/tp')) {
        const match = cmd.match(/\/tp @s (-?\d+) (-?\d+) (-?\d+)/);
        if (match) {
          position = {
            x: parseInt(match[1]),
            y: parseInt(match[2]),
            z: parseInt(match[3])
          };
        }
      }

      // Simulate WorldEdit responses (for strict ACK tests)
      if (cmd.startsWith('//sel')) {
        setTimeout(() => {
          listeners['message'] && listeners['message'].forEach(h => h({ toString: () => 'Selection type: cuboid' }));
        }, 10);
      } else if (cmd.startsWith('//pos1')) {
        setTimeout(() => {
          listeners['message'] && listeners['message'].forEach(h => h({ toString: () => 'First position set to (0, 64, 0).' }));
        }, 10);
      } else if (cmd.startsWith('//pos2')) {
        setTimeout(() => {
          listeners['message'] && listeners['message'].forEach(h => h({ toString: () => 'Second position set to (10, 64, 10).' }));
        }, 10);
      } else if (cmd.startsWith('//set') || cmd.startsWith('//walls') || cmd.startsWith('//faces') || cmd.startsWith('//outset')) {
        setTimeout(() => {
          listeners['message'] && listeners['message'].forEach(h => h({ toString: () => 'Operation completed (10 blocks affected).' }));
        }, 10);
      } else if (cmd === '//undo') {
        setTimeout(() => {
          listeners['message'] && listeners['message'].forEach(h => h({ toString: () => 'Undo successful' }));
        }, 10);
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
    ...options
  };
}

describe('Builder P0 Fixes', () => {
  describe('Build Mutex (Race Condition Prevention)', () => {
    test('should prevent concurrent builds', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      const simpleBlueprint = {
        size: { width: 2, depth: 2, height: 2 },
        palette: ['stone'],
        steps: [
          { op: 'set', block: 'stone', pos: { x: 0, y: 0, z: 0 } }
        ]
      };

      // Start first build (don't await)
      const build1Promise = builder.executeBlueprint(simpleBlueprint, { x: 0, y: 64, z: 0 });

      // Small delay to ensure first build starts
      await new Promise(r => setTimeout(r, 10));

      // Second build should wait for first to complete
      const build2Promise = builder.executeBlueprint(simpleBlueprint, { x: 10, y: 64, z: 10 });

      // Wait for both
      await Promise.all([build1Promise, build2Promise]);

      // Both should complete successfully (sequentially, not concurrently)
      expect(builder.building).toBe(false);
    });

    test('should throw if build in progress after mutex acquired', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      // Manually set building flag to simulate edge case
      builder.building = true;
      builder.buildMutex.locked = false;

      const simpleBlueprint = {
        size: { width: 2, depth: 2, height: 2 },
        palette: ['stone'],
        steps: []
      };

      await expect(
        builder.executeBlueprint(simpleBlueprint, { x: 0, y: 64, z: 0 })
      ).rejects.toThrow(/already in progress/i);
    });

    test('should release mutex after build completes', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      const simpleBlueprint = {
        size: { width: 2, depth: 2, height: 2 },
        palette: ['stone'],
        steps: []
      };

      await builder.executeBlueprint(simpleBlueprint, { x: 0, y: 64, z: 0 });

      expect(builder.buildMutex.locked).toBe(false);
    });

    test('should release mutex after build fails', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      const badBlueprint = {
        size: { width: 2, depth: 2, height: 2 },
        palette: ['stone'],
        steps: [
          { op: 'nonexistent_op', block: 'stone', pos: { x: 0, y: 0, z: 0 } }
        ]
      };

      try {
        await builder.executeBlueprint(badBlueprint, { x: 0, y: 64, z: 0 });
      } catch (e) {
        // Expected to fail
      }

      expect(builder.buildMutex.locked).toBe(false);
    });
  });

  describe('Teleport Verification', () => {
    test('should verify successful teleport', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      const target = { x: 100, y: 70, z: 100 };
      const result = await builder.teleportAndVerify(target);

      expect(result).toBe(true);
      expect(mockBot.chat).toHaveBeenCalledWith('/tp @s 100 70 100');
    });

    test('should detect failed teleport (no position change)', async () => {
      const mockBot = createMockBot();
      // Override chat to NOT update position
      mockBot.chat = jest.fn();

      const builder = new Builder(mockBot);
      const target = { x: 100, y: 70, z: 100 };

      const result = await builder.teleportAndVerify(target, 2);

      expect(result).toBe(false);
    }, 5000);

    test('should throw when bot entity not available', async () => {
      const mockBot = createMockBot();
      mockBot.entity = null;

      const builder = new Builder(mockBot);

      await expect(
        builder.teleportAndVerify({ x: 0, y: 0, z: 0 })
      ).rejects.toThrow(/entity not available/i);
    });
  });

  describe('WorldEdit Undo Tracking', () => {
    test('should track WorldEdit operations in history', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      // Mock WorldEdit as available
      builder.worldEditEnabled = true;
      builder.worldEdit.available = true;
      builder.worldEdit.executeCommand = jest.fn().mockResolvedValue({ success: true });
      builder.worldEdit.createSelection = jest.fn().mockResolvedValue({});
      builder.worldEdit.fillSelection = jest.fn().mockResolvedValue({});
      builder.worldEdit.clearSelection = jest.fn().mockResolvedValue({});

      const blueprint = {
        size: { width: 5, depth: 5, height: 3 },
        palette: ['stone'],
        steps: [
          {
            op: 'we_fill',
            block: 'stone',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 4, y: 0, z: 4 },
            fallback: { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 4, y: 0, z: 4 } }
          }
        ]
      };

      await builder.executeBlueprint(blueprint, { x: 0, y: 64, z: 0 });

      expect(builder.worldEditHistory).toHaveLength(1);
      expect(builder.worldEditHistory[0].step.op).toBe('we_fill');
    });

    test('should clear WorldEdit history on new build', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      // Pre-populate history
      builder.worldEditHistory = [{ step: { op: 'we_fill' }, timestamp: Date.now() }];

      const simpleBlueprint = {
        size: { width: 2, depth: 2, height: 2 },
        palette: ['stone'],
        steps: []
      };

      await builder.executeBlueprint(simpleBlueprint, { x: 0, y: 64, z: 0 });

      expect(builder.worldEditHistory).toHaveLength(0);
    });

    test('should include WorldEdit ops count in progress', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      // Simulate in-progress build
      builder.building = true;
      builder.currentBuild = {
        blocksPlaced: 100,
        worldEditOpsExecuted: 5,
        startTime: Date.now()
      };

      const progress = builder.getProgress();

      expect(progress.worldEditOps).toBe(5);
    });

    test('should return undo info with WE operations', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      // Set up some history
      builder.history = [[
        { pos: { x: 0, y: 0, z: 0 }, previousBlock: 'air' },
        { pos: { x: 1, y: 0, z: 0 }, previousBlock: 'air' }
      ]];
      builder.worldEditHistory = [
        { step: { op: 'we_fill' }, timestamp: Date.now() },
        { step: { op: 'we_walls' }, timestamp: Date.now() }
      ];

      const undoInfo = builder.getUndoInfo();

      expect(undoInfo.vanillaBuilds).toBe(1);
      expect(undoInfo.vanillaBlocks).toBe(2);
      expect(undoInfo.worldEditOps).toBe(2);
    });

    test('should undo both WE and vanilla operations', async () => {
      const mockBot = createMockBot();
      // Remove setBlock so it falls back to chat command
      delete mockBot.setBlock;

      const builder = new Builder(mockBot);

      // Mock WorldEdit undo
      builder.worldEdit.undoAll = jest.fn().mockResolvedValue({ undone: 2, failed: 0 });

      // Set up history
      builder.history = [[
        { pos: { x: 0, y: 64, z: 0 }, previousBlock: 'air' }
      ]];
      builder.worldEditHistory = [
        { step: { op: 'we_fill' }, timestamp: Date.now() }
      ];

      await builder.undo();

      expect(builder.worldEdit.undoAll).toHaveBeenCalled();
      // When setBlock is not available, it uses chat with /setblock
      expect(mockBot.chat).toHaveBeenCalledWith(expect.stringContaining('/setblock'));
    });

    test('should throw when nothing to undo', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      builder.history = [];
      builder.worldEditHistory = [];

      await expect(builder.undo()).rejects.toThrow(/no builds to undo/i);
    });

    test('should throw when trying to undo while building', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      builder.building = true;
      builder.history = [[{ pos: { x: 0, y: 0, z: 0 }, previousBlock: 'air' }]];

      await expect(builder.undo()).rejects.toThrow(/cannot undo while building/i);
    });
  });

  describe('Bot Disconnect Handling', () => {
    test('should release mutex on bot disconnect', () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      // Simulate active build
      builder.building = true;
      builder.buildMutex.locked = true;

      // Emit disconnect
      mockBot.emit('end');

      expect(builder.building).toBe(false);
    });
  });

  describe('Fallback Tracking', () => {
    test('should not add WE to history when fallback is used', async () => {
      const mockBot = createMockBot();
      const builder = new Builder(mockBot);

      builder.worldEditEnabled = true;
      builder.worldEdit.available = true;

      jest.spyOn(builder, 'executeWorldEditFill').mockRejectedValue(new Error('WE failed'));

      const blueprint = {
        size: { width: 5, depth: 5, height: 3 },
        palette: ['stone'],
        steps: [
          {
            op: 'we_fill',
            block: 'stone',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 4, y: 0, z: 4 },
            fallback: { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 4, y: 0, z: 4 } }
          }
        ]
      };

      await builder.executeBlueprint(blueprint, { x: 0, y: 64, z: 0 });

      // WE failed, so nothing in WE history
      expect(builder.worldEditHistory).toHaveLength(0);

      // But vanilla fallback should have placed blocks
      expect(builder.history.length).toBeGreaterThan(0);
    });
    describe('Pathfinding Edge Cases', () => {
      test('handles unreachable positions gracefully', async () => {
        const mockBot = createMockBot();
        mockBot.pathfinder = { goals: {} }; // Enable pathfinding availability
        const builder = new Builder(mockBot);

        // Mock pathfinding to fail for one specific position
        builder.pathfindingHelper.ensureInRange = jest.fn((pos) => {
          if (pos.x === 50) return Promise.resolve(false); // Unreachable
          return Promise.resolve(true);
        });

        const blueprint = {
          size: { width: 10, depth: 10, height: 10 },
          palette: ['stone'],
          steps: [
            { op: 'set', block: 'stone', pos: { x: 0, y: 0, z: 0 } },
            { op: 'set', block: 'stone', pos: { x: 50, y: 0, z: 0 } } // Too far
          ]
        };

        await builder.executeBlueprint(blueprint, { x: 0, y: 64, z: 0 });

        expect(builder.currentBuild).toBeNull();
        expect(builder.lastBuildReport.execution.blocksFailed).toBeGreaterThan(0);
      });
    });
  });
});

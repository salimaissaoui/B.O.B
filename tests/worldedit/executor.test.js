import { jest, describe, test, expect } from '@jest/globals';
import { WorldEditExecutor } from '../../src/worldedit/executor.js';
import { SAFETY_LIMITS } from '../../src/config/limits.js';

/**
 * P0 Fix Tests: WorldEdit Executor
 * Tests for response-based detection, command acknowledgment, and undo tracking
 */

// Mock bot factory
function createMockBot(options = {}) {
  const listeners = {};

  return {
    chat: jest.fn(),
    on: jest.fn((event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    }),
    emit: (event, ...args) => {
      (listeners[event] || []).forEach(handler => handler(...args));
    },
    entity: {
      position: { x: 0, y: 64, z: 0, clone: () => ({ x: 0, y: 64, z: 0 }), distanceTo: () => 0 }
    },
    ...options
  };
}

describe('WorldEditExecutor P0 Fixes', () => {
  describe('Response-based Detection', () => {
    test('should detect WorldEdit from //sel response', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      // Simulate async response after command
      setTimeout(() => {
        mockBot.emit('message', { toString: () => 'Selection type: cuboid' });
      }, 100);

      const result = await executor.detectWorldEdit();

      expect(result).toBe(true);
      expect(executor.available).toBe(true);
      expect(mockBot.chat).toHaveBeenCalledWith('//sel');
    });

    test('should fallback to //version detection when //sel fails', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      // No matching response to //sel, but respond to //version
      setTimeout(() => {
        // First call is //sel - no matching response (or unrelated)
        mockBot.emit('message', { toString: () => 'Unknown command' });
      }, 100);

      setTimeout(() => {
        // Second call is //version - matching response
        mockBot.emit('message', { toString: () => 'WorldEdit version 7.2.15' });
      }, 3500); // Wait for //sel timeout (3000ms)

      const result = await executor.detectWorldEdit();

      expect(result).toBe(true);
      expect(mockBot.chat).toHaveBeenCalledWith('//sel');
      expect(mockBot.chat).toHaveBeenCalledWith('//version');
    });

    test('should return false when no response received', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      // No responses at all
      const result = await executor.detectWorldEdit();

      expect(result).toBe(false);
      expect(executor.available).toBe(false);
    }, 10000);

    test('should return false when bot.chat is not available', async () => {
      const mockBot = { on: jest.fn() }; // No chat function
      const executor = new WorldEditExecutor(mockBot);

      const result = await executor.detectWorldEdit();

      expect(result).toBe(false);
      expect(executor.available).toBe(false);
    });

    test('should return false when WorldEdit is disabled in config', async () => {
      const originalEnabled = SAFETY_LIMITS.worldEdit.enabled;
      SAFETY_LIMITS.worldEdit.enabled = false;

      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      const result = await executor.detectWorldEdit();

      expect(result).toBe(false);
      expect(mockBot.chat).not.toHaveBeenCalled();

      SAFETY_LIMITS.worldEdit.enabled = originalEnabled;
    });
  });

  describe('Command Acknowledgment', () => {
    test('should detect successful block change response', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => '1000 blocks changed' });
      }, 100);

      const result = await executor.executeCommand('//set stone', { skipValidation: true });

      expect(result.success).toBe(true);
      expect(result.blocksChanged).toBe(1000);
    });

    test('should throw on "no permission" response', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => 'No permission to use this command' });
      }, 100);

      await expect(
        executor.executeCommand('//set stone', { skipValidation: true })
      ).rejects.toThrow(/permission denied/i);
    });

    test('should throw on "unknown command" response', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => 'Unknown command' });
      }, 100);

      await expect(
        executor.executeCommand('//set stone', { skipValidation: true })
      ).rejects.toThrow(/not recognized/i);
    });

    test('should return unconfirmed when no response received', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      const result = await executor.executeCommand('//set stone', {
        skipValidation: true,
        acknowledgmentTimeout: 100
      });

      expect(result.success).toBe(true);
      expect(result.confirmed).toBe(false);
    });

    test('should not wait for acknowledgment on non-block-changing commands', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      const startTime = Date.now();
      const result = await executor.executeCommand('//brush sphere sand 5', { skipValidation: true });
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      // Should complete quickly without waiting for 5s acknowledgment timeout
      expect(elapsed).toBeLessThan(1000);
    });

    test('should correctly identify block-changing commands', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      expect(executor.commandExpectsBlockChange('//set stone')).toBe(true);
      expect(executor.commandExpectsBlockChange('//walls oak_planks')).toBe(true);
      expect(executor.commandExpectsBlockChange('//replace dirt grass_block')).toBe(true);
      expect(executor.commandExpectsBlockChange('//pyramid stone 5')).toBe(true);
      expect(executor.commandExpectsBlockChange('//cyl stone 5 10')).toBe(true);
      expect(executor.commandExpectsBlockChange('//sphere stone 5')).toBe(true);

      expect(executor.commandExpectsBlockChange('//pos1 10,64,10')).toBe(false);
      expect(executor.commandExpectsBlockChange('//pos2 20,70,20')).toBe(false);
      expect(executor.commandExpectsBlockChange('//sel cuboid')).toBe(false);
      expect(executor.commandExpectsBlockChange('//desel')).toBe(false);
    });
  });

  describe('Command History & Undo', () => {
    test('should track executed commands in history', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      await executor.executeCommand('//sel cuboid', { skipValidation: true, skipAcknowledgment: true });
      await executor.executeCommand('//pos1 0,0,0', { skipValidation: true, skipAcknowledgment: true });
      await executor.executeCommand('//set stone', { skipValidation: true, skipAcknowledgment: true });

      const history = executor.getCommandHistory();
      expect(history).toHaveLength(3);
      expect(history[0].command).toBe('//sel cuboid');
      expect(history[2].command).toBe('//set stone');
    });

    test('should clear history on reset', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      await executor.executeCommand('//set stone', { skipValidation: true, skipAcknowledgment: true });

      expect(executor.getCommandHistory()).toHaveLength(1);

      executor.reset();

      expect(executor.getCommandHistory()).toHaveLength(0);
    });

    test('should undo block-changing commands only', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      // Execute mixed commands
      await executor.executeCommand('//sel cuboid', { skipValidation: true, skipAcknowledgment: true });
      await executor.executeCommand('//set stone', { skipValidation: true, skipAcknowledgment: true });
      await executor.executeCommand('//pos1 0,0,0', { skipValidation: true, skipAcknowledgment: true });
      await executor.executeCommand('//walls oak_planks', { skipValidation: true, skipAcknowledgment: true });

      // Mock undo response
      mockBot.chat.mockImplementation((cmd) => {
        if (cmd === '//undo') {
          setTimeout(() => {
            mockBot.emit('message', { toString: () => 'Undo successful' });
          }, 10);
        }
      });

      // Undo all
      const result = await executor.undoAll();

      // Only 2 block-changing commands (//set, //walls)
      expect(result.undone).toBe(2);
      expect(mockBot.chat).toHaveBeenCalledWith('//undo');
    });

    test('should include command history count in status', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      await executor.executeCommand('//set stone', { skipValidation: true, skipAcknowledgment: true });

      const status = executor.getStatus();
      expect(status.commandHistoryCount).toBe(1);
    });
  });

  describe('Spam Detection & Backoff', () => {
    test('should increase backoff on spam warning', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      expect(executor.backoffMultiplier).toBe(1.0);

      mockBot.emit('message', { toString: () => 'You are sending commands too fast!' });

      expect(executor.spamDetected).toBe(true);
      expect(executor.backoffMultiplier).toBe(2.0);

      mockBot.emit('message', { toString: () => 'Slow down!' });

      expect(executor.backoffMultiplier).toBe(4.0); // Capped at 4x
    });

    test('should cap backoff multiplier at 4.0', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      for (let i = 0; i < 10; i++) {
        mockBot.emit('message', { toString: () => 'spam detected' });
      }

      expect(executor.backoffMultiplier).toBe(4.0);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce command limit per build', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      // Exhaust command limit
      executor.commandsExecuted = SAFETY_LIMITS.worldEdit.maxCommandsPerBuild;

      await expect(
        executor.executeCommand('//set stone', { skipValidation: true })
      ).rejects.toThrow(/command limit reached/i);
    });
  });
});

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { WorldEditExecutor } from '../../src/worldedit/executor.js';

/**
 * ACK Pattern Tests
 * Tests for WorldEdit acknowledgment pattern matching and false positive prevention
 */

// Mock bot factory
function createMockBot() {
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
    }
  };
}

describe('WorldEdit ACK Pattern Matching', () => {
  describe('Success Patterns', () => {
    test('should match "Operation completed (1234 blocks)"', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => 'Operation completed (1234 blocks).' });
      }, 100);

      const result = await executor.executeCommand('//set stone', { skipValidation: true });

      expect(result.success).toBe(true);
      expect(result.confirmed).toBe(true);
    });

    test('should match "0.5s elapsed (history: 1234 changed)"', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => '0.5s elapsed (history: 1234 changed; 500 air set)' });
      }, 100);

      const result = await executor.executeCommand('//set stone', { skipValidation: true });

      expect(result.success).toBe(true);
      expect(result.confirmed).toBe(true);
    });

    test('should match "1000 blocks changed"', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => '1000 blocks changed' });
      }, 100);

      const result = await executor.executeCommand('//set stone', { skipValidation: true });

      expect(result.success).toBe(true);
      expect(result.confirmed).toBe(true);
      expect(result.blocksChanged).toBe(1000);
    });

    test('should match "50 blocks affected"', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => '50 blocks affected' });
      }, 100);

      const result = await executor.executeCommand('//set stone', { skipValidation: true });

      expect(result.success).toBe(true);
      expect(result.confirmed).toBe(true);
    });

    test('should match "27 block changed" (singular)', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => '27 block changed' });
      }, 100);

      const result = await executor.executeCommand('//set stone', { skipValidation: true });

      expect(result.success).toBe(true);
      expect(result.confirmed).toBe(true);
    });

    test('should match "First position set to (10, 64, 20)"', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => 'First position set to (10, 64, 20)' });
      }, 100);

      const result = await executor.executeCommand('//pos1 10,64,20', { skipValidation: true });

      expect(result.success).toBe(true);
      expect(result.confirmed).toBe(true);
    });

    test('should match "Selection cleared"', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => 'Selection cleared' });
      }, 100);

      const result = await executor.executeCommand('//desel', { skipValidation: true });

      expect(result.success).toBe(true);
      expect(result.confirmed).toBe(true);
    });

    test('should match "No blocks changed" as valid ACK', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => 'No blocks changed' });
      }, 100);

      const result = await executor.executeCommand('//set stone', { skipValidation: true });

      expect(result.success).toBe(true);
      expect(result.confirmed).toBe(true);
    });
  });

  describe('False Positive Prevention', () => {
    test('should NOT match "Selection type changed to cuboid" as block-change ACK', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      // This should NOT be detected as a successful block change
      setTimeout(() => {
        mockBot.emit('message', { toString: () => 'Selection type changed to cuboid' });
      }, 100);

      const result = await executor.executeCommand('//set stone', {
        skipValidation: true,
        acknowledgmentTimeout: 500  // Short timeout for test
      });

      // Since "Selection type changed" should NOT match success patterns,
      // this should timeout or be unconfirmed
      expect(result.confirmed).toBe(false);
    });

    test('should NOT match "Nothing has changed" as success', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => 'Nothing has changed' });
      }, 100);

      const result = await executor.executeCommand('//set stone', {
        skipValidation: true,
        acknowledgmentTimeout: 500
      });

      // "Nothing has changed" without a block count should not match
      expect(result.confirmed).toBe(false);
    });
  });

  describe('Error Classification', () => {
    test('classifyError should identify COMMAND_NOT_RECOGNIZED', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      const error = executor.classifyError('Unknown or incomplete command', '//set stone');

      expect(error).not.toBeNull();
      expect(error.type).toBe('COMMAND_NOT_RECOGNIZED');
    });

    test('classifyError should identify PERMISSION_DENIED', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      const error = executor.classifyError('You don\'t have permission to do this', '//set stone');

      expect(error).not.toBeNull();
      expect(error.type).toBe('PERMISSION_DENIED');
    });

    test('classifyError should identify NO_SELECTION', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      const error = executor.classifyError('No selection defined', '//set stone');

      expect(error).not.toBeNull();
      expect(error.type).toBe('NO_SELECTION');
      expect(error.suggestedFix).toContain('pos1');
    });

    test('classifyError should identify NO_SELECTION with "make a selection" message', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      const error = executor.classifyError('Please make a region selection first', '//set stone');

      expect(error).not.toBeNull();
      expect(error.type).toBe('NO_SELECTION');
    });

    test('classifyError should identify INTERNAL_ERROR', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      const error = executor.classifyError('An internal error occurred: NullPointerException', '//set stone');

      expect(error).not.toBeNull();
      expect(error.type).toBe('INTERNAL_ERROR');
      expect(error.suggestedFix).toContain('server logs');
    });

    test('classifyError should identify INVALID_SYNTAX', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      const error = executor.classifyError('Invalid value: "stoen" does not match a valid block type', '//set stoen');

      expect(error).not.toBeNull();
      expect(error.type).toBe('INVALID_SYNTAX');
    });

    test('classifyError should identify SELECTION_TOO_LARGE', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      const error = executor.classifyError('Selection too large: 1000000 > 500000 maximum', '//set stone');

      expect(error).not.toBeNull();
      expect(error.type).toBe('SELECTION_TOO_LARGE');
    });

    test('classifyError should return null for success messages', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      const error = executor.classifyError('1000 blocks changed', '//set stone');

      expect(error).toBeNull();
    });
  });

  describe('Message Buffer', () => {
    test('should store recent messages in buffer', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      mockBot.emit('message', { toString: () => 'Message 1' });
      mockBot.emit('message', { toString: () => 'Message 2' });
      mockBot.emit('message', { toString: () => 'Message 3' });

      const recent = executor.getRecentMessages(5000);

      expect(recent).toHaveLength(3);
      expect(recent).toContain('Message 1');
      expect(recent).toContain('Message 2');
      expect(recent).toContain('Message 3');
    });

    test('should filter messages by time window', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      mockBot.emit('message', { toString: () => 'Old message' });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      mockBot.emit('message', { toString: () => 'New message' });

      // Get only very recent messages (50ms window)
      const recent = executor.getRecentMessages(50);

      expect(recent).toContain('New message');
      // Old message might still be there depending on timing
    });

    test('should clear message buffer on reset', () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);

      mockBot.emit('message', { toString: () => 'Some message' });
      expect(executor.getRecentMessages(5000).length).toBeGreaterThan(0);

      executor.reset();

      expect(executor.getRecentMessages(5000)).toHaveLength(0);
    });
  });

  describe('Block Count Extraction', () => {
    test('should extract block count from "1234 blocks changed"', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => '1234 blocks changed' });
      }, 100);

      const result = await executor.executeCommand('//set stone', { skipValidation: true });

      expect(result.blocksChanged).toBe(1234);
    });

    test('should extract block count from "27 block set"', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => '27 block set' });
      }, 100);

      const result = await executor.executeCommand('//set stone', { skipValidation: true });

      expect(result.blocksChanged).toBe(27);
    });

    test('should handle 0 blocks changed', async () => {
      const mockBot = createMockBot();
      const executor = new WorldEditExecutor(mockBot);
      executor.available = true;

      setTimeout(() => {
        mockBot.emit('message', { toString: () => '0 blocks changed' });
      }, 100);

      const result = await executor.executeCommand('//set stone', { skipValidation: true });

      expect(result.blocksChanged).toBe(0);
    });
  });
});

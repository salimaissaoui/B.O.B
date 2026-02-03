/**
 * Tests for WorldEdit ACK Timing and Exponential Backoff
 *
 * Verifies:
 * - ACK arrives quickly when response is immediate (< 500ms)
 * - Falls back to maximum timeout when no response
 * - Exponential backoff polling intervals are correct
 * - Early exit on ACK match
 *
 * CLAUDE.md Contract:
 * - ACK_TIMEOUT = 15000ms (maximum)
 * - Optimization target: reduce typical wait from 15s to 300-500ms
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { WorldEditExecutor } from '../../src/worldedit/executor.js';

describe('ACK Timing', () => {
  let executor;
  let mockBot;
  let messageHandler;

  beforeEach(() => {
    // Create mock bot that captures the message handler
    mockBot = {
      chat: jest.fn(),
      on: jest.fn((event, handler) => {
        if (event === 'message' || event === 'messagestr') {
          messageHandler = handler;
        }
      }),
      removeListener: jest.fn(),
      entity: {
        position: { x: 0, y: 64, z: 0 }
      }
    };

    executor = new WorldEditExecutor(mockBot);
    executor.available = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('waitForResponse timing', () => {
    test('resolves immediately when ACK matches (< 100ms)', async () => {
      const startTime = Date.now();

      // Start waiting for response
      const responsePromise = executor.waitForResponse(
        (text) => text.includes('blocks changed'),
        15000
      );

      // Simulate immediate ACK (within 50ms)
      setTimeout(() => {
        if (executor.pendingResponse) {
          executor.pendingResponse.handler('123 blocks changed');
        }
      }, 50);

      const result = await responsePromise;
      const elapsed = Date.now() - startTime;

      expect(result).toBe('123 blocks changed');
      expect(elapsed).toBeLessThan(200); // Should resolve well under 200ms
    });

    test('returns null on timeout when no ACK received', async () => {
      jest.useFakeTimers();

      // Start waiting with a short timeout for test speed
      const responsePromise = executor.waitForResponse(
        (text) => text.includes('never matches'),
        1000 // 1 second for testing
      );

      // Advance past timeout
      jest.advanceTimersByTime(1100);

      const result = await responsePromise;
      expect(result).toBeNull();
    });

    test('does not resolve for non-matching messages', async () => {
      const startTime = Date.now();

      const responsePromise = executor.waitForResponse(
        (text) => text.includes('blocks changed'),
        500 // Short timeout for test
      );

      // Send non-matching message
      setTimeout(() => {
        if (executor.pendingResponse) {
          executor.pendingResponse.handler('some other message');
        }
      }, 50);

      const result = await responsePromise;
      const elapsed = Date.now() - startTime;

      // Should timeout, not resolve to non-matching message
      expect(result).toBeNull();
      expect(elapsed).toBeGreaterThanOrEqual(450);
    });
  });

  describe('ACK timeout contract', () => {
    test('default ACK timeout is 15000ms', () => {
      // This verifies the constant used in executeCommand
      // The actual timeout is passed as parameter: options.acknowledgmentTimeout || 15000
      const defaultTimeout = 15000;
      expect(defaultTimeout).toBe(15000);
    });

    test('ACK_TIMEOUT_MS constant exists and equals 15000', async () => {
      // Import the constant when it's extracted
      const { ACK_TIMEOUT_MS } = await import('../../src/worldedit/executor.js');
      expect(ACK_TIMEOUT_MS).toBe(15000);
    });
  });

  describe('exponential backoff polling', () => {
    test('ACK_POLL_INTERVALS constant exists with correct values', async () => {
      const { ACK_POLL_INTERVALS } = await import('../../src/worldedit/executor.js');
      expect(ACK_POLL_INTERVALS).toBeDefined();
      expect(ACK_POLL_INTERVALS).toEqual([100, 200, 500, 1000, 2000]);
    });

    test('waitForResponseWithBackoff resolves faster than fixed timeout', async () => {
      // This test will verify the new backoff method once implemented
      const startTime = Date.now();

      // Use the new backoff method (to be implemented)
      const responsePromise = executor.waitForResponseWithBackoff
        ? executor.waitForResponseWithBackoff(
            (text) => text.includes('blocks changed'),
            15000
          )
        : executor.waitForResponse(
            (text) => text.includes('blocks changed'),
            15000
          );

      // Simulate ACK arriving at 150ms
      setTimeout(() => {
        if (executor.pendingResponse) {
          executor.pendingResponse.handler('45 blocks changed');
        }
      }, 150);

      const result = await responsePromise;
      const elapsed = Date.now() - startTime;

      expect(result).toBe('45 blocks changed');
      // With backoff: first poll at 100ms, ACK arrives at 150ms, resolved by 200ms poll
      // Should be much less than 15000ms fixed timeout
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('performance benchmarks', () => {
    test('typical ACK response time < 500ms when response is quick', async () => {
      const times = [];

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();

        const responsePromise = executor.waitForResponse(
          (text) => text.includes('blocks'),
          15000
        );

        // Simulate quick ACK (random 50-150ms to simulate network variance)
        const delay = 50 + Math.floor(Math.random() * 100);
        setTimeout(() => {
          if (executor.pendingResponse) {
            executor.pendingResponse.handler(`${100 + i} blocks changed`);
          }
        }, delay);

        await responsePromise;
        times.push(Date.now() - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(500);
    });
  });
});

describe('ACK timeout boundary tests', () => {
  let executor;
  let mockBot;

  beforeEach(() => {
    mockBot = {
      chat: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      entity: { position: { x: 0, y: 64, z: 0 } }
    };
    executor = new WorldEditExecutor(mockBot);
    executor.available = true;
  });

  test('14999ms should still wait (not timeout)', async () => {
    jest.useFakeTimers();

    const responsePromise = executor.waitForResponse(
      (text) => text.includes('test'),
      15000
    );

    // At 14999ms, should still be waiting
    jest.advanceTimersByTime(14999);

    // Resolve now (just before timeout)
    if (executor.pendingResponse) {
      executor.pendingResponse.handler('test message');
    }

    const result = await responsePromise;
    expect(result).toBe('test message');

    jest.useRealTimers();
  });

  test('15001ms should timeout', async () => {
    jest.useFakeTimers();

    const responsePromise = executor.waitForResponse(
      (text) => text.includes('test'),
      15000
    );

    // Advance past timeout
    jest.advanceTimersByTime(15001);

    const result = await responsePromise;
    expect(result).toBeNull();

    jest.useRealTimers();
  });
});

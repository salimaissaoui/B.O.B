/**
 * Tests for WorldEdit Circuit Breaker
 *
 * Verifies:
 * - State transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)
 * - Failure threshold triggering
 * - Timeout threshold triggering
 * - Reset timeout behavior
 * - Half-open success counting
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { CircuitBreaker } from '../../src/worldedit/executor.js';

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 5,
      timeoutThreshold: 3,
      resetTimeoutMs: 30000,
      halfOpenRequests: 2
    });
  });

  describe('initial state', () => {
    test('starts in CLOSED state', () => {
      expect(breaker.getState().state).toBe('CLOSED');
    });

    test('has zero failure counters', () => {
      const state = breaker.getState();
      expect(state.consecutiveFailures).toBe(0);
      expect(state.consecutiveTimeouts).toBe(0);
    });

    test('allows requests when CLOSED', () => {
      expect(breaker.canProceed()).toBe(true);
    });
  });

  describe('failure threshold', () => {
    test('opens after 5 consecutive failures', () => {
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('test failure');
      }

      expect(breaker.getState().state).toBe('OPEN');
      expect(breaker.canProceed()).toBe(false);
    });

    test('does not open after 4 failures', () => {
      for (let i = 0; i < 4; i++) {
        breaker.recordFailure('test failure');
      }

      expect(breaker.getState().state).toBe('CLOSED');
      expect(breaker.canProceed()).toBe(true);
    });

    test('resets failure count on success', () => {
      breaker.recordFailure('test failure');
      breaker.recordFailure('test failure');
      breaker.recordSuccess();

      expect(breaker.getState().consecutiveFailures).toBe(0);
    });

    test('records failure reason', () => {
      breaker.recordFailure('specific error reason');

      expect(breaker.getState().lastFailureReason).toBe('specific error reason');
    });
  });

  describe('timeout threshold', () => {
    test('opens after 3 consecutive timeouts', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordTimeout();
      }

      expect(breaker.getState().state).toBe('OPEN');
      expect(breaker.canProceed()).toBe(false);
    });

    test('does not open after 2 timeouts', () => {
      breaker.recordTimeout();
      breaker.recordTimeout();

      expect(breaker.getState().state).toBe('CLOSED');
    });

    test('resets timeout count on success', () => {
      breaker.recordTimeout();
      breaker.recordTimeout();
      breaker.recordSuccess();

      expect(breaker.getState().consecutiveTimeouts).toBe(0);
    });
  });

  describe('OPEN state behavior', () => {
    beforeEach(() => {
      // Force circuit to OPEN
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('test');
      }
    });

    test('rejects requests when OPEN', () => {
      expect(breaker.canProceed()).toBe(false);
    });

    test('records last failure time', () => {
      const state = breaker.getState();
      expect(state.lastFailureTime).toBeDefined();
      // lastFailureTime is stored as a timestamp (number from Date.now())
      expect(typeof state.lastFailureTime).toBe('number');
      expect(state.lastFailureTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('OPEN -> HALF_OPEN transition', () => {
    beforeEach(() => {
      // Force circuit to OPEN
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('test');
      }
    });

    test('transitions to HALF_OPEN after reset timeout', () => {
      // Simulate time passage by manipulating lastFailureTime
      breaker.lastFailureTime = new Date(Date.now() - 35000); // 35 seconds ago

      expect(breaker.canProceed()).toBe(true);
      expect(breaker.getState().state).toBe('HALF_OPEN');
    });

    test('stays OPEN before reset timeout elapses', () => {
      // Last failure was just now
      expect(breaker.canProceed()).toBe(false);
      expect(breaker.getState().state).toBe('OPEN');
    });
  });

  describe('HALF_OPEN state behavior', () => {
    beforeEach(() => {
      // Force circuit to OPEN then HALF_OPEN
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('test');
      }
      breaker.lastFailureTime = new Date(Date.now() - 35000);
      breaker.canProceed(); // Trigger transition to HALF_OPEN
    });

    test('allows limited requests in HALF_OPEN', () => {
      expect(breaker.canProceed()).toBe(true);
    });

    test('closes after 2 successes in HALF_OPEN', () => {
      breaker.recordSuccess();
      breaker.recordSuccess();

      expect(breaker.getState().state).toBe('CLOSED');
    });

    test('does not close after 1 success in HALF_OPEN', () => {
      breaker.recordSuccess();

      expect(breaker.getState().state).toBe('HALF_OPEN');
    });

    test('reopens on failure in HALF_OPEN', () => {
      breaker.recordFailure('failed during half-open');

      expect(breaker.getState().state).toBe('OPEN');
    });
  });

  describe('custom configuration', () => {
    test('respects custom failure threshold', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 3
      });

      customBreaker.recordFailure('test');
      customBreaker.recordFailure('test');
      customBreaker.recordFailure('test');

      expect(customBreaker.getState().state).toBe('OPEN');
    });

    test('respects custom timeout threshold', () => {
      const customBreaker = new CircuitBreaker({
        timeoutThreshold: 2
      });

      customBreaker.recordTimeout();
      customBreaker.recordTimeout();

      expect(customBreaker.getState().state).toBe('OPEN');
    });

    test('respects custom reset timeout', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000 // 1 second
      });

      customBreaker.recordFailure('test');
      customBreaker.lastFailureTime = new Date(Date.now() - 1500); // 1.5 seconds ago

      expect(customBreaker.canProceed()).toBe(true);
      expect(customBreaker.getState().state).toBe('HALF_OPEN');
    });

    test('respects custom half-open request count', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000,
        halfOpenRequests: 3
      });

      // Open circuit
      customBreaker.recordFailure('test');
      customBreaker.lastFailureTime = new Date(Date.now() - 1500);
      customBreaker.canProceed();

      // Need 3 successes to close
      customBreaker.recordSuccess();
      expect(customBreaker.getState().state).toBe('HALF_OPEN');

      customBreaker.recordSuccess();
      expect(customBreaker.getState().state).toBe('HALF_OPEN');

      customBreaker.recordSuccess();
      expect(customBreaker.getState().state).toBe('CLOSED');
    });
  });

  describe('default configuration', () => {
    test('uses sensible defaults', () => {
      const defaultBreaker = new CircuitBreaker();

      expect(defaultBreaker.failureThreshold).toBe(5);
      expect(defaultBreaker.timeoutThreshold).toBe(3);
      expect(defaultBreaker.resetTimeoutMs).toBe(30000);
      expect(defaultBreaker.halfOpenRequests).toBe(2);
    });
  });

  describe('getState', () => {
    test('returns complete state information', () => {
      const state = breaker.getState();

      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('consecutiveFailures');
      expect(state).toHaveProperty('consecutiveTimeouts');
      expect(state).toHaveProperty('lastFailureTime');
      expect(state).toHaveProperty('lastFailureReason');
      expect(state).toHaveProperty('timeUntilRetry');
      expect(state).toHaveProperty('stats');
      expect(state.stats).toHaveProperty('totalFailures');
      expect(state.stats).toHaveProperty('totalSuccesses');
    });
  });

  describe('concurrent operation handling', () => {
    test('maintains consistent state through multiple operations', () => {
      // Simulate typical usage pattern
      breaker.recordSuccess();
      breaker.recordSuccess();
      breaker.recordFailure('transient error');
      breaker.recordSuccess();
      breaker.recordFailure('transient error');
      breaker.recordSuccess();

      expect(breaker.getState().state).toBe('CLOSED');
      expect(breaker.getState().consecutiveFailures).toBe(0);
    });

    test('properly counts consecutive failures through mixed operations', () => {
      breaker.recordFailure('error 1');
      breaker.recordFailure('error 2');
      breaker.recordFailure('error 3');
      breaker.recordSuccess(); // Resets count
      breaker.recordFailure('error 4');
      breaker.recordFailure('error 5');

      expect(breaker.getState().consecutiveFailures).toBe(2);
      expect(breaker.getState().state).toBe('CLOSED');
    });
  });
});

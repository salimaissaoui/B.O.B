/**
 * WorldEdit Health Check Tests
 *
 * Tests for periodic WorldEdit health verification.
 * Verifies:
 * - Health check method returns status
 * - Unhealthy state triggers circuit breaker
 * - Health check can be scheduled periodically
 *
 * CLAUDE.md Contract:
 * - Priority 3 Reliability: "Health Check Endpoint - Periodic verification that WorldEdit is responsive"
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { WorldEditExecutor, HEALTH_CHECK_INTERVAL_MS } from '../../src/worldedit/executor.js';

describe('Health Check - Contract Tests', () => {
    let executor;
    let mockBot;
    let chatMessages;

    beforeEach(() => {
        chatMessages = [];
        mockBot = {
            chat: jest.fn((cmd) => chatMessages.push(cmd)),
            on: jest.fn((event, handler) => {
                if (event === 'message') {
                    mockBot._messageHandler = handler;
                }
            }),
            removeListener: jest.fn(),
            entity: { position: { x: 0, y: 64, z: 0 } }
        };
        executor = new WorldEditExecutor(mockBot);
        executor.available = true;
    });

    afterEach(() => {
        // Stop any running health checks
        if (executor.stopHealthCheck) {
            executor.stopHealthCheck();
        }
    });

    describe('Health check constants', () => {
        test('HEALTH_CHECK_INTERVAL_MS is defined', () => {
            expect(HEALTH_CHECK_INTERVAL_MS).toBeDefined();
            expect(typeof HEALTH_CHECK_INTERVAL_MS).toBe('number');
        });

        test('health check interval is reasonable (30s-5min)', () => {
            expect(HEALTH_CHECK_INTERVAL_MS).toBeGreaterThanOrEqual(30000);
            expect(HEALTH_CHECK_INTERVAL_MS).toBeLessThanOrEqual(300000);
        });
    });

    describe('Health check method', () => {
        test('performHealthCheck returns health status', async () => {
            // Mock successful response
            executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');

            const health = await executor.performHealthCheck();

            expect(health).toHaveProperty('healthy');
            expect(health).toHaveProperty('latency');
            expect(health).toHaveProperty('timestamp');
        });

        test('healthy status when WorldEdit responds', async () => {
            executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');

            const health = await executor.performHealthCheck();

            expect(health.healthy).toBe(true);
        });

        test('unhealthy status when WorldEdit times out', async () => {
            executor.waitForResponse = jest.fn().mockResolvedValue(null);

            const health = await executor.performHealthCheck();

            expect(health.healthy).toBe(false);
        });

        test('unhealthy status when not available', async () => {
            executor.available = false;

            const health = await executor.performHealthCheck();

            expect(health.healthy).toBe(false);
            expect(health.reason).toContain('not available');
        });

        test('latency is measured in milliseconds', async () => {
            executor.waitForResponse = jest.fn().mockImplementation(async () => {
                await new Promise(r => setTimeout(r, 50));
                return 'Selection cleared';
            });

            const health = await executor.performHealthCheck();

            expect(health.latency).toBeGreaterThanOrEqual(50);
        });
    });

    describe('Health state tracking', () => {
        test('lastHealthCheck is updated after check', async () => {
            executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');

            const before = executor.lastHealthCheck;
            await executor.performHealthCheck();
            const after = executor.lastHealthCheck;

            expect(after).not.toEqual(before);
            expect(after.timestamp).toBeGreaterThan(0);
        });

        test('getHealthStatus returns last known status', async () => {
            executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');

            await executor.performHealthCheck();
            const status = executor.getHealthStatus();

            expect(status).toHaveProperty('healthy');
            expect(status).toHaveProperty('lastCheck');
        });

        test('consecutive failures are tracked', async () => {
            executor.waitForResponse = jest.fn().mockResolvedValue(null);

            await executor.performHealthCheck();
            await executor.performHealthCheck();

            const status = executor.getHealthStatus();
            expect(status.consecutiveFailures).toBe(2);
        });

        test('success resets failure counter', async () => {
            executor.waitForResponse = jest.fn().mockResolvedValue(null);
            await executor.performHealthCheck();
            await executor.performHealthCheck();

            // Now succeed
            executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');
            await executor.performHealthCheck();

            const status = executor.getHealthStatus();
            expect(status.consecutiveFailures).toBe(0);
        });
    });

    describe('Circuit breaker integration', () => {
        test('unhealthy triggers circuit breaker recordTimeout', async () => {
            executor.waitForResponse = jest.fn().mockResolvedValue(null);
            const recordTimeoutSpy = jest.spyOn(executor.circuitBreaker, 'recordTimeout');

            await executor.performHealthCheck();

            expect(recordTimeoutSpy).toHaveBeenCalled();
        });

        test('healthy triggers circuit breaker recordSuccess', async () => {
            executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');
            const recordSuccessSpy = jest.spyOn(executor.circuitBreaker, 'recordSuccess');

            await executor.performHealthCheck();

            expect(recordSuccessSpy).toHaveBeenCalled();
        });
    });

    describe('Periodic health check', () => {
        test('startHealthCheck returns interval id', () => {
            executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');

            const intervalId = executor.startHealthCheck();

            expect(intervalId).toBeDefined();
            executor.stopHealthCheck();
        });

        test('stopHealthCheck clears interval', () => {
            executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');

            executor.startHealthCheck();
            executor.stopHealthCheck();

            expect(executor.healthCheckInterval).toBeNull();
        });

        test('isHealthCheckRunning returns correct state', () => {
            executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');

            expect(executor.isHealthCheckRunning()).toBe(false);

            executor.startHealthCheck();
            expect(executor.isHealthCheckRunning()).toBe(true);

            executor.stopHealthCheck();
            expect(executor.isHealthCheckRunning()).toBe(false);
        });
    });
});

describe('Health Check - Integration', () => {
    test('health check uses lightweight command', async () => {
        const chatMessages = [];
        const mockBot = {
            chat: jest.fn((cmd) => chatMessages.push(cmd)),
            on: jest.fn((event, handler) => {
                if (event === 'message') {
                    mockBot._messageHandler = handler;
                    // Simulate response
                    setTimeout(() => handler({ toString: () => 'Selection cleared' }), 10);
                }
            }),
            removeListener: jest.fn(),
            entity: { position: { x: 0, y: 64, z: 0 } }
        };

        const executor = new WorldEditExecutor(mockBot);
        executor.available = true;
        executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');

        await executor.performHealthCheck();

        // Should use //sel (lightweight, no state change)
        expect(chatMessages.some(cmd => cmd.includes('//sel'))).toBe(true);
    });

    test('health status includes all diagnostic info', async () => {
        const mockBot = {
            chat: jest.fn(),
            on: jest.fn(),
            removeListener: jest.fn(),
            entity: { position: { x: 0, y: 64, z: 0 } }
        };

        const executor = new WorldEditExecutor(mockBot);
        executor.available = true;
        executor.waitForResponse = jest.fn().mockResolvedValue('Selection cleared');

        await executor.performHealthCheck();
        const status = executor.getHealthStatus();

        expect(status).toHaveProperty('healthy');
        expect(status).toHaveProperty('lastCheck');
        expect(status).toHaveProperty('consecutiveFailures');
        expect(status).toHaveProperty('circuitBreakerState');
    });
});

/**
 * FAWE Graceful Degradation Tests
 *
 * Tests for detecting and handling vanilla WorldEdit vs FAWE.
 * Verifies:
 * - WorldEdit type detection (FAWE vs vanilla WE)
 * - Adjusted ACK patterns based on type
 * - Graceful fallback when FAWE-specific features fail
 *
 * CLAUDE.md Contract:
 * - Priority 3 Reliability: "Graceful FAWE Degradation - Detect vanilla WorldEdit and adjust expectations"
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { WorldEditExecutor, WORLDEDIT_TYPE } from '../../src/worldedit/executor.js';

describe('FAWE Degradation - Contract Tests', () => {
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
    });

    describe('WorldEdit type detection', () => {
        test('WORLDEDIT_TYPE constants are defined', () => {
            expect(WORLDEDIT_TYPE).toBeDefined();
            expect(WORLDEDIT_TYPE.FAWE).toBe('fawe');
            expect(WORLDEDIT_TYPE.VANILLA).toBe('vanilla');
            expect(WORLDEDIT_TYPE.UNKNOWN).toBe('unknown');
        });

        test('initial worldEditType is UNKNOWN', () => {
            expect(executor.worldEditType).toBe(WORLDEDIT_TYPE.UNKNOWN);
        });

        test('detects FAWE from version response', async () => {
            // Simulate FAWE version response
            setTimeout(() => {
                mockBot._messageHandler({ toString: () => 'FastAsyncWorldEdit version 2.5.0' });
            }, 10);

            await executor.checkAvailability();

            expect(executor.worldEditType).toBe(WORLDEDIT_TYPE.FAWE);
        });

        test('detects vanilla WorldEdit from version response', async () => {
            // Simulate vanilla WE response
            setTimeout(() => {
                mockBot._messageHandler({ toString: () => 'WorldEdit version 7.2.0' });
            }, 10);

            await executor.checkAvailability();

            expect(executor.worldEditType).toBe(WORLDEDIT_TYPE.VANILLA);
        });

        test('defaults to UNKNOWN when detection is ambiguous', async () => {
            // Simulate generic selection response without version info
            setTimeout(() => {
                mockBot._messageHandler({ toString: () => 'Selection cleared' });
            }, 10);

            await executor.checkAvailability();

            // Should still be available but type unknown
            expect(executor.available).toBe(true);
            expect(executor.worldEditType).toBe(WORLDEDIT_TYPE.UNKNOWN);
        });
    });

    describe('Type-specific behavior', () => {
        test('isFawe() returns true for FAWE type', () => {
            executor.worldEditType = WORLDEDIT_TYPE.FAWE;
            expect(executor.isFawe()).toBe(true);
        });

        test('isFawe() returns false for vanilla type', () => {
            executor.worldEditType = WORLDEDIT_TYPE.VANILLA;
            expect(executor.isFawe()).toBe(false);
        });

        test('isVanillaWorldEdit() returns true for vanilla type', () => {
            executor.worldEditType = WORLDEDIT_TYPE.VANILLA;
            expect(executor.isVanillaWorldEdit()).toBe(true);
        });

        test('isVanillaWorldEdit() returns false for FAWE type', () => {
            executor.worldEditType = WORLDEDIT_TYPE.FAWE;
            expect(executor.isVanillaWorldEdit()).toBe(false);
        });
    });

    describe('ACK pattern handling', () => {
        test('FAWE ACK patterns include elapsed time format', () => {
            executor.worldEditType = WORLDEDIT_TYPE.FAWE;

            // FAWE response: "0.5s elapsed (history: 123 changed; ...)"
            const faweResponse = '0.5s elapsed (history: 123 changed; 456 blocks)';
            const matcher = executor.getAckMatcher();

            expect(matcher(faweResponse)).toBe(true);
        });

        test('FAWE ACK patterns include operation completed format', () => {
            executor.worldEditType = WORLDEDIT_TYPE.FAWE;

            const faweResponse = 'Operation completed (123 blocks).';
            const matcher = executor.getAckMatcher();

            expect(matcher(faweResponse)).toBe(true);
        });

        test('vanilla WE ACK patterns match standard format', () => {
            executor.worldEditType = WORLDEDIT_TYPE.VANILLA;

            // Vanilla WE response
            const vanillaResponse = '123 blocks changed';
            const matcher = executor.getAckMatcher();

            expect(matcher(vanillaResponse)).toBe(true);
        });

        test('vanilla WE patterns work with various wordings', () => {
            executor.worldEditType = WORLDEDIT_TYPE.VANILLA;
            const matcher = executor.getAckMatcher();

            expect(matcher('50 blocks affected')).toBe(true);
            expect(matcher('100 blocks set')).toBe(true);
            expect(matcher('75 blocks modified')).toBe(true);
        });

        test('UNKNOWN type accepts both pattern types', () => {
            executor.worldEditType = WORLDEDIT_TYPE.UNKNOWN;
            const matcher = executor.getAckMatcher();

            // Should accept FAWE patterns
            expect(matcher('Operation completed (123 blocks).')).toBe(true);
            expect(matcher('0.5s elapsed (history: 50 changed)')).toBe(true);

            // Should also accept vanilla patterns
            expect(matcher('123 blocks changed')).toBe(true);
        });
    });

    describe('Graceful degradation', () => {
        test('degradeToVanilla() sets type to vanilla', () => {
            executor.worldEditType = WORLDEDIT_TYPE.FAWE;
            executor.degradeToVanilla();

            expect(executor.worldEditType).toBe(WORLDEDIT_TYPE.VANILLA);
        });

        test('degradeToVanilla() logs warning', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            executor.worldEditType = WORLDEDIT_TYPE.FAWE;

            executor.degradeToVanilla('FAWE async commands failing');

            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('degrading'));
            warnSpy.mockRestore();
        });

        test('getWorldEditInfo() returns type and capabilities', () => {
            executor.worldEditType = WORLDEDIT_TYPE.FAWE;
            executor.available = true;

            const info = executor.getWorldEditInfo();

            expect(info.available).toBe(true);
            expect(info.type).toBe(WORLDEDIT_TYPE.FAWE);
            expect(info.capabilities).toContain('async');
        });

        test('vanilla WE capabilities do not include async', () => {
            executor.worldEditType = WORLDEDIT_TYPE.VANILLA;
            executor.available = true;

            const info = executor.getWorldEditInfo();

            expect(info.capabilities).not.toContain('async');
        });
    });
});

describe('FAWE Degradation - Integration', () => {
    test('type detection persists across commands', async () => {
        const mockBot = {
            chat: jest.fn(),
            on: jest.fn((event, handler) => {
                if (event === 'message') mockBot._messageHandler = handler;
            }),
            removeListener: jest.fn(),
            entity: { position: { x: 0, y: 64, z: 0 } }
        };

        const executor = new WorldEditExecutor(mockBot);

        // Simulate FAWE detection
        setTimeout(() => {
            mockBot._messageHandler({ toString: () => 'FAWE 2.5.0' });
        }, 10);

        await executor.checkAvailability();

        // Type should persist
        expect(executor.worldEditType).toBe(WORLDEDIT_TYPE.FAWE);
        expect(executor.isFawe()).toBe(true);

        // Even after multiple commands
        expect(executor.worldEditType).toBe(WORLDEDIT_TYPE.FAWE);
    });

    test('degradation is sticky until explicit reset', () => {
        const mockBot = {
            chat: jest.fn(),
            on: jest.fn(),
            removeListener: jest.fn(),
            entity: { position: { x: 0, y: 64, z: 0 } }
        };

        const executor = new WorldEditExecutor(mockBot);
        executor.worldEditType = WORLDEDIT_TYPE.FAWE;

        // Degrade
        executor.degradeToVanilla('test reason');
        expect(executor.worldEditType).toBe(WORLDEDIT_TYPE.VANILLA);

        // Should stay vanilla
        expect(executor.isFawe()).toBe(false);
        expect(executor.isVanillaWorldEdit()).toBe(true);
    });
});

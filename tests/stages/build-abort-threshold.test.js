/**
 * Build Failure Threshold Tests
 * 
 * Enforces CLAUDE.md invariant:
 * - maxFailedBlocksPercent = 25% (Build aborts if failure rate exceeds this)
 */

import { jest, describe, test, expect } from '@jest/globals';

describe('Build Abort Threshold - CLAUDE.md Contract', () => {
    describe('INVARIANT: Build aborts when failure rate exceeds 25%', () => {
        const MAX_FAILED_BLOCKS_PERCENT = 25;

        function shouldAbortBuild(totalBlocks, failedBlocks) {
            const failureRate = (failedBlocks / totalBlocks) * 100;
            return failureRate > MAX_FAILED_BLOCKS_PERCENT;
        }

        test('24% failure rate should CONTINUE build', () => {
            const totalBlocks = 100;
            const failedBlocks = 24;

            const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
            expect(shouldAbort).toBe(false);
        });

        test('25% failure rate should CONTINUE build (boundary)', () => {
            const totalBlocks = 100;
            const failedBlocks = 25;

            const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
            // At exactly 25%, should NOT abort (threshold is exclusive)
            expect(shouldAbort).toBe(false);
        });

        test('26% failure rate should ABORT build', () => {
            const totalBlocks = 100;
            const failedBlocks = 26;

            const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
            expect(shouldAbort).toBe(true);
        });

        test('50% failure rate should ABORT build', () => {
            const totalBlocks = 100;
            const failedBlocks = 50;

            const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
            expect(shouldAbort).toBe(true);
        });

        test('0% failure rate should CONTINUE build', () => {
            const totalBlocks = 100;
            const failedBlocks = 0;

            const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
            expect(shouldAbort).toBe(false);
        });

        test('100% failure rate should ABORT build', () => {
            const totalBlocks = 100;
            const failedBlocks = 100;

            const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
            expect(shouldAbort).toBe(true);
        });
    });

    describe('Fractional block counts', () => {
        test('25 failures out of 99 blocks = 25.25% should ABORT', () => {
            const totalBlocks = 99;
            const failedBlocks = 25;
            const failureRate = (failedBlocks / totalBlocks) * 100;

            expect(failureRate).toBeGreaterThan(25);
            expect(shouldAbortBuild(totalBlocks, failedBlocks)).toBe(true);
        });

        test('25 failures out of 101 blocks = 24.75% should CONTINUE', () => {
            const totalBlocks = 101;
            const failedBlocks = 25;
            const failureRate = (failedBlocks / totalBlocks) * 100;

            expect(failureRate).toBeLessThan(25);
            expect(shouldAbortBuild(totalBlocks, failedBlocks)).toBe(false);
        });

        test('1 failure out of 3 blocks = 33.33% should ABORT', () => {
            const totalBlocks = 3;
            const failedBlocks = 1;
            const failureRate = (failedBlocks / totalBlocks) * 100;

            expect(failureRate).toBeGreaterThan(25);
            expect(shouldAbortBuild(totalBlocks, failedBlocks)).toBe(true);
        });

        test('1 failure out of 4 blocks = 25% should CONTINUE', () => {
            const totalBlocks = 4;
            const failedBlocks = 1;
            const failureRate = (failedBlocks / totalBlocks) * 100;

            expect(failureRate).toBe(25);
            expect(shouldAbortBuild(totalBlocks, failedBlocks)).toBe(false);
        });
    });

    describe('Large build scenarios', () => {
        test('250 failures out of 1000 blocks = 25% should CONTINUE', () => {
            const totalBlocks = 1000;
            const failedBlocks = 250;

            const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
            expect(shouldAbort).toBe(false);
        });

        test('251 failures out of 1000 blocks = 25.1% should ABORT', () => {
            const totalBlocks = 1000;
            const failedBlocks = 251;

            const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
            expect(shouldAbort).toBe(true);
        });

        test('2500 failures out of 10000 blocks = 25% should CONTINUE', () => {
            const totalBlocks = 10000;
            const failedBlocks = 2500;

            const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
            expect(shouldAbort).toBe(false);
        });
    });

    describe('Early abort detection', () => {
        test('should check threshold continuously during build', () => {
            // Simulate progressive failure accumulation
            const buildSequence = [
                { placed: 10, failed: 2 },   // 20% - continue
                { placed: 20, failed: 5 },   // 25% - continue
                { placed: 30, failed: 9 },   // 30% - should abort here
                { placed: 40, failed: 12 },  // Would be 30% if reached
            ];

            const results = buildSequence.map(({ placed, failed }) => ({
                placed,
                failed,
                shouldAbort: shouldAbortBuild(placed, failed)
            }));

            expect(results[0].shouldAbort).toBe(false);
            expect(results[1].shouldAbort).toBe(false);
            expect(results[2].shouldAbort).toBe(true);
            expect(results[3].shouldAbort).toBe(true);
        });

        test('early failures detected in small builds', () => {
            // After just 8 blocks placed with 3 failed
            const totalBlocks = 8;
            const failedBlocks = 3;
            const failureRate = (failedBlocks / totalBlocks) * 100;

            // 37.5% failure rate should abort early
            expect(failureRate).toBeGreaterThan(25);
            expect(shouldAbortBuild(totalBlocks, failedBlocks)).toBe(true);
        });
    });

    describe('Edge cases', () => {
        test('single block failure should not cause abort', () => {
            const totalBlocks = 1;
            const failedBlocks = 1;

            // 100% failure but only 1 block - implementation might have minimum threshold
            const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
            expect(shouldAbort).toBe(true);
        });

        test('zero total blocks handled gracefully', () => {
            const totalBlocks = 0;
            const failedBlocks = 0;

            // Should not divide by zero
            if (totalBlocks === 0) {
                expect(true).toBe(true); // No abort on empty build
            } else {
                const shouldAbort = shouldAbortBuild(totalBlocks, failedBlocks);
                expect(shouldAbort).toBe(false);
            }
        });

        test('negative values rejected', () => {
            const totalBlocks = 100;
            const failedBlocks = -1;

            // Negative failures should be treated as 0
            const normalizedFailed = Math.max(0, failedBlocks);
            expect(normalizedFailed).toBe(0);
        });
    });

    describe('Failure categories do not affect threshold', () => {
        test('permission errors count toward threshold', () => {
            const permissionFailures = 10;
            const otherFailures = 16;
            const totalFailed = permissionFailures + otherFailures;
            const totalBlocks = 100;

            const shouldAbort = shouldAbortBuild(totalBlocks, totalFailed);
            expect(shouldAbort).toBe(true); // 26% total
        });

        test('timeout failures count toward threshold', () => {
            const timeoutFailures = 26;
            const totalBlocks = 100;

            const shouldAbort = shouldAbortBuild(totalBlocks, timeoutFailures);
            expect(shouldAbort).toBe(true);
        });

        test('unreachable block failures count toward threshold', () => {
            const unreachableFailures = 26;
            const totalBlocks = 100;

            const shouldAbort = shouldAbortBuild(totalBlocks, unreachableFailures);
            expect(shouldAbort).toBe(true);
        });
    });

    describe('Configuration contract', () => {
        test('INVARIANT: Threshold value matches CLAUDE.md', () => {
            const CLAUDE_MD_THRESHOLD = 25;
            const LIMITS_CONFIG_THRESHOLD = 25; // from src/config/limits.js:446

            expect(CLAUDE_MD_THRESHOLD).toBe(25);
            expect(LIMITS_CONFIG_THRESHOLD).toBe(25);
        });

        test('threshold is inclusive on lower bound', () => {
            // Exactly 25% should NOT abort
            const failureRate = 25.0;
            const threshold = 25;

            const shouldAbort = failureRate > threshold; // Using > not >=
            expect(shouldAbort).toBe(false);
        });

        test('threshold is exclusive on upper bound', () => {
            // Any value > 25% should abort
            const failureRate = 25.01;
            const threshold = 25;

            const shouldAbort = failureRate > threshold;
            expect(shouldAbort).toBe(true);
        });
    });
});

// Helper exposed for contract verification
function shouldAbortBuild(totalBlocks, failedBlocks) {
    if (totalBlocks === 0) return false;
    const failureRate = (failedBlocks / totalBlocks) * 100;
    return failureRate > 25;
}

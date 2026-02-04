/**
 * Failure Fast-Path Tests
 *
 * Tests for early detection of impossible builds.
 * Verifies:
 * - Invalid dimension detection
 * - Impossible block combinations
 * - Resource limit checks
 * - Early abort triggers
 *
 * CLAUDE.md Contract:
 * - Priority 1 UX: "Failure Fast-Path"
 */

import { describe, test, expect } from '@jest/globals';
import {
    FailureFastPath,
    QuickValidationResult,
    detectImpossibleBuild,
    checkPromptFeasibility,
    QUICK_FAIL_REASONS
} from '../../src/ux/failure-fast-path.js';

describe('FailureFastPath - Prompt Validation', () => {
    describe('checkPromptFeasibility', () => {
        test('accepts valid simple prompts', () => {
            const result = checkPromptFeasibility('build a small house');

            expect(result.feasible).toBe(true);
            expect(result.warnings.length).toBe(0);
        });

        test('warns about extremely large requests', () => {
            const result = checkPromptFeasibility('build a 1000 block tall tower');

            expect(result.feasible).toBe(true); // Still feasible, just warned
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings[0]).toContain('large');
        });

        test('detects impossible height requests', () => {
            const result = checkPromptFeasibility('build a tower to y=500');

            expect(result.feasible).toBe(false);
            expect(result.reason).toContain('height');
        });

        test('detects impossible negative coordinates', () => {
            const result = checkPromptFeasibility('build at y=-100');

            expect(result.feasible).toBe(false);
            expect(result.reason).toContain('below');
        });

        test('warns about vague large-scale requests', () => {
            const result = checkPromptFeasibility('build an entire city');

            expect(result.warnings.length).toBeGreaterThan(0);
        });

        test('accepts detailed small builds', () => {
            const result = checkPromptFeasibility('build a 5x5 wooden platform');

            expect(result.feasible).toBe(true);
            expect(result.warnings.length).toBe(0);
        });
    });
});

describe('FailureFastPath - Blueprint Quick Check', () => {
    describe('detectImpossibleBuild', () => {
        test('passes valid blueprint', () => {
            const blueprint = {
                operations: [
                    { type: 'box', width: 10, height: 5, depth: 10, block: 'stone' }
                ]
            };

            const result = detectImpossibleBuild(blueprint);

            expect(result.valid).toBe(true);
        });

        test('fails blueprint with zero dimensions', () => {
            const blueprint = {
                operations: [
                    { type: 'box', width: 0, height: 5, depth: 10, block: 'stone' }
                ]
            };

            const result = detectImpossibleBuild(blueprint);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe(QUICK_FAIL_REASONS.ZERO_DIMENSION);
        });

        test('fails blueprint with negative dimensions', () => {
            const blueprint = {
                operations: [
                    { type: 'box', width: -5, height: 5, depth: 10, block: 'stone' }
                ]
            };

            const result = detectImpossibleBuild(blueprint);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe(QUICK_FAIL_REASONS.NEGATIVE_DIMENSION);
        });

        test('fails blueprint exceeding height limit', () => {
            const blueprint = {
                operations: [
                    { type: 'box', x: 0, y: 0, z: 0, width: 5, height: 400, depth: 5, block: 'stone' }
                ]
            };

            const result = detectImpossibleBuild(blueprint);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe(QUICK_FAIL_REASONS.EXCEEDS_HEIGHT);
        });

        test('fails blueprint with missing block type', () => {
            const blueprint = {
                operations: [
                    { type: 'box', width: 5, height: 5, depth: 5 } // missing block
                ]
            };

            const result = detectImpossibleBuild(blueprint);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe(QUICK_FAIL_REASONS.MISSING_BLOCK);
        });

        test('fails empty operations array', () => {
            const blueprint = { operations: [] };

            const result = detectImpossibleBuild(blueprint);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe(QUICK_FAIL_REASONS.NO_OPERATIONS);
        });

        test('fails blueprint exceeding max steps', () => {
            const blueprint = {
                operations: Array(3000).fill({ type: 'box', width: 1, height: 1, depth: 1, block: 'stone' })
            };

            const result = detectImpossibleBuild(blueprint);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe(QUICK_FAIL_REASONS.EXCEEDS_STEPS);
        });

        test('warns about large block count but passes', () => {
            const blueprint = {
                operations: [
                    { type: 'box', width: 100, height: 50, depth: 100, block: 'stone' } // 500,000 blocks
                ]
            };

            const result = detectImpossibleBuild(blueprint);

            // Still valid but should have warning
            expect(result.valid).toBe(true);
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });
});

describe('FailureFastPath - QUICK_FAIL_REASONS', () => {
    test('all reasons are defined', () => {
        expect(QUICK_FAIL_REASONS.ZERO_DIMENSION).toBeDefined();
        expect(QUICK_FAIL_REASONS.NEGATIVE_DIMENSION).toBeDefined();
        expect(QUICK_FAIL_REASONS.EXCEEDS_HEIGHT).toBeDefined();
        expect(QUICK_FAIL_REASONS.EXCEEDS_STEPS).toBeDefined();
        expect(QUICK_FAIL_REASONS.MISSING_BLOCK).toBeDefined();
        expect(QUICK_FAIL_REASONS.NO_OPERATIONS).toBeDefined();
        expect(QUICK_FAIL_REASONS.INVALID_BLOCK).toBeDefined();
    });

    test('reasons are unique strings', () => {
        const reasons = Object.values(QUICK_FAIL_REASONS);
        const uniqueReasons = new Set(reasons);
        expect(uniqueReasons.size).toBe(reasons.length);
    });
});

describe('FailureFastPath class', () => {
    let validator;

    beforeEach(() => {
        validator = new FailureFastPath();
    });

    describe('Quick validation', () => {
        test('validates prompt before LLM call', () => {
            const result = validator.validatePrompt('build a house');

            expect(result).toBeInstanceOf(QuickValidationResult);
            expect(result.canProceed()).toBe(true);
        });

        test('validates blueprint before execution', () => {
            const blueprint = {
                operations: [
                    { type: 'box', width: 5, height: 5, depth: 5, block: 'stone' }
                ]
            };

            const result = validator.validateBlueprint(blueprint);

            expect(result).toBeInstanceOf(QuickValidationResult);
            expect(result.canProceed()).toBe(true);
        });

        test('returns early for invalid prompt', () => {
            const result = validator.validatePrompt('build at y=9999');

            expect(result.canProceed()).toBe(false);
            expect(result.getFailureReason()).toBeDefined();
        });
    });

    describe('Configuration', () => {
        test('accepts custom limits', () => {
            const customValidator = new FailureFastPath({
                maxHeight: 128,
                maxSteps: 500,
                maxBlocks: 100000
            });

            const tallBlueprint = {
                operations: [
                    { type: 'box', y: 0, width: 5, height: 150, depth: 5, block: 'stone' }
                ]
            };

            const result = customValidator.validateBlueprint(tallBlueprint);

            expect(result.canProceed()).toBe(false);
        });

        test('uses default limits when not specified', () => {
            const defaultValidator = new FailureFastPath();

            // Should use CLAUDE.md defaults (maxHeight: 256)
            const blueprint = {
                operations: [
                    { type: 'box', y: 0, width: 5, height: 200, depth: 5, block: 'stone' }
                ]
            };

            const result = defaultValidator.validateBlueprint(blueprint);

            expect(result.canProceed()).toBe(true); // 200 < 256
        });
    });

    describe('Performance', () => {
        test('validation completes quickly (< 10ms)', () => {
            const blueprint = {
                operations: Array(1000).fill({
                    type: 'box', width: 5, height: 5, depth: 5, block: 'stone'
                })
            };

            const start = Date.now();
            validator.validateBlueprint(blueprint);
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(10);
        });
    });
});

describe('QuickValidationResult', () => {
    test('success result has no errors', () => {
        const result = new QuickValidationResult(true);

        expect(result.canProceed()).toBe(true);
        expect(result.getFailureReason()).toBeNull();
        expect(result.getWarnings()).toEqual([]);
    });

    test('failure result has reason', () => {
        const result = new QuickValidationResult(false, 'Test failure');

        expect(result.canProceed()).toBe(false);
        expect(result.getFailureReason()).toBe('Test failure');
    });

    test('can have warnings without failure', () => {
        const result = new QuickValidationResult(true, null, ['Warning 1', 'Warning 2']);

        expect(result.canProceed()).toBe(true);
        expect(result.getWarnings()).toHaveLength(2);
    });

    test('toJSON includes all fields', () => {
        const result = new QuickValidationResult(true, null, ['Warning']);
        const json = result.toJSON();

        expect(json).toHaveProperty('valid');
        expect(json).toHaveProperty('reason');
        expect(json).toHaveProperty('warnings');
    });
});

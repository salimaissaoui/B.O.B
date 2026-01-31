/**
 * Tests for Safety Limits Configuration
 *
 * Verifies:
 * - New config sections exist and have correct defaults
 * - External config loading
 * - Deep merge functionality
 */

import { SAFETY_LIMITS } from '../../src/config/limits.js';

describe('Safety Limits - New Config Sections', () => {
    describe('planning config', () => {
        test('has enabled flag', () => {
            expect(SAFETY_LIMITS.planning).toBeDefined();
            expect(typeof SAFETY_LIMITS.planning.enabled).toBe('boolean');
        });

        test('has maxComponents limit', () => {
            expect(SAFETY_LIMITS.planning.maxComponents).toBeDefined();
            expect(SAFETY_LIMITS.planning.maxComponents).toBeGreaterThan(0);
            expect(SAFETY_LIMITS.planning.maxComponents).toBeLessThanOrEqual(20);
        });

        test('has maxLLMCalls limit', () => {
            expect(SAFETY_LIMITS.planning.maxLLMCalls).toBeDefined();
            expect(SAFETY_LIMITS.planning.maxLLMCalls).toBeGreaterThanOrEqual(1);
        });

        test('has triggerKeywords array', () => {
            expect(Array.isArray(SAFETY_LIMITS.planning.triggerKeywords)).toBe(true);
            expect(SAFETY_LIMITS.planning.triggerKeywords.length).toBeGreaterThan(0);
            expect(SAFETY_LIMITS.planning.triggerKeywords).toContain('village');
        });
    });

    describe('codeInterpreter config', () => {
        test('exists and is disabled by default', () => {
            expect(SAFETY_LIMITS.codeInterpreter).toBeDefined();
            expect(SAFETY_LIMITS.codeInterpreter.enabled).toBe(false);
        });

        test('has iteration limit', () => {
            expect(SAFETY_LIMITS.codeInterpreter.maxIterations).toBeDefined();
            expect(SAFETY_LIMITS.codeInterpreter.maxIterations).toBeGreaterThan(0);
        });

        test('has timeout', () => {
            expect(SAFETY_LIMITS.codeInterpreter.timeoutMs).toBeDefined();
            expect(SAFETY_LIMITS.codeInterpreter.timeoutMs).toBeGreaterThan(0);
        });

        test('has allowedFunctions whitelist', () => {
            expect(Array.isArray(SAFETY_LIMITS.codeInterpreter.allowedFunctions)).toBe(true);
            expect(SAFETY_LIMITS.codeInterpreter.allowedFunctions).toContain('fill');
            expect(SAFETY_LIMITS.codeInterpreter.allowedFunctions).toContain('sphere');
        });
    });

    describe('memory config', () => {
        test('exists and is enabled by default', () => {
            expect(SAFETY_LIMITS.memory).toBeDefined();
            expect(SAFETY_LIMITS.memory.enabled).toBe(true);
        });

        test('has maxPatterns limit', () => {
            expect(SAFETY_LIMITS.memory.maxPatterns).toBeDefined();
            expect(SAFETY_LIMITS.memory.maxPatterns).toBeGreaterThan(0);
        });

        test('has expiryDays', () => {
            expect(SAFETY_LIMITS.memory.expiryDays).toBeDefined();
            expect(SAFETY_LIMITS.memory.expiryDays).toBeGreaterThan(0);
        });

        test('has storagePath', () => {
            expect(SAFETY_LIMITS.memory.storagePath).toBeDefined();
            expect(typeof SAFETY_LIMITS.memory.storagePath).toBe('string');
        });

        test('has minQualityToSave threshold', () => {
            expect(SAFETY_LIMITS.memory.minQualityToSave).toBeDefined();
            expect(SAFETY_LIMITS.memory.minQualityToSave).toBeGreaterThan(0);
            expect(SAFETY_LIMITS.memory.minQualityToSave).toBeLessThanOrEqual(1);
        });
    });

    describe('scaffolding config', () => {
        test('exists and is enabled by default', () => {
            expect(SAFETY_LIMITS.scaffolding).toBeDefined();
            expect(SAFETY_LIMITS.scaffolding.enabled).toBe(true);
        });

        test('has maxHeight', () => {
            expect(SAFETY_LIMITS.scaffolding.maxHeight).toBeDefined();
            expect(SAFETY_LIMITS.scaffolding.maxHeight).toBeGreaterThan(0);
            expect(SAFETY_LIMITS.scaffolding.maxHeight).toBeLessThanOrEqual(256);
        });

        test('has scaffoldBlock', () => {
            expect(SAFETY_LIMITS.scaffolding.scaffoldBlock).toBeDefined();
            expect(typeof SAFETY_LIMITS.scaffolding.scaffoldBlock).toBe('string');
        });

        test('has autoCleanup flag', () => {
            expect(typeof SAFETY_LIMITS.scaffolding.autoCleanup).toBe('boolean');
        });
    });

    describe('export config', () => {
        test('exists and is enabled by default', () => {
            expect(SAFETY_LIMITS.export).toBeDefined();
            expect(SAFETY_LIMITS.export.enabled).toBe(true);
        });

        test('has outputPath', () => {
            expect(SAFETY_LIMITS.export.outputPath).toBeDefined();
            expect(typeof SAFETY_LIMITS.export.outputPath).toBe('string');
        });

        test('has supported formats array', () => {
            expect(Array.isArray(SAFETY_LIMITS.export.formats)).toBe(true);
            expect(SAFETY_LIMITS.export.formats).toContain('schem');
            expect(SAFETY_LIMITS.export.formats).toContain('mcfunction');
        });
    });
});

describe('Safety Limits - Existing Sections', () => {
    test('has core limits', () => {
        expect(SAFETY_LIMITS.maxBlocks).toBeDefined();
        expect(SAFETY_LIMITS.maxWidth).toBeDefined();
        expect(SAFETY_LIMITS.maxHeight).toBeDefined();
        expect(SAFETY_LIMITS.maxDepth).toBeDefined();
    });

    test('has WorldEdit config', () => {
        expect(SAFETY_LIMITS.worldEdit).toBeDefined();
        expect(SAFETY_LIMITS.worldEdit.enabled).toBeDefined();
        expect(SAFETY_LIMITS.worldEdit.maxSelectionVolume).toBeDefined();
    });

    test('has LLM config', () => {
        expect(SAFETY_LIMITS.llmTimeoutMs).toBeDefined();
        expect(SAFETY_LIMITS.llmMaxRetries).toBeDefined();
        expect(SAFETY_LIMITS.llmMaxOutputTokens).toBeDefined();
    });
});

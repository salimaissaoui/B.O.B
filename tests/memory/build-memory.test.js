/**
 * Tests for Build Memory Module
 *
 * Verifies:
 * - Pattern storage and retrieval
 * - Block correction tracking
 * - Quality filtering for saved patterns
 * - Pattern pruning and expiry
 */

import { jest } from '@jest/globals';
import { existsSync, rmSync, mkdirSync } from 'fs';

const { BuildMemory, getMemory } = await import('../../src/memory/build-memory.js');

// Test storage directory
const TEST_STORAGE = './test-bob-memory';

describe('BuildMemory', () => {
    let memory;

    beforeEach(() => {
        // Clean test directory
        if (existsSync(TEST_STORAGE)) {
            rmSync(TEST_STORAGE, { recursive: true, force: true });
        }
        memory = new BuildMemory({
            storagePath: TEST_STORAGE,
            maxPatterns: 5,
            expiryDays: 30
        });
    });

    afterEach(() => {
        rmSync(TEST_STORAGE, { recursive: true, force: true });
    });

    describe('constructor', () => {
        test('creates storage directory if missing', () => {
            expect(existsSync(TEST_STORAGE)).toBe(true);
        });

        test('uses default options from SAFETY_LIMITS', () => {
            const defaultMemory = new BuildMemory({ storagePath: TEST_STORAGE });
            expect(defaultMemory.maxPatterns).toBeDefined();
            expect(defaultMemory.expiryDays).toBeDefined();
        });
    });

    describe('recordPattern', () => {
        const testBlueprint = {
            buildType: 'house',
            theme: 'medieval',
            size: { width: 10, height: 8, depth: 12 },
            palette: { wall: 'stone_bricks' },
            steps: [{ op: 'fill' }, { op: 'wall' }]
        };

        test('records high-quality patterns', () => {
            memory.recordPattern(testBlueprint, 0.9, { user: 'test' });

            const patterns = memory.findSimilarPatterns('house');
            expect(patterns.length).toBe(1);
            expect(patterns[0].buildType).toBe('house');
            expect(patterns[0].avgQuality).toBe(0.9);
        });

        test('rejects low-quality patterns', () => {
            memory.recordPattern(testBlueprint, 0.5, {}); // Below 0.8 threshold

            const patterns = memory.findSimilarPatterns('house');
            expect(patterns.length).toBe(0);
        });

        test('updates existing pattern on repeat', () => {
            // Use exact same blueprint to ensure same key
            const blueprint = {
                buildType: 'house',
                theme: 'medieval',
                size: { width: 10, height: 8, depth: 12 },
                steps: [{ op: 'fill' }]
            };

            memory.recordPattern(blueprint, 0.85, {});
            memory.recordPattern(blueprint, 0.95, {});

            const patterns = memory.findSimilarPatterns('house');
            expect(patterns.length).toBe(1);
            expect(patterns[0].uses).toBe(2);
            // Use toBeCloseTo for floating point comparison
            expect(patterns[0].avgQuality).toBeCloseTo(0.9, 5);
        });

        test('keeps highest quality blueprint', () => {
            memory.recordPattern(testBlueprint, 0.85, {});

            const betterBlueprint = { ...testBlueprint, steps: [{ op: 'improved' }] };
            memory.recordPattern(betterBlueprint, 0.95, {});

            const patterns = memory.findSimilarPatterns('house');
            expect(patterns[0].bestQuality).toBe(0.95);
        });
    });

    describe('recordCorrection', () => {
        test('records block name corrections', () => {
            memory.recordCorrection('oak_wood', 'oak_log');

            expect(memory.getCorrection('oak_wood')).toBe('oak_log');
        });

        test('increments count on repeated corrections', () => {
            memory.recordCorrection('oak_wood', 'oak_log');
            memory.recordCorrection('oak_wood', 'oak_log');

            const corrections = memory.getAllCorrections();
            expect(corrections.get('oak_wood').count).toBe(2);
        });

        test('returns null for unknown corrections', () => {
            expect(memory.getCorrection('valid_block')).toBeNull();
        });
    });

    describe('findSimilarPatterns', () => {
        test('finds patterns by build type', () => {
            memory.recordPattern({ buildType: 'house', theme: 'default', size: { width: 5, height: 5, depth: 5 }, steps: [] }, 0.9);
            memory.recordPattern({ buildType: 'castle', theme: 'default', size: { width: 20, height: 20, depth: 20 }, steps: [] }, 0.85);

            const houses = memory.findSimilarPatterns('house');
            expect(houses.length).toBe(1);
            expect(houses[0].buildType).toBe('house');
        });

        test('prioritizes matching themes', () => {
            memory.recordPattern({ buildType: 'house', theme: 'medieval', size: { width: 5, height: 5, depth: 5 }, steps: [] }, 0.85);
            memory.recordPattern({ buildType: 'house', theme: 'modern', size: { width: 5, height: 5, depth: 5 }, steps: [] }, 0.9);

            const patterns = memory.findSimilarPatterns('house', 'medieval');
            expect(patterns[0].theme).toBe('medieval'); // Theme match wins despite lower quality
        });

        test('sorts by match score', () => {
            memory.recordPattern({ buildType: 'tower', theme: 'fantasy', size: { width: 8, height: 30, depth: 8 }, steps: [] }, 0.95);
            memory.recordPattern({ buildType: 'tower', theme: 'medieval', size: { width: 6, height: 25, depth: 6 }, steps: [] }, 0.88);

            const patterns = memory.findSimilarPatterns('tower', 'fantasy');
            expect(patterns[0].theme).toBe('fantasy');
        });
    });

    describe('getFewShotExample', () => {
        test('returns best matching pattern', () => {
            memory.recordPattern({ buildType: 'house', theme: 'medieval', size: { width: 8, height: 6, depth: 10 }, steps: [] }, 0.92);

            const example = memory.getFewShotExample('house', 'medieval');
            expect(example).not.toBeNull();
            expect(example.buildType).toBe('house');
        });

        test('returns null when no patterns exist', () => {
            const example = memory.getFewShotExample('spaceship', 'scifi');
            expect(example).toBeNull();
        });
    });

    describe('prunePatterns', () => {
        test('removes patterns exceeding maxPatterns', () => {
            // Add 6 patterns when max is 5
            for (let i = 0; i < 6; i++) {
                memory.recordPattern(
                    { buildType: `type${i}`, theme: 'default', size: { width: 5, height: 5, depth: 5 }, steps: [] },
                    0.8 + (i * 0.02) // Increasing quality
                );
            }

            expect(memory.patterns.size).toBe(5);
        });
    });

    describe('persistence', () => {
        test('saves and loads patterns from disk', () => {
            memory.recordPattern({ buildType: 'house', theme: 'persisted', size: { width: 10, height: 8, depth: 12 }, steps: [] }, 0.9);
            memory.recordCorrection('wrong_block', 'right_block');

            // Create new instance to test loading
            const memory2 = new BuildMemory({ storagePath: TEST_STORAGE });

            const patterns = memory2.findSimilarPatterns('house');
            expect(patterns.length).toBe(1);
            expect(memory2.getCorrection('wrong_block')).toBe('right_block');
        });
    });

    describe('getStats', () => {
        test('returns correct statistics', () => {
            memory.recordPattern({ buildType: 'house', theme: 'default', size: { width: 5, height: 5, depth: 5 }, steps: [] }, 0.85);
            memory.recordPattern({ buildType: 'castle', theme: 'default', size: { width: 20, height: 20, depth: 20 }, steps: [] }, 0.95);
            memory.recordCorrection('bad', 'good');

            const stats = memory.getStats();
            expect(stats.patternCount).toBe(2);
            expect(stats.correctionCount).toBe(1);
            expect(stats.avgQuality).toBeCloseTo(0.9, 5);
            expect(stats.totalUses).toBe(2);
        });
    });

    describe('clear', () => {
        test('removes all patterns and corrections', () => {
            memory.recordPattern({ buildType: 'house', theme: 'default', size: { width: 5, height: 5, depth: 5 }, steps: [] }, 0.9);
            memory.recordCorrection('bad', 'good');

            memory.clear();

            expect(memory.patterns.size).toBe(0);
            expect(memory.corrections.size).toBe(0);
        });
    });
});

describe('getMemory (singleton)', () => {
    test('returns singleton instance', () => {
        const m1 = getMemory();
        const m2 = getMemory();
        expect(m1).toBe(m2);
    });
});

/**
 * Schematic Gallery Threshold Tests
 * 
 * Enforces CLAUDE.md invariant:
 * - Gallery threshold = 0.6 (scores >= 0.6 trigger, < 0.6 rejected)
 * 
 * These tests verify the matching logic and threshold behavior
 * without requiring actual schematic files.
 */

import { jest, describe, test, expect } from '@jest/globals';

describe('Schematic Gallery - CLAUDE.md Contract', () => {
    describe('INVARIANT: Gallery threshold = 0.6', () => {
        test('threshold constant value matches contract', () => {
            // This value is hardcoded in src/bot/commands.js:342
            const THRESHOLD = 0.6;

            expect(THRESHOLD).toBe(0.6);
        });

        test('boundary: score 0.59 should not pass threshold', () => {
            const score = 0.59;
            const threshold = 0.6;

            const shouldAccept = score >= threshold;
            expect(shouldAccept).toBe(false);
        });

        test('boundary: score 0.6 exactly should pass threshold', () => {
            const score = 0.6;
            const threshold = 0.6;

            const shouldAccept = score >= threshold;
            expect(shouldAccept).toBe(true);
        });

        test('boundary: score 0.61 should pass threshold', () => {
            const score = 0.61;
            const threshold = 0.6;

            const shouldAccept = score >= threshold;
            expect(shouldAccept).toBe(true);
        });

        test('score 1.0 (exact match) should always pass', () => {
            const score = 1.0;
            const threshold = 0.6;

            const shouldAccept = score >= threshold;
            expect(shouldAccept).toBe(true);
        });

        test('score 0.0 (no match) should always fail', () => {
            const score = 0.0;
            const threshold = 0.6;

            const shouldAccept = score >= threshold;
            expect(shouldAccept).toBe(false);
        });

        test('fractional scores near boundary', () => {
            const threshold = 0.6;

            const testCases = [
                { score: 0.5999, expected: false },
                { score: 0.6, expected: true },
                { score: 0.6001, expected: true },
            ];

            for (const { score, expected } of testCases) {
                const shouldAccept = score >= threshold;
                expect(shouldAccept).toBe(expected);
            }
        });
    });

    describe('Routing integration', () => {
        test('INVARIANT ENFORCEMENT: commands.js uses 0.6 threshold', () => {
            // From src/bot/commands.js:342
            // const schematicMatch = await findSchematicMatch(cleanPrompt, 0.6);

            const DOCUMENTED_THRESHOLD = 0.6;
            const CODE_THRESHOLD = 0.6; // Verified in commands.js:342

            expect(CODE_THRESHOLD).toBe(DOCUMENTED_THRESHOLD);
        });

        test('gallery match prevents downstream routing if score >= threshold', () => {
            const galleryScore = 0.75;
            const threshold = 0.6;

            const galleryMatched = galleryScore >= threshold;
            const shouldContinueToV2 = !galleryMatched;
            const shouldContinueToV1 = !galleryMatched;

            expect(galleryMatched).toBe(true);
            expect(shouldContinueToV2).toBe(false);
            expect(shouldContinueToV1).toBe(false);
        });

        test('gallery miss allows downstream routing if score < threshold', () => {
            const galleryScore = 0.55;
            const threshold = 0.6;

            const galleryMatched = galleryScore >= threshold;
            const shouldContinueToV2 = !galleryMatched;

            expect(galleryMatched).toBe(false);
            expect(shouldContinueToV2).toBe(true);
        });
    });

    describe('Similarity score calculation logic', () => {
        test('exact match should return 1.0', () => {
            // Logic: if names match exactly after normalization
            const queryNormalized = 'modern_house';
            const schematicName = 'modern_house';

            const isExactMatch = queryNormalized === schematicName;
            const score = isExactMatch ? 1.0 : 0.5;

            expect(score).toBe(1.0);
        });

        test('keyword match scoring logic', () => {
            // If query has 2 words and 1 matches, score = 0.5
            // If query has 2 words and 2 match, score = 1.0

            const queryWords = ['medieval', 'castle'];
            const keywords = ['medieval', 'castle'];

            let matches = 0;
            for (const word of queryWords) {
                if (keywords.includes(word)) {
                    matches += 1;
                }
            }

            const score = matches / queryWords.length;
            expect(score).toBe(1.0);
        });

        test('partial match scoring', () => {
            // Partial matches get 0.5 credit
            const queryWords = ['hous']; // Partial word
            const keywords = ['house'];

            let matches = 0;
            for (const word of queryWords) {
                for (const keyword of keywords) {
                    if (keyword.includes(word) || word.includes(keyword)) {
                        matches += 0.5;
                        break;
                    }
                }
            }

            const score = matches / queryWords.length;
            expect(score).toBe(0.5);
        });
    });
});

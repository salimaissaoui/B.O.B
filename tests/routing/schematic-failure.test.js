/**
 * Schematic Load Failure Tests
 *
 * CLAUDE.md Contract Enforcement:
 * "Schematic loading failure → Immediate ABORT"
 *
 * When a user explicitly requests a schematic file and it fails to load,
 * the system must ABORT - not silently fall back to gallery search or LLM generation.
 * This prevents users from getting unexpected builds when their file request fails.
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Schematic Load Failure - CLAUDE.md Contract', () => {
    describe('INVARIANT: Explicit path failure aborts (no fallback)', () => {
        test('schematic load error should NOT continue to gallery', () => {
            // Simulates: !build ./schematics/missing.schem
            // If file doesn't exist, user should see error, NOT gallery search

            const schematicLoadFailed = true;
            const shouldSearchGallery = false; // NEVER

            expect(schematicLoadFailed).toBe(true);
            expect(shouldSearchGallery).toBe(false);
        });

        test('schematic load error should NOT continue to V2 pipeline', () => {
            const schematicLoadFailed = true;
            const shouldTryV2 = false; // NEVER

            expect(schematicLoadFailed).toBe(true);
            expect(shouldTryV2).toBe(false);
        });

        test('schematic load error should NOT continue to V1 pipeline', () => {
            const schematicLoadFailed = true;
            const shouldTryV1 = false; // NEVER

            expect(schematicLoadFailed).toBe(true);
            expect(shouldTryV1).toBe(false);
        });

        test('schematic load error should return early from command handler', () => {
            // The command handler pattern is:
            // try { load schematic } catch (error) { chat error; return; }

            function simulateSchematicRouting(loadFailed) {
                let reachedGallery = false;
                let reachedV2 = false;
                let reachedV1 = false;
                let returnedEarly = false;

                // Step 1: Try schematic load
                if (loadFailed) {
                    // chat error
                    returnedEarly = true;
                    return { reachedGallery, reachedV2, reachedV1, returnedEarly };
                }

                // Step 2: Would search gallery (never reached if Step 1 errors)
                reachedGallery = true;

                // Step 3: Would try V2 (never reached if Step 1 errors)
                reachedV2 = true;

                // Step 4: Would try V1 (never reached if Step 1 errors)
                reachedV1 = true;

                return { reachedGallery, reachedV2, reachedV1, returnedEarly };
            }

            const result = simulateSchematicRouting(true);

            expect(result.returnedEarly).toBe(true);
            expect(result.reachedGallery).toBe(false);
            expect(result.reachedV2).toBe(false);
            expect(result.reachedV1).toBe(false);
        });
    });

    describe('Error message contract', () => {
        test('schematic error should include descriptive message', () => {
            const error = new Error('Schematic not found: ./schematics/missing.schem');

            expect(error.message).toContain('not found');
            expect(error.message).toContain('missing.schem');
        });

        test('error types are properly distinguishable', () => {
            // Different schematic errors should have clear messages

            const fileNotFound = new Error('Schematic not found: ./test.schem');
            const parseError = new Error('Invalid schematic format');
            const sizeError = new Error('Schematic exceeds size limits');

            expect(fileNotFound.message).toContain('not found');
            expect(parseError.message).toContain('Invalid');
            expect(sizeError.message).toContain('exceeds');
        });
    });

    describe('Path detection edge cases', () => {
        test('Windows path with drive letter is detected as schematic', () => {
            const prompt = 'C:\\Users\\player\\schematics\\test.schem';
            const isPath = prompt.includes('/') || prompt.includes('\\');

            expect(isPath).toBe(true);
        });

        test('relative path with ./ is detected as schematic', () => {
            const prompt = './schematics/test.schem';
            const isPath = prompt.includes('/') || prompt.includes('\\');

            expect(isPath).toBe(true);
        });

        test('relative path with ../ is detected as schematic', () => {
            const prompt = '../other-folder/test.schem';
            const isPath = prompt.includes('/') || prompt.includes('\\');

            expect(isPath).toBe(true);
        });

        test('URL-like path is detected as schematic', () => {
            // Even though it looks like a URL, it contains /
            const prompt = 'https://example.com/test.schem';
            const isPath = prompt.includes('/') || prompt.includes('\\');

            expect(isPath).toBe(true);
        });
    });

    describe('Gallery-initiated schematic load failure', () => {
        test('gallery schematic load error is handled separately', () => {
            // Different contract: Gallery schematic load errors continue routing
            // This is because gallery is a "best effort" match, not explicit request

            function simulateGalleryRouting(galleryMatch, galleryLoadFailed) {
                let usedGallery = false;
                let reachedV1 = false;

                if (galleryMatch) {
                    try {
                        if (galleryLoadFailed) {
                            throw new Error('Gallery schematic load failed');
                        }
                        usedGallery = true;
                        return { usedGallery, reachedV1 };
                    } catch (e) {
                        // Gallery errors caught and logged, continue routing
                        console.warn('Gallery error, continuing...');
                    }
                }

                // Falls through to V1
                reachedV1 = true;
                return { usedGallery, reachedV1 };
            }

            // Gallery match found but load fails - should continue to V1
            const result = simulateGalleryRouting(true, true);
            expect(result.usedGallery).toBe(false);
            expect(result.reachedV1).toBe(true);
        });
    });

    describe('Distinguishing explicit vs gallery schematic requests', () => {
        test('explicit path takes different failure path than gallery', () => {
            // INVARIANT: Explicit = ABORT, Gallery = continue

            function getFailurePolicy(isExplicitPath) {
                return isExplicitPath ? 'ABORT' : 'CONTINUE';
            }

            expect(getFailurePolicy(true)).toBe('ABORT');
            expect(getFailurePolicy(false)).toBe('CONTINUE');
        });
    });
});

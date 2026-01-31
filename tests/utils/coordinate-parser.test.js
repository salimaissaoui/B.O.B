import { jest, describe, test, expect } from '@jest/globals';
import {
    parseCoordinateFlags,
    stripCoordinateFlags,
    getBoundingBoxDimensions,
    validateBoundingBox
} from '../../src/utils/coordinate-parser.js';

describe('Coordinate Parser', () => {
    describe('parseCoordinateFlags', () => {
        test('returns null position when no --at flag present', () => {
            const result = parseCoordinateFlags('!build house');
            expect(result.position).toBeNull();
            expect(result.boundingBox).toBeNull();
        });

        test('parses --at flag with positive coordinates', () => {
            const result = parseCoordinateFlags('!build house --at 100,64,200');
            expect(result.position).toEqual({ x: 100, y: 64, z: 200 });
            expect(result.boundingBox).toBeNull();
        });

        test('parses --at flag with negative coordinates', () => {
            const result = parseCoordinateFlags('!build castle --at -50,-10,300');
            expect(result.position).toEqual({ x: -50, y: -10, z: 300 });
        });

        test('parses --at flag with zero coordinates', () => {
            const result = parseCoordinateFlags('!build tower --at 0,0,0');
            expect(result.position).toEqual({ x: 0, y: 0, z: 0 });
        });

        test('parses --at flag with spaces around commas', () => {
            const result = parseCoordinateFlags('!build house --at 100 , 64 , 200');
            expect(result.position).toEqual({ x: 100, y: 64, z: 200 });
        });

        test('parses --at and --to flags for bounding box', () => {
            const result = parseCoordinateFlags('!build house --at 100,64,200 --to 120,80,220');
            expect(result.position).toEqual({ x: 100, y: 64, z: 200 });
            expect(result.boundingBox).toEqual({
                min: { x: 100, y: 64, z: 200 },
                max: { x: 120, y: 80, z: 220 }
            });
        });

        test('normalizes reversed --at and --to coordinates', () => {
            const result = parseCoordinateFlags('!build house --at 120,80,220 --to 100,64,200');
            expect(result.boundingBox.min).toEqual({ x: 100, y: 64, z: 200 });
            expect(result.boundingBox.max).toEqual({ x: 120, y: 80, z: 220 });
            // Position should be updated to min corner
            expect(result.position).toEqual({ x: 100, y: 64, z: 200 });
        });

        test('ignores --to without --at', () => {
            const result = parseCoordinateFlags('!build house --to 120,80,220');
            expect(result.position).toBeNull();
            expect(result.boundingBox).toBeNull();
        });

        test('handles --at flag at end of message', () => {
            const result = parseCoordinateFlags('!build medieval castle with towers --at 500,70,500');
            expect(result.position).toEqual({ x: 500, y: 70, z: 500 });
        });

        test('handles --at flag in middle of message', () => {
            const result = parseCoordinateFlags('!build --at 100,64,200 house');
            expect(result.position).toEqual({ x: 100, y: 64, z: 200 });
        });

        test('case insensitive flag parsing', () => {
            const result = parseCoordinateFlags('!build house --AT 100,64,200 --TO 150,100,250');
            expect(result.position).not.toBeNull();
            expect(result.boundingBox).not.toBeNull();
        });
    });

    describe('stripCoordinateFlags', () => {
        test('removes --at flag from message', () => {
            const result = stripCoordinateFlags('!build house --at 100,64,200');
            expect(result).toBe('!build house');
        });

        test('removes --at and --to flags from message', () => {
            const result = stripCoordinateFlags('!build house --at 100,64,200 --to 120,80,220');
            expect(result).toBe('!build house');
        });

        test('preserves prompt when flags are in middle', () => {
            const result = stripCoordinateFlags('!build --at 100,64,200 large castle');
            expect(result).toBe('!build large castle');
        });

        test('normalizes whitespace after stripping', () => {
            const result = stripCoordinateFlags('!build house   --at 100,64,200   with garden');
            expect(result).toBe('!build house with garden');
        });

        test('returns original message when no flags present', () => {
            const result = stripCoordinateFlags('!build medieval castle');
            expect(result).toBe('!build medieval castle');
        });
    });

    describe('getBoundingBoxDimensions', () => {
        test('calculates correct dimensions', () => {
            const box = {
                min: { x: 100, y: 64, z: 200 },
                max: { x: 120, y: 80, z: 220 }
            };
            const dims = getBoundingBoxDimensions(box);
            expect(dims).toEqual({ width: 21, height: 17, depth: 21 });
        });

        test('returns null for null bounding box', () => {
            expect(getBoundingBoxDimensions(null)).toBeNull();
        });

        test('returns null for incomplete bounding box', () => {
            expect(getBoundingBoxDimensions({ min: { x: 0, y: 0, z: 0 } })).toBeNull();
        });

        test('handles single-block bounding box', () => {
            const box = {
                min: { x: 100, y: 64, z: 200 },
                max: { x: 100, y: 64, z: 200 }
            };
            const dims = getBoundingBoxDimensions(box);
            expect(dims).toEqual({ width: 1, height: 1, depth: 1 });
        });
    });

    describe('validateBoundingBox', () => {
        test('validates bounding box within limits', () => {
            const box = {
                min: { x: 0, y: 0, z: 0 },
                max: { x: 50, y: 50, z: 50 }
            };
            const result = validateBoundingBox(box, { maxWidth: 100, maxHeight: 256, maxDepth: 100 });
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('rejects bounding box exceeding width limit', () => {
            const box = {
                min: { x: 0, y: 0, z: 0 },
                max: { x: 150, y: 50, z: 50 }
            };
            const result = validateBoundingBox(box, { maxWidth: 100 });
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Width');
        });

        test('rejects bounding box exceeding height limit', () => {
            const box = {
                min: { x: 0, y: 0, z: 0 },
                max: { x: 50, y: 300, z: 50 }
            };
            const result = validateBoundingBox(box, { maxHeight: 256 });
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Height');
        });

        test('returns valid for null bounding box', () => {
            const result = validateBoundingBox(null);
            expect(result.valid).toBe(true);
        });

        test('uses default limits when none provided', () => {
            const box = {
                min: { x: 0, y: 0, z: 0 },
                max: { x: 100, y: 100, z: 100 }
            };
            const result = validateBoundingBox(box);
            expect(result.valid).toBe(true);
        });
    });
});

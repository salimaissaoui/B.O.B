/**
 * Tests for Semantic Validator
 *
 * Verifies:
 * - Feature presence validation
 * - Dimension matching
 * - Theme consistency checks
 * - Structure validation
 */

const { SemanticValidator } = await import('../../src/validation/semantic-validator.js');

describe('SemanticValidator', () => {
    let validator;

    beforeEach(() => {
        validator = new SemanticValidator();
    });

    describe('constructor', () => {
        test('strict mode is enabled by default', () => {
            expect(validator.strictMode).toBe(true);
        });

        test('strict mode can be disabled', () => {
            const lenient = new SemanticValidator({ strictMode: false });
            expect(lenient.strictMode).toBe(false);
        });
    });

    describe('validateFeatures', () => {
        test('passes when requested features are present', () => {
            const blueprint = {
                steps: [
                    { op: 'door', block: 'oak_door' },
                    { op: 'window', block: 'glass_pane' }
                ]
            };

            const analysis = {
                hints: { features: ['door', 'window'] }
            };

            const result = validator.validateFeatures(blueprint, analysis);
            expect(result.errors.length).toBe(0);
            expect(result.warnings.length).toBe(0);
        });

        test('reports error for missing features in strict mode', () => {
            const blueprint = {
                steps: [{ op: 'fill', block: 'stone' }]
            };

            const analysis = {
                hints: { features: ['door', 'chimney'] }
            };

            const result = validator.validateFeatures(blueprint, analysis);
            expect(result.errors).toContain('Missing feature: door');
            expect(result.errors).toContain('Missing feature: chimney');
        });

        test('reports warnings instead of errors in lenient mode', () => {
            const lenient = new SemanticValidator({ strictMode: false });
            const blueprint = { steps: [] };
            const analysis = { hints: { features: ['door'] } };

            const result = lenient.validateFeatures(blueprint, analysis);
            expect(result.errors.length).toBe(0);
            expect(result.warnings.length).toBe(1);
        });

        test('detects features by block type', () => {
            const blueprint = {
                palette: { door: 'spruce_door' },
                steps: [{ op: 'set', block: 'glass' }]
            };

            const analysis = { hints: { features: ['window'] } };

            const result = validator.validateFeatures(blueprint, analysis);
            expect(result.errors.length).toBe(0);
        });
    });

    describe('validateDimensions', () => {
        test('passes when dimensions match expectations', () => {
            const blueprint = { size: { width: 10, height: 8, depth: 10 } };
            const analysis = {
                buildType: 'house',
                hints: { dimensions: { width: 10, height: 8, depth: 10 } }
            };

            const result = validator.validateDimensions(blueprint, analysis);
            expect(result.errors.length).toBe(0);
            expect(result.warnings.length).toBe(0);
        });

        test('allows 20% tolerance', () => {
            const blueprint = { size: { width: 11, height: 7, depth: 9 } };
            const analysis = {
                buildType: 'house',
                hints: { dimensions: { width: 10, height: 8, depth: 10 } }
            };

            const result = validator.validateDimensions(blueprint, analysis);
            expect(result.errors.length).toBe(0);
        });

        test('warns when dimensions differ significantly', () => {
            const blueprint = { size: { width: 5, height: 15, depth: 5 } };
            const analysis = {
                buildType: 'house',
                hints: { dimensions: { width: 10, height: 8, depth: 10 } }
            };

            const result = validator.validateDimensions(blueprint, analysis);
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        test('errors when build is too small for type', () => {
            const blueprint = { size: { width: 2, height: 2, depth: 2 } };
            const analysis = { buildType: 'castle', hints: {} };

            const result = validator.validateDimensions(blueprint, analysis);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0]).toContain('too small');
        });
    });

    describe('getMinDimensions', () => {
        test('returns appropriate minimums for different build types', () => {
            expect(validator.getMinDimensions('house')).toEqual({ width: 5, height: 4, depth: 5 });
            expect(validator.getMinDimensions('castle')).toEqual({ width: 15, height: 10, depth: 15 });
            expect(validator.getMinDimensions('tower')).toEqual({ width: 4, height: 8, depth: 4 });
        });

        test('returns small default for unknown types', () => {
            const min = validator.getMinDimensions('unknown_type');
            expect(min.width).toBe(2);
            expect(min.height).toBe(2);
            expect(min.depth).toBe(2);
        });
    });

    describe('validateTheme', () => {
        test('suggests theme-appropriate blocks', () => {
            const blueprint = {
                palette: { wall: 'quartz_block' }, // Modern block in medieval theme
                steps: []
            };

            const analysis = { theme: { name: 'medieval' } };

            const result = validator.validateTheme(blueprint, analysis);
            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.suggestions[0]).toContain('medieval');
        });

        test('passes when theme blocks are present', () => {
            const blueprint = {
                palette: { wall: 'cobblestone', roof: 'oak_planks' },
                steps: []
            };

            const analysis = { theme: { name: 'medieval' } };

            const result = validator.validateTheme(blueprint, analysis);
            expect(result.suggestions.length).toBe(0);
        });
    });

    describe('validateStructure', () => {
        test('validates complete buildings', () => {
            const blueprint = {
                steps: [
                    { op: 'fill', block: 'cobblestone' },    // Foundation
                    { op: 'hollow_box', block: 'planks' },   // Walls
                    { op: 'pitched_roof', block: 'stairs' }  // Roof
                ]
            };

            const analysis = { buildType: 'house' };

            const result = validator.validateStructure(blueprint, analysis);
            expect(result.errors.length).toBe(0);
        });

        test('errors when walls are missing from buildings', () => {
            const blueprint = {
                steps: [{ op: 'fill', block: 'stone' }]
            };

            const analysis = { buildType: 'house' };

            const result = validator.validateStructure(blueprint, analysis);
            expect(result.errors).toContain('No walls detected - building incomplete');
        });

        test('warns when roof is missing', () => {
            const blueprint = {
                steps: [
                    { op: 'we_fill', block: 'stone' },  // Foundation (not in roof list)
                    { op: 'wall', block: 'planks' }
                ]
            };

            const analysis = { buildType: 'house' };

            const result = validator.validateStructure(blueprint, analysis);
            expect(result.warnings).toContain('No roof detected');
        });

        test('skips structure checks for non-building types', () => {
            const blueprint = { steps: [{ op: 'set', block: 'stone' }] };
            const analysis = { buildType: 'statue' };

            const result = validator.validateStructure(blueprint, analysis);
            expect(result.errors.length).toBe(0);
        });
    });

    describe('validate (full)', () => {
        test('returns valid for complete blueprint', () => {
            const blueprint = {
                size: { width: 10, height: 6, depth: 10 },
                palette: { wall: 'stone_bricks' },
                steps: [
                    { op: 'fill', block: 'cobblestone' },
                    { op: 'hollow_box', block: 'stone_bricks' },
                    { op: 'pitched_roof', block: 'oak_stairs' },
                    { op: 'door', block: 'oak_door' }
                ]
            };

            const analysis = {
                buildType: 'house',
                theme: { name: 'medieval' },
                hints: { features: ['door'], dimensions: {} }
            };

            const result = validator.validate(blueprint, analysis);
            expect(result.valid).toBe(true);
            expect(result.score).toBeGreaterThan(0.8);
        });

        test('returns invalid for incomplete blueprint', () => {
            const blueprint = {
                size: { width: 3, height: 3, depth: 3 },
                steps: []
            };

            const analysis = {
                buildType: 'castle',
                hints: { features: ['tower', 'gate'] }
            };

            const result = validator.validate(blueprint, analysis);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('calculates semantic score', () => {
            const blueprint = {
                size: { width: 10, height: 8, depth: 10 },
                steps: [{ op: 'fill' }, { op: 'wall' }]
            };

            const analysis = { buildType: 'house', hints: {} };

            const result = validator.validate(blueprint, analysis);
            expect(result.score).toBeDefined();
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(1);
        });
    });

    describe('extractBlocks', () => {
        test('extracts blocks from palette', () => {
            const blueprint = {
                palette: { wall: 'stone_bricks', floor: 'oak_planks' },
                steps: []
            };

            const blocks = validator.extractBlocks(blueprint);
            expect(blocks).toContain('stone_bricks');
            expect(blocks).toContain('oak_planks');
        });

        test('extracts blocks from steps', () => {
            const blueprint = {
                steps: [
                    { op: 'fill', block: 'cobblestone' },
                    { op: 'set', block: 'oak_door' }
                ]
            };

            const blocks = validator.extractBlocks(blueprint);
            expect(blocks).toContain('cobblestone');
            expect(blocks).toContain('oak_door');
        });
    });

    describe('calculateSemanticScore', () => {
        test('returns 1 for no issues', () => {
            const score = validator.calculateSemanticScore([], []);
            expect(score).toBe(1);
        });

        test('reduces score for errors', () => {
            const score = validator.calculateSemanticScore(['error1', 'error2'], []);
            expect(score).toBeLessThan(1);
            expect(score).toBe(0.6);
        });

        test('slightly reduces score for warnings', () => {
            const score = validator.calculateSemanticScore([], ['warn1', 'warn2']);
            expect(score).toBe(0.9);
        });

        test('never goes below 0', () => {
            const score = validator.calculateSemanticScore(
                Array(10).fill('error'),
                Array(10).fill('warning')
            );
            expect(score).toBe(0);
        });
    });
});

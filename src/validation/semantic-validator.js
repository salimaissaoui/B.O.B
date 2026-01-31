/**
 * Semantic Validator
 *
 * Validates that a generated blueprint matches the user's original intent.
 * Goes beyond structural validation to check semantic correctness.
 *
 * Checks:
 * - Requested features are present (doors, windows, chimneys, etc.)
 * - Build dimensions match expectations
 * - Theme consistency (materials match style)
 * - Structural components present (foundation, walls, roof for buildings)
 */

export class SemanticValidator {
    constructor(options = {}) {
        this.options = options;
        this.strictMode = options.strictMode !== false;
    }

    /**
     * Validate blueprint against user intent
     *
     * @param {Object} blueprint - Generated blueprint
     * @param {Object} analysis - Original prompt analysis
     * @returns {Object} Validation result { valid, errors, warnings, suggestions }
     */
    validate(blueprint, analysis) {
        const errors = [];
        const warnings = [];
        const suggestions = [];

        // 1. Check required features are present
        const featureResult = this.validateFeatures(blueprint, analysis);
        errors.push(...featureResult.errors);
        warnings.push(...featureResult.warnings);

        // 2. Check dimensions match expectations
        const dimResult = this.validateDimensions(blueprint, analysis);
        errors.push(...dimResult.errors);
        warnings.push(...dimResult.warnings);

        // 3. Check theme consistency
        const themeResult = this.validateTheme(blueprint, analysis);
        warnings.push(...themeResult.warnings);
        suggestions.push(...themeResult.suggestions);

        // 4. Check structural integrity
        const structureResult = this.validateStructure(blueprint, analysis);
        errors.push(...structureResult.errors);
        warnings.push(...structureResult.warnings);

        const valid = errors.length === 0;

        return {
            valid,
            errors,
            warnings,
            suggestions,
            score: this.calculateSemanticScore(errors, warnings)
        };
    }

    /**
     * Validate that requested features are present
     */
    validateFeatures(blueprint, analysis) {
        const errors = [];
        const warnings = [];

        const requestedFeatures = analysis.hints?.features || [];
        const operations = blueprint.steps?.map(s => s.op) || [];
        const blocks = this.extractBlocks(blueprint);

        // Map features to expected operations/blocks
        const featureChecks = {
            door: {
                ops: ['door', 'set'],
                blocks: ['door', 'oak_door', 'spruce_door', 'iron_door']
            },
            window: {
                ops: ['window', 'window_strip', 'set'],
                blocks: ['glass', 'glass_pane', 'tinted_glass']
            },
            chimney: {
                ops: ['chimney', 'column', 'line'],
                blocks: ['bricks', 'stone_bricks', 'cobblestone']
            },
            roof: {
                ops: ['roof', 'pitched_roof', 'pyramid', 'stairs_line'],
                blocks: ['stairs', 'slab', 'oak_stairs', 'spruce_stairs']
            },
            foundation: {
                ops: ['fill', 'we_fill', 'box'],
                blocks: ['cobblestone', 'stone', 'stone_bricks', 'deepslate']
            },
            garden: {
                ops: ['set', 'fill'],
                blocks: ['grass_block', 'flower', 'rose_bush', 'oak_leaves']
            },
            tower: {
                ops: ['column', 'cylinder', 'we_cyl'],
                blocks: ['stone_bricks', 'cobblestone', 'bricks']
            }
        };

        for (const feature of requestedFeatures) {
            const normalizedFeature = feature.toLowerCase().trim();
            const check = featureChecks[normalizedFeature];

            if (check) {
                const hasOp = operations.some(op =>
                    check.ops.some(checkOp => op.includes(checkOp))
                );
                const hasBlock = blocks.some(block =>
                    check.blocks.some(checkBlock =>
                        block.toLowerCase().includes(checkBlock.toLowerCase())
                    )
                );

                if (!hasOp && !hasBlock) {
                    if (this.strictMode) {
                        errors.push(`Missing feature: ${feature}`);
                    } else {
                        warnings.push(`Feature may be missing: ${feature}`);
                    }
                }
            }
        }

        return { errors, warnings };
    }

    /**
     * Validate dimensions match expectations
     */
    validateDimensions(blueprint, analysis) {
        const errors = [];
        const warnings = [];

        const expected = analysis.hints?.dimensions || {};
        const actual = blueprint.size || {};

        // Allow 20% tolerance
        const tolerance = 0.2;

        if (expected.width && actual.width) {
            const diff = Math.abs(actual.width - expected.width) / expected.width;
            if (diff > tolerance) {
                warnings.push(
                    `Width mismatch: expected ~${expected.width}, got ${actual.width}`
                );
            }
        }

        if (expected.height && actual.height) {
            const diff = Math.abs(actual.height - expected.height) / expected.height;
            if (diff > tolerance) {
                warnings.push(
                    `Height mismatch: expected ~${expected.height}, got ${actual.height}`
                );
            }
        }

        if (expected.depth && actual.depth) {
            const diff = Math.abs(actual.depth - expected.depth) / expected.depth;
            if (diff > tolerance) {
                warnings.push(
                    `Depth mismatch: expected ~${expected.depth}, got ${actual.depth}`
                );
            }
        }

        // Check minimum reasonable dimensions for build type
        const minDimensions = this.getMinDimensions(analysis.buildType);
        if (actual.width < minDimensions.width ||
            actual.height < minDimensions.height ||
            actual.depth < minDimensions.depth) {
            errors.push(
                `Build too small for type '${analysis.buildType}': ` +
                `minimum ${minDimensions.width}x${minDimensions.height}x${minDimensions.depth}`
            );
        }

        return { errors, warnings };
    }

    /**
     * Get minimum dimensions for a build type
     */
    getMinDimensions(buildType) {
        const minimums = {
            house: { width: 5, height: 4, depth: 5 },
            castle: { width: 15, height: 10, depth: 15 },
            tower: { width: 4, height: 8, depth: 4 },
            tree: { width: 3, height: 5, depth: 3 },
            statue: { width: 3, height: 4, depth: 3 },
            bridge: { width: 3, height: 2, depth: 8 },
            wall: { width: 1, height: 3, depth: 10 },
            pixel_art: { width: 1, height: 5, depth: 5 }
        };

        return minimums[buildType] || { width: 2, height: 2, depth: 2 };
    }

    /**
     * Validate theme consistency
     */
    validateTheme(blueprint, analysis) {
        const warnings = [];
        const suggestions = [];

        const theme = analysis.theme?.name || 'default';
        const blocks = this.extractBlocks(blueprint);

        // Theme-appropriate materials
        const themeBlocks = {
            medieval: ['oak', 'cobblestone', 'stone_brick', 'spruce'],
            modern: ['quartz', 'concrete', 'glass', 'iron'],
            fantasy: ['prismarine', 'purpur', 'end_stone', 'amethyst'],
            rustic: ['oak', 'spruce', 'stripped', 'barrel'],
            japanese: ['acacia', 'bamboo', 'cherry', 'lantern']
        };

        const appropriate = themeBlocks[theme] || [];

        if (appropriate.length > 0) {
            const hasThemeBlocks = blocks.some(block =>
                appropriate.some(theme => block.toLowerCase().includes(theme))
            );

            if (!hasThemeBlocks && blocks.length > 0) {
                suggestions.push(
                    `Consider using theme-appropriate blocks for '${theme}' style: ` +
                    appropriate.slice(0, 3).join(', ')
                );
            }
        }

        return { warnings, suggestions };
    }

    /**
     * Validate structural integrity
     */
    validateStructure(blueprint, analysis) {
        const errors = [];
        const warnings = [];

        const ops = blueprint.steps?.map(s => s.op) || [];
        const buildType = analysis.buildType;

        // Buildings need foundation, walls, and roof
        const buildingTypes = ['house', 'castle', 'cabin', 'cottage', 'barn', 'shop'];

        // Specialized types that benefit from three_d_layers or specific shapes
        const organicTypes = ['tree', 'statue', 'character', 'sculpture'];

        if (buildingTypes.includes(buildType)) {
            // Check for foundation/floor
            const hasFoundation = ops.some(op =>
                ['fill', 'we_fill', 'box', 'floor', 'three_d_layers'].includes(op)
            );
            if (!hasFoundation) {
                warnings.push('No foundation/floor detected');
            }

            // Check for walls
            const hasWalls = ops.some(op =>
                ['wall', 'hollow_box', 'we_walls', 'three_d_layers'].includes(op)
            );
            if (!hasWalls) {
                errors.push('No walls detected - building incomplete');
            }

            // Check for roof (optional warning)
            const hasRoof = ops.some(op =>
                ['roof', 'pitched_roof', 'pyramid', 'fill', 'three_d_layers'].includes(op)
            );
            if (!hasRoof) {
                warnings.push('No roof detected');
            }
        }

        if (organicTypes.includes(buildType)) {
            // Organic builds SHOULD use organic shapes or layers
            const hasOrganicShapes = ops.some(op =>
                ['we_sphere', 'we_cylinder', 'three_d_layers', 'line'].includes(op)
            );

            if (!hasOrganicShapes) {
                warnings.push(`Organic build type '${buildType}' uses mostly boxy operations. Consider we_sphere or three_d_layers for better form.`);
            }

            // Statues/Characters MUST have some complexity
            if (['statue', 'character'].includes(buildType) && ops.length < 5) {
                warnings.push('Statue build seems too simple - needs more anatomical detail');
            }
        }

        return { errors, warnings };
    }

    /**
     * Extract all block types from blueprint
     */
    extractBlocks(blueprint) {
        const blocks = new Set();

        // From palette
        if (blueprint.palette) {
            Object.values(blueprint.palette).forEach(b => blocks.add(b));
        }

        // From steps
        for (const step of blueprint.steps || []) {
            if (step.block) {
                blocks.add(step.block);
            }
            if (step.blocks) {
                Object.values(step.blocks).forEach(b => blocks.add(b));
            }
            // Specialist support for legend-based operations
            if (step.legend && typeof step.legend === 'object') {
                Object.values(step.legend).forEach(b => blocks.add(b));
            }
        }

        return Array.from(blocks);
    }

    /**
     * Calculate semantic score (0-1)
     */
    calculateSemanticScore(errors, warnings) {
        let score = 1.0;

        // Each error reduces score significantly
        score -= errors.length * 0.2;

        // Warnings reduce score slightly
        score -= warnings.length * 0.05;

        return Math.max(0, Math.min(1, score));
    }
}

export default SemanticValidator;

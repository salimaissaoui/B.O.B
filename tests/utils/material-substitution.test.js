/**
 * Material Substitution Tests
 *
 * Tests for material substitution in blueprints.
 * Verifies:
 * - Simple block replacement
 * - Material family substitution (oak -> spruce)
 * - Palette-based substitution
 * - Blueprint transformation
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "Material Substitution"
 */

import { describe, test, expect } from '@jest/globals';
import {
    MaterialSubstitutor,
    MATERIAL_FAMILIES,
    getMaterialFamily,
    getRelatedMaterials,
    substituteBlock,
    substituteBlueprint,
    parseMaterialCommand
} from '../../src/utils/material-substitution.js';

describe('Material Substitution - Material Families', () => {
    describe('MATERIAL_FAMILIES', () => {
        test('wood family includes all wood types', () => {
            expect(MATERIAL_FAMILIES.wood).toBeDefined();
            expect(MATERIAL_FAMILIES.wood).toContain('oak');
            expect(MATERIAL_FAMILIES.wood).toContain('spruce');
            expect(MATERIAL_FAMILIES.wood).toContain('birch');
            expect(MATERIAL_FAMILIES.wood).toContain('jungle');
            expect(MATERIAL_FAMILIES.wood).toContain('acacia');
            expect(MATERIAL_FAMILIES.wood).toContain('dark_oak');
        });

        test('stone family includes stone variants', () => {
            expect(MATERIAL_FAMILIES.stone).toBeDefined();
            expect(MATERIAL_FAMILIES.stone).toContain('stone');
            expect(MATERIAL_FAMILIES.stone).toContain('cobblestone');
            expect(MATERIAL_FAMILIES.stone).toContain('stone_bricks');
        });

        test('colored family includes all colors', () => {
            expect(MATERIAL_FAMILIES.colored).toBeDefined();
            expect(MATERIAL_FAMILIES.colored.length).toBeGreaterThanOrEqual(16);
        });
    });

    describe('getMaterialFamily', () => {
        test('identifies wood family from block name', () => {
            expect(getMaterialFamily('oak_planks')).toBe('wood');
            expect(getMaterialFamily('spruce_log')).toBe('wood');
            expect(getMaterialFamily('birch_stairs')).toBe('wood');
        });

        test('identifies stone family from block name', () => {
            expect(getMaterialFamily('stone_bricks')).toBe('stone');
            expect(getMaterialFamily('cobblestone')).toBe('stone');
        });

        test('identifies colored family', () => {
            expect(getMaterialFamily('red_wool')).toBe('colored');
            expect(getMaterialFamily('blue_concrete')).toBe('colored');
        });

        test('returns null for unknown materials', () => {
            expect(getMaterialFamily('bedrock')).toBeNull();
        });
    });

    describe('getRelatedMaterials', () => {
        test('gets all wood planks variants', () => {
            const related = getRelatedMaterials('oak_planks');

            expect(related).toContain('spruce_planks');
            expect(related).toContain('birch_planks');
            expect(related).toContain('dark_oak_planks');
        });

        test('gets all wood log variants', () => {
            const related = getRelatedMaterials('oak_log');

            expect(related).toContain('spruce_log');
            expect(related).toContain('birch_log');
        });

        test('returns empty array for unknown block', () => {
            const related = getRelatedMaterials('unknown_block');
            expect(related).toEqual([]);
        });
    });
});

describe('Material Substitution - Block Replacement', () => {
    describe('substituteBlock', () => {
        test('substitutes wood type in planks', () => {
            const result = substituteBlock('oak_planks', 'oak', 'spruce');
            expect(result).toBe('spruce_planks');
        });

        test('substitutes wood type in logs', () => {
            const result = substituteBlock('oak_log', 'oak', 'dark_oak');
            expect(result).toBe('dark_oak_log');
        });

        test('substitutes wood type in stairs', () => {
            const result = substituteBlock('oak_stairs', 'oak', 'birch');
            expect(result).toBe('birch_stairs');
        });

        test('substitutes wood type in fences', () => {
            const result = substituteBlock('oak_fence', 'oak', 'jungle');
            expect(result).toBe('jungle_fence');
        });

        test('substitutes color in wool', () => {
            const result = substituteBlock('red_wool', 'red', 'blue');
            expect(result).toBe('blue_wool');
        });

        test('substitutes color in concrete', () => {
            const result = substituteBlock('white_concrete', 'white', 'black');
            expect(result).toBe('black_concrete');
        });

        test('returns original if no match', () => {
            const result = substituteBlock('stone', 'oak', 'spruce');
            expect(result).toBe('stone');
        });

        test('handles direct block replacement', () => {
            const result = substituteBlock('stone', 'stone', 'cobblestone');
            expect(result).toBe('cobblestone');
        });
    });
});

describe('Material Substitution - Blueprint Transformation', () => {
    describe('substituteBlueprint', () => {
        test('substitutes all matching blocks in blueprint', () => {
            const blueprint = {
                operations: [
                    { type: 'box', block: 'oak_planks' },
                    { type: 'wall', block: 'oak_log' },
                    { type: 'stairs', block: 'oak_stairs' }
                ]
            };

            const result = substituteBlueprint(blueprint, 'oak', 'spruce');

            expect(result.operations[0].block).toBe('spruce_planks');
            expect(result.operations[1].block).toBe('spruce_log');
            expect(result.operations[2].block).toBe('spruce_stairs');
        });

        test('preserves non-matching blocks', () => {
            const blueprint = {
                operations: [
                    { type: 'box', block: 'oak_planks' },
                    { type: 'wall', block: 'stone_bricks' }
                ]
            };

            const result = substituteBlueprint(blueprint, 'oak', 'spruce');

            expect(result.operations[0].block).toBe('spruce_planks');
            expect(result.operations[1].block).toBe('stone_bricks'); // unchanged
        });

        test('handles nested block references', () => {
            const blueprint = {
                operations: [
                    {
                        type: 'smart_wall',
                        block: 'oak_planks',
                        frameBlock: 'oak_log'
                    }
                ]
            };

            const result = substituteBlueprint(blueprint, 'oak', 'dark_oak');

            expect(result.operations[0].block).toBe('dark_oak_planks');
            expect(result.operations[0].frameBlock).toBe('dark_oak_log');
        });

        test('does not modify original blueprint', () => {
            const blueprint = {
                operations: [
                    { type: 'box', block: 'oak_planks' }
                ]
            };

            substituteBlueprint(blueprint, 'oak', 'spruce');

            expect(blueprint.operations[0].block).toBe('oak_planks'); // unchanged
        });

        test('handles empty blueprint', () => {
            const blueprint = { operations: [] };
            const result = substituteBlueprint(blueprint, 'oak', 'spruce');
            expect(result.operations).toEqual([]);
        });
    });
});

describe('Material Substitution - Command Parsing', () => {
    describe('parseMaterialCommand', () => {
        test('parses "use X instead of Y"', () => {
            const result = parseMaterialCommand('use oak instead of spruce');

            expect(result.from).toBe('spruce');
            expect(result.to).toBe('oak');
        });

        test('parses "replace X with Y"', () => {
            const result = parseMaterialCommand('replace cobblestone with stone_bricks');

            expect(result.from).toBe('cobblestone');
            expect(result.to).toBe('stone_bricks');
        });

        test('parses "change X to Y"', () => {
            const result = parseMaterialCommand('change red to blue');

            expect(result.from).toBe('red');
            expect(result.to).toBe('blue');
        });

        test('parses "swap X for Y"', () => {
            const result = parseMaterialCommand('swap oak for birch');

            expect(result.from).toBe('oak');
            expect(result.to).toBe('birch');
        });

        test('returns null for unrecognized command', () => {
            const result = parseMaterialCommand('make it bigger');
            expect(result).toBeNull();
        });

        test('handles extra whitespace', () => {
            const result = parseMaterialCommand('  use   oak   instead of   spruce  ');

            expect(result.from).toBe('spruce');
            expect(result.to).toBe('oak');
        });

        test('handles underscores in block names', () => {
            const result = parseMaterialCommand('use dark_oak instead of oak');

            expect(result.from).toBe('oak');
            expect(result.to).toBe('dark_oak');
        });
    });
});

describe('MaterialSubstitutor class', () => {
    let substitutor;

    beforeEach(() => {
        substitutor = new MaterialSubstitutor();
    });

    describe('Single substitution', () => {
        test('applies single material substitution', () => {
            substitutor.addSubstitution('oak', 'spruce');

            const result = substitutor.apply('oak_planks');
            expect(result).toBe('spruce_planks');
        });

        test('chains multiple substitutions', () => {
            substitutor.addSubstitution('oak', 'spruce');
            substitutor.addSubstitution('stone', 'cobblestone');

            expect(substitutor.apply('oak_planks')).toBe('spruce_planks');
            expect(substitutor.apply('stone_bricks')).toBe('cobblestone_bricks');
        });
    });

    describe('Palette substitution', () => {
        test('applies palette to blueprint', () => {
            const palette = {
                primary: 'dark_oak',
                accent: 'spruce',
                stone: 'stone_bricks'
            };

            substitutor.setPalette(palette);

            const blueprint = {
                operations: [
                    { type: 'box', block: '$primary_planks' },
                    { type: 'wall', block: '$accent_log' }
                ]
            };

            const result = substitutor.applyToBlueprint(blueprint);

            expect(result.operations[0].block).toBe('dark_oak_planks');
            expect(result.operations[1].block).toBe('spruce_log');
        });

        test('resolves $primary placeholder', () => {
            substitutor.setPalette({ primary: 'birch' });

            expect(substitutor.apply('$primary')).toBe('birch');
            expect(substitutor.apply('$primary_planks')).toBe('birch_planks');
        });

        test('resolves $accent placeholder', () => {
            substitutor.setPalette({ accent: 'dark_oak' });

            expect(substitutor.apply('$accent')).toBe('dark_oak');
        });
    });

    describe('Blueprint transformation', () => {
        test('transforms entire blueprint', () => {
            substitutor.addSubstitution('oak', 'jungle');

            const blueprint = {
                name: 'Test House',
                operations: [
                    { type: 'box', block: 'oak_planks', x: 0, y: 0, z: 0 },
                    { type: 'outline', block: 'oak_log' },
                    { type: 'stairs', block: 'oak_stairs', facing: 'north' }
                ]
            };

            const result = substitutor.applyToBlueprint(blueprint);

            expect(result.name).toBe('Test House');
            expect(result.operations[0].block).toBe('jungle_planks');
            expect(result.operations[1].block).toBe('jungle_log');
            expect(result.operations[2].block).toBe('jungle_stairs');
            expect(result.operations[2].facing).toBe('north'); // preserved
        });

        test('handles operations with multiple block fields', () => {
            substitutor.addSubstitution('oak', 'acacia');

            const blueprint = {
                operations: [
                    {
                        type: 'smart_roof',
                        block: 'oak_planks',
                        edgeBlock: 'oak_stairs',
                        supportBlock: 'oak_fence'
                    }
                ]
            };

            const result = substitutor.applyToBlueprint(blueprint);

            expect(result.operations[0].block).toBe('acacia_planks');
            expect(result.operations[0].edgeBlock).toBe('acacia_stairs');
            expect(result.operations[0].supportBlock).toBe('acacia_fence');
        });
    });

    describe('Statistics tracking', () => {
        test('tracks substitution count', () => {
            substitutor.addSubstitution('oak', 'spruce');

            const blueprint = {
                operations: [
                    { type: 'box', block: 'oak_planks' },
                    { type: 'wall', block: 'oak_log' },
                    { type: 'stairs', block: 'stone' }
                ]
            };

            substitutor.applyToBlueprint(blueprint);

            const stats = substitutor.getStats();
            expect(stats.substitutionsMade).toBe(2);
        });

        test('resets stats correctly', () => {
            substitutor.addSubstitution('oak', 'spruce');
            substitutor.apply('oak_planks');

            substitutor.resetStats();

            const stats = substitutor.getStats();
            expect(stats.substitutionsMade).toBe(0);
        });
    });

    describe('Clear and reset', () => {
        test('clears all substitutions', () => {
            substitutor.addSubstitution('oak', 'spruce');
            substitutor.clear();

            const result = substitutor.apply('oak_planks');
            expect(result).toBe('oak_planks'); // unchanged
        });
    });
});

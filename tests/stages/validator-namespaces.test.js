
import { jest, describe, test, expect } from '@jest/globals';
import { validateBlueprint } from '../../src/stages/4-validator.js';

describe('Namespace Validation Reproduction', () => {
    // Mock analysis object
    const analysis = {
        buildType: 'house',
        hints: {}
    };

    test('should PASS when using namespaced blocks after fix', async () => {
        const blueprint = {
            size: { width: 10, height: 10, depth: 10 },
            palette: {
                primary: 'minecraft:oak_log',
                secondary: 'minecraft:stone'
            },
            steps: [
                { op: 'set', block: 'minecraft:oak_log', pos: { x: 0, y: 0, z: 0 } }
            ]
        };

        const result = await validateBlueprint(blueprint, analysis, 'dummy-key');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('should PASS when palette is namespaced but steps are not (mismatch) after fix', async () => {
        const blueprint = {
            size: { width: 10, height: 10, depth: 10 },
            palette: ['minecraft:oak_log'],
            steps: [
                { op: 'set', block: 'oak_log', pos: { x: 0, y: 0, z: 0 } }
            ]
        };

        const result = await validateBlueprint(blueprint, analysis, 'dummy-key');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        // Ensure no quality penalties for palette usage
        if (result.quality && result.quality.penalties) {
            expect(result.quality.penalties.some(p => p.includes('Palette block'))).toBe(false);
        }
    });
});

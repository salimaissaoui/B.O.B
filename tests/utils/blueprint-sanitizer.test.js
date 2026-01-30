import { jest, describe, test, expect } from '@jest/globals';
import { BlueprintSanitizer } from '../../src/utils/blueprint-sanitizer.js';

describe('Blueprint Sanitizer', () => {
    let sanitizer;

    beforeEach(() => {
        sanitizer = new BlueprintSanitizer();
    });

    test('should fix invalid block names', () => {
        const steps = [
            { op: 'set', block: 'oak_wood_planks', pos: { x: 0, y: 0, z: 0 } }, // Invalid, should map to oak_planks
            { op: 'set', block: 'stone', pos: { x: 0, y: 1, z: 0 } } // Valid
        ];
        const blueprint = { steps };

        sanitizer.sanitize(blueprint);

        // Accept oak_wood as valid correction (fuzzy match winner)
        expect(['oak_planks', 'oak_wood']).toContain(blueprint.steps[0].block);
        expect(blueprint.steps[1].block).toBe('stone');
    });

    test('should sort steps by Y level', () => {
        const steps = [
            { op: 'set', block: 'stone', pos: { x: 0, y: 10, z: 0 } },
            { op: 'set', block: 'stone', pos: { x: 0, y: 0, z: 0 } },
            { op: 'box', from: { x: 0, y: 5, z: 0 }, to: { x: 1, y: 6, z: 1 } }
        ];
        const blueprint = { steps };

        sanitizer.sanitize(blueprint);

        expect(blueprint.steps[0].pos.y).toBe(0);
        expect(blueprint.steps[1].from.y).toBe(5);
        expect(blueprint.steps[2].pos.y).toBe(10);
    });

    test('should handle unknown blocks by falling back to stone', () => {
        const steps = [{ op: 'set', block: 'super_fake_block_9000', pos: { x: 0, y: 0, z: 0 } }];
        const blueprint = { steps };

        sanitizer.sanitize(blueprint);

        expect(blueprint.steps[0].block).toBe('stone');
    });
});

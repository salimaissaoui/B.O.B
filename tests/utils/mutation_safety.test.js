import { optimizeBlueprint } from '../../src/utils/blueprint-optimizer.js';

describe('Contiguity-Aware Optimizer Regression', () => {
    test('Should merge 4 contiguous sets into a we_fill', () => {
        const contiguousBlueprint = {
            steps: [
                { op: 'set', pos: { x: 0, y: 0, z: 0 }, block: 'stone' },
                { op: 'set', pos: { x: 1, y: 0, z: 0 }, block: 'stone' },
                { op: 'set', pos: { x: 0, y: 1, z: 0 }, block: 'stone' },
                { op: 'set', pos: { x: 1, y: 1, z: 0 }, block: 'stone' }
            ]
        };
        const optimized = optimizeBlueprint(contiguousBlueprint);
        expect(optimized.steps.some(s => s.op === 'we_fill')).toBe(true);
    });

    test('Should NOT merge disconnected sets into a single we_fill', () => {
        const disconnectedBlueprint = {
            steps: [
                { op: 'set', pos: { x: 0, y: 0, z: 0 }, block: 'stone' },
                { op: 'set', pos: { x: 1, y: 0, z: 0 }, block: 'stone' },
                // Gap at y=1
                { op: 'set', pos: { x: 0, y: 2, z: 0 }, block: 'stone' },
                { op: 'set', pos: { x: 1, y: 2, z: 0 }, block: 'stone' }
            ]
        };
        const optimized = optimizeBlueprint(disconnectedBlueprint);
        // Bounding box would be 2x3x1 (volume 6), but only 4 blocks.
        // Contiguity check should prevent merging or volume check (4/6) should already prevent it.
        // But if they were aligned such that volume matched but they were diagonal?
        // Let's test non-contiguous with volume match? No, volume match works for dense blocks.
        // The real risk is "sparse merging" if the logic changes, or merging across gaps.
        expect(optimized.steps.filter(s => s.op === 'we_fill').length).toBe(0);
    });
});

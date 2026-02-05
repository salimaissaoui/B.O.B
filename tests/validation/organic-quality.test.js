import { validateTreeQuality, fixTreeQuality } from '../../src/validation/organic-quality.js';

describe('Tree Structural Integrity Regression', () => {
  const garbageTree = {
    buildType: 'tree',
    steps: [
      { op: 'we_cylinder', pos: { x: 0, y: 0, z: 0 }, height: 10, radius: 1, block: 'oak_log' },
      { op: 'we_sphere', center: { x: 0, y: 10, z: 0 }, radius: 3, block: 'oak_leaves' }
    ]
  };

  test('Single primitive tree should fail quality validation', () => {
    const result = validateTreeQuality(garbageTree);
    expect(result.valid).toBe(false);
    // Expect specific error about unnatural geometry
    expect(result.errors.some(e => e.includes('unnatural') || e.includes('sphere'))).toBe(true);
  });

  test('fixTreeQuality should produce at least 3 trunk segments and 2 leaf clusters', () => {
    const fixed = fixTreeQuality(garbageTree);

    const trunkSegments = fixed.steps.filter(s => s.block?.includes('log'));
    const leafClusters = fixed.steps.filter(s => s.block?.includes('leaves'));

    expect(trunkSegments.length).toBeGreaterThanOrEqual(3);
    expect(leafClusters.length).toBeGreaterThanOrEqual(2);
  });
});

const { validateBlueprint } = await import('../../src/stages/4-validator.js');

describe('Organic quality validation', () => {
  test('auto-fix clears organic quality errors before failing validation', async () => {
    const blueprint = {
      buildType: 'tree',
      palette: {
        trunk: 'oak_log',
        leaves: 'oak_leaves'
      },
      size: { width: 9, height: 16, depth: 9 },
      steps: [
        {
          op: 'we_cylinder',
          block: 'oak_log',
          radius: 1,
          height: 12,
          base: { x: 0, y: 0, z: 0 }
        },
        {
          op: 'we_sphere',
          block: 'oak_leaves',
          radius: 4,
          center: { x: 0, y: 10, z: 0 }
        }
      ]
    };

    const analysis = { buildType: 'tree', hints: { features: [] } };
    const result = await validateBlueprint(blueprint, analysis, null);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);

    const ops = result.blueprint.steps.map(step => step.op);
    expect(ops).not.toContain('we_sphere');
    expect(ops).not.toContain('we_cylinder');
  });
});

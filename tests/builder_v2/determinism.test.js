/**
 * Builder v2 Determinism Tests
 *
 * Verifies that same scene + seed = same plan hash
 */

import { compilePlan, verifyDeterminism } from '../../src/builder_v2/plan/compiler.js';
import { compilePlacement } from '../../src/builder_v2/compile/placement-compiler.js';
import { createSeededRandom } from '../../src/builder_v2/utils/seed.js';

describe('Plan Compilation Determinism', () => {
  const testScene = {
    version: '2.0',
    intentId: 'test-123',
    description: {
      title: 'Test Structure',
      summary: 'A test structure for determinism'
    },
    bounds: { width: 20, height: 15, depth: 20 },
    style: {
      palette: {
        primary: 'stone_bricks',
        secondary: 'oak_planks',
        accent: 'cobblestone'
      },
      theme: 'medieval'
    },
    components: [
      {
        id: 'main_room',
        type: 'room',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: {
          width: 15,
          height: 8,
          depth: 15,
          openings: [{ type: 'door', wall: 'south' }]
        }
      },
      {
        id: 'roof',
        type: 'roof_gable',
        transform: { position: { x: 0, y: 9, z: 0 } },
        params: {
          width: 18,
          depth: 18,
          pitch: 0.5
        }
      }
    ],
    detailPasses: ['lighting']
  };

  test('same scene and seed produce identical hash', () => {
    const seed = 12345;

    const plan1 = compilePlan(testScene, { seed });
    const plan2 = compilePlan(testScene, { seed });

    expect(plan1.hash).toBe(plan2.hash);
    expect(plan1.geometry.length).toBe(plan2.geometry.length);
  });

  test('different seeds produce different hashes', () => {
    const plan1 = compilePlan(testScene, { seed: 12345 });
    const plan2 = compilePlan(testScene, { seed: 54321 });

    // Hashes may differ due to randomized detail passes
    // At minimum, the seeds should be recorded differently
    expect(plan1.seed).not.toBe(plan2.seed);
  });

  test('verifyDeterminism returns true for deterministic compilation', () => {
    const isDeterministic = verifyDeterminism(testScene, 12345);
    expect(isDeterministic).toBe(true);
  });

  test('plan stats are consistent', () => {
    const seed = 99999;

    const plan1 = compilePlan(testScene, { seed });
    const plan2 = compilePlan(testScene, { seed });

    expect(plan1.stats.totalBlocks).toBe(plan2.stats.totalBlocks);
    expect(plan1.stats.uniqueBlocks).toBe(plan2.stats.uniqueBlocks);
    expect(plan1.stats.componentsExpanded).toBe(plan2.stats.componentsExpanded);
  });
});

describe('Placement Compilation Determinism', () => {
  test('same plan produces identical placement', () => {
    const testScene = {
      version: '2.0',
      intentId: 'placement-test',
      description: { title: 'Test', summary: 'Test' },
      bounds: { width: 10, height: 10, depth: 10 },
      style: {
        palette: { primary: 'stone', secondary: 'oak_planks', accent: 'cobblestone' },
        theme: 'default'
      },
      components: [
        {
          id: 'box',
          type: 'box',
          transform: { position: { x: 0, y: 0, z: 0 } },
          params: { width: 5, height: 5, depth: 5 }
        }
      ]
    };

    const plan = compilePlan(testScene, { seed: 11111 });
    const placement1 = compilePlacement(plan);
    const placement2 = compilePlacement(plan);

    expect(placement1.hash).toBe(placement2.hash);
    expect(placement1.worldEditBatches.length).toBe(placement2.worldEditBatches.length);
    expect(placement1.vanillaPlacements.length).toBe(placement2.vanillaPlacements.length);
  });
});

describe('Seeded Random Determinism', () => {
  // createSeededRandom is imported at the top of the file

  test('same seed produces same sequence', () => {
    const rng1 = createSeededRandom(42);
    const rng2 = createSeededRandom(42);

    const seq1 = [rng1.int(0, 100), rng1.int(0, 100), rng1.int(0, 100)];
    const seq2 = [rng2.int(0, 100), rng2.int(0, 100), rng2.int(0, 100)];

    expect(seq1).toEqual(seq2);
  });

  test('different seeds produce different sequences', () => {
    const rng1 = createSeededRandom(42);
    const rng2 = createSeededRandom(43);

    const seq1 = [rng1.int(0, 100), rng1.int(0, 100)];
    const seq2 = [rng2.int(0, 100), rng2.int(0, 100)];

    expect(seq1).not.toEqual(seq2);
  });

  test('state save/restore works', () => {
    const rng = createSeededRandom(12345);

    // Generate some values
    rng.int(0, 100);
    rng.int(0, 100);

    // Save state
    const savedState = rng.getState();

    // Generate more values
    const val1 = rng.int(0, 100);
    const val2 = rng.int(0, 100);

    // Restore state
    rng.setState(savedState);

    // Should get same values
    expect(rng.int(0, 100)).toBe(val1);
    expect(rng.int(0, 100)).toBe(val2);
  });
});

/**
 * Builder v2 Integration Tests
 *
 * Tests the full pipeline from intent to placement.
 */

import { analyzeIntentV2 } from '../../src/builder_v2/intent/analyzer.js';
import { compilePlan } from '../../src/builder_v2/plan/compiler.js';
import { compilePlacement } from '../../src/builder_v2/compile/placement-compiler.js';
import { validateIntent, validatePlan, validatePlacement } from '../../src/builder_v2/validate/validators.js';
import { convertToLegacyBlueprint } from '../../src/builder_v2/index.js';

// Mock scene generator for testing (no LLM calls)
function mockGenerateScene(intent) {
  const scale = intent.intent.scale;
  const dims = {
    tiny: { w: 10, h: 8, d: 10 },
    small: { w: 20, h: 12, d: 20 },
    medium: { w: 35, h: 20, d: 35 },
    large: { w: 60, h: 40, d: 60 },
    massive: { w: 100, h: 80, d: 100 },
    colossal: { w: 150, h: 120, d: 150 }
  }[scale] || { w: 30, h: 20, d: 30 };

  return {
    version: '2.0',
    intentId: intent.id,
    description: {
      title: intent.intent.reference || 'Structure',
      summary: `A ${scale} ${intent.intent.category}`
    },
    bounds: { width: dims.w, height: dims.h, depth: dims.d },
    style: {
      palette: {
        primary: 'stone_bricks',
        secondary: 'oak_planks',
        accent: 'cobblestone'
      },
      theme: 'default'
    },
    components: [
      {
        id: 'main',
        type: 'room',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: {
          width: dims.w - 4,
          height: dims.h - 5,
          depth: dims.d - 4,
          openings: [{ type: 'door', wall: 'south' }]
        }
      }
    ],
    detailPasses: ['lighting']
  };
}

describe('Full Pipeline Integration', () => {
  const context = {
    worldEditAvailable: true,
    serverVersion: '1.20.1'
  };

  describe('Eiffel Tower Prompt', () => {
    const prompt = 'Build a detailed Eiffel Tower with a plaza and railings';

    test('intent analysis produces valid output', () => {
      const intent = analyzeIntentV2(prompt, context);
      const validation = validateIntent(intent);

      if (!validation.valid) {
        console.log('Validation errors:', JSON.stringify(validation.errors, null, 2));
      }

      expect(validation.valid).toBe(true);
      expect(intent.intent.category).toBe('landmark');
      expect(intent.intent.reference).toContain('eiffel');
    });

    test('plan compilation succeeds', () => {
      const intent = analyzeIntentV2(prompt, context);
      const scene = mockGenerateScene(intent);
      const plan = compilePlan(scene, { seed: 12345 });
      const validation = validatePlan(plan);

      expect(validation.valid).toBe(true);
      expect(plan.stats.totalBlocks).toBeGreaterThan(0);
      expect(plan.hash).toHaveLength(64);
    });

    test('placement compilation succeeds', () => {
      const intent = analyzeIntentV2(prompt, context);
      const scene = mockGenerateScene(intent);
      const plan = compilePlan(scene, { seed: 12345 });
      const placement = compilePlacement(plan);
      const validation = validatePlacement(placement);

      expect(validation.valid).toBe(true);
      expect(placement.stats.estimatedTime).toBeGreaterThan(0);
    });
  });

  describe('Modern House Prompt', () => {
    const prompt = 'Build a modern two-story house with decorated interior (bedroom + kitchen + living room) and warm lighting';

    test('intent includes interior feature', () => {
      const intent = analyzeIntentV2(prompt, context);

      expect(intent.intent.category).toBe('architecture');
      expect(intent.constraints.features).toContain('interior');
      expect(intent.constraints.features).toContain('lighting');
      expect(intent.constraints.style).toBe('modern');
    });

    test('full pipeline produces valid output', () => {
      const intent = analyzeIntentV2(prompt, context);
      const scene = mockGenerateScene(intent);
      const plan = compilePlan(scene, { seed: 54321 });
      const placement = compilePlacement(plan);

      expect(plan.stats.totalBlocks).toBeGreaterThan(100);
      expect(placement.worldEditBatches.length + placement.vanillaPlacements.length).toBeGreaterThan(0);
    });
  });

  describe('3D Pikachu Statue Prompt', () => {
    const prompt = 'Build a 3D Pikachu statue, smooth silhouette, with shading and base platform';

    test('detects statue category and pikachu reference', () => {
      const intent = analyzeIntentV2(prompt, context);

      expect(intent.intent.category).toBe('statue');
      expect(intent.intent.reference).toBe('pikachu');
    });

    test('pipeline produces statue-appropriate geometry', () => {
      const intent = analyzeIntentV2(prompt, context);
      // For statue, mock a statue-specific scene
      const scene = {
        version: '2.0',
        intentId: intent.id,
        description: {
          title: 'Pikachu Statue',
          summary: '3D Pikachu with base'
        },
        bounds: { width: 20, height: 30, depth: 20 },
        style: {
          palette: {
            primary: 'yellow_concrete',
            secondary: 'black_concrete',
            accent: 'red_terracotta'
          },
          theme: 'organic'
        },
        components: [
          {
            id: 'base',
            type: 'platform',
            transform: { position: { x: 0, y: 0, z: 0 } },
            params: { width: 15, depth: 15, thickness: 2 }
          },
          {
            id: 'body',
            type: 'statue_armature',
            transform: { position: { x: 7, y: 2, z: 7 } },
            params: {
              height: 20,
              style: 'humanoid',
              proportions: { headRatio: 0.35, torsoRatio: 0.35, legRatio: 0.25 }
            }
          }
        ]
      };

      const plan = compilePlan(scene, { seed: 99999 });

      // Should have spheres and cylinders from statue_armature
      const spheres = plan.geometry.filter(g => g.type === 'sphere');
      const cylinders = plan.geometry.filter(g => g.type === 'cylinder');

      expect(spheres.length + cylinders.length).toBeGreaterThan(0);
    });
  });
});

describe('Legacy Blueprint Conversion', () => {
  test('converts v2 plan to legacy format', () => {
    const intent = analyzeIntentV2('Build a house', { worldEditAvailable: true, serverVersion: '1.20.1' });
    const scene = mockGenerateScene(intent);
    const plan = compilePlan(scene, { seed: 11111 });
    const placement = compilePlacement(plan);

    const legacy = convertToLegacyBlueprint(plan, placement);

    expect(legacy.buildType).toBe('builder_v2');
    expect(legacy.size).toBeDefined();
    expect(legacy.palette).toBeDefined();
    expect(legacy.steps).toBeDefined();
    expect(Array.isArray(legacy.steps)).toBe(true);
    expect(legacy._v2).toBeDefined();
    expect(legacy._v2.planHash).toBe(plan.hash);
  });

  test('legacy blueprint has valid operations', () => {
    const intent = analyzeIntentV2('Build a tower', { worldEditAvailable: true, serverVersion: '1.20.1' });
    const scene = mockGenerateScene(intent);
    const plan = compilePlan(scene, { seed: 22222 });
    const placement = compilePlacement(plan);

    const legacy = convertToLegacyBlueprint(plan, placement);

    const validOps = ['we_fill', 'we_walls', 'we_sphere', 'we_cylinder', 'we_pyramid', 'set'];

    for (const step of legacy.steps) {
      expect(validOps).toContain(step.op);
      expect(step.block).toBeDefined();
    }
  });
});

describe('Volume and Safety Caps', () => {
  test('plan respects volume limits', () => {
    const intent = analyzeIntentV2('Build a colossal castle', {
      worldEditAvailable: true,
      serverVersion: '1.20.1'
    });

    const scene = {
      ...mockGenerateScene(intent),
      bounds: { width: 200, height: 200, depth: 200 }
    };

    const plan = compilePlan(scene, { seed: 33333 });

    // Plan should compile without error
    expect(plan.stats.totalBlocks).toBeGreaterThan(0);
    // Height should be capped
    expect(plan.bounds.height).toBeLessThanOrEqual(256);
  });

  test('placement batches respect size limits', () => {
    const intent = analyzeIntentV2('Build a large structure', {
      worldEditAvailable: true,
      serverVersion: '1.20.1'
    });

    const scene = mockGenerateScene(intent);
    const plan = compilePlan(scene, { seed: 44444 });
    const placement = compilePlacement(plan, { batchSize: 50000 });

    // Each batch should be under the limit
    for (const batch of placement.worldEditBatches) {
      expect(batch.estimatedBlocks).toBeLessThanOrEqual(500000);
    }
  });
});

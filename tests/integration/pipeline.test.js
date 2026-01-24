import { deriveBlockAllowlist } from '../../src/stages/2-allowlist-deriver.js';
import { validateDesignPlan, validateBlueprint } from '../../src/config/schemas.js';
import { Builder } from '../../src/stages/5-builder.js';

describe('Integration Tests', () => {
  describe('Five-Stage Pipeline', () => {
    test('should process a complete design flow', () => {
      // Stage 1 output (simulated)
      const designPlan = {
        dimensions: { width: 5, depth: 5, height: 3 },
        style: 'simple cottage',
        materials: {
          walls: 'oak_planks',
          roof: 'oak_stairs',
          floor: 'stone',
          windows: 'glass_pane'
        },
        features: ['door', 'windows', 'roof']
      };

      // Validate design plan schema
      expect(validateDesignPlan(designPlan)).toBe(true);

      // Stage 2: Derive allowlist
      const allowlist = deriveBlockAllowlist(designPlan);
      expect(allowlist.length).toBeGreaterThan(0);
      expect(allowlist).toContain('oak_planks');

      // Stage 3 output (simulated blueprint)
      const blueprint = {
        size: { width: 5, depth: 5, height: 3 },
        palette: allowlist.slice(0, 4),
        steps: [
          {
            op: 'fill',
            block: 'stone',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 4, y: 0, z: 4 }
          },
          {
            op: 'hollow_box',
            block: 'oak_planks',
            from: { x: 0, y: 1, z: 0 },
            to: { x: 4, y: 2, z: 4 }
          },
          {
            op: 'roof_flat',
            block: 'oak_stairs',
            from: { x: 0, y: 3, z: 0 },
            to: { x: 4, y: 3, z: 4 }
          }
        ]
      };

      // Stage 4: Validate blueprint
      expect(validateBlueprint(blueprint)).toBe(true);
    });
  });

  describe('Builder Operations', () => {
    test('should create builder instance', () => {
      const mockBot = {
        blockAt: () => null,
        vec3: (x, y, z) => ({ x, y, z })
      };

      const builder = new Builder(mockBot);
      expect(builder).toBeDefined();
      expect(builder.building).toBe(false);
      expect(builder.history).toEqual([]);
    });

    test('should track build state', () => {
      const mockBot = {
        blockAt: () => null,
        vec3: (x, y, z) => ({ x, y, z })
      };

      const builder = new Builder(mockBot);
      expect(builder.getProgress()).toBeNull();
      
      // Simulate starting a build
      builder.building = true;
      builder.currentBuild = {
        blocksPlaced: 50,
        startTime: Date.now()
      };

      const progress = builder.getProgress();
      expect(progress).not.toBeNull();
      expect(progress.blocksPlaced).toBe(50);
      expect(progress.isBuilding).toBe(true);
    });
  });
});

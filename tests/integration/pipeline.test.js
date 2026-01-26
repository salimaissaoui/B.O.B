import { validateBlueprint as validateBlueprintSchema, validateDesignPlan } from '../../src/config/schemas.js';
import { Builder } from '../../src/stages/5-builder.js';
import { analyzePrompt } from '../../src/stages/1-analyzer.js';

/**
 * Integration Tests for the 3-Stage Pipeline
 * Note: The pipeline was refactored from 5 stages to 3 stages:
 * 1. Analyzer (no LLM) - Lightweight prompt analysis
 * 2. Generator (1 LLM call) - Single LLM call for complete blueprint
 * 3. Validator + Executor - Validation and building
 */

describe('Integration Tests', () => {
  describe('Three-Stage Pipeline', () => {
    test('should analyze prompt without LLM', () => {
      // Stage 1: Analyzer - lightweight, no LLM
      const analysis = analyzePrompt('build a small wooden house');

      expect(analysis).toBeDefined();
      expect(analysis.buildType).toBe('house');
      expect(analysis.hints).toBeDefined();
      expect(analysis.hints.dimensions).toBeDefined();
      expect(analysis.hints.dimensions.width).toBeGreaterThan(0);
      expect(analysis.hints.dimensions.height).toBeGreaterThan(0);
      expect(analysis.hints.dimensions.depth).toBeGreaterThan(0);
    });

    test('should detect different build types', () => {
      const houseAnalysis = analyzePrompt('build a house');
      expect(houseAnalysis.buildType).toBe('house');

      const towerAnalysis = analyzePrompt('build a tower');
      expect(towerAnalysis.buildType).toBe('tower');

      const castleAnalysis = analyzePrompt('build a castle');
      expect(castleAnalysis.buildType).toBe('castle');

      const pixelArtAnalysis = analyzePrompt('build pixel art heart');
      expect(pixelArtAnalysis.buildType).toBe('pixel_art');

      // Note: Characters like "charizard" are now detected as statue (3D)
      const statueAnalysis = analyzePrompt('build a charizard');
      expect(statueAnalysis.buildType).toBe('statue');
    });

    test('should detect themes', () => {
      const gothicAnalysis = analyzePrompt('build a gothic castle');
      expect(gothicAnalysis.theme).not.toBeNull();
      expect(gothicAnalysis.theme.theme).toBe('gothic');

      const japaneseAnalysis = analyzePrompt('build a japanese house');
      expect(japaneseAnalysis.theme).not.toBeNull();
      expect(japaneseAnalysis.theme.theme).toBe('japanese');
    });

    test('should validate blueprint schema', () => {
      // Simulated blueprint from Stage 2
      const blueprint = {
        size: { width: 10, depth: 10, height: 5 },
        palette: { "primary": "oak_planks", "secondary": "oak_log", "window": "glass_pane", "door": "oak_door" },
        steps: [
          {
            op: 'fill',
            block: 'stone',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 9, y: 0, z: 9 }
          },
          {
            op: 'hollow_box',
            block: 'oak_planks',
            from: { x: 0, y: 1, z: 0 },
            to: { x: 9, y: 4, z: 9 }
          },
          {
            op: 'door',
            block: 'oak_door',
            pos: { x: 5, y: 1, z: 0 },
            facing: 'south'
          }
        ]
      };

      // Stage 3: Validate blueprint
      expect(validateBlueprintSchema(blueprint)).toBe(true);
    });

    test('should validate blueprint with WorldEdit operations', () => {
      const blueprint = {
        size: { width: 20, depth: 20, height: 10 },
        palette: { "primary": "stone", "secondary": "oak_planks" },
        steps: [
          {
            op: 'we_fill',
            block: 'stone',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 19, y: 0, z: 19 },
            fallback: {
              op: 'fill',
              block: 'stone',
              from: { x: 0, y: 0, z: 0 },
              to: { x: 19, y: 0, z: 19 }
            }
          },
          {
            op: 'we_walls',
            block: 'oak_planks',
            from: { x: 0, y: 1, z: 0 },
            to: { x: 19, y: 9, z: 19 },
            fallback: {
              op: 'hollow_box',
              block: 'oak_planks',
              from: { x: 0, y: 1, z: 0 },
              to: { x: 19, y: 9, z: 19 }
            }
          }
        ]
      };

      expect(validateBlueprintSchema(blueprint)).toBe(true);
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
        worldEditOpsExecuted: 5,
        fallbacksUsed: 1,
        startTime: Date.now()
      };

      const progress = builder.getProgress();
      expect(progress).not.toBeNull();
      expect(progress.blocksPlaced).toBe(50);
      expect(progress.worldEditOps).toBe(5);
      expect(progress.fallbacksUsed).toBe(1);
      expect(progress.isBuilding).toBe(true);
    });

    test('should track undo info', () => {
      const mockBot = {
        blockAt: () => null,
        vec3: (x, y, z) => ({ x, y, z })
      };

      const builder = new Builder(mockBot);

      // Simulate some history
      builder.history = [[
        { pos: { x: 0, y: 0, z: 0 }, previousBlock: 'air' },
        { pos: { x: 1, y: 0, z: 0 }, previousBlock: 'air' }
      ]];
      builder.worldEditHistory = [
        { step: { op: 'we_fill' }, timestamp: Date.now() }
      ];

      const undoInfo = builder.getUndoInfo();
      expect(undoInfo.vanillaBuilds).toBe(1);
      expect(undoInfo.vanillaBlocks).toBe(2);
      expect(undoInfo.worldEditOps).toBe(1);
    });
  });
});

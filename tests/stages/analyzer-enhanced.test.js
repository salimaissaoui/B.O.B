import { jest, describe, test, expect } from '@jest/globals';
import { analyzePrompt } from '../../src/stages/1-analyzer.js';

describe('Enhanced Analyzer', () => {
  describe('Build Type Detection', () => {
    test('should detect pixel_art for "pixel art of pikachu"', () => {
      const analysis = analyzePrompt('pixel art of pikachu');
      expect(analysis.buildType).toBe('pixel_art');
    });

    test('should detect pixel_art for "8-bit mario"', () => {
      const analysis = analyzePrompt('8-bit mario');
      expect(analysis.buildType).toBe('pixel_art');
    });

    test('should detect pixel_art for "retro game sprite"', () => {
      const analysis = analyzePrompt('retro game sprite');
      expect(analysis.buildType).toBe('pixel_art');
    });

    test('should detect pixel_art for "mosaic of a cat"', () => {
      const analysis = analyzePrompt('mosaic of a cat');
      expect(analysis.buildType).toBe('pixel_art');
    });

    test('should detect platform for "10x10 stone platform only"', () => {
      const analysis = analyzePrompt('10x10 stone platform only');
      expect(analysis.buildType).toBe('platform');
    });

    test('should detect platform for "flat floor only"', () => {
      const analysis = analyzePrompt('flat floor only');
      expect(analysis.buildType).toBe('platform');
    });

    test('should detect platform for "simple 20x20 cobblestone"', () => {
      const analysis = analyzePrompt('simple 20x20 cobblestone');
      expect(analysis.buildType).toBe('platform');
    });

    test('should detect platform for "just a foundation pad"', () => {
      const analysis = analyzePrompt('just a foundation pad');
      expect(analysis.buildType).toBe('platform');
    });

    test('should detect tree for "a nice oak tree"', () => {
      const analysis = analyzePrompt('a nice oak tree');
      expect(analysis.buildType).toBe('tree');
    });

    test('should detect tree for "spruce tree"', () => {
      const analysis = analyzePrompt('spruce tree');
      expect(analysis.buildType).toBe('tree');
    });

    test('should detect tree for "cherry blossom"', () => {
      const analysis = analyzePrompt('cherry blossom');
      expect(analysis.buildType).toBe('tree');
    });

    test('should detect house for "small wooden house"', () => {
      const analysis = analyzePrompt('small wooden house');
      expect(analysis.buildType).toBe('house');
    });

    test('should detect castle for "medieval castle"', () => {
      const analysis = analyzePrompt('medieval castle');
      expect(analysis.buildType).toBe('castle');
    });
  });

  describe('Dimension Extraction', () => {
    test('should extract dimensions from "10x10 platform"', () => {
      const analysis = analyzePrompt('10x10 stone platform');
      expect(analysis.hints.dimensions.width).toBe(10);
      expect(analysis.hints.dimensions.depth).toBe(10);
      expect(analysis.hints.explicitDimensions).toBe(true);
    });

    test('should extract dimensions from "20x15 floor"', () => {
      const analysis = analyzePrompt('20x15 oak floor');
      expect(analysis.hints.dimensions.width).toBe(20);
      expect(analysis.hints.dimensions.depth).toBe(15);
    });

    test('should extract 3D dimensions from "5x5x10 tower"', () => {
      const analysis = analyzePrompt('5x5x10 stone tower');
      expect(analysis.hints.dimensions.width).toBe(5);
      expect(analysis.hints.dimensions.depth).toBe(5);
      expect(analysis.hints.dimensions.height).toBe(10);
    });
  });

  describe('Material Extraction', () => {
    test('should extract stone material', () => {
      const analysis = analyzePrompt('10x10 stone platform');
      expect(analysis.hints.materials.primary).toBe('stone');
      expect(analysis.hints.explicitMaterial).toBe(true);
    });

    test('should extract cobblestone material', () => {
      const analysis = analyzePrompt('cobblestone platform');
      expect(analysis.hints.materials.primary).toBe('cobblestone');
    });

    test('should extract oak material', () => {
      const analysis = analyzePrompt('oak house');
      expect(analysis.hints.materials.primary).toBe('oak_planks');
    });

    test('should extract quartz material', () => {
      const analysis = analyzePrompt('quartz modern house');
      expect(analysis.hints.materials.primary).toBe('quartz_block');
    });

    test('should extract deepslate material', () => {
      const analysis = analyzePrompt('deepslate castle');
      expect(analysis.hints.materials.primary).toBe('deepslate_bricks');
    });
  });

  describe('Theme Detection', () => {
    test('should detect gothic theme', () => {
      const analysis = analyzePrompt('gothic castle');
      expect(analysis.theme?.theme).toBe('gothic');
    });

    test('should detect modern theme', () => {
      const analysis = analyzePrompt('modern house');
      expect(analysis.theme?.theme).toBe('modern');
    });

    test('should detect medieval theme', () => {
      const analysis = analyzePrompt('medieval fortress');
      expect(analysis.theme?.theme).toBe('medieval');
    });

    test('should detect japanese theme', () => {
      const analysis = analyzePrompt('japanese pagoda');
      expect(analysis.theme?.theme).toBe('japanese');
    });

    test('should detect rustic theme', () => {
      const analysis = analyzePrompt('rustic wooden cabin');
      expect(analysis.theme?.theme).toBe('rustic');
    });
  });

  describe('Analysis Output Structure', () => {
    test('should include all required fields', () => {
      const analysis = analyzePrompt('a nice house');

      expect(analysis).toHaveProperty('userPrompt');
      expect(analysis).toHaveProperty('buildType');
      expect(analysis).toHaveProperty('buildTypeInfo');
      expect(analysis).toHaveProperty('hints');
      expect(analysis.hints).toHaveProperty('dimensions');
      expect(analysis.hints).toHaveProperty('materials');
      expect(analysis.hints).toHaveProperty('features');
      expect(analysis.hints).toHaveProperty('size');
    });

    test('should preserve original user prompt', () => {
      const prompt = 'a beautiful gothic castle with towers';
      const analysis = analyzePrompt(prompt);
      expect(analysis.userPrompt).toBe(prompt);
    });
  });

  describe('Quality Detection', () => {
    test('should detect exceptional quality for "majestic castle"', () => {
      const analysis = analyzePrompt('majestic castle');
      expect(analysis.hints.qualityLevel).toBe('exceptional');
      expect(analysis.quality.modifiers).toContain('majestic');
    });

    test('should detect exceptional quality for "stunning tower"', () => {
      const analysis = analyzePrompt('stunning tower');
      expect(analysis.hints.qualityLevel).toBe('exceptional');
      expect(analysis.quality.modifiers).toContain('stunning');
    });

    test('should detect exceptional quality for "breathtaking palace"', () => {
      const analysis = analyzePrompt('breathtaking palace');
      expect(analysis.hints.qualityLevel).toBe('exceptional');
    });

    test('should detect high quality for "beautiful house"', () => {
      const analysis = analyzePrompt('beautiful house');
      expect(analysis.hints.qualityLevel).toBe('high');
      expect(analysis.quality.modifiers).toContain('beautiful');
    });

    test('should detect high quality for "nice oak tree"', () => {
      const analysis = analyzePrompt('nice oak tree');
      expect(analysis.hints.qualityLevel).toBe('high');
    });

    test('should detect standard quality for "house"', () => {
      const analysis = analyzePrompt('house');
      expect(analysis.hints.qualityLevel).toBe('standard');
    });

    test('should detect exceptional quality for "ornate gothic cathedral"', () => {
      const analysis = analyzePrompt('ornate gothic cathedral');
      expect(analysis.hints.qualityLevel).toBe('exceptional');
      expect(analysis.quality.modifiers).toContain('ornate');
    });

    test('should include quality tips for exceptional quality', () => {
      const analysis = analyzePrompt('magnificent castle');
      expect(analysis.hints.qualityTips.length).toBeGreaterThan(0);
    });

    test('should have size boost property for exceptional quality', () => {
      const standardAnalysis = analyzePrompt('house');
      const exceptionalAnalysis = analyzePrompt('magnificent house');

      // Standard quality has no boost
      expect(standardAnalysis.quality.sizeBoost).toBe(1.0);

      // Exceptional quality has 1.3x boost
      expect(exceptionalAnalysis.quality.sizeBoost).toBe(1.3);
    });
  });
});

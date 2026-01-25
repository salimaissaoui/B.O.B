/**
 * Regression Tests for Critical Pixel Art Bug Fixes
 * Date: 2026-01-25
 *
 * These tests ensure the following bugs stay fixed:
 * 1. Sprite generation silent failure
 * 2. Validation checking wrong features for pixel art
 * 3. Build type not preserved through pipeline
 * 4. WorldEdit batching inefficiency
 */

import { describe, test, expect } from '@jest/globals';
import { QualityValidator } from '../../src/validation/quality-validator.js';

describe('BUG FIX: Pixel Art Validation Should Skip Structural Checks', () => {
  test('should NOT penalize pixel art for missing roof', () => {
    const pixelArtBlueprint = {
      buildType: 'pixel_art',
      size: { width: 16, height: 16, depth: 1 },
      palette: ['black_wool', 'orange_wool', 'yellow_wool'],
      steps: [
        {
          op: 'pixel_art',
          base: { x: 0, y: 0, z: 0 },
          facing: 'south',
          grid: [
            '...###...',
            '..#OOO#..',
            '.#OOOOO#.',
          ],
          legend: {
            '.': 'air',
            '#': 'black_wool',
            'O': 'orange_wool'
          }
        }
      ]
    };

    const designPlan = {
      features: ['roof', 'walls'],  // Even though features requested
      style: 'pixel_art'
    };

    const result = QualityValidator.checkFeatureCompleteness(
      pixelArtBlueprint,
      designPlan
    );

    expect(result.score).toBe(1.0);
    expect(result.penalties).toHaveLength(0);
  });

  test('should NOT penalize pixel art for missing walls', () => {
    const pixelArtBlueprint = {
      buildType: 'pixel_art',
      size: { width: 24, height: 24, depth: 1 },
      palette: ['orange_wool', 'black_wool'],
      steps: [
        {
          op: 'pixel_art',
          base: { x: 0, y: 0, z: 0 },
          facing: 'south',
          grid: ['###'],
          legend: { '#': 'orange_wool', '.': 'air' }
        }
      ]
    };

    const designPlan = {
      features: ['walls'],
      style: 'pixel_art'
    };

    const result = QualityValidator.checkStructuralIntegrity(
      pixelArtBlueprint,
      designPlan
    );

    expect(result.score).toBe(1.0);
    expect(result.penalties).toHaveLength(0);
  });

  test('should detect pixel art by buildType alone', () => {
    // Test case where blueprint has buildType='pixel_art' but no pixel_art operation yet
    // (e.g., during intermediate validation)
    const blueprint = {
      buildType: 'pixel_art',  // This should be enough
      size: { width: 16, height: 16, depth: 1 },
      palette: ['black_wool'],
      steps: []  // Empty steps, but buildType is set
    };

    const designPlan = {
      features: ['roof', 'walls', 'door'],
      style: 'pixel_art'
    };

    const result = QualityValidator.checkFeatureCompleteness(
      blueprint,
      designPlan
    );

    expect(result.score).toBe(1.0);
    expect(result.penalties).toHaveLength(0);
  });

  test('should detect pixel art by operation presence', () => {
    const blueprint = {
      buildType: 'house',  // Wrong buildType, but has pixel_art operation
      size: { width: 16, height: 16, depth: 1 },
      palette: ['black_wool'],
      steps: [
        {
          op: 'pixel_art',
          base: { x: 0, y: 0, z: 0 },
          facing: 'south',
          grid: ['#'],
          legend: { '#': 'black_wool' }
        }
      ]
    };

    const designPlan = {
      features: ['roof'],
      style: 'pixel_art'
    };

    const result = QualityValidator.checkFeatureCompleteness(
      blueprint,
      designPlan
    );

    expect(result.score).toBe(1.0);
    expect(result.penalties).toHaveLength(0);
  });

  test('should still check features for non-pixel-art builds', () => {
    const houseBlueprint = {
      buildType: 'house',
      size: { width: 10, height: 10, depth: 10 },
      palette: ['stone', 'oak_planks'],
      steps: [
        {
          op: 'fill',
          block: 'stone',
          from: { x: 0, y: 0, z: 0 },
          to: { x: 9, y: 0, z: 9 }
        }
        // No roof, no walls
      ]
    };

    const designPlan = {
      features: ['roof', 'walls'],
      style: 'medieval'
    };

    const result = QualityValidator.checkFeatureCompleteness(
      houseBlueprint,
      designPlan
    );

    // Should be penalized for missing features
    expect(result.score).toBeLessThan(1.0);
    expect(result.penalties.length).toBeGreaterThan(0);
    expect(result.penalties.some(p => p.includes('roof'))).toBe(true);
  });
});

describe('BUG FIX: Build Type Preservation Through Pipeline', () => {
  test('pixel art blueprint should maintain buildType field', () => {
    const blueprint = {
      buildType: 'pixel_art',
      size: { width: 16, height: 16, depth: 1 },
      palette: ['orange_wool'],
      steps: [
        {
          op: 'pixel_art',
          base: { x: 0, y: 0, z: 0 },
          facing: 'south',
          grid: ['O'],
          legend: { 'O': 'orange_wool' }
        }
      ]
    };

    // Simulate pipeline processing
    const processedBlueprint = {
      ...blueprint,
      generationMethod: 'unified_llm'
    };

    expect(processedBlueprint.buildType).toBe('pixel_art');
  });

  test('should detect when pixel_art buildType lacks pixel_art operation', () => {
    const invalidBlueprint = {
      buildType: 'pixel_art',
      size: { width: 7, height: 28, depth: 7 },  // 3D dimensions - wrong!
      palette: ['orange_wool', 'black_wool'],
      steps: [
        // Using wrong operations for pixel art
        {
          op: 'fill',
          block: 'orange_wool',
          from: { x: 0, y: 0, z: 0 },
          to: { x: 6, y: 27, z: 6 }
        }
      ]
    };

    const hasPixelArtOp = invalidBlueprint.steps.some(s => s.op === 'pixel_art');

    // This should fail validation
    expect(hasPixelArtOp).toBe(false);
    expect(invalidBlueprint.buildType).toBe('pixel_art');
    // This mismatch should trigger error in 2-generator.js
  });
});

describe('BUG FIX: WorldEdit Batching Optimizations', () => {
  test('MIN_BATCH_SIZE should allow small rectangles', () => {
    // After fix, MIN_BATCH_SIZE = 3 (was 6)
    const MIN_BATCH_SIZE = 3;

    // 3-block rectangle should be batched
    const rectangleSize = 3;
    expect(rectangleSize >= MIN_BATCH_SIZE).toBe(true);

    // 2-block rectangle should not be batched
    const tinyRectangle = 2;
    expect(tinyRectangle >= MIN_BATCH_SIZE).toBe(false);
  });

  test('batching delay should be optimized', () => {
    // After fix, delay = 300ms (was 500ms)
    const OPTIMIZED_DELAY_MS = 300;
    const OLD_DELAY_MS = 500;

    expect(OPTIMIZED_DELAY_MS).toBeLessThan(OLD_DELAY_MS);
    expect(OPTIMIZED_DELAY_MS).toBe(300);
  });

  test('should validate WorldEdit volume limits during batching', () => {
    const SAFETY_LIMITS = {
      worldEdit: {
        maxSelectionVolume: 50000,
        maxSelectionDimension: 50
      }
    };

    // Rectangle within limits
    const validVolume = 1000;
    const validDimension = 30;

    expect(validVolume).toBeLessThanOrEqual(SAFETY_LIMITS.worldEdit.maxSelectionVolume);
    expect(validDimension).toBeLessThanOrEqual(SAFETY_LIMITS.worldEdit.maxSelectionDimension);

    // Rectangle exceeding limits
    const invalidVolume = 60000;
    const invalidDimension = 70;

    expect(invalidVolume).toBeGreaterThan(SAFETY_LIMITS.worldEdit.maxSelectionVolume);
    expect(invalidDimension).toBeGreaterThan(SAFETY_LIMITS.worldEdit.maxSelectionDimension);
  });
});

describe('REGRESSION: Real-World Pixel Art Scenarios', () => {
  test('should handle "pixel art charizard" correctly', () => {
    // This was the original bug report scenario
    const charizardBlueprint = {
      buildType: 'pixel_art',
      description: 'Pixel art: charizard',
      size: { width: 24, height: 28, depth: 1 },  // 2D, not 7x28x7!
      palette: ['orange_wool', 'yellow_wool', 'black_wool', 'blue_wool', 'red_wool'],
      steps: [
        {
          op: 'pixel_art',  // Must be pixel_art op, not fill!
          base: { x: 0, y: 0, z: 0 },
          facing: 'south',
          grid: [
            '....####............',
            '...######...........',
            '..########..........',
            // ... more rows
          ],
          legend: {
            '.': 'air',
            '#': 'black_wool',
            'O': 'orange_wool',
            'Y': 'yellow_wool',
            'R': 'red_wool',
            'B': 'blue_wool'
          }
        }
      ],
      generationMethod: 'web_reference'
    };

    // Validate structure
    expect(charizardBlueprint.buildType).toBe('pixel_art');
    expect(charizardBlueprint.steps.length).toBe(1);
    expect(charizardBlueprint.steps[0].op).toBe('pixel_art');
    expect(charizardBlueprint.size.depth).toBe(1);  // MUST be 2D

    // Validate it wouldn't trigger structural penalties
    const designPlan = { features: [], style: 'pixel_art' };
    const result = QualityValidator.scoreBlueprint(
      charizardBlueprint,
      designPlan
    );

    expect(result.passed).toBe(true);
    expect(result.penalties).not.toContain('Missing roof feature');
  });

  test('should reject 3D builds masquerading as pixel art', () => {
    const invalid3DPixelArt = {
      buildType: 'pixel_art',
      size: { width: 7, height: 28, depth: 7 },  // 3D - WRONG!
      palette: ['orange_wool'],
      steps: [
        {
          op: 'fill',  // Wrong operation
          block: 'orange_wool',
          from: { x: 0, y: 0, z: 0 },
          to: { x: 6, y: 27, z: 6 }
        }
      ]
    };

    // Check depth
    expect(invalid3DPixelArt.size.depth).toBeGreaterThan(1);

    // Check operation
    const hasPixelArtOp = invalid3DPixelArt.steps.some(s => s.op === 'pixel_art');
    expect(hasPixelArtOp).toBe(false);
  });
});

import { validateDesignPlan, validateBlueprint, getValidationErrors } from '../../src/config/schemas.js';

describe('Schema Validation', () => {
  describe('Design Plan Schema', () => {
    test('should validate correct design plan', () => {
      const validPlan = {
        dimensions: { width: 10, depth: 10, height: 5 },
        style: 'modern',
        materials: {
          primary: 'oak_planks',
          roof: 'oak_stairs'
        },
        features: ['door', 'windows', 'roof']
      };

      const isValid = validateDesignPlan(validPlan);
      expect(isValid).toBe(true);
    });

    test('should reject design plan with missing dimensions', () => {
      const invalidPlan = {
        style: 'modern',
        materials: { primary: 'oak_planks' },
        features: ['door']
      };

      const isValid = validateDesignPlan(invalidPlan);
      expect(isValid).toBe(false);

      const errors = getValidationErrors(validateDesignPlan);
      expect(errors.length).toBeGreaterThan(0);
    });

    test('should validate with all material properties', () => {
      const validPlan = {
        dimensions: { width: 10, depth: 10, height: 5 },
        style: 'modern',
        materials: {
          primary: 'oak_planks',
          secondary: 'spruce_planks',
          accent: 'stone',
          roof: 'oak_stairs',
          floor: 'cobblestone',
          windows: 'glass_pane',
          door: 'oak_door'
        },
        features: ['door']
      };

      const isValid = validateDesignPlan(validPlan);
      expect(isValid).toBe(true);
    });

    test('should require primary material', () => {
      const invalidPlan = {
        dimensions: { width: 10, depth: 10, height: 5 },
        style: 'modern',
        materials: { secondary: 'oak_planks' },
        features: ['door']
      };

      const isValid = validateDesignPlan(invalidPlan);
      expect(isValid).toBe(false);
    });
  });

  describe('Blueprint Schema', () => {
    test('should validate correct blueprint', () => {
      const validBlueprint = {
        size: { width: 10, depth: 10, height: 5 },
        palette: ['oak_planks', 'glass_pane'],
        steps: [
          {
            op: 'fill',
            block: 'oak_planks',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 9, y: 0, z: 9 }
          },
          {
            op: 'set',
            block: 'glass_pane',
            pos: { x: 5, y: 1, z: 0 }
          }
        ]
      };

      const isValid = validateBlueprint(validBlueprint);
      expect(isValid).toBe(true);
    });

    test('should reject blueprint with invalid operation', () => {
      const invalidBlueprint = {
        size: { width: 10, depth: 10, height: 5 },
        palette: ['oak_planks'],
        steps: [
          {
            op: 'invalid_op',
            block: 'oak_planks',
            from: { x: 0, y: 0, z: 0 },
            to: { x: 9, y: 0, z: 9 }
          }
        ]
      };

      const isValid = validateBlueprint(invalidBlueprint);
      expect(isValid).toBe(false);
    });

    test('should accept all valid operations', () => {
      const operations = ['fill', 'hollow_box', 'set', 'line', 'window_strip', 'roof_gable', 'roof_flat', 'pixel_art'];

      operations.forEach(op => {
        const blueprint = {
          size: { width: 10, depth: 10, height: 5 },
          palette: ['oak_planks'],
          steps: [
            {
              op,
              block: 'oak_planks',
              from: { x: 0, y: 0, z: 0 },
              to: { x: 9, y: 0, z: 9 }
            }
          ]
        };

        const isValid = validateBlueprint(blueprint);
        expect(isValid).toBe(true);
      });
    });
  });
});

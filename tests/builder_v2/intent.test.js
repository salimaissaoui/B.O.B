/**
 * Builder v2 Intent Analyzer Tests
 */

import { analyzeIntentV2 } from '../../src/builder_v2/intent/analyzer.js';
import { validateIntent } from '../../src/builder_v2/validate/validators.js';

describe('Intent Analyzer', () => {
  const context = {
    worldEditAvailable: true,
    serverVersion: '1.20.1'
  };

  describe('Category Detection', () => {
    test('detects landmark category', () => {
      const intent = analyzeIntentV2('Build an Eiffel Tower replica', context);
      expect(intent.intent.category).toBe('landmark');
      expect(intent.intent.reference).toContain('eiffel');
    });

    test('detects architecture category', () => {
      const intent = analyzeIntentV2('Build a modern house with 3 bedrooms', context);
      expect(intent.intent.category).toBe('architecture');
    });

    test('detects statue category', () => {
      const intent = analyzeIntentV2('Build a 3D Pikachu statue', context);
      expect(intent.intent.category).toBe('statue');
      expect(intent.intent.reference).toBe('pikachu');
    });

    test('detects pixel_art category', () => {
      const intent = analyzeIntentV2('Build pixel art of Mario', context);
      expect(intent.intent.category).toBe('pixel_art');
    });

    test('detects organic category', () => {
      const intent = analyzeIntentV2('Build a large oak tree', context);
      expect(intent.intent.category).toBe('organic');
    });
  });

  describe('Scale Detection', () => {
    test('detects tiny scale', () => {
      const intent = analyzeIntentV2('Build a tiny cabin', context);
      expect(intent.intent.scale).toBe('tiny');
    });

    test('detects massive scale', () => {
      const intent = analyzeIntentV2('Build a massive castle', context);
      expect(intent.intent.scale).toBe('massive');
    });

    test('detects colossal scale', () => {
      const intent = analyzeIntentV2('Build an epic legendary tower', context);
      expect(intent.intent.scale).toBe('colossal');
    });

    test('defaults to medium scale', () => {
      const intent = analyzeIntentV2('Build a house', context);
      expect(intent.intent.scale).toBe('medium');
    });

    test('infers scale from explicit dimensions', () => {
      const intent = analyzeIntentV2('Build a 100x100 platform', context);
      // 100 blocks is at the large/massive boundary
      expect(['large', 'massive']).toContain(intent.intent.scale);
    });
  });

  describe('Complexity Detection', () => {
    test('detects simple complexity', () => {
      const intent = analyzeIntentV2('Build a simple box', context);
      expect(intent.intent.complexity).toBe('simple');
    });

    test('detects intricate or complex complexity', () => {
      const intent = analyzeIntentV2('Build a highly detailed masterpiece cathedral', context);
      // Both 'intricate' and 'complex' are valid for detailed builds
      expect(['intricate', 'complex']).toContain(intent.intent.complexity);
    });
  });

  describe('Feature Extraction', () => {
    test('extracts interior feature', () => {
      const intent = analyzeIntentV2('Build a house with decorated interior', context);
      expect(intent.constraints.features).toContain('interior');
    });

    test('extracts lighting feature', () => {
      const intent = analyzeIntentV2('Build a tower with warm lighting', context);
      expect(intent.constraints.features).toContain('lighting');
    });

    test('extracts multiple features', () => {
      const intent = analyzeIntentV2('Build a house with balcony, garden, and chimney', context);
      expect(intent.constraints.features).toContain('balcony');
      expect(intent.constraints.features).toContain('garden');
      expect(intent.constraints.features).toContain('chimney');
    });
  });

  describe('Dimension Extraction', () => {
    test('extracts WxHxD format', () => {
      const intent = analyzeIntentV2('Build a 20x15x30 building', context);
      expect(intent.constraints.dimensions).toEqual({
        width: 20,
        height: 15,
        depth: 30
      });
    });

    test('extracts height only', () => {
      const intent = analyzeIntentV2('Build a tower 50 blocks tall', context);
      expect(intent.constraints.dimensions.height).toBe(50);
    });
  });

  describe('Style Detection', () => {
    test('detects medieval style', () => {
      const intent = analyzeIntentV2('Build a medieval castle', context);
      expect(intent.constraints.style).toBe('medieval');
    });

    test('detects modern style', () => {
      const intent = analyzeIntentV2('Build a modern minimalist house', context);
      expect(intent.constraints.style).toBe('modern');
    });

    test('detects gothic style', () => {
      // Use 'dark gothic' to ensure gothic is detected first
      const intent = analyzeIntentV2('Build a dark gothic haunted mansion', context);
      expect(intent.constraints.style).toBe('gothic');
    });
  });

  describe('Schema Compliance', () => {
    test('produces valid BuildIntentV2', () => {
      const intent = analyzeIntentV2('Build a detailed Eiffel Tower with plaza', context);
      const validation = validateIntent(intent);
      expect(validation.valid).toBe(true);
    });

    test('includes all required fields', () => {
      const intent = analyzeIntentV2('Build something', context);
      expect(intent.version).toBe('2.0');
      expect(intent.id).toBeDefined();
      expect(intent.timestamp).toBeDefined();
      expect(intent.prompt.raw).toBeDefined();
      expect(intent.prompt.normalized).toBeDefined();
      expect(intent.intent.category).toBeDefined();
      expect(intent.intent.scale).toBeDefined();
      expect(intent.intent.complexity).toBeDefined();
      expect(intent.context.worldEditAvailable).toBe(true);
    });
  });
});

/**
 * Tests for Validation Profiles
 *
 * Verifies:
 * - Profile selection by build type
 * - Structural requirements per profile
 * - Quality scoring with profile weighting
 * - Safety bounds validation
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import {
  VALIDATION_PROFILES,
  getValidationProfile,
  detectBuildType,
  validateStructuralRequirements,
  calculateQualityScore,
  validateWithProfile
} from '../../src/validation/validation-profiles.js';

describe('Validation Profiles', () => {
  describe('VALIDATION_PROFILES', () => {
    test('has all expected profiles', () => {
      const expectedProfiles = [
        'pixel_art', 'statue', 'tree', 'treehouse',
        'house', 'castle', 'landmark', 'infrastructure',
        'terrain', 'generic'
      ];

      for (const profile of expectedProfiles) {
        expect(VALIDATION_PROFILES[profile]).toBeDefined();
        expect(VALIDATION_PROFILES[profile].id).toBe(profile);
      }
    });

    test('pixel_art profile does not require roof, walls, door', () => {
      const profile = VALIDATION_PROFILES.pixel_art;

      expect(profile.requireRoof).toBe(false);
      expect(profile.requireWalls).toBe(false);
      expect(profile.requireDoor).toBe(false);
      expect(profile.requireFoundation).toBe(false);
      expect(profile.allowFloating).toBe(true);
    });

    test('statue profile requires foundation but not roof', () => {
      const profile = VALIDATION_PROFILES.statue;

      expect(profile.requireRoof).toBe(false);
      expect(profile.requireWalls).toBe(false);
      expect(profile.requireDoor).toBe(false);
      expect(profile.requireFoundation).toBe(true);
    });

    test('house profile requires roof, walls, door, foundation', () => {
      const profile = VALIDATION_PROFILES.house;

      expect(profile.requireRoof).toBe(true);
      expect(profile.requireWalls).toBe(true);
      expect(profile.requireDoor).toBe(true);
      expect(profile.requireFoundation).toBe(true);
    });

    test('treehouse profile requires roof and walls but not foundation', () => {
      const profile = VALIDATION_PROFILES.treehouse;

      expect(profile.requireRoof).toBe(true);
      expect(profile.requireWalls).toBe(true);
      expect(profile.requireDoor).toBe(true);
      expect(profile.requireFoundation).toBe(false);
      expect(profile.allowElevated).toBe(true);
    });

    test('tree profile allows organic shapes', () => {
      const profile = VALIDATION_PROFILES.tree;

      expect(profile.allowOrganic).toBe(true);
      expect(profile.allowIrregular).toBe(true);
    });

    test('castle profile allows extreme scale', () => {
      const profile = VALIDATION_PROFILES.castle;

      expect(profile.allowExtremeScale).toBe(true);
      expect(profile.maxHeight).toBe(128);
      expect(profile.maxWidth).toBe(256);
    });

    test('all profiles have quality checks array', () => {
      for (const profile of Object.values(VALIDATION_PROFILES)) {
        expect(Array.isArray(profile.qualityChecks)).toBe(true);
        expect(profile.qualityChecks.length).toBeGreaterThan(0);
      }
    });

    test('all profiles have quality weight', () => {
      for (const profile of Object.values(VALIDATION_PROFILES)) {
        expect(typeof profile.qualityWeight).toBe('number');
        expect(profile.qualityWeight).toBeGreaterThanOrEqual(0);
        expect(profile.qualityWeight).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('getValidationProfile', () => {
    test('returns correct profile for exact match', () => {
      expect(getValidationProfile('pixel_art').id).toBe('pixel_art');
      expect(getValidationProfile('house').id).toBe('house');
      expect(getValidationProfile('statue').id).toBe('statue');
    });

    test('returns correct profile for variant names', () => {
      expect(getValidationProfile('pixel art').id).toBe('pixel_art');
      expect(getValidationProfile('pixelart').id).toBe('pixel_art');
      expect(getValidationProfile('tree house').id).toBe('treehouse');
      expect(getValidationProfile('cottage').id).toBe('house');
    });

    test('handles case insensitivity', () => {
      expect(getValidationProfile('PIXEL_ART').id).toBe('pixel_art');
      expect(getValidationProfile('House').id).toBe('house');
      expect(getValidationProfile('CASTLE').id).toBe('castle');
    });

    test('returns generic for unknown build types', () => {
      expect(getValidationProfile('unknown_type').id).toBe('generic');
      expect(getValidationProfile('something_random').id).toBe('generic');
    });

    test('returns generic for null/undefined', () => {
      expect(getValidationProfile(null).id).toBe('generic');
      expect(getValidationProfile(undefined).id).toBe('generic');
    });

    test('returns generic for empty string', () => {
      expect(getValidationProfile('').id).toBe('generic');
    });
  });

  describe('detectBuildType', () => {
    test('detects from intent.buildType', () => {
      const blueprint = {};
      const intent = { buildType: 'castle' };

      expect(detectBuildType(blueprint, intent)).toBe('castle');
    });

    test('detects from blueprint.buildType', () => {
      const blueprint = { buildType: 'house' };

      expect(detectBuildType(blueprint)).toBe('house');
    });

    test('detects from blueprint.designPlan.buildType', () => {
      const blueprint = { designPlan: { buildType: 'statue' } };

      expect(detectBuildType(blueprint)).toBe('statue');
    });

    test('detects from blueprint.tags.buildType', () => {
      const blueprint = { tags: { buildType: ['pixel_art'] } };

      expect(detectBuildType(blueprint)).toBe('pixel_art');
    });

    test('infers pixel_art from operations', () => {
      const blueprint = {
        steps: [{ op: 'pixel_art', block: 'concrete' }]
      };

      expect(detectBuildType(blueprint)).toBe('pixel_art');
    });

    test('infers tree from operations', () => {
      const blueprint = {
        steps: [{ op: 'grow_tree', block: 'oak_log' }]
      };

      expect(detectBuildType(blueprint)).toBe('tree');
    });

    test('infers house from operations with roof, wall, door', () => {
      const blueprint = {
        steps: [
          { op: 'wall', block: 'stone' },
          { op: 'roof', block: 'stairs' },
          { op: 'door', block: 'oak_door' }
        ]
      };

      expect(detectBuildType(blueprint)).toBe('house');
    });

    test('returns generic when unable to detect', () => {
      const blueprint = { steps: [{ op: 'fill', block: 'stone' }] };

      expect(detectBuildType(blueprint)).toBe('generic');
    });
  });

  describe('validateStructuralRequirements', () => {
    test('passes pixel_art without roof, walls, door', () => {
      const blueprint = {
        steps: [{ op: 'set', block: 'concrete' }]
      };
      const profile = VALIDATION_PROFILES.pixel_art;

      const result = validateStructuralRequirements(blueprint, profile);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    test('warns when house lacks roof', () => {
      const blueprint = {
        steps: [
          { op: 'wall', block: 'stone' },
          { op: 'door', block: 'oak_door' }
        ]
      };
      const profile = VALIDATION_PROFILES.house;

      const result = validateStructuralRequirements(blueprint, profile);

      expect(result.warnings.some(w => w.code === 'MISSING_ROOF')).toBe(true);
      expect(result.score).toBeLessThan(1.0);
    });

    test('warns when house lacks door', () => {
      const blueprint = {
        steps: [
          { op: 'wall', block: 'stone' },
          { op: 'roof', block: 'stairs' }
        ]
      };
      const profile = VALIDATION_PROFILES.house;

      const result = validateStructuralRequirements(blueprint, profile);

      expect(result.warnings.some(w => w.code === 'MISSING_DOOR')).toBe(true);
    });

    test('detects roof from pyramid operation', () => {
      const blueprint = {
        steps: [{ op: 'pyramid', block: 'stone' }]
      };
      const profile = VALIDATION_PROFILES.house;

      const result = validateStructuralRequirements(blueprint, profile);

      const roofWarning = result.warnings.find(w => w.code === 'MISSING_ROOF');
      expect(roofWarning).toBeUndefined();
    });

    test('detects walls from hollow_box operation', () => {
      const blueprint = {
        steps: [
          { op: 'hollow_box', block: 'stone' },
          { op: 'roof', block: 'stairs' },
          { op: 'door', block: 'oak_door' }
        ]
      };
      const profile = VALIDATION_PROFILES.house;

      const result = validateStructuralRequirements(blueprint, profile);

      const wallWarning = result.warnings.find(w => w.code === 'MISSING_WALLS');
      expect(wallWarning).toBeUndefined();
    });

    test('detects door from block containing "door"', () => {
      const blueprint = {
        steps: [
          { op: 'set', block: 'spruce_door' },
          { op: 'wall', block: 'stone' },
          { op: 'roof', block: 'stairs' }
        ]
      };
      const profile = VALIDATION_PROFILES.house;

      const result = validateStructuralRequirements(blueprint, profile);

      const doorWarning = result.warnings.find(w => w.code === 'MISSING_DOOR');
      expect(doorWarning).toBeUndefined();
    });

    test('warns when foundation required but build starts high', () => {
      const blueprint = {
        steps: [
          { op: 'fill', from: { y: 50 }, to: { y: 60 }, block: 'stone' }
        ]
      };
      const profile = VALIDATION_PROFILES.house;

      const result = validateStructuralRequirements(blueprint, profile);

      expect(result.warnings.some(w => w.code === 'MISSING_FOUNDATION')).toBe(true);
    });
  });

  describe('calculateQualityScore', () => {
    test('returns A grade for score >= 0.9', () => {
      const blueprint = {};
      const profile = VALIDATION_PROFILES.house;
      const structuralResult = { score: 1.0 };

      const result = calculateQualityScore(blueprint, profile, structuralResult);

      expect(result.grade).toBe('A');
      expect(result.passed).toBe(true);
    });

    test('returns B grade for score >= 0.8', () => {
      const blueprint = {};
      const profile = VALIDATION_PROFILES.house;
      const structuralResult = { score: 0.85 };

      const result = calculateQualityScore(blueprint, profile, structuralResult);

      expect(result.grade).toBe('B');
    });

    test('returns F grade for score < 0.5', () => {
      const blueprint = {};
      const profile = VALIDATION_PROFILES.house;
      const structuralResult = { score: 0.3 };

      const result = calculateQualityScore(blueprint, profile, structuralResult);

      expect(result.grade).toBe('F');
      expect(result.passed).toBe(false);
    });

    test('applies profile weight (lenient profiles more forgiving)', () => {
      const blueprint = {};
      const structuralResult = { score: 0.7 };

      // House has weight 1.0 (strict)
      const houseResult = calculateQualityScore(
        blueprint,
        VALIDATION_PROFILES.house,
        structuralResult
      );

      // Pixel art has weight 0.5 (lenient)
      const pixelArtResult = calculateQualityScore(
        blueprint,
        VALIDATION_PROFILES.pixel_art,
        structuralResult
      );

      // Lenient profile should produce higher weighted score
      expect(pixelArtResult.score).toBeGreaterThan(houseResult.score);
    });

    test('includes raw score and weight in result', () => {
      const blueprint = {};
      const profile = VALIDATION_PROFILES.house;
      const structuralResult = { score: 0.8 };

      const result = calculateQualityScore(blueprint, profile, structuralResult);

      expect(result.rawScore).toBe(0.8);
      expect(result.weight).toBe(1.0);
      expect(result.profile).toBe('house');
    });
  });

  describe('validateWithProfile', () => {
    test('returns complete validation result', () => {
      const blueprint = {
        buildType: 'house',
        steps: [
          { op: 'wall', block: 'stone' },
          { op: 'roof', block: 'oak_stairs' },
          { op: 'door', block: 'oak_door' },
          { op: 'fill', from: { y: 0 }, to: { y: 1 }, block: 'cobblestone' }
        ]
      };

      const result = validateWithProfile(blueprint);

      expect(result.profile).toBe('house');
      expect(result.profileName).toBe('House / Building');
      expect(result.buildType).toBe('house');
      expect(result.qualityScore).toBeDefined();
      expect(result.qualityGrade).toBeDefined();
      expect(result.safetyPassed).toBeDefined();
      expect(result.checksPerformed).toBeInstanceOf(Array);
    });

    test('uses detected build type when not specified', () => {
      const blueprint = {
        steps: [{ op: 'pixel_art', block: 'concrete' }]
      };

      const result = validateWithProfile(blueprint);

      expect(result.buildType).toBe('pixel_art');
      expect(result.profile).toBe('pixel_art');
    });

    test('uses provided build type', () => {
      const blueprint = { steps: [] };

      const result = validateWithProfile(blueprint, { buildType: 'statue' });

      expect(result.buildType).toBe('statue');
      expect(result.profile).toBe('statue');
    });

    test('fails when safety bounds exceeded', () => {
      const blueprint = {
        buildType: 'pixel_art',
        steps: [
          { op: 'fill', from: { x: 0, y: 0, z: 0 }, to: { x: 300, y: 0, z: 0 }, block: 'stone' }
        ]
      };

      const result = validateWithProfile(blueprint);

      // pixel_art maxWidth is 256
      expect(result.errors.some(e => e.code === 'EXCEEDS_MAX_WIDTH')).toBe(true);
      expect(result.safetyPassed).toBe(false);
    });

    test('fails when height limit exceeded', () => {
      const blueprint = {
        buildType: 'tree',
        steps: [
          { op: 'fill', from: { x: 0, y: 0, z: 0 }, to: { x: 0, y: 100, z: 0 }, block: 'oak_log' }
        ]
      };

      const result = validateWithProfile(blueprint);

      // tree maxHeight is 64
      expect(result.errors.some(e => e.code === 'EXCEEDS_MAX_HEIGHT')).toBe(true);
    });

    test('warns about floating structure when not allowed', () => {
      const blueprint = {
        buildType: 'house',
        steps: [
          { op: 'fill', from: { x: 0, y: 50, z: 0 }, to: { x: 10, y: 60, z: 10 }, block: 'stone' }
        ]
      };

      const result = validateWithProfile(blueprint);

      // house doesn't allow floating
      const floatingWarning = result.errors.find(e => e.code === 'FLOATING_STRUCTURE');
      expect(floatingWarning).toBeDefined();
    });

    test('does not warn about floating for pixel_art', () => {
      const blueprint = {
        buildType: 'pixel_art',
        steps: [
          { op: 'fill', from: { x: 0, y: 50, z: 0 }, to: { x: 10, y: 60, z: 0 }, block: 'concrete' }
        ]
      };

      const result = validateWithProfile(blueprint);

      // pixel_art allows floating
      const floatingWarning = result.errors.find(e => e.code === 'FLOATING_STRUCTURE');
      expect(floatingWarning).toBeUndefined();
    });
  });
});

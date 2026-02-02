/**
 * Tests for Stage 0 Router
 *
 * Verifies:
 * - Prompt classification to BlueprintKind
 * - Build type detection
 * - Validation profile selection
 * - Pass inference
 * - Style detection
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import {
  routePrompt,
  BlueprintKind,
  shouldUseVoxelSparse,
  isOrganicBuildType,
  getAvailableBuildTypes,
  getAvailableKinds
} from '../../src/core/router.js';

describe('Stage 0: Router', () => {
  describe('routePrompt classification', () => {
    test('routes "pixel art of mario" to VOXEL_SPARSE with pixel_art profile', () => {
      const result = routePrompt('pixel art of mario');

      expect(result.kind).toBe(BlueprintKind.VOXEL_SPARSE);
      expect(result.buildType).toBe('pixel_art');
      expect(result.profile).toBe('pixel_art');
      expect(result.confidence).toBe('high');
    });

    test('routes "statue of a warrior" to VOXEL_SPARSE with statue profile', () => {
      const result = routePrompt('statue of a warrior');

      expect(result.kind).toBe(BlueprintKind.VOXEL_SPARSE);
      expect(result.buildType).toBe('statue');
      expect(result.profile).toBe('statue');
      expect(result.confidence).toBe('high');
    });

    test('routes "modern home with pool" to OPS_SCRIPT with house profile', () => {
      const result = routePrompt('modern home with pool');

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.buildType).toBe('house');
      expect(result.profile).toBe('house');
      expect(result.style).toBe('modern');
      expect(result.confidence).toBe('high');
    });

    test('routes "eiffel replica" to OPS_SCRIPT with landmark profile', () => {
      // Note: "eiffel tower" would match "tower" first due to rule ordering
      // Use just "eiffel" or "replica" to test landmark routing
      const result = routePrompt('eiffel replica');

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.buildType).toBe('landmark');
      expect(result.profile).toBe('landmark');
      expect(result.confidence).toBe('high');
    });

    test('routes "terrain with hills" to VOXEL_SPARSE with terrain profile', () => {
      const result = routePrompt('terrain with hills');

      expect(result.kind).toBe(BlueprintKind.VOXEL_SPARSE);
      expect(result.buildType).toBe('terrain');
      expect(result.profile).toBe('terrain');
      expect(result.confidence).toBe('high');
    });

    test('routes "medieval castle" to OPS_SCRIPT with castle profile', () => {
      const result = routePrompt('medieval castle');

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.buildType).toBe('castle');
      expect(result.profile).toBe('castle');
      expect(result.style).toBe('medieval');
      expect(result.confidence).toBe('high');
    });

    test('routes "treehouse" to OPS_SCRIPT with treehouse profile', () => {
      const result = routePrompt('a cozy treehouse');

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.buildType).toBe('treehouse');
      expect(result.profile).toBe('treehouse');
      expect(result.confidence).toBe('high');
    });

    test('routes "oak tree" to OPS_SCRIPT with tree profile', () => {
      const result = routePrompt('large oak tree');

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.buildType).toBe('tree');
      expect(result.profile).toBe('tree');
      expect(result.confidence).toBe('high');
    });

    test('routes "bridge over river" to OPS_SCRIPT with infrastructure profile', () => {
      const result = routePrompt('stone bridge over river');

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.buildType).toBe('infrastructure');
      expect(result.profile).toBe('infrastructure');
      expect(result.confidence).toBe('high');
    });

    test('routes unknown prompts to generic with low confidence', () => {
      const result = routePrompt('something random and undefined');

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.buildType).toBe('generic');
      expect(result.confidence).toBe('low');
    });
  });

  describe('pass inference', () => {
    test('includes interior pass when prompt mentions "furnished"', () => {
      const result = routePrompt('a furnished house');

      expect(result.passes).toContain('interior');
    });

    test('includes detail pass when prompt mentions "decorated"', () => {
      const result = routePrompt('a decorated castle');

      expect(result.passes).toContain('detail');
    });

    test('includes landscape pass when prompt mentions "garden"', () => {
      const result = routePrompt('house with garden');

      expect(result.passes).toContain('landscape');
    });

    test('includes multiple passes when multiple keywords present', () => {
      const result = routePrompt('a furnished house with decorated interior and garden');

      expect(result.passes).toContain('interior');
      expect(result.passes).toContain('detail');
      expect(result.passes).toContain('landscape');
    });

    test('includes default shell pass', () => {
      const result = routePrompt('a simple house');

      expect(result.passes).toContain('shell');
    });
  });

  describe('style detection', () => {
    test('detects medieval style', () => {
      const result = routePrompt('medieval fortress');

      expect(result.style).toBe('medieval');
    });

    test('detects modern style', () => {
      const result = routePrompt('modern minimalist house');

      expect(result.style).toBe('modern');
    });

    test('detects gothic style', () => {
      const result = routePrompt('gothic cathedral');

      expect(result.style).toBe('gothic');
    });

    test('detects rustic style', () => {
      const result = routePrompt('rustic farmhouse');

      expect(result.style).toBe('rustic');
    });

    test('detects fantasy style', () => {
      const result = routePrompt('magical wizard tower');

      expect(result.style).toBe('fantasy');
    });

    test('detects oriental style', () => {
      const result = routePrompt('japanese pagoda');

      expect(result.style).toBe('oriental');
    });
  });

  describe('edge cases', () => {
    test('handles empty prompt', () => {
      const result = routePrompt('');

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.confidence).toBe('none');
    });

    test('handles null prompt', () => {
      const result = routePrompt(null);

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.confidence).toBe('none');
    });

    test('handles undefined prompt', () => {
      const result = routePrompt(undefined);

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.confidence).toBe('none');
    });

    test('is case insensitive', () => {
      const result = routePrompt('PIXEL ART OF MARIO');

      expect(result.kind).toBe(BlueprintKind.VOXEL_SPARSE);
      expect(result.buildType).toBe('pixel_art');
    });

    test('handles mixed case prompts', () => {
      const result = routePrompt('A Modern HOUSE with Pool');

      expect(result.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(result.buildType).toBe('house');
    });

    test('trims whitespace', () => {
      const result = routePrompt('  pixel art of mario  ');

      expect(result.kind).toBe(BlueprintKind.VOXEL_SPARSE);
    });
  });

  describe('helper functions', () => {
    test('shouldUseVoxelSparse returns true for pixel_art', () => {
      expect(shouldUseVoxelSparse('pixel_art')).toBe(true);
    });

    test('shouldUseVoxelSparse returns true for statue', () => {
      expect(shouldUseVoxelSparse('statue')).toBe(true);
    });

    test('shouldUseVoxelSparse returns true for terrain', () => {
      expect(shouldUseVoxelSparse('terrain')).toBe(true);
    });

    test('shouldUseVoxelSparse returns false for house', () => {
      expect(shouldUseVoxelSparse('house')).toBe(false);
    });

    test('isOrganicBuildType returns true for tree', () => {
      expect(isOrganicBuildType('tree')).toBe(true);
    });

    test('isOrganicBuildType returns true for terrain', () => {
      expect(isOrganicBuildType('terrain')).toBe(true);
    });

    test('isOrganicBuildType returns false for house', () => {
      expect(isOrganicBuildType('house')).toBe(false);
    });

    test('getAvailableBuildTypes returns array of build types', () => {
      const types = getAvailableBuildTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('house');
      expect(types).toContain('pixel_art');
      expect(types).toContain('statue');
      expect(types).toContain('castle');
      expect(types).toContain('generic');
    });

    test('getAvailableKinds returns all blueprint kinds', () => {
      const kinds = getAvailableKinds();

      expect(kinds).toContain(BlueprintKind.OPS_SCRIPT);
      expect(kinds).toContain(BlueprintKind.VOXEL_SPARSE);
      expect(kinds).toContain(BlueprintKind.FLOORPLAN_SEMANTIC);
      expect(kinds).toContain(BlueprintKind.ASSET_REFERENCE);
    });
  });

  describe('validation profile association', () => {
    test('returns validationProfile object', () => {
      const result = routePrompt('a house');

      expect(result.validationProfile).toBeDefined();
      expect(result.validationProfile.id).toBe('house');
      expect(result.validationProfile.requireRoof).toBe(true);
      expect(result.validationProfile.requireDoor).toBe(true);
    });

    test('pixel_art profile does not require roof or door', () => {
      const result = routePrompt('pixel art of mario');

      expect(result.validationProfile.requireRoof).toBe(false);
      expect(result.validationProfile.requireDoor).toBe(false);
      expect(result.validationProfile.allowFloating).toBe(true);
    });

    test('statue profile requires foundation but not roof', () => {
      const result = routePrompt('statue of a knight');

      expect(result.validationProfile.requireRoof).toBe(false);
      expect(result.validationProfile.requireFoundation).toBe(true);
    });
  });

  describe('first-match-wins rule ordering', () => {
    test('treehouse matches before tree', () => {
      const result = routePrompt('a treehouse with tree');

      expect(result.buildType).toBe('treehouse');
      expect(result.buildType).not.toBe('tree');
    });

    test('pixel art matches before generic art terms', () => {
      const result = routePrompt('pixel art style painting');

      expect(result.buildType).toBe('pixel_art');
    });
  });
});

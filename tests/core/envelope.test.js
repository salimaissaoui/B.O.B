/**
 * Tests for Blueprint Envelope
 *
 * Verifies:
 * - Envelope creation from V1 blueprints
 * - Envelope creation from V2 placement plans
 * - AJV schema validation
 * - Semantic validation
 * - Payload extraction for builder
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import {
  createEnvelopeFromV1,
  createEnvelopeFromV2,
  validateEnvelope,
  extractPayloadForBuilder,
  ENVELOPE_VERSION
} from '../../src/core/envelope.js';
import { BlueprintKind } from '../../src/core/router.js';

describe('Blueprint Envelope', () => {
  describe('createEnvelopeFromV1', () => {
    test('creates valid OPS_SCRIPT envelope from V1 blueprint', () => {
      const blueprint = {
        size: { width: 10, height: 8, depth: 10 },
        palette: { wall: 'stone_bricks', floor: 'oak_planks' },
        steps: [
          { op: 'fill', from: { x: 0, y: 0, z: 0 }, to: { x: 9, y: 0, z: 9 }, block: '$floor' },
          { op: 'hollow_box', from: { x: 0, y: 1, z: 0 }, to: { x: 9, y: 7, z: 9 }, block: '$wall' }
        ]
      };

      const envelope = createEnvelopeFromV1(blueprint, { prompt: 'a small house' });

      expect(envelope.blueprintVersion).toBe(ENVELOPE_VERSION);
      expect(envelope.kind).toBe(BlueprintKind.OPS_SCRIPT);
      expect(envelope.envelopeId).toBeDefined();
      expect(envelope.payload.steps).toEqual(blueprint.steps);
      expect(envelope.payload.palette).toEqual(blueprint.palette);
    });

    test('calculates bounds from blueprint size', () => {
      const blueprint = {
        size: { width: 20, height: 15, depth: 25 },
        steps: []
      };

      const envelope = createEnvelopeFromV1(blueprint);

      expect(envelope.bounds.local.min).toEqual({ x: 0, y: 0, z: 0 });
      expect(envelope.bounds.local.max).toEqual({ x: 19, y: 14, z: 24 });
    });

    test('computes world bounds from origin', () => {
      const blueprint = {
        size: { width: 10, height: 10, depth: 10 },
        steps: []
      };

      const envelope = createEnvelopeFromV1(blueprint, {
        origin: { x: 100, y: 64, z: 200 }
      });

      expect(envelope.bounds.world.min).toEqual({ x: 100, y: 64, z: 200 });
      expect(envelope.bounds.world.max).toEqual({ x: 109, y: 73, z: 209 });
    });

    test('estimates block count from steps', () => {
      const blueprint = {
        size: { width: 10, height: 10, depth: 10 },
        steps: [
          { op: 'fill', from: { x: 0, y: 0, z: 0 }, to: { x: 9, y: 0, z: 9 }, block: 'stone' },
          { op: 'set', pos: { x: 5, y: 5, z: 5 }, block: 'glass' }
        ]
      };

      const envelope = createEnvelopeFromV1(blueprint);

      expect(envelope.estimates.blockCount).toBeGreaterThan(0);
      expect(envelope.estimates.weCommandCount).toBeGreaterThan(0);
    });

    test('sets tags from routing', () => {
      const envelope = createEnvelopeFromV1(
        { size: { width: 10, height: 10, depth: 10 }, steps: [] },
        { prompt: 'a medieval castle' }
      );

      expect(envelope.tags.buildType).toContain('castle');
      expect(envelope.tags.style).toBeDefined();
      expect(envelope.tags.passes).toBeDefined();
    });

    test('includes safety limits', () => {
      const envelope = createEnvelopeFromV1({ size: { width: 10, height: 10, depth: 10 }, steps: [] });

      expect(envelope.safety.maxBlocks).toBeDefined();
      expect(envelope.safety.maxHeight).toBeDefined();
      expect(envelope.safety.allowProtectedRegions).toBe(false);
    });

    test('includes metadata with source', () => {
      const envelope = createEnvelopeFromV1(
        { size: { width: 10, height: 10, depth: 10 }, steps: [] },
        { prompt: 'test', source: 'v1' }
      );

      expect(envelope.metadata.source).toBe('v1');
      expect(envelope.metadata.createdAt).toBeDefined();
      expect(envelope.metadata.prompt).toBe('test');
    });
  });

  describe('createEnvelopeFromV2', () => {
    test('creates envelope from V2 placement plan', () => {
      const placementPlan = {
        worldEditBatches: [
          { command: 'set', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 10, z: 10 } }
        ],
        vanillaPlacements: [
          { x: 5, y: 5, z: 5, block: 'torch' }
        ],
        stats: {
          worldEditBlocks: 1000,
          vanillaBlocks: 10,
          worldEditCommands: 5,
          estimatedTime: 30
        }
      };

      const buildPlan = {
        bounds: { width: 15, height: 15, depth: 15 },
        palette: { primary: 'stone' },
        style: { theme: 'medieval' }
      };

      const intent = {
        intent: { category: 'house' },
        prompt: { raw: 'a medieval house' }
      };

      const envelope = createEnvelopeFromV2(placementPlan, buildPlan, intent);

      expect(envelope.blueprintVersion).toBe(ENVELOPE_VERSION);
      expect(envelope.metadata.source).toBe('v2');
      expect(envelope.estimates.blockCount).toBe(1010);
      expect(envelope.estimates.weCommandCount).toBe(5);
    });

    test('uses VOXEL_SPARSE for large vanilla placement count', () => {
      const placementPlan = {
        vanillaPlacements: Array(1500).fill(null).map((_, i) => ({
          x: i % 50, y: Math.floor(i / 50), z: 0, block: 'stone'
        })),
        stats: { vanillaBlocks: 1500 }
      };

      const buildPlan = { bounds: { width: 50, height: 30, depth: 1 } };
      const intent = { intent: { category: 'pixel_art' } };

      const envelope = createEnvelopeFromV2(placementPlan, buildPlan, intent);

      expect(envelope.kind).toBe(BlueprintKind.VOXEL_SPARSE);
    });
  });

  describe('validateEnvelope', () => {
    function createValidEnvelope(kind = BlueprintKind.OPS_SCRIPT) {
      return {
        blueprintVersion: ENVELOPE_VERSION,
        envelopeId: '12345678-1234-1234-1234-123456789abc',
        kind,
        tags: {
          buildType: ['house'],
          style: ['default'],
          passes: ['shell']
        },
        origin: { x: 0, y: 64, z: 0 },
        coordinateSystem: 'local',
        bounds: {
          local: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 9, y: 9, z: 9 }
          }
        },
        estimates: {
          blockCount: 100,
          weCommandCount: 5,
          vanillaBlockCount: 10
        },
        safety: {
          maxBlocks: 50000,
          maxHeight: 64
        },
        payload: kind === BlueprintKind.OPS_SCRIPT
          ? { palette: {}, steps: [{ op: 'fill', block: 'stone' }] }
          : { palette: { 0: 'stone' }, voxels: [{ x: 0, y: 0, z: 0, block: 0 }] }
      };
    }

    test('validates valid OPS_SCRIPT envelope', () => {
      const envelope = createValidEnvelope(BlueprintKind.OPS_SCRIPT);
      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates valid VOXEL_SPARSE envelope', () => {
      const envelope = createValidEnvelope(BlueprintKind.VOXEL_SPARSE);
      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails when blueprintVersion is missing', () => {
      const envelope = createValidEnvelope();
      delete envelope.blueprintVersion;

      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(false);
      // Check that at least one error relates to missing required field
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('fails when kind is invalid', () => {
      const envelope = createValidEnvelope();
      envelope.kind = 'invalid_kind';

      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(false);
    });

    test('fails when tags.buildType is missing', () => {
      const envelope = createValidEnvelope();
      delete envelope.tags.buildType;

      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(false);
    });

    test('fails when origin is missing', () => {
      const envelope = createValidEnvelope();
      delete envelope.origin;

      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(false);
    });

    test('fails when bounds.local is missing', () => {
      const envelope = createValidEnvelope();
      delete envelope.bounds.local;

      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(false);
    });

    test('fails when estimates.blockCount is missing', () => {
      const envelope = createValidEnvelope();
      delete envelope.estimates.blockCount;

      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(false);
    });

    test('fails when payload is missing', () => {
      const envelope = createValidEnvelope();
      delete envelope.payload;

      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(false);
    });

    describe('semantic validation', () => {
      test('fails OPS_SCRIPT without steps array', () => {
        const envelope = createValidEnvelope(BlueprintKind.OPS_SCRIPT);
        envelope.payload = { palette: {} };

        const result = validateEnvelope(envelope);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'PAYLOAD_MISMATCH')).toBe(true);
      });

      test('fails VOXEL_SPARSE without voxels or layers', () => {
        const envelope = createValidEnvelope(BlueprintKind.VOXEL_SPARSE);
        envelope.payload = { palette: {} };

        const result = validateEnvelope(envelope);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'PAYLOAD_MISMATCH')).toBe(true);
      });

      test('fails when bounds min > max', () => {
        const envelope = createValidEnvelope();
        envelope.bounds.local = {
          min: { x: 10, y: 10, z: 10 },
          max: { x: 0, y: 0, z: 0 }
        };

        const result = validateEnvelope(envelope);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'INVALID_BOUNDS')).toBe(true);
      });
    });
  });

  describe('extractPayloadForBuilder', () => {
    test('extracts V1-compatible format from OPS_SCRIPT envelope', () => {
      const envelope = {
        kind: BlueprintKind.OPS_SCRIPT,
        bounds: {
          local: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 9, y: 9, z: 9 }
          }
        },
        payload: {
          palette: { wall: 'stone' },
          steps: [{ op: 'fill', block: 'stone' }]
        }
      };

      const result = extractPayloadForBuilder(envelope);

      expect(result.palette).toEqual({ wall: 'stone' });
      expect(result.steps).toEqual([{ op: 'fill', block: 'stone' }]);
      expect(result.size).toEqual({ width: 10, height: 10, depth: 10 });
    });

    test('converts VOXEL_SPARSE to set operations', () => {
      const envelope = {
        kind: BlueprintKind.VOXEL_SPARSE,
        bounds: {
          local: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 4, y: 4, z: 0 }
          }
        },
        payload: {
          palette: { 0: 'white_concrete', 1: 'black_concrete' },
          voxels: [
            { x: 0, y: 0, z: 0, block: 0 },
            { x: 1, y: 0, z: 0, block: 1 },
            { x: 2, y: 0, z: 0, block: 0 }
          ]
        }
      };

      const result = extractPayloadForBuilder(envelope);

      expect(result.steps).toHaveLength(3);
      expect(result.steps[0]).toEqual({
        op: 'set',
        pos: { x: 0, y: 0, z: 0 },
        block: 'white_concrete'
      });
      expect(result.steps[1]).toEqual({
        op: 'set',
        pos: { x: 1, y: 0, z: 0 },
        block: 'black_concrete'
      });
    });

    test('throws for unsupported kind', () => {
      const envelope = {
        kind: 'unsupported_kind',
        bounds: { local: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } } },
        payload: {}
      };

      expect(() => extractPayloadForBuilder(envelope)).toThrow(/unsupported/i);
    });
  });

  describe('ENVELOPE_VERSION', () => {
    test('follows semver format', () => {
      expect(ENVELOPE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('is 1.0.0', () => {
      expect(ENVELOPE_VERSION).toBe('1.0.0');
    });
  });
});

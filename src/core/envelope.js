/**
 * Blueprint Envelope
 *
 * A versioned wrapper that unifies V1 and V2 blueprint outputs into a
 * consistent format for validation, execution, and persistence.
 *
 * The envelope provides:
 * - Versioning for backward compatibility
 * - Kind-based payload discrimination
 * - Standardized metadata (bounds, estimates, safety)
 * - Validation profile association
 */

import { randomUUID } from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { BlueprintKind, routePrompt } from './router.js';
import { SAFETY_LIMITS } from '../config/limits.js';

// AJV instance for schema validation
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv); // Add format validators (uuid, date-time, etc.)

/**
 * Current envelope schema version
 */
export const ENVELOPE_VERSION = '1.0.0';

/**
 * Blueprint Envelope JSON Schema
 */
export const ENVELOPE_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'blueprint-envelope-v1',
  type: 'object',
  required: ['blueprintVersion', 'kind', 'tags', 'origin', 'bounds', 'estimates', 'safety', 'payload'],
  properties: {
    // Header
    blueprintVersion: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Semantic version of the envelope format'
    },
    envelopeId: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier for this envelope'
    },
    kind: {
      type: 'string',
      enum: Object.values(BlueprintKind),
      description: 'Blueprint execution strategy'
    },

    // Classification
    tags: {
      type: 'object',
      required: ['buildType'],
      properties: {
        buildType: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description: 'Build type classifications'
        },
        style: {
          type: 'array',
          items: { type: 'string' },
          description: 'Style/theme tags'
        },
        passes: {
          type: 'array',
          items: { type: 'string', enum: ['shell', 'detail', 'interior', 'landscape'] },
          description: 'Required build passes'
        }
      }
    },

    // Coordinate System
    origin: {
      type: 'object',
      required: ['x', 'y', 'z'],
      properties: {
        x: { type: 'integer' },
        y: { type: 'integer' },
        z: { type: 'integer' }
      }
    },
    coordinateSystem: {
      type: 'string',
      enum: ['local', 'world'],
      default: 'local'
    },
    bounds: {
      type: 'object',
      required: ['local'],
      properties: {
        local: {
          type: 'object',
          required: ['min', 'max'],
          properties: {
            min: { $ref: '#/definitions/position' },
            max: { $ref: '#/definitions/position' }
          }
        },
        world: {
          type: 'object',
          properties: {
            min: { $ref: '#/definitions/position' },
            max: { $ref: '#/definitions/position' }
          }
        }
      }
    },

    // Estimates
    estimates: {
      type: 'object',
      required: ['blockCount'],
      properties: {
        blockCount: { type: 'integer', minimum: 0 },
        weCommandCount: { type: 'integer', minimum: 0 },
        vanillaBlockCount: { type: 'integer', minimum: 0 },
        estimatedTimeMs: { type: 'integer', minimum: 0 }
      }
    },

    // Safety Constraints
    safety: {
      type: 'object',
      properties: {
        maxBlocks: { type: 'integer', minimum: 1 },
        maxHeight: { type: 'integer', minimum: 1, maximum: 256 },
        allowProtectedRegions: { type: 'boolean', default: false },
        forbiddenBlocks: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },

    // Validation Info (populated after validation)
    validation: {
      type: 'object',
      properties: {
        profile: { type: 'string' },
        qualityScore: { type: 'number', minimum: 0, maximum: 1 },
        qualityGrade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
        warnings: {
          type: 'array',
          items: { type: 'object' }
        },
        validated: { type: 'boolean' },
        validatedAt: { type: 'string', format: 'date-time' }
      }
    },

    // Kind-Specific Payload
    payload: {
      type: 'object',
      description: 'Kind-specific payload (OpsScriptPayload or VoxelSparsePayload)'
    },

    // Metadata
    metadata: {
      type: 'object',
      properties: {
        createdAt: { type: 'string', format: 'date-time' },
        source: { type: 'string', enum: ['v1', 'v2', 'manual'] },
        prompt: { type: 'string' },
        intentId: { type: 'string' }
      }
    }
  },

  definitions: {
    position: {
      type: 'object',
      required: ['x', 'y', 'z'],
      properties: {
        x: { type: 'integer' },
        y: { type: 'integer' },
        z: { type: 'integer' }
      }
    }
  }
};

// Compile schema
const validateEnvelopeSchema = ajv.compile(ENVELOPE_SCHEMA);

/**
 * Create a new BlueprintEnvelope from a V1 blueprint
 *
 * @param {Object} blueprint - V1 blueprint with steps, palette, size
 * @param {Object} options - Creation options
 * @returns {Object} BlueprintEnvelope
 */
export function createEnvelopeFromV1(blueprint, options = {}) {
  const {
    prompt = '',
    buildType = null,
    origin = { x: 0, y: 0, z: 0 },
    source = 'v1'
  } = options;

  // Route prompt if buildType not provided
  const routing = prompt ? routePrompt(prompt) : { buildType: buildType || 'generic', kind: BlueprintKind.OPS_SCRIPT, style: 'default', passes: ['shell'] };

  // Calculate bounds from blueprint size
  const size = blueprint.size || { width: 10, height: 10, depth: 10 };
  const localBounds = {
    min: { x: 0, y: 0, z: 0 },
    max: {
      x: size.width - 1,
      y: size.height - 1,
      z: size.depth - 1
    }
  };

  // Estimate block count from steps
  const estimates = estimateFromSteps(blueprint.steps || []);

  // Create OpsScript payload
  const payload = {
    palette: blueprint.palette || {},
    steps: blueprint.steps || []
  };

  // Build envelope
  const envelope = {
    blueprintVersion: ENVELOPE_VERSION,
    envelopeId: randomUUID(),
    kind: routing.kind,

    tags: {
      buildType: [routing.buildType || buildType || 'generic'],
      style: [routing.style || 'default'],
      passes: routing.passes || ['shell']
    },

    origin,
    coordinateSystem: 'local',
    bounds: {
      local: localBounds,
      world: computeWorldBounds(localBounds, origin)
    },

    estimates,

    safety: {
      maxBlocks: SAFETY_LIMITS.maxBlocks,
      maxHeight: SAFETY_LIMITS.maxHeight,
      allowProtectedRegions: false,
      forbiddenBlocks: []
    },

    validation: {
      profile: routing.profile || 'generic',
      validated: false
    },

    payload,

    metadata: {
      createdAt: new Date().toISOString(),
      source,
      prompt: prompt || undefined
    }
  };

  return envelope;
}

/**
 * Create a new BlueprintEnvelope from V2 placement plan
 *
 * @param {Object} placementPlan - V2 PlacementPlanV2
 * @param {Object} buildPlan - V2 BuildPlanV2
 * @param {Object} intent - V2 BuildIntentV2
 * @param {Object} options - Creation options
 * @returns {Object} BlueprintEnvelope
 */
export function createEnvelopeFromV2(placementPlan, buildPlan, intent, options = {}) {
  const {
    origin = { x: 0, y: 0, z: 0 }
  } = options;

  // Determine kind based on payload type
  const hasVoxels = placementPlan.vanillaPlacements?.length > 1000;
  const kind = hasVoxels ? BlueprintKind.VOXEL_SPARSE : BlueprintKind.OPS_SCRIPT;

  // Extract bounds from build plan
  const bounds = buildPlan.bounds || { width: 10, height: 10, depth: 10 };
  const localBounds = {
    min: { x: 0, y: 0, z: 0 },
    max: {
      x: bounds.width - 1,
      y: bounds.height - 1,
      z: bounds.depth - 1
    }
  };

  // Create payload based on kind
  let payload;
  if (kind === BlueprintKind.VOXEL_SPARSE) {
    payload = {
      palette: buildPlan.palette || {},
      voxels: placementPlan.vanillaPlacements || []
    };
  } else {
    // Convert to OpsScript format
    payload = {
      palette: buildPlan.palette || {},
      steps: convertPlacementToSteps(placementPlan)
    };
  }

  // Build envelope
  const envelope = {
    blueprintVersion: ENVELOPE_VERSION,
    envelopeId: randomUUID(),
    kind,

    tags: {
      buildType: [intent?.intent?.category || 'generic'],
      style: [buildPlan?.style?.theme || 'default'],
      passes: intent?.constraints?.features || ['shell']
    },

    origin,
    coordinateSystem: 'local',
    bounds: {
      local: localBounds,
      world: computeWorldBounds(localBounds, origin)
    },

    estimates: {
      blockCount: placementPlan.stats?.worldEditBlocks + placementPlan.stats?.vanillaBlocks || 0,
      weCommandCount: placementPlan.stats?.worldEditCommands || 0,
      vanillaBlockCount: placementPlan.stats?.vanillaBlocks || 0,
      estimatedTimeMs: placementPlan.stats?.estimatedTime * 1000 || 0
    },

    safety: {
      maxBlocks: SAFETY_LIMITS.maxBlocks,
      maxHeight: SAFETY_LIMITS.maxHeight,
      allowProtectedRegions: false,
      forbiddenBlocks: []
    },

    validation: {
      profile: intent?.intent?.category || 'generic',
      validated: false
    },

    payload,

    metadata: {
      createdAt: new Date().toISOString(),
      source: 'v2',
      prompt: intent?.prompt?.raw,
      intentId: intent?.id
    }
  };

  return envelope;
}

/**
 * Validate an envelope against the schema
 *
 * @param {Object} envelope - The envelope to validate
 * @returns {Object} Validation result
 */
export function validateEnvelope(envelope) {
  const valid = validateEnvelopeSchema(envelope);

  if (!valid) {
    return {
      valid: false,
      errors: validateEnvelopeSchema.errors.map(e => ({
        code: 'SCHEMA_ERROR',
        path: e.instancePath,
        message: e.message,
        params: e.params
      }))
    };
  }

  // Additional semantic validation
  const semanticErrors = validateEnvelopeSemantics(envelope);
  if (semanticErrors.length > 0) {
    return {
      valid: false,
      errors: semanticErrors
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Semantic validation beyond schema
 */
function validateEnvelopeSemantics(envelope) {
  const errors = [];

  // Check payload matches kind
  if (envelope.kind === BlueprintKind.OPS_SCRIPT) {
    if (!envelope.payload.steps || !Array.isArray(envelope.payload.steps)) {
      errors.push({
        code: 'PAYLOAD_MISMATCH',
        message: 'OPS_SCRIPT kind requires payload.steps array'
      });
    }
  }

  if (envelope.kind === BlueprintKind.VOXEL_SPARSE) {
    if (!envelope.payload.voxels && !envelope.payload.layers) {
      errors.push({
        code: 'PAYLOAD_MISMATCH',
        message: 'VOXEL_SPARSE kind requires payload.voxels or payload.layers'
      });
    }
  }

  // Check bounds consistency
  const local = envelope.bounds?.local;
  if (local) {
    if (local.min.x > local.max.x || local.min.y > local.max.y || local.min.z > local.max.z) {
      errors.push({
        code: 'INVALID_BOUNDS',
        message: 'Local bounds min must be <= max in all dimensions'
      });
    }
  }

  // Check safety limits
  if (envelope.estimates?.blockCount > SAFETY_LIMITS.maxBlocks) {
    errors.push({
      code: 'EXCEEDS_BLOCK_LIMIT',
      message: `Estimated block count ${envelope.estimates.blockCount} exceeds limit ${SAFETY_LIMITS.maxBlocks}`
    });
  }

  return errors;
}

/**
 * Estimate block counts from V1 steps
 */
function estimateFromSteps(steps) {
  let blockCount = 0;
  let weCommandCount = 0;
  let vanillaBlockCount = 0;

  for (const step of steps) {
    const op = step.op?.toLowerCase() || '';

    if (op.startsWith('we_') || op === 'fill' || op === 'hollow_box') {
      weCommandCount++;

      // Estimate blocks for WorldEdit ops
      if (step.from && step.to) {
        const dx = Math.abs(step.to.x - step.from.x) + 1;
        const dy = Math.abs(step.to.y - step.from.y) + 1;
        const dz = Math.abs(step.to.z - step.from.z) + 1;
        blockCount += dx * dy * dz;
      } else if (step.size) {
        blockCount += (step.size.x || 1) * (step.size.y || 1) * (step.size.z || 1);
      } else {
        blockCount += 100; // Default estimate
      }
    } else if (op === 'set' || op === 'line') {
      vanillaBlockCount++;
      blockCount++;
    } else {
      // Other ops
      vanillaBlockCount += 10;
      blockCount += 10;
    }
  }

  const estimatedTimeMs = (weCommandCount * 3 * 400) + (vanillaBlockCount * 10);

  return {
    blockCount,
    weCommandCount: weCommandCount * 3, // pos1, pos2, operation
    vanillaBlockCount,
    estimatedTimeMs
  };
}

/**
 * Compute world bounds from local bounds and origin
 */
function computeWorldBounds(localBounds, origin) {
  return {
    min: {
      x: origin.x + localBounds.min.x,
      y: origin.y + localBounds.min.y,
      z: origin.z + localBounds.min.z
    },
    max: {
      x: origin.x + localBounds.max.x,
      y: origin.y + localBounds.max.y,
      z: origin.z + localBounds.max.z
    }
  };
}

/**
 * Convert V2 placement plan to V1-compatible steps
 */
function convertPlacementToSteps(placementPlan) {
  const steps = [];

  // Convert WorldEdit batches
  for (const batch of placementPlan.worldEditBatches || []) {
    const opMap = {
      'set': 'we_fill',
      'walls': 'we_walls',
      'sphere': 'we_sphere',
      'cylinder': 'we_cylinder',
      'pyramid': 'we_pyramid',
      'replace': 'we_replace'
    };

    const step = {
      op: opMap[batch.command] || 'we_fill',
      block: batch.block
    };

    if (batch.from && batch.to) {
      step.from = batch.from;
      step.to = batch.to;
    } else if (batch.center) {
      step.center = batch.center;
      step.radius = batch.params?.radius;
      step.height = batch.params?.height;
    } else if (batch.base) {
      step.base = batch.base;
      step.height = batch.params?.height;
    }

    steps.push(step);
  }

  // Convert vanilla placements to set operations (grouped)
  const vanillaBatches = new Map();
  for (const placement of placementPlan.vanillaPlacements || []) {
    const key = placement.batchId || 'default';
    if (!vanillaBatches.has(key)) {
      vanillaBatches.set(key, []);
    }
    vanillaBatches.get(key).push(placement);
  }

  for (const [batchId, placements] of vanillaBatches) {
    if (placements.length === 1) {
      steps.push({
        op: 'set',
        pos: { x: placements[0].x, y: placements[0].y, z: placements[0].z },
        block: placements[0].block
      });
    } else {
      // Group as vanilla batch
      steps.push({
        op: 'set_batch',
        blocks: placements.map(p => ({
          x: p.x, y: p.y, z: p.z, block: p.block
        }))
      });
    }
  }

  return steps;
}

/**
 * Extract the payload in a format suitable for the builder
 */
export function extractPayloadForBuilder(envelope) {
  if (envelope.kind === BlueprintKind.OPS_SCRIPT) {
    return {
      palette: envelope.payload.palette,
      steps: envelope.payload.steps,
      size: {
        width: envelope.bounds.local.max.x - envelope.bounds.local.min.x + 1,
        height: envelope.bounds.local.max.y - envelope.bounds.local.min.y + 1,
        depth: envelope.bounds.local.max.z - envelope.bounds.local.min.z + 1
      }
    };
  }

  if (envelope.kind === BlueprintKind.VOXEL_SPARSE) {
    // Convert voxels to set operations
    const steps = (envelope.payload.voxels || []).map(v => ({
      op: 'set',
      pos: { x: v.x, y: v.y, z: v.z },
      block: typeof v.block === 'number'
        ? envelope.payload.palette[v.block]
        : v.block
    }));

    return {
      palette: envelope.payload.palette,
      steps,
      size: {
        width: envelope.bounds.local.max.x - envelope.bounds.local.min.x + 1,
        height: envelope.bounds.local.max.y - envelope.bounds.local.min.y + 1,
        depth: envelope.bounds.local.max.z - envelope.bounds.local.min.z + 1
      }
    };
  }

  throw new Error(`Unsupported envelope kind: ${envelope.kind}`);
}

// Re-export BlueprintKind for convenience
export { BlueprintKind };

export default {
  ENVELOPE_VERSION,
  ENVELOPE_SCHEMA,
  BlueprintKind,
  createEnvelopeFromV1,
  createEnvelopeFromV2,
  validateEnvelope,
  extractPayloadForBuilder
};

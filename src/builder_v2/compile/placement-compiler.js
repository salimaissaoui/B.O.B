/**
 * Builder v2 Placement Compiler
 *
 * Compiles BuildPlanV2 into executable PlacementPlanV2.
 * Optimizes for WorldEdit batching and vanilla fallback.
 */

import { hashPlacementPlan } from '../utils/hash.js';
import { SAFETY_LIMITS } from '../../config/limits.js';

/**
 * Compile BuildPlanV2 into PlacementPlanV2
 * @param {Object} plan - BuildPlanV2 object
 * @param {Object} options - Compilation options
 * @param {boolean} options.preferWorldEdit - Prefer WorldEdit operations
 * @param {number} options.batchSize - Max blocks per batch
 * @param {number} options.checkpointInterval - Blocks between checkpoints
 * @returns {Object} PlacementPlanV2 object
 */
export function compilePlacement(plan, options = {}) {
  const {
    preferWorldEdit = true,
    batchSize = SAFETY_LIMITS.worldEdit?.maxSelectionVolume || 50000,
    checkpointInterval = 5000
  } = options;

  console.log(`  [PlacementCompiler] Compiling placement for ${plan.geometry.length} primitives`);

  const worldEditBatches = [];
  const vanillaPlacements = [];
  const checkpoints = [];

  let batchId = 0;
  let vanillaIndex = 0;
  let totalWEBlocks = 0;
  let totalVanillaBlocks = 0;

  // Sort geometry by layer for proper build order
  const sortedGeometry = [...plan.geometry].sort((a, b) => {
    return (a.layer || 0) - (b.layer || 0);
  });

  for (const prim of sortedGeometry) {
    // Determine if this primitive can be WorldEdit batched
    const canWE = preferWorldEdit && canWorldEdit(prim);

    if (canWE) {
      const batch = createWorldEditBatch(prim, batchId++);
      worldEditBatches.push(batch);
      totalWEBlocks += batch.estimatedBlocks;

      // Add checkpoint after large batches
      if (totalWEBlocks > 0 && totalWEBlocks % checkpointInterval < batch.estimatedBlocks) {
        batch.checkpointAfter = true;
        checkpoints.push({
          id: checkpoints.length,
          afterBatch: batchId - 1,
          description: `After batch ${batchId - 1} (~${totalWEBlocks} blocks)`
        });
      }
    } else {
      // Convert to vanilla placements
      const placements = expandToVanillaPlacements(prim, vanillaIndex);
      vanillaPlacements.push(...placements);
      totalVanillaBlocks += placements.length;
      vanillaIndex += placements.length;

      // Add checkpoint periodically
      if (totalVanillaBlocks > 0 && totalVanillaBlocks % checkpointInterval < placements.length) {
        checkpoints.push({
          id: checkpoints.length,
          afterVanillaIndex: vanillaIndex - 1,
          description: `After vanilla placement ${vanillaIndex - 1} (~${totalVanillaBlocks} blocks)`
        });
      }
    }
  }

  // Calculate estimated time
  const weCommandTime = worldEditBatches.length * 3 * (SAFETY_LIMITS.worldEdit?.commandMinDelayMs || 400) / 1000;
  const vanillaTime = totalVanillaBlocks / (SAFETY_LIMITS.buildRateLimit || 100);
  const estimatedTime = weCommandTime + vanillaTime;

  const placement = {
    version: '2.0',
    planId: plan.sceneId,
    hash: '', // Set after construction
    strategy: {
      preferWorldEdit,
      batchSize,
      checkpointInterval
    },
    worldEditBatches,
    vanillaPlacements,
    checkpoints,
    stats: {
      worldEditCommands: worldEditBatches.length * 3, // pos1, pos2, operation
      worldEditBlocks: totalWEBlocks,
      vanillaBlocks: totalVanillaBlocks,
      estimatedTime
    }
  };

  placement.hash = hashPlacementPlan(placement);

  console.log(`  [PlacementCompiler] WE batches: ${worldEditBatches.length}, Vanilla: ${vanillaPlacements.length}`);
  console.log(`  [PlacementCompiler] Est. time: ${estimatedTime.toFixed(1)}s`);

  return placement;
}

/**
 * Check if a primitive can use WorldEdit
 */
function canWorldEdit(prim) {
  // These types are well-suited for WorldEdit
  const weTypes = ['box', 'hollow_box', 'sphere', 'cylinder', 'pyramid'];

  if (!weTypes.includes(prim.type)) {
    return false;
  }

  // Estimate block count
  const blocks = estimateBlocks(prim);

  // Only use WE for larger operations
  return blocks > 20;
}

/**
 * Estimate block count for a primitive
 */
function estimateBlocks(prim) {
  switch (prim.type) {
    case 'box':
      if (prim.from && prim.to) {
        const w = Math.abs(prim.to.x - prim.from.x) + 1;
        const h = Math.abs(prim.to.y - prim.from.y) + 1;
        const d = Math.abs(prim.to.z - prim.from.z) + 1;
        return w * h * d;
      }
      return 100;
    case 'hollow_box':
      if (prim.from && prim.to) {
        const w = Math.abs(prim.to.x - prim.from.x) + 1;
        const h = Math.abs(prim.to.y - prim.from.y) + 1;
        const d = Math.abs(prim.to.z - prim.from.z) + 1;
        return w * h * d - Math.max(0, w - 2) * Math.max(0, h - 2) * Math.max(0, d - 2);
      }
      return 80;
    case 'sphere':
      if (prim.radius) {
        const r = prim.radius;
        return Math.round((4 / 3) * Math.PI * r * r * r * (prim.hollow ? 0.3 : 1));
      }
      return 500;
    case 'cylinder':
      if (prim.radius && prim.height) {
        const r = prim.radius;
        const h = prim.height;
        return Math.round(Math.PI * r * r * h * (prim.hollow ? 0.3 : 1));
      }
      return 300;
    default:
      return 1;
  }
}

/**
 * Create a WorldEdit batch from a primitive
 */
function createWorldEditBatch(prim, batchId) {
  const batch = {
    id: batchId,
    command: mapPrimitiveToWECommand(prim.type),
    block: prim.block,
    estimatedBlocks: estimateBlocks(prim),
    checkpointAfter: false
  };

  // Copy coordinates based on primitive type
  if (prim.from) batch.from = { ...prim.from };
  if (prim.to) batch.to = { ...prim.to };
  if (prim.center) batch.center = { ...prim.center };
  if (prim.base) batch.base = { ...prim.base };

  // Copy params
  if (prim.radius || prim.height || prim.hollow !== undefined) {
    batch.params = {};
    if (prim.radius) batch.params.radius = prim.radius;
    if (prim.height) batch.params.height = prim.height;
    if (prim.hollow !== undefined) batch.params.hollow = prim.hollow;
  }

  return batch;
}

/**
 * Map primitive type to WorldEdit command
 */
function mapPrimitiveToWECommand(type) {
  const mapping = {
    'box': 'set',
    'hollow_box': 'walls',
    'sphere': 'sphere',
    'cylinder': 'cylinder',
    'pyramid': 'pyramid'
  };
  return mapping[type] || 'set';
}

/**
 * Expand a primitive to vanilla placements
 */
function expandToVanillaPlacements(prim, startIndex) {
  const placements = [];

  switch (prim.type) {
    case 'set':
      if (prim.pos) {
        placements.push({
          x: prim.pos.x,
          y: prim.pos.y,
          z: prim.pos.z,
          block: prim.block,
          batchId: Math.floor(startIndex / 100)
        });
      }
      break;

    case 'line':
      if (prim.from && prim.to) {
        const dx = prim.to.x - prim.from.x;
        const dy = prim.to.y - prim.from.y;
        const dz = prim.to.z - prim.from.z;
        const steps = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));

        for (let i = 0; i <= steps; i++) {
          const t = steps > 0 ? i / steps : 0;
          placements.push({
            x: Math.round(prim.from.x + dx * t),
            y: Math.round(prim.from.y + dy * t),
            z: Math.round(prim.from.z + dz * t),
            block: prim.block,
            batchId: Math.floor((startIndex + i) / 100)
          });
        }
      }
      break;

    case 'stairs':
    case 'slab':
    case 'door':
      if (prim.pos) {
        placements.push({
          x: prim.pos.x,
          y: prim.pos.y,
          z: prim.pos.z,
          block: prim.block,
          batchId: Math.floor(startIndex / 100)
        });
        // Doors are 2 blocks tall
        if (prim.type === 'door') {
          placements.push({
            x: prim.pos.x,
            y: prim.pos.y + 1,
            z: prim.pos.z,
            block: prim.block,
            batchId: Math.floor(startIndex / 100)
          });
        }
      }
      break;

    case 'box':
    case 'hollow_box':
      // These should have been WorldEdit but fall back to vanilla
      if (prim.from && prim.to) {
        for (let x = prim.from.x; x <= prim.to.x; x++) {
          for (let y = prim.from.y; y <= prim.to.y; y++) {
            for (let z = prim.from.z; z <= prim.to.z; z++) {
              // For hollow box, skip interior
              if (prim.type === 'hollow_box') {
                const isInterior =
                  x > prim.from.x && x < prim.to.x &&
                  y > prim.from.y && y < prim.to.y &&
                  z > prim.from.z && z < prim.to.z;
                if (isInterior) continue;
              }

              placements.push({
                x, y, z,
                block: prim.block,
                batchId: Math.floor((startIndex + placements.length) / 100)
              });
            }
          }
        }
      }
      break;

    default:
      console.warn(`  [PlacementCompiler] Unsupported primitive type for vanilla: ${prim.type}`);
  }

  return placements;
}

/**
 * Get placement at a specific checkpoint
 */
export function getPlacementAtCheckpoint(placement, checkpointId) {
  const checkpoint = placement.checkpoints.find(c => c.id === checkpointId);
  if (!checkpoint) return null;

  return {
    worldEditBatches: placement.worldEditBatches.slice(0, (checkpoint.afterBatch || 0) + 1),
    vanillaPlacements: placement.vanillaPlacements.slice(0, (checkpoint.afterVanillaIndex || 0) + 1)
  };
}

export default {
  compilePlacement,
  getPlacementAtCheckpoint
};

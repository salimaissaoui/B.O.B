/**
 * Builder v2 Executor
 *
 * Executes PlacementPlanV2 using the existing WorldEdit executor
 * and vanilla placement mechanisms.
 */

import { convertToLegacyBlueprint } from '../index.js';

/**
 * Execute a PlacementPlanV2
 *
 * @param {Object} placement - PlacementPlanV2 object
 * @param {Object} plan - BuildPlanV2 object
 * @param {Object} builder - Existing Builder instance
 * @param {Object} startPos - Build start position {x, y, z}
 * @param {Object} options - Execution options
 * @returns {Object} Execution result
 */
export async function executePlacementV2(placement, plan, builder, startPos, options = {}) {
  const {
    onProgress = () => {},
    resumeFromCheckpoint = null
  } = options;

  console.log('[ExecutorV2] Starting execution...');
  console.log(`  WorldEdit batches: ${placement.worldEditBatches.length}`);
  console.log(`  Vanilla placements: ${placement.vanillaPlacements.length}`);
  console.log(`  Start position: ${startPos.x}, ${startPos.y}, ${startPos.z}`);

  // Convert to legacy blueprint format for existing executor
  const legacyBlueprint = convertToLegacyBlueprint(plan, placement);

  // Use existing builder.executeBlueprint
  // This leverages all existing ACK, rate limiting, undo, resume logic
  try {
    await builder.executeBlueprint(legacyBlueprint, startPos);

    return {
      success: true,
      stats: placement.stats
    };
  } catch (error) {
    console.error('[ExecutorV2] Execution failed:', error.message);
    return {
      success: false,
      error: error.message,
      stats: placement.stats
    };
  }
}

/**
 * Execute with resume support
 */
export async function executeWithResume(placement, plan, builder, startPos, checkpointId) {
  // Get placement state at checkpoint
  const { getPlacementAtCheckpoint } = await import('../compile/placement-compiler.js');
  const resumeState = getPlacementAtCheckpoint(placement, checkpointId);

  if (!resumeState) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  console.log(`[ExecutorV2] Resuming from checkpoint ${checkpointId}`);

  // Create partial placement
  const partialPlacement = {
    ...placement,
    worldEditBatches: placement.worldEditBatches.slice(resumeState.worldEditBatches.length),
    vanillaPlacements: placement.vanillaPlacements.slice(resumeState.vanillaPlacements.length)
  };

  return executePlacementV2(partialPlacement, plan, builder, startPos);
}

/**
 * Dry-run execution (compile only, no placement)
 */
export function dryRunExecution(placement, plan) {
  console.log('[ExecutorV2] DRY RUN - No blocks will be placed');
  console.log('\n=== Build Summary ===');
  console.log(`Title: ${plan.bounds ? `${plan.bounds.width}x${plan.bounds.height}x${plan.bounds.depth}` : 'Unknown'}`);
  console.log(`Total blocks: ~${placement.stats.worldEditBlocks + placement.stats.vanillaBlocks}`);
  console.log(`WorldEdit commands: ${placement.stats.worldEditCommands}`);
  console.log(`Vanilla placements: ${placement.stats.vanillaBlocks}`);
  console.log(`Estimated time: ${placement.stats.estimatedTime.toFixed(1)} seconds`);
  console.log(`Checkpoints: ${placement.checkpoints.length}`);
  console.log(`Plan hash: ${plan.hash.substring(0, 16)}...`);
  console.log(`Placement hash: ${placement.hash.substring(0, 16)}...`);
  console.log('====================\n');

  return {
    success: true,
    dryRun: true,
    stats: placement.stats,
    hashes: {
      plan: plan.hash,
      placement: placement.hash
    }
  };
}

export default {
  executePlacementV2,
  executeWithResume,
  dryRunExecution
};

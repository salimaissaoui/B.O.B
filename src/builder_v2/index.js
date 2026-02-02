/**
 * Builder v2 - Main Entry Point
 *
 * Generalized "build anything" system with strict layered contracts.
 * Feature-flagged to coexist with legacy v1 builder.
 */

import { analyzeIntentV2 } from './intent/analyzer.js';
import { generateSceneV2 } from './llm/scene-generator.js';
import { compilePlan, verifyDeterminism } from './plan/compiler.js';
import { compilePlacement, getPlacementAtCheckpoint } from './compile/placement-compiler.js';
import {
  validateIntent,
  validateScene,
  validatePlan,
  validatePlacement,
  formatValidationErrors
} from './validate/validators.js';
import { resolveBlock, resolvePalette, getThemePalette } from './style/engine.js';
import { createSeededRandom, seedFromBuildId } from './utils/seed.js';
import { hashBuildPlan, hashPlacementPlan } from './utils/hash.js';

/**
 * Check if Builder v2 is enabled
 */
export function isBuilderV2Enabled() {
  // Check environment variable
  if (process.env.BUILDER_V2_ENABLED === 'true') {
    return true;
  }
  if (process.env.BUILDER_V2_ENABLED === 'false') {
    return false;
  }

  // Default: disabled (safe rollout)
  return false;
}

/**
 * Check if dry-run mode is enabled
 */
export function isDryRunMode() {
  return process.env.BUILDER_V2_DRY_RUN === 'true';
}

/**
 * Runtime state for builder version
 */
let runtimeBuilderVersion = null;

/**
 * Set builder version at runtime
 * @param {'v1' | 'v2'} version
 */
export function setBuilderVersion(version) {
  if (version === 'v1' || version === 'v2') {
    runtimeBuilderVersion = version;
    console.log(`[BuilderV2] Runtime version set to: ${version}`);
    return true;
  }
  return false;
}

/**
 * Get current builder version
 */
export function getBuilderVersion() {
  if (runtimeBuilderVersion) {
    return runtimeBuilderVersion;
  }
  return isBuilderV2Enabled() ? 'v2' : 'v1';
}

/**
 * Full Builder v2 Pipeline
 *
 * Intent → Scene → Plan → Placement → Execute
 *
 * @param {string} prompt - User build request
 * @param {string} apiKey - Gemini API key
 * @param {Object} context - Execution context
 * @param {boolean} context.worldEditAvailable - WorldEdit detected
 * @param {string} context.serverVersion - Server version
 * @param {Object} context.imageAnalysis - Optional image analysis
 * @param {Object} options - Pipeline options
 * @param {boolean} options.dryRun - Compile only, don't execute
 * @param {number} options.seed - Random seed for determinism
 * @returns {Object} Pipeline result
 */
export async function runBuilderV2Pipeline(prompt, apiKey, context = {}, options = {}) {
  const {
    dryRun = isDryRunMode(),
    seed = Date.now()
  } = options;

  console.log('[BuilderV2] Starting pipeline...');
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

  const result = {
    success: false,
    stages: {},
    errors: [],
    warnings: []
  };

  try {
    // Stage 1: Intent Analysis (non-LLM)
    console.log('[BuilderV2] Stage 1: Analyzing intent...');
    const intent = analyzeIntentV2(prompt, context);

    const intentValidation = validateIntent(intent);
    if (!intentValidation.valid) {
      result.errors.push(...formatValidationErrors(intentValidation));
      throw new Error('Intent validation failed');
    }

    result.stages.intent = {
      id: intent.id,
      category: intent.intent.category,
      scale: intent.intent.scale,
      reference: intent.intent.reference
    };

    // Stage 2: Scene Generation (LLM)
    console.log('[BuilderV2] Stage 2: Generating scene...');
    const scene = await generateSceneV2(intent, apiKey);

    const sceneValidation = validateScene(scene);
    if (!sceneValidation.valid) {
      result.warnings.push(...formatValidationErrors(sceneValidation));
      console.warn('[BuilderV2] Scene has validation warnings, continuing with fallback');
    }

    result.stages.scene = {
      title: scene.description?.title,
      bounds: scene.bounds,
      components: scene.components?.length || 0,
      theme: scene.style?.theme
    };

    // Stage 3: Plan Compilation (deterministic)
    console.log('[BuilderV2] Stage 3: Compiling plan...');
    const plan = compilePlan(scene, { seed, serverVersion: context.serverVersion });

    const planValidation = validatePlan(plan);
    if (!planValidation.valid) {
      result.warnings.push(...formatValidationErrors(planValidation));
    }

    // Verify determinism
    const isDeterministic = verifyDeterminism(scene, seed);
    if (!isDeterministic) {
      result.warnings.push('Plan compilation is non-deterministic');
    }

    result.stages.plan = {
      hash: plan.hash,
      stats: plan.stats,
      deterministic: isDeterministic
    };

    // Stage 4: Placement Compilation
    console.log('[BuilderV2] Stage 4: Compiling placement...');
    const placement = compilePlacement(plan, {
      preferWorldEdit: context.worldEditAvailable
    });

    result.stages.placement = {
      hash: placement.hash,
      stats: placement.stats,
      checkpoints: placement.checkpoints.length
    };

    // Dry run ends here
    if (dryRun) {
      console.log('[BuilderV2] Dry run complete.');
      result.success = true;
      result.dryRun = true;
      result.placement = placement;
      result.plan = plan;
      return result;
    }

    // Stage 5: Execution (would integrate with existing executor)
    console.log('[BuilderV2] Stage 5: Ready for execution');
    result.success = true;
    result.placement = placement;
    result.plan = plan;

    return result;

  } catch (error) {
    console.error('[BuilderV2] Pipeline error:', error.message);
    result.errors.push(error.message);
    return result;
  }
}

/**
 * Convert PlacementPlanV2 to legacy blueprint format
 * For compatibility with existing executor
 */
export function convertToLegacyBlueprint(plan, placement) {
  const steps = [];

  // Convert WorldEdit batches
  for (const batch of placement.worldEditBatches) {
    const step = {
      op: mapWECommandToOp(batch.command),
      block: batch.block
    };

    if (batch.from) step.from = batch.from;
    if (batch.to) step.to = batch.to;
    if (batch.center) step.center = batch.center;
    if (batch.base) step.base = batch.base;
    if (batch.params?.radius) step.radius = batch.params.radius;
    if (batch.params?.height) step.height = batch.params.height;
    if (batch.params?.hollow !== undefined) step.hollow = batch.params.hollow;

    steps.push(step);
  }

  // Convert vanilla placements
  // Group by batch for efficiency
  const vanillaBatches = {};
  for (const p of placement.vanillaPlacements) {
    const batchKey = `${p.batchId}_${p.block}`;
    if (!vanillaBatches[batchKey]) {
      vanillaBatches[batchKey] = { block: p.block, positions: [] };
    }
    vanillaBatches[batchKey].positions.push({ x: p.x, y: p.y, z: p.z });
  }

  for (const batch of Object.values(vanillaBatches)) {
    // If there are many placements, they should be individual set operations
    for (const pos of batch.positions) {
      steps.push({
        op: 'set',
        pos,
        block: batch.block
      });
    }
  }

  return {
    buildType: 'builder_v2',
    size: plan.bounds,
    palette: plan.palette,
    steps,
    _v2: {
      planHash: plan.hash,
      placementHash: placement.hash,
      stats: placement.stats
    }
  };
}

function mapWECommandToOp(command) {
  const mapping = {
    'set': 'we_fill',
    'walls': 'we_walls',
    'sphere': 'we_sphere',
    'cylinder': 'we_cylinder',
    'pyramid': 'we_pyramid'
  };
  return mapping[command] || 'we_fill';
}

// Export all public APIs
export {
  // Intent
  analyzeIntentV2,

  // Scene Generation
  generateSceneV2,

  // Plan Compilation
  compilePlan,
  verifyDeterminism,

  // Placement Compilation
  compilePlacement,
  getPlacementAtCheckpoint,

  // Validation
  validateIntent,
  validateScene,
  validatePlan,
  validatePlacement,
  formatValidationErrors,

  // Style
  resolveBlock,
  resolvePalette,
  getThemePalette,

  // Utils
  createSeededRandom,
  seedFromBuildId,
  hashBuildPlan,
  hashPlacementPlan
};

export default {
  isBuilderV2Enabled,
  isDryRunMode,
  setBuilderVersion,
  getBuilderVersion,
  runBuilderV2Pipeline,
  convertToLegacyBlueprint
};

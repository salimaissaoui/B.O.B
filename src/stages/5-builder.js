import { Vec3 } from 'vec3';
import { fill } from '../operations/fill.js';
import { hollowBox } from '../operations/hollow-box.js';
import { set } from '../operations/set.js';
import { line } from '../operations/line.js';
import { windowStrip } from '../operations/window-strip.js';
import { roofGable } from '../operations/roof-gable.js';
import { roofFlat } from '../operations/roof-flat.js';
import { weFill } from '../operations/we-fill.js';
import { weWalls } from '../operations/we-walls.js';
import { wePyramid } from '../operations/we-pyramid.js';
import { weCylinder } from '../operations/we-cylinder.js';
import { weSphere } from '../operations/we-sphere.js';
import { weReplace } from '../operations/we-replace.js';
import { stairs } from '../operations/stairs.js';
import { slab } from '../operations/slab.js';
import { fenceConnect } from '../operations/fence-connect.js';
import { door } from '../operations/door.js';
import { spiralStaircase } from '../operations/spiral-staircase.js';
import { balcony } from '../operations/balcony.js';
import { roofHip } from '../operations/roof-hip.js';
import { pixelArt } from '../operations/pixel-art.js';
import { WorldEditExecutor } from '../worldedit/executor.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { isWorldEditOperation } from '../config/operations-registry.js';

/**
 * P0 Fix: Simple async mutex to prevent concurrent builds
 */
class BuildMutex {
  constructor() {
    this.locked = false;
    this.queue = [];
  }

  async acquire() {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    // Wait in queue
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.locked = false;
    }
  }
}

const OPERATION_MAP = {
  fill,
  hollow_box: hollowBox,
  set,
  line,
  window_strip: windowStrip,
  roof_gable: roofGable,
  roof_flat: roofFlat,
  we_fill: weFill,
  we_walls: weWalls,
  we_pyramid: wePyramid,
  we_cylinder: weCylinder,
  we_sphere: weSphere,
  we_replace: weReplace,
  stairs,
  slab,
  fence_connect: fenceConnect,
  door,
  spiral_staircase: spiralStaircase,
  balcony,
  roof_hip: roofHip,
  pixel_art: pixelArt
};

/**
 * Builder class - Executes blueprints in Minecraft
 */
export class Builder {
  constructor(bot) {
    this.bot = bot;
    this.history = [];  // For undo functionality (vanilla operations)
    this.building = false;
    this.currentBuild = null;
    this.maxHistory = 10;
    this.usesChatCommands = typeof this.bot?.setBlock !== 'function' &&
      typeof this.bot?.chat === 'function';
    this.worldEdit = new WorldEditExecutor(bot);
    this.worldEditEnabled = false;

    // P0 Fix: Mutex to prevent concurrent builds
    this.buildMutex = new BuildMutex();

    // P0 Fix: Track WorldEdit operations separately for undo
    this.worldEditHistory = [];

    if (this.bot && typeof this.bot.on === 'function') {
      this.bot.on('end', () => {
        if (this.building) {
          console.warn('Build interrupted: bot disconnected');
          this.building = false;
          this.buildMutex.release();
        }
      });
    }
  }

  /**
   * Initialize builder and detect WorldEdit capability
   */
  async initialize() {
    console.log('Initializing builder...');
    this.worldEditEnabled = await this.worldEdit.detectWorldEdit();
    return this.worldEditEnabled;
  }

  /**
   * Execute a blueprint at the given starting position
   * @param {Object} blueprint - Validated blueprint
   * @param {Object} startPos - Starting position {x, y, z}
   * P0 Fix: Uses mutex to prevent concurrent builds
   */
  async executeBlueprint(blueprint, startPos) {
    // P0 Fix: Acquire mutex before checking/setting building flag
    await this.buildMutex.acquire();

    try {
      if (this.building) {
        throw new Error('Build already in progress');
      }

      this.building = true;
      this.currentBuild = {
        blueprint,
        startPos,
        startTime: Date.now(),
        blocksPlaced: 0,
        worldEditOpsExecuted: 0,  // P0 Fix: Track WE ops for undo
        fallbacksUsed: 0,  // Track fallback operations
        warnings: []  // Track warnings during build
      };

      const buildHistory = [];

      // Optimize blueprint to use WorldEdit when available
      if (this.worldEditEnabled) {
        console.log('  → Running WorldEdit optimization...');
        this.optimizeBlueprintForWorldEdit(blueprint);
      } else {
        console.log('  → WorldEdit not available, using vanilla operations');
      }

      console.log('Starting build execution...');
      console.log(`  Location: ${startPos.x}, ${startPos.y}, ${startPos.z}`);
      console.log(`  Total steps: ${blueprint.steps.length}`);
      console.log(`  WorldEdit: ${this.worldEditEnabled ? 'ENABLED' : 'DISABLED'}`);

      // Reset WorldEdit executor for new build
      this.worldEdit.reset();
      // P0 Fix: Clear WE history for new build
      this.worldEditHistory = [];

      for (let i = 0; i < blueprint.steps.length; i++) {
        if (!this.building) {
          console.log('Build cancelled by user');
          break;
        }

        const step = blueprint.steps[i];
        console.log(`  Step ${i + 1}/${blueprint.steps.length}: ${step.op}`);

        // Check if this is a WorldEdit operation
        if (isWorldEditOperation(step.op)) {
          try {
            await this.executeWorldEditOperation(step, startPos);
            // P0 Fix: Track WE operation for undo (only on success)
            this.worldEditHistory.push({
              step,
              startPos,
              timestamp: Date.now()
            });
            this.currentBuild.worldEditOpsExecuted++;
          } catch (weError) {
            // Log structured error information
            const errorType = weError.errorType || 'UNKNOWN';
            const suggestedFix = weError.suggestedFix || 'Check server logs';

            console.warn(`⚠ WorldEdit operation failed: ${step.op}`);
            console.warn(`  Error type: ${errorType}`);
            console.warn(`  Message: ${weError.message}`);
            console.warn(`  Suggested fix: ${suggestedFix}`);

            // Track warning
            this.currentBuild.warnings.push({
              step: i + 1,
              operation: step.op,
              errorType,
              message: weError.message,
              suggestedFix
            });

            // Fallback to vanilla if enabled
            if (SAFETY_LIMITS.worldEdit.fallbackOnError && step.fallback) {
              console.log(`  → Falling back to vanilla operation: ${step.fallback.op}`);
              await this.executeVanillaOperation(step.fallback, startPos, buildHistory);
              this.currentBuild.fallbacksUsed++;
            } else {
              throw weError;
            }
          }
        } else {
          // Vanilla operation
          await this.executeVanillaOperation(step, startPos, buildHistory);
        }
      }

      // Store history for undo
      if (buildHistory.length > 0) {
        this.history.push(buildHistory);
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }
      }

      const duration = ((Date.now() - this.currentBuild.startTime) / 1000).toFixed(1);
      const weOps = this.currentBuild.worldEditOpsExecuted;
      const fallbacks = this.currentBuild.fallbacksUsed;
      const warnings = this.currentBuild.warnings.length;

      console.log(`✓ Build completed in ${duration}s`);
      console.log(`  Blocks placed: ${this.currentBuild.blocksPlaced}`);
      console.log(`  WorldEdit ops: ${weOps}`);
      if (fallbacks > 0) {
        console.log(`  Fallbacks used: ${fallbacks}`);
      }
      if (warnings > 0) {
        console.log(`  Warnings: ${warnings}`);
        this.currentBuild.warnings.forEach((w, idx) => {
          console.log(`    ${idx + 1}. Step ${w.step}: ${w.errorType} - ${w.message}`);
        });
      }

    } catch (error) {
      console.error(`Build execution failed: ${error.message}`);
      throw error;
    } finally {
      this.building = false;
      this.currentBuild = null;
      // P0 Fix: Release mutex when done
      this.buildMutex.release();
    }
  }

  /**
   * Execute WorldEdit operation
   */
  async executeWorldEditOperation(step, startPos) {
    if (!this.worldEditEnabled) {
      throw new Error('WorldEdit not available');
    }

    const operation = OPERATION_MAP[step.op];
    if (!operation) {
      throw new Error(`Unknown operation: ${step.op}`);
    }

    // Get operation descriptor
    const descriptor = operation(step);

    if (descriptor.type !== 'worldedit') {
      throw new Error('Not a WorldEdit operation');
    }

    console.log(`    → Using WorldEdit (estimated: ${descriptor.estimatedBlocks} blocks)`);

    // Execute WorldEdit command sequence based on command type
    switch (descriptor.command) {
      case 'fill':
        await this.executeWorldEditFill(descriptor, startPos);
        break;

      case 'walls':
        await this.executeWorldEditWalls(descriptor, startPos);
        break;

      case 'pyramid':
        await this.executeWorldEditPyramid(descriptor, startPos);
        break;

      case 'cylinder':
        await this.executeWorldEditCylinder(descriptor, startPos);
        break;

      case 'sphere':
        await this.executeWorldEditSphere(descriptor, startPos);
        break;

      case 'replace':
        await this.executeWorldEditReplace(descriptor, startPos);
        break;

      default:
        throw new Error(`Unknown WorldEdit command: ${descriptor.command}`);
    }

    this.currentBuild.blocksPlaced += descriptor.estimatedBlocks;
  }

  /**
   * Execute WorldEdit fill command
   */
  async executeWorldEditFill(descriptor, startPos) {
    const worldFrom = {
      x: startPos.x + descriptor.from.x,
      y: startPos.y + descriptor.from.y,
      z: startPos.z + descriptor.from.z
    };

    const worldTo = {
      x: startPos.x + descriptor.to.x,
      y: startPos.y + descriptor.to.y,
      z: startPos.z + descriptor.to.z
    };

    await this.worldEdit.createSelection(worldFrom, worldTo);
    await this.worldEdit.fillSelection(descriptor.block);
    await this.worldEdit.clearSelection();
  }

  /**
   * Execute WorldEdit walls command
   */
  async executeWorldEditWalls(descriptor, startPos) {
    const worldFrom = {
      x: startPos.x + descriptor.from.x,
      y: startPos.y + descriptor.from.y,
      z: startPos.z + descriptor.from.z
    };

    const worldTo = {
      x: startPos.x + descriptor.to.x,
      y: startPos.y + descriptor.to.y,
      z: startPos.z + descriptor.to.z
    };

    await this.worldEdit.createSelection(worldFrom, worldTo);
    await this.worldEdit.createWalls(descriptor.block);
    await this.worldEdit.clearSelection();
  }

  /**
   * P0 Fix: Teleport bot and verify position
   * @param {Object} targetPos - Target position {x, y, z}
   * @param {number} tolerance - Position tolerance in blocks (default: 2)
   * @returns {Promise<boolean>} - True if teleport succeeded
   */
  async teleportAndVerify(targetPos, tolerance = 2) {
    if (!this.bot || !this.bot.entity) {
      throw new Error('Bot entity not available for teleport');
    }

    const beforePos = this.bot.entity.position.clone();

    // Send teleport command
    this.bot.chat(`/tp @s ${targetPos.x} ${targetPos.y} ${targetPos.z}`);

    // Wait for position update with timeout
    const maxWaitTime = 2000;
    const checkInterval = 100;
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      await this.sleep(checkInterval);
      elapsed += checkInterval;

      const currentPos = this.bot.entity.position;
      const dx = Math.abs(currentPos.x - targetPos.x);
      const dy = Math.abs(currentPos.y - targetPos.y);
      const dz = Math.abs(currentPos.z - targetPos.z);

      if (dx <= tolerance && dy <= tolerance && dz <= tolerance) {
        console.log(`    → Teleported to ${targetPos.x}, ${targetPos.y}, ${targetPos.z}`);
        return true;
      }
    }

    // Check if position changed at all
    const currentPos = this.bot.entity.position;
    const moved = beforePos.distanceTo(currentPos) > 0.5;

    if (!moved) {
      console.warn(`    ⚠ Teleport may have failed (no position change detected)`);
      console.warn(`    ⚠ Expected: ${targetPos.x}, ${targetPos.y}, ${targetPos.z}`);
      console.warn(`    ⚠ Current: ${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)}`);
      return false;
    }

    // Moved but not to exact target - partial success
    console.warn(`    ⚠ Teleport position mismatch (may still work)`);
    return true;
  }

  /**
   * Execute WorldEdit pyramid command
   * P0 Fix: Verify teleport before executing
   */
  async executeWorldEditPyramid(descriptor, startPos) {
    const worldBase = {
      x: startPos.x + descriptor.base.x,
      y: startPos.y + descriptor.base.y,
      z: startPos.z + descriptor.base.z
    };

    // P0 Fix: Teleport and verify position
    const teleported = await this.teleportAndVerify(worldBase);
    if (!teleported) {
      throw new Error(`Failed to teleport to pyramid base position (${worldBase.x}, ${worldBase.y}, ${worldBase.z})`);
    }

    await this.worldEdit.createPyramid(descriptor.block, descriptor.height, descriptor.hollow);
  }

  /**
   * Execute WorldEdit cylinder command
   * P0 Fix: Verify teleport before executing
   */
  async executeWorldEditCylinder(descriptor, startPos) {
    const worldBase = {
      x: startPos.x + descriptor.base.x,
      y: startPos.y + descriptor.base.y,
      z: startPos.z + descriptor.base.z
    };

    // P0 Fix: Teleport and verify position
    const teleported = await this.teleportAndVerify(worldBase);
    if (!teleported) {
      throw new Error(`Failed to teleport to cylinder base position (${worldBase.x}, ${worldBase.y}, ${worldBase.z})`);
    }

    await this.worldEdit.createCylinder(
      descriptor.block,
      descriptor.radius,
      descriptor.height,
      descriptor.hollow
    );
  }

  /**
   * Execute WorldEdit sphere command
   * P0 Fix: Verify teleport before executing
   */
  async executeWorldEditSphere(descriptor, startPos) {
    const worldCenter = {
      x: startPos.x + descriptor.center.x,
      y: startPos.y + descriptor.center.y,
      z: startPos.z + descriptor.center.z
    };

    // P0 Fix: Teleport and verify position
    const teleported = await this.teleportAndVerify(worldCenter);
    if (!teleported) {
      throw new Error(`Failed to teleport to sphere center position (${worldCenter.x}, ${worldCenter.y}, ${worldCenter.z})`);
    }

    await this.worldEdit.createSphere(descriptor.block, descriptor.radius, descriptor.hollow);
  }

  /**
   * Execute WorldEdit replace command
   */
  async executeWorldEditReplace(descriptor, startPos) {
    const worldFrom = {
      x: startPos.x + descriptor.from.x,
      y: startPos.y + descriptor.from.y,
      z: startPos.z + descriptor.from.z
    };

    const worldTo = {
      x: startPos.x + descriptor.to.x,
      y: startPos.y + descriptor.to.y,
      z: startPos.z + descriptor.to.z
    };

    await this.worldEdit.createSelection(worldFrom, worldTo);
    await this.worldEdit.replaceBlocks(descriptor.fromBlock, descriptor.toBlock);
    await this.worldEdit.clearSelection();
  }

  /**
   * Execute vanilla operation (existing + new detail ops)
   */
  async executeVanillaOperation(step, startPos, buildHistory) {
    // Get operation handler
    const operation = OPERATION_MAP[step.op];
    if (!operation) {
      console.error(`Unknown operation: ${step.op}`);
      return;
    }

    // Generate block placements
    let blocks;
    try {
      blocks = operation(step);
    } catch (opError) {
      console.error(`Operation error: ${opError.message}`);
      return;
    }

    // Execute block placements with rate limiting
    if (this.currentBuild.blocksPlaced + blocks.length > SAFETY_LIMITS.maxBlocks) {
      throw new Error(`Build exceeds max block limit (${SAFETY_LIMITS.maxBlocks})`);
    }

    for (const blockPlacement of blocks) {
      if (!this.building) break;

      const worldPos = {
        x: startPos.x + blockPlacement.x,
        y: startPos.y + blockPlacement.y,
        z: startPos.z + blockPlacement.z
      };

      try {
        // Get current block at position for undo
        const currentBlock = this.bot.blockAt(new Vec3(worldPos.x, worldPos.y, worldPos.z));

        buildHistory.push({
          pos: worldPos,
          previousBlock: currentBlock ? currentBlock.name : 'air'
        });

        // Place the block
        await this.placeBlock(worldPos, blockPlacement.block);
        this.currentBuild.blocksPlaced++;

        // Rate limiting
        await this.sleep(this.getPlacementDelayMs());
      } catch (placeError) {
        console.error(`Failed to place block at ${worldPos.x},${worldPos.y},${worldPos.z}: ${placeError.message}`);
      }
    }
  }

  /**
   * Optimize blueprint to use WorldEdit operations for faster building
   * Converts vanilla operations to WorldEdit equivalents when beneficial
   */
  optimizeBlueprintForWorldEdit(blueprint) {
    if (!blueprint.steps || blueprint.steps.length === 0) {
      console.warn('⚠ Empty blueprint provided to optimizer');
      return;
    }

    let optimized = 0;
    const VOLUME_THRESHOLD = 4; // Use WorldEdit for volumes >= 4 blocks
    const buildType = blueprint.buildType || 'unknown';
    const isTree = buildType === 'tree';

    console.log(`  → Optimizing blueprint for WorldEdit (buildType: ${buildType}, ${blueprint.steps.length} steps)`);

    for (let i = 0; i < blueprint.steps.length; i++) {
      const step = blueprint.steps[i];

      // CRITICAL: Force ALL fill operations to we_fill for trees
      if (isTree && step.op === 'fill') {
        if (!step.from || !step.to) {
          console.warn(`    ⚠ Skipping invalid fill operation at step ${i}`);
          continue;
        }
        const fallback = { ...step };
        step.op = 'we_fill';
        step.fallback = fallback;
        optimized++;
        continue;
      }

      // Convert fill → we_fill for large volumes
      if (step.op === 'fill' && step.from && step.to) {
        const volume = this.calculateVolume(step.from, step.to);
        if (volume >= VOLUME_THRESHOLD) {
          console.log(`    → Converting fill to we_fill (volume: ${volume})`);
          // Store original as fallback
          const fallback = { ...step };
          step.op = 'we_fill';
          step.fallback = fallback;
          optimized++;
        }
      }

      // Convert hollow_box → we_walls for large boxes
      if (step.op === 'hollow_box' && step.from && step.to) {
        const volume = this.calculateVolume(step.from, step.to);
        if (volume >= VOLUME_THRESHOLD * 2) {
          console.log(`    → Converting hollow_box to we_walls (volume: ${volume})`);
          const fallback = { ...step };
          step.op = 'we_walls';
          step.fallback = fallback;
          optimized++;
        }
      }

      // Convert line to we_fill if it's a thick line (same start/end on 2 axes)
      if (step.op === 'line' && step.from && step.to) {
        const dx = Math.abs(step.to.x - step.from.x);
        const dy = Math.abs(step.to.y - step.from.y);
        const dz = Math.abs(step.to.z - step.from.z);
        const length = Math.max(dx, dy, dz);

        // Long lines benefit from WorldEdit
        if (length >= 10) {
          console.log(`    → Converting line to we_fill (length: ${length})`);
          const fallback = { ...step };
          step.op = 'we_fill';
          step.fallback = fallback;
          optimized++;
        }
      }
    }

    // Batch consecutive set operations into we_fill regions
    blueprint.steps = this.batchSetOperations(blueprint.steps);

    if (optimized > 0) {
      console.log(`  ✓ Optimized ${optimized} operations for WorldEdit`);
    } else {
      console.log(`  → No optimizations applied`);
    }
  }

  /**
   * Batch consecutive set operations with same block into fill regions
   */
  batchSetOperations(steps) {
    const result = [];
    let currentBatch = null;

    for (const step of steps) {
      if (step.op === 'set' && step.pos && step.block) {
        if (!currentBatch || currentBatch.block !== step.block) {
          // Start new batch
          if (currentBatch && currentBatch.positions.length >= 4) {
            result.push(this.createBatchedFill(currentBatch));
          } else if (currentBatch) {
            // Too few, keep as individual sets
            currentBatch.positions.forEach(pos => {
              result.push({ op: 'set', pos, block: currentBatch.block });
            });
          }
          currentBatch = { block: step.block, positions: [step.pos] };
        } else {
          currentBatch.positions.push(step.pos);
        }
      } else {
        // Flush current batch
        if (currentBatch) {
          if (currentBatch.positions.length >= 4) {
            result.push(this.createBatchedFill(currentBatch));
          } else {
            currentBatch.positions.forEach(pos => {
              result.push({ op: 'set', pos, block: currentBatch.block });
            });
          }
          currentBatch = null;
        }
        result.push(step);
      }
    }

    // Flush remaining batch
    if (currentBatch) {
      if (currentBatch.positions.length >= 4) {
        result.push(this.createBatchedFill(currentBatch));
      } else {
        currentBatch.positions.forEach(pos => {
          result.push({ op: 'set', pos, block: currentBatch.block });
        });
      }
    }

    return result;
  }

  /**
   * Create a we_fill operation from a batch of positions
   */
  createBatchedFill(batch) {
    const positions = batch.positions;
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));
    const minZ = Math.min(...positions.map(p => p.z));
    const maxZ = Math.max(...positions.map(p => p.z));

    return {
      op: 'we_fill',
      block: batch.block,
      from: { x: minX, y: minY, z: minZ },
      to: { x: maxX, y: maxY, z: maxZ },
      fallback: {
        op: 'fill',
        block: batch.block,
        from: { x: minX, y: minY, z: minZ },
        to: { x: maxX, y: maxY, z: maxZ }
      }
    };
  }

  /**
   * Calculate volume of a region
   */
  calculateVolume(from, to) {
    const dx = Math.abs(to.x - from.x) + 1;
    const dy = Math.abs(to.y - from.y) + 1;
    const dz = Math.abs(to.z - from.z) + 1;
    return dx * dy * dz;
  }

  /**
   * Place a single block in the world
   */
  async placeBlock(pos, blockType) {
    const target = new Vec3(pos.x, pos.y, pos.z);
    const existing = this.bot.blockAt(target);

    if (existing && existing.name === blockType) {
      return;
    }

    if (typeof this.bot.setBlock === 'function') {
      await this.bot.setBlock(target, blockType);
      return;
    }

    if (typeof this.bot.chat === 'function') {
      // Requires server permissions for /setblock.
      this.bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} ${blockType}`);
      return;
    }

    throw new Error('No supported block placement method available');
  }

  /**
   * Undo the last build
   * P0 Fix: Also undoes WorldEdit operations
   */
  async undo() {
    const hasVanillaHistory = this.history.length > 0;
    const hasWorldEditHistory = this.worldEditHistory.length > 0;

    if (!hasVanillaHistory && !hasWorldEditHistory) {
      throw new Error('No builds to undo');
    }

    if (this.building) {
      throw new Error('Cannot undo while building');
    }

    // P0 Fix: Undo WorldEdit operations first (they're usually larger)
    if (hasWorldEditHistory) {
      console.log(`Undoing ${this.worldEditHistory.length} WorldEdit operations...`);

      try {
        const result = await this.worldEdit.undoAll();
        console.log(`  WorldEdit: ${result.undone} undone, ${result.failed} failed`);
      } catch (error) {
        console.error(`  WorldEdit undo error: ${error.message}`);
      }

      // Clear WE history after undo attempt
      this.worldEditHistory = [];
    }

    // Undo vanilla operations
    if (hasVanillaHistory) {
      const lastBuild = this.history.pop();
      console.log(`Undoing vanilla blocks (${lastBuild.length} blocks)...`);

      for (const { pos, previousBlock } of lastBuild.reverse()) {
        try {
          await this.placeBlock(pos, previousBlock);
          await this.sleep(this.getPlacementDelayMs());
        } catch (error) {
          console.error(`Failed to restore block at ${pos.x},${pos.y},${pos.z}`);
        }
      }
    }

    console.log('✓ Undo completed');
  }

  /**
   * P0 Fix: Get count of undoable operations
   */
  getUndoInfo() {
    return {
      vanillaBuilds: this.history.length,
      vanillaBlocks: this.history.reduce((sum, build) => sum + build.length, 0),
      worldEditOps: this.worldEditHistory.length
    };
  }

  /**
   * Cancel the current build
   * P0 Fix: Properly signals cancellation (mutex released in executeBlueprint finally block)
   */
  cancel() {
    if (!this.building) {
      throw new Error('No build in progress');
    }

    console.log('Cancelling build...');
    this.building = false;
    // Note: Mutex is released in executeBlueprint's finally block
  }

  /**
   * Get build progress
   * P0 Fix: Includes WorldEdit operation count, fallbacks, and warnings
   */
  getProgress() {
    if (!this.currentBuild) {
      return null;
    }

    return {
      blocksPlaced: this.currentBuild.blocksPlaced,
      worldEditOps: this.currentBuild.worldEditOpsExecuted || 0,
      fallbacksUsed: this.currentBuild.fallbacksUsed || 0,
      warnings: this.currentBuild.warnings || [],
      elapsedTime: Date.now() - this.currentBuild.startTime,
      isBuilding: this.building
    };
  }

  /**
   * Sleep helper for rate limiting
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getPlacementDelayMs() {
    const baseDelay = 1000 / SAFETY_LIMITS.buildRateLimit;
    if (this.usesChatCommands) {
      return Math.max(baseDelay, SAFETY_LIMITS.chatCommandMinDelayMs);
    }
    return baseDelay;
  }
}

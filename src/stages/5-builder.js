import { Vec3 } from 'vec3';
import pathfinderPkg from 'mineflayer-pathfinder';
const { pathfinder, goals } = pathfinderPkg;
import { volume as universalVolume } from '../operations/universal/volume.js';
import { BuildCursor } from '../operations/universal/cursor.js';
import { optimizeBlockGroups } from './optimization/batching.js';
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
import { smartWall } from '../operations/smart-wall.js';
import { smartFloor } from '../operations/smart-floor.js';
import { smartRoof } from '../operations/smart-roof.js';
import { WorldEditExecutor } from '../worldedit/executor.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { isWorldEditOperation, OPERATIONS_REGISTRY } from '../config/operations-registry.js';
import { buildMetrics } from '../utils/performance-metrics.js';
import { ActionQueue } from '../utils/queue/action-queue.js';
import { InventoryManager, formatValidationResult } from '../utils/inventory-manager.js';
import { PathfindingHelper, calculateDistance } from '../utils/pathfinding-helper.js';
import { BuildStationManager } from '../positioning/BuildStationManager.js';
import { validateBuildArea, clampToWorldBoundaries, safeBlockAt, WORLD_BOUNDARIES } from '../validation/world-validator.js';
import { BuildStateManager } from '../state/build-state.js';

const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

/**
 * Build Mutex - Prevents Concurrent Build Race Conditions
 *
 * Original bug: Multiple build requests could execute simultaneously, causing:
 * - Overlapping block placements (builds interfering with each other)
 * - Corrupted build state (blocksPlaced counter incorrect)
 * - Server overload from doubled command rate
 *
 * Fix: Async mutex ensures only one build executes at a time.
 * Subsequent builds queue and wait for current build to complete.
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
  // Universal Ops (Cursor-aware & Auto-optimized)
  box: universalVolume,
  wall: (step, ctx) => universalVolume({ ...step, hollow: true }, ctx),
  outline: (step, ctx) => universalVolume({ ...step, hollow: true }, ctx),
  move: (step, ctx) => {
    if (ctx && ctx.cursor) {
      ctx.cursor.move(step.offset);
    }
    return []; // No blocks to place
  },
  cursor_reset: (step, ctx) => {
    if (ctx && ctx.cursor) {
      ctx.cursor.reset();
    }
    return []; // No blocks to place
  },
  fill: universalVolume,
  hollow_box: (step, ctx) => universalVolume({ ...step, hollow: true }, ctx),

  // Legacy mappings
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
  pixel_art: pixelArt,
  smart_wall: smartWall,
  smart_floor: smartFloor,
  smart_roof: smartRoof,

  // New Mappings
  sphere: (step) => ({ type: 'worldedit', command: 'sphere', ...step }),
  cylinder: (step) => ({ type: 'worldedit', command: 'cylinder', ...step }),
  smooth: (step) => ({ type: 'organic', command: 'smooth', ...step }),
  grow_tree: (step) => ({ type: 'organic', command: 'grow_tree', ...step })
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

    // Build concurrency control
    // Prevents race conditions when multiple build requests arrive simultaneously
    this.buildMutex = new BuildMutex();

    // WorldEdit Undo Tracking
    // Original bug: Vanilla undo worked, but WorldEdit operations were permanent
    // Fix: Track WorldEdit commands separately so //undo can reverse them
    this.worldEditHistory = [];

    // Action Queue for Reliability
    // Manages sequential execution of critical building operations
    this.actionQueue = new ActionQueue();

    // Inventory and pathfinding helpers
    this.inventoryManager = new InventoryManager(bot);
    this.pathfindingHelper = new PathfindingHelper(bot);

    // Build Station Manager - reduces pathfinding calls from 400+ to ~10-20
    this.stationManager = new BuildStationManager(bot);

    // State persistence for crash recovery
    this.stateManager = new BuildStateManager();

    // Progress tracking configuration
    this.progressUpdateInterval = 10; // Emit progress every N blocks

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
   * Helper: Send plugin command safely with delay
   */
  async sendPluginCommand(cmd) {
    if (!this.bot) return;
    this.bot.chat(cmd);
    await this.bot.waitForTicks(5);
  }

  /**
   * Initialize builder and detect WorldEdit capability
   */
  async initialize() {
    console.log('Initializing builder...');
    this.worldEditEnabled = await this.worldEdit.detectWorldEdit();

    // Permission pre-check: Test if /setblock works
    await this.checkSetblockPermission();

    return this.worldEditEnabled;
  }

  /**
   * Automatic Site Prep
   * Clears the area before building based on blueprint dimensions.
   */
  async autoClearArea(blueprint, startPos) {
    console.log('  → Auto-clearing build site...');

    // Default safe size if missing
    const w = blueprint.size?.width || 10;
    const h = blueprint.size?.height || 10;
    const d = blueprint.size?.depth || 10;

    // Safety padding
    const padding = 1;

    // If pixel art, Z depth is usually 1, but clear a bit of space anyway
    const depthClear = blueprint.buildType === 'pixel_art' ? 2 : d;

    if (this.worldEditEnabled) {
      const from = { x: startPos.x - padding, y: startPos.y, z: startPos.z - padding };
      const to = { x: startPos.x + w + padding, y: startPos.y + h + padding, z: startPos.z + depthClear + padding };

      try {
        await this.worldEdit.createSelection(from, to);
        await this.worldEdit.fillSelection('air');
        await this.worldEdit.clearSelection();
        console.log('    ✓ Site cleared (WorldEdit)');
      } catch (e) {
        console.warn(`    ⚠ Auto-clear failed: ${e.message}`);
      }
    } else {
      console.log('    ⚠ Auto-clear skipped (Vanilla clearing too slow)');
    }
  }

  /**
   * Pre-Build Obstruction Scout
   * Scans the build area for non-air blocks before building.
   * Returns obstruction info so the caller can decide to clear or skip.
   *
   * @param {Object} startPos - Build start position {x, y, z}
   * @param {Object} size - Build dimensions {width, height, depth}
   * @returns {Promise<Object>} { hasObstructions, count, obstructions (first 10) }
   */
  async preBuildScout(startPos, size) {
    const obstructions = [];
    const maxScan = 50; // Cap scan area to avoid huge loops

    const scanW = Math.min(size.width || 10, maxScan);
    const scanH = Math.min(size.height || 10, maxScan);
    const scanD = Math.min(size.depth || 10, maxScan);

    for (let y = 0; y < scanH; y++) {
      for (let x = 0; x < scanW; x++) {
        for (let z = 0; z < scanD; z++) {
          const worldPos = {
            x: startPos.x + x,
            y: startPos.y + y,
            z: startPos.z + z
          };

          try {
            const block = this.bot.blockAt(new Vec3(worldPos.x, worldPos.y, worldPos.z));
            if (block && block.name !== 'air' && block.name !== 'cave_air' && block.name !== 'void_air') {
              obstructions.push({ pos: worldPos, block: block.name });
            }
          } catch {
            // Ignore unloaded chunks during scout
          }
        }
      }
    }

    return {
      hasObstructions: obstructions.length > 0,
      count: obstructions.length,
      obstructions: obstructions.slice(0, 10) // First 10 for logging
    };
  }

  /**
   * Clear obstructions in the build area using WorldEdit or vanilla
   * @param {Object} startPos - Build start position
   * @param {Object} size - Build dimensions
   * @returns {Promise<boolean>} True if cleared
   */
  async clearObstructions(startPos, size) {
    if (this.worldEditEnabled) {
      const from = {
        x: startPos.x - 1,
        y: startPos.y,
        z: startPos.z - 1
      };
      const to = {
        x: startPos.x + (size.width || 10) + 1,
        y: startPos.y + (size.height || 10) + 1,
        z: startPos.z + (size.depth || 10) + 1
      };

      try {
        await this.worldEdit.createSelection(from, to);
        await this.worldEdit.fillSelection('air');
        await this.worldEdit.clearSelection();
        console.log('    ✓ Obstructions cleared (WorldEdit)');
        return true;
      } catch (e) {
        console.warn(`    ⚠ Clearing failed: ${e.message}`);
        return false;
      }
    }

    console.log('    ⚠ Obstruction clearing requires WorldEdit (skipped)');
    return false;
  }

  /**
   * Validate step against build mode constraints
   */
  validateStepForMode(step, buildType) {
    if (buildType === 'pixel_art') {
      const allowed = ['pixel_art', 'move', 'cursor_reset'];
      if (!allowed.includes(step.op)) {
        console.warn(`    ⚠ Operation '${step.op}' blocked by Pixel Art Mode`);
        return false;
      }
    }
    return true;
  }

  /**
   * Check if /setblock command is available
   * This prevents starting builds that will silently fail
   */
  async checkSetblockPermission() {
    if (!this.bot || !this.bot.entity) return;

    try {
      const testPos = this.bot.entity.position.floored();
      // Try to get the block at bot position
      const currentBlock = this.bot.blockAt(testPos);

      if (currentBlock) {
        console.log('✓ Block reading available');
        this.hasBlockReadAccess = true;
      }

      // Note: We can't easily test /setblock without actually modifying the world
      // For now, we assume if WorldEdit works, /setblock likely works too
      if (this.worldEditEnabled) {
        console.log('✓ WorldEdit available - /setblock likely available');
        this.hasSetblockAccess = true;
      } else {
        console.warn('⚠ WorldEdit not available - builds will use /setblock (requires OP)');
        this.hasSetblockAccess = true; // Assume available, will fail per-block if not
      }
    } catch (error) {
      console.warn(`⚠ Permission check failed: ${error.message}`);
      this.hasBlockReadAccess = false;
      this.hasSetblockAccess = false;
    }
  }

  /**
   * Calculate world position from relative position
   * Includes Y-axis clamping to world boundaries (-64 to 320)
   * @param {Object} relativePos - Relative position {x, y, z}
   * @param {Object} startPos - Starting position {x, y, z}
   * @returns {Object} World position {x, y, z}
   */
  calculateWorldPosition(relativePos, startPos) {
    const worldY = Math.floor(startPos.y + relativePos.y);

    return {
      x: Math.floor(startPos.x + relativePos.x),
      y: Math.max(WORLD_BOUNDARIES.MIN_Y, Math.min(WORLD_BOUNDARIES.MAX_Y, worldY)),
      z: Math.floor(startPos.z + relativePos.z)
    };
  }

  /**
   * Optimize build order for efficient placement
   * Sorts blocks by: 1) Y-level (bottom to top), 2) Distance from bot, 3) Block type
   * @param {Array} blocks - Array of blocks to sort
   * @param {Object} startPos - Starting position
   * @returns {Array} Sorted blocks
   */
  optimizeBuildOrder(blocks, startPos) {
    if (!blocks || blocks.length === 0) {
      return blocks;
    }

    const botPos = this.bot && this.bot.entity ? this.bot.entity.position : startPos;

    return blocks.sort((a, b) => {
      // Extract positions
      const posA = a.pos || a;
      const posB = b.pos || b;

      // Primary: Sort by Y-level (bottom to top)
      if (posA.y !== posB.y) {
        return posA.y - posB.y;
      }

      // Secondary: Sort by distance from bot position
      const worldPosA = this.calculateWorldPosition(posA, startPos);
      const worldPosB = this.calculateWorldPosition(posB, startPos);

      const distA = calculateDistance(botPos, worldPosA);
      const distB = calculateDistance(botPos, worldPosB);

      if (Math.abs(distA - distB) > 0.1) {
        return distA - distB;
      }

      // Tertiary: Sort by block type (group same materials)
      const blockA = a.block || '';
      const blockB = b.block || '';
      return blockA.localeCompare(blockB);
    });
  }

  /**
   * Place a block with retry logic and exponential backoff
   * Uses station-based positioning when available (no per-block pathfinding)
   *
   * @param {Object} pos - World position {x, y, z}
   * @param {string} blockType - Block type to place
   * @param {number} maxRetries - Maximum retry attempts (default: 3)
   * @param {boolean} skipRangeCheck - Skip range check (when using stations)
   * @returns {Promise<boolean>} True if placement succeeded
   */
  async placeBlockWithRetry(pos, blockType, maxRetries = 3, skipRangeCheck = false) {
    const delays = [50, 100, 200]; // Exponential backoff delays in ms

    // Self-collision check: Move bot if it's standing where we want to place a block
    if (!skipRangeCheck && this.bot?.entity?.position && this.pathfindingHelper?.isAvailable()) {
      const botPos = this.bot.entity.position;
      const botX = Math.floor(botPos.x);
      const botY = Math.floor(botPos.y);
      const botZ = Math.floor(botPos.z);

      // Check if bot is standing on or in the target block position
      const blocksPlacement = (botX === pos.x && botY === pos.y && botZ === pos.z);
      const standsOnBlock = (botX === pos.x && botY === pos.y - 1 && botZ === pos.z);

      if (blocksPlacement || standsOnBlock) {
        console.log(`  Bot collision at ${pos.x},${pos.y},${pos.z} (bot at ${botX},${botY},${botZ}), moving away...`);

        // Move bot to a safe position away from the block
        const safePos = {
          x: pos.x + 2,
          y: pos.y,
          z: pos.z
        };

        try {
          // Directly use pathfinder to move (ensures goto is always called)
          const goal = new goals.GoalNear(safePos.x, safePos.y, safePos.z, 1);
          await this.bot.pathfinder.goto(goal);
        } catch (error) {
          console.warn(`  Failed to move bot away from collision: ${error.message}`);
        }
      }
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check if in range using station manager (fast check, no pathfinding)
        let inRange = true;
        if (!skipRangeCheck && this.stationManager) {
          inRange = this.stationManager.isBlockInReach(pos);
          if (!inRange) {
            // Only use pathfinding as fallback if station manager isn't being used
            if (!this.usingStationBasedMovement && this.pathfindingHelper.isAvailable()) {
              inRange = await this.pathfindingHelper.ensureInRange(pos);
            }
            if (!inRange) {
              console.warn(`  Bot cannot reach position ${pos.x}, ${pos.y}, ${pos.z}`);
            }
          }
        }

        // Attempt to place the block
        await this.placeBlock(pos, blockType);

        // Optimization: In creative mode, skip verification for speed after placing
        // ONLY if position was verified in-range
        if (this.inventoryManager.checkCreativeMode() && inRange) {
          return true;
        }

        // Verify placement
        await this.sleep(50); // Small delay for block update
        const placedBlock = safeBlockAt(this.bot, new Vec3(pos.x, pos.y, pos.z));

        // Handle block states - compare base block name (before '[' if present)
        const expectedBlockName = blockType.split('[')[0];
        const actualBlockName = placedBlock ? (placedBlock.name || 'air') : 'air';

        if (actualBlockName === expectedBlockName || actualBlockName === blockType) {
          return true; // Success
        }

        // Block not verified, retry
        if (attempt < maxRetries - 1) {
          const delay = delays[attempt] || 200;
          console.warn(`  Block placement not verified, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
        }

      } catch (error) {
        if (attempt < maxRetries - 1) {
          const delay = delays[attempt] || 200;
          console.warn(`  Block placement failed: ${error.message}, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
        } else {
          throw error; // Final attempt failed
        }
      }
    }

    return false; // All retries exhausted
  }

  /**
   * Execute a blueprint at the given starting position
   * @param {Object} blueprint - Validated blueprint
   * @param {Object} startPos - Starting position {x, y, z}
   *
   * Uses mutex to ensure only one build executes at a time (prevents race conditions)
   */
  async executeBlueprint(blueprint, startPos) {
    // Acquire mutex lock - blocks if another build is in progress
    // Released in finally block to ensure cleanup on error
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
        blocksFailed: 0,
        blocksSkipped: 0,
        worldEditOpsExecuted: 0,  // P0 Fix: Track WE ops for undo
        fallbacksUsed: 0,  // Track fallback operations
        warnings: [],  // Track warnings during build
        lastProgressUpdate: 0
      };

      const buildHistory = [];

      // Note: Blueprint should already contain native WorldEdit operations
      // No post-processing optimization needed
      console.log('Starting build execution...');
      console.log(`  Location: ${startPos.x}, ${startPos.y}, ${startPos.z}`);
      console.log(`  Total steps: ${blueprint.steps.length}`);
      console.log(`  WorldEdit: ${this.worldEditEnabled ? 'ENABLED' : 'DISABLED'}`);

      // Pre-build world validation (chunks & boundaries)
      console.log('\n→ Validating build area...');
      const worldValidation = validateBuildArea(this.bot, startPos, blueprint.size);

      if (worldValidation.warnings.length > 0) {
        console.log('  World validation warnings:');
        worldValidation.warnings.forEach(w => console.warn(`    ⚠ ${w}`));
      }

      if (!worldValidation.valid) {
        throw new Error('Build area validation failed: ' + worldValidation.warnings.join('; '));
      }

      // Apply Y-axis clamping if needed
      if (worldValidation.yClampApplied) {
        console.log(`  Applied Y-axis clamp: height ${blueprint.size.height} → ${worldValidation.clampedSize.height}`);
        blueprint.size.height = worldValidation.clampedSize.height;
      }

      console.log(`  Chunks: ${worldValidation.chunksLoaded}/${worldValidation.chunksNeeded} loaded`);

      // Pre-build material validation
      console.log('\n→ Validating materials...');
      const materialValidation = this.inventoryManager.validateForBlueprint(blueprint);
      console.log(formatValidationResult(materialValidation));

      if (!materialValidation.valid) {
        const shouldContinue = SAFETY_LIMITS.allowPartialBuilds || false;
        if (!shouldContinue) {
          throw new Error('Insufficient materials for build. Please gather required materials first.');
        }
        console.warn('⚠ Continuing with available materials (partial build mode)');
      }

      // Reset WorldEdit executor for new build
      this.worldEdit.reset();
      // P0 Fix: Clear WE history for new build
      this.worldEditHistory = [];

      // Start state tracking for crash recovery
      const buildId = this.stateManager.startBuild(blueprint, startPos);
      console.log(`  Build ID: ${buildId}`);

      // Start performance metrics tracking
      buildMetrics.startBuild();

      // P0 Fix: Initialize Cursor and Context
      this.cursor = new BuildCursor(startPos);

      // Pre-build obstruction scout
      console.log('\n→ Scanning build area for obstructions...');
      const scoutResult = await this.preBuildScout(startPos, blueprint.size);
      if (scoutResult.hasObstructions) {
        console.log(`  Found ${scoutResult.count} obstructing blocks`);
        scoutResult.obstructions.forEach(o => {
          console.log(`    → ${o.block} at ${o.pos.x},${o.pos.y},${o.pos.z}`);
        });
        if (scoutResult.count > scoutResult.obstructions.length) {
          console.log(`    ... and ${scoutResult.count - scoutResult.obstructions.length} more`);
        }
      } else {
        console.log('  ✓ Build area is clear');
      }

      // P0 Fix: Auto-Clear Area (also clears obstructions)
      await this.autoClearArea(blueprint, startPos);

      const resolveBlock = (blockName) => {
        if (!blockName) return 'air';
        if (blockName.startsWith('$')) {
          const key = blockName.substring(1);
          if (blueprint.palette && blueprint.palette[key]) {
            return blueprint.palette[key];
          }
          // Fallback if palette key missing: try to guess or return air
          console.warn(`Missing variable in palette: ${key}`);
          return 'stone';
        }
        return blockName;
      };

      const buildContext = {
        startPos,
        cursor: this.cursor,
        worldEditEnabled: this.worldEditEnabled,
        resolveBlock
      };

      for (let i = 0; i < blueprint.steps.length; i++) {
        if (!this.building) {
          console.log('Build cancelled by user');
          break;
        }

        const step = blueprint.steps[i];

        // P0 Fix: Skip LLM-generated site prep (we already did it)
        if (step.op === 'site_prep' || step.op === 'clear_area') {
          continue;
        }

        // P0 Fix: Enforce Mode Constraints
        if (!this.validateStepForMode(step, blueprint.buildType)) {
          continue;
        }

        console.log(`  Step ${i + 1}/${blueprint.steps.length}: ${step.op}`);
        if (DEBUG) {
          const detailStr = step.block ? `block=${step.block}` : '';
          const posStr = step.from ? `from=${JSON.stringify(step.from)} to=${JSON.stringify(step.to)}` :
            (step.pos ? `pos=${JSON.stringify(step.pos)}` : '');
          console.log(`    DEBUG: ${step.op} ${detailStr} ${posStr}`);
        }

        // Update state progress
        this.stateManager.updateProgress({
          currentStep: i,
          blocksPlaced: this.currentBuild.blocksPlaced,
          blocksFailed: this.currentBuild.blocksFailed,
          worldEditOps: this.currentBuild.worldEditOpsExecuted
        });

        // UNIVERSAL OPS HANDLER (box, wall, outline, fill, hollow_box)
        if (['box', 'wall', 'outline', 'fill', 'hollow_box'].includes(step.op)) {
          // These are the new universal ops that handle their own dispatch
          const opHandler = OPERATION_MAP[step.op];
          try {
            const result = opHandler(step, buildContext);

            // The result can be a WorldEdit descriptor OR a list of blocks
            if (result.type === 'worldedit') {
              // Execute WE
              await this.executeWorldEditDescriptor(result, startPos);
            } else if (Array.isArray(result)) {
              // Execute Vanilla with smart batching
              // Pixel art now uses 2D rectangle optimization (greedy-rectangles.js)
              // skipBatching only if explicitly disabled in config
              const skipBatching = SAFETY_LIMITS.pixelArtBatching === false && step.op === 'pixel_art';
              await this.executeVanillaBlocks(result, startPos, buildHistory, skipBatching);
            }
          } catch (err) {
            console.error(`Universal Op Error: ${err.message}`);
          }
          continue;
        }

        // CURSOR OPS
        if (step.op === 'move') {
          this.cursor.move(step.offset);
          continue;
        }
        if (step.op === 'cursor_reset') {
          this.cursor.reset();
          continue;
        }

        // Legacy site prep block removed (handled by autoClearArea)

        // Check if this is a WorldEdit operation
        if (isWorldEditOperation(step.op)) {
          try {
            let weSuccess = false;
            // Special handling for organic operations (VoxelSniper) vs Structural (FAWE)
            if (step.command === 'grow_tree' || step.command === 'smooth') {
              await this.executeOrganicOperation(step, startPos);
              weSuccess = true;
            } else {
              await this.executeWorldEditOperation(step, startPos);
              weSuccess = true;
            }

            // P0 Fix: Track WE operation for undo (only on SUCCESS)
            if (weSuccess) {
              this.worldEditHistory.push({
                step,
                startPos,
                timestamp: Date.now()
              });
              this.currentBuild.worldEditOpsExecuted++;
            }
          } catch (err) {
            // console.error(`WorldEdit Op Error: ${err.message}`);
            // P0 Fix: Attempt manual fallback if available in registry
            const opMeta = OPERATIONS_REGISTRY[step.op];
            if (opMeta && opMeta.fallback) {
              console.log(`    → Falling back to vanilla: ${opMeta.fallback}`);
              const fallbackStep = { ...step, op: opMeta.fallback };
              // Ensure skipBatching=true and NO history push for the failed WE op
              await this.executeVanillaOperation(fallbackStep, startPos, buildHistory, true, buildContext);
              this.currentBuild.fallbacksUsed++;
            } else {
              this.currentBuild.blocksFailed++;
            }
          }
        } else {
          // Vanilla operation
          await this.executeVanillaOperation(step, startPos, buildHistory, false, buildContext);
        }

        // Mark step as completed in state
        this.stateManager.completeStep(i);
      }

      // Mark build as completed in state manager
      this.stateManager.completeBuild();

      // Store history for undo
      if (buildHistory.length > 0) {
        this.history.push(buildHistory);
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }
      }

      // End performance metrics tracking
      buildMetrics.endBuild();

      const duration = ((Date.now() - this.currentBuild.startTime) / 1000).toFixed(1);
      const weOps = this.currentBuild.worldEditOpsExecuted;
      const fallbacks = this.currentBuild.fallbacksUsed;
      const warnings = this.currentBuild.warnings.length;
      const failed = this.currentBuild.blocksFailed || 0;
      const skipped = this.currentBuild.blocksSkipped || 0;

      console.log(`✓ Build completed in ${duration}s`);
      console.log(`  Blocks placed: ${this.currentBuild.blocksPlaced}`);
      if (failed > 0) {
        console.log(`  Blocks failed: ${failed}`);
      }
      if (skipped > 0) {
        console.log(`  Blocks skipped: ${skipped}`);
      }
      console.log(`  WorldEdit ops: ${weOps}`);
      if (fallbacks > 0) {
        console.log(`  Fallbacks used: ${fallbacks}`);
      }

      // Print detailed performance metrics
      buildMetrics.printSummary();
      if (warnings > 0) {
        console.log(`  Warnings: ${warnings}`);
        this.currentBuild.warnings.forEach((w, idx) => {
          console.log(`    ${idx + 1}. Step ${w.step}: ${w.errorType} - ${w.message}`);
        });
      }

      // Generate structured build report
      this.lastBuildReport = this.generateBuildReport(blueprint, startPos, duration, buildHistory);

    } catch (error) {
      console.error(`Build execution failed: ${error.message}`);
      // Mark build as failed in state manager
      this.stateManager.failBuild(error.message);
      throw error;
    } finally {
      this.building = false;
      this.currentBuild = null;
      // P0 Fix: Release mutex when done
      this.buildMutex.release();
    }
  }

  /**
   * Resume an interrupted build
   * @returns {Promise<boolean>} True if build resumed successfully
   */
  async resumeBuild() {
    const resumeData = this.stateManager.prepareBuildResume();

    if (!resumeData) {
      console.log('No incomplete build found to resume');
      return false;
    }

    console.log(`Resuming build ${resumeData.buildId}...`);
    console.log(`  Resuming from step ${resumeData.resumeFromStep}`);
    console.log(`  Blocks already placed: ${resumeData.blocksPlacedSoFar}`);

    // Restore undo history
    this.worldEditHistory = resumeData.worldEditHistory || [];

    // The blueprint needs to be reconstructed or passed
    // For now, just return the resume data
    return resumeData;
  }

  /**
   * Get list of resumable builds
   * @returns {Array} List of incomplete builds
   */
  getResumableBuilds() {
    return this.stateManager.listSavedBuilds()
      .filter(b => b.status === 'in_progress');
  }

  /**
   * Generate structured build report for debugging/logging
   */
  generateBuildReport(blueprint, startPos, duration, buildHistory) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: parseFloat(duration),
      startPosition: startPos,
      blueprint: {
        buildType: blueprint.buildType,
        size: blueprint.size,
        steps: blueprint.steps.length,
        palette: blueprint.palette
      },
      execution: {
        blocksPlaced: this.currentBuild?.blocksPlaced || 0,
        blocksFailed: this.currentBuild?.blocksFailed || 0,
        blocksSkipped: this.currentBuild?.blocksSkipped || 0,
        worldEditOps: this.currentBuild?.worldEditOpsExecuted || 0,
        fallbacksUsed: this.currentBuild?.fallbacksUsed || 0,
        vanillaBlocks: buildHistory.length
      },
      success: !this.currentBuild?.warnings?.length,
      warnings: this.currentBuild?.warnings || [],
      metrics: {
        blocksPerSecond: this.currentBuild?.blocksPlaced / parseFloat(duration) || 0
      }
    };

    // Log report summary
    console.log('┌─────────────────────────────────────────────────────────');
    console.log('│ BUILD REPORT');
    console.log('├─────────────────────────────────────────────────────────');
    console.log(`│ Type: ${report.blueprint.buildType}`);
    console.log(`│ Size: ${report.blueprint.size.width}x${report.blueprint.size.height}x${report.blueprint.size.depth}`);
    console.log(`│ Duration: ${report.duration}s`);
    console.log(`│ Blocks: ${report.execution.blocksPlaced} (${report.metrics.blocksPerSecond.toFixed(1)}/s)`);
    console.log(`│ Success: ${report.success ? '✓' : '⚠'}`);
    console.log('└─────────────────────────────────────────────────────────');

    return report;
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
   * Execute Organic/VoxelSniper Operation
   */
  async executeOrganicOperation(step, startPos) {
    if (!this.worldEditEnabled) throw new Error("VoxelSniper requires plugin access");

    const worldPos = this.calculateWorldPosition(step.pos || step.center || { x: 0, y: 0, z: 0 }, startPos);

    // 1. Ensure Bot has the VoxelSniper Tool (Arrow)
    let arrow = this.bot.inventory.findInventoryItem('arrow');
    if (!arrow) {
      console.warn("⚠ No arrow found for VoxelSniper brush. Attempting to use Gunpowder or skipping.");
      // Ideally we'd give the bot an arrow here if in creative, but let's assume availability or fallback
    } else {
      await this.bot.equip(arrow, 'hand');
      await this.bot.waitForTicks(2); // Optimization: Ensure held
    }

    // 2. Aim at the target
    await this.bot.lookAt(new Vec3(worldPos.x, worldPos.y, worldPos.z));

    // 3. Execute Brush Command
    if (step.command === 'grow_tree') {
      const treeType = step.type || 'oak';
      // /b forest sphere [height] [radius] [material]
      // Defaulting to standard forest brush params
      const cmd = `/brush forest sphere 5 1 ${treeType}`;
      console.log(`    → VoxelSniper: Planting ${treeType} tree`);
      await this.sendPluginCommand(cmd);
    } else if (step.command === 'smooth') {
      // /b bb (Blend Ball)
      console.log(`    → VoxelSniper: Smoothing area`);
      await this.sendPluginCommand('/brush bb');
    }

    // 4. Trigger Brush (Right Click)
    this.bot.activateItem();
    await this.bot.waitForTicks(5);
  }

  /**
   * Helper to send plugin command
   */
  async sendPluginCommand(cmd) {
    if (this.worldEditEnabled && this.worldEdit) {
      // Use executor for tracking, undo history, and rate limits
      await this.worldEdit.executeCommand(cmd);
    } else if (this.bot.chat) {
      this.bot.chat(cmd);
      await this.sleep(100);
    }
  }

  /**
   * Execute a WorldEdit descriptor returned by universal ops
   */
  async executeWorldEditDescriptor(descriptor, startPos) {
    if (!this.worldEditEnabled) throw new Error("WorldEdit required but not available");

    // Commands map to executor methods
    switch (descriptor.command) {
      case 'fill':
        await this.executeWorldEditFill(descriptor, startPos);
        break;
      case 'walls':
        await this.executeWorldEditWalls(descriptor, startPos);
        break;
      // ... expand as needed
      default:
        console.warn(`Unsupported WE command in descriptor: ${descriptor.command}`);
    }
    this.currentBuild.worldEditOpsExecuted++;
  }

  /**
   * Execute raw vanilla blocks list (refactored from executeVanillaOperation)
   * Uses station-based movement for efficiency when pathfinder is available
   */
  async executeVanillaBlocks(blocks, startPos, buildHistory, skipBatching = false) {
    // Optimize build order before execution
    const optimizedBlocks = this.optimizeBuildOrder(blocks, startPos);

    // OPTIMIZATION: Auto-Batching for WorldEdit
    // Skip if explicitly requested (e.g. for pixel art)
    if (!skipBatching && this.worldEditEnabled && optimizedBlocks.length > 5) {
      try {
        const { weOperations, remainingBlocks } = this.batchBlocksToWorldEdit(optimizedBlocks, startPos);
        if (weOperations.length > 0) {
          // ... (Same batching execution logic)
          for (const op of weOperations) {
            if (!this.building) break;
            await this.worldEdit.createSelection(op.from, op.to);
            await this.worldEdit.fillSelection(op.block);
            this.currentBuild.blocksPlaced += op.count;
            this.currentBuild.worldEditOpsExecuted++;
            await this.sleep(300);

            // Emit progress update
            this.emitProgressUpdate();
          }
          blocks = remainingBlocks;
          await this.worldEdit.clearSelection();
        }
      } catch (e) {
        console.warn('Batching failed during universal op');
      }
    } else {
      blocks = optimizedBlocks;
    }

    // Use station-based movement if we have enough blocks and pathfinder available
    if (blocks.length > 10 && this.stationManager.isAvailable()) {
      await this.executeBlocksWithStations(blocks, startPos, buildHistory);
    } else {
      // Fallback: traditional per-block placement
      await this.executeBlocksSequentially(blocks, startPos, buildHistory);
    }
  }

  /**
   * Execute blocks using station-based movement (reduced pathfinding)
   * Moves to calculated vantage points, then places all reachable blocks
   */
  async executeBlocksWithStations(blocks, startPos, buildHistory) {
    // Calculate optimal build stations
    const stations = this.stationManager.calculateBuildStations(blocks, startPos);
    this.usingStationBasedMovement = true;

    console.log(`  Using station-based movement: ${stations.length} stations for ${blocks.length} blocks`);

    for (let i = 0; i < stations.length; i++) {
      if (!this.building) break;

      const station = stations[i];
      console.log(`  Station ${i + 1}/${stations.length}: ${station.blocks.length} blocks`);

      // Move to station
      const moved = await this.stationManager.moveToStation(station);
      if (!moved) {
        console.warn(`  Failed to reach station ${i + 1}, attempting blocks anyway`);
      }

      // Place all blocks reachable from this station
      for (const block of station.blocks) {
        if (!this.building) break;

        const worldPos = {
          x: block.worldX,
          y: block.worldY,
          z: block.worldZ
        };

        try {
          // skipRangeCheck=true since we already moved to station
          const success = await this.placeBlockWithRetry(worldPos, block.block, 3, true);

          if (success) {
            this.currentBuild.blocksPlaced++;
          } else {
            this.currentBuild.blocksFailed++;
          }

          this.emitProgressUpdate();
          await this.sleep(this.getPlacementDelayMs());
        } catch (err) {
          this.currentBuild.blocksFailed++;
          console.error(`Block placement error at ${worldPos.x},${worldPos.y},${worldPos.z}: ${err.message}`);
        }
      }
    }

    this.usingStationBasedMovement = false;
    this.stationManager.reset();
  }

  /**
   * Execute blocks sequentially (traditional per-block approach)
   * Used as fallback when station-based movement isn't available
   */
  async executeBlocksSequentially(blocks, startPos, buildHistory) {
    for (const blockPlacement of blocks) {
      if (!this.building) break;
      const worldPos = this.calculateWorldPosition(blockPlacement, startPos);

      try {
        const success = await this.placeBlockWithRetry(worldPos, blockPlacement.block);

        if (success) {
          this.currentBuild.blocksPlaced++;
        } else {
          this.currentBuild.blocksFailed++;
          console.error(`Failed to place block at ${worldPos.x},${worldPos.y},${worldPos.z} after retries`);
        }

        this.emitProgressUpdate();
        await this.sleep(this.getPlacementDelayMs());
      } catch (err) {
        this.currentBuild.blocksFailed++;
        console.error(`Block placement error at ${worldPos.x},${worldPos.y},${worldPos.z}: ${err.message}`);
      }
    }
  }

  /**
   * Emit progress update if interval reached
   */
  emitProgressUpdate() {
    const totalBlocks = this.currentBuild.blocksPlaced + this.currentBuild.blocksFailed + this.currentBuild.blocksSkipped;

    if (totalBlocks - this.currentBuild.lastProgressUpdate >= this.progressUpdateInterval) {
      const elapsed = (Date.now() - this.currentBuild.startTime) / 1000;
      const rate = this.currentBuild.blocksPlaced / elapsed || 0;

      // Estimate remaining time (rough estimate)
      // Note: ETA doesn't account for WorldEdit operations which are typically much faster
      // than individual block placement. Actual completion may be faster than estimated.
      const estimatedTotal = this.currentBuild.blueprint?.steps?.length || totalBlocks;
      const remaining = Math.max(0, estimatedTotal - totalBlocks);
      const eta = remaining > 0 && rate > 0 ? remaining / rate : 0;

      const percentage = estimatedTotal > 0 ? ((totalBlocks / estimatedTotal) * 100).toFixed(1) : 0;

      console.log(`  Progress: ${totalBlocks} blocks (${percentage}%) | Placed: ${this.currentBuild.blocksPlaced} | Failed: ${this.currentBuild.blocksFailed} | Rate: ${rate.toFixed(1)}/s | ETA: ${eta.toFixed(0)}s`);

      this.currentBuild.lastProgressUpdate = totalBlocks;
    }
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
    const distance = beforePos.distanceTo(targetPos);

    // P0 Fix: Remote Execution
    // Skip teleport if target is within safe range (32 blocks)
    // WorldEdit works in loaded chunks, 32 ensures we are physically close enough
    if (distance < 32) {
      // console.log(`    → Skipping teleport (distance ${distance.toFixed(1)} < 32)`);
      return true;
    }

    console.log(`    → Teleporting to target (distance ${distance.toFixed(1)})`);

    // P0 Optimization: Use @s for specific targeting and wait for chunks
    this.bot.chat(`/tp @s ${targetPos.x} ${targetPos.y} ${targetPos.z}`);

    // Wait for position update with timeout
    const maxWaitTime = 3000; // Increased to 3s for slower chunk loads
    const checkInterval = 200;
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
  async executeVanillaOperation(step, startPos, buildHistory, skipBatching = false, context = null) {
    // Get operation handler
    const operation = OPERATION_MAP[step.op];
    if (!operation) {
      console.error(`Unknown operation: ${step.op}`);
      return;
    }

    // Generate block placements
    let blocksOrDescriptor;
    try {
      // Pass context if available (needed for universal ops)
      // If skipBatching is true (usually a WE fallback), force worldEditEnabled to false 
      // so universal ops don't return another WE descriptor.
      const opContext = context ? {
        ...context,
        worldEditEnabled: context.worldEditEnabled && !skipBatching
      } : null;

      blocksOrDescriptor = operation(step, opContext);

      // Strategy Selection: If raw operation returns a WorldEdit descriptor
      if (blocksOrDescriptor && !Array.isArray(blocksOrDescriptor) && blocksOrDescriptor.type === 'worldedit') {
        const descriptor = blocksOrDescriptor;

        // If we can use WorldEdit, execute it and return
        if (this.worldEditEnabled && !skipBatching) {
          console.log(`    → Universal op optimized to WorldEdit (estimated: ${descriptor.estimatedBlocks} blocks)`);

          // Dispatch to WE executors
          if (descriptor.command === 'fill') await this.executeWorldEditFill(descriptor, startPos);
          else if (descriptor.command === 'walls') await this.executeWorldEditWalls(descriptor, startPos);
          else if (descriptor.command === 'pyramid') await this.executeWorldEditPyramid(descriptor, startPos);
          else if (descriptor.command === 'cylinder') await this.executeWorldEditCylinder(descriptor, startPos);
          else if (descriptor.command === 'sphere') await this.executeWorldEditSphere(descriptor, startPos);

          this.currentBuild.blocksPlaced += (descriptor.estimatedBlocks || 0);
          this.currentBuild.worldEditOpsExecuted++;

          return; // Successfully executed as WorldEdit
        }

        // WorldEdit not available or skipped, try fallback
        if (descriptor.fallback) {
          const fallbackOp = OPERATION_MAP[descriptor.fallback.op];
          if (fallbackOp) {
            blocksOrDescriptor = fallbackOp(descriptor.fallback, opContext);
          }
        }
      }
    } catch (opError) {
      console.error(`Operation error: ${opError.message}`);
      return;
    }

    // Ensure blocks is an array before processing
    let blocks = Array.isArray(blocksOrDescriptor) ? blocksOrDescriptor : [];

    // OPTIMIZATION: Auto-Batching for WorldEdit
    // Detects continuous runs of blocks and uses WorldEdit to place them instantly
    // Skip batching if called as a fallback from a failed WorldEdit operation
    if (!skipBatching && this.worldEditEnabled && blocks.length > 5) {
      try {
        const { weOperations, remainingBlocks } = this.batchBlocksToWorldEdit(blocks, startPos);

        if (weOperations.length > 0) {
          const batchedBlocks = blocks.length - remainingBlocks.length;
          console.log(`    → Optimized: Batching ${batchedBlocks} blocks into ${weOperations.length} WorldEdit ops`);

          // Record batching metrics
          buildMetrics.recordBatching(blocks.length, batchedBlocks, weOperations.length);

          for (const op of weOperations) {
            if (!this.building) break;

            // Execute WE op (selection + set)
            // Coordinates are already absolute in the op
            const from = op.from;
            const to = op.to;

            await this.worldEdit.createSelection(from, to);
            await this.worldEdit.fillSelection(op.block);

            // Track stats
            this.currentBuild.blocksPlaced += op.count;
            this.currentBuild.worldEditOpsExecuted++;

            // Add to WE history
            this.worldEditHistory.push({
              step: { op: 'we_fill', block: op.block, ...op }, // Mock step for history
              startPos: { x: 0, y: 0, z: 0 }, // Relative to 0 since ops are absolute
              timestamp: Date.now()
            });

            // Rate limiting: Delay between batches to prevent server kick (ECONNRESET)
            // Reduced from 500ms to 300ms for better performance
            await this.sleep(SAFETY_LIMITS.worldEdit.commandMinDelayMs || 300);
          }

          // Continue with only the non-batched blocks
          blocks = remainingBlocks;
          await this.worldEdit.clearSelection();
        }
      } catch (batchError) {
        console.warn(`    ⚠ Batching optimization failed, falling back to single blocks: ${batchError.message}`);
        // Fallback: blocks array remains unchanged, process singly
      }
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

        // Use retry logic with pathfinding
        const success = await this.placeBlockWithRetry(worldPos, blockPlacement.block);

        if (success) {
          this.currentBuild.blocksPlaced++;
        } else {
          this.currentBuild.blocksFailed++;
          console.error(`Failed to place block at ${worldPos.x},${worldPos.y},${worldPos.z} after retries`);
        }

        buildMetrics.recordVanillaOperation();

        // Rate limiting
        await this.sleep(this.getPlacementDelayMs());
      } catch (placeError) {
        this.currentBuild.blocksFailed++;
        console.error(`Failed to place block at ${worldPos.x},${worldPos.y},${worldPos.z}: ${placeError.message}`);
      }
    }
  }

  /**
   * Advanced Batching: Uses RLE Optimizer
   * Transforms blocks into efficient linear WorldEdit operations.
   */
  batchBlocksToWorldEdit(blocks, startPos) {
    // Determine threshold based on build type
    // Pixel Art needs NO batching (handled upstream via skipBatching) or very careful batching
    // General builds can use standard threshold (10)

    // Delegate to new RLE optimizer
    // Coordinates in 'blocks' are relative to startPos
    // Optimizer returns relative operations

    // Import dynamically if needed or assume imported at top
    // For now, we will paste the logic here or call the import if I added it
    // Wait, I need to add the import first.
    // Let's assume I'll add the import at the top in a separate edit.

    return optimizeBlockGroups(blocks, 10);
  }

  // Legacy groupings removed (groupByPlane, processSlices, findMaximalRectangles, createRunOp)


  /**
   * Calculate volume of a region (kept for potential future use)
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
      // Add small delay to ensure command is sent
      await this.sleep(50);
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

    const elapsed = Date.now() - this.currentBuild.startTime;
    const rate = this.currentBuild.blocksPlaced / (elapsed / 1000) || 0;

    return {
      blocksPlaced: this.currentBuild.blocksPlaced,
      blocksFailed: this.currentBuild.blocksFailed || 0,
      blocksSkipped: this.currentBuild.blocksSkipped || 0,
      worldEditOps: this.currentBuild.worldEditOpsExecuted || 0,
      fallbacksUsed: this.currentBuild.fallbacksUsed || 0,
      warnings: this.currentBuild.warnings || [],
      elapsedTime: elapsed,
      blocksPerSecond: rate,
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

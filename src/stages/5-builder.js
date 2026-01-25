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

      // Note: Blueprint should already contain native WorldEdit operations
      // No post-processing optimization needed
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

        if (step.op === 'site_prep' || step.op === 'clear_area') {
          console.log('  → Clearing build area...');
          try {
            // Use WorldEdit if available for fast clearing
            if (this.worldEditEnabled) {
              const border = 1; // Clear 1 block wider border
              const width = blueprint.size?.width || 10;
              const height = blueprint.size?.height || 10;
              const depth = blueprint.size?.depth || 10;

              // Clear from slightly below start up to full height
              const from = { x: startPos.x - border, y: startPos.y, z: startPos.z - border };
              const to = { x: startPos.x + width + border, y: startPos.y + height, z: startPos.z + depth + border };

              await this.worldEdit.createSelection(from, to);
              await this.worldEdit.fillSelection('air');
              await this.worldEdit.clearSelection();
              console.log('    ✓ Area cleared (WorldEdit)');
            } else {
              console.log('    ⚠ Site prep skipped (WorldEdit disabled - manual clearing recommended)');
            }
          } catch (e) {
            console.warn(`    ⚠ Site prep failed: ${e.message}`);
          }
          continue; // Skip vanilla execution logic
        }

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

    // OPTIMIZATION: Auto-Batching for WorldEdit
    // Detects continuous runs of blocks and uses WorldEdit to place them instantly
    if (this.worldEditEnabled && blocks.length > 5) {
      try {
        const { weOperations, remainingBlocks } = this.batchBlocksToWorldEdit(blocks, startPos);

        if (weOperations.length > 0) {
          console.log(`    → Optimized: Batching ${blocks.length - remainingBlocks.length} blocks into ${weOperations.length} WorldEdit ops`);

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
            // 200ms was too fast for some servers.
            await this.sleep(SAFETY_LIMITS.worldEdit.commandMinDelayMs || 500);
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
  * Advanced Batching: Decomposes point clouds into Maximal 3D/2D Rectangles
  * Transforms thousands of single blocks into a few WorldEdit region operations.
  */
  batchBlocksToWorldEdit(blocks, startPos) {
    const weOperations = [];
    const usedIndices = new Set();
    const MIN_BATCH_SIZE = 6; // Only batch if rectangle > 6 blocks (avoids tiny regions overhead)

    // 1. Group by Block Type
    const blocksByType = {};
    blocks.forEach((b, i) => {
      if (!blocksByType[b.block]) blocksByType[b.block] = [];
      blocksByType[b.block].push({ ...b, index: i });
    });

    // 2. Process each block type
    for (const [blockType, typeBlocks] of Object.entries(blocksByType)) {
      // We try to find rects in 3 primary planes: XY (vertical-Z), YZ (vertical-X), XZ (horizontal)
      // This covers walls and floors efficiently.

      // Group by Plane Z (XY plane slices)
      const zSlices = this.groupByPlane(typeBlocks, 'z');
      this.processSlices(zSlices, 'xy', blockType, startPos, weOperations, usedIndices, MIN_BATCH_SIZE);

      // Group remaining by Plane X (YZ plane slices) -> e.g. Side walls
      const remainingX = typeBlocks.filter(b => !usedIndices.has(b.index));
      const xSlices = this.groupByPlane(remainingX, 'x');
      this.processSlices(xSlices, 'yz', blockType, startPos, weOperations, usedIndices, MIN_BATCH_SIZE);

      // Group remaining by Plane Y (XZ plane slices) -> e.g. Floors
      const remainingY = typeBlocks.filter(b => !usedIndices.has(b.index));
      const ySlices = this.groupByPlane(remainingY, 'y');
      this.processSlices(ySlices, 'xz', blockType, startPos, weOperations, usedIndices, MIN_BATCH_SIZE);
    }

    const remainingBlocks = blocks.filter((_, i) => !usedIndices.has(i));
    return { weOperations, remainingBlocks };
  }

  groupByPlane(blocks, constantAxis) {
    const groups = {};
    for (const b of blocks) {
      const key = b[constantAxis];
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    }
    return groups;
  }

  processSlices(slices, planeType, blockType, startPos, weOps, usedIndices, minSize) {
    for (const [level, points] of Object.entries(slices)) {
      // Map to 2D grid points
      const gridPoints = points.map(p => {
        let u, v;
        if (planeType === 'xy') { u = p.x; v = p.y; }
        else if (planeType === 'yz') { u = p.z; v = p.y; }
        else { u = p.x; v = p.z; } // xz
        return { u, v, index: p.index };
      });

      // Find maximal rectangles in this 2D slice
      const rects = this.findMaximalRectangles(gridPoints);

      for (const rect of rects) {
        if (rect.count >= minSize) {
          // Convert back to 3D coords
          let from, to;
          const lvl = parseInt(level);

          if (planeType === 'xy') {
            from = { x: rect.u, y: rect.v, z: lvl };
            to = { x: rect.u + rect.w - 1, y: rect.v + rect.h - 1, z: lvl };
          } else if (planeType === 'yz') {
            from = { x: lvl, y: rect.v, z: rect.u };
            to = { x: lvl, y: rect.v + rect.h - 1, z: rect.u + rect.w - 1 };
          } else { // xz
            from = { x: rect.u, y: lvl, z: rect.v };
            to = { x: rect.u + rect.w - 1, y: lvl, z: rect.v + rect.h - 1 };
          }

          // Adjust to absolute coordinates
          weOps.push({
            from: { x: startPos.x + from.x, y: startPos.y + from.y, z: startPos.z + from.z },
            to: { x: startPos.x + to.x, y: startPos.y + to.y, z: startPos.z + to.z },
            block: blockType,
            count: rect.count
          });

          // Mark used
          rect.indices.forEach(idx => usedIndices.add(idx));
        }
      }
    }
  }

  /**
   * Greedy algorithm to decompose a 2D point cloud into rectangles
   */
  findMaximalRectangles(points) {
    // 1. Build a sparse grid map
    const grid = {};
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;

    for (const p of points) {
      if (!grid[p.v]) grid[p.v] = {};
      grid[p.v][p.u] = p.index;
      minU = Math.min(minU, p.u);
      maxU = Math.max(maxU, p.u);
      minV = Math.min(minV, p.v);
      maxV = Math.max(maxV, p.v);
    }

    const rects = [];

    // 2. Iterate through grid to find rects
    // Simple greedy approach: find first point, expand width, expand height, consume.
    // Repeat until no points left.
    // Ideally we want to find largest rects first, but simple iteration works well for pixel art.

    // Sort rows for consistency
    const rows = Object.keys(grid).map(Number).sort((a, b) => a - b);

    for (const v of rows) {
      if (!grid[v]) continue;
      const cols = Object.keys(grid[v]).map(Number).sort((a, b) => a - b);

      for (const u of cols) {
        if (grid[v] && grid[v][u] !== undefined) {
          // Found a start point. Attempt to expand.
          const indices = [grid[v][u]];
          let width = 1;
          let height = 1;

          // Expand Right (Width)
          while (grid[v][u + width] !== undefined) {
            indices.push(grid[v][u + width]);
            width++;
          }

          // Expand Down (Height)
          // Check if the entire row of width 'width' exists below
          let canExpand = true;
          while (canExpand) {
            const checkV = v + height;
            if (!grid[checkV]) { canExpand = false; break; }

            const rowIndices = [];
            for (let w = 0; w < width; w++) {
              if (grid[checkV][u + w] === undefined) {
                canExpand = false;
                break;
              }
              rowIndices.push(grid[checkV][u + w]);
            }

            if (canExpand) {
              indices.push(...rowIndices);
              height++;
            }
          }

          // Save Rect
          rects.push({ u, v, w: width, h: height, count: indices.length, indices });

          // "Consume" points from grid so they aren't used again
          for (let h = 0; h < height; h++) {
            for (let w = 0; w < width; w++) {
              delete grid[v + h][u + w];
            }
          }
        }
      }
    }

    return rects;
  }

  createRunOp(run, blockType, startPos, weOperations, usedIndices) {
    const start = run[0];
    const end = run[run.length - 1];

    // Mark indices as used
    run.forEach(b => usedIndices.add(b.index));

    // Create absolute coord op
    weOperations.push({
      from: { x: startPos.x + start.x, y: startPos.y + start.y, z: startPos.z + start.z },
      to: { x: startPos.x + end.x, y: startPos.y + end.y, z: startPos.z + end.z },
      block: blockType,
      count: run.length
    });
  }

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

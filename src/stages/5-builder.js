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
import { WorldEditExecutor } from '../worldedit/executor.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { isWorldEditOperation } from '../config/operations-registry.js';

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
  roof_hip: roofHip
};

/**
 * Builder class - Executes blueprints in Minecraft
 */
export class Builder {
  constructor(bot) {
    this.bot = bot;
    this.history = [];  // For undo functionality
    this.building = false;
    this.currentBuild = null;
    this.maxHistory = 10;
    this.usesChatCommands = typeof this.bot?.setBlock !== 'function' &&
      typeof this.bot?.chat === 'function';
    this.worldEdit = new WorldEditExecutor(bot);
    this.worldEditEnabled = false;

    if (this.bot && typeof this.bot.on === 'function') {
      this.bot.on('end', () => {
        if (this.building) {
          console.warn('Build interrupted: bot disconnected');
          this.building = false;
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
   */
  async executeBlueprint(blueprint, startPos) {
    if (this.building) {
      throw new Error('Build already in progress');
    }

    this.building = true;
    this.currentBuild = {
      blueprint,
      startPos,
      startTime: Date.now(),
      blocksPlaced: 0
    };

    const buildHistory = [];

    try {
      console.log('Starting build execution...');
      console.log(`  Location: ${startPos.x}, ${startPos.y}, ${startPos.z}`);
      console.log(`  Total steps: ${blueprint.steps.length}`);
      console.log(`  WorldEdit: ${this.worldEditEnabled ? 'ENABLED' : 'DISABLED'}`);

      // Reset WorldEdit executor for new build
      this.worldEdit.reset();

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
          } catch (weError) {
            console.warn(`⚠ WorldEdit operation failed: ${weError.message}`);

            // Fallback to vanilla if enabled
            if (SAFETY_LIMITS.worldEdit.fallbackOnError && step.fallback) {
              console.log('  → Falling back to vanilla operation...');
              await this.executeVanillaOperation(step.fallback, startPos, buildHistory);
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
      console.log(`✓ Build completed in ${duration}s (${this.currentBuild.blocksPlaced} blocks)`);

    } catch (error) {
      console.error(`Build execution failed: ${error.message}`);
      throw error;
    } finally {
      this.building = false;
      this.currentBuild = null;
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
   * Execute WorldEdit pyramid command
   */
  async executeWorldEditPyramid(descriptor, startPos) {
    const worldBase = {
      x: startPos.x + descriptor.base.x,
      y: startPos.y + descriptor.base.y,
      z: startPos.z + descriptor.base.z
    };

    // Teleport bot to base position for pyramid command
    this.bot.chat(`/tp @s ${worldBase.x} ${worldBase.y} ${worldBase.z}`);
    await this.sleep(300);

    await this.worldEdit.createPyramid(descriptor.block, descriptor.height, descriptor.hollow);
  }

  /**
   * Execute WorldEdit cylinder command
   */
  async executeWorldEditCylinder(descriptor, startPos) {
    const worldBase = {
      x: startPos.x + descriptor.base.x,
      y: startPos.y + descriptor.base.y,
      z: startPos.z + descriptor.base.z
    };

    // Teleport bot to base position
    this.bot.chat(`/tp @s ${worldBase.x} ${worldBase.y} ${worldBase.z}`);
    await this.sleep(300);

    await this.worldEdit.createCylinder(
      descriptor.block,
      descriptor.radius,
      descriptor.height,
      descriptor.hollow
    );
  }

  /**
   * Execute WorldEdit sphere command
   */
  async executeWorldEditSphere(descriptor, startPos) {
    const worldCenter = {
      x: startPos.x + descriptor.center.x,
      y: startPos.y + descriptor.center.y,
      z: startPos.z + descriptor.center.z
    };

    // Teleport bot to center position
    this.bot.chat(`/tp @s ${worldCenter.x} ${worldCenter.y} ${worldCenter.z}`);
    await this.sleep(300);

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
   */
  async undo() {
    if (this.history.length === 0) {
      throw new Error('No builds to undo');
    }

    if (this.building) {
      throw new Error('Cannot undo while building');
    }

    const lastBuild = this.history.pop();
    console.log(`Undoing last build (${lastBuild.length} blocks)...`);

    for (const { pos, previousBlock } of lastBuild.reverse()) {
      try {
        await this.placeBlock(pos, previousBlock);
        await this.sleep(this.getPlacementDelayMs());
      } catch (error) {
        console.error(`Failed to restore block at ${pos.x},${pos.y},${pos.z}`);
      }
    }

    console.log('✓ Undo completed');
  }

  /**
   * Cancel the current build
   */
  cancel() {
    if (!this.building) {
      throw new Error('No build in progress');
    }
    
    console.log('Cancelling build...');
    this.building = false;
  }

  /**
   * Get build progress
   */
  getProgress() {
    if (!this.currentBuild) {
      return null;
    }

    return {
      blocksPlaced: this.currentBuild.blocksPlaced,
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

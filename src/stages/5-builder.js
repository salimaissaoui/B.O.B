import { fill } from '../operations/fill.js';
import { hollowBox } from '../operations/hollow-box.js';
import { set } from '../operations/set.js';
import { line } from '../operations/line.js';
import { windowStrip } from '../operations/window-strip.js';
import { roofGable } from '../operations/roof-gable.js';
import { roofFlat } from '../operations/roof-flat.js';
import { SAFETY_LIMITS } from '../config/limits.js';

const OPERATION_MAP = {
  fill,
  hollow_box: hollowBox,
  set,
  line,
  window_strip: windowStrip,
  roof_gable: roofGable,
  roof_flat: roofFlat
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

      for (let i = 0; i < blueprint.steps.length; i++) {
        if (!this.building) {
          console.log('Build cancelled by user');
          break;
        }

        const step = blueprint.steps[i];
        console.log(`  Step ${i + 1}/${blueprint.steps.length}: ${step.op}`);

        // Get operation handler
        const operation = OPERATION_MAP[step.op];
        if (!operation) {
          console.error(`Unknown operation: ${step.op}`);
          continue;
        }

        // Generate block placements
        let blocks;
        try {
          blocks = operation(step);
        } catch (opError) {
          console.error(`Operation error: ${opError.message}`);
          continue;
        }

        // Execute block placements with rate limiting
        for (const blockPlacement of blocks) {
          if (!this.building) break;

          const worldPos = {
            x: startPos.x + blockPlacement.x,
            y: startPos.y + blockPlacement.y,
            z: startPos.z + blockPlacement.z
          };

          try {
            // Get current block at position for undo
            const currentBlock = this.bot.blockAt(this.bot.vec3(worldPos.x, worldPos.y, worldPos.z));
            
            buildHistory.push({
              pos: worldPos,
              previousBlock: currentBlock ? currentBlock.name : 'air'
            });

            // Place the block
            await this.placeBlock(worldPos, blockPlacement.block);
            this.currentBuild.blocksPlaced++;

            // Rate limiting
            await this.sleep(1000 / SAFETY_LIMITS.buildRateLimit);
          } catch (placeError) {
            console.error(`Failed to place block at ${worldPos.x},${worldPos.y},${worldPos.z}: ${placeError.message}`);
          }
        }
      }

      // Store history for undo
      if (buildHistory.length > 0) {
        this.history.push(buildHistory);
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
   * Place a single block in the world
   */
  async placeBlock(pos, blockType) {
    // In a real implementation, this would use Mineflayer's API
    // For now, this is a placeholder that shows the structure
    
    // Example (would need proper Mineflayer integration):
    // const block = this.bot.blockAt(this.bot.vec3(pos.x, pos.y - 1, pos.z));
    // await this.bot.placeBlock(block, this.bot.vec3(0, 1, 0));
    
    // For demonstration, we'll just log
    // console.log(`  Placing ${blockType} at ${pos.x}, ${pos.y}, ${pos.z}`);
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
        await this.sleep(1000 / SAFETY_LIMITS.buildRateLimit);
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
}

import { Vec3 } from 'vec3';
import { safeBlockAt } from '../validation/world-validator.js';
import { SAFETY_LIMITS } from '../config/limits.js';

/**
 * VanillaExecutor
 *
 * Handles vanilla block placement logic:
 * - /setblock placement
 * - Retry with exponential backoff
 * - Block verification
 * - Station-based and sequential execution modes
 */
export class VanillaExecutor {
  constructor(bot, inventoryManager, pathfindingHelper, stationManager) {
    this.bot = bot;
    this.inventoryManager = inventoryManager;
    this.pathfindingHelper = pathfindingHelper;
    this.stationManager = stationManager;
    this.usingStationBasedMovement = false;
    this.usesChatCommands = typeof bot?.setBlock !== 'function' &&
      typeof bot?.chat === 'function';
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
      this.bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} ${blockType}`);
      await this.sleep(50);
      return;
    }

    throw new Error('No supported block placement method available');
  }

  /**
   * Place a block with retry logic and exponential backoff
   */
  async placeBlockWithRetry(pos, blockType, maxRetries = 3, skipRangeCheck = false) {
    const delays = [50, 100, 200];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let inRange = true;
        if (!skipRangeCheck && this.stationManager) {
          inRange = this.stationManager.isBlockInReach(pos);
          if (!inRange && !this.usingStationBasedMovement && this.pathfindingHelper?.isAvailable()) {
            inRange = await this.pathfindingHelper.ensureInRange(pos);
          }
          if (!inRange) {
            console.warn(`  Bot cannot reach position ${pos.x}, ${pos.y}, ${pos.z}`);
          }
        }

        await this.placeBlock(pos, blockType);

        if (this.inventoryManager.checkCreativeMode() && inRange) {
          return true;
        }

        await this.sleep(50);
        const placedBlock = safeBlockAt(this.bot, new Vec3(pos.x, pos.y, pos.z));

        if (placedBlock === null) {
          return true; // Assume success for unloaded chunks
        }

        const expectedBlockName = blockType.split('[')[0];
        const actualBlockName = placedBlock.name || 'air';

        if (actualBlockName === expectedBlockName || actualBlockName === blockType) {
          return true;
        }

        if (attempt < maxRetries - 1) {
          const delay = delays[attempt] || 200;
          console.warn(`  Block placement not verified, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
        }
      } catch (error) {
        if (attempt < maxRetries - 1) {
          const delay = delays[attempt] || 200;
          console.warn(`  Block placement failed: ${error.message}, retrying in ${delay}ms...`);
          await this.sleep(delay);
        } else {
          throw error;
        }
      }
    }

    return false;
  }

  /**
   * Execute blocks using station-based movement
   */
  async executeBlocksWithStations(blocks, startPos, buildContext) {
    const stations = this.stationManager.calculateBuildStations(blocks, startPos);
    this.usingStationBasedMovement = true;

    console.log(`  Using station-based movement: ${stations.length} stations for ${blocks.length} blocks`);

    for (let i = 0; i < stations.length; i++) {
      if (!buildContext.isBuilding()) break;

      const station = stations[i];
      console.log(`  Station ${i + 1}/${stations.length}: ${station.blocks.length} blocks`);

      await this.stationManager.moveToStation(station);

      for (const block of station.blocks) {
        if (!buildContext.isBuilding()) break;

        const worldPos = { x: block.worldX, y: block.worldY, z: block.worldZ };

        try {
          const success = await this.placeBlockWithRetry(worldPos, block.block, 3, true);
          buildContext.recordPlacement(success);
          buildContext.emitProgress();
          await this.sleep(this.getPlacementDelayMs());
        } catch (err) {
          buildContext.recordFailure();
          console.error(`Block placement error at ${worldPos.x},${worldPos.y},${worldPos.z}: ${err.message}`);
        }
      }
    }

    this.usingStationBasedMovement = false;
    this.stationManager.reset();
  }

  /**
   * Execute blocks sequentially (fallback)
   */
  async executeBlocksSequentially(blocks, startPos, buildContext, calculateWorldPosition) {
    for (const blockPlacement of blocks) {
      if (!buildContext.isBuilding()) break;
      const worldPos = calculateWorldPosition(blockPlacement, startPos);

      try {
        const success = await this.placeBlockWithRetry(worldPos, blockPlacement.block);
        buildContext.recordPlacement(success);
        buildContext.emitProgress();
        await this.sleep(this.getPlacementDelayMs());
      } catch (err) {
        buildContext.recordFailure();
        console.error(`Block placement error at ${worldPos.x},${worldPos.y},${worldPos.z}: ${err.message}`);
      }
    }
  }

  getPlacementDelayMs() {
    const baseDelay = 1000 / SAFETY_LIMITS.buildRateLimit;
    if (this.usesChatCommands) {
      return Math.max(baseDelay, SAFETY_LIMITS.chatCommandMinDelayMs);
    }
    return baseDelay;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

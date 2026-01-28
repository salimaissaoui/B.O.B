import { Vec3 } from 'vec3';
import { WORLD_BOUNDARIES, safeBlockAt } from '../validation/world-validator.js';

/**
 * PositioningManager
 *
 * Handles all positioning-related logic:
 * - World position calculation with Y-axis clamping
 * - Teleport and verify
 * - Pre-build obstruction scouting
 * - Site clearing
 */
export class PositioningManager {
  constructor(bot, worldEdit) {
    this.bot = bot;
    this.worldEdit = worldEdit;
  }

  /**
   * Calculate world position from relative position
   * Includes Y-axis clamping to world boundaries (-64 to 320)
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
   * Teleport bot and verify position
   */
  async teleportAndVerify(targetPos, tolerance = 2) {
    if (!this.bot || !this.bot.entity) {
      throw new Error('Bot entity not available for teleport');
    }

    const beforePos = this.bot.entity.position.clone();
    const distance = beforePos.distanceTo(targetPos);

    if (distance < 32) {
      return true;
    }

    console.log(`    → Teleporting to target (distance ${distance.toFixed(1)})`);
    this.bot.chat(`/tp @s ${targetPos.x} ${targetPos.y} ${targetPos.z}`);

    const maxWaitTime = 3000;
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

    const currentPos = this.bot.entity.position;
    const moved = beforePos.distanceTo(currentPos) > 0.5;

    if (!moved) {
      console.warn(`    ⚠ Teleport may have failed (no position change detected)`);
      return false;
    }

    console.warn(`    ⚠ Teleport position mismatch (may still work)`);
    return true;
  }

  /**
   * Pre-Build Obstruction Scout
   */
  async preBuildScout(startPos, size) {
    const obstructions = [];
    const maxScan = 50;

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
            // Ignore unloaded chunks
          }
        }
      }
    }

    return {
      hasObstructions: obstructions.length > 0,
      count: obstructions.length,
      obstructions: obstructions.slice(0, 10)
    };
  }

  /**
   * Auto-clear build site
   */
  async autoClearArea(blueprint, startPos, worldEditEnabled) {
    console.log('  → Auto-clearing build site...');

    const w = blueprint.size?.width || 10;
    const h = blueprint.size?.height || 10;
    const d = blueprint.size?.depth || 10;
    const padding = 1;
    const depthClear = blueprint.buildType === 'pixel_art' ? 2 : d;

    if (worldEditEnabled && this.worldEdit) {
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
   * Clear obstructions using WorldEdit
   */
  async clearObstructions(startPos, size, worldEditEnabled) {
    if (worldEditEnabled && this.worldEdit) {
      const from = { x: startPos.x - 1, y: startPos.y, z: startPos.z - 1 };
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

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * WorldEdit Dispatch - Extracted from src/stages/5-builder.js
 *
 * Translates blueprint descriptors (relative coordinates) into
 * absolute WorldEdit commands via the WorldEditExecutor.
 *
 * Includes teleport-and-verify logic for position-dependent WE
 * commands (pyramid, cylinder, sphere).
 */

import { buildMetrics } from '../utils/performance-metrics.js';

// Teleportation Constants - CLAUDE.md Contract
// Canonical location for these constants (used by teleportAndVerify).
// Re-exported from 5-builder.js for backward compatibility.
export const TELEPORT_SKIP_DISTANCE = 32;  // Skip teleport if within this many blocks
export const TELEPORT_VERIFY_TIMEOUT_MS = 3000;  // Max wait for teleport position verification

import { DEBUG } from '../utils/debug.js';

/**
 * Converts relative blueprint coordinates to absolute world coordinates.
 * @param {Object} startPos - Build origin {x,y,z}
 * @param {Object} offset   - Relative offset {x,y,z}
 * @returns {{ x: number, y: number, z: number }}
 */
function toWorld(startPos, offset) {
  return {
    x: startPos.x + offset.x,
    y: startPos.y + offset.y,
    z: startPos.z + offset.z
  };
}

/**
 * WorldEditDispatcher - Handles WE command dispatch and teleport verification.
 *
 * Constructed with a context object that provides access to builder state.
 * This avoids tight coupling: the dispatcher doesn't import/know the Builder class.
 */
export class WorldEditDispatcher {
  /**
   * @param {Object} ctx
   * @param {Function} ctx.getWorldEdit      - Returns current WorldEditExecutor instance
   * @param {Function} ctx.getBot            - Returns current Mineflayer bot instance
   * @param {Function} ctx.sleep             - Async sleep function
   * @param {Function} ctx.getCursor         - Returns current BuildCursor (or null)
   * @param {Function} ctx.getCurrentBuild   - Returns current build state (or null)
   * @param {Function} ctx.getWorldEditHistory - Returns current WE history array
   */
  constructor(ctx) {
    this._getWorldEdit = ctx.getWorldEdit;
    this._getBot = ctx.getBot;
    this.sleep = ctx.sleep;
    this.getCursor = ctx.getCursor;
    this.getCurrentBuild = ctx.getCurrentBuild;
    this._getWorldEditHistory = ctx.getWorldEditHistory;
  }

  /** @returns {Object} Current WorldEditExecutor */
  get worldEdit() { return this._getWorldEdit(); }

  /** @returns {Object} Current bot instance */
  get bot() { return this._getBot(); }

  /** @returns {Array} Current worldEditHistory array */
  get worldEditHistory() { return this._getWorldEditHistory(); }

  /**
   * Execute a WorldEdit descriptor by dispatching to the appropriate method.
   */
  async executeDescriptor(descriptor, startPos) {
    if (!descriptor || descriptor.type !== 'worldedit') return;

    // Calculate expected bounds for cursor reconciliation
    let expectedBounds = null;
    if (descriptor.from && descriptor.to) {
      expectedBounds = {
        from: toWorld(startPos, descriptor.from),
        to: toWorld(startPos, descriptor.to)
      };
    }

    let operationResult = null;

    try {
      switch (descriptor.command) {
        case 'fill':
          operationResult = await this.executeFill(descriptor, startPos);
          break;
        case 'walls':
          operationResult = await this.executeWalls(descriptor, startPos);
          break;
        case 'pyramid':
          operationResult = await this.executePyramid(descriptor, startPos);
          break;
        case 'cylinder':
          operationResult = await this.executeCylinder(descriptor, startPos);
          break;
        case 'sphere':
          operationResult = await this.executeSphere(descriptor, startPos);
          break;
        case 'replace':
          operationResult = await this.executeReplace(descriptor, startPos);
          break;
        default:
          throw new Error(`Unknown WorldEdit command: ${descriptor.command}`);
      }

      // Cursor reconciliation after WorldEdit operation
      const cursor = this.getCursor();
      if (cursor && expectedBounds) {
        const expectedEndPos = expectedBounds.to;
        const reconcileResult = cursor.reconcile(expectedEndPos, {
          success: true,
          actualBounds: operationResult?.actualBounds || expectedBounds,
          blocksChanged: operationResult?.blocksChanged
        });

        if (reconcileResult.corrected) {
          if (DEBUG) {
            console.log(`    [Cursor] Drift corrected: ${reconcileResult.drift.magnitude} blocks`);
          }
        }
        if (reconcileResult.warning) {
          console.warn(`    [Cursor] ${reconcileResult.warning}`);
        }
      }

      // Track SUCCESSFUL execution in history
      this.worldEditHistory.push({
        step: descriptor.step || descriptor,
        startPos,
        timestamp: Date.now(),
        type: 'worldedit'
      });
      const currentBuild = this.getCurrentBuild();
      if (currentBuild) {
        currentBuild.worldEditOpsExecuted++;
      }
      buildMetrics.recordWorldEditOp(descriptor.step?.op || `we_${descriptor.command}`);

    } catch (err) {
      console.error(`WorldEdit Execution Error (${descriptor.command}): ${err.message}`);
      throw err;
    }
  }

  /**
   * Execute WorldEdit fill command (Adaptive Safe Fill)
   */
  async executeFill(descriptor, startPos) {
    const worldFrom = toWorld(startPos, descriptor.from);
    const worldTo = toWorld(startPos, descriptor.to);
    await this.worldEdit.performSafeFill(worldFrom, worldTo, descriptor.block);
  }

  /**
   * Execute WorldEdit walls command (Adaptive Safe Walls)
   */
  async executeWalls(descriptor, startPos) {
    const worldFrom = toWorld(startPos, descriptor.from);
    const worldTo = toWorld(startPos, descriptor.to);
    await this.worldEdit.performSafeWalls(worldFrom, worldTo, descriptor.block);
  }

  /**
   * Execute WorldEdit pyramid command
   */
  async executePyramid(descriptor, startPos) {
    const worldBase = toWorld(startPos, descriptor.base);
    const teleported = await this.teleportAndVerify(worldBase);
    if (!teleported) {
      throw new Error(`Failed to teleport to pyramid base position (${worldBase.x}, ${worldBase.y}, ${worldBase.z})`);
    }
    await this.worldEdit.createPyramid(descriptor.block, descriptor.height, descriptor.hollow);
  }

  /**
   * Execute WorldEdit cylinder command
   */
  async executeCylinder(descriptor, startPos) {
    const worldBase = toWorld(startPos, descriptor.base);
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
   */
  async executeSphere(descriptor, startPos) {
    const worldCenter = toWorld(startPos, descriptor.center);
    const teleported = await this.teleportAndVerify(worldCenter);
    if (!teleported) {
      throw new Error(`Failed to teleport to sphere center position (${worldCenter.x}, ${worldCenter.y}, ${worldCenter.z})`);
    }
    await this.worldEdit.createSphere(descriptor.block, descriptor.radius, descriptor.hollow);
  }

  /**
   * Execute WorldEdit replace command
   */
  async executeReplace(descriptor, startPos) {
    const worldFrom = toWorld(startPos, descriptor.from);
    const worldTo = toWorld(startPos, descriptor.to);
    await this.worldEdit.createSelection(worldFrom, worldTo);
    await this.worldEdit.replaceBlocks(descriptor.fromBlock, descriptor.toBlock);
    await this.worldEdit.clearSelection();
  }

  /**
   * Teleport bot and verify position.
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

    if (distance < TELEPORT_SKIP_DISTANCE) {
      return true;
    }

    console.log(`    → Teleporting to target (distance ${distance.toFixed(1)})`);

    this.bot.chat(`/tp @s ${targetPos.x} ${targetPos.y} ${targetPos.z}`);

    const maxWaitTime = TELEPORT_VERIFY_TIMEOUT_MS;
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
      console.warn(`    ⚠ Expected: ${targetPos.x}, ${targetPos.y}, ${targetPos.z}`);
      console.warn(`    ⚠ Current: ${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)}`);
      return false;
    }

    console.warn(`    ⚠ Teleport position mismatch (may still work)`);
    return true;
  }
}

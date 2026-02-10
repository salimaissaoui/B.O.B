/**
 * Scaffolding Helper
 *
 * Enables autonomous scaffolding for survival mode builds.
 * The bot builds temporary scaffolding to reach high places,
 * then removes it after construction.
 *
 * Inspired by APT's emergent scaffolding behavior.
 */

import { Vec3 } from 'vec3';
import { SAFETY_LIMITS } from '../config/limits.js';
import { sleep } from './sleep.js';

export class ScaffoldingHelper {
    constructor(bot, builder) {
        this.bot = bot;
        this.builder = builder;
        this.scaffoldPositions = [];
        this.enabled = SAFETY_LIMITS.scaffolding?.enabled !== false;
        this.maxHeight = SAFETY_LIMITS.scaffolding?.maxHeight || 64;
        this.scaffoldBlock = SAFETY_LIMITS.scaffolding?.scaffoldBlock || 'scaffolding';
        this.autoCleanup = SAFETY_LIMITS.scaffolding?.autoCleanup !== false;
    }

    /**
     * Check if the bot can reach a target position
     *
     * @param {Object} targetPos - Target position {x, y, z}
     * @returns {boolean} True if reachable without scaffolding
     */
    canReach(targetPos) {
        if (!this.bot?.entity) return false;

        const botPos = this.bot.entity.position;
        const dy = targetPos.y - botPos.y;

        // Can reach 4 blocks up, 3 blocks down, 4 blocks horizontal
        if (dy > 4 || dy < -3) return false;

        const dx = Math.abs(targetPos.x - botPos.x);
        const dz = Math.abs(targetPos.z - botPos.z);
        const horizontal = Math.sqrt(dx * dx + dz * dz);

        return horizontal <= 4;
    }

    /**
     * Build scaffolding to reach a target height
     *
     * @param {Object} targetPos - Target position to reach
     * @returns {Promise<boolean>} True if scaffolding was built successfully
     */
    async buildScaffoldingTo(targetPos) {
        if (!this.enabled) return false;
        if (!this.bot?.entity) return false;

        const botPos = this.bot.entity.position.floored();
        const targetY = Math.floor(targetPos.y);
        const heightNeeded = targetY - botPos.y;

        if (heightNeeded <= 4) {
            // Can already reach, no scaffolding needed
            return true;
        }

        if (heightNeeded > this.maxHeight) {
            console.warn(`⚠ Scaffolding height ${heightNeeded} exceeds max ${this.maxHeight}`);
            return false;
        }

        console.log(`  → Building scaffolding: ${heightNeeded} blocks up`);

        // Build a pillar of scaffolding blocks
        for (let y = 1; y <= heightNeeded - 3; y++) {
            const scaffoldPos = {
                x: botPos.x,
                y: botPos.y + y,
                z: botPos.z
            };

            try {
                await this.placeScaffold(scaffoldPos);
                this.scaffoldPositions.push(scaffoldPos);

                // Move up with the scaffolding
                if (y % 2 === 0) {
                    await this.climbScaffold();
                }
            } catch (error) {
                console.warn(`⚠ Failed to place scaffold at Y=${scaffoldPos.y}: ${error.message}`);
                return false;
            }
        }

        console.log(`  ✓ Scaffolding complete: ${this.scaffoldPositions.length} blocks`);
        return true;
    }

    /**
     * Place a single scaffold block
     */
    async placeScaffold(pos) {
        if (this.builder?.worldEditEnabled) {
            // Use WorldEdit for single block
            await this.builder.worldEdit.executeCommand(
                `//pos1 ${pos.x},${pos.y},${pos.z}`
            );
            await this.builder.worldEdit.executeCommand(
                `//pos2 ${pos.x},${pos.y},${pos.z}`
            );
            await this.builder.worldEdit.executeCommand(
                `//set ${this.scaffoldBlock}`
            );
        } else {
            // Vanilla placement
            this.bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} minecraft:${this.scaffoldBlock}`);
            await sleep(100);
        }
    }

    /**
     * Climb up the scaffolding
     */
    async climbScaffold() {
        // Simple jump to climb scaffolding
        if (this.bot?.setControlState) {
            this.bot.setControlState('jump', true);
            await sleep(300);
            this.bot.setControlState('jump', false);
            await sleep(200);
        }
    }

    /**
     * Remove all scaffolding after build completes
     *
     * @returns {Promise<number>} Number of blocks removed
     */
    async cleanup() {
        if (!this.autoCleanup) {
            console.log('  Scaffolding cleanup disabled, leaving in place');
            return 0;
        }

        if (this.scaffoldPositions.length === 0) {
            return 0;
        }

        console.log(`  → Cleaning up ${this.scaffoldPositions.length} scaffolding blocks...`);

        let removed = 0;

        // Remove from top to bottom to avoid physics issues
        const sortedPositions = [...this.scaffoldPositions].sort((a, b) => b.y - a.y);

        for (const pos of sortedPositions) {
            try {
                await this.removeScaffold(pos);
                removed++;
            } catch (error) {
                console.warn(`⚠ Failed to remove scaffold at Y=${pos.y}`);
            }
        }

        this.scaffoldPositions = [];
        console.log(`  ✓ Removed ${removed} scaffolding blocks`);
        return removed;
    }

    /**
     * Remove a single scaffold block
     */
    async removeScaffold(pos) {
        if (this.builder?.worldEditEnabled) {
            await this.builder.worldEdit.executeCommand(
                `//pos1 ${pos.x},${pos.y},${pos.z}`
            );
            await this.builder.worldEdit.executeCommand(
                `//pos2 ${pos.x},${pos.y},${pos.z}`
            );
            await this.builder.worldEdit.executeCommand('//set air');
        } else {
            this.bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} minecraft:air`);
            await sleep(50);
        }
    }

    /**
     * Get scaffolding statistics
     */
    getStats() {
        return {
            enabled: this.enabled,
            currentBlocks: this.scaffoldPositions.length,
            scaffoldBlock: this.scaffoldBlock,
            maxHeight: this.maxHeight,
            autoCleanup: this.autoCleanup
        };
    }

    /**
     * Reset scaffolding state (without cleanup)
     */
    reset() {
        this.scaffoldPositions = [];
    }

}

export default ScaffoldingHelper;

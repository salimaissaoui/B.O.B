/**
 * Function Exporter
 *
 * Exports B.O.B blueprints to Minecraft .mcfunction format.
 * These files can be run as datapack functions in-game.
 *
 * Usage:
 *   const exporter = new FunctionExporter();
 *   await exporter.export(blueprint, 'my_build');
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { SAFETY_LIMITS } from '../config/limits.js';

export class FunctionExporter {
    constructor(options = {}) {
        this.options = options;
        this.outputPath = options.outputPath || SAFETY_LIMITS.export?.outputPath || './exports';
    }

    /**
     * Export a blueprint to .mcfunction format
     *
     * @param {Object} blueprint - B.O.B blueprint object
     * @param {string} filename - Output filename (without extension)
     * @returns {Promise<string>} Path to the exported file
     */
    async export(blueprint, filename) {
        // Ensure output directory exists
        if (!existsSync(this.outputPath)) {
            mkdirSync(this.outputPath, { recursive: true });
        }

        // Flatten blueprint steps into block positions
        const blocks = this.flattenBlueprint(blueprint);

        if (blocks.length === 0) {
            throw new Error('Blueprint has no blocks to export');
        }

        // Generate function commands
        const commands = this.generateCommands(blocks, blueprint);

        // Determine output path
        const outputFile = filename.endsWith('.mcfunction') ? filename : `${filename}.mcfunction`;
        const fullPath = join(this.outputPath, outputFile);

        // Write to file
        const header = this.generateHeader(blueprint, blocks.length);
        writeFileSync(fullPath, header + commands.join('\n'));

        console.log(`✓ Exported function to: ${fullPath}`);
        console.log(`  Commands: ${commands.length}, Blocks: ${blocks.length}`);

        return fullPath;
    }

    /**
     * Generate header comment for the function file
     */
    generateHeader(blueprint, blockCount) {
        return `# B.O.B Generated Build Function
# Build Type: ${blueprint.buildType || 'unknown'}
# Theme: ${blueprint.theme || 'default'}
# Description: ${blueprint.description || 'No description'}
# Block Count: ${blockCount}
# Generated: ${new Date().toISOString()}
#
# Usage: /function bob:${blueprint.buildType || 'build'}
# Note: Execute at the desired build location
#

`;
    }

    /**
     * Flatten blueprint operations into individual block positions
     * (Reuses logic from schematic-exporter)
     */
    flattenBlueprint(blueprint) {
        const blocks = [];
        const palette = blueprint.palette || {};

        const resolveBlock = (blockName) => {
            if (!blockName) return 'air';
            if (blockName.startsWith('$')) {
                return palette[blockName.substring(1)] || 'stone';
            }
            return blockName;
        };

        for (const step of blueprint.steps || []) {
            const stepBlocks = this.processStep(step, resolveBlock);
            blocks.push(...stepBlocks);
        }

        // Remove duplicates (later blocks override earlier ones at same position)
        const blockMap = new Map();
        for (const block of blocks) {
            const key = `${block.x},${block.y},${block.z}`;
            blockMap.set(key, block);
        }

        return Array.from(blockMap.values());
    }

    /**
     * Process a single blueprint step into blocks
     */
    processStep(step, resolveBlock) {
        const blocks = [];

        switch (step.op) {
            case 'box':
            case 'fill':
            case 'we_fill': {
                const block = resolveBlock(step.block);
                const from = step.from || { x: 0, y: 0, z: 0 };
                const to = step.to || {
                    x: from.x + (step.size?.x || 1) - 1,
                    y: from.y + (step.size?.y || 1) - 1,
                    z: from.z + (step.size?.z || 1) - 1
                };

                for (let x = from.x; x <= to.x; x++) {
                    for (let y = from.y; y <= to.y; y++) {
                        for (let z = from.z; z <= to.z; z++) {
                            blocks.push({ x, y, z, block });
                        }
                    }
                }
                break;
            }

            case 'wall':
            case 'hollow_box':
            case 'we_walls': {
                const block = resolveBlock(step.block);
                const from = step.from || { x: 0, y: 0, z: 0 };
                const to = step.to || {
                    x: from.x + (step.size?.x || 1) - 1,
                    y: from.y + (step.size?.y || 1) - 1,
                    z: from.z + (step.size?.z || 1) - 1
                };

                for (let x = from.x; x <= to.x; x++) {
                    for (let y = from.y; y <= to.y; y++) {
                        for (let z = from.z; z <= to.z; z++) {
                            const isEdge = x === from.x || x === to.x ||
                                z === from.z || z === to.z;
                            if (isEdge) {
                                blocks.push({ x, y, z, block });
                            }
                        }
                    }
                }
                break;
            }

            case 'set': {
                const block = resolveBlock(step.block);
                const pos = step.pos || { x: 0, y: 0, z: 0 };
                blocks.push({ x: pos.x, y: pos.y, z: pos.z, block });
                break;
            }

            case 'line': {
                const block = resolveBlock(step.block);
                const from = step.from || { x: 0, y: 0, z: 0 };
                const to = step.to || from;

                const dx = Math.abs(to.x - from.x);
                const dy = Math.abs(to.y - from.y);
                const dz = Math.abs(to.z - from.z);
                const steps = Math.max(dx, dy, dz);

                for (let i = 0; i <= steps; i++) {
                    const t = steps === 0 ? 0 : i / steps;
                    blocks.push({
                        x: Math.round(from.x + t * (to.x - from.x)),
                        y: Math.round(from.y + t * (to.y - from.y)),
                        z: Math.round(from.z + t * (to.z - from.z)),
                        block
                    });
                }
                break;
            }

            // Skip non-block operations
            case 'move':
            case 'cursor_reset':
            case 'site_prep':
            case 'pixel_art':
                // pixel_art handled separately for efficiency
                break;
        }

        return blocks;
    }

    /**
     * Generate /setblock commands from block positions
     */
    generateCommands(blocks, blueprint) {
        const commands = [];

        // Sort blocks by Y (bottom-up) for proper placement order
        const sortedBlocks = [...blocks].sort((a, b) => a.y - b.y);

        // Check if we can use /fill for optimization
        if (this.options.optimizeFills !== false) {
            return this.generateOptimizedCommands(sortedBlocks);
        }

        // Generate individual setblock commands
        for (const block of sortedBlocks) {
            // Use relative coordinates (~)
            commands.push(`setblock ~${block.x} ~${block.y} ~${block.z} minecraft:${block.block}`);
        }

        return commands;
    }

    /**
     * Generate optimized commands using /fill where possible
     */
    generateOptimizedCommands(blocks) {
        const commands = [];

        // Group blocks by type for potential /fill optimization
        const blocksByType = new Map();
        for (const block of blocks) {
            if (!blocksByType.has(block.block)) {
                blocksByType.set(block.block, []);
            }
            blocksByType.get(block.block).push(block);
        }

        for (const [blockType, blockList] of blocksByType) {
            // Find rectangular regions for /fill commands
            const regions = this.findFillRegions(blockList);

            for (const region of regions) {
                if (region.count > 1) {
                    // Use /fill for regions with multiple blocks
                    commands.push(
                        `fill ~${region.from.x} ~${region.from.y} ~${region.from.z} ` +
                        `~${region.to.x} ~${region.to.y} ~${region.to.z} minecraft:${blockType}`
                    );
                } else {
                    // Single block, use setblock
                    commands.push(
                        `setblock ~${region.from.x} ~${region.from.y} ~${region.from.z} minecraft:${blockType}`
                    );
                }
            }
        }

        return commands;
    }

    /**
     * Find rectangular regions for /fill optimization
     * Simple greedy algorithm - could be improved with more sophisticated packing
     */
    findFillRegions(blocks) {
        const regions = [];
        const used = new Set();

        for (const block of blocks) {
            const key = `${block.x},${block.y},${block.z}`;
            if (used.has(key)) continue;

            // Try to expand into a rectangle
            let maxX = block.x, maxY = block.y, maxZ = block.z;

            // Expand in X
            while (blocks.some(b => b.x === maxX + 1 && b.y === block.y && b.z === block.z)) {
                maxX++;
            }

            // Expand in Z (checking full X range)
            outerZ: while (true) {
                for (let x = block.x; x <= maxX; x++) {
                    if (!blocks.some(b => b.x === x && b.y === block.y && b.z === maxZ + 1)) {
                        break outerZ;
                    }
                }
                maxZ++;
            }

            // Expand in Y (checking full XZ plane)
            outerY: while (true) {
                for (let x = block.x; x <= maxX; x++) {
                    for (let z = block.z; z <= maxZ; z++) {
                        if (!blocks.some(b => b.x === x && b.y === maxY + 1 && b.z === z)) {
                            break outerY;
                        }
                    }
                }
                maxY++;
            }

            // Mark all blocks in this region as used
            let count = 0;
            for (let x = block.x; x <= maxX; x++) {
                for (let y = block.y; y <= maxY; y++) {
                    for (let z = block.z; z <= maxZ; z++) {
                        used.add(`${x},${y},${z}`);
                        count++;
                    }
                }
            }

            regions.push({
                from: { x: block.x, y: block.y, z: block.z },
                to: { x: maxX, y: maxY, z: maxZ },
                count
            });
        }

        return regions;
    }
}

export default FunctionExporter;

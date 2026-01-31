/**
 * Schematic Exporter
 *
 * Exports B.O.B blueprints to WorldEdit .schem format (Sponge Schematic v2).
 * This allows builds to be saved, shared, and imported into other worlds.
 *
 * Inspired by BuilderGPT's schematic generation approach.
 *
 * Usage:
 *   const exporter = new SchematicExporter();
 *   await exporter.export(blueprint, './exports/my_build.schem');
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { SAFETY_LIMITS } from '../config/limits.js';

// Block ID mapping for common blocks (Minecraft 1.20.1)
// This is a subset - full implementation would use minecraft-data
const BLOCK_IDS = {
    'air': 0,
    'stone': 1,
    'stone_bricks': 2,
    'cobblestone': 3,
    'oak_planks': 4,
    'spruce_planks': 5,
    'birch_planks': 6,
    'oak_log': 7,
    'spruce_log': 8,
    'glass': 9,
    'glass_pane': 10,
    'oak_door': 11,
    'spruce_door': 12,
    'oak_stairs': 13,
    'spruce_stairs': 14,
    'cobblestone_stairs': 15,
    'stone_brick_stairs': 16,
    'oak_fence': 17,
    'spruce_fence': 18,
    'torch': 19,
    'lantern': 20,
    'white_concrete': 21,
    'black_concrete': 22,
    'red_concrete': 23,
    'blue_concrete': 24,
    'green_concrete': 25,
    'yellow_concrete': 26,
    'white_wool': 27,
    'black_wool': 28,
    'red_wool': 29,
    'blue_wool': 30,
    'green_wool': 31,
    'yellow_wool': 32,
    'dirt': 33,
    'grass_block': 34,
    'sand': 35,
    'gravel': 36,
    'oak_leaves': 37,
    'spruce_leaves': 38,
    'water': 39,
    'lava': 40
};

export class SchematicExporter {
    constructor(options = {}) {
        this.options = options;
        this.outputPath = options.outputPath || SAFETY_LIMITS.export?.outputPath || './exports';
    }

    /**
     * Export a blueprint to .schem format
     *
     * @param {Object} blueprint - B.O.B blueprint object
     * @param {string} filename - Output filename (without path)
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

        // Calculate bounding box
        const bounds = this.calculateBounds(blocks);

        // Build schematic data structure
        const schematicData = this.buildSchematicData(blocks, bounds, blueprint);

        // Determine output path
        const outputFile = filename.endsWith('.schem') ? filename : `${filename}.schem`;
        const fullPath = join(this.outputPath, outputFile);

        // Write to file (simplified format - real .schem uses NBT compression)
        // For full implementation, use prismarine-nbt library
        writeFileSync(fullPath, JSON.stringify(schematicData, null, 2));

        console.log(`✓ Exported schematic to: ${fullPath}`);
        console.log(`  Blocks: ${blocks.length}, Size: ${bounds.width}x${bounds.height}x${bounds.depth}`);

        return fullPath;
    }

    /**
     * Flatten blueprint operations into individual block positions
     *
     * @param {Object} blueprint - Blueprint with steps array
     * @returns {Array} Array of {x, y, z, block} objects
     */
    flattenBlueprint(blueprint) {
        const blocks = [];
        const palette = blueprint.palette || {};

        // Process each step
        for (const step of blueprint.steps || []) {
            const stepBlocks = this.processStep(step, palette);
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
     *
     * @param {Object} step - Blueprint step
     * @param {Object} palette - Block palette for variable resolution
     * @returns {Array} Array of block positions
     */
    processStep(step, palette) {
        const blocks = [];
        const resolveBlock = (blockName) => {
            if (!blockName) return 'air';
            if (blockName.startsWith('$')) {
                return palette[blockName.substring(1)] || 'stone';
            }
            return blockName;
        };

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
                            // Only place on edges
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

                // Bresenham-style line
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

            case 'pixel_art': {
                const grid = step.grid || [];
                const legend = step.legend || {};
                const base = step.base || { x: 0, y: 0, z: 0 };
                const facing = step.facing || 'south';

                for (let row = 0; row < grid.length; row++) {
                    for (let col = 0; col < grid[row].length; col++) {
                        const char = grid[row][col];
                        const blockName = legend[char];
                        if (!blockName || blockName === 'air') continue;

                        // Calculate position based on facing
                        let x, y, z;
                        const pixelY = base.y + (grid.length - 1 - row); // Top row is highest

                        switch (facing) {
                            case 'north':
                                x = base.x + col;
                                y = pixelY;
                                z = base.z;
                                break;
                            case 'south':
                                x = base.x + col;
                                y = pixelY;
                                z = base.z;
                                break;
                            case 'east':
                                x = base.x;
                                y = pixelY;
                                z = base.z + col;
                                break;
                            case 'west':
                                x = base.x;
                                y = pixelY;
                                z = base.z + col;
                                break;
                            default:
                                x = base.x + col;
                                y = pixelY;
                                z = base.z;
                        }

                        blocks.push({ x, y, z, block: blockName });
                    }
                }
                break;
            }

            // Skip non-block operations
            case 'move':
            case 'cursor_reset':
            case 'site_prep':
                break;

            default:
                // For unknown operations, log a warning but don't fail
                console.warn(`⚠ Schematic export: Unknown operation '${step.op}', skipping`);
        }

        return blocks;
    }

    /**
     * Calculate bounding box of all blocks
     */
    calculateBounds(blocks) {
        if (blocks.length === 0) {
            return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, width: 1, height: 1, depth: 1 };
        }

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const block of blocks) {
            minX = Math.min(minX, block.x);
            minY = Math.min(minY, block.y);
            minZ = Math.min(minZ, block.z);
            maxX = Math.max(maxX, block.x);
            maxY = Math.max(maxY, block.y);
            maxZ = Math.max(maxZ, block.z);
        }

        return {
            minX, minY, minZ,
            maxX, maxY, maxZ,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            depth: maxZ - minZ + 1
        };
    }

    /**
     * Build schematic data structure
     *
     * Note: This is a simplified JSON format for demonstration.
     * Full .schem format requires NBT encoding with prismarine-nbt.
     */
    buildSchematicData(blocks, bounds, blueprint) {
        // Normalize positions to start at 0,0,0
        const normalizedBlocks = blocks.map(b => ({
            x: b.x - bounds.minX,
            y: b.y - bounds.minY,
            z: b.z - bounds.minZ,
            block: b.block
        }));

        // Build palette (unique blocks)
        const paletteSet = new Set(blocks.map(b => b.block));
        const palette = {};
        let paletteId = 0;
        for (const blockName of paletteSet) {
            palette[blockName] = paletteId++;
        }

        // Build block data array (3D -> 1D index)
        const blockData = new Array(bounds.width * bounds.height * bounds.depth).fill(0);
        for (const block of normalizedBlocks) {
            const index = block.x + block.z * bounds.width + block.y * bounds.width * bounds.depth;
            blockData[index] = palette[block.block] || 0;
        }

        return {
            // Sponge Schematic v2 structure (simplified)
            Version: 2,
            DataVersion: 3465, // Minecraft 1.20.1
            Width: bounds.width,
            Height: bounds.height,
            Length: bounds.depth,
            Palette: palette,
            BlockData: blockData,
            // B.O.B metadata
            Metadata: {
                BOBVersion: '0.1.0',
                BuildType: blueprint.buildType,
                Theme: blueprint.theme,
                Description: blueprint.description,
                ExportedAt: new Date().toISOString()
            }
        };
    }
}

export default SchematicExporter;

/**
 * Schematic Loader Service
 * Loads Minecraft schematic files (.schem, .schematic) and converts to B.O.B blueprints
 */

import { promises as fs } from 'fs';
import { Schematic } from 'prismarine-schematic';
import path from 'path';

/**
 * Check if a path looks like a schematic file
 * @param {string} input - User input string
 * @returns {boolean}
 */
export function isSchematicPath(input) {
    const lower = input.toLowerCase().trim();
    return (
        lower.endsWith('.schem') ||
        lower.endsWith('.schematic') ||
        lower.endsWith('.nbt') ||
        lower.includes('.schem') ||
        lower.includes('.schematic')
    );
}

/**
 * Load a schematic file from disk
 * @param {string} filePath - Path to schematic file
 * @returns {Promise<Schematic>}
 */
export async function loadSchematicFile(filePath) {
    const resolvedPath = path.resolve(filePath);
    console.log(`📦 Loading schematic: ${resolvedPath}`);

    const buffer = await fs.readFile(resolvedPath);
    const schematic = await Schematic.read(buffer);

    console.log(`  Size: ${schematic.size.x}x${schematic.size.y}x${schematic.size.z}`);
    console.log(`  Palette: ${schematic.palette.length} unique blocks`);

    return schematic;
}

/**
 * Convert a prismarine-schematic to B.O.B blueprint format
 * Optimizes for WorldEdit when available
 * 
 * @param {Schematic} schematic - Loaded schematic
 * @param {Object} options - Conversion options
 * @param {boolean} options.useWorldEdit - Whether WorldEdit is available
 * @returns {Object} B.O.B blueprint
 */
export function schematicToBlueprint(schematic, options = {}) {
    const { useWorldEdit = true } = options;

    const size = {
        width: schematic.size.x,
        height: schematic.size.y,
        depth: schematic.size.z
    };

    // Extract unique block names from palette
    const palette = [];
    const blockMap = new Map(); // stateId -> block name

    // Build block placement steps
    const steps = [{ op: 'site_prep' }];

    // Group blocks by type for WorldEdit optimization
    const blockGroups = new Map(); // blockName -> positions[]

    schematic.forEach((block, pos) => {
        if (!block || block.name === 'air') return;

        const blockName = block.name.replace('minecraft:', '');

        if (!palette.includes(blockName)) {
            palette.push(blockName);
        }

        if (!blockGroups.has(blockName)) {
            blockGroups.set(blockName, []);
        }
        blockGroups.get(blockName).push({ x: pos.x, y: pos.y, z: pos.z });
    });

    // Generate optimized steps
    if (useWorldEdit && size.width * size.height * size.depth > 100) {
        // Use WorldEdit fill operations for large schematics
        // Group adjacent blocks for efficient fills
        for (const [blockName, positions] of blockGroups) {
            // Find bounding regions for this block type
            const regions = findContiguousRegions(positions);

            for (const region of regions) {
                if (region.volume >= 8) {
                    // Use WorldEdit fill for larger regions
                    steps.push({
                        op: 'we_fill',
                        block: blockName,
                        from: region.min,
                        to: region.max
                    });
                } else {
                    // Use individual set operations for small regions
                    for (const pos of region.positions) {
                        steps.push({
                            op: 'set',
                            block: blockName,
                            pos
                        });
                    }
                }
            }
        }
    } else {
        // Vanilla mode - place block by block
        for (const [blockName, positions] of blockGroups) {
            for (const pos of positions) {
                steps.push({
                    op: 'set',
                    block: blockName,
                    pos
                });
            }
        }
    }

    console.log(`  Generated ${steps.length} operations (${palette.length} block types)`);

    return {
        buildType: 'schematic',
        theme: 'imported',
        description: 'Imported from schematic file',
        size,
        palette,
        steps,
        generationMethod: 'schematic_import'
    };
}

/**
 * Find contiguous rectangular regions in a set of positions
 * Simple greedy algorithm - not optimal but fast
 */
function findContiguousRegions(positions) {
    if (positions.length === 0) return [];
    if (positions.length === 1) {
        return [{
            min: positions[0],
            max: positions[0],
            volume: 1,
            positions
        }];
    }

    // Sort by Y, then Z, then X for bottom-up processing
    const sorted = [...positions].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        if (a.z !== b.z) return a.z - b.z;
        return a.x - b.x;
    });

    // Find bounding box
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const pos of sorted) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        minZ = Math.min(minZ, pos.z);
        maxX = Math.max(maxX, pos.x);
        maxY = Math.max(maxY, pos.y);
        maxZ = Math.max(maxZ, pos.z);
    }

    // Check if all positions fill the bounding box (solid region)
    const expectedVolume = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);

    if (sorted.length === expectedVolume) {
        // Solid rectangular region - perfect for WorldEdit
        return [{
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ },
            volume: expectedVolume,
            positions: sorted
        }];
    }

    // Not solid - return individual positions grouped together
    // Future optimization: subdivide into smaller solid regions
    return [{
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        volume: sorted.length,
        positions: sorted
    }];
}

/**
 * Load schematic and convert to blueprint in one step
 * @param {string} filePath - Path to schematic file
 * @param {Object} options - Options (useWorldEdit, etc.)
 * @returns {Promise<Object>} B.O.B blueprint
 */
export async function loadAndConvert(filePath, options = {}) {
    const schematic = await loadSchematicFile(filePath);
    return schematicToBlueprint(schematic, options);
}

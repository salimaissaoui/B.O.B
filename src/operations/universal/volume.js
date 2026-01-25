/**
 * Universal Volume Operation
 * Smartly chooses between WorldEdit and Vanilla placement
 */
import { calculateBounds } from '../../utils/coordinates.js';

export function volume(step, context) {
    const { from, to, size, center, radius, height, block, hollow = false, type = 'box' } = step;
    const { startPos, cursor, worldEditEnabled, resolveBlock } = context;

    // Resolve block name (handle variables like $primary)
    const resolvedBlock = resolveBlock(block);

    // Calculate absolute coordinates based on input type
    let absFrom, absTo;

    if (center && radius) {
        // Sphere/Cylinder logic
        const c = cursor.resolve(center);
        // Delegate to shape-specific logic later or handle here
        // For now, let's focus on box/cuboid volumes
    }

    // Handle Box/Cuboid
    // Support "size" relative to cursor, or explicit "from/to"
    if (size) {
        absFrom = cursor.pos; // Current cursor position
        absTo = {
            x: absFrom.x + (size.x > 0 ? size.x - 1 : size.x + 1),
            y: absFrom.y + (size.y > 0 ? size.y - 1 : size.y + 1),
            z: absFrom.z + (size.z > 0 ? size.z - 1 : size.z + 1)
        };
    } else if (from && to) {
        absFrom = cursor.resolve(from);
        absTo = cursor.resolve(to);
    } else {
        throw new Error('Volume operation requires size or from/to');
    }

    // Calculate stats
    const vol = calculateVolume(absFrom, absTo);
    const isLarge = vol > 100;

    // Strategy Selection
    if (worldEditEnabled && isLarge) {
        // Return WorldEdit descriptor
        let command = 'fill';
        if (hollow) command = 'walls';

        return {
            type: 'worldedit',
            command: command, // Maps to 'fill' or 'walls' internally in WorldEditExecutor
            from: toRel(absFrom, startPos), // WorldEditExecutor expects relative to startPos for now? 
            // Actually existing WE executor adds startPos. Let's provide relative to startPos.
            to: toRel(absTo, startPos),
            block: resolvedBlock,
            estimatedBlocks: vol
        };
    } else {
        // Return Vanilla blocks
        return generateVanillaBlocks(absFrom, absTo, resolvedBlock, hollow, startPos);
    }
}

// Helper: Convert absolute world coord back to relative-to-startPos for existing WE executor
function toRel(abs, start) {
    return {
        x: abs.x - start.x,
        y: abs.y - start.y,
        z: abs.z - start.z
    };
}

function calculateVolume(from, to) {
    return (Math.abs(to.x - from.x) + 1) *
        (Math.abs(to.y - from.y) + 1) *
        (Math.abs(to.z - from.z) + 1);
}

function generateVanillaBlocks(from, to, block, hollow, startPos) {
    const blocks = [];
    const { minX, maxX, minY, maxY, minZ, maxZ } = calculateBounds(from, to);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
                // Hollow check
                if (hollow) {
                    const isEdge = x === minX || x === maxX ||
                        y === minY || y === maxY ||
                        z === minZ || z === maxZ;
                    if (!isEdge) continue;
                }

                // Return relative coordinates (expected by Builder vanilla path)
                blocks.push({
                    x: x - startPos.x,
                    y: y - startPos.y,
                    z: z - startPos.z,
                    block
                });
            }
        }
    }
    return blocks;
}

/**
 * Universal Volume Operation
 * Smartly chooses between WorldEdit and Vanilla placement based on volume size
 *
 * Features:
 * - Cursor-relative positioning
 * - Automatic WorldEdit optimization for large volumes
 * - Graceful fallback to vanilla for small volumes
 * - Support for size or from/to coordinates
 * - Hollow mode support
 */

import { calculateBounds, calculateVolume } from '../../utils/coordinates.js';

/**
 * Convert absolute coordinates to relative (to startPos)
 */
function toRelative(abs, start) {
    if (!abs || !start) {
        throw new Error('Invalid coordinates for toRelative conversion');
    }
    return {
        x: abs.x - start.x,
        y: abs.y - start.y,
        z: abs.z - start.z
    };
}

/**
 * Generate vanilla block placements for a volume
 */
function generateVanillaBlocks(from, to, block, hollow, startPos) {
    const blocks = [];
    const { minX, maxX, minY, maxY, minZ, maxZ } = calculateBounds(from, to);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
                // Hollow check - only place blocks on edges
                if (hollow) {
                    const isEdge = x === minX || x === maxX ||
                        y === minY || y === maxY ||
                        z === minZ || z === maxZ;
                    if (!isEdge) continue;
                }

                // Return coordinates relative to startPos
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

/**
 * Universal volume operation
 * @param {Object} step - Operation parameters
 * @param {Object} step.from - From position {x, y, z} (optional)
 * @param {Object} step.to - To position {x, y, z} (optional)
 * @param {Object} step.size - Size {x, y, z} (optional)
 * @param {Object} step.center - Center position (for sphere/cylinder)
 * @param {number} step.radius - Radius (for sphere/cylinder)
 * @param {number} step.height - Height (for cylinder)
 * @param {string} step.block - Block type (may be variable like "$primary")
 * @param {boolean} step.hollow - Whether to make it hollow (default: false)
 * @param {string} step.type - Type of volume: 'box', 'sphere', 'cylinder' (default: 'box')
 * @param {Object} context - Build context
 * @param {Object} context.startPos - Build start position
 * @param {Object} context.cursor - Cursor instance
 * @param {boolean} context.worldEditEnabled - Whether WorldEdit is available
 * @param {Function} context.resolveBlock - Function to resolve block variables
 * @returns {Object|Array} - WorldEdit descriptor or vanilla blocks array
 */
export function volume(step, context) {
    // Validate context
    if (!context) {
        throw new Error('Volume operation requires build context');
    }

    const { startPos, cursor, worldEditEnabled, resolveBlock } = context;

    if (!startPos) {
        throw new Error('Volume operation requires startPos in context');
    }

    if (!cursor) {
        throw new Error('Volume operation requires cursor in context');
    }

    if (!resolveBlock) {
        throw new Error('Volume operation requires resolveBlock function in context');
    }

    // Extract and validate parameters
    const { from, to, size, center, radius, height, block, hollow = false, type = 'box' } = step;

    if (!block) {
        throw new Error('Volume operation requires block parameter');
    }

    // Resolve block name (handle variables like $primary)
    const resolvedBlock = resolveBlock(block);

    if (!resolvedBlock || resolvedBlock === 'air') {
        throw new Error(`Invalid block resolved: ${block} -> ${resolvedBlock}`);
    }

    // Calculate absolute coordinates based on input type
    let absFrom, absTo;

    // Handle different coordinate systems
    if (center && radius !== undefined) {
        // Sphere/Cylinder logic
        const c = cursor.resolve(center);

        if (type === 'sphere') {
            // Sphere: center ± radius
            absFrom = { x: c.x - radius, y: c.y - radius, z: c.z - radius };
            absTo = { x: c.x + radius, y: c.y + radius, z: c.z + radius };
        } else if (type === 'cylinder' && height !== undefined) {
            // Cylinder: radius in X-Z, height in Y
            absFrom = { x: c.x - radius, y: c.y, z: c.z - radius };
            absTo = { x: c.x + radius, y: c.y + height - 1, z: c.z + radius };
        } else {
            throw new Error(`Invalid volume type or missing parameters: ${type}`);
        }
    } else if (size) {
        // Size-based (relative to cursor)
        if (!size.x || !size.y || !size.z) {
            throw new Error('Size must have x, y, and z properties');
        }

        absFrom = cursor.pos; // Current cursor position
        absTo = {
            x: absFrom.x + (size.x > 0 ? size.x - 1 : size.x + 1),
            y: absFrom.y + (size.y > 0 ? size.y - 1 : size.y + 1),
            z: absFrom.z + (size.z > 0 ? size.z - 1 : size.z + 1)
        };
    } else if (from && to) {
        // Explicit from/to (cursor-relative)
        absFrom = cursor.resolve(from);
        absTo = cursor.resolve(to);
    } else {
        throw new Error('Volume operation requires either size, from/to, or center/radius');
    }

    // Validate coordinates
    if (isNaN(absFrom.x) || isNaN(absFrom.y) || isNaN(absFrom.z) ||
        isNaN(absTo.x) || isNaN(absTo.y) || isNaN(absTo.z)) {
        throw new Error(`Invalid coordinates: from=${JSON.stringify(absFrom)}, to=${JSON.stringify(absTo)}`);
    }

    // Calculate volume statistics
    const vol = calculateVolume(absFrom, absTo);
    const isLarge = vol >= 20;

    // Strategy Selection: WorldEdit for large volumes, vanilla for small
    if (worldEditEnabled && isLarge) {
        // Return WorldEdit descriptor
        let command = hollow ? 'walls' : 'fill';

        return {
            type: 'worldedit',
            command: command,
            from: toRelative(absFrom, startPos),
            to: toRelative(absTo, startPos),
            block: resolvedBlock,
            estimatedBlocks: hollow ? Math.ceil(vol * 0.4) : vol, // Hollow ~40% of volume
            fallback: {
                op: hollow ? 'wall' : 'box',
                from: toRelative(absFrom, startPos),
                to: toRelative(absTo, startPos),
                block: resolvedBlock
            }
        };
    } else {
        // Return vanilla blocks array
        return generateVanillaBlocks(absFrom, absTo, resolvedBlock, hollow, startPos);
    }
}

/**
 * Default export for compatibility
 */
export default volume;

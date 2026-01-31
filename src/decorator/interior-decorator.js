/**
 * Interior Decorator Module
 *
 * Automatically furnishes enclosed rooms based on detected room types.
 * Analyzes the structure of a blueprint and adds appropriate furniture,
 * lighting, and decorations.
 *
 * Room Types Detected:
 * - Bedroom: Beds, nightstands, chests
 * - Kitchen: Furnaces, crafting tables, barrels
 * - Living room: Chairs, tables, bookshelves
 * - Library: Bookshelves, lecterns, candles
 * - Storage: Chests, barrels, item frames
 */

import { SAFETY_LIMITS } from '../config/limits.js';

/**
 * Furniture templates for different room types
 */
const FURNITURE_TEMPLATES = {
    bedroom: {
        essential: [
            { block: 'red_bed', minSpace: { x: 2, y: 1, z: 1 }, placement: 'floor' },
            { block: 'chest', minSpace: { x: 1, y: 1, z: 1 }, placement: 'floor' }
        ],
        optional: [
            { block: 'oak_trapdoor', minSpace: { x: 1, y: 1, z: 1 }, placement: 'wall', purpose: 'nightstand' },
            { block: 'lantern', minSpace: { x: 1, y: 1, z: 1 }, placement: 'ceiling' },
            { block: 'flower_pot', minSpace: { x: 1, y: 1, z: 1 }, placement: 'surface' }
        ]
    },
    kitchen: {
        essential: [
            { block: 'furnace', minSpace: { x: 1, y: 1, z: 1 }, placement: 'floor' },
            { block: 'crafting_table', minSpace: { x: 1, y: 1, z: 1 }, placement: 'floor' }
        ],
        optional: [
            { block: 'barrel', minSpace: { x: 1, y: 1, z: 1 }, placement: 'floor' },
            { block: 'smoker', minSpace: { x: 1, y: 1, z: 1 }, placement: 'floor' },
            { block: 'cauldron', minSpace: { x: 1, y: 1, z: 1 }, placement: 'floor' }
        ]
    },
    living_room: {
        essential: [
            { block: 'oak_stairs', minSpace: { x: 1, y: 1, z: 1 }, placement: 'floor', purpose: 'chair' }
        ],
        optional: [
            { block: 'bookshelf', minSpace: { x: 1, y: 2, z: 1 }, placement: 'wall' },
            { block: 'flower_pot', minSpace: { x: 1, y: 1, z: 1 }, placement: 'surface' },
            { block: 'painting', minSpace: { x: 1, y: 1, z: 0 }, placement: 'wall' },
            { block: 'lantern', minSpace: { x: 1, y: 1, z: 1 }, placement: 'ceiling' }
        ]
    },
    library: {
        essential: [
            { block: 'bookshelf', minSpace: { x: 1, y: 2, z: 1 }, placement: 'wall', count: 4 }
        ],
        optional: [
            { block: 'lectern', minSpace: { x: 1, y: 1, z: 1 }, placement: 'floor' },
            { block: 'candle', minSpace: { x: 1, y: 1, z: 1 }, placement: 'surface' },
            { block: 'oak_sign', minSpace: { x: 1, y: 1, z: 0 }, placement: 'wall' }
        ]
    },
    storage: {
        essential: [
            { block: 'chest', minSpace: { x: 1, y: 1, z: 1 }, placement: 'floor', count: 2 }
        ],
        optional: [
            { block: 'barrel', minSpace: { x: 1, y: 1, z: 1 }, placement: 'floor' },
            { block: 'item_frame', minSpace: { x: 1, y: 1, z: 0 }, placement: 'wall' }
        ]
    },
    generic: {
        essential: [],
        optional: [
            { block: 'torch', minSpace: { x: 1, y: 1, z: 0 }, placement: 'wall' },
            { block: 'lantern', minSpace: { x: 1, y: 1, z: 1 }, placement: 'ceiling' }
        ]
    }
};

export class InteriorDecorator {
    constructor(options = {}) {
        this.options = options;
        this.enabled = options.enabled !== false;
    }

    /**
     * Analyze a blueprint and add interior decorations
     *
     * @param {Object} blueprint - Blueprint to decorate
     * @returns {Object} Blueprint with decoration steps added
     */
    decorate(blueprint) {
        if (!this.enabled) return blueprint;

        // 1. Detect enclosed rooms in the blueprint
        const rooms = this.detectRooms(blueprint);

        if (rooms.length === 0) {
            console.log('  No enclosed rooms detected for decoration');
            return blueprint;
        }

        console.log(`  → Decorating ${rooms.length} rooms`);

        // 2. For each room, add appropriate furniture
        const decorationSteps = [];
        for (const room of rooms) {
            const furniture = this.getFurnitureForRoom(room);
            const steps = this.placeFurniture(room, furniture);
            decorationSteps.push(...steps);
        }

        // 3. Append decoration steps to blueprint
        return {
            ...blueprint,
            steps: [...blueprint.steps, ...decorationSteps],
            interiorDecorated: true
        };
    }

    /**
     * Detect enclosed rooms in a blueprint
     * A room is defined by walls on all sides with a floor and ceiling
     */
    detectRooms(blueprint) {
        const rooms = [];
        const wallOps = this.findWallOperations(blueprint.steps);

        for (const wallOp of wallOps) {
            // Check if this wall operation creates an enclosed space
            if (wallOp.op === 'hollow_box' || wallOp.op === 'we_walls') {
                const room = this.analyzeRoom(wallOp);
                if (room) {
                    rooms.push(room);
                }
            }
        }

        // Also check for floor operations that might indicate rooms
        const floorOps = blueprint.steps.filter(s =>
            s.op === 'fill' &&
            s.to && s.from &&
            (s.to.y - s.from.y) === 0 // Single layer = floor
        );

        // Attempt to match floors with walls above them
        for (const floor of floorOps) {
            const existingRoom = rooms.find(r =>
                this.overlaps(r.bounds, floor.from, floor.to)
            );

            if (!existingRoom) {
                // Create a room from floor bounds
                const height = this.estimateRoomHeight(blueprint, floor);
                if (height >= 2) {
                    rooms.push({
                        type: 'generic',
                        bounds: {
                            from: { x: floor.from.x, y: floor.from.y + 1, z: floor.from.z },
                            to: { x: floor.to.x, y: floor.from.y + height, z: floor.to.z }
                        },
                        size: {
                            width: floor.to.x - floor.from.x + 1,
                            height: height,
                            depth: floor.to.z - floor.from.z + 1
                        }
                    });
                }
            }
        }

        // Classify room types based on size and context
        for (const room of rooms) {
            room.type = this.classifyRoom(room, blueprint);
        }

        return rooms;
    }

    /**
     * Find wall-creating operations
     */
    findWallOperations(steps) {
        return steps.filter(s =>
            s.op === 'wall' ||
            s.op === 'hollow_box' ||
            s.op === 'we_walls'
        );
    }

    /**
     * Analyze a wall operation to extract room info
     */
    analyzeRoom(wallOp) {
        if (!wallOp.from || !wallOp.to) return null;

        const from = wallOp.from;
        const to = wallOp.to;

        // Interior space (excluding walls)
        const interiorFrom = {
            x: from.x + 1,
            y: from.y,
            z: from.z + 1
        };
        const interiorTo = {
            x: to.x - 1,
            y: to.y,
            z: to.z - 1
        };

        // Check if there's actual interior space
        const width = interiorTo.x - interiorFrom.x + 1;
        const height = to.y - from.y + 1;
        const depth = interiorTo.z - interiorFrom.z + 1;

        if (width < 2 || height < 2 || depth < 2) {
            return null; // Too small for a room
        }

        return {
            type: 'generic',
            bounds: { from: interiorFrom, to: interiorTo },
            size: { width, height, depth }
        };
    }

    /**
     * Classify room type based on size and position
     */
    classifyRoom(room, blueprint) {
        const { width, height, depth } = room.size;
        const area = width * depth;

        // Check in order from most specific to least specific

        // Very small rooms are storage
        if (area <= 9) {
            return 'storage';
        }

        // Large tall rooms are libraries
        if (area >= 25 && height >= 4) {
            return 'library';
        }

        // Narrow rooms are kitchens
        if (area <= 16 && (width <= 4 || depth <= 4)) {
            return 'kitchen';
        }

        // Small rooms are bedrooms
        if (area <= 12 && width >= 2 && depth >= 2) {
            return 'bedroom';
        }

        return 'living_room'; // Default
    }

    /**
     * Estimate room height by looking for ceiling operations
     */
    estimateRoomHeight(blueprint, floor) {
        // Look for fill operations above the floor
        for (let h = 2; h <= 10; h++) {
            const ceilingY = floor.from.y + h;
            const hasCeiling = blueprint.steps.some(s =>
                s.op === 'fill' &&
                s.from?.y === ceilingY &&
                this.overlaps(s, floor.from, floor.to)
            );

            if (hasCeiling) {
                return h;
            }
        }

        return 3; // Default height if no ceiling found
    }

    /**
     * Check if two areas overlap
     */
    overlaps(area1, from2, to2) {
        const from1 = area1.from || area1;
        const to1 = area1.to || area1;

        return !(
            to1.x < from2.x || from1.x > to2.x ||
            to1.z < from2.z || from1.z > to2.z
        );
    }

    /**
     * Get furniture list for a room type
     */
    getFurnitureForRoom(room) {
        const template = FURNITURE_TEMPLATES[room.type] || FURNITURE_TEMPLATES.generic;
        const furniture = [...template.essential];

        // Add optional items based on room size
        const area = room.size.width * room.size.depth;
        const optionalCount = Math.min(Math.floor(area / 4), template.optional.length);

        for (let i = 0; i < optionalCount; i++) {
            furniture.push(template.optional[i]);
        }

        return furniture;
    }

    /**
     * Generate placement steps for furniture
     */
    placeFurniture(room, furniture) {
        const steps = [];
        const placed = new Set();

        for (const item of furniture) {
            const positions = this.findPlacementPositions(room, item, placed);

            if (positions.length > 0) {
                const count = item.count || 1;
                for (let i = 0; i < Math.min(count, positions.length); i++) {
                    const pos = positions[i];
                    steps.push({
                        op: 'set',
                        pos: { x: pos.x, y: pos.y, z: pos.z },
                        block: item.block,
                        comment: `Interior: ${item.purpose || item.block}`
                    });
                    placed.add(`${pos.x},${pos.y},${pos.z}`);
                }
            }
        }

        return steps;
    }

    /**
     * Find valid placement positions for a furniture item
     */
    findPlacementPositions(room, item, placed) {
        const positions = [];
        const { from, to } = room.bounds;

        switch (item.placement) {
            case 'floor':
                // Place on the floor, near walls or center
                for (let x = from.x; x <= to.x; x++) {
                    for (let z = from.z; z <= to.z; z++) {
                        const key = `${x},${from.y},${z}`;
                        if (!placed.has(key)) {
                            positions.push({ x, y: from.y, z });
                        }
                    }
                }
                break;

            case 'wall':
                // Place against walls
                const wallY = from.y + 1;
                // North wall
                for (let x = from.x; x <= to.x; x++) {
                    positions.push({ x, y: wallY, z: from.z });
                }
                // South wall
                for (let x = from.x; x <= to.x; x++) {
                    positions.push({ x, y: wallY, z: to.z });
                }
                break;

            case 'ceiling':
                // Hang from ceiling
                for (let x = from.x + 1; x < to.x; x++) {
                    for (let z = from.z + 1; z < to.z; z++) {
                        positions.push({ x, y: to.y, z });
                    }
                }
                break;

            case 'surface':
                // Place on existing surfaces (after other furniture)
                // For now, use floor positions
                positions.push({ x: from.x + 1, y: from.y + 1, z: from.z + 1 });
                break;
        }

        return positions.filter(p => !placed.has(`${p.x},${p.y},${p.z}`));
    }
}

export default InteriorDecorator;

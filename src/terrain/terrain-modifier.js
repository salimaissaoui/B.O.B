/**
 * Terrain Modifier
 *
 * Handles terrain modification operations like flatten, smooth, fill, clear.
 * Generates WorldEdit commands for efficient terrain manipulation.
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "Terrain Modification"
 * - World boundaries: WORLD_MIN_Y = -64, WORLD_MAX_Y = 320
 */

// World boundaries from CLAUDE.md
const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 320;
const MAX_AREA_SIZE = 10000; // Maximum blocks per operation (100x100)

/**
 * Calculate average height from a 2D height map
 * @param {number[][]} heightMap - 2D array of heights
 * @returns {number} Average height
 */
export function calculateAverageHeight(heightMap) {
    if (!heightMap || heightMap.length === 0) {
        return 0;
    }

    let sum = 0;
    let count = 0;

    for (const row of heightMap) {
        for (const height of row) {
            sum += height;
            count++;
        }
    }

    return count > 0 ? sum / count : 0;
}

/**
 * Find highest point in height map
 * @param {number[][]} heightMap - 2D array of heights
 * @returns {Object} Highest point with x, z, height
 */
export function findHighestPoint(heightMap) {
    let highest = { x: 0, z: 0, height: -Infinity };

    for (let z = 0; z < heightMap.length; z++) {
        for (let x = 0; x < (heightMap[z]?.length || 0); x++) {
            if (heightMap[z][x] > highest.height) {
                highest = { x, z, height: heightMap[z][x] };
            }
        }
    }

    return highest;
}

/**
 * Find lowest point in height map
 * @param {number[][]} heightMap - 2D array of heights
 * @returns {Object} Lowest point with x, z, height
 */
export function findLowestPoint(heightMap) {
    let lowest = { x: 0, z: 0, height: Infinity };

    for (let z = 0; z < heightMap.length; z++) {
        for (let x = 0; x < (heightMap[z]?.length || 0); x++) {
            if (heightMap[z][x] < lowest.height) {
                lowest = { x, z, height: heightMap[z][x] };
            }
        }
    }

    return lowest;
}

/**
 * Generate commands to flatten terrain to target height
 * @param {number[][]} heightMap - Current terrain heights
 * @param {Object} origin - World origin {x, y, z}
 * @param {number} targetHeight - Target height to flatten to
 * @param {string} block - Block to use for fill
 * @returns {Object[]} Array of terrain commands
 */
export function generateFlattenCommands(heightMap, origin, targetHeight, block) {
    const commands = [];

    for (let z = 0; z < heightMap.length; z++) {
        for (let x = 0; x < (heightMap[z]?.length || 0); x++) {
            const currentHeight = heightMap[z][x];
            const worldX = origin.x + x;
            const worldZ = origin.z + z;

            if (currentHeight < targetHeight) {
                // Need to fill up
                commands.push({
                    type: 'fill',
                    x1: worldX, y1: currentHeight + 1, z1: worldZ,
                    x2: worldX, y2: targetHeight, z2: worldZ,
                    block
                });
            } else if (currentHeight > targetHeight) {
                // Need to clear down
                commands.push({
                    type: 'clear',
                    x1: worldX, y1: targetHeight + 1, z1: worldZ,
                    x2: worldX, y2: currentHeight, z2: worldZ,
                    block: 'air'
                });
            }
        }
    }

    // Add surface layer if needed
    if (commands.length === 0 && heightMap.length > 0) {
        // Already at target, optionally add surface command
        return [];
    }

    return commands;
}

/**
 * Generate commands to smooth terrain
 * @param {number[][]} heightMap - Current terrain heights
 * @param {Object} origin - World origin {x, y, z}
 * @param {string} block - Block to use for surface
 * @returns {Object[]} Array of terrain commands
 */
export function generateSmoothCommands(heightMap, origin, block) {
    const commands = [];
    const smoothedMap = smoothHeightMap(heightMap);

    for (let z = 0; z < heightMap.length; z++) {
        for (let x = 0; x < (heightMap[z]?.length || 0); x++) {
            const currentHeight = heightMap[z][x];
            const targetHeight = smoothedMap[z][x];
            const worldX = origin.x + x;
            const worldZ = origin.z + z;

            if (currentHeight !== targetHeight) {
                if (currentHeight < targetHeight) {
                    commands.push({
                        type: 'fill',
                        x1: worldX, y1: currentHeight + 1, z1: worldZ,
                        x2: worldX, y2: targetHeight, z2: worldZ,
                        block
                    });
                } else {
                    commands.push({
                        type: 'clear',
                        x1: worldX, y1: targetHeight + 1, z1: worldZ,
                        x2: worldX, y2: currentHeight, z2: worldZ,
                        block: 'air'
                    });
                }
            }
        }
    }

    return commands;
}

/**
 * Apply smoothing to a height map
 * @param {number[][]} heightMap - Input height map
 * @returns {number[][]} Smoothed height map
 */
function smoothHeightMap(heightMap) {
    const result = [];

    for (let z = 0; z < heightMap.length; z++) {
        result[z] = [];
        for (let x = 0; x < (heightMap[z]?.length || 0); x++) {
            // Average with neighbors
            let sum = 0;
            let count = 0;

            for (let dz = -1; dz <= 1; dz++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nz = z + dz;
                    const nx = x + dx;
                    if (heightMap[nz]?.[nx] !== undefined) {
                        sum += heightMap[nz][nx];
                        count++;
                    }
                }
            }

            result[z][x] = Math.round(sum / count);
        }
    }

    return result;
}

/**
 * Terrain Operation definition
 */
export class TerrainOperation {
    constructor(params) {
        this.type = params.type;
        this.area = params.area;
        this.targetHeight = params.targetHeight;
        this.fromY = params.fromY;
        this.toY = params.toY;
        this.block = params.block || 'dirt';
        this.iterations = params.iterations || 1;
        this.depth = params.depth || 1;
    }

    getAreaWidth() {
        return this.area.x2 - this.area.x1 + 1;
    }

    getAreaDepth() {
        return this.area.z2 - this.area.z1 + 1;
    }

    getAreaSize() {
        return this.getAreaWidth() * this.getAreaDepth();
    }
}

/**
 * Terrain Modifier class
 * Plans and generates terrain modification commands
 */
export class TerrainModifier {
    constructor(options = {}) {
        this.maxAreaSize = options.maxAreaSize || MAX_AREA_SIZE;
        this.worldMinY = options.worldMinY || WORLD_MIN_Y;
        this.worldMaxY = options.worldMaxY || WORLD_MAX_Y;
    }

    /**
     * Calculate area from center/radius or corners
     * @param {Object} params - Area parameters
     * @returns {Object} Area bounds {x1, z1, x2, z2}
     */
    calculateArea(params) {
        if (params.center && params.radius !== undefined) {
            return {
                x1: params.center.x - params.radius,
                z1: params.center.z - params.radius,
                x2: params.center.x + params.radius,
                z2: params.center.z + params.radius
            };
        }

        if (params.corner1 && params.corner2) {
            return {
                x1: Math.min(params.corner1.x, params.corner2.x),
                z1: Math.min(params.corner1.z, params.corner2.z),
                x2: Math.max(params.corner1.x, params.corner2.x),
                z2: Math.max(params.corner1.z, params.corner2.z)
            };
        }

        return params.area || { x1: 0, z1: 0, x2: 10, z2: 10 };
    }

    /**
     * Plan a terrain operation
     * @param {Object} params - Operation parameters
     * @returns {Object} Operation plan
     */
    planOperation(params) {
        const area = this.calculateArea(params);
        const width = area.x2 - area.x1 + 1;
        const depth = area.z2 - area.z1 + 1;
        const size = width * depth;

        // Validate area size
        if (size > this.maxAreaSize) {
            throw new Error(`Area size ${size} exceeds maximum ${this.maxAreaSize}`);
        }

        // Validate target height if specified
        if (params.targetHeight !== undefined) {
            if (params.targetHeight < this.worldMinY || params.targetHeight > this.worldMaxY) {
                throw new Error(`Target height ${params.targetHeight} outside world bounds [${this.worldMinY}, ${this.worldMaxY}]`);
            }
        }

        const plan = {
            type: params.type,
            area,
            block: params.block || 'dirt',
            estimatedCommands: this._estimateCommands(params.type, size)
        };

        switch (params.type) {
            case 'flatten':
                plan.targetHeight = params.targetHeight || 64;
                break;
            case 'smooth':
                plan.iterations = params.iterations || 1;
                break;
            case 'fill':
                plan.fromY = params.fromY;
                plan.toY = params.toY;
                break;
            case 'clear':
                plan.fromY = params.fromY;
                plan.toY = params.toY;
                break;
            case 'surface':
                plan.depth = params.depth || 1;
                break;
        }

        return plan;
    }

    /**
     * Estimate number of commands for operation
     * @private
     */
    _estimateCommands(type, areaSize) {
        switch (type) {
            case 'flatten':
                return Math.ceil(areaSize / 100) + 1; // Batch commands
            case 'smooth':
                return Math.ceil(areaSize / 50);
            case 'fill':
            case 'clear':
                return Math.ceil(areaSize / 1000) + 1;
            case 'surface':
                return 1;
            default:
                return areaSize;
        }
    }

    /**
     * Generate WorldEdit commands for an operation
     * @param {Object} plan - Operation plan
     * @returns {string[]} WorldEdit commands
     */
    generateWorldEditCommands(plan) {
        const commands = [];
        const { area, type, block } = plan;

        switch (type) {
            case 'flatten':
                commands.push(
                    `//pos1 ${area.x1},${this.worldMinY},${area.z1}`,
                    `//pos2 ${area.x2},${plan.targetHeight},${area.z2}`,
                    `//set ${block}`,
                    `//pos1 ${area.x1},${plan.targetHeight + 1},${area.z1}`,
                    `//pos2 ${area.x2},${this.worldMaxY},${area.z2}`,
                    `//set air`
                );
                break;

            case 'fill':
                commands.push(
                    `//pos1 ${area.x1},${plan.fromY},${area.z1}`,
                    `//pos2 ${area.x2},${plan.toY},${area.z2}`,
                    `//set ${block}`
                );
                break;

            case 'clear':
                commands.push(
                    `//pos1 ${area.x1},${plan.fromY},${area.z1}`,
                    `//pos2 ${area.x2},${plan.toY},${area.z2}`,
                    `//set air`
                );
                break;

            case 'smooth':
                // WorldEdit has a //smooth command
                commands.push(
                    `//pos1 ${area.x1},${this.worldMinY},${area.z1}`,
                    `//pos2 ${area.x2},${this.worldMaxY},${area.z2}`,
                    `//smooth ${plan.iterations || 1}`
                );
                break;

            case 'surface':
                commands.push(
                    `//pos1 ${area.x1},${plan.targetHeight || 64},${area.z1}`,
                    `//pos2 ${area.x2},${(plan.targetHeight || 64) + (plan.depth || 1) - 1},${area.z2}`,
                    `//replace !air ${block}`
                );
                break;

            default:
                commands.push(
                    `//pos1 ${area.x1},${this.worldMinY},${area.z1}`,
                    `//pos2 ${area.x2},${this.worldMaxY},${area.z2}`,
                    `//set ${block}`
                );
        }

        return commands;
    }

    /**
     * Generate vanilla commands (for when WorldEdit unavailable)
     * @param {Object} plan - Operation plan
     * @returns {Object[]} Vanilla fill commands
     */
    generateVanillaCommands(plan) {
        const commands = [];
        const { area, type, block } = plan;

        // Vanilla /fill has a 32768 block limit, so we may need to chunk
        const chunkSize = 32;

        for (let x = area.x1; x <= area.x2; x += chunkSize) {
            for (let z = area.z1; z <= area.z2; z += chunkSize) {
                const x2 = Math.min(x + chunkSize - 1, area.x2);
                const z2 = Math.min(z + chunkSize - 1, area.z2);

                switch (type) {
                    case 'flatten':
                        commands.push({
                            command: `/fill ${x} ${this.worldMinY} ${z} ${x2} ${plan.targetHeight} ${z2} ${block} replace`,
                            type: 'fill'
                        });
                        commands.push({
                            command: `/fill ${x} ${plan.targetHeight + 1} ${z} ${x2} ${this.worldMaxY} ${z2} air replace`,
                            type: 'clear'
                        });
                        break;

                    case 'fill':
                        commands.push({
                            command: `/fill ${x} ${plan.fromY} ${z} ${x2} ${plan.toY} ${z2} ${block}`,
                            type: 'fill'
                        });
                        break;

                    case 'clear':
                        commands.push({
                            command: `/fill ${x} ${plan.fromY} ${z} ${x2} ${plan.toY} ${z2} air replace`,
                            type: 'clear'
                        });
                        break;
                }
            }
        }

        return commands;
    }
}

export default TerrainModifier;

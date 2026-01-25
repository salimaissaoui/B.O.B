import { calculateBounds } from '../utils/coordinates.js';

/**
 * Smart Wall Operation
 * Procedurally generates walls with architectural patterns
 *
 * @param {Object} step
 * @param {Object} step.from - Start coordinates {x,y,z}
 * @param {Object} step.to - End coordinates {x,y,z}
 * @param {string[]} step.palette - Array of block names [primary, secondary, ...]
 * @param {string} step.pattern - Pattern type: 'solid', 'checker', 'striped', 'border', 'noise'
 * @param {string} step.axis - 'x', 'y', 'z' (optional, auto-detected)
 */
export function smartWall(step) {
    const { from, to, palette, pattern = 'solid' } = step;

    if (!palette || palette.length === 0) {
        throw new Error('Smart Wall requires a palette');
    }

    // Validate pattern
    const validPatterns = ['solid', 'checker', 'striped', 'horizontal_stripe', 'border', 'noise', 'brick', 'diagonal'];
    if (pattern && !validPatterns.includes(pattern)) {
        console.warn(`⚠ Smart Wall: Invalid pattern '${pattern}'. Valid patterns: ${validPatterns.join(', ')}. Using 'solid' instead.`);
    }

    const blocks = [];

    // Calculate bounds using utility
    const { minX, maxX, minY, maxY, minZ, maxZ, width, height, depth } = calculateBounds(from, to);

    // Primary blocks
    const primary = palette[0];
    const secondary = palette[1] || primary;
    const tertiary = palette[2] || secondary;

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {

                let block = primary;

                // Pattern Logic
                switch (pattern) {
                    case 'checker':
                        // 3D Checkerboard
                        if ((x + y + z) % 2 !== 0) {
                            block = secondary;
                        }
                        break;

                    case 'striped':
                        // Vertical stripes
                        if (x % 2 !== 0 || z % 2 !== 0) {
                            block = secondary;
                        }
                        break;

                    case 'horizontal_stripe':
                        // Horizontal bands
                        if (y % 2 !== 0) {
                            block = secondary;
                        }
                        break;

                    case 'border':
                        // Border around the edges of the wall
                        const isEdgeX = (x === minX || x === maxX);
                        const isEdgeY = (y === minY || y === maxY);
                        const isEdgeZ = (z === minZ || z === maxZ);

                        // Check if it's an edge on the dominant face
                        if ((minX === maxX && (isEdgeY || isEdgeZ)) ||
                            (minZ === maxZ && (isEdgeX || isEdgeY)) ||
                            (minY === maxY && (isEdgeX || isEdgeZ))) {
                            block = secondary;
                        }
                        break;

                    case 'noise':
                        // Random noise for texturing
                        if (Math.random() > 0.7) {
                            block = secondary;
                        }
                        break;

                    case 'brick':
                        // Brick pattern with offset rows
                        const rowOffset = y % 2 === 0 ? 0 : 1;
                        if ((x + z + rowOffset) % 3 === 0) {
                            block = secondary;
                        } else if ((x + z + rowOffset) % 3 === 1) {
                            block = tertiary;
                        }
                        break;

                    case 'diagonal':
                        // Diagonal stripes
                        if ((x + z) % 3 === 0) {
                            block = secondary;
                        } else if ((x + z) % 3 === 1) {
                            block = tertiary;
                        }
                        break;

                    case 'solid':
                    default:
                        block = primary;
                        break;
                }

                blocks.push({ x, y, z, block });
            }
        }
    }

    return blocks;
}

import { calculateBounds, calculateCenter } from '../utils/coordinates.js';

/**
 * Smart Floor Operation
 * Procedurally generates floors with architectural patterns
 *
 * @param {Object} step
 * @param {Object} step.from - Start coordinates {x,y,z} (y value is the floor level)
 * @param {Object} step.to - End coordinates {x,y,z} (y value ignored, uses min(from.y, to.y))
 * @param {string[]} step.palette - Array of block names [primary, secondary, ...]
 * @param {string} step.pattern - Pattern type: 'solid', 'checker', 'tiled', 'parquet', 'radial'
 *
 * @note Floors are always flat (single Y-plane). The Y coordinate is taken from min(from.y, to.y).
 */
export function smartFloor(step) {
    const { from, to, palette, pattern = 'solid' } = step;

    if (!palette || palette.length === 0) {
        throw new Error('Smart Floor requires a palette');
    }

    // Validate pattern
    const validPatterns = ['solid', 'checker', 'tiled', 'parquet', 'radial', 'border', 'herringbone', 'spiral', 'diamond'];
    if (pattern && !validPatterns.includes(pattern)) {
        console.warn(`⚠ Smart Floor: Invalid pattern '${pattern}'. Valid patterns: ${validPatterns.join(', ')}. Using 'solid' instead.`);
    }

    const blocks = [];

    // Calculate bounds using utility
    const { minX, maxX, minY, minZ, maxZ } = calculateBounds(from, to);
    const y = minY; // Floors are always flat at the minimum Y level

    // Calculate center for radial patterns
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Primary blocks
    const primary = palette[0];
    const secondary = palette[1] || primary;
    const accent = palette[2] || secondary;

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {

            let block = primary;

            // Pattern Logic
            switch (pattern) {
                case 'checker':
                    // Standard Checkerboard
                    if ((x + z) % 2 !== 0) {
                        block = secondary;
                    }
                    break;

                case 'tiled':
                    // 2x2 Tiles with border
                    // Grid lines every 3rd block
                    if (x % 3 === 0 || z % 3 === 0) {
                        block = secondary;
                    }
                    break;

                case 'parquet':
                    // Herringbone-ish 2x1 pattern simulation
                    const px = Math.floor(x / 2);
                    const pz = Math.floor(z / 2);
                    if ((px + pz) % 2 === 0) {
                        block = secondary;
                    }
                    break;

                case 'radial':
                    // Circular pattern from center
                    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
                    if (Math.floor(dist) % 2 === 0) {
                        block = secondary;
                    }
                    break;

                case 'border':
                    if (x === minX || x === maxX || z === minZ || z === maxZ) {
                        block = secondary;
                    }
                    break;

                case 'herringbone':
                    // True herringbone pattern
                    const quadX = Math.floor((x - minX) / 2) % 2;
                    const quadZ = Math.floor((z - minZ) / 2) % 2;
                    if ((quadX + quadZ) % 2 === 0) {
                        if ((x - minX) % 2 === 0) block = secondary;
                    } else {
                        if ((z - minZ) % 2 === 0) block = secondary;
                    }
                    break;

                case 'spiral':
                    // Spiral pattern from center
                    const dx = x - centerX;
                    const dz = z - centerZ;
                    const angle = Math.atan2(dz, dx);
                    const radius = Math.sqrt(dx * dx + dz * dz);
                    const spiralValue = (angle + radius * 0.5) % (Math.PI * 2);
                    if (spiralValue < Math.PI) {
                        block = secondary;
                    } else if (spiralValue < Math.PI * 1.5) {
                        block = accent;
                    }
                    break;

                case 'diamond':
                    // Diamond/argyle pattern
                    const diagSum = Math.abs((x - minX) % 4 - 2) + Math.abs((z - minZ) % 4 - 2);
                    if (diagSum === 2) {
                        block = secondary;
                    } else if (diagSum === 4) {
                        block = accent;
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

    return blocks;
}

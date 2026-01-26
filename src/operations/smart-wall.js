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

    // Validate pattern type against supported patterns
    const validPatterns = ['solid', 'checker', 'striped', 'horizontal_stripe', 'border', 'noise', 'brick', 'diagonal'];
    if (pattern && !validPatterns.includes(pattern)) {
        console.warn(`Warning: Smart Wall - Invalid pattern '${pattern}'. Valid patterns: ${validPatterns.join(', ')}. Using 'solid' instead.`);
    }

    const blocks = [];

    // Calculate normalized bounds (handles negative coordinates and ensures min < max)
    const { minX, maxX, minY, maxY, minZ, maxZ, width, height, depth } = calculateBounds(from, to);

    // Extract block types from palette
    // primary: Main block type (e.g., stone_bricks)
    // secondary: Accent block for patterns (e.g., cracked_stone_bricks)
    // tertiary: Optional third color for complex patterns (e.g., mossy_stone_bricks)
    const primary = palette[0];
    const secondary = palette[1] || primary;
    const tertiary = palette[2] || secondary;

    // Iterate through 3D volume to generate wall pattern
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {

                let block = primary;

                // Apply pattern algorithm to determine block type at this position
                switch (pattern) {
                    case 'checker':
                        // 3D Checkerboard pattern using coordinate sum parity
                        // Alternates blocks in all three dimensions
                        // Example: (0,0,0)=primary, (1,0,0)=secondary, (0,1,0)=secondary
                        if ((x + y + z) % 2 !== 0) {
                            block = secondary;
                        }
                        break;

                    case 'striped':
                        // Vertical stripes running along Y-axis
                        // Alternates based on X and Z coordinates
                        // Creates column-like pattern suitable for pillars
                        if (x % 2 !== 0 || z % 2 !== 0) {
                            block = secondary;
                        }
                        break;

                    case 'horizontal_stripe':
                        // Horizontal bands perpendicular to Y-axis
                        // Alternates based on height (Y coordinate)
                        // Creates layered/stratified appearance
                        if (y % 2 !== 0) {
                            block = secondary;
                        }
                        break;

                    case 'border':
                        // Border/frame around perimeter of wall face
                        // Detects which plane the wall occupies (XY, YZ, or XZ)
                        // Then highlights the edges of that plane with secondary block
                        const isEdgeX = (x === minX || x === maxX);
                        const isEdgeY = (y === minY || y === maxY);
                        const isEdgeZ = (z === minZ || z === maxZ);

                        // Check if current position is on the border of the dominant face
                        // XY plane wall (minZ===maxZ): highlight top/bottom/left/right edges
                        // YZ plane wall (minX===maxX): highlight top/bottom/front/back edges
                        // XZ plane wall (minY===maxY): highlight left/right/front/back edges
                        if ((minX === maxX && (isEdgeY || isEdgeZ)) ||
                            (minZ === maxZ && (isEdgeX || isEdgeY)) ||
                            (minY === maxY && (isEdgeX || isEdgeZ))) {
                            block = secondary;
                        }
                        break;

                    case 'noise':
                        // Random textured appearance using probabilistic distribution
                        // 30% chance of secondary block placement
                        // Good for natural stone walls, weathered surfaces
                        if (Math.random() > 0.7) {
                            block = secondary;
                        }
                        break;

                    case 'brick':
                        // Classic brick laying pattern with offset rows
                        // Even rows (y % 2 === 0) start at offset 0
                        // Odd rows (y % 2 === 1) start at offset 1 for staggered look
                        // Uses modulo 3 for tri-color pattern with tertiary block
                        const rowOffset = y % 2 === 0 ? 0 : 1;
                        if ((x + z + rowOffset) % 3 === 0) {
                            block = secondary;
                        } else if ((x + z + rowOffset) % 3 === 1) {
                            block = tertiary;
                        }
                        // Remainder (% 3 === 2) stays primary
                        break;

                    case 'diagonal':
                        // Diagonal stripes running at 45-degree angle
                        // Uses (x + z) coordinate sum to create diagonal bands
                        // Modulo 3 creates tri-color repeating pattern
                        if ((x + z) % 3 === 0) {
                            block = secondary;
                        } else if ((x + z) % 3 === 1) {
                            block = tertiary;
                        }
                        // Remainder (% 3 === 2) stays primary
                        break;

                    case 'solid':
                    default:
                        // Uniform single-block wall
                        // Uses only primary block type
                        block = primary;
                        break;
                }

                // Add block placement instruction to output array
                blocks.push({ x, y, z, block });
            }
        }
    }

    return blocks;
}

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

    // Validate pattern type against supported patterns
    const validPatterns = ['solid', 'checker', 'tiled', 'parquet', 'radial', 'border', 'herringbone', 'spiral', 'diamond'];
    if (pattern && !validPatterns.includes(pattern)) {
        console.warn(`Warning: Smart Floor - Invalid pattern '${pattern}'. Valid patterns: ${validPatterns.join(', ')}. Using 'solid' instead.`);
    }

    const blocks = [];

    // Calculate normalized bounds from input coordinates
    const { minX, maxX, minY, minZ, maxZ } = calculateBounds(from, to);

    // Floors are always 2D planes (single Y-level)
    // Use minimum Y to ensure floor is at base of specified region
    const y = minY;

    // Calculate geometric center for radial/spiral patterns
    // Used as origin point for distance-based calculations
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Extract block types from palette
    // primary: Main flooring material (e.g., oak_planks)
    // secondary: Pattern accent (e.g., dark_oak_planks)
    // accent: Optional third color for complex patterns (e.g., stripped_oak_log)
    const primary = palette[0];
    const secondary = palette[1] || primary;
    const accent = palette[2] || secondary;

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {

            let block = primary;

            // Apply pattern algorithm to determine block type at this 2D position
            switch (pattern) {
                case 'checker':
                    // Classic checkerboard pattern
                    // Alternates blocks based on coordinate sum parity
                    // Creates 1x1 alternating squares
                    // Example: (0,0)=primary, (1,0)=secondary, (0,1)=secondary, (1,1)=primary
                    if ((x + z) % 2 !== 0) {
                        block = secondary;
                    }
                    break;

                case 'tiled':
                    // Large tile pattern with visible grout lines
                    // Creates 3x3 tiles separated by 1-block wide grid lines
                    // Grid lines use secondary block (like stone brick borders)
                    // Tile interiors use primary block
                    if (x % 3 === 0 || z % 3 === 0) {
                        block = secondary;  // Grid line
                    }
                    // else: primary (tile interior)
                    break;

                case 'parquet':
                    // Simplified parquet flooring pattern
                    // Divides floor into 2x2 sections and alternates colors
                    // Creates larger checkerboard effect (2x2 squares instead of 1x1)
                    // Good for wood plank floors with directional grain
                    const px = Math.floor(x / 2);
                    const pz = Math.floor(z / 2);
                    if ((px + pz) % 2 === 0) {
                        block = secondary;
                    }
                    break;

                case 'radial':
                    // Concentric circles emanating from center
                    // Calculates Euclidean distance from floor center
                    // Alternates blocks based on integer distance (creates rings)
                    // Good for circular rooms, fountains, throne rooms
                    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
                    if (Math.floor(dist) % 2 === 0) {
                        block = secondary;  // Even-distance ring
                    }
                    // else: primary (odd-distance ring)
                    break;

                case 'border':
                    // Simple perimeter border around floor edge
                    // Highlights outer rim with secondary block
                    // Interior uses primary block
                    // Creates picture-frame effect
                    if (x === minX || x === maxX || z === minZ || z === maxZ) {
                        block = secondary;  // Edge border
                    }
                    // else: primary (interior)
                    break;

                case 'herringbone':
                    // True herringbone/chevron pattern
                    // Divides floor into 2x2 quadrants, alternates plank direction
                    // In alternating quadrants, planks run horizontal vs vertical
                    // Creates classic wood floor zigzag pattern
                    const quadX = Math.floor((x - minX) / 2) % 2;  // Which 2x2 quadrant (X)
                    const quadZ = Math.floor((z - minZ) / 2) % 2;  // Which 2x2 quadrant (Z)
                    if ((quadX + quadZ) % 2 === 0) {
                        // Even quadrants: horizontal planks (use X parity)
                        if ((x - minX) % 2 === 0) block = secondary;
                    } else {
                        // Odd quadrants: vertical planks (use Z parity)
                        if ((z - minZ) % 2 === 0) block = secondary;
                    }
                    break;

                case 'spiral':
                    // Logarithmic spiral pattern from center
                    // Calculates polar angle (atan2) and radius from center
                    // Combines angle and radius to create spiral bands
                    // Uses three colors for smooth color transition
                    // Good for decorative entrances, magical circles
                    const dx = x - centerX;
                    const dz = z - centerZ;
                    const angle = Math.atan2(dz, dx);  // -π to π
                    const radius = Math.sqrt(dx * dx + dz * dz);
                    const spiralValue = (angle + radius * 0.5) % (Math.PI * 2);
                    if (spiralValue < Math.PI) {
                        block = secondary;  // First third of spiral
                    } else if (spiralValue < Math.PI * 1.5) {
                        block = accent;  // Second third of spiral
                    }
                    // else: primary (last third of spiral)
                    break;

                case 'diamond':
                    // Diamond/argyle pattern
                    // Creates diagonal diamond shapes using Manhattan distance
                    // Modulo 4 creates repeating 4x4 pattern unit
                    // Distance from pattern center determines block type
                    // Creates quilted/tiled diagonal effect
                    const diagSum = Math.abs((x - minX) % 4 - 2) + Math.abs((z - minZ) % 4 - 2);
                    if (diagSum === 2) {
                        block = secondary;  // Diamond edge
                    } else if (diagSum === 4) {
                        block = accent;  // Diamond corner
                    }
                    // else: primary (diamond center and background)
                    break;

                case 'solid':
                default:
                    // Uniform single-block floor
                    // Uses only primary block type
                    block = primary;
                    break;
            }

            blocks.push({ x, y, z, block });
        }
    }

    return blocks;
}

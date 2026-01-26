import { calculateBounds } from '../utils/coordinates.js';

/**
 * Smart Roof Operation
 * Procedurally generates roofs with complex geometry
 *
 * @param {Object} step
 * @param {Object} step.from - Corner 1
 * @param {Object} step.to - Corner 2
 * @param {string} step.block - Roof material
 * @param {string} step.style - 'gable', 'hip', 'dome', 'pagoda', 'a-frame'
 * @param {number} step.overhang - Overhang length (default 1)
 */
export function smartRoof(step) {
    const { from, to, block, style = 'gable', overhang = 1 } = step;

    // Validate architectural style against supported roof types
    const validStyles = ['gable', 'a-frame', 'dome', 'pagoda', 'hip'];
    if (style && !validStyles.includes(style)) {
        console.warn(`Warning: Smart Roof - Invalid style '${style}'. Valid styles: ${validStyles.join(', ')}. Using 'gable' instead.`);
    }

    const blocks = [];

    // Calculate normalized bounds and dimensions
    const { minX, maxX, minY, minZ, maxZ, width, depth } = calculateBounds(from, to);

    // Calculate geometric center for radial/symmetric roof styles
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    /**
     * GABLE / A-FRAME ROOF
     *
     * Creates two-sided sloped roof (triangular cross-section)
     * - Ridge runs along longest horizontal dimension
     * - Slopes converge to central peak
     * - Supports overhang for eaves
     *
     * Geometry:
     * - Peak height = half of short dimension
     * - Inset increases linearly with height (45-degree slope)
     * - Each layer places two parallel rows (north & south slopes)
     *
     * Example (bird's eye view, building is 8x6):
     *   ========  (Layer 0: y=minY, no inset)
     *    ======   (Layer 1: y=minY+1, inset=1)
     *     ====    (Layer 2: y=minY+2, inset=2)
     *      ==     (Layer 3: y=minY+3, inset=3, peak)
     */
    if (style === 'gable' || style === 'a-frame') {
        // Determine ridge orientation: run along longest dimension
        const axis = width > depth ? 'z' : 'x';

        const longLen = axis === 'x' ? width : depth;
        const shortLen = axis === 'x' ? depth : width;

        // Peak height = half the short dimension (creates 45-degree slope)
        const peakHeight = Math.floor(shortLen / 2);

        // Build roof layer by layer from base to peak
        for (let h = 0; h <= peakHeight; h++) {
            const y = minY + h;

            // Inset increases linearly with height (1 block inset per layer)
            // Creates uniform slope angle
            const inset = h;

            if (axis === 'x') {
                // Ridge runs along X-axis (east-west)
                // Roof slopes along Z-axis (north-south)

                // Place north slope row (minZ side, moves inward each layer)
                // Place south slope row (maxZ side, moves inward each layer)
                for (let x = minX - overhang; x <= maxX + overhang; x++) {
                    blocks.push({ x, y, z: minZ + inset, block });  // North slope
                    blocks.push({ x, y, z: maxZ - inset, block });  // South slope
                }
            } else {
                // Ridge runs along Z-axis (north-south)
                // Roof slopes along X-axis (east-west)

                // Place west slope row (minX side, moves inward each layer)
                // Place east slope row (maxX side, moves inward each layer)
                for (let z = minZ - overhang; z <= maxZ + overhang; z++) {
                    blocks.push({ x: minX + inset, y, z, block });  // West slope
                    blocks.push({ x: maxX - inset, y, z, block });  // East slope
                }
            }
        }
    }

    /**
     * DOME ROOF
     *
     * Creates hemispherical dome (half-sphere)
     * - Centered on building footprint
     * - Hollow shell (1-block thick)
     * - Radius based on smallest building dimension
     *
     * Geometry:
     * - Uses 3D Euclidean distance formula: sqrt(dx² + dy² + dz²)
     * - Places blocks where distance from center ≈ radius (±1 block tolerance)
     * - Only builds upper hemisphere (y >= minY)
     *
     * Good for:
     * - Circular buildings, temples, observatories
     * - Byzantine/Romanesque architecture
     * - Planetariums, capitol buildings
     */
    else if (style === 'dome') {
        // Radius = half of smallest dimension (ensures dome fits on building)
        const radius = Math.min(width, depth) / 2;

        // Iterate through 3D bounding box
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                for (let y = minY; y <= minY + radius; y++) {
                    // Calculate offset from dome center
                    const dx = x - centerX;
                    const dz = z - centerZ;
                    const dy = y - minY;  // Height above base

                    // Calculate 3D distance from center point
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    // Place block if distance ≈ radius (creates thin shell)
                    // Tolerance of 1.0 ensures shell is 1-block thick
                    if (Math.abs(dist - radius) < 1.0) {
                        blocks.push({ x, y, z, block });
                    }
                }
            }
        }
    }

    /**
     * PAGODA ROOF
     *
     * Creates multi-tiered East Asian-style roof with curved profile
     * - Slightly concave slope (faster inset at bottom, slower at top)
     * - Hollow rectangular tiers
     * - Taller than other roof types (adds +2 to peak height)
     *
     * Geometry:
     * - Progress function: yLevel / peak (0.0 at base, 1.0 at peak)
     * - Inset function: (width/2) * progress * 0.8 (80% of full inset)
     * - Creates gentle curve instead of linear slope
     * - Each layer is hollow square (only perimeter blocks)
     *
     * Architecture style:
     * - Chinese temples, Japanese pagodas
     * - Korean palace roofs
     * - Upturned eaves effect
     */
    else if (style === 'pagoda') {
        // Peak height slightly taller than other styles for dramatic effect
        const peak = Math.floor(Math.min(width, depth) / 2) + 2;

        // Build tier by tier from base to apex
        for (let yLevel = 0; yLevel <= peak; yLevel++) {
            const y = minY + yLevel;

            // Calculate curved inset profile
            // progress: 0.0 (base) to 1.0 (peak)
            const progress = yLevel / peak;

            // Inset increases with progress, but scaled to 80% for gentler slope
            // Creates slightly convex curve (concave roof profile from outside)
            const inset = Math.floor((width / 2) * progress * 0.8);

            // Calculate this tier's bounding box
            const rMinX = minX + inset;
            const rMaxX = maxX - inset;
            const rMinZ = minZ + inset;
            const rMaxZ = maxZ - inset;

            // Draw hollow square tier (perimeter only)
            // North and south edges
            for (let x = rMinX; x <= rMaxX; x++) {
                blocks.push({ x, y, z: rMinZ, block });  // North edge
                blocks.push({ x, y, z: rMaxZ, block });  // South edge
            }

            // East and west edges
            for (let z = rMinZ; z <= rMaxZ; z++) {
                blocks.push({ x: rMinX, y, z, block });  // West edge
                blocks.push({ x: rMaxX, y, z, block });  // East edge
            }
        }
    }

    /**
     * HIP ROOF
     *
     * Creates four-sided pyramidal roof (slopes on all sides)
     * - All four walls have sloped faces
     * - No gable ends (unlike gable roof)
     * - Converges to central ridge or point
     * - Hollow layers (only perimeter blocks)
     *
     * Geometry:
     * - Peak height = half of smallest dimension
     * - Inset increases linearly (1 block per layer)
     * - Each layer is hollow rectangle (only edges)
     * - Stops when inset would exceed building dimensions
     *
     * Architecture style:
     * - Colonial houses, bungalows
     * - Mediterranean villas
     * - Craftsman-style homes
     * - More stable than gable in high wind
     */
    else if (style === 'hip') {
        // Peak height based on smallest dimension
        const peak = Math.floor(Math.min(width, depth) / 2);

        // Build layer by layer from base to peak
        for (let layer = 0; layer < peak; layer++) {
            // Inset increases linearly (creates 45-degree slope on all sides)
            const inset = layer;
            const y = minY + layer;

            // Safety check: stop if inset would make layer impossible
            // (inset from both sides would exceed total dimension)
            if (inset * 2 >= width || inset * 2 >= depth) {
                break;
            }

            // Create hollow rectangular tier
            // Iterate through bounding box but only place perimeter blocks
            for (let x = minX + inset; x <= maxX - inset; x++) {
                for (let z = minZ + inset; z <= maxZ - inset; z++) {
                    // Check if current position is on edge of tier
                    const isEdge =
                        x === minX + inset ||  // West edge
                        x === maxX - inset ||  // East edge
                        z === minZ + inset ||  // North edge
                        z === minZ + inset;    // South edge

                    // Only place blocks on perimeter (creates hollow tier)
                    if (isEdge) {
                        blocks.push({ x, y, z, block });
                    }
                }
            }
        }
    }

    return blocks;
}

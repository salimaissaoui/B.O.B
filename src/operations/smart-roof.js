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

    // Validate style
    const validStyles = ['gable', 'a-frame', 'dome', 'pagoda', 'hip'];
    if (style && !validStyles.includes(style)) {
        console.warn(`⚠ Smart Roof: Invalid style '${style}'. Valid styles: ${validStyles.join(', ')}. Using 'gable' instead.`);
    }

    const blocks = [];

    // Calculate bounds using utility
    const { minX, maxX, minY, minZ, maxZ, width, depth } = calculateBounds(from, to);
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // A-Frame / Gable Logic
    if (style === 'gable' || style === 'a-frame') {
        const axis = width > depth ? 'z' : 'x'; // Run along longest axis
        const longLen = axis === 'x' ? width : depth;
        const shortLen = axis === 'x' ? depth : width;
        const peakHeight = Math.floor(shortLen / 2);

        for (let h = 0; h <= peakHeight; h++) {
            const y = minY + h;

            // Calc inset
            const inset = h;

            if (axis === 'x') {
                // Runs along X, slopes along Z
                const z1 = minZ + inset - (overhang);
                const z2 = maxZ - inset + (overhang);
                // Place rows
                for (let x = minX - overhang; x <= maxX + overhang; x++) {
                    blocks.push({ x, y, z: minZ + inset, block });
                    blocks.push({ x, y, z: maxZ - inset, block });
                }
            } else {
                // Runs along Z, slopes along X
                for (let z = minZ - overhang; z <= maxZ + overhang; z++) {
                    blocks.push({ x: minX + inset, y, z, block });
                    blocks.push({ x: maxX - inset, y, z, block });
                }
            }
        }
    }

    // Dome Logic
    else if (style === 'dome') {
        const radius = Math.min(width, depth) / 2;
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                for (let y = minY; y <= minY + radius; y++) {
                    const dx = x - centerX;
                    const dz = z - centerZ;
                    const dy = y - minY;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    // Thin shell
                    if (Math.abs(dist - radius) < 1.0) {
                        blocks.push({ x, y, z, block });
                    }
                }
            }
        }
    }

    // Pagoda Logic (Flared corners)
    else if (style === 'pagoda') {
        const peak = Math.floor(Math.min(width, depth) / 2) + 2; // Taller

        for (let yLevel = 0; yLevel <= peak; yLevel++) {
            const y = minY + yLevel;
            // Inset increases, but with a curve
            // Curve function: convex
            const progress = yLevel / peak;
            const inset = Math.floor((width / 2) * progress * 0.8);

            // Draw square ring at this inset
            const rMinX = minX + inset;
            const rMaxX = maxX - inset;
            const rMinZ = minZ + inset;
            const rMaxZ = maxZ - inset;

            // Flare corners up at bottom?
            // Simple logic: ring
            for (let x = rMinX; x <= rMaxX; x++) {
                blocks.push({ x, y, z: rMinZ, block });
                blocks.push({ x, y, z: rMaxZ, block });
            }
            for (let z = rMinZ; z <= rMaxZ; z++) {
                blocks.push({ x: rMinX, y, z, block });
                blocks.push({ x: rMaxX, y, z, block });
            }
        }
    }

    // Hip Roof Logic (four-sided pyramid)
    else if (style === 'hip') {
        const peak = Math.floor(Math.min(width, depth) / 2);

        for (let layer = 0; layer < peak; layer++) {
            const inset = layer;
            const y = minY + layer;

            // Stop if inset is too large
            if (inset * 2 >= width || inset * 2 >= depth) {
                break;
            }

            // Create rectangular layer with inset (edges only)
            for (let x = minX + inset; x <= maxX - inset; x++) {
                for (let z = minZ + inset; z <= maxZ - inset; z++) {
                    const isEdge =
                        x === minX + inset ||
                        x === maxX - inset ||
                        z === minZ + inset ||
                        z === maxZ - inset;

                    if (isEdge) {
                        blocks.push({ x, y, z, block });
                    }
                }
            }
        }
    }

    return blocks;
}

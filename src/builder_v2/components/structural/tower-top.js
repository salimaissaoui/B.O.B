/**
 * Tower Top Component
 *
 * Generates various tower top styles: crenellated, pointed, dome, or flat.
 * Designed to cap cylindrical or square towers.
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "V2 Component Library Growth - Add tower_top"
 */

/**
 * Generate a tower top structure
 * @param {Object} params - Tower top parameters
 * @param {Object} params.position - Base position (center of tower top)
 * @param {number} params.radius - Radius of the tower (default: 4)
 * @param {string} params.style - Style: 'crenellated', 'pointed', 'dome', 'flat'
 * @param {number} params.height - Height for pointed/dome styles (default: radius)
 * @param {number} params.crenelHeight - Height of crenellations (default: 2)
 * @param {number} params.crenelSpacing - Spacing between crenels (default: 2)
 * @param {string} params.block - Main block (default: '$primary')
 * @param {string} params.roofBlock - Roof block for pointed/dome (default: block)
 * @param {number} params.scale - Scale multiplier (default: 1)
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function towerTop(params) {
    const {
        position = { x: 0, y: 0, z: 0 },
        radius = 4,
        style = 'crenellated',
        height = null,
        crenelHeight = 2,
        crenelSpacing = 2,
        block = '$primary',
        roofBlock = null,
        scale = 1
    } = params;

    const primitives = [];
    let idCounter = 0;
    const nextId = () => `tower_top_${idCounter++}`;

    // Apply scale
    const r = Math.round(radius * scale);
    const h = height !== null ? Math.round(height * scale) : r;
    const ch = Math.round(crenelHeight * scale);
    const cs = Math.round(crenelSpacing * scale);
    const roof = roofBlock || block;

    // Generate based on style
    switch (style) {
        case 'crenellated':
            generateCrenellated(primitives, nextId, position, r, ch, cs, block);
            break;
        case 'pointed':
            generatePointed(primitives, nextId, position, r, h, roof);
            break;
        case 'dome':
            generateDome(primitives, nextId, position, r, h, roof);
            break;
        case 'flat':
        default:
            generateFlat(primitives, nextId, position, r, block);
            break;
    }

    return primitives;
}

/**
 * Generate crenellated (battlemented) top
 */
function generateCrenellated(primitives, nextId, pos, radius, crenelHeight, crenelSpacing, block) {
    // Floor
    for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
            const dist = Math.sqrt(x * x + z * z);
            if (dist <= radius) {
                primitives.push({
                    id: nextId(),
                    type: 'set',
                    pos: { x: pos.x + x, y: pos.y, z: pos.z + z },
                    block
                });
            }
        }
    }

    // Crenellations around the edge
    for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
            const dist = Math.sqrt(x * x + z * z);
            // Only on the outer edge
            if (dist <= radius && dist > radius - 1.5) {
                // Alternating pattern for crenels
                const angle = Math.atan2(z, x);
                const crenelIndex = Math.floor((angle + Math.PI) / (crenelSpacing * 0.3));
                const isMerlon = crenelIndex % 2 === 0;

                if (isMerlon) {
                    for (let h = 1; h <= crenelHeight; h++) {
                        primitives.push({
                            id: nextId(),
                            type: 'set',
                            pos: { x: pos.x + x, y: pos.y + h, z: pos.z + z },
                            block
                        });
                    }
                }
            }
        }
    }
}

/**
 * Generate pointed (conical) roof
 */
function generatePointed(primitives, nextId, pos, radius, height, block) {
    for (let y = 0; y < height; y++) {
        // Radius decreases as we go up
        const currentRadius = radius * (1 - y / height);

        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const dist = Math.sqrt(x * x + z * z);
                if (dist <= currentRadius) {
                    // Only place outer shell for efficiency
                    const isEdge = dist > currentRadius - 1 || y === 0 || y === height - 1;
                    if (isEdge) {
                        primitives.push({
                            id: nextId(),
                            type: 'set',
                            pos: { x: pos.x + x, y: pos.y + y, z: pos.z + z },
                            block
                        });
                    }
                }
            }
        }
    }

    // Add peak
    primitives.push({
        id: nextId(),
        type: 'set',
        pos: { x: pos.x, y: pos.y + height, z: pos.z },
        block
    });
}

/**
 * Generate domed roof
 */
function generateDome(primitives, nextId, pos, radius, height, block) {
    const h = Math.max(height, Math.floor(radius / 2));

    for (let y = 0; y <= h; y++) {
        // Dome formula: r = sqrt(R^2 - y^2) for hemisphere
        // Scaled to fit the tower
        const normalizedY = y / h;
        const currentRadius = radius * Math.sqrt(1 - normalizedY * normalizedY);

        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const dist = Math.sqrt(x * x + z * z);
                if (dist <= currentRadius) {
                    // Only place outer shell
                    const isEdge = dist > currentRadius - 1 || y === 0;
                    if (isEdge) {
                        primitives.push({
                            id: nextId(),
                            type: 'set',
                            pos: { x: pos.x + x, y: pos.y + y, z: pos.z + z },
                            block
                        });
                    }
                }
            }
        }
    }
}

/**
 * Generate flat top (simple cap)
 */
function generateFlat(primitives, nextId, pos, radius, block) {
    for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
            const dist = Math.sqrt(x * x + z * z);
            if (dist <= radius) {
                primitives.push({
                    id: nextId(),
                    type: 'set',
                    pos: { x: pos.x + x, y: pos.y, z: pos.z + z },
                    block
                });
            }
        }
    }
}

export default towerTop;

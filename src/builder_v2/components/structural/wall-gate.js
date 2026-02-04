/**
 * Wall Gate Component
 *
 * Generates a gate/entrance in a wall section with optional portcullis and towers.
 * Suitable for castle and fortress entrances.
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "V2 Component Library Growth - Add wall_gate"
 */

/**
 * Generate a wall gate structure
 * @param {Object} params - Wall gate parameters
 * @param {Object} params.position - Base position (center bottom of gate)
 * @param {number} params.gateWidth - Width of the opening (default: 4)
 * @param {number} params.gateHeight - Height of the opening (default: 5)
 * @param {number} params.wallHeight - Total wall height (default: 8)
 * @param {number} params.wallWidth - Total wall width (default: 12)
 * @param {number} params.wallThickness - Thickness of wall (default: 2)
 * @param {boolean} params.portcullis - Include portcullis/iron bars (default: false)
 * @param {boolean} params.towers - Include flanking towers (default: false)
 * @param {number} params.towerRadius - Radius of towers (default: 3)
 * @param {number} params.towerHeight - Height of towers (default: wallHeight + 4)
 * @param {string} params.block - Main wall block (default: '$primary')
 * @param {string} params.portcullisBlock - Portcullis block (default: 'iron_bars')
 * @param {string} params.direction - 'ns' or 'ew' (default: 'ns')
 * @param {number} params.scale - Scale multiplier (default: 1)
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function wallGate(params) {
    const {
        position = { x: 0, y: 0, z: 0 },
        gateWidth = 4,
        gateHeight = 5,
        wallHeight = 8,
        wallWidth = 12,
        wallThickness = 2,
        portcullis = false,
        towers = false,
        towerRadius = 3,
        towerHeight = null,
        block = '$primary',
        portcullisBlock = 'iron_bars',
        direction = 'ns',
        scale = 1
    } = params;

    const primitives = [];
    let idCounter = 0;
    const nextId = () => `wall_gate_${idCounter++}`;

    // Apply scale
    const gw = Math.round(gateWidth * scale);
    const gh = Math.round(gateHeight * scale);
    const wh = Math.round(wallHeight * scale);
    const ww = Math.round(wallWidth * scale);
    const wt = Math.round(wallThickness * scale);
    const tr = Math.round(towerRadius * scale);
    const th = towerHeight !== null ? Math.round(towerHeight * scale) : wh + Math.round(4 * scale);

    const halfGateWidth = Math.floor(gw / 2);
    const halfWallWidth = Math.floor(ww / 2);

    // Helper to get position based on direction
    const getPos = (widthOffset, heightOffset, depthOffset) => {
        if (direction === 'ew') {
            return {
                x: position.x + depthOffset,
                y: position.y + heightOffset,
                z: position.z + widthOffset
            };
        } else {
            // ns (default)
            return {
                x: position.x + widthOffset,
                y: position.y + heightOffset,
                z: position.z + depthOffset
            };
        }
    };

    // Generate wall with opening
    for (let w = -halfWallWidth; w <= halfWallWidth; w++) {
        for (let h = 0; h < wh; h++) {
            for (let d = 0; d < wt; d++) {
                // Check if this position is in the gate opening
                const isInGateOpening = Math.abs(w) < halfGateWidth && h < gh;

                if (!isInGateOpening) {
                    primitives.push({
                        id: nextId(),
                        type: 'set',
                        pos: getPos(w, h, d),
                        block
                    });
                }
            }
        }
    }

    // Generate portcullis in the opening
    if (portcullis) {
        for (let w = -halfGateWidth + 1; w < halfGateWidth; w++) {
            for (let h = 0; h < gh; h++) {
                // Place at front of gate
                primitives.push({
                    id: nextId(),
                    type: 'set',
                    pos: getPos(w, h, 0),
                    block: portcullisBlock
                });
            }
        }
    }

    // Generate flanking towers
    if (towers) {
        const towerOffsets = [-halfWallWidth - tr, halfWallWidth + tr];

        for (const towerX of towerOffsets) {
            // Generate cylindrical tower
            for (let h = 0; h < th; h++) {
                for (let dx = -tr; dx <= tr; dx++) {
                    for (let dz = -tr; dz <= tr; dz++) {
                        // Check if within circular radius
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist <= tr) {
                            // Hollow interior (only place walls)
                            const isWall = dist > tr - 1.5;

                            if (isWall || h === 0 || h === th - 1) {
                                const pos = direction === 'ew'
                                    ? { x: position.x + dz, y: position.y + h, z: position.z + towerX + dx }
                                    : { x: position.x + towerX + dx, y: position.y + h, z: position.z + dz };

                                primitives.push({
                                    id: nextId(),
                                    type: 'set',
                                    pos,
                                    block
                                });
                            }
                        }
                    }
                }
            }

            // Add crenellations on top
            for (let dx = -tr; dx <= tr; dx++) {
                for (let dz = -tr; dz <= tr; dz++) {
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist <= tr && dist > tr - 1.5) {
                        // Alternating crenellations
                        if ((dx + dz) % 2 === 0) {
                            const pos = direction === 'ew'
                                ? { x: position.x + dz, y: position.y + th, z: position.z + towerX + dx }
                                : { x: position.x + towerX + dx, y: position.y + th, z: position.z + dz };

                            primitives.push({
                                id: nextId(),
                                type: 'set',
                                pos,
                                block
                            });
                        }
                    }
                }
            }
        }
    }

    return primitives;
}

export default wallGate;

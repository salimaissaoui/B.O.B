/**
 * Bridge Component
 *
 * Generates bridge structures with optional railings and support pillars.
 * Supports different directions and materials.
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "V2 Component Library Growth - Add bridge"
 */

/**
 * Generate a bridge structure
 * @param {Object} params - Bridge parameters
 * @param {Object} params.position - Base position (start of bridge)
 * @param {number} params.span - Length of the bridge (default: 10)
 * @param {number} params.width - Width of the walkway (default: 3)
 * @param {boolean} params.railings - Include railings (default: true)
 * @param {number} params.railingHeight - Height of railings (default: 1)
 * @param {boolean} params.supports - Include support pillars (default: false)
 * @param {number} params.supportHeight - Height of support pillars (default: 5)
 * @param {number} params.supportSpacing - Spacing between supports (default: 5)
 * @param {string} params.block - Main deck block (default: '$primary')
 * @param {string} params.railingBlock - Railing block (default: '$accent')
 * @param {string} params.supportBlock - Support pillar block (default: '$primary')
 * @param {string} params.direction - 'ns' (north-south) or 'ew' (east-west)
 * @param {number} params.scale - Scale multiplier (default: 1)
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function bridge(params) {
    const {
        position = { x: 0, y: 0, z: 0 },
        span = 10,
        width = 3,
        railings = true,
        railingHeight = 1,
        supports = false,
        supportHeight = 5,
        supportSpacing = 5,
        block = '$primary',
        railingBlock = '$accent',
        supportBlock = '$primary',
        direction = 'ns',
        scale = 1
    } = params;

    const primitives = [];
    let idCounter = 0;
    const nextId = () => `bridge_${idCounter++}`;

    // Apply scale
    const s = Math.round(span * scale);
    const w = Math.round(width * scale);
    const rh = Math.round(railingHeight * scale);
    const sh = Math.round(supportHeight * scale);
    const ss = Math.round(supportSpacing * scale);

    const halfWidth = Math.floor(w / 2);

    // Helper to get position based on direction
    const getPos = (lengthOffset, widthOffset, heightOffset) => {
        if (direction === 'ew') {
            return {
                x: position.x + lengthOffset,
                y: position.y + heightOffset,
                z: position.z + widthOffset
            };
        } else {
            // ns (default)
            return {
                x: position.x + widthOffset,
                y: position.y + heightOffset,
                z: position.z + lengthOffset
            };
        }
    };

    // Generate bridge deck
    for (let l = 0; l < s; l++) {
        for (let wOffset = -halfWidth; wOffset <= halfWidth; wOffset++) {
            primitives.push({
                id: nextId(),
                type: 'set',
                pos: getPos(l, wOffset, 0),
                block
            });
        }
    }

    // Generate railings
    if (railings) {
        for (let l = 0; l < s; l++) {
            // Left railing
            for (let h = 1; h <= rh; h++) {
                primitives.push({
                    id: nextId(),
                    type: 'set',
                    pos: getPos(l, -halfWidth, h),
                    block: railingBlock
                });
            }

            // Right railing
            for (let h = 1; h <= rh; h++) {
                primitives.push({
                    id: nextId(),
                    type: 'set',
                    pos: getPos(l, halfWidth, h),
                    block: railingBlock
                });
            }
        }
    }

    // Generate support pillars
    if (supports && sh > 0) {
        // Calculate support positions
        const supportPositions = [];

        // Start and end supports
        supportPositions.push(0);
        supportPositions.push(s - 1);

        // Middle supports based on spacing
        if (s > ss * 2) {
            for (let l = ss; l < s - ss; l += ss) {
                supportPositions.push(l);
            }
        }

        // Generate each support pillar
        for (const l of supportPositions) {
            // Full width pillars at this position
            for (let wOffset = -halfWidth; wOffset <= halfWidth; wOffset++) {
                for (let h = -sh; h < 0; h++) {
                    primitives.push({
                        id: nextId(),
                        type: 'set',
                        pos: getPos(l, wOffset, h),
                        block: supportBlock
                    });
                }
            }
        }
    }

    return primitives;
}

export default bridge;

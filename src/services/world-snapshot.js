/**
 * World Snapshot Service
 * Captures and compares world state for template/diff builds
 */

/**
 * Capture a region of the world as a block map
 * @param {Object} bot - Mineflayer bot instance
 * @param {Object} from - Start corner {x, y, z}
 * @param {Object} to - End corner {x, y, z}
 * @returns {Map<string, string>} - Map of "x,y,z" -> blockName
 */
export async function captureRegion(bot, from, to) {
    const blocks = new Map();

    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);
    const minY = Math.min(from.y, to.y);
    const maxY = Math.max(from.y, to.y);
    const minZ = Math.min(from.z, to.z);
    const maxZ = Math.max(from.z, to.z);

    const totalBlocks = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
    console.log(`📷 Capturing region: ${totalBlocks} blocks`);

    let captured = 0;
    for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
            for (let x = minX; x <= maxX; x++) {
                try {
                    const block = bot.blockAt({ x, y, z });
                    const key = `${x},${y},${z}`;
                    blocks.set(key, block?.name || 'air');
                    captured++;
                } catch (e) {
                    // Skip unloaded chunks
                }
            }
        }
    }

    console.log(`✓ Captured ${captured}/${totalBlocks} blocks`);
    return blocks;
}

/**
 * Compare expected blocks to actual world state
 * @param {Object} bot - Mineflayer bot instance  
 * @param {Array} expectedBlocks - Array of {x, y, z, block}
 * @param {Object} startPos - Build start position
 * @returns {Object} - Comparison result
 */
export function compareToWorld(bot, expectedBlocks, startPos) {
    const results = {
        total: expectedBlocks.length,
        matching: 0,
        mismatched: [],
        missing: [],
        errors: []
    };

    for (const expected of expectedBlocks) {
        const worldPos = {
            x: startPos.x + expected.x,
            y: startPos.y + expected.y,
            z: startPos.z + expected.z
        };

        try {
            const actual = bot.blockAt(worldPos);
            const actualName = actual?.name || 'air';

            if (actualName === expected.block) {
                results.matching++;
            } else {
                results.mismatched.push({
                    pos: worldPos,
                    expected: expected.block,
                    actual: actualName
                });
            }
        } catch (e) {
            results.errors.push({
                pos: worldPos,
                error: e.message
            });
        }
    }

    results.accuracy = results.total > 0
        ? (results.matching / results.total * 100).toFixed(1)
        : 100;

    return results;
}

/**
 * Generate repair operations for mismatched blocks
 * @param {Array} mismatched - Array of mismatched blocks from compareToWorld
 * @returns {Array} - Array of repair steps
 */
export function generateRepairSteps(mismatched) {
    return mismatched.map(m => ({
        op: 'set',
        pos: { x: m.pos.x, y: m.pos.y, z: m.pos.z },
        block: m.expected
    }));
}

/**
 * Verify build completion by sampling
 * @param {Object} bot - Mineflayer bot
 * @param {Array} expectedBlocks - Expected block placements
 * @param {Object} startPos - Start position
 * @param {number} sampleSize - Number of blocks to sample (default: 10)
 */
export function verifyBuildSample(bot, expectedBlocks, startPos, sampleSize = 10) {
    if (expectedBlocks.length === 0) {
        return { verified: true, sampleSize: 0, matches: 0 };
    }

    // Pick random sample
    const sampleIndices = [];
    const maxSample = Math.min(sampleSize, expectedBlocks.length);

    while (sampleIndices.length < maxSample) {
        const idx = Math.floor(Math.random() * expectedBlocks.length);
        if (!sampleIndices.includes(idx)) {
            sampleIndices.push(idx);
        }
    }

    let matches = 0;
    const failures = [];

    for (const idx of sampleIndices) {
        const expected = expectedBlocks[idx];
        const worldPos = {
            x: startPos.x + expected.x,
            y: startPos.y + expected.y,
            z: startPos.z + expected.z
        };

        try {
            const actual = bot.blockAt(worldPos);
            if (actual?.name === expected.block) {
                matches++;
            } else {
                failures.push({
                    expected: expected.block,
                    actual: actual?.name || 'air',
                    pos: worldPos
                });
            }
        } catch (e) {
            failures.push({ pos: worldPos, error: e.message });
        }
    }

    const accuracy = (matches / maxSample * 100).toFixed(1);
    console.log(`  Build verification: ${matches}/${maxSample} samples passed (${accuracy}%)`);

    return {
        verified: matches === maxSample,
        sampleSize: maxSample,
        matches,
        accuracy: parseFloat(accuracy),
        failures
    };
}

export default {
    captureRegion,
    compareToWorld,
    generateRepairSteps,
    verifyBuildSample
};

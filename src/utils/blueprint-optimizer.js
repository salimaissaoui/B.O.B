/**
 * Blueprint Optimizer
 * Post-processes generated blueprints to merge and optimize operations
 */

/**
 * Operation name mappings for common LLM mistakes
 */
const OP_MAPPINGS = {
    'walls': 'we_walls',
    'cylinder': 'we_cylinder',
    'sphere': 'we_sphere',
    'pyramid': 'we_pyramid',
    'hollow': 'we_walls',
    'solid': 'we_fill',
    'cube': 'box',
    'rectangle': 'box'
};

/**
 * Fixes negative coordinates by applying Math.abs()
 */
function fixCoordinates(coords) {
    if (!coords || typeof coords !== 'object') return coords;

    return {
        x: Math.max(0, coords.x ?? 0),
        y: Math.max(0, coords.y ?? 0),
        z: Math.max(0, coords.z ?? 0)
    };
}

/**
 * Fixes an individual step
 */
function fixStep(step) {
    if (!step || typeof step !== 'object') return step;

    const fixed = { ...step };

    // Fix operation name
    if (OP_MAPPINGS[fixed.op]) {
        console.log(`  🔧 Op fix: ${fixed.op} → ${OP_MAPPINGS[fixed.op]}`);
        fixed.op = OP_MAPPINGS[fixed.op];
    }

    // Fix coordinates
    if (fixed.from) fixed.from = fixCoordinates(fixed.from);
    if (fixed.to) fixed.to = fixCoordinates(fixed.to);
    if (fixed.pos) fixed.pos = fixCoordinates(fixed.pos);
    if (fixed.base) fixed.base = fixCoordinates(fixed.base);
    if (fixed.center) fixed.center = fixCoordinates(fixed.center);

    return fixed;
}

/**
 * Attempts to merge adjacent same-block 'set' operations into a single 'we_fill'
 */
function mergeAdjacentSets(steps) {
    const result = [];
    let setBuffer = [];

    for (const step of steps) {
        if (step.op === 'set' && step.pos && step.block) {
            setBuffer.push(step);
        } else {
            // Flush buffer and emit merged operation if we have enough sets
            if (setBuffer.length >= 3) {
                const merged = tryMergeSets(setBuffer);
                result.push(...merged);
            } else {
                result.push(...setBuffer);
            }
            setBuffer = [];
            result.push(step);
        }
    }

    // Final flush
    if (setBuffer.length >= 3) {
        result.push(...tryMergeSets(setBuffer));
    } else {
        result.push(...setBuffer);
    }

    return result;
}

/**
 * Try to merge a buffer of set operations into we_fill operations
 */
function tryMergeSets(sets) {
    if (sets.length < 3) return sets;

    // Group by block type
    const byBlock = {};
    for (const s of sets) {
        const key = s.block;
        if (!byBlock[key]) byBlock[key] = [];
        byBlock[key].push(s);
    }

    const result = [];

    for (const [block, blockSets] of Object.entries(byBlock)) {
        if (blockSets.length < 3) {
            result.push(...blockSets);
            continue;
        }

        // Find bounding box
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const s of blockSets) {
            minX = Math.min(minX, s.pos.x);
            minY = Math.min(minY, s.pos.y);
            minZ = Math.min(minZ, s.pos.z);
            maxX = Math.max(maxX, s.pos.x);
            maxY = Math.max(maxY, s.pos.y);
            maxZ = Math.max(maxZ, s.pos.z);
        }

        // Check if bounding box matches set count (dense fill)
        const volume = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);

        if (volume === blockSets.length) {
            // Perfect match - merge into we_fill
            console.log(`  📦 Merged ${blockSets.length} set ops → 1 we_fill`);
            result.push({
                op: 'we_fill',
                from: { x: minX, y: minY, z: minZ },
                to: { x: maxX, y: maxY, z: maxZ },
                block
            });
        } else {
            // Not a perfect fill, keep individual sets
            result.push(...blockSets);
        }
    }

    return result;
}

/**
 * Main optimizer function
 * @param {Object} blueprint - Generated blueprint
 * @returns {Object} - Optimized blueprint
 */
export function optimizeBlueprint(blueprint) {
    if (!blueprint || !blueprint.steps || !Array.isArray(blueprint.steps)) {
        return blueprint;
    }

    console.log(`🔧 Optimizing blueprint (${blueprint.steps.length} steps)...`);

    // Step 1: Fix each step (coords, op names)
    let steps = blueprint.steps.map(fixStep);

    // Step 2: Merge adjacent set operations
    steps = mergeAdjacentSets(steps);

    const saved = blueprint.steps.length - steps.length;
    if (saved > 0) {
        console.log(`  ✨ Optimization saved ${saved} operations`);
    }

    return {
        ...blueprint,
        steps,
        optimized: true
    };
}

export default optimizeBlueprint;

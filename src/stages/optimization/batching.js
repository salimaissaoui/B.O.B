/**
 * Logical Batching Optimizer (RLE)
 * 
 * Replaces complex 3D rectangle solvers with a "Common Sense" Linear Scanner.
 * Groups contiguous lines of blocks into WorldEdit commands.
 * 
 * LOGIC:
 * 1. Sort blocks by Y (layers) -> Z (rows) -> X (columns).
 * 2. Scan linearly along X axis.
 * 3. If we find > 10 identical blocks in a row, group them.
 * 4. Otherwise, leave them as single blocks.
 */

export function optimizeBlockGroups(blocks, minBatchSize = 10) {
    if (!blocks || blocks.length === 0) {
        return { weOperations: [], remainingBlocks: [] };
    }

    // 1. Sort blocks deterministically (Y -> Z -> X)
    // This allows us to find horizontal lines easily
    const sorted = [...blocks].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        if (a.z !== b.z) return a.z - b.z;
        return a.x - b.x;
    });

    const weOperations = [];
    const remainingBlocks = [];
    const processedIndices = new Set();

    let i = 0;
    while (i < sorted.length) {
        const startBlock = sorted[i];
        let j = i + 1;

        // Look ahead for a continuous run
        while (j < sorted.length) {
            const nextBlock = sorted[j];

            // Check continuity:
            // 1. Same Block Type
            // 2. Same Y and Z level
            // 3. X is exactly previous + 1 (contiguous)
            const isContiguous =
                nextBlock.block === startBlock.block &&
                nextBlock.y === startBlock.y &&
                nextBlock.z === startBlock.z &&
                nextBlock.x === sorted[j - 1].x + 1;

            if (!isContiguous) break;
            j++;
        }

        const length = j - i;

        // Decision: Batch or Pass?
        if (length >= minBatchSize) {
            // Create a WorldEdit operation for this line
            const endBlock = sorted[j - 1];
            weOperations.push({
                command: 'fill', // Internal WE command type
                from: { x: startBlock.x, y: startBlock.y, z: startBlock.z },
                to: { x: endBlock.x, y: endBlock.y, z: endBlock.z },
                block: startBlock.block,
                count: length
            });
            // Mark these as processed (implicitly, by advancing i to j)
        } else {
            // Too small, keep as single blocks
            for (let k = i; k < j; k++) {
                remainingBlocks.push(sorted[k]);
            }
        }

        // Advance index
        i = j;
    }

    return { weOperations, remainingBlocks };
}

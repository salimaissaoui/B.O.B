/**
 * Multi-Axis Batching Optimizer (Enhanced RLE)
 *
 * Groups contiguous blocks into efficient WorldEdit commands along X, Y, and Z axes.
 *
 * IMPROVEMENTS:
 * - Now scans all three axes (X, Y, Z) instead of just X
 * - Chooses the longest continuous run regardless of axis
 * - Significantly reduces WorldEdit command count for vertical and depth structures
 *
 * LOGIC:
 * 1. For each block, scan in all 3 directions (X, Y, Z)
 * 2. Find the longest continuous run of identical blocks
 * 3. If run >= minBatchSize, create WorldEdit operation
 * 4. Otherwise, leave as single blocks
 */

import { optimize2DRectangles, detectPlane } from './greedy-rectangles.js';

export function optimizeBlockGroups(blocks, minBatchSize = 5, options = {}) {
  // Check if blocks form a 2D plane (pixel art optimization)
  if (options.use2DOptimization !== false && blocks.length > 10) {
    const plane = detectPlane(blocks);
    const zSet = new Set(blocks.map(b => b.z));
    const ySet = new Set(blocks.map(b => b.y));
    const xSet = new Set(blocks.map(b => b.x));

    // If one axis is constant, use 2D rectangle optimization
    if (zSet.size === 1 || ySet.size === 1 || xSet.size === 1) {
      return optimize2DRectangles(blocks, plane);
    }
  }

  // Fall through to standard 1D optimization
  return optimizeBlockGroups1D(blocks, minBatchSize);
}

function optimizeBlockGroups1D(blocks, minBatchSize = 5) {
    if (!blocks || blocks.length === 0) {
        return { weOperations: [], remainingBlocks: [] };
    }

    const weOperations = [];
    const remainingBlocks = [];
    const processed = new Set();

    // Create a lookup map for fast block access by coordinates
    const blockMap = new Map();
    for (const block of blocks) {
        const key = `${block.x},${block.y},${block.z}`;
        blockMap.set(key, block);
    }

    // Helper to get block at coordinate
    const getBlock = (x, y, z) => {
        return blockMap.get(`${x},${y},${z}`);
    };

    // Helper to mark blocks as processed
    const markProcessed = (startX, startY, startZ, endX, endY, endZ) => {
        for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
            for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y++) {
                for (let z = Math.min(startZ, endZ); z <= Math.max(startZ, endZ); z++) {
                    processed.add(`${x},${y},${z}`);
                }
            }
        }
    };

    // Helper to check if block is processed
    const isProcessed = (x, y, z) => {
        return processed.has(`${x},${y},${z}`);
    };

    // Scan for runs along each axis
    for (const startBlock of blocks) {
        const key = `${startBlock.x},${startBlock.y},${startBlock.z}`;

        if (processed.has(key)) continue;

        const { x: startX, y: startY, z: startZ, block: blockType } = startBlock;

        // Find longest run along X-axis
        let xLen = 1;
        while (true) {
            const next = getBlock(startX + xLen, startY, startZ);
            if (!next || next.block !== blockType || isProcessed(startX + xLen, startY, startZ)) break;
            xLen++;
        }

        // Find longest run along Y-axis
        let yLen = 1;
        while (true) {
            const next = getBlock(startX, startY + yLen, startZ);
            if (!next || next.block !== blockType || isProcessed(startX, startY + yLen, startZ)) break;
            yLen++;
        }

        // Find longest run along Z-axis
        let zLen = 1;
        while (true) {
            const next = getBlock(startX, startY, startZ + zLen);
            if (!next || next.block !== blockType || isProcessed(startX, startY, startZ + zLen)) break;
            zLen++;
        }

        // Choose the longest axis
        const maxLen = Math.max(xLen, yLen, zLen);

        if (maxLen >= minBatchSize) {
            // Create WorldEdit operation for the longest run
            let from, to, count;

            if (maxLen === xLen) {
                // X-axis run
                from = { x: startX, y: startY, z: startZ };
                to = { x: startX + xLen - 1, y: startY, z: startZ };
                count = xLen;
                markProcessed(startX, startY, startZ, startX + xLen - 1, startY, startZ);
            } else if (maxLen === yLen) {
                // Y-axis run
                from = { x: startX, y: startY, z: startZ };
                to = { x: startX, y: startY + yLen - 1, z: startZ };
                count = yLen;
                markProcessed(startX, startY, startZ, startX, startY + yLen - 1, startZ);
            } else {
                // Z-axis run
                from = { x: startX, y: startY, z: startZ };
                to = { x: startX, y: startY, z: startZ + zLen - 1 };
                count = zLen;
                markProcessed(startX, startY, startZ, startX, startY, startZ + zLen - 1);
            }

            weOperations.push({
                command: 'fill',
                from,
                to,
                block: blockType,
                count,
                axis: maxLen === xLen ? 'X' : (maxLen === yLen ? 'Y' : 'Z')
            });
        } else {
            // Too small, keep as single block
            if (!isProcessed(startX, startY, startZ)) {
                remainingBlocks.push(startBlock);
                processed.add(key);
            }
        }
    }

    return { weOperations, remainingBlocks };
}

/**
 * Advanced 2D Plane Batching (Optional Enhancement)
 *
 * For very large flat structures, this can batch entire planes/rectangles.
 * Currently not used but available for future optimization.
 */
export function optimizeBlockGroupsAdvanced(blocks, minBatchSize = 10) {
    if (!blocks || blocks.length === 0) {
        return { weOperations: [], remainingBlocks: [] };
    }

    // First pass: Try 1D linear runs (existing logic)
    const linearResult = optimizeBlockGroups(blocks, minBatchSize);

    // Second pass: Try to find 2D rectangular regions in remaining blocks
    // (This would require more complex rectangle-finding algorithms)
    // For now, just return the linear result
    return linearResult;
}

/**
 * Stats helper for debugging batching performance
 */
export function getBatchingStats(weOperations, remainingBlocks) {
    const totalOriginal = weOperations.reduce((sum, op) => sum + op.count, 0) + remainingBlocks.length;
    const batchedBlocks = weOperations.reduce((sum, op) => sum + op.count, 0);
    const batchPercentage = totalOriginal > 0 ? ((batchedBlocks / totalOriginal) * 100).toFixed(1) : 0;

    const axisCounts = { X: 0, Y: 0, Z: 0 };
    for (const op of weOperations) {
        if (op.axis) axisCounts[op.axis]++;
    }

    return {
        totalBlocks: totalOriginal,
        batchedBlocks,
        remainingBlocks: remainingBlocks.length,
        weCommands: weOperations.length,
        batchPercentage: `${batchPercentage}%`,
        compressionRatio: weOperations.length > 0 ? (batchedBlocks / weOperations.length).toFixed(1) : 0,
        axisCounts
    };
}

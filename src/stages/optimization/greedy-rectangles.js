/**
 * 2D Greedy Rectangle Optimizer for Pixel Art
 *
 * Converts pixel art blocks into efficient WorldEdit rectangle fills.
 * Reduces 100+ single-block placements into ~5-10 rectangle operations.
 *
 * Algorithm:
 * 1. Sort blocks by color
 * 2. For each color, find maximal rectangles using greedy algorithm
 * 3. Convert rectangles to WorldEdit //set commands
 */

/**
 * Optimize 2D blocks into rectangles using greedy algorithm
 * @param {Array} blocks - Array of blocks {x, y, z, block}
 * @param {string} plane - The plane to optimize ('XY', 'XZ', 'YZ')
 * @returns {Object} { weOperations, remainingBlocks }
 */
export function optimize2DRectangles(blocks, plane = 'XY') {
  if (!blocks || blocks.length === 0) {
    return { weOperations: [], remainingBlocks: [] };
  }

  // Detect plane automatically if not specified
  const detectedPlane = detectPlane(blocks);
  const effectivePlane = plane || detectedPlane;

  // Group blocks by color (block type)
  const colorGroups = groupByColor(blocks);

  const weOperations = [];
  const remainingBlocks = [];

  for (const [blockType, colorBlocks] of Object.entries(colorGroups)) {
    // Find rectangles for this color
    const { rectangles, leftover } = findMaximalRectangles(colorBlocks, effectivePlane);

    // Convert rectangles to WE operations
    for (const rect of rectangles) {
      weOperations.push({
        command: 'fill',
        from: rect.from,
        to: rect.to,
        block: blockType,
        count: rect.count,
        isRectangle: true
      });
    }

    // Keep leftover blocks for individual placement
    remainingBlocks.push(...leftover);
  }

  return { weOperations, remainingBlocks };
}

/**
 * Detect which plane the blocks lie on
 * @param {Array} blocks - Block array
 * @returns {string} Detected plane ('XY', 'XZ', 'YZ')
 */
export function detectPlane(blocks) {
  if (blocks.length < 2) return 'XY';

  // Check variance in each axis
  const xSet = new Set(blocks.map(b => b.x));
  const ySet = new Set(blocks.map(b => b.y));
  const zSet = new Set(blocks.map(b => b.z));

  // If one axis has only one value, blocks are on that plane
  if (zSet.size === 1) return 'XY';
  if (ySet.size === 1) return 'XZ';
  if (xSet.size === 1) return 'YZ';

  // Default to XY (typical pixel art orientation)
  return 'XY';
}

/**
 * Group blocks by their block type
 * @param {Array} blocks - Block array
 * @returns {Object} { blockType: [blocks] }
 */
function groupByColor(blocks) {
  const groups = {};
  for (const block of blocks) {
    const key = block.block;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(block);
  }
  return groups;
}

/**
 * Find maximal rectangles using greedy algorithm
 * @param {Array} blocks - Blocks of same color
 * @param {string} plane - The 2D plane to work in
 * @returns {Object} { rectangles, leftover }
 */
function findMaximalRectangles(blocks, plane) {
  const rectangles = [];
  const leftover = [];

  // Create a coordinate lookup set
  const blockSet = new Map();
  for (const block of blocks) {
    const key = coordKey(block, plane);
    blockSet.set(key, block);
  }

  const processed = new Set();

  // Process blocks in order (top-left to bottom-right for XY)
  const sortedBlocks = [...blocks].sort((a, b) => {
    const [ax1, ax2] = getPlaneCoords(a, plane);
    const [bx1, bx2] = getPlaneCoords(b, plane);
    if (ax2 !== bx2) return ax2 - bx2; // Sort by second axis first
    return ax1 - bx1; // Then by first axis
  });

  for (const block of sortedBlocks) {
    const key = coordKey(block, plane);
    if (processed.has(key)) continue;

    // Try to expand into a maximal rectangle starting from this block
    const rect = expandRectangle(block, blockSet, processed, plane);

    if (rect.count >= 12) {
      // Worth batching: 12+ blocks (justifies the overhead of 3-4 WE commands)
      rectangles.push(rect);
      // Mark all blocks in rectangle as processed
      markRectangleProcessed(rect, processed, plane);
    } else {
      // Too small, leave for individual placement
      leftover.push(block);
      processed.add(key);
    }
  }

  return { rectangles, leftover };
}

/**
 * Expand from a starting block to find the maximal rectangle
 */
function expandRectangle(startBlock, blockSet, processed, plane) {
  const [startX, startY] = getPlaneCoords(startBlock, plane);
  const fixedCoord = getFixedCoord(startBlock, plane);

  let maxX = startX;
  let maxY = startY;

  // Expand in first axis direction
  while (true) {
    const key = makeKey(maxX + 1, startY, fixedCoord, plane);
    if (blockSet.has(key) && !processed.has(key)) {
      maxX++;
    } else {
      break;
    }
  }

  // Expand in second axis direction (checking full rows)
  outer: while (true) {
    // Check if entire row exists
    for (let x = startX; x <= maxX; x++) {
      const key = makeKey(x, maxY + 1, fixedCoord, plane);
      if (!blockSet.has(key) || processed.has(key)) {
        break outer;
      }
    }
    maxY++;
  }

  // Calculate rectangle bounds in 3D
  const count = (maxX - startX + 1) * (maxY - startY + 1);

  return {
    from: makeCoord3D(startX, startY, fixedCoord, plane),
    to: makeCoord3D(maxX, maxY, fixedCoord, plane),
    count,
    width: maxX - startX + 1,
    height: maxY - startY + 1
  };
}

/**
 * Mark all positions in a rectangle as processed
 */
function markRectangleProcessed(rect, processed, plane) {
  const [fromX, fromY] = getPlaneCoords(rect.from, plane);
  const [toX, toY] = getPlaneCoords(rect.to, plane);
  const fixedCoord = getFixedCoord(rect.from, plane);

  for (let x = fromX; x <= toX; x++) {
    for (let y = fromY; y <= toY; y++) {
      processed.add(makeKey(x, y, fixedCoord, plane));
    }
  }
}

/**
 * Get 2D coordinates based on plane
 */
function getPlaneCoords(block, plane) {
  switch (plane) {
    case 'XY': return [block.x, block.y];
    case 'XZ': return [block.x, block.z];
    case 'YZ': return [block.y, block.z];
    default: return [block.x, block.y];
  }
}

/**
 * Get the fixed coordinate (perpendicular to plane)
 */
function getFixedCoord(block, plane) {
  switch (plane) {
    case 'XY': return block.z;
    case 'XZ': return block.y;
    case 'YZ': return block.x;
    default: return block.z;
  }
}

/**
 * Create coordinate key for lookup
 */
function coordKey(block, plane) {
  const [x, y] = getPlaneCoords(block, plane);
  const fixed = getFixedCoord(block, plane);
  return `${x},${y},${fixed}`;
}

/**
 * Make a key from separate coordinates
 */
function makeKey(x, y, fixed, plane) {
  return `${x},${y},${fixed}`;
}

/**
 * Convert 2D coords + fixed back to 3D coordinate object
 */
function makeCoord3D(coord1, coord2, fixed, plane) {
  switch (plane) {
    case 'XY': return { x: coord1, y: coord2, z: fixed };
    case 'XZ': return { x: coord1, y: fixed, z: coord2 };
    case 'YZ': return { x: fixed, y: coord1, z: coord2 };
    default: return { x: coord1, y: coord2, z: fixed };
  }
}

/**
 * Get batching statistics for debugging
 */
export function getRectangleBatchingStats(weOperations, remainingBlocks) {
  const totalBatched = weOperations.reduce((sum, op) => sum + op.count, 0);
  const totalOriginal = totalBatched + remainingBlocks.length;

  return {
    totalBlocks: totalOriginal,
    batchedIntoRectangles: totalBatched,
    rectangleCount: weOperations.length,
    remainingSingleBlocks: remainingBlocks.length,
    batchPercentage: totalOriginal > 0
      ? ((totalBatched / totalOriginal) * 100).toFixed(1) + '%'
      : '0%',
    avgBlocksPerRectangle: weOperations.length > 0
      ? (totalBatched / weOperations.length).toFixed(1)
      : 0
  };
}

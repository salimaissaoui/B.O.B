/**
 * Performance Metrics Tracking
 * Tracks build performance and optimization statistics
 */

export class PerformanceMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    this.buildStats = {
      totalBlocks: 0,
      batchedBlocks: 0,
      individualBlocks: 0,
      worldEditOps: 0,
      vanillaOps: 0,
      startTime: null,
      endTime: null,
      batchingSavings: {
        blocksOptimized: 0,
        operationsSaved: 0,
        percentageOptimized: 0
      },
      // NEW: Enhanced observability fields
      finalDimensions: { width: 0, height: 0, depth: 0 },
      uniqueBlockCount: 0,
      uniqueBlocks: [],
      worldEditUsage: {
        spheres: 0,
        cylinders: 0,
        fills: 0,
        walls: 0,
        pyramids: 0,
        replaces: 0,
        totalCommands: 0
      },
      approximateBlockCount: 0
    };
  }

  startBuild() {
    this.reset();
    this.buildStats.startTime = Date.now();
  }

  endBuild() {
    this.buildStats.endTime = Date.now();
    this.calculateFinalMetrics();
  }

  recordBatching(totalBlocks, batchedBlocks, batchOpsCount) {
    this.buildStats.totalBlocks += totalBlocks;
    this.buildStats.batchedBlocks += batchedBlocks;
    this.buildStats.individualBlocks += (totalBlocks - batchedBlocks);
    this.buildStats.worldEditOps += batchOpsCount;

    // Calculate savings: each batch op replaces multiple individual ops
    const blocksSaved = batchedBlocks;
    const opsSaved = batchedBlocks - batchOpsCount; // Each block would be 1 op

    this.buildStats.batchingSavings.blocksOptimized += blocksSaved;
    this.buildStats.batchingSavings.operationsSaved += opsSaved;
  }

  recordVanillaOperation() {
    this.buildStats.vanillaOps++;
  }

  /**
   * Record final build dimensions
   * @param {Object} dimensions - { width, height, depth }
   */
  recordDimensions(dimensions) {
    if (dimensions) {
      this.buildStats.finalDimensions = {
        width: dimensions.width || 0,
        height: dimensions.height || 0,
        depth: dimensions.depth || 0
      };
      // Calculate approximate block count (volume)
      this.buildStats.approximateBlockCount =
        this.buildStats.finalDimensions.width *
        this.buildStats.finalDimensions.height *
        this.buildStats.finalDimensions.depth;
    }
  }

  /**
   * Record palette/block usage
   * @param {Object|Array} palette - Palette object or array of blocks
   */
  recordPalette(palette) {
    if (!palette) return;

    let blocks = [];
    if (Array.isArray(palette)) {
      blocks = palette;
    } else if (typeof palette === 'object') {
      blocks = Object.values(palette);
    }

    this.buildStats.uniqueBlocks = [...new Set(blocks)];
    this.buildStats.uniqueBlockCount = this.buildStats.uniqueBlocks.length;
  }

  /**
   * Record WorldEdit operation by type
   * @param {string} opType - Operation type (sphere, cylinder, fill, walls, pyramid, replace)
   */
  recordWorldEditOp(opType) {
    const typeMap = {
      'we_sphere': 'spheres',
      'sphere': 'spheres',
      'we_cylinder': 'cylinders',
      'cylinder': 'cylinders',
      'we_fill': 'fills',
      'fill': 'fills',
      'we_walls': 'walls',
      'walls': 'walls',
      'we_pyramid': 'pyramids',
      'pyramid': 'pyramids',
      'we_replace': 'replaces',
      'replace': 'replaces'
    };

    const category = typeMap[opType];
    if (category && this.buildStats.worldEditUsage[category] !== undefined) {
      this.buildStats.worldEditUsage[category]++;
    }
    this.buildStats.worldEditUsage.totalCommands++;
    this.buildStats.worldEditOps++;
  }

  calculateFinalMetrics() {
    if (this.buildStats.totalBlocks > 0) {
      this.buildStats.batchingSavings.percentageOptimized =
        ((this.buildStats.batchedBlocks / this.buildStats.totalBlocks) * 100).toFixed(1);
    }
  }

  getBuildTime() {
    if (!this.buildStats.startTime || !this.buildStats.endTime) return 0;
    return ((this.buildStats.endTime - this.buildStats.startTime) / 1000).toFixed(1);
  }

  getStats() {
    return {
      ...this.buildStats,
      buildTimeSeconds: this.getBuildTime(),
      totalOperations: this.buildStats.worldEditOps + this.buildStats.vanillaOps,
      // Ensure new fields are included
      finalDimensions: this.buildStats.finalDimensions,
      uniqueBlockCount: this.buildStats.uniqueBlockCount,
      uniqueBlocks: this.buildStats.uniqueBlocks,
      worldEditUsage: this.buildStats.worldEditUsage,
      approximateBlockCount: this.buildStats.approximateBlockCount
    };
  }

  printSummary() {
    const stats = this.getStats();

    console.log(`\n┌─────────────────────────────────────────────────────────`);
    console.log(`│ BUILD METRICS`);
    console.log(`├─────────────────────────────────────────────────────────`);

    // Dimensions
    const dims = stats.finalDimensions;
    if (dims.width > 0 || dims.height > 0 || dims.depth > 0) {
      console.log(`│ Dimensions: ${dims.width}x${dims.height}x${dims.depth}`);
    }

    // Unique blocks
    if (stats.uniqueBlockCount > 0) {
      const blockList = stats.uniqueBlocks.slice(0, 6).join(', ');
      const suffix = stats.uniqueBlocks.length > 6 ? `, +${stats.uniqueBlocks.length - 6} more` : '';
      console.log(`│ Unique Blocks: ${stats.uniqueBlockCount} (${blockList}${suffix})`);
    }

    // Approximate block count
    if (stats.approximateBlockCount > 0) {
      console.log(`│ Approx Block Count: ~${stats.approximateBlockCount.toLocaleString()}`);
    }

    console.log(`│ Total Blocks Placed: ${stats.totalBlocks}`);
    console.log(`│ Build Time: ${stats.buildTimeSeconds}s`);

    console.log(`├─────────────────────────────────────────────────────────`);
    console.log(`│ Operations:`);
    console.log(`│   WorldEdit: ${stats.worldEditOps} ops`);
    console.log(`│   Vanilla: ${stats.vanillaOps} ops`);
    console.log(`│   Total: ${stats.totalOperations} ops`);

    // WorldEdit usage breakdown
    const weUsage = stats.worldEditUsage;
    if (weUsage && weUsage.totalCommands > 0) {
      console.log(`├─────────────────────────────────────────────────────────`);
      console.log(`│ WorldEdit Usage:`);
      const weBreakdown = [];
      if (weUsage.spheres > 0) weBreakdown.push(`Spheres: ${weUsage.spheres}`);
      if (weUsage.cylinders > 0) weBreakdown.push(`Cylinders: ${weUsage.cylinders}`);
      if (weUsage.fills > 0) weBreakdown.push(`Fills: ${weUsage.fills}`);
      if (weUsage.walls > 0) weBreakdown.push(`Walls: ${weUsage.walls}`);
      if (weUsage.pyramids > 0) weBreakdown.push(`Pyramids: ${weUsage.pyramids}`);
      if (weUsage.replaces > 0) weBreakdown.push(`Replaces: ${weUsage.replaces}`);
      console.log(`│   ${weBreakdown.join(', ')}`);
      console.log(`│   Total WE Commands: ${weUsage.totalCommands}`);
    }

    console.log(`├─────────────────────────────────────────────────────────`);
    console.log(`│ Batching Optimization:`);
    console.log(`│   Blocks Batched: ${stats.batchedBlocks} (${stats.batchingSavings.percentageOptimized}%)`);
    console.log(`│   Operations Saved: ${stats.batchingSavings.operationsSaved}`);

    if (stats.batchingSavings.operationsSaved > 0) {
      const efficiency = ((1 - (stats.totalOperations / (stats.totalOperations + stats.batchingSavings.operationsSaved))) * 100).toFixed(1);
      console.log(`│   Efficiency Gain: ${efficiency}%`);
    }

    console.log(`└─────────────────────────────────────────────────────────\n`);
  }

  // Get a compact one-line summary
  getCompactSummary() {
    const stats = this.getStats();
    const dims = stats.finalDimensions;
    const dimsStr = dims.width > 0 ? `${dims.width}x${dims.height}x${dims.depth}, ` : '';
    return `${dimsStr}${stats.totalBlocks} blocks, ${stats.totalOperations} ops, ${stats.buildTimeSeconds}s (${stats.batchingSavings.percentageOptimized}% batched)`;
  }
}

// Singleton instance
export const buildMetrics = new PerformanceMetrics();

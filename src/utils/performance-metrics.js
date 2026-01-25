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
      }
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
      totalOperations: this.buildStats.worldEditOps + this.buildStats.vanillaOps
    };
  }

  printSummary() {
    const stats = this.getStats();

    console.log(`\n┌─────────────────────────────────────────────────────────`);
    console.log(`│ 📊 BUILD PERFORMANCE METRICS`);
    console.log(`├─────────────────────────────────────────────────────────`);
    console.log(`│ Total Blocks: ${stats.totalBlocks}`);
    console.log(`│ Build Time: ${stats.buildTimeSeconds}s`);
    console.log(`├─────────────────────────────────────────────────────────`);
    console.log(`│ Operations:`);
    console.log(`│   WorldEdit: ${stats.worldEditOps} ops`);
    console.log(`│   Vanilla: ${stats.vanillaOps} ops`);
    console.log(`│   Total: ${stats.totalOperations} ops`);
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
    return `${stats.totalBlocks} blocks, ${stats.totalOperations} ops, ${stats.buildTimeSeconds}s (${stats.batchingSavings.percentageOptimized}% batched)`;
  }
}

// Singleton instance
export const buildMetrics = new PerformanceMetrics();

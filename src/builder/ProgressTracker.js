/**
 * ProgressTracker
 *
 * Handles build progress tracking, reporting, and metrics:
 * - Progress updates with rate/ETA
 * - Build report generation
 * - Status queries
 */
export class ProgressTracker {
  constructor() {
    this.progressUpdateInterval = 10; // Emit progress every N blocks
  }

  /**
   * Emit progress update if interval reached
   */
  emitProgressUpdate(currentBuild) {
    if (!currentBuild) return;

    const totalBlocks = currentBuild.blocksPlaced + currentBuild.blocksFailed + currentBuild.blocksSkipped;

    if (totalBlocks - currentBuild.lastProgressUpdate >= this.progressUpdateInterval) {
      const elapsed = (Date.now() - currentBuild.startTime) / 1000;
      const rate = currentBuild.blocksPlaced / elapsed || 0;

      const estimatedTotal = currentBuild.blueprint?.steps?.length || totalBlocks;
      const remaining = Math.max(0, estimatedTotal - totalBlocks);
      const eta = remaining > 0 && rate > 0 ? remaining / rate : 0;

      const percentage = estimatedTotal > 0 ? ((totalBlocks / estimatedTotal) * 100).toFixed(1) : 0;

      console.log(`  Progress: ${totalBlocks} blocks (${percentage}%) | Placed: ${currentBuild.blocksPlaced} | Failed: ${currentBuild.blocksFailed} | Rate: ${rate.toFixed(1)}/s | ETA: ${eta.toFixed(0)}s`);

      currentBuild.lastProgressUpdate = totalBlocks;
    }
  }

  /**
   * Get build progress summary
   */
  getProgress(currentBuild, isBuilding) {
    if (!currentBuild) {
      return null;
    }

    const elapsed = Date.now() - currentBuild.startTime;
    const rate = currentBuild.blocksPlaced / (elapsed / 1000) || 0;

    return {
      blocksPlaced: currentBuild.blocksPlaced,
      blocksFailed: currentBuild.blocksFailed || 0,
      blocksSkipped: currentBuild.blocksSkipped || 0,
      worldEditOps: currentBuild.worldEditOpsExecuted || 0,
      fallbacksUsed: currentBuild.fallbacksUsed || 0,
      warnings: currentBuild.warnings || [],
      elapsedTime: elapsed,
      blocksPerSecond: rate,
      isBuilding
    };
  }

  /**
   * Generate structured build report
   */
  generateBuildReport(blueprint, startPos, duration, buildHistory, currentBuild) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: parseFloat(duration),
      startPosition: startPos,
      blueprint: {
        buildType: blueprint.buildType,
        size: blueprint.size,
        steps: blueprint.steps.length,
        palette: blueprint.palette
      },
      execution: {
        blocksPlaced: currentBuild?.blocksPlaced || 0,
        blocksFailed: currentBuild?.blocksFailed || 0,
        blocksSkipped: currentBuild?.blocksSkipped || 0,
        worldEditOps: currentBuild?.worldEditOpsExecuted || 0,
        fallbacksUsed: currentBuild?.fallbacksUsed || 0,
        vanillaBlocks: buildHistory.length
      },
      success: !currentBuild?.warnings?.length,
      warnings: currentBuild?.warnings || [],
      metrics: {
        blocksPerSecond: currentBuild?.blocksPlaced / parseFloat(duration) || 0
      }
    };

    console.log('┌─────────────────────────────────────────────────────────');
    console.log('│ BUILD REPORT');
    console.log('├─────────────────────────────────────────────────────────');
    console.log(`│ Type: ${report.blueprint.buildType}`);
    console.log(`│ Size: ${report.blueprint.size.width}x${report.blueprint.size.height}x${report.blueprint.size.depth}`);
    console.log(`│ Duration: ${report.duration}s`);
    console.log(`│ Blocks: ${report.execution.blocksPlaced} (${report.metrics.blocksPerSecond.toFixed(1)}/s)`);
    console.log(`│ Success: ${report.success ? '✓' : '⚠'}`);
    console.log('└─────────────────────────────────────────────────────────');

    return report;
  }

  /**
   * Print completion summary
   */
  printCompletionSummary(currentBuild) {
    if (!currentBuild) return;

    const duration = ((Date.now() - currentBuild.startTime) / 1000).toFixed(1);
    const weOps = currentBuild.worldEditOpsExecuted;
    const fallbacks = currentBuild.fallbacksUsed;
    const warnings = currentBuild.warnings.length;
    const failed = currentBuild.blocksFailed || 0;
    const skipped = currentBuild.blocksSkipped || 0;

    console.log(`✓ Build completed in ${duration}s`);
    console.log(`  Blocks placed: ${currentBuild.blocksPlaced}`);
    if (failed > 0) console.log(`  Blocks failed: ${failed}`);
    if (skipped > 0) console.log(`  Blocks skipped: ${skipped}`);
    console.log(`  WorldEdit ops: ${weOps}`);
    if (fallbacks > 0) console.log(`  Fallbacks used: ${fallbacks}`);

    if (warnings > 0) {
      console.log(`  Warnings: ${warnings}`);
      currentBuild.warnings.forEach((w, idx) => {
        console.log(`    ${idx + 1}. Step ${w.step}: ${w.errorType} - ${w.message}`);
      });
    }

    return duration;
  }
}

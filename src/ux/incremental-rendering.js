/**
 * Incremental Rendering
 *
 * Provides real-time feedback during block placement.
 * Shows progress as blocks are placed, not just at completion.
 *
 * CLAUDE.md Contract:
 * - Priority 1 UX: "Incremental Rendering"
 */

/**
 * Render progress snapshot
 */
export class RenderProgress {
    constructor(data) {
        this.blocksPlaced = data.blocksPlaced || 0;
        this.totalBlocks = data.totalBlocks || 0;
        this.blocksFailed = data.blocksFailed || 0;
        this.elapsedMs = data.elapsedMs || 0;
    }

    /**
     * Get completion percentage
     * @returns {number} Percentage (0-100)
     */
    getPercentage() {
        if (this.totalBlocks === 0) return 0;
        return Math.round((this.blocksPlaced / this.totalBlocks) * 100);
    }

    /**
     * Get success rate
     * @returns {number} Success rate percentage
     */
    getSuccessRate() {
        const total = this.blocksPlaced + this.blocksFailed;
        if (total === 0) return 100;
        return Math.round((this.blocksPlaced / total) * 1000) / 10;
    }

    /**
     * Get blocks per second rate
     * @returns {number} Blocks per second
     */
    getBlocksPerSecond() {
        if (this.elapsedMs === 0) return 0;
        return Math.round((this.blocksPlaced / this.elapsedMs) * 1000);
    }

    /**
     * Get estimated remaining time
     * @returns {number} Estimated ms remaining
     */
    getEstimatedRemainingMs() {
        const rate = this.getBlocksPerSecond();
        if (rate === 0) return Infinity;

        const remaining = this.totalBlocks - this.blocksPlaced;
        return (remaining / rate) * 1000;
    }
}

/**
 * Render batch update
 */
export class RenderBatch {
    constructor(data) {
        this.startIndex = data.startIndex || 0;
        this.endIndex = data.endIndex || 0;
        this.blockType = data.blockType || null;
        this.success = data.success !== false;
        this.region = data.region || null;
    }

    /**
     * Get number of blocks in batch
     * @returns {number} Block count
     */
    getBlockCount() {
        return this.endIndex - this.startIndex + 1;
    }

    /**
     * Check if batch was successful
     * @returns {boolean} Success status
     */
    isSuccess() {
        return this.success;
    }

    /**
     * Get batch start index
     * @returns {number} Start index
     */
    getStartIndex() {
        return this.startIndex;
    }

    /**
     * Get batch end index
     * @returns {number} End index
     */
    getEndIndex() {
        return this.endIndex;
    }

    /**
     * Get batch region
     * @returns {Object|null} Region bounds
     */
    getRegion() {
        return this.region;
    }
}

/**
 * Create a render callback function
 * @param {Function} handler - Handler function for progress updates
 * @returns {Function} Callback function
 */
export function createRenderCallback(handler) {
    return (update) => {
        handler(update);
    };
}

/**
 * Incremental Renderer for real-time block placement feedback
 */
export class IncrementalRenderer {
    constructor(options = {}) {
        this.updateInterval = options.updateInterval !== undefined ? options.updateInterval : 100;
        this.listeners = [];
        this.reset();
    }

    /**
     * Reset internal state
     * @private
     */
    reset() {
        this.totalBlocks = 0;
        this.blocksPlaced = 0;
        this.blocksFailed = 0;
        this.startTime = 0;
        this.lastUpdateTime = 0;
        this.running = false;
        this.paused = false;
        this.pauseStartTime = 0;
        this.totalPauseTime = 0;
        this.lastUpdate = null;
    }

    /**
     * Register an update listener
     * @param {Function} callback - Callback function
     */
    onUpdate(callback) {
        this.listeners.push(callback);
    }

    /**
     * Emit update to all listeners
     * @private
     */
    _emitUpdate(forceEmit = false) {
        if (!this.running || this.paused) return;

        const now = Date.now();

        // Throttle updates unless forced
        if (!forceEmit && this.updateInterval > 0) {
            if (now - this.lastUpdateTime < this.updateInterval) {
                return;
            }
        }

        this.lastUpdateTime = now;

        const update = {
            progress: this.getProgress(),
            blocksPlaced: this.blocksPlaced,
            blocksFailed: this.blocksFailed,
            totalBlocks: this.totalBlocks,
            elapsedMs: this.getElapsedMs(),
            estimatedRemainingMs: this._estimateRemaining(),
            complete: this.isComplete()
        };

        this.lastUpdate = update;

        for (const listener of this.listeners) {
            listener(update);
        }
    }

    /**
     * Estimate remaining time
     * @private
     */
    _estimateRemaining() {
        const elapsed = this.getElapsedMs();
        if (elapsed === 0 || this.blocksPlaced === 0) {
            return Infinity;
        }

        const rate = this.blocksPlaced / elapsed;
        const remaining = this.totalBlocks - this.blocksPlaced;
        return remaining / rate;
    }

    /**
     * Start rendering session
     * @param {number} totalBlocks - Total blocks to place
     */
    start(totalBlocks) {
        this.reset();
        this.totalBlocks = totalBlocks;
        this.startTime = Date.now();
        this.running = true;
        this._emitUpdate(true);
    }

    /**
     * Stop rendering session
     */
    stop() {
        this.running = false;
    }

    /**
     * Pause rendering
     */
    pause() {
        if (!this.paused) {
            this.paused = true;
            this.pauseStartTime = Date.now();
        }
    }

    /**
     * Resume rendering
     */
    resume() {
        if (this.paused) {
            this.totalPauseTime += Date.now() - this.pauseStartTime;
            this.paused = false;
        }
    }

    /**
     * Report single block placed
     * @param {Object} position - Block position {x, y, z}
     * @param {string} block - Block type
     */
    blockPlaced(position, block) {
        this.blocksPlaced++;

        // Force emit on first block or completion
        const forceEmit = this.blocksPlaced === 1 || this.isComplete();
        this._emitUpdate(forceEmit);
    }

    /**
     * Report batch of blocks placed
     * @param {number} count - Number of blocks placed
     */
    batchPlaced(count) {
        const wasZero = this.blocksPlaced === 0;
        this.blocksPlaced += count;

        // Force emit on first batch or completion
        const forceEmit = wasZero || this.isComplete();
        this._emitUpdate(forceEmit);
    }

    /**
     * Report failed block placement
     * @param {Object} position - Block position
     * @param {string} block - Block type
     * @param {string} reason - Failure reason
     */
    blockFailed(position, block, reason) {
        this.blocksFailed++;
        this._emitUpdate();
    }

    /**
     * Get current progress percentage
     * @returns {number} Progress (0-100)
     */
    getProgress() {
        if (this.totalBlocks === 0) return 0;
        return Math.round((this.blocksPlaced / this.totalBlocks) * 100);
    }

    /**
     * Get blocks placed count
     * @returns {number} Blocks placed
     */
    getBlocksPlaced() {
        return this.blocksPlaced;
    }

    /**
     * Get blocks failed count
     * @returns {number} Blocks failed
     */
    getBlocksFailed() {
        return this.blocksFailed;
    }

    /**
     * Get total blocks
     * @returns {number} Total blocks
     */
    getTotalBlocks() {
        return this.totalBlocks;
    }

    /**
     * Get success rate
     * @returns {number} Success rate percentage
     */
    getSuccessRate() {
        const total = this.blocksPlaced + this.blocksFailed;
        if (total === 0) return 100;
        return Math.round((this.blocksPlaced / total) * 1000) / 10;
    }

    /**
     * Check if rendering is complete
     * @returns {boolean} True if complete
     */
    isComplete() {
        return this.blocksPlaced >= this.totalBlocks;
    }

    /**
     * Get elapsed time in ms
     * @returns {number} Elapsed ms
     */
    getElapsedMs() {
        if (this.startTime === 0) return 0;
        const now = this.paused ? this.pauseStartTime : Date.now();
        return now - this.startTime - this.totalPauseTime;
    }

    /**
     * Get last update object
     * @returns {Object|null} Last update
     */
    getLastUpdate() {
        return this.lastUpdate;
    }

    /**
     * Get final summary
     * @returns {Object} Summary stats
     */
    getSummary() {
        return {
            totalBlocks: this.totalBlocks,
            blocksPlaced: this.blocksPlaced,
            blocksFailed: this.blocksFailed,
            successRate: this.getSuccessRate(),
            elapsedMs: this.getElapsedMs(),
            complete: this.isComplete()
        };
    }
}

export default IncrementalRenderer;

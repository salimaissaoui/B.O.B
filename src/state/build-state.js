/**
 * Build State Manager
 *
 * Manages persistence and recovery of build state for crash recovery.
 * Saves build progress to disk so interrupted builds can be resumed.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_STATE_DIR = join(__dirname, '../../bob-state');
const MAX_STATE_FILES = 10; // Keep only last 10 build states

/**
 * Build State Manager Class
 * Handles saving, loading, and resuming build state
 */
export class BuildStateManager {
  constructor(stateDir = DEFAULT_STATE_DIR) {
    this.stateDir = stateDir;
    this.currentBuildId = null;
    this.currentState = null;
    this.autoSaveEnabled = true;
    this.saveInterval = 10; // Save every N blocks

    // Ensure state directory exists
    this.ensureStateDir();
  }

  /**
   * Ensure the state directory exists
   */
  ensureStateDir() {
    try {
      if (!existsSync(this.stateDir)) {
        mkdirSync(this.stateDir, { recursive: true });
        console.log(`✓ Created state directory: ${this.stateDir}`);
      }
    } catch (error) {
      console.warn(`⚠ Failed to create state directory: ${error.message}`);
    }
  }

  /**
   * Start tracking a new build
   * @param {Object} blueprint - Build blueprint
   * @param {Object} startPos - Build start position
   * @returns {string} Build ID
   */
  startBuild(blueprint, startPos) {
    this.currentBuildId = randomUUID();
    this.currentState = {
      buildId: this.currentBuildId,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      startPos: { ...startPos },
      blueprint: {
        buildType: blueprint.buildType,
        size: { ...blueprint.size },
        palette: blueprint.palette,
        stepsCount: blueprint.steps.length
      },
      progress: {
        currentStep: 0,
        blocksPlaced: 0,
        blocksFailed: 0,
        completedSteps: [],
        worldEditOps: 0
      },
      undoHistory: [],
      worldEditHistory: [],
      status: 'in_progress'
    };

    // Initial save
    this.saveState();
    console.log(`  [State] Build started: ${this.currentBuildId}`);

    return this.currentBuildId;
  }

  /**
   * Update build progress
   * @param {Object} progress - Progress update
   */
  updateProgress(progress) {
    if (!this.currentState) return;

    Object.assign(this.currentState.progress, progress);
    this.currentState.lastUpdated = new Date().toISOString();

    // Auto-save periodically
    if (this.autoSaveEnabled &&
        this.currentState.progress.blocksPlaced % this.saveInterval === 0) {
      this.saveState();
    }
  }

  /**
   * Mark a step as completed
   * @param {number} stepIndex - Step index that was completed
   */
  completeStep(stepIndex) {
    if (!this.currentState) return;

    this.currentState.progress.currentStep = stepIndex + 1;
    if (!this.currentState.progress.completedSteps.includes(stepIndex)) {
      this.currentState.progress.completedSteps.push(stepIndex);
    }
    this.currentState.lastUpdated = new Date().toISOString();

    // Always save after step completion
    this.saveState();
  }

  /**
   * Add to undo history (vanilla blocks)
   * @param {Array} blocks - Array of {pos, previousBlock}
   */
  addToUndoHistory(blocks) {
    if (!this.currentState) return;

    this.currentState.undoHistory.push(...blocks);

    // Limit undo history size
    const maxUndoBlocks = 10000;
    if (this.currentState.undoHistory.length > maxUndoBlocks) {
      this.currentState.undoHistory = this.currentState.undoHistory.slice(-maxUndoBlocks);
    }
  }

  /**
   * Add WorldEdit operation to history
   * @param {Object} operation - WorldEdit operation details
   */
  addWorldEditHistory(operation) {
    if (!this.currentState) return;

    this.currentState.worldEditHistory.push({
      ...operation,
      timestamp: new Date().toISOString()
    });
    this.currentState.progress.worldEditOps++;
  }

  /**
   * Mark build as completed
   */
  completeBuild() {
    if (!this.currentState) return;

    this.currentState.status = 'completed';
    this.currentState.completedAt = new Date().toISOString();
    this.currentState.lastUpdated = new Date().toISOString();

    this.saveState();
    console.log(`  [State] Build completed: ${this.currentBuildId}`);

    // Clean up old state files
    this.cleanupOldStates();
  }

  /**
   * Mark build as failed
   * @param {string} reason - Failure reason
   */
  failBuild(reason) {
    if (!this.currentState) return;

    this.currentState.status = 'failed';
    this.currentState.failedAt = new Date().toISOString();
    this.currentState.failureReason = reason;
    this.currentState.lastUpdated = new Date().toISOString();

    this.saveState();
    console.log(`  [State] Build failed: ${this.currentBuildId} - ${reason}`);
  }

  /**
   * Save current state to disk
   */
  saveState() {
    if (!this.currentState || !this.currentBuildId) return;

    try {
      const filename = `build-${this.currentBuildId}.json`;
      const filepath = join(this.stateDir, filename);

      writeFileSync(filepath, JSON.stringify(this.currentState, null, 2));
    } catch (error) {
      console.warn(`⚠ Failed to save build state: ${error.message}`);
    }
  }

  /**
   * Load build state from disk
   * @param {string} buildId - Build ID to load
   * @returns {Object|null} Build state or null if not found
   */
  loadState(buildId) {
    try {
      const filename = `build-${buildId}.json`;
      const filepath = join(this.stateDir, filename);

      if (!existsSync(filepath)) {
        return null;
      }

      const data = readFileSync(filepath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`⚠ Failed to load build state: ${error.message}`);
      return null;
    }
  }

  /**
   * Get the most recent incomplete build
   * @returns {Object|null} Most recent incomplete build state
   */
  getLastIncompleteBuild() {
    try {
      const files = readdirSync(this.stateDir)
        .filter(f => f.startsWith('build-') && f.endsWith('.json'))
        .sort()
        .reverse();

      for (const file of files) {
        const filepath = join(this.stateDir, file);
        const data = readFileSync(filepath, 'utf-8');
        const state = JSON.parse(data);

        if (state.status === 'in_progress') {
          return state;
        }
      }

      return null;
    } catch (error) {
      console.warn(`⚠ Failed to find incomplete build: ${error.message}`);
      return null;
    }
  }

  /**
   * Get list of all saved builds
   * @returns {Array} List of build summaries
   */
  listSavedBuilds() {
    try {
      const files = readdirSync(this.stateDir)
        .filter(f => f.startsWith('build-') && f.endsWith('.json'))
        .sort()
        .reverse();

      const builds = [];
      for (const file of files) {
        const filepath = join(this.stateDir, file);
        const data = readFileSync(filepath, 'utf-8');
        const state = JSON.parse(data);

        builds.push({
          buildId: state.buildId,
          startedAt: state.startedAt,
          status: state.status,
          buildType: state.blueprint?.buildType,
          progress: `${state.progress?.blocksPlaced || 0} blocks`
        });
      }

      return builds;
    } catch (error) {
      console.warn(`⚠ Failed to list builds: ${error.message}`);
      return [];
    }
  }

  /**
   * Resume an interrupted build
   * @param {string} buildId - Build ID to resume (or null for most recent)
   * @returns {Object|null} Resume data or null if not resumable
   */
  prepareBuildResume(buildId = null) {
    const state = buildId
      ? this.loadState(buildId)
      : this.getLastIncompleteBuild();

    if (!state) {
      return null;
    }

    if (state.status !== 'in_progress') {
      console.log(`  [State] Build ${state.buildId} is ${state.status}, not resumable`);
      return null;
    }

    // Set as current state for tracking
    this.currentBuildId = state.buildId;
    this.currentState = state;

    return {
      buildId: state.buildId,
      startPos: state.startPos,
      blueprint: state.blueprint,
      resumeFromStep: state.progress.currentStep,
      completedSteps: state.progress.completedSteps,
      blocksPlacedSoFar: state.progress.blocksPlaced,
      undoHistory: state.undoHistory,
      worldEditHistory: state.worldEditHistory
    };
  }

  /**
   * Delete a saved build state
   * @param {string} buildId - Build ID to delete
   */
  deleteState(buildId) {
    try {
      const filename = `build-${buildId}.json`;
      const filepath = join(this.stateDir, filename);

      if (existsSync(filepath)) {
        unlinkSync(filepath);
        console.log(`  [State] Deleted build state: ${buildId}`);
      }
    } catch (error) {
      console.warn(`⚠ Failed to delete build state: ${error.message}`);
    }
  }

  /**
   * Clean up old state files (keep only most recent N)
   */
  cleanupOldStates() {
    try {
      const files = readdirSync(this.stateDir)
        .filter(f => f.startsWith('build-') && f.endsWith('.json'))
        .sort()
        .reverse();

      // Keep only completed/failed builds that are old
      const toDelete = files.slice(MAX_STATE_FILES);
      for (const file of toDelete) {
        const filepath = join(this.stateDir, file);
        unlinkSync(filepath);
      }

      if (toDelete.length > 0) {
        console.log(`  [State] Cleaned up ${toDelete.length} old state files`);
      }
    } catch (error) {
      console.warn(`⚠ Failed to cleanup old states: ${error.message}`);
    }
  }

  /**
   * Get current state summary
   */
  getCurrentStateSummary() {
    if (!this.currentState) {
      return null;
    }

    return {
      buildId: this.currentBuildId,
      status: this.currentState.status,
      startedAt: this.currentState.startedAt,
      progress: {
        step: `${this.currentState.progress.currentStep}/${this.currentState.blueprint.stepsCount}`,
        blocks: this.currentState.progress.blocksPlaced,
        failed: this.currentState.progress.blocksFailed,
        worldEditOps: this.currentState.progress.worldEditOps
      }
    };
  }

  /**
   * Reset manager state (for new build)
   */
  reset() {
    this.currentBuildId = null;
    this.currentState = null;
  }
}

// Export singleton instance for convenience
export const buildStateManager = new BuildStateManager();

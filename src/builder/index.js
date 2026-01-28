/**
 * Builder Module Index
 *
 * Organized builder components for the B.O.B build system.
 * The main Builder class in `src/stages/5-builder.js` orchestrates these modules.
 *
 * Module Responsibilities:
 * - PositioningManager: World positions, teleporting, obstruction scouting, site clearing
 * - VanillaExecutor: /setblock logic, retry, verification, station-based/sequential execution
 * - BatchOptimizer: Build order, RLE batching, 2D rectangle batching
 * - ProgressTracker: Progress updates, ETA, build reports
 * - StateManager: Build persistence, crash recovery (re-exported from src/state/build-state.js)
 * - BuildStationManager: Station calculation for reduced pathfinding (from src/positioning/)
 */

export { PositioningManager } from './PositioningManager.js';
export { VanillaExecutor } from './VanillaExecutor.js';
export { BatchOptimizer } from './BatchOptimizer.js';
export { ProgressTracker } from './ProgressTracker.js';
export { BuildStateManager } from '../state/build-state.js';
export { BuildStationManager } from '../positioning/BuildStationManager.js';

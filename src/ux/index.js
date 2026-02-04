/**
 * UX Module Index
 *
 * Exports for user experience features.
 */

export {
    ProgressReporter,
    BuildPhase,
    ProgressEvent,
    ProgressEventType
} from './progress-reporter.js';

export {
    BuildPreview,
    generatePreview,
    formatPreviewMessage,
    estimateBuildTime
} from './build-preview.js';

export {
    FailureFastPath,
    QuickValidationResult,
    detectImpossibleBuild,
    checkPromptFeasibility,
    QUICK_FAIL_REASONS
} from './failure-fast-path.js';

export {
    IncrementalRenderer,
    RenderProgress,
    RenderBatch,
    createRenderCallback
} from './incremental-rendering.js';

/**
 * Progress Reporter
 *
 * Reports build progress through all phases with streaming support.
 * Enables real-time feedback during LLM generation and build execution.
 *
 * CLAUDE.md Contract:
 * - Priority 1 UX: "Streaming Progress"
 */

/**
 * Build phases enum
 */
export const BuildPhase = {
    ANALYZING: 'analyzing',
    GENERATING: 'generating',
    VALIDATING: 'validating',
    BUILDING: 'building',
    COMPLETE: 'complete',
    FAILED: 'failed'
};

/**
 * Phase labels for display
 */
const PHASE_LABELS = {
    [BuildPhase.ANALYZING]: 'Analyzing request',
    [BuildPhase.GENERATING]: 'Generating blueprint',
    [BuildPhase.VALIDATING]: 'Validating blueprint',
    [BuildPhase.BUILDING]: 'Building structure',
    [BuildPhase.COMPLETE]: 'Build complete',
    [BuildPhase.FAILED]: 'Build failed'
};

/**
 * Progress event types
 */
export const ProgressEventType = {
    PHASE_START: 'phase_start',
    PHASE_COMPLETE: 'phase_complete',
    PROGRESS_UPDATE: 'progress_update',
    STREAM_TEXT: 'stream_text',
    ERROR: 'error',
    WARNING: 'warning'
};

/**
 * Progress event class
 */
export class ProgressEvent {
    constructor(type, phase, data = {}) {
        this.type = type;
        this.phase = phase;
        this.timestamp = Date.now();
        Object.assign(this, data);
    }
}

/**
 * Progress Reporter for build operations
 */
export class ProgressReporter {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.currentPhase = null;
        this.currentProgress = 0;
        this.streamedText = '';
        this.phaseStartTimes = new Map();
        this.phaseDurations = new Map();
        this.error = null;
        this.startTime = 0;
    }

    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Register a one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }
        this.onceListeners.get(event).push(callback);
    }

    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit an event to all listeners
     * @private
     */
    _emit(event, data) {
        // Regular listeners
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                callback(data);
            }
        }

        // Once listeners
        if (this.onceListeners.has(event)) {
            const callbacks = this.onceListeners.get(event);
            this.onceListeners.set(event, []);
            for (const callback of callbacks) {
                callback(data);
            }
        }
    }

    /**
     * Start a build phase
     * @param {string} phase - Phase from BuildPhase enum
     */
    startPhase(phase) {
        if (this.currentPhase && this.currentPhase !== BuildPhase.FAILED) {
            // Complete previous phase if not already
            if (!this.phaseDurations.has(this.currentPhase)) {
                this.completePhase(this.currentPhase);
            }
        }

        this.currentPhase = phase;
        this.currentProgress = 0;
        this.streamedText = '';
        this.phaseStartTimes.set(phase, Date.now());

        if (this.startTime === 0) {
            this.startTime = Date.now();
        }

        const event = new ProgressEvent(ProgressEventType.PHASE_START, phase);
        this._emit('progress', event);
    }

    /**
     * Complete a build phase
     * @param {string} phase - Phase from BuildPhase enum
     */
    completePhase(phase) {
        const startTime = this.phaseStartTimes.get(phase) || Date.now();
        const duration = Date.now() - startTime;
        this.phaseDurations.set(phase, duration);

        const event = new ProgressEvent(ProgressEventType.PHASE_COMPLETE, phase, {
            duration
        });
        this._emit('progress', event);
    }

    /**
     * Update progress within current phase
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} message - Optional status message
     */
    updateProgress(percent, message = '') {
        this.currentProgress = Math.max(0, Math.min(100, percent));

        const event = new ProgressEvent(ProgressEventType.PROGRESS_UPDATE, this.currentPhase, {
            percent: this.currentProgress,
            message
        });
        this._emit('progress', event);
    }

    /**
     * Stream text chunk (for LLM responses)
     * @param {string} text - Text chunk to stream
     */
    streamText(text) {
        this.streamedText += text;

        const event = new ProgressEvent(ProgressEventType.STREAM_TEXT, this.currentPhase, {
            text,
            accumulated: this.streamedText
        });
        this._emit('progress', event);
    }

    /**
     * Report an error (transitions to FAILED phase)
     * @param {string} message - Error message
     * @param {string} code - Optional error code
     */
    reportError(message, code = null) {
        this.error = message;
        this.currentPhase = BuildPhase.FAILED;

        const event = new ProgressEvent(ProgressEventType.ERROR, BuildPhase.FAILED, {
            message,
            code
        });
        this._emit('progress', event);
    }

    /**
     * Report a warning (does not change phase)
     * @param {string} message - Warning message
     */
    reportWarning(message) {
        const event = new ProgressEvent(ProgressEventType.WARNING, this.currentPhase, {
            message
        });
        this._emit('progress', event);
    }

    /**
     * Get current phase
     * @returns {string} Current phase
     */
    getCurrentPhase() {
        return this.currentPhase;
    }

    /**
     * Get current progress percentage
     * @returns {number} Progress percentage
     */
    getCurrentProgress() {
        return this.currentProgress;
    }

    /**
     * Get accumulated streamed text
     * @returns {string} Streamed text
     */
    getStreamedText() {
        return this.streamedText;
    }

    /**
     * Get phase start time
     * @param {string} phase - Phase name
     * @returns {number} Start timestamp
     */
    getPhaseStartTime(phase) {
        return this.phaseStartTimes.get(phase) || 0;
    }

    /**
     * Get phase duration
     * @param {string} phase - Phase name
     * @returns {number} Duration in ms
     */
    getPhaseDuration(phase) {
        return this.phaseDurations.get(phase) || 0;
    }

    /**
     * Get human-readable phase label
     * @param {string} phase - Phase name
     * @returns {string} Phase label
     */
    getPhaseLabel(phase) {
        return PHASE_LABELS[phase] || phase;
    }

    /**
     * Get build summary
     * @returns {Object} Build summary
     */
    getSummary() {
        const totalDuration = this.startTime > 0 ? Date.now() - this.startTime : 0;

        const phases = {};
        for (const [phase, duration] of this.phaseDurations) {
            phases[phase] = { duration };
        }

        return {
            success: this.currentPhase !== BuildPhase.FAILED,
            totalDuration,
            phases,
            error: this.error
        };
    }
}

export default ProgressReporter;

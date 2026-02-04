/**
 * Failure Fast-Path
 *
 * Detects impossible or problematic builds early, before expensive
 * LLM calls or build execution.
 *
 * CLAUDE.md Contract:
 * - Priority 1 UX: "Failure Fast-Path"
 * - World boundaries: WORLD_MIN_Y = -64, WORLD_MAX_Y = 320
 * - maxHeight: 256, maxSteps: 2000
 */

// Default limits from CLAUDE.md
const DEFAULT_MAX_HEIGHT = 256;
const DEFAULT_MAX_STEPS = 2000;
const DEFAULT_MAX_BLOCKS = 5000000;
const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 320;

/**
 * Quick fail reason codes
 */
export const QUICK_FAIL_REASONS = {
    ZERO_DIMENSION: 'ZERO_DIMENSION',
    NEGATIVE_DIMENSION: 'NEGATIVE_DIMENSION',
    EXCEEDS_HEIGHT: 'EXCEEDS_HEIGHT',
    EXCEEDS_STEPS: 'EXCEEDS_STEPS',
    MISSING_BLOCK: 'MISSING_BLOCK',
    NO_OPERATIONS: 'NO_OPERATIONS',
    INVALID_BLOCK: 'INVALID_BLOCK',
    BELOW_WORLD: 'BELOW_WORLD',
    ABOVE_WORLD: 'ABOVE_WORLD'
};

/**
 * Quick validation result
 */
export class QuickValidationResult {
    constructor(valid, reason = null, warnings = []) {
        this.valid = valid;
        this.reason = reason;
        this.warnings = warnings;
    }

    /**
     * Check if build can proceed
     * @returns {boolean} True if can proceed
     */
    canProceed() {
        return this.valid;
    }

    /**
     * Get failure reason
     * @returns {string|null} Failure reason or null
     */
    getFailureReason() {
        return this.reason;
    }

    /**
     * Get warnings
     * @returns {string[]} Warning messages
     */
    getWarnings() {
        return this.warnings;
    }

    /**
     * Convert to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            valid: this.valid,
            reason: this.reason,
            warnings: this.warnings
        };
    }
}

/**
 * Check prompt feasibility before LLM call
 * @param {string} prompt - User prompt
 * @returns {Object} Feasibility result
 */
export function checkPromptFeasibility(prompt) {
    const warnings = [];
    const lowerPrompt = prompt.toLowerCase();

    // Check for impossible height requests
    const heightMatch = lowerPrompt.match(/y\s*[=:]\s*(\d+)/);
    if (heightMatch) {
        const y = parseInt(heightMatch[1], 10);
        if (y > WORLD_MAX_Y) {
            return {
                feasible: false,
                reason: `Requested height y=${y} exceeds world maximum (${WORLD_MAX_Y})`,
                warnings: []
            };
        }
    }

    // Check for negative Y that's too low
    const negYMatch = lowerPrompt.match(/y\s*[=:]\s*-(\d+)/);
    if (negYMatch) {
        const y = -parseInt(negYMatch[1], 10);
        if (y < WORLD_MIN_Y) {
            return {
                feasible: false,
                reason: `Requested height y=${y} is below world minimum (${WORLD_MIN_Y})`,
                warnings: []
            };
        }
    }

    // Check for extremely large dimension requests
    const dimensionMatch = lowerPrompt.match(/(\d+)\s*(?:block|blocks?)?\s*(?:tall|high|wide|long)/);
    if (dimensionMatch) {
        const size = parseInt(dimensionMatch[1], 10);
        if (size > 500) {
            warnings.push(`Requested size ${size} is very large and may take significant time`);
        }
    }

    // Warn about vague large-scale requests
    const largeScaleTerms = ['city', 'entire', 'massive', 'huge', 'giant', 'world'];
    for (const term of largeScaleTerms) {
        if (lowerPrompt.includes(term)) {
            warnings.push(`Build request contains "${term}" - consider specifying exact dimensions`);
            break;
        }
    }

    return {
        feasible: true,
        reason: null,
        warnings
    };
}

/**
 * Detect impossible builds from blueprint
 * @param {Object} blueprint - Blueprint to check
 * @param {Object} limits - Optional custom limits
 * @returns {Object} Detection result
 */
export function detectImpossibleBuild(blueprint, limits = {}) {
    const maxHeight = limits.maxHeight || DEFAULT_MAX_HEIGHT;
    const maxSteps = limits.maxSteps || DEFAULT_MAX_STEPS;
    const maxBlocks = limits.maxBlocks || DEFAULT_MAX_BLOCKS;

    const operations = blueprint.operations || [];
    const warnings = [];

    // Check for empty operations
    if (operations.length === 0) {
        return {
            valid: false,
            reason: QUICK_FAIL_REASONS.NO_OPERATIONS,
            warnings: []
        };
    }

    // Check for too many operations
    if (operations.length > maxSteps) {
        return {
            valid: false,
            reason: QUICK_FAIL_REASONS.EXCEEDS_STEPS,
            warnings: []
        };
    }

    // Check each operation
    let estimatedBlocks = 0;
    let maxY = 0;

    for (const op of operations) {
        // Check dimensions
        if (op.width !== undefined && op.width <= 0) {
            if (op.width < 0) {
                return { valid: false, reason: QUICK_FAIL_REASONS.NEGATIVE_DIMENSION, warnings: [] };
            }
            return { valid: false, reason: QUICK_FAIL_REASONS.ZERO_DIMENSION, warnings: [] };
        }
        if (op.height !== undefined && op.height <= 0) {
            if (op.height < 0) {
                return { valid: false, reason: QUICK_FAIL_REASONS.NEGATIVE_DIMENSION, warnings: [] };
            }
            return { valid: false, reason: QUICK_FAIL_REASONS.ZERO_DIMENSION, warnings: [] };
        }
        if (op.depth !== undefined && op.depth <= 0) {
            if (op.depth < 0) {
                return { valid: false, reason: QUICK_FAIL_REASONS.NEGATIVE_DIMENSION, warnings: [] };
            }
            return { valid: false, reason: QUICK_FAIL_REASONS.ZERO_DIMENSION, warnings: [] };
        }

        // Check for missing block on operations that need it
        const needsBlock = !['move', 'cursor_reset'].includes(op.type);
        if (needsBlock && !op.block) {
            return { valid: false, reason: QUICK_FAIL_REASONS.MISSING_BLOCK, warnings: [] };
        }

        // Calculate max Y
        const opY = (op.y || 0) + (op.height || 0);
        if (opY > maxY) {
            maxY = opY;
        }

        // Estimate blocks
        const w = op.width || 1;
        const h = op.height || 1;
        const d = op.depth || 1;
        estimatedBlocks += w * h * d;
    }

    // Check height limit
    if (maxY > maxHeight) {
        return {
            valid: false,
            reason: QUICK_FAIL_REASONS.EXCEEDS_HEIGHT,
            warnings: []
        };
    }

    // Warn about large block counts (> 50,000 blocks is considered large)
    if (estimatedBlocks > 50000) {
        warnings.push(`Estimated ${estimatedBlocks.toLocaleString()} blocks - large build`);
    }

    return {
        valid: true,
        reason: null,
        warnings
    };
}

/**
 * Failure Fast-Path validator class
 */
export class FailureFastPath {
    constructor(options = {}) {
        this.maxHeight = options.maxHeight || DEFAULT_MAX_HEIGHT;
        this.maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
        this.maxBlocks = options.maxBlocks || DEFAULT_MAX_BLOCKS;
    }

    /**
     * Validate a prompt before LLM call
     * @param {string} prompt - User prompt
     * @returns {QuickValidationResult} Validation result
     */
    validatePrompt(prompt) {
        const result = checkPromptFeasibility(prompt);
        return new QuickValidationResult(result.feasible, result.reason, result.warnings);
    }

    /**
     * Validate a blueprint before execution
     * @param {Object} blueprint - Blueprint to validate
     * @returns {QuickValidationResult} Validation result
     */
    validateBlueprint(blueprint) {
        const result = detectImpossibleBuild(blueprint, {
            maxHeight: this.maxHeight,
            maxSteps: this.maxSteps,
            maxBlocks: this.maxBlocks
        });
        return new QuickValidationResult(result.valid, result.reason, result.warnings);
    }
}

export default FailureFastPath;

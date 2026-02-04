/**
 * Build Preview
 *
 * Generates preview summaries of blueprints before execution.
 * Allows users to see dimensions, materials, and estimated time.
 *
 * CLAUDE.md Contract:
 * - Priority 1 UX: "Early Build Preview"
 */

// Block estimation multipliers by operation type
const BLOCK_MULTIPLIERS = {
    box: (op) => (op.width || 1) * (op.height || 1) * (op.depth || 1),
    outline: (op) => {
        const w = op.width || 1;
        const h = op.height || 1;
        const d = op.depth || 1;
        // Hollow box: perimeter * height + top/bottom floors
        return (2 * (w + d) - 4) * h + 2 * w * d;
    },
    wall: (op) => (op.width || 1) * (op.height || 1),
    stairs: (op) => op.count || (op.height || 1),
    slab: (op) => (op.width || 1) * (op.depth || 1),
    door: () => 2,
    window_strip: (op) => (op.width || 1) * (op.height || 1),
    fence_connect: (op) => op.length || 4,
    balcony: (op) => (op.width || 3) * (op.depth || 2),
    spiral_staircase: (op) => (op.height || 10) * 4,
    pixel_art: (op) => (op.width || 16) * (op.height || 16),
    three_d_layers: (op) => (op.width || 10) * (op.height || 10) * (op.depth || 10),
    smart_wall: (op) => (op.width || 1) * (op.height || 1),
    smart_floor: (op) => (op.width || 1) * (op.depth || 1),
    smart_roof: (op) => (op.width || 1) * (op.depth || 1) * 2,
    move: () => 0,
    cursor_reset: () => 0
};

// Default estimation for unknown operations
const DEFAULT_BLOCK_ESTIMATE = 10;

// WorldEdit blocks per second (approximate)
const WE_BLOCKS_PER_SECOND = 10000;
// Vanilla blocks per second (approximate)
const VANILLA_BLOCKS_PER_SECOND = 20;

/**
 * Generate a preview from a blueprint
 * @param {Object} blueprint - Blueprint to preview
 * @returns {Object} Preview summary
 */
export function generatePreview(blueprint) {
    const operations = blueprint.operations || [];

    if (operations.length === 0) {
        return {
            name: blueprint.name || 'Unknown Build',
            dimensions: { width: 0, height: 0, depth: 0 },
            estimatedBlocks: 0,
            materials: [],
            operationCount: 0
        };
    }

    // Calculate dimensions
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const op of operations) {
        const x = op.x || 0;
        const y = op.y || 0;
        const z = op.z || 0;
        const w = op.width || 1;
        const h = op.height || 1;
        const d = op.depth || 1;

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x + w);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y + h);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z + d);
    }

    // Handle case where no dimensions were found
    if (!isFinite(minX)) {
        minX = maxX = 0;
    }
    if (!isFinite(minY)) {
        minY = maxY = 0;
    }
    if (!isFinite(minZ)) {
        minZ = maxZ = 0;
    }

    // Collect unique materials
    const materials = new Set();
    for (const op of operations) {
        if (op.block) materials.add(op.block);
        if (op.frameBlock) materials.add(op.frameBlock);
        if (op.edgeBlock) materials.add(op.edgeBlock);
        if (op.supportBlock) materials.add(op.supportBlock);
    }

    // Estimate block count
    let estimatedBlocks = 0;
    for (const op of operations) {
        const estimator = BLOCK_MULTIPLIERS[op.type];
        if (estimator) {
            estimatedBlocks += estimator(op);
        } else {
            estimatedBlocks += DEFAULT_BLOCK_ESTIMATE;
        }
    }

    return {
        name: blueprint.name || 'Unknown Build',
        dimensions: {
            width: maxX - minX,
            height: maxY - minY,
            depth: maxZ - minZ
        },
        estimatedBlocks,
        materials: Array.from(materials),
        operationCount: operations.length
    };
}

/**
 * Estimate build time based on preview
 * @param {Object} preview - Preview object
 * @returns {number} Estimated time in milliseconds
 */
export function estimateBuildTime(preview) {
    if (preview.estimatedBlocks === 0) {
        return 0;
    }

    const blocksPerSecond = preview.useWorldEdit
        ? WE_BLOCKS_PER_SECOND
        : VANILLA_BLOCKS_PER_SECOND;

    return (preview.estimatedBlocks / blocksPerSecond) * 1000;
}

/**
 * Format preview as user-readable message
 * @param {Object} preview - Preview object
 * @returns {string} Formatted message
 */
export function formatPreviewMessage(preview) {
    const lines = [];

    // Header
    const name = preview.name || 'Build';
    lines.push(`📐 ${name} Preview`);
    lines.push('');

    // Dimensions
    const { width, height, depth } = preview.dimensions;
    lines.push(`Dimensions: ${width}x${height}x${depth} blocks`);

    // Block count
    lines.push(`Estimated blocks: ${preview.estimatedBlocks.toLocaleString()}`);

    // Materials
    if (preview.materials.length > 0) {
        const materialList = preview.materials.slice(0, 5).join(', ');
        const extra = preview.materials.length > 5
            ? ` +${preview.materials.length - 5} more`
            : '';
        lines.push(`Materials: ${materialList}${extra}`);
    }

    // Operations
    lines.push(`Operations: ${preview.operationCount}`);

    // Warning for large builds
    if (preview.estimatedBlocks > 50000) {
        lines.push('');
        lines.push('⚠️ This is a large build and may take some time.');
    }

    return lines.join('\n');
}

/**
 * Build Preview class for more detailed analysis
 */
export class BuildPreview {
    constructor(blueprint) {
        this.blueprint = blueprint;
        this.preview = generatePreview(blueprint);
    }

    /**
     * Get build name
     * @returns {string} Build name
     */
    getName() {
        return this.preview.name;
    }

    /**
     * Get estimated block count
     * @returns {number} Block count
     */
    getBlockCount() {
        return this.preview.estimatedBlocks;
    }

    /**
     * Get materials list
     * @returns {string[]} Materials
     */
    getMaterials() {
        return this.preview.materials;
    }

    /**
     * Get dimensions
     * @returns {Object} Dimensions {width, height, depth}
     */
    getDimensions() {
        return this.preview.dimensions;
    }

    /**
     * Get full summary
     * @returns {Object} Full preview summary
     */
    getSummary() {
        return { ...this.preview };
    }

    /**
     * Check if build exceeds block limit
     * @param {number} limit - Block limit
     * @returns {boolean} True if exceeds limit
     */
    exceedsBlockLimit(limit) {
        return this.preview.estimatedBlocks > limit;
    }

    /**
     * Check if build exceeds height limit
     * @param {number} limit - Height limit
     * @returns {boolean} True if exceeds limit
     */
    exceedsHeightLimit(limit) {
        return this.preview.dimensions.height > limit;
    }

    /**
     * Get formatted message
     * @returns {string} Formatted preview message
     */
    getFormattedMessage() {
        return formatPreviewMessage(this.preview);
    }

    /**
     * Estimate build time
     * @param {boolean} useWorldEdit - Whether WorldEdit is available
     * @returns {number} Estimated time in ms
     */
    estimateTime(useWorldEdit = true) {
        return estimateBuildTime({
            ...this.preview,
            useWorldEdit
        });
    }
}

export default BuildPreview;

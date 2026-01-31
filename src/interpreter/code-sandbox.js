/**
 * Code Sandbox
 * 
 * Provides the build API available to LLM-generated code.
 * All functions record operations into steps array for later execution.
 */

/**
 * Create a sandbox context with build API
 * @param {Object} options - Sandbox options
 * @returns {Object} Sandbox context with API and collected steps
 */
export function createSandbox(options = {}) {
    const steps = [];
    const errors = [];
    let iterationCount = 0;
    const maxIterations = options.maxIterations || 10000;

    // Track iteration to prevent infinite loops
    function checkIteration() {
        iterationCount++;
        if (iterationCount > maxIterations) {
            throw new Error(`Maximum iterations exceeded (${maxIterations})`);
        }
    }

    // Build API functions
    const api = {
        /**
         * Place a single block
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {number} z - Z coordinate
         * @param {string} block - Block type
         */
        place(x, y, z, block) {
            checkIteration();
            if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
                errors.push(`place: Invalid coordinates (${x}, ${y}, ${z})`);
                return;
            }
            if (typeof block !== 'string' || !block) {
                errors.push(`place: Invalid block type "${block}"`);
                return;
            }
            steps.push({
                op: 'set',
                pos: { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) },
                block: block.replace(/^minecraft:/, '')
            });
        },

        /**
         * Fill a rectangular region
         * @param {number} x1 - Start X
         * @param {number} y1 - Start Y
         * @param {number} z1 - Start Z
         * @param {number} x2 - End X
         * @param {number} y2 - End Y
         * @param {number} z2 - End Z
         * @param {string} block - Block type
         */
        fill(x1, y1, z1, x2, y2, z2, block) {
            checkIteration();
            steps.push({
                op: 'we_fill',
                start: {
                    x: Math.floor(Math.min(x1, x2)),
                    y: Math.floor(Math.min(y1, y2)),
                    z: Math.floor(Math.min(z1, z2))
                },
                end: {
                    x: Math.floor(Math.max(x1, x2)),
                    y: Math.floor(Math.max(y1, y2)),
                    z: Math.floor(Math.max(z1, z2))
                },
                block: block.replace(/^minecraft:/, '')
            });
        },

        /**
         * Create a box (hollow or solid)
         * @param {number} x1 - Start X
         * @param {number} y1 - Start Y
         * @param {number} z1 - Start Z
         * @param {number} x2 - End X
         * @param {number} y2 - End Y
         * @param {number} z2 - End Z
         * @param {string} block - Block type
         * @param {boolean} hollow - If true, only walls (default: false)
         */
        box(x1, y1, z1, x2, y2, z2, block, hollow = false) {
            checkIteration();
            steps.push({
                op: hollow ? 'we_walls' : 'we_fill',
                start: {
                    x: Math.floor(Math.min(x1, x2)),
                    y: Math.floor(Math.min(y1, y2)),
                    z: Math.floor(Math.min(z1, z2))
                },
                end: {
                    x: Math.floor(Math.max(x1, x2)),
                    y: Math.floor(Math.max(y1, y2)),
                    z: Math.floor(Math.max(z1, z2))
                },
                block: block.replace(/^minecraft:/, '')
            });
        },

        /**
         * Create a sphere
         * @param {number} cx - Center X
         * @param {number} cy - Center Y
         * @param {number} cz - Center Z
         * @param {number} radius - Radius
         * @param {string} block - Block type
         * @param {boolean} hollow - If true, only shell (default: false)
         */
        sphere(cx, cy, cz, radius, block, hollow = false) {
            checkIteration();
            steps.push({
                op: hollow ? 'we_hsphere' : 'we_sphere',
                center: { x: Math.floor(cx), y: Math.floor(cy), z: Math.floor(cz) },
                radius: Math.floor(radius),
                block: block.replace(/^minecraft:/, '')
            });
        },

        /**
         * Create a cylinder
         * @param {number} cx - Center X
         * @param {number} cy - Base Y
         * @param {number} cz - Center Z
         * @param {number} radius - Radius
         * @param {number} height - Height
         * @param {string} block - Block type
         * @param {boolean} hollow - If true, only walls (default: false)
         */
        cylinder(cx, cy, cz, radius, height, block, hollow = false) {
            checkIteration();
            steps.push({
                op: hollow ? 'we_hcyl' : 'we_cyl',
                center: { x: Math.floor(cx), y: Math.floor(cy), z: Math.floor(cz) },
                radius: Math.floor(radius),
                height: Math.floor(height),
                block: block.replace(/^minecraft:/, '')
            });
        },

        /**
         * Draw a line between two points
         * @param {number} x1 - Start X
         * @param {number} y1 - Start Y
         * @param {number} z1 - Start Z
         * @param {number} x2 - End X
         * @param {number} y2 - End Y
         * @param {number} z2 - End Z
         * @param {string} block - Block type
         */
        line(x1, y1, z1, x2, y2, z2, block) {
            checkIteration();
            steps.push({
                op: 'we_line',
                start: { x: Math.floor(x1), y: Math.floor(y1), z: Math.floor(z1) },
                end: { x: Math.floor(x2), y: Math.floor(y2), z: Math.floor(z2) },
                block: block.replace(/^minecraft:/, '')
            });
        },

        /**
         * Create a wall (2D rectangle in XZ or XY plane)
         * @param {number} x1 - Start X
         * @param {number} y1 - Start Y
         * @param {number} z1 - Start Z
         * @param {number} x2 - End X
         * @param {number} y2 - End Y
         * @param {number} z2 - End Z
         * @param {string} block - Block type
         */
        wall(x1, y1, z1, x2, y2, z2, block) {
            checkIteration();
            steps.push({
                op: 'we_walls',
                start: { x: Math.floor(x1), y: Math.floor(y1), z: Math.floor(z1) },
                end: { x: Math.floor(x2), y: Math.floor(y2), z: Math.floor(z2) },
                block: block.replace(/^minecraft:/, '')
            });
        }
    };

    return {
        api,
        getSteps: () => steps,
        getErrors: () => errors,
        getIterationCount: () => iterationCount
    };
}

export default { createSandbox };

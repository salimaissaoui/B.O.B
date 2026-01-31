/**
 * Code Interpreter
 * 
 * Sandboxed JavaScript executor for LLM-generated building code.
 * Allows the LLM to output algorithmic patterns that would be
 * difficult to express as static JSON.
 * 
 * Security measures:
 * - Runs in isolated VM context (no access to Node APIs)
 * - Limited iteration count to prevent infinite loops
 * - Timeout to prevent long-running code
 * - Whitelist of allowed functions
 */

import vm from 'vm';
import { SAFETY_LIMITS } from '../config/limits.js';
import { createSandbox } from './code-sandbox.js';

/**
 * Code Interpreter class for safe execution of LLM-generated code
 */
export class CodeInterpreter {
    constructor(options = {}) {
        const limits = SAFETY_LIMITS.codeInterpreter || {};
        this.enabled = options.enabled ?? limits.enabled ?? false;
        this.maxIterations = options.maxIterations ?? limits.maxIterations ?? 10000;
        this.timeoutMs = options.timeoutMs ?? limits.timeoutMs ?? 5000;
        this.allowedFunctions = new Set(
            options.allowedFunctions ?? limits.allowedFunctions ??
            ['place', 'fill', 'line', 'sphere', 'cylinder', 'box', 'wall']
        );
    }

    /**
     * Check if code interpreter is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Validate code before execution
     * @param {string} code - JavaScript code to validate
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate(code) {
        const errors = [];

        if (!code || typeof code !== 'string') {
            errors.push('Code must be a non-empty string');
            return { valid: false, errors };
        }

        // Check for forbidden patterns
        const forbiddenPatterns = [
            { pattern: /require\s*\(/g, message: 'require() is not allowed' },
            { pattern: /import\s+/g, message: 'import is not allowed' },
            { pattern: /eval\s*\(/g, message: 'eval() is not allowed' },
            { pattern: /Function\s*\(/g, message: 'Function() constructor is not allowed' },
            { pattern: /process\./g, message: 'process object is not allowed' },
            { pattern: /__dirname/g, message: '__dirname is not allowed' },
            { pattern: /__filename/g, message: '__filename is not allowed' },
            { pattern: /global\./g, message: 'global object is not allowed' },
            { pattern: /globalThis/g, message: 'globalThis is not allowed' },
            { pattern: /Reflect\./g, message: 'Reflect is not allowed' },
            { pattern: /Proxy/g, message: 'Proxy is not allowed' }
        ];

        for (const { pattern, message } of forbiddenPatterns) {
            if (pattern.test(code)) {
                errors.push(message);
            }
        }

        // Check for function calls that aren't in allowlist
        const functionCallPattern = /(\w+)\s*\(/g;
        let match;
        const calledFunctions = new Set();

        while ((match = functionCallPattern.exec(code)) !== null) {
            const funcName = match[1];
            // Skip common keywords and allowed names
            const keywords = ['if', 'for', 'while', 'switch', 'catch', 'Math', 'console', 'parseInt', 'parseFloat'];
            if (!keywords.includes(funcName) && !this.allowedFunctions.has(funcName)) {
                calledFunctions.add(funcName);
            }
        }

        // Only warn for unknown functions, don't block (they may be local)
        // Real validation happens at runtime

        return { valid: errors.length === 0, errors };
    }

    /**
     * Execute code in sandbox
     * @param {string} code - JavaScript code to execute
     * @returns {Object} { steps: [], errors: [], success: boolean }
     */
    execute(code) {
        if (!this.enabled) {
            return {
                success: false,
                steps: [],
                errors: ['Code interpreter is disabled. Enable in limits.js codeInterpreter.enabled']
            };
        }

        // Validate first
        const validation = this.validate(code);
        if (!validation.valid) {
            return {
                success: false,
                steps: [],
                errors: validation.errors
            };
        }

        // Create sandbox with build API
        const sandbox = createSandbox({ maxIterations: this.maxIterations });

        // Create VM context with only the build API exposed
        const context = vm.createContext({
            // Build API functions
            place: sandbox.api.place,
            fill: sandbox.api.fill,
            box: sandbox.api.box,
            sphere: sandbox.api.sphere,
            cylinder: sandbox.api.cylinder,
            line: sandbox.api.line,
            wall: sandbox.api.wall,

            // Math utilities (safe)
            Math: Math,

            // Safe console (limited)
            console: {
                log: () => { },  // Silently ignore
                warn: () => { },
                error: () => { }
            },

            // Basic type utilities
            parseInt,
            parseFloat,
            Number,
            String,
            Boolean,
            Array,
            Object
        });

        try {
            // Compile and run with timeout
            const script = new vm.Script(code, {
                filename: 'build-code.js',
                timeout: this.timeoutMs
            });

            script.runInContext(context, {
                timeout: this.timeoutMs
            });

            const steps = sandbox.getSteps();
            const errors = sandbox.getErrors();

            return {
                success: errors.length === 0,
                steps,
                errors,
                iterationCount: sandbox.getIterationCount()
            };
        } catch (error) {
            return {
                success: false,
                steps: sandbox.getSteps(),  // Return partial steps
                errors: [error.message],
                iterationCount: sandbox.getIterationCount()
            };
        }
    }

    /**
     * Convert code execution result to blueprint format
     * @param {Object} result - Execution result from execute()
     * @param {Object} metadata - Additional blueprint metadata
     * @returns {Object} Blueprint object
     */
    toBlueprint(result, metadata = {}) {
        if (!result.success && result.steps.length === 0) {
            throw new Error(`Code execution failed: ${result.errors.join(', ')}`);
        }

        // Calculate bounding box from steps
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        const blocks = new Set();

        for (const step of result.steps) {
            // Track blocks for palette
            if (step.block) blocks.add(step.block);

            // Track bounds
            if (step.pos) {
                minX = Math.min(minX, step.pos.x);
                minY = Math.min(minY, step.pos.y);
                minZ = Math.min(minZ, step.pos.z);
                maxX = Math.max(maxX, step.pos.x);
                maxY = Math.max(maxY, step.pos.y);
                maxZ = Math.max(maxZ, step.pos.z);
            }
            if (step.start && step.end) {
                minX = Math.min(minX, step.start.x, step.end.x);
                minY = Math.min(minY, step.start.y, step.end.y);
                minZ = Math.min(minZ, step.start.z, step.end.z);
                maxX = Math.max(maxX, step.start.x, step.end.x);
                maxY = Math.max(maxY, step.start.y, step.end.y);
                maxZ = Math.max(maxZ, step.start.z, step.end.z);
            }
            if (step.center && step.radius) {
                minX = Math.min(minX, step.center.x - step.radius);
                minY = Math.min(minY, step.center.y - step.radius);
                minZ = Math.min(minZ, step.center.z - step.radius);
                maxX = Math.max(maxX, step.center.x + step.radius);
                maxY = Math.max(maxY, step.center.y + step.radius);
                maxZ = Math.max(maxZ, step.center.z + step.radius);
            }
        }

        // Handle empty builds
        if (!isFinite(minX)) {
            minX = minY = minZ = 0;
            maxX = maxY = maxZ = 0;
        }

        return {
            buildType: metadata.buildType || 'algorithmic',
            theme: metadata.theme || 'default',
            description: metadata.description || 'Generated from code',
            size: {
                width: maxX - minX + 1,
                height: maxY - minY + 1,
                depth: maxZ - minZ + 1
            },
            palette: Array.from(blocks),
            steps: result.steps,
            codeGenerated: true,
            iterationCount: result.iterationCount
        };
    }
}

// Singleton instance
let interpreterInstance = null;

/**
 * Get the shared interpreter instance
 */
export function getInterpreter() {
    if (!interpreterInstance) {
        interpreterInstance = new CodeInterpreter();
    }
    return interpreterInstance;
}

export default CodeInterpreter;

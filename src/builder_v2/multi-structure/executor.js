/**
 * Multi-Structure Executor
 *
 * Executes multi-structure build plans by coordinating
 * individual structure builds using V2 components.
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "Multi-Structure Builds"
 */

import { STRUCTURE_TEMPLATES } from './planner.js';
import { COMPONENT_REGISTRY } from '../components/index.js';

/**
 * Executes multi-structure build plans
 */
export class MultiStructureExecutor {
    constructor(options = {}) {
        this.bot = options.bot || null;
        this.onProgress = options.onProgress || (() => {});
        this.onStructureComplete = options.onStructureComplete || (() => {});
        this.aborted = false;
    }

    /**
     * Execute a multi-structure layout
     * @param {Object} layout - Layout from MultiStructurePlanner
     * @param {Object} options - Execution options
     * @returns {Object} Execution result
     */
    async execute(layout, options = {}) {
        const {
            dryRun = false,
            materialPalette = {},
            concurrent = false
        } = options;

        const result = {
            success: true,
            structuresBuilt: 0,
            structuresFailed: 0,
            totalBlocks: 0,
            errors: []
        };

        const executionPlan = layout.toExecutionPlan();
        const totalStructures = executionPlan.structures.length;

        this.onProgress({
            phase: 'start',
            total: totalStructures,
            current: 0,
            message: `Starting multi-structure build: ${totalStructures} structures`
        });

        if (concurrent && !dryRun) {
            // Generate all primitives first, then build together
            const allPrimitives = [];

            for (let i = 0; i < executionPlan.structures.length; i++) {
                if (this.aborted) {
                    result.success = false;
                    result.errors.push('Build aborted by user');
                    break;
                }

                const structure = executionPlan.structures[i];
                const primitives = this._generateStructurePrimitives(structure, materialPalette);

                if (primitives) {
                    allPrimitives.push(...primitives);
                    result.structuresBuilt++;
                } else {
                    result.structuresFailed++;
                    result.errors.push(`Failed to generate: ${structure.type}`);
                }

                this.onProgress({
                    phase: 'generating',
                    total: totalStructures,
                    current: i + 1,
                    message: `Generated ${structure.type}`
                });
            }

            result.totalBlocks = allPrimitives.length;

            if (!dryRun && allPrimitives.length > 0) {
                // Execute all primitives
                await this._executePrimitives(allPrimitives);
            }
        } else {
            // Build structures sequentially
            for (let i = 0; i < executionPlan.structures.length; i++) {
                if (this.aborted) {
                    result.success = false;
                    result.errors.push('Build aborted by user');
                    break;
                }

                const structure = executionPlan.structures[i];

                this.onProgress({
                    phase: 'building',
                    total: totalStructures,
                    current: i,
                    message: `Building ${structure.type} (${i + 1}/${totalStructures})`
                });

                try {
                    const structureResult = await this._buildStructure(structure, {
                        dryRun,
                        materialPalette
                    });

                    if (structureResult.success) {
                        result.structuresBuilt++;
                        result.totalBlocks += structureResult.blockCount;

                        this.onStructureComplete({
                            index: i,
                            type: structure.type,
                            position: structure.position,
                            blockCount: structureResult.blockCount
                        });
                    } else {
                        result.structuresFailed++;
                        result.errors.push(`${structure.type}: ${structureResult.error}`);
                    }
                } catch (error) {
                    result.structuresFailed++;
                    result.errors.push(`${structure.type}: ${error.message}`);
                }
            }
        }

        this.onProgress({
            phase: 'complete',
            total: totalStructures,
            current: totalStructures,
            message: `Multi-structure build complete: ${result.structuresBuilt}/${totalStructures} structures`
        });

        result.success = result.structuresFailed === 0;
        return result;
    }

    /**
     * Build a single structure
     * @private
     */
    async _buildStructure(structure, options) {
        const { dryRun, materialPalette } = options;

        const primitives = this._generateStructurePrimitives(structure, materialPalette);

        if (!primitives || primitives.length === 0) {
            return {
                success: false,
                error: 'No primitives generated',
                blockCount: 0
            };
        }

        if (dryRun) {
            return {
                success: true,
                blockCount: primitives.length
            };
        }

        // Execute primitives via bot or WorldEdit
        await this._executePrimitives(primitives);

        return {
            success: true,
            blockCount: primitives.length
        };
    }

    /**
     * Generate primitives for a structure
     * @private
     */
    _generateStructurePrimitives(structure, materialPalette) {
        const template = STRUCTURE_TEMPLATES[structure.type];
        if (!template) {
            console.warn(`Unknown structure type: ${structure.type}`);
            return null;
        }

        const componentName = template.component;
        const componentFn = COMPONENT_REGISTRY[componentName];

        if (!componentFn) {
            console.warn(`Unknown component: ${componentName} for structure ${structure.type}`);
            return null;
        }

        // Merge default params with structure-specific params
        const params = {
            ...template.defaultParams,
            ...structure.params,
            position: structure.position
        };

        // Apply material palette
        if (materialPalette.primary && params.block === '$primary') {
            params.block = materialPalette.primary;
        }
        if (materialPalette.accent && params.accentBlock === '$accent') {
            params.accentBlock = materialPalette.accent;
        }

        try {
            return componentFn(params);
        } catch (error) {
            console.error(`Error generating ${structure.type}:`, error);
            return null;
        }
    }

    /**
     * Execute primitives (placeholder for actual WorldEdit/bot integration)
     * @private
     */
    async _executePrimitives(primitives) {
        // This would integrate with the actual builder
        // For now, just simulate execution time
        if (this.bot) {
            // Real execution would happen here
            for (const prim of primitives) {
                if (this.aborted) break;
                // await this.bot.placeBlock(prim.pos, prim.block);
            }
        }
        return primitives.length;
    }

    /**
     * Abort the current build
     */
    abort() {
        this.aborted = true;
    }

    /**
     * Reset abort state
     */
    reset() {
        this.aborted = false;
    }
}

export default MultiStructureExecutor;

/**
 * Multi-Structure Module
 *
 * Exports for coordinated multi-structure builds.
 */

export {
    MultiStructurePlanner,
    StructureLayout,
    calculateBoundingBox,
    checkOverlap,
    generateVillageLayout,
    STRUCTURE_TEMPLATES
} from './planner.js';

export { MultiStructureExecutor } from './executor.js';

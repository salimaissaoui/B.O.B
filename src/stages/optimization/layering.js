/**
 * Blueprint Optimization Logic
 * Reorders build steps to ensure structural integrity (bottom-up building)
 */

import { isWorldEditOperation } from '../../config/operations-registry.js';

/**
 * Optimizes a blueprint by reordering steps for professional execution
 * @param {Object} blueprint - The original blueprint
 * @returns {Object} - Optimized blueprint
 */
export function optimizeBlueprint(blueprint) {
    if (!blueprint || !blueprint.steps || blueprint.steps.length === 0) {
        return blueprint;
    }

    // Clone blueprint to avoid mutating original
    const optimized = { ...blueprint };

    // 1. Separate operations by type
    const sitePrepSteps = [];
    const worldEditSteps = [];
    const vanillaSteps = [];

    for (const step of optimized.steps) {
        if (step.op === 'site_prep' || step.op === 'clear_area') {
            sitePrepSteps.push(step);
        } else if (isWorldEditOperation(step.op)) {
            worldEditSteps.push(step);
        } else {
            vanillaSteps.push(step);
        }
    }

    // 2. Sort Vanilla Steps Bottom-Up (Y-level)
    // This ensures we build foundations before roofs (gravity/physics safety)
    vanillaSteps.sort((a, b) => {
        const yA = getStepYLevel(a);
        const yB = getStepYLevel(b);

        // Primary sort: Height (low to high)
        if (yA !== yB) {
            return yA - yB;
        }

        // Secondary sort: Operation priority (set blocks before connecting things like fences)
        return getOpPriority(a.op) - getOpPriority(b.op);
    });

    // 3. Reconstruct Step List
    // Order: Site Prep -> WorldEdit (Bulk) -> Vanilla (Detail/Bottom-Up)
    optimized.steps = [
        ...sitePrepSteps,
        ...worldEditSteps,
        ...vanillaSteps
    ];

    return optimized;
}

/**
 * Extract an approximate Y-level for sorting
 */
function getStepYLevel(step) {
    // Try strictly defined coordinates first
    if (step.pos) return step.pos.y;
    if (step.base) return step.base.y;
    if (step.from) return Math.min(step.from.y, step.to?.y || step.from.y);
    if (step.center) return step.center.y;

    // Default fallback (shouldn't happen with valid schemas)
    return 0;
}

/**
 * Priority for same-level operations (Lower = Earlier)
 */
function getOpPriority(op) {
    const priorities = {
        'fill': 1,
        'hollow_box': 1,
        'floor': 1,
        'set': 2,
        'line': 2,
        'walls': 3,
        'stairs': 4,
        'slab': 4,
        'door': 5,
        'window_strip': 5,
        'fence_connect': 6,
        'roof_gable': 8, // Roofs usually last even if same y-level start
        'roof_hip': 8,
        'roof_flat': 8
    };

    return priorities[op] || 5; // Default middle priority
}

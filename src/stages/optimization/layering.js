/**
 * Layering Optimizer
 * Sorts blueprint steps by Y coordinate to ensure bottom-up building.
 * This is a HARD ENFORCEMENT that overrides LLM output order.
 */

/**
 * Get the minimum Y coordinate from a step
 */
function getMinY(step) {
    // Check various coordinate properties
    if (step.from?.y !== undefined) return step.from.y;
    if (step.pos?.y !== undefined) return step.pos.y;
    if (step.base?.y !== undefined) return step.base.y;
    if (step.center?.y !== undefined) return step.center.y;

    // Default to 0 if no Y found (will be placed first)
    return 0;
}

/**
 * Get operation priority (lower = executed first)
 * This ensures site prep and foundations happen before walls
 */
function getOperationPriority(step) {
    const priorities = {
        'site_prep': 0,
        'clear_area': 0,
        'we_fill': 10,      // Bulk fills (foundations)
        'fill': 10,
        'smart_floor': 20,  // Floors
        'smart_wall': 30,   // Walls
        'we_walls': 30,
        'hollow_box': 30,
        'we_cylinder': 40,  // Towers
        'we_sphere': 40,
        'smart_roof': 50,   // Roofs last
        'we_pyramid': 50,
        'roof_gable': 50,
        'roof_hip': 50,
        'roof_flat': 50,
        'door': 60,         // Details after structure
        'window_strip': 60,
        'stairs': 60,
        'spiral_staircase': 60,
        'set': 70,          // Individual blocks last
        'line': 70,
        'pixel_art': 80,    // Special case
    };

    return priorities[step.op] ?? 100;
}

/**
 * Sort blueprint steps for optimal building order
 * @param {Object} blueprint - The generated blueprint
 * @returns {Object} - Blueprint with sorted steps
 */
export function optimizeBuildOrder(blueprint) {
    if (!blueprint?.steps || !Array.isArray(blueprint.steps)) {
        return blueprint;
    }

    // Create a copy to avoid mutating original
    const optimized = { ...blueprint };

    // Sort steps:
    // 1. By operation priority (site prep -> foundations -> walls -> roof -> details)
    // 2. Then by Y coordinate (bottom to top)
    optimized.steps = [...blueprint.steps].sort((a, b) => {
        const priorityA = getOperationPriority(a);
        const priorityB = getOperationPriority(b);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        // Same priority: sort by Y (bottom first)
        return getMinY(a) - getMinY(b);
    });

    console.log('✓ Blueprint optimized (bottom-up layering)');
    return optimized;
}

export default optimizeBuildOrder;

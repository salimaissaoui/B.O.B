/**
 * Geometry Validator
 * Validates geometric correctness of blueprints beyond schema compliance
 */

/**
 * Extract bounding box from a step
 */
function getBoundingBox(step) {
    if (step.from && step.to) {
        return {
            minX: Math.min(step.from.x, step.to.x),
            maxX: Math.max(step.from.x, step.to.x),
            minY: Math.min(step.from.y, step.to.y),
            maxY: Math.max(step.from.y, step.to.y),
            minZ: Math.min(step.from.z, step.to.z),
            maxZ: Math.max(step.from.z, step.to.z)
        };
    }
    if (step.pos) {
        return {
            minX: step.pos.x, maxX: step.pos.x,
            minY: step.pos.y, maxY: step.pos.y,
            minZ: step.pos.z, maxZ: step.pos.z
        };
    }
    if (step.base) {
        return {
            minX: step.base.x, maxX: step.base.x,
            minY: step.base.y, maxY: step.base.y,
            minZ: step.base.z, maxZ: step.base.z
        };
    }
    return null;
}

/**
 * Check if a point is within a bounding box (with tolerance)
 */
function isPointInBounds(point, bounds, tolerance = 1) {
    return (
        point.x >= bounds.minX - tolerance && point.x <= bounds.maxX + tolerance &&
        point.y >= bounds.minY - tolerance && point.y <= bounds.maxY + tolerance &&
        point.z >= bounds.minZ - tolerance && point.z <= bounds.maxZ + tolerance
    );
}

/**
 * Categorize operations by structural role
 */
const STRUCTURAL_ROLES = {
    foundation: ['fill', 'we_fill', 'smart_floor'],
    floor: ['smart_floor', 'roof_flat'],
    wall: ['hollow_box', 'we_walls', 'smart_wall'],
    roof: ['smart_roof', 'roof_gable', 'roof_hip', 'we_pyramid'],
    detail: ['door', 'window_strip', 'stairs', 'spiral_staircase', 'set', 'line']
};

function getStructuralRole(opName) {
    for (const [role, ops] of Object.entries(STRUCTURAL_ROLES)) {
        if (ops.includes(opName)) return role;
    }
    return 'other';
}

/**
 * Validate vertical ordering: roof should be above walls, walls above floor
 */
function validateVerticalOrdering(blueprint) {
    const errors = [];
    const roleYRanges = {
        foundation: { min: Infinity, max: -Infinity },
        floor: { min: Infinity, max: -Infinity },
        wall: { min: Infinity, max: -Infinity },
        roof: { min: Infinity, max: -Infinity }
    };

    // Collect Y ranges for each role
    for (const step of blueprint.steps) {
        const role = getStructuralRole(step.op);
        if (!roleYRanges[role]) continue;

        const bounds = getBoundingBox(step);
        if (!bounds) continue;

        roleYRanges[role].min = Math.min(roleYRanges[role].min, bounds.minY);
        roleYRanges[role].max = Math.max(roleYRanges[role].max, bounds.maxY);
    }

    // Check ordering: roof.minY should be >= wall.maxY
    if (roleYRanges.roof.min !== Infinity && roleYRanges.wall.max !== -Infinity) {
        if (roleYRanges.roof.min < roleYRanges.wall.max - 1) {
            errors.push(`Geometry: Roof (y=${roleYRanges.roof.min}) is below or inside walls (y=${roleYRanges.wall.max})`);
        }
    }

    // Check: wall.minY should be >= floor.maxY
    if (roleYRanges.wall.min !== Infinity && roleYRanges.floor.max !== -Infinity) {
        if (roleYRanges.wall.min < roleYRanges.floor.max) {
            errors.push(`Geometry: Walls (y=${roleYRanges.wall.min}) start below floor level (y=${roleYRanges.floor.max})`);
        }
    }

    return errors;
}

/**
 * Validate non-degenerate volumes (from != to for fills)
 */
function validateNonDegenerateVolumes(blueprint) {
    const errors = [];
    const fillOps = ['fill', 'we_fill', 'hollow_box', 'we_walls', 'smart_wall', 'smart_floor'];

    for (let i = 0; i < blueprint.steps.length; i++) {
        const step = blueprint.steps[i];
        if (!fillOps.includes(step.op)) continue;

        if (step.from && step.to) {
            const isSinglePoint = (
                step.from.x === step.to.x &&
                step.from.y === step.to.y &&
                step.from.z === step.to.z
            );

            if (isSinglePoint) {
                errors.push(`Geometry: Step ${i + 1} (${step.op}) has zero volume (from == to). Use 'set' for single blocks.`);
            }
        }
    }

    return errors;
}

/**
 * Validate that operations fit within declared build size
 */
function validateSizeContainment(blueprint) {
    const errors = [];
    const size = blueprint.size;

    if (!size) return errors;

    for (let i = 0; i < blueprint.steps.length; i++) {
        const step = blueprint.steps[i];
        const bounds = getBoundingBox(step);
        if (!bounds) continue;

        // Check if operation exceeds declared size
        if (bounds.maxX > size.width + 2) {
            errors.push(`Geometry: Step ${i + 1} (${step.op}) exceeds build width: x=${bounds.maxX} > ${size.width}`);
        }
        if (bounds.maxY > size.height + 5) {
            errors.push(`Geometry: Step ${i + 1} (${step.op}) exceeds build height: y=${bounds.maxY} > ${size.height}`);
        }
        if (bounds.maxZ > size.depth + 2) {
            errors.push(`Geometry: Step ${i + 1} (${step.op}) exceeds build depth: z=${bounds.maxZ} > ${size.depth}`);
        }
    }

    return errors;
}

/**
 * Validate door/window containment within walls
 */
function validateDetailContainment(blueprint) {
    const errors = [];

    // Collect all wall bounding boxes
    const wallBounds = [];
    for (const step of blueprint.steps) {
        const role = getStructuralRole(step.op);
        if (role === 'wall') {
            const bounds = getBoundingBox(step);
            if (bounds) wallBounds.push(bounds);
        }
    }

    if (wallBounds.length === 0) return errors;

    // Check doors and windows are within wall bounds
    for (let i = 0; i < blueprint.steps.length; i++) {
        const step = blueprint.steps[i];
        if (!['door', 'window_strip'].includes(step.op)) continue;

        const detailBounds = getBoundingBox(step);
        if (!detailBounds) continue;

        // Check if detail is within ANY wall
        const isContained = wallBounds.some(wall =>
            detailBounds.minX >= wall.minX - 1 && detailBounds.maxX <= wall.maxX + 1 &&
            detailBounds.minY >= wall.minY && detailBounds.maxY <= wall.maxY &&
            detailBounds.minZ >= wall.minZ - 1 && detailBounds.maxZ <= wall.maxZ + 1
        );

        if (!isContained) {
            // Warning only, not error - doors can be on external walls
            console.warn(`  ⚠ Step ${i + 1} (${step.op}) may be outside wall bounds`);
        }
    }

    return errors;
}

/**
 * Main geometry validation function
 */
export function validateGeometry(blueprint, buildType) {
    // Skip geometry checks for pixel art, organic builds, and tower/infrastructure
    // Towers and landmarks have non-standard geometry that doesn't follow "foundation → wall → roof" rules
    if (['pixel_art', 'statue', 'tree', 'art', 'tower', 'infrastructure', 'landmark'].includes(buildType)) {
        return { valid: true, errors: [], warnings: [] };
    }

    const errors = [];
    const warnings = [];

    // Run all geometry checks
    errors.push(...validateVerticalOrdering(blueprint));
    errors.push(...validateNonDegenerateVolumes(blueprint));
    errors.push(...validateSizeContainment(blueprint));

    // Containment is warning-level
    validateDetailContainment(blueprint);

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

export default validateGeometry;

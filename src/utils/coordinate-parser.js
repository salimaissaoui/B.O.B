/**
 * Coordinate Parser Utility
 * 
 * Parses --at X,Y,Z and --to X2,Y2,Z2 coordinate flags from build commands.
 * Enables explicit position and bounding box specification.
 */

/**
 * Parse coordinate flags from a command message
 * @param {string} message - The full command message
 * @returns {Object} { position: {x,y,z}|null, boundingBox: {min,max}|null }
 */
export function parseCoordinateFlags(message) {
    const result = { position: null, boundingBox: null };

    // Parse --at X,Y,Z (supports negative coordinates and spaces)
    const atMatch = message.match(/--at\s+(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/i);
    if (atMatch) {
        result.position = {
            x: parseInt(atMatch[1], 10),
            y: parseInt(atMatch[2], 10),
            z: parseInt(atMatch[3], 10)
        };
    }

    // Parse --to X,Y,Z (only valid if --at is present)
    const toMatch = message.match(/--to\s+(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/i);
    if (toMatch && result.position) {
        const toPos = {
            x: parseInt(toMatch[1], 10),
            y: parseInt(toMatch[2], 10),
            z: parseInt(toMatch[3], 10)
        };

        // Normalize min/max (in case user gives them in reverse order)
        result.boundingBox = {
            min: {
                x: Math.min(result.position.x, toPos.x),
                y: Math.min(result.position.y, toPos.y),
                z: Math.min(result.position.z, toPos.z)
            },
            max: {
                x: Math.max(result.position.x, toPos.x),
                y: Math.max(result.position.y, toPos.y),
                z: Math.max(result.position.z, toPos.z)
            }
        };

        // Update position to be the min corner
        result.position = result.boundingBox.min;
    }

    return result;
}

/**
 * Strip coordinate flags from message, preserving the build prompt
 * @param {string} message - The full command message
 * @returns {string} Message with coordinate flags removed
 */
export function stripCoordinateFlags(message) {
    return message
        .replace(/--at\s+(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/gi, '')
        .replace(/--to\s+(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/gi, '')
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim();
}

/**
 * Calculate dimensions from a bounding box
 * @param {Object} boundingBox - { min: {x,y,z}, max: {x,y,z} }
 * @returns {Object} { width, height, depth }
 */
export function getBoundingBoxDimensions(boundingBox) {
    if (!boundingBox || !boundingBox.min || !boundingBox.max) {
        return null;
    }

    return {
        width: Math.abs(boundingBox.max.x - boundingBox.min.x) + 1,
        height: Math.abs(boundingBox.max.y - boundingBox.min.y) + 1,
        depth: Math.abs(boundingBox.max.z - boundingBox.min.z) + 1
    };
}

/**
 * Validate that a bounding box is within safety limits
 * @param {Object} boundingBox - { min: {x,y,z}, max: {x,y,z} }
 * @param {Object} limits - Safety limits (maxWidth, maxHeight, maxDepth)
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateBoundingBox(boundingBox, limits = {}) {
    const errors = [];
    const dims = getBoundingBoxDimensions(boundingBox);

    if (!dims) {
        return { valid: true, errors: [] };  // No bounding box = no validation needed
    }

    const maxWidth = limits.maxWidth || 2000;
    const maxHeight = limits.maxHeight || 256;
    const maxDepth = limits.maxDepth || 2000;

    if (dims.width > maxWidth) {
        errors.push(`Width ${dims.width} exceeds maximum ${maxWidth}`);
    }
    if (dims.height > maxHeight) {
        errors.push(`Height ${dims.height} exceeds maximum ${maxHeight}`);
    }
    if (dims.depth > maxDepth) {
        errors.push(`Depth ${dims.depth} exceeds maximum ${maxDepth}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

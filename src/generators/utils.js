/**
 * Common utilities for procedural generators
 */

/**
 * Ensures all coordinates are positive and within reasonable bounds
 */
export function sanitizeCoords(coords) {
    return {
        x: Math.max(0, Math.round(coords.x || 0)),
        y: Math.max(0, Math.round(coords.y || 0)),
        z: Math.max(0, Math.round(coords.z || 0))
    };
}

/**
 * Get a block from a palette or fallback to a default
 */
export function getBlock(palette, key, fallback = 'stone') {
    if (!palette) return fallback;

    // Handle array palette (search for key in names)
    if (Array.isArray(palette)) {
        const found = palette.find(b => b.includes(key));
        return found || palette[0] || fallback;
    }

    // Handle object palette
    return palette[key] || palette.primary || fallback;
}

/**
 * Calculate distance between two points
 */
export function distance(p1, p2) {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2) +
        Math.pow(p1.z - p2.z, 2)
    );
}

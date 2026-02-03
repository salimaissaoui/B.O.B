/**
 * Blueprint Cache - LLM Response Caching
 *
 * Caches LLM-generated blueprints to avoid redundant API calls for identical prompts.
 *
 * CLAUDE.md Contract:
 * - Priority 2 Performance: "LLM Response Caching - Cache blueprints (24h TTL)"
 *
 * @module src/llm/blueprint-cache
 */

// Cache TTL Constants
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Blueprint cache for LLM responses
 */
export class BlueprintCache {
    /**
     * Create a new blueprint cache
     * @param {Object} options - Cache configuration
     * @param {number} options.ttlMs - Time-to-live in milliseconds (default: 24 hours)
     */
    constructor(options = {}) {
        this.cache = new Map();
        this.ttlMs = options.ttlMs || DEFAULT_TTL_MS;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0
        };
    }

    /**
     * Generate cache key from prompt parameters
     * Key is based on normalized prompt + build type + WorldEdit availability
     *
     * @param {string} userPrompt - The user's build prompt
     * @param {string} buildType - The analyzed build type
     * @param {boolean} worldEditAvailable - Whether WorldEdit is available
     * @returns {string} Cache key
     */
    generateKey(userPrompt, buildType, worldEditAvailable = false) {
        // Normalize: lowercase + trim whitespace
        const input = `${userPrompt.toLowerCase().trim()}|${buildType}|${worldEditAvailable}`;

        // Simple string hash (djb2 variant)
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        return `bp_${Math.abs(hash).toString(36)}`;
    }

    /**
     * Get cached blueprint
     *
     * @param {string} key - Cache key from generateKey()
     * @returns {Object|null} Cached blueprint or null if miss/expired
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check TTL expiration
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.stats.evictions++;
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        return entry.blueprint;
    }

    /**
     * Store blueprint in cache
     *
     * @param {string} key - Cache key from generateKey()
     * @param {Object} blueprint - Blueprint to cache
     */
    set(key, blueprint) {
        this.cache.set(key, {
            blueprint,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.ttlMs
        });
        this.stats.sets++;
    }

    /**
     * Check if key exists and is not expired
     *
     * @param {string} key - Cache key
     * @returns {boolean} True if valid cache entry exists
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.stats.evictions++;
            return false;
        }

        return true;
    }

    /**
     * Clear the entire cache
     */
    clear() {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
    }

    /**
     * Get cache statistics
     *
     * @returns {Object} Cache statistics including hit rate
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: total > 0
                ? (this.stats.hits / total * 100).toFixed(1)
                : 0
        };
    }

    /**
     * Remove expired entries (manual cleanup)
     *
     * @returns {number} Number of entries removed
     */
    cleanup() {
        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                this.stats.evictions++;
                removed++;
            }
        }

        return removed;
    }
}

// Singleton instance for global usage
let globalCache = null;

/**
 * Get the global blueprint cache instance
 *
 * @param {Object} options - Cache options (only used on first call)
 * @returns {BlueprintCache} Global cache instance
 */
export function getBlueprintCache(options = {}) {
    if (!globalCache) {
        globalCache = new BlueprintCache(options);
    }
    return globalCache;
}

/**
 * Reset the global cache (for testing)
 */
export function resetGlobalCache() {
    if (globalCache) {
        globalCache.clear();
    }
    globalCache = null;
}

export default BlueprintCache;

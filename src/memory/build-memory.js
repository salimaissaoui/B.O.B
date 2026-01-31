/**
 * Build Memory Module
 *
 * Persistent storage for successful builds and learned patterns.
 * Helps B.O.B improve over time by remembering what worked.
 *
 * Inspired by APT's memory module research findings.
 *
 * Features:
 * - Store successful blueprints by build type
 * - Track block name corrections for auto-fixing
 * - Remember quality scores and user feedback
 * - Provide few-shot examples for LLM prompts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SAFETY_LIMITS } from '../config/limits.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class BuildMemory {
    constructor(options = {}) {
        this.options = options;
        this.storagePath = options.storagePath ||
            SAFETY_LIMITS.memory?.storagePath || './bob-memory';
        this.maxPatterns = options.maxPatterns ||
            SAFETY_LIMITS.memory?.maxPatterns || 100;
        this.expiryDays = options.expiryDays ||
            SAFETY_LIMITS.memory?.expiryDays || 90;

        // In-memory caches
        this.patterns = new Map();
        this.corrections = new Map();

        // Ensure storage directory exists
        this.ensureStorageDir();

        // Load existing data
        this.load();
    }

    /**
     * Ensure storage directory exists
     */
    ensureStorageDir() {
        if (!existsSync(this.storagePath)) {
            mkdirSync(this.storagePath, { recursive: true });
            console.log(`✓ Created memory storage: ${this.storagePath}`);
        }
    }

    /**
     * Load existing patterns from disk
     */
    load() {
        try {
            const patternsFile = join(this.storagePath, 'patterns.json');
            if (existsSync(patternsFile)) {
                const data = JSON.parse(readFileSync(patternsFile, 'utf-8'));
                this.patterns = new Map(Object.entries(data.patterns || {}));
                this.corrections = new Map(Object.entries(data.corrections || {}));
                console.log(`✓ Loaded ${this.patterns.size} patterns, ${this.corrections.size} corrections`);
            }
        } catch (error) {
            console.warn(`⚠ Failed to load memory: ${error.message}`);
        }
    }

    /**
     * Save patterns to disk
     */
    save() {
        try {
            const patternsFile = join(this.storagePath, 'patterns.json');
            const data = {
                patterns: Object.fromEntries(this.patterns),
                corrections: Object.fromEntries(this.corrections),
                lastUpdated: new Date().toISOString()
            };
            writeFileSync(patternsFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.warn(`⚠ Failed to save memory: ${error.message}`);
        }
    }

    /**
     * Record a successful build pattern
     *
     * @param {Object} blueprint - The blueprint that was built
     * @param {number} qualityScore - Quality score (0-1)
     * @param {Object} metadata - Additional metadata
     */
    recordPattern(blueprint, qualityScore, metadata = {}) {
        if (!SAFETY_LIMITS.memory?.enabled) return;

        const minQuality = SAFETY_LIMITS.memory?.minQualityToSave || 0.8;
        if (qualityScore < minQuality) {
            console.log(`  Pattern not saved: quality ${(qualityScore * 100).toFixed(0)}% < ${(minQuality * 100).toFixed(0)}%`);
            return;
        }

        const key = this.getPatternKey(blueprint);
        const existing = this.patterns.get(key);

        if (existing) {
            // Update existing pattern
            existing.uses++;
            existing.lastUsed = new Date().toISOString();
            existing.avgQuality = (existing.avgQuality * (existing.uses - 1) + qualityScore) / existing.uses;

            // Keep the best blueprint
            if (qualityScore > existing.bestQuality) {
                existing.bestQuality = qualityScore;
                existing.blueprint = this.compressBlueprint(blueprint);
            }
        } else {
            // Create new pattern
            this.patterns.set(key, {
                key,
                buildType: blueprint.buildType,
                theme: blueprint.theme,
                uses: 1,
                avgQuality: qualityScore,
                bestQuality: qualityScore,
                blueprint: this.compressBlueprint(blueprint),
                firstCreated: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
                metadata
            });
        }

        // Prune if over limit
        this.prunePatterns();

        // Save to disk
        this.save();

        console.log(`✓ Pattern recorded: ${key} (quality: ${(qualityScore * 100).toFixed(0)}%)`);
    }

    /**
     * Get pattern key from blueprint
     */
    getPatternKey(blueprint) {
        const type = blueprint.buildType || 'unknown';
        const theme = blueprint.theme || 'default';
        const sizeClass = this.getSizeClass(blueprint.size);
        return `${type}_${theme}_${sizeClass}`;
    }

    /**
     * Classify build size
     */
    getSizeClass(size) {
        if (!size) return 'unknown';
        const volume = (size.width || 10) * (size.height || 10) * (size.depth || 10);
        if (volume < 1000) return 'small';
        if (volume < 10000) return 'medium';
        if (volume < 100000) return 'large';
        return 'massive';
    }

    /**
     * Compress blueprint for storage (remove redundant data)
     */
    compressBlueprint(blueprint) {
        return {
            buildType: blueprint.buildType,
            theme: blueprint.theme,
            size: blueprint.size,
            palette: blueprint.palette,
            // Store only operation types, not full coords (for pattern matching)
            operationTypes: blueprint.steps?.map(s => s.op) || []
        };
    }

    /**
     * Record a block name correction
     *
     * @param {string} wrong - Incorrect block name
     * @param {string} correct - Correct block name
     */
    recordCorrection(wrong, correct) {
        if (!SAFETY_LIMITS.memory?.enabled) return;

        const existing = this.corrections.get(wrong);
        if (existing) {
            existing.count++;
            existing.lastSeen = new Date().toISOString();
        } else {
            this.corrections.set(wrong, {
                wrong,
                correct,
                count: 1,
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            });
        }

        this.save();
    }

    /**
     * Get correction for a block name
     *
     * @param {string} blockName - Potentially incorrect block name
     * @returns {string|null} Correct name or null if not found
     */
    getCorrection(blockName) {
        const correction = this.corrections.get(blockName);
        return correction ? correction.correct : null;
    }

    /**
     * Get all corrections as a map
     */
    getAllCorrections() {
        return new Map(this.corrections);
    }

    /**
     * Find similar patterns for a build request
     *
     * @param {string} buildType - Type of build (house, castle, etc.)
     * @param {string} theme - Theme (medieval, modern, etc.)
     * @returns {Array} Matching patterns sorted by quality
     */
    findSimilarPatterns(buildType, theme = 'default') {
        const matches = [];

        for (const [key, pattern] of this.patterns) {
            if (pattern.buildType === buildType) {
                const themeMatch = pattern.theme === theme ? 1.0 : 0.5;
                const score = pattern.avgQuality * themeMatch;
                matches.push({ ...pattern, matchScore: score });
            }
        }

        return matches.sort((a, b) => b.matchScore - a.matchScore);
    }

    /**
     * Get a few-shot example for LLM prompting
     *
     * @param {string} buildType - Type of build
     * @param {string} theme - Theme
     * @returns {Object|null} Best matching pattern or null
     */
    getFewShotExample(buildType, theme = 'default') {
        const matches = this.findSimilarPatterns(buildType, theme);
        return matches.length > 0 ? matches[0] : null;
    }

    /**
     * Prune old or excess patterns
     */
    prunePatterns() {
        // Sort by quality and recency
        const sorted = Array.from(this.patterns.entries())
            .sort((a, b) => {
                const scoreA = a[1].avgQuality * 0.7 + (a[1].uses / 100) * 0.3;
                const scoreB = b[1].avgQuality * 0.7 + (b[1].uses / 100) * 0.3;
                return scoreB - scoreA;
            });

        // Remove excess patterns
        while (sorted.length > this.maxPatterns) {
            const [key] = sorted.pop();
            this.patterns.delete(key);
            console.log(`  Pruned pattern: ${key}`);
        }

        // Remove expired patterns
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - this.expiryDays);

        for (const [key, pattern] of this.patterns) {
            const lastUsed = new Date(pattern.lastUsed);
            if (lastUsed < expiryDate) {
                this.patterns.delete(key);
                console.log(`  Expired pattern: ${key}`);
            }
        }
    }

    /**
     * Get memory statistics
     */
    getStats() {
        const patterns = Array.from(this.patterns.values());
        const avgQuality = patterns.length > 0
            ? patterns.reduce((sum, p) => sum + p.avgQuality, 0) / patterns.length
            : 0;

        return {
            patternCount: this.patterns.size,
            correctionCount: this.corrections.size,
            avgQuality: avgQuality,
            totalUses: patterns.reduce((sum, p) => sum + p.uses, 0),
            storagePath: this.storagePath,
            feedbackCount: this.feedbackHistory?.length || 0
        };
    }

    /**
     * Track the last build for feedback purposes
     * @param {Object} blueprint - The blueprint that was built
     * @param {string} buildId - Unique build identifier
     */
    trackLastBuild(blueprint, buildId = null) {
        this.lastBuild = {
            id: buildId || `build_${Date.now()}`,
            key: this.getPatternKey(blueprint),
            blueprint: this.compressBlueprint(blueprint),
            timestamp: new Date().toISOString(),
            buildType: blueprint.buildType,
            theme: blueprint.theme
        };
    }

    /**
     * Get the last build info
     * @returns {Object|null} Last build info or null
     */
    getLastBuild() {
        return this.lastBuild || null;
    }

    /**
     * Record user feedback for the last build
     * @param {number} rating - Rating from 1-5 stars
     * @param {string} comment - Optional comment
     * @returns {Object} Result with success status
     */
    recordFeedback(rating, comment = '') {
        if (!SAFETY_LIMITS.memory?.enabled) {
            return { success: false, error: 'Memory module disabled' };
        }

        const lastBuild = this.getLastBuild();
        if (!lastBuild) {
            return { success: false, error: 'No recent build to rate' };
        }

        // Validate rating
        const numRating = parseInt(rating, 10);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return { success: false, error: 'Rating must be 1-5' };
        }

        // Convert 1-5 star rating to 0-1 quality score
        const qualityBoost = (numRating - 3) * 0.1;  // -0.2 to +0.2

        // Update pattern quality based on feedback
        const pattern = this.patterns.get(lastBuild.key);
        if (pattern) {
            const oldQuality = pattern.avgQuality;
            // Weighted update: feedback has 30% influence
            pattern.avgQuality = Math.max(0, Math.min(1,
                pattern.avgQuality * 0.7 + (numRating / 5) * 0.3
            ));
            pattern.feedbackCount = (pattern.feedbackCount || 0) + 1;
            pattern.lastFeedback = {
                rating: numRating,
                comment,
                timestamp: new Date().toISOString()
            };

            console.log(`✓ Feedback recorded: ${numRating}/5 stars for ${lastBuild.key}`);
            console.log(`  Quality adjusted: ${(oldQuality * 100).toFixed(0)}% → ${(pattern.avgQuality * 100).toFixed(0)}%`);
        } else {
            // Pattern doesn't exist yet (maybe below quality threshold)
            // Create it based on feedback if rating is good
            if (numRating >= 3 && lastBuild.blueprint) {
                this.patterns.set(lastBuild.key, {
                    key: lastBuild.key,
                    buildType: lastBuild.buildType,
                    theme: lastBuild.theme,
                    uses: 1,
                    avgQuality: numRating / 5,
                    bestQuality: numRating / 5,
                    blueprint: lastBuild.blueprint,
                    firstCreated: new Date().toISOString(),
                    lastUsed: new Date().toISOString(),
                    feedbackCount: 1,
                    lastFeedback: {
                        rating: numRating,
                        comment,
                        timestamp: new Date().toISOString()
                    }
                });
                console.log(`✓ Pattern created from feedback: ${lastBuild.key}`);
            }
        }

        // Record in feedback history
        if (!this.feedbackHistory) {
            this.feedbackHistory = [];
        }
        this.feedbackHistory.push({
            buildId: lastBuild.id,
            key: lastBuild.key,
            rating: numRating,
            comment,
            timestamp: new Date().toISOString()
        });

        // Keep only last 50 feedback entries
        if (this.feedbackHistory.length > 50) {
            this.feedbackHistory = this.feedbackHistory.slice(-50);
        }

        // Clear last build (can only rate once)
        this.lastBuild = null;

        // Save to disk
        this.save();

        return {
            success: true,
            rating: numRating,
            message: `Rated ${numRating}/5 stars`
        };
    }

    /**
     * Get patterns sorted by user rating/feedback
     * @param {string} buildType - Build type to filter
     * @returns {Array} Patterns sorted by feedback quality
     */
    getTopRatedPatterns(buildType = null) {
        let patterns = Array.from(this.patterns.values());

        if (buildType) {
            patterns = patterns.filter(p => p.buildType === buildType);
        }

        // Sort by feedback-adjusted quality
        return patterns
            .filter(p => p.feedbackCount > 0)
            .sort((a, b) => {
                const scoreA = a.avgQuality * (1 + (a.feedbackCount || 0) * 0.1);
                const scoreB = b.avgQuality * (1 + (b.feedbackCount || 0) * 0.1);
                return scoreB - scoreA;
            });
    }

    /**
     * Clear all memory (for testing)
     */
    clear() {
        this.patterns.clear();
        this.corrections.clear();
        this.lastBuild = null;
        this.feedbackHistory = [];
        this.save();
    }
}

// Singleton instance
let memoryInstance = null;

/**
 * Get the shared memory instance
 */
export function getMemory() {
    if (!memoryInstance) {
        memoryInstance = new BuildMemory();
    }
    return memoryInstance;
}

export default BuildMemory;

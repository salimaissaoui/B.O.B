/**
 * Safety Limits Configuration
 *
 * These limits prevent server overload, client disconnection, and ensure builds complete successfully.
 * Adjust these values based on your server's performance capabilities and your use case.
 *
 * Configuration can be customized via config/bob.config.json file.
 * If the config file exists, values are loaded from it and merged with defaults.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load external configuration if available
 * @returns {Object|null} External config or null if not found
 */
function loadExternalConfig() {
  // Try multiple locations for config file
  const configPaths = [
    join(__dirname, '../../config/bob.config.json'),
    join(process.cwd(), 'config/bob.config.json'),
    join(process.cwd(), 'bob.config.json'),
  ];

  for (const configPath of configPaths) {
    try {
      if (existsSync(configPath)) {
        const configData = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);
        console.log(`✓ Loaded config from: ${configPath}`);
        return config;
      }
    } catch (error) {
      console.warn(`⚠ Failed to load config from ${configPath}: ${error.message}`);
    }
  }

  return null;
}

// Load external config (once at startup)
const externalConfig = loadExternalConfig();

/**
 * Deep merge two objects (external config overrides defaults)
 */
function deepMerge(defaults, overrides) {
  if (!overrides) return defaults;

  const result = { ...defaults };

  for (const key of Object.keys(overrides)) {
    if (overrides[key] !== null && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
      result[key] = deepMerge(defaults[key] || {}, overrides[key]);
    } else if (overrides[key] !== undefined) {
      result[key] = overrides[key];
    }
  }

  return result;
}

// Default limits (used if no config file exists)
const DEFAULT_LIMITS = {
  /**
   * Maximum total blocks per build (default: 30000)
   *
   * Prevents:
   * - Server TPS (ticks per second) degradation
   * - Excessive build times
   * - Client render lag in large structures
   *
   * Recommended ranges:
   * - Low-end server: 10000
   * - Medium server: 30000
   * - High-end server: 100000+
   *
   * Impact if exceeded: Blueprint validation will reject the build
   */
  maxBlocks: 5000000, // effectively unlimited

  /**
   * Maximum unique block types in palette (default: 15)
   *
   * Prevents:
   * - Inventory management complexity
   * - LLM over-complicating designs with unnecessary block variety
   * - Excessive material gathering
   *
   * Recommended ranges:
   * - Simple builds: 5-10
   * - Complex builds: 10-15
   * - Artistic builds: 15-20
   *
   * Impact if exceeded: LLM is guided to use fewer block types
   */
  maxUniqueBlocks: 20,

  /**
   * Maximum build height (default: 256)
   *
   * Hard limit based on Minecraft world height (1.20.1 = -64 to 320, effective height 256).
   * Prevents builds from exceeding world boundaries.
   *
   * Impact if exceeded: Build operations outside bounds will fail
   */
  maxHeight: 256,

  /**
   * Maximum build width (X-axis) (default: 100)
   *
   * Prevents excessively wide structures that:
   * - Span multiple chunks (causing chunk loading issues)
   * - Create disproportionate builds
   * - Exceed render distance visibility
   *
   * Impact if exceeded: Blueprint validation will reject the build
   */
  maxWidth: 2000,

  /**
   * Maximum build depth (Z-axis) (default: 100)
   *
   * Same rationale as maxWidth. Enforces reasonable structure proportions.
   *
   * Impact if exceeded: Blueprint validation will reject the build
   */
  maxDepth: 2000,

  /**
   * Maximum blueprint operations/steps (default: 1000)
   *
   * Prevents:
   * - LLM generating overly complex blueprints with redundant operations
   * - Infinite loops or recursive errors in blueprint execution
   * - Excessive execution time
   *
   * Note: High-quality blueprints typically use 50-200 steps.
   * More than 500 steps usually indicates inefficient generation.
   *
   * Impact if exceeded: Blueprint validation will reject the build
   */
  maxSteps: 2000,

  /**
   * Block placement rate limit (blocks/second) (default: 50)
   *
   * Controls vanilla block placement speed to prevent:
   * - Server kicks (anti-spam protection)
   * - Connection resets (ECONNRESET) from flooding commands
   * - TPS lag from too many block updates
   *
   * Recommended ranges:
   * - Vanilla server: 20-50
   * - Bukkit/Spigot: 50-100
   * - Paper (optimized): 100-200
   *
   * Note: WorldEdit bypasses this limit (operates at server-native speed)
   *
   * Impact: Controls delay between block placements (1000ms / buildRateLimit = delay per block)
   */
  buildRateLimit: 200,

  /**
   * Block placement retry attempts (default: 3)
   *
   * Number of times to retry placing a block if it fails.
   * Uses exponential backoff (50ms, 100ms, 200ms delays).
   *
   * Common failure reasons:
   * - Block not yet loaded in client
   * - Network latency
   * - Permission issues
   * - Invalid block state
   *
   * Impact: Improves reliability but increases build time on failures
   */
  maxRetries: 3,

  /**
   * LLM request timeout (milliseconds) (default: 120000 = 2 minutes)
   *
   * Maximum time to wait for Gemini API response before failing.
   *
   * Typical response times:
   * - Simple builds: 2-5 seconds
   * - Complex builds: 5-15 seconds
   * - Very large builds: 15-30 seconds
   *
   * Impact if timeout: Blueprint generation fails, user must retry
   */
  llmTimeoutMs: 120000,

  /**
   * LLM request retry attempts (default: 5)
   *
   * Number of times to retry failed LLM requests.
   * Handles transient API errors (rate limits, network issues, server errors).
   *
   * Impact: Improves reliability but increases total generation time on failures
   */
  llmMaxRetries: 5,

  /**
   * LLM retry delay (milliseconds) (default: 1000)
   *
   * Base delay between LLM retry attempts.
   * Uses exponential backoff for subsequent retries.
   *
   * Impact: Prevents hammering the API during outages
   */
  llmRetryDelayMs: 1000,

  /**
   * LLM maximum output tokens (default: 8192)
   *
   * Maximum JSON response size from Gemini API.
   *
   * Token estimates:
   * - Small build (5x5 house): ~500-1000 tokens
   * - Medium build (20x20 castle): ~2000-4000 tokens
   * - Large build (50x50 structure): ~6000-8000 tokens
   *
   * Impact if exceeded: LLM response truncated, resulting in invalid JSON
   */
  llmMaxOutputTokens: 8192,

  /**
   * Minimum delay between chat commands (milliseconds) (default: 500)
   *
   * Required delay between /setblock commands to prevent:
   * - Server anti-spam kicks
   * - Connection resets
   * - Command queue overflow
   *
   * Note: Only applies to vanilla /setblock commands, not bot.setBlock() API
   *
   * Impact: Increases build time for vanilla placement
   */
  chatCommandMinDelayMs: 500,

  /**
   * In-game day duration (seconds) (default: 600 = 10 minutes)
   *
   * Used for time-based build scheduling and progress estimates.
   * Minecraft day = 20 minutes real time (10 min day, 7 min sunset, 3 min night)
   *
   * Impact: Currently informational, used for progress logging
   */
  dayDuration: 600,

  /**
   * In-game night duration (seconds) (default: 90)
   *
   * Minecraft night = 7 minutes real time (hostile mob spawning period)
   *
   * Impact: Currently informational, could be used for pausing builds at night
   */
  nightDuration: 90,

  /**
   * WorldEdit Integration Limits
   *
   * WorldEdit provides 50-100x speedup for large builds by executing server-side operations.
   * These limits prevent server crashes and ensure reliable WorldEdit usage.
   */
  worldEdit: {
    /**
     * WorldEdit feature flag (default: true)
     *
     * Set to false to disable WorldEdit and use only vanilla block placement.
     *
     * When enabled:
     * - Bot auto-detects WorldEdit on startup
     * - Large operations use //set, //walls, //pyramid, etc.
     * - Falls back to vanilla if WorldEdit commands fail
     *
     * Impact: Disabling significantly increases build time for large structures
     */
    enabled: true,

    /**
     * Maximum blocks per WorldEdit selection (default: 50000)
     *
     * Prevents:
     * - Server heap overflow (OutOfMemoryError)
     * - TPS freeze during large //set operations
     * - Client timeout during massive block updates
     *
     * Server performance impact:
     * - 10,000 blocks: Minimal (< 1 sec)
     * - 50,000 blocks: Noticeable (1-3 sec freeze)
     * - 100,000+ blocks: Severe (3-10 sec freeze, potential crash)
     *
     * Recommended ranges:
     * - Low-end server (< 4GB RAM): 10000
     * - Medium server (4-8GB RAM): 50000
     * - High-end server (8GB+ RAM): 100000
     *
     * Impact if exceeded: Operations split into multiple smaller selections
     */
    maxSelectionVolume: 500000,

    /**
     * Maximum single dimension for WorldEdit selection (default: 50)
     *
     * Prevents excessively long/tall selections that:
     * - Span too many chunks (chunk loading issues)
     * - Create disproportionate load on one axis
     * - Exceed typical structure sizes
     *
     * Example: 50x50x50 = 125,000 blocks (would be split due to maxSelectionVolume)
     *
     * Impact: Large dimensions automatically split into multiple operations
     */
    maxSelectionDimension: 250,

    /**
     * WorldEdit commands per second (default: 5)
     *
     * Controls rate of WorldEdit command execution to prevent:
     * - Command queue overflow
     * - Server command spam detection
     * - Sustained TPS degradation
     *
     * Note: Each blueprint operation (we_fill, we_walls) typically uses 3-5 WorldEdit commands:
     * 1. //pos1 x y z
     * 2. //pos2 x y z
     * 3. //set block_type
     * 4. //sel (clear selection)
     *
     * Impact: Lower values increase build time but improve server stability
     */
    commandRateLimit: 10,

    /**
     * Minimum delay between WorldEdit commands (milliseconds) (default: 400)
     *
     * Fixed delay between sequential WorldEdit commands.
     * Complements commandRateLimit for fine-grained control.
     *
     * Prevents:
     * - Commands executing before previous command completes
     * - Race conditions in selection state
     * - Connection resets (ECONNRESET) from command flooding
     *
     * Recommended ranges:
     * - Fast server: 200-300ms
     * - Medium server: 400-600ms
     * - Slow server: 600-1000ms
     *
     * Impact: Directly affects build time (N commands * delay = total time)
     */
    commandMinDelayMs: 400,

    /**
     * Maximum total WorldEdit commands per build (default: 2000)
     *
     * Safety limit to prevent runaway blueprint execution.
     *
     * Typical command counts:
     * - Small build: 10-50 commands
     * - Medium build: 50-200 commands
     * - Large build: 200-500 commands
     * - Massive build: 500-2000 commands
     *
     * Impact if exceeded: Build execution fails with error
     */
    maxCommandsPerBuild: 2000,

    /**
     * Auto-fallback to vanilla on WorldEdit error (default: true)
     *
     * When WorldEdit operation fails (permissions, syntax error, server issue),
     * automatically retry the operation using vanilla block placement.
     *
     * Benefits:
     * - Builds complete even if WorldEdit partially fails
     * - Handles permission issues gracefully
     * - Improves reliability on unstable servers
     *
     * Drawbacks:
     * - Fallback operations are much slower
     * - May not be noticed by user
     *
     * Impact: If false, WorldEdit errors will fail the entire build
     */
    fallbackOnError: true,

    /**
     * Required WorldEdit permissions (informational)
     *
     * Expected permissions for the bot user.
     * Used for diagnostics and setup validation.
     *
     * Essential permissions:
     * - worldedit.selection.* - Create pos1/pos2 selections
     * - worldedit.region.set - Execute //set command
     * - worldedit.region.walls - Execute //walls command
     * - worldedit.generation.* - Execute //pyramid, //cylinder, //sphere
     *
     * Impact: Missing permissions cause WorldEdit operations to fail
     */
    requiredPermissions: [
      'worldedit.selection',
      'worldedit.region.set',
      'worldedit.region.walls'
    ],

    /**
     * Delay after site clearing before build starts (milliseconds) (default: 500)
     *
     * Safety buffer to ensure WorldEdit server-side processing completes
     * before block placement begins. Prevents race conditions where
     * blocks are placed before the area is fully cleared.
     *
     * Increase this value on slower servers or if builds start
     * before clearing visually completes.
     *
     * Impact: Adds delay to build start time, improves reliability
     */
    postClearDelayMs: 500
  },

  /**
   * Maximum percentage of failed blocks before aborting build (default: 25)
   *
   * If more than this percentage of blocks fail to place (unreachable,
   * permission denied, etc.), the build aborts to prevent "broken" structures.
   *
   * Set to 100 to disable abort threshold (continue regardless of failures).
   *
   * Recommended ranges:
   * - Strict: 10% (abort early on issues)
   * - Normal: 25% (allow some failures)
   * - Lenient: 50% (allow partial builds)
   *
   * Impact: Lower values abort builds faster on failure, higher values allow partial completion
   */
  maxFailedBlocksPercent: 25,

  /**
   * Minimum quality score for blueprint acceptance (default: 0.7 = 70%)
   *
   * Quality score based on:
   * - Feature completeness (requested features present in blueprint)
   * - Structural soundness (foundation, walls, roof present)
   * - Operation efficiency (not too many redundant operations)
   * - Block appropriateness (blocks match requested style/theme)
   *
   * Score ranges:
   * - 0.9-1.0: Excellent quality
   * - 0.7-0.9: Good quality (recommended minimum)
   * - 0.5-0.7: Acceptable quality (may have missing features)
   * - 0.0-0.5: Poor quality (reject)
   *
   * Impact if below threshold: Blueprint rejected, user must retry or adjust request
   */
  minQualityScore: 0.7,

  /**
   * Require all requested features present (default: true)
   *
   * When true, blueprint must contain all features mentioned in user prompt.
   * Example: "house with chimney and porch" requires both chimney AND porch operations.
   *
   * When false, partial feature completion is acceptable.
   *
   * Impact: Stricter validation improves result quality but may increase rejection rate
   */
  requireFeatureCompletion: true,

  /**
   * Allow partial builds when materials are missing (default: false)
   *
   * When false: Build fails if inventory validation detects missing materials
   * When true: Build proceeds with available materials (some blocks may be skipped)
   *
   * Use cases for true:
   * - Creative mode (unlimited blocks)
   * - Testing/debugging
   * - Partial construction preview
   *
   * Use cases for false:
   * - Survival mode
   * - Production builds
   * - Ensuring complete structures
   *
   * Impact: If true, builds may be incomplete; if false, builds fail early if materials missing
   */
  allowPartialBuilds: false,

  /**
   * Enable 2D rectangle batching for pixel art (default: true)
   *
   * When true: Pixel art uses greedy rectangle algorithm to batch blocks
   * into efficient WorldEdit rectangle fills (100+ blocks -> ~5-10 operations)
   *
   * When false: Pixel art uses single-block placement (legacy behavior)
   *
   * Set to false if you experience "tearing" artifacts in pixel art builds.
   * This can happen on servers with slow WorldEdit command processing.
   *
   * Impact: Dramatically improves pixel art build speed (30+ seconds vs 10+ minutes)
   */
  pixelArtBatching: true,

  /**
   * Flag indicating this config can be customized via external file
   */
  isConfigurable: true
};

/**
 * Merge external config into defaults
 * External config structure:
 * {
 *   limits: { maxWidth, maxDepth, maxHeight, maxBlocks, ... },
 *   performance: { buildRateLimit, chatCommandMinDelayMs, pixelArtBatching, ... },
 *   worldedit: { enabled, maxSelectionVolume, ... },
 *   validation: { minQualityScore, ... },
 *   llm: { timeoutMs, maxRetries, ... }
 * }
 */
function mergeExternalConfig(defaults, external) {
  if (!external) return defaults;

  const merged = { ...defaults };

  // Map external config sections to SAFETY_LIMITS structure
  if (external.limits) {
    if (external.limits.maxWidth !== undefined) merged.maxWidth = external.limits.maxWidth;
    if (external.limits.maxDepth !== undefined) merged.maxDepth = external.limits.maxDepth;
    if (external.limits.maxHeight !== undefined) merged.maxHeight = external.limits.maxHeight;
    if (external.limits.maxBlocks !== undefined) merged.maxBlocks = external.limits.maxBlocks;
    if (external.limits.maxSteps !== undefined) merged.maxSteps = external.limits.maxSteps;
    if (external.limits.maxUniqueBlocks !== undefined) merged.maxUniqueBlocks = external.limits.maxUniqueBlocks;
    if (external.limits.maxFailedBlocksPercent !== undefined) merged.maxFailedBlocksPercent = external.limits.maxFailedBlocksPercent;
  }

  if (external.performance) {
    if (external.performance.buildRateLimit !== undefined) merged.buildRateLimit = external.performance.buildRateLimit;
    if (external.performance.chatCommandMinDelayMs !== undefined) merged.chatCommandMinDelayMs = external.performance.chatCommandMinDelayMs;
    if (external.performance.pixelArtBatching !== undefined) merged.pixelArtBatching = external.performance.pixelArtBatching;
  }

  if (external.worldedit) {
    merged.worldEdit = deepMerge(merged.worldEdit, external.worldedit);
  }

  if (external.validation) {
    if (external.validation.minQualityScore !== undefined) merged.minQualityScore = external.validation.minQualityScore;
    if (external.validation.requireFeatureCompletion !== undefined) merged.requireFeatureCompletion = external.validation.requireFeatureCompletion;
    if (external.validation.allowPartialBuilds !== undefined) merged.allowPartialBuilds = external.validation.allowPartialBuilds;
  }

  if (external.llm) {
    if (external.llm.timeoutMs !== undefined) merged.llmTimeoutMs = external.llm.timeoutMs;
    if (external.llm.maxRetries !== undefined) merged.llmMaxRetries = external.llm.maxRetries;
    if (external.llm.retryDelayMs !== undefined) merged.llmRetryDelayMs = external.llm.retryDelayMs;
    if (external.llm.maxOutputTokens !== undefined) merged.llmMaxOutputTokens = external.llm.maxOutputTokens;
  }

  return merged;
}

// Export merged configuration
export const SAFETY_LIMITS = mergeExternalConfig(DEFAULT_LIMITS, externalConfig);

/**
 * Intent-based scale mapping for dimension scaling
 * Re-exported from creative-scales.js for convenience
 */
export { INTENT_SCALE_MAP } from './creative-scales.js';

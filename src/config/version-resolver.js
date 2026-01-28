/**
 * Centralized Minecraft version resolution
 *
 * Resolves version from (in priority order):
 * 1. Server-reported version (from bot connection)
 * 2. Environment variable (MINECRAFT_VERSION)
 * 3. Default fallback (1.20.1)
 */

let resolvedVersion = null;
let versionSource = 'default';

/**
 * Resolve and cache the Minecraft version
 * @param {Object} bot - Mineflayer bot instance (optional)
 * @returns {string} - Resolved Minecraft version
 */
export function resolveVersion(bot) {
  if (resolvedVersion) return resolvedVersion;

  if (bot?.version) {
    resolvedVersion = bot.version;
    versionSource = 'server';
  } else if (process.env.MINECRAFT_VERSION) {
    resolvedVersion = process.env.MINECRAFT_VERSION;
    versionSource = 'environment';
  } else {
    resolvedVersion = '1.20.1';
    versionSource = 'default';
  }

  console.log(`[Version] Resolved: ${resolvedVersion} (source: ${versionSource})`);
  return resolvedVersion;
}

/**
 * Get the resolved version (must call resolveVersion first)
 * @returns {string} - Cached Minecraft version
 * @throws {Error} - If resolveVersion hasn't been called
 */
export function getResolvedVersion() {
  if (!resolvedVersion) {
    throw new Error('Version not resolved. Call resolveVersion(bot) first.');
  }
  return resolvedVersion;
}

/**
 * Get the source of the resolved version
 * @returns {string} - 'server', 'environment', or 'default'
 */
export function getVersionSource() {
  return versionSource;
}

/**
 * Reset version resolution (primarily for testing)
 */
export function resetVersionResolver() {
  resolvedVersion = null;
  versionSource = 'default';
}

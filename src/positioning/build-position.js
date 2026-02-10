/**
 * Build Position Calculator
 *
 * Computes the world-space origin for a build. Used by all build pathways
 * (schematic, gallery, V1, V2) in src/bot/commands.js.
 *
 * Algorithm:
 *   1. If explicit --at coordinates were provided, use them directly.
 *   2. Otherwise resolve the requesting player's entity (fallback: bot entity).
 *   3. Compute the entity's view direction from yaw.
 *   4. Offset FORWARD_OFFSET blocks in that direction.
 *   5. Floor to integer block coordinates.
 */

/** Number of blocks in front of the player/bot to place the build origin. */
export const FORWARD_OFFSET = 5;

/**
 * Calculate the build origin position.
 *
 * @param {Object} bot        - Mineflayer bot instance (needs .entity, .players)
 * @param {string} username   - Player who issued the build command (may be null)
 * @param {Object} coordFlags - Parsed coordinate flags ({ position?: {x,y,z} })
 * @returns {{ x: number, y: number, z: number }}
 */
export function calculateBuildPosition(bot, username, coordFlags) {
  if (coordFlags?.position) {
    return coordFlags.position;
  }

  let targetEntity = bot.entity;
  if (username && bot.players[username] && bot.players[username].entity) {
    targetEntity = bot.players[username].entity;
  }

  const viewDir = {
    x: -Math.sin(targetEntity.yaw),
    z: -Math.cos(targetEntity.yaw)
  };

  const startPos = targetEntity.position.offset(
    viewDir.x * FORWARD_OFFSET,
    0,
    viewDir.z * FORWARD_OFFSET
  );

  return {
    x: Math.floor(startPos.x),
    y: Math.floor(startPos.y),
    z: Math.floor(startPos.z)
  };
}

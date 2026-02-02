import mineflayer from 'mineflayer';
import pathfinderPlugin from 'mineflayer-pathfinder';
import { ReconnectManager } from './reconnect-manager.js';

const { pathfinder, Movements } = pathfinderPlugin;

// Singleton reconnect manager
let reconnectManager = null;

/**
 * Create and configure a Mineflayer bot
 * @param {Object} config - Bot configuration
 * @returns {Object} - Mineflayer bot instance
 */
export function createBot(config) {
  const bot = mineflayer.createBot({
    host: config.host || 'localhost',
    port: config.port || 25565,
    username: config.username || 'BOB_Builder',
    version: config.version || '1.20.1',
    hideErrors: false
  });

  // Load pathfinder plugin with error handling
  try {
    bot.loadPlugin(pathfinder);
  } catch (err) {
    console.warn('⚠ Failed to load pathfinder plugin:', err.message);
    console.warn('  Bot will function without pathfinding capabilities');
  }

  bot.on('login', () => {
    console.log('✓ B.O.B connected to Minecraft!');
    console.log(`  Server: ${config.host}:${config.port}`);
    console.log(`  Username: ${config.username}`);
    console.log(`  Version: ${config.version}`);
  });

  bot.on('spawn', () => {
    console.log('✓ B.O.B spawned in world');
    if (bot.entity && bot.entity.position) {
      console.log(`  Position: ${Math.floor(bot.entity.position.x)}, ${Math.floor(bot.entity.position.y)}, ${Math.floor(bot.entity.position.z)}`);
      
      // Initialize pathfinder movements
      try {
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove);
        console.log('✓ Pathfinder initialized');
      } catch (err) {
        console.warn('⚠ Pathfinder initialization failed:', err.message);
      }
    }
  });

  bot.on('error', (err) => {
    console.error('Bot error:', err.message);
  });

  bot.on('kicked', (reason) => {
    console.error('Bot was kicked:', reason);
  });

  bot.on('end', () => {
    console.log('Bot disconnected from server');
  });

  bot.on('death', () => {
    console.log('Bot died! Respawning...');
  });

  bot.on('health', () => {
    if (bot.health <= 5) {
      console.warn(`⚠ Low health: ${bot.health}`);
    }
  });

  return bot;
}

/**
 * Initialize the reconnect manager for automatic reconnection
 * @param {Object} bot - Mineflayer bot instance
 * @param {Object} builder - Builder instance
 * @param {string} apiKey - API key for commands
 * @param {Object} config - Bot configuration
 * @param {Object} options - Additional options
 * @returns {ReconnectManager} The reconnect manager instance
 */
export function initializeReconnectManager(bot, builder, apiKey, config, options = {}) {
  reconnectManager = new ReconnectManager({
    createBot,
    config,
    maxRetries: options.maxRetries || 10,
    baseDelay: options.baseDelay || 5000,
    maxDelay: options.maxDelay || 60000,
    onReconnect: options.onReconnect || ((newBot, newBuilder, pendingResume) => {
      console.log('  [Reconnect] Bot reconnected successfully');
      if (pendingResume) {
        console.log('  [Reconnect] Pending build can be resumed with !build resume');
      }
    }),
    onGiveUp: options.onGiveUp || ((reason) => {
      console.error(`  [Reconnect] Failed to reconnect after all attempts. Reason: ${reason}`);
      console.error('  [Reconnect] Please restart B.O.B manually');
    })
  });

  reconnectManager.initialize(bot, builder, apiKey);

  return reconnectManager;
}

/**
 * Get the current reconnect manager instance
 * @returns {ReconnectManager|null}
 */
export function getReconnectManager() {
  return reconnectManager;
}

/**
 * Export ReconnectManager class for direct use
 */
export { ReconnectManager };

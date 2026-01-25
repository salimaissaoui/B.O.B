import mineflayer from 'mineflayer';
import { pathfinder, Movements } from 'mineflayer-pathfinder';

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

  // Load pathfinder plugin
  bot.loadPlugin(pathfinder);

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

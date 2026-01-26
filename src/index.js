import { createBot } from './bot/connection.js';
import { registerCommands } from './bot/commands.js';
import { Builder } from './stages/5-builder.js';
import dotenv from 'dotenv';

dotenv.config({ override: true });

/**
 * Main entry point for B.O.B
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  B.O.B - Build Orchestrating Bot      ║');
  console.log('║  AI-Powered Minecraft Builder          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log();

  // Validate environment variables
  const requiredEnvVars = ['GEMINI_API_KEY', 'MINECRAFT_HOST', 'MINECRAFT_PORT', 'MINECRAFT_USERNAME'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('✗ Missing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\nPlease create a .env file based on .env.example');
    process.exit(1);
  }

  const port = Number.parseInt(process.env.MINECRAFT_PORT, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error(`✗ Invalid MINECRAFT_PORT: ${process.env.MINECRAFT_PORT}`);
    process.exit(1);
  }

  // Initialize bot
  console.log('Initializing Minecraft bot...');
  const bot = createBot({
    host: process.env.MINECRAFT_HOST,
    port,
    username: process.env.MINECRAFT_USERNAME,
    version: process.env.MINECRAFT_VERSION || '1.20.1'
  });

  // Wait for bot to be ready
  await new Promise((resolve) => {
    bot.once('spawn', resolve);
  });

  // Create builder
  const builder = new Builder(bot);

  // Initialize builder (detect WorldEdit)
  await builder.initialize();

  // Register commands
  registerCommands(bot, builder, process.env.GEMINI_API_KEY);

  console.log();
  console.log('╔════════════════════════════════════════╗');
  console.log('║  B.O.B is ready!                       ║');
  console.log('║  Type !build help for commands         ║');
  console.log('╚════════════════════════════════════════╝');
  console.log();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down B.O.B...');
    if (builder.building) {
      try {
        builder.cancel();
      } catch (error) {
        console.warn(`Cancel failed: ${error.message}`);
      }
    }
    bot.quit();
    process.exit(0);
  });
}

// Run main function with detailed error handling
main().catch((error) => {
  console.error('\n╔════════════════════════════════════════╗');
  console.error('║  FATAL ERROR                           ║');
  console.error('╚════════════════════════════════════════╝\n');
  console.error('Error:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);

  if (error.code) {
    console.error('\nError code:', error.code);
  }

  if (error.cause) {
    console.error('\nCaused by:', error.cause);
  }

  process.exit(1);
});

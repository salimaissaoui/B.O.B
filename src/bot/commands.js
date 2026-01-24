import { generateDesignPlan } from '../stages/1-design-planner.js';
import { deriveBlockAllowlist } from '../stages/2-allowlist-deriver.js';
import { generateBlueprint } from '../stages/3-blueprint-generator.js';
import { validateAndRepair } from '../stages/4-validator.js';

/**
 * Register chat commands for the bot
 * @param {Object} bot - Mineflayer bot instance
 * @param {Builder} builder - Builder instance
 * @param {string} apiKey - Gemini API key
 */
export function registerCommands(bot, builder, apiKey) {
  bot.on('chat', async (username, message) => {
    // Ignore messages from the bot itself
    if (username === bot.username) return;

    try {
      // Check exact matches FIRST before startsWith
      // Cancel command
      if (message === '/build cancel') {
        try {
          builder.cancel();
          bot.chat('✓ Build cancelled');
        } catch (error) {
          bot.chat(`✗ ${error.message}`);
        }
      }

      // Undo command
      else if (message === '/build undo') {
        try {
          bot.chat('Undoing last build...');
          await builder.undo();
          bot.chat('✓ Last build undone');
        } catch (error) {
          bot.chat(`✗ ${error.message}`);
        }
      }

      // Status command
      else if (message === '/build status') {
        const progress = builder.getProgress();
        if (progress) {
          const elapsed = (progress.elapsedTime / 1000).toFixed(1);
          bot.chat(`Building... ${progress.blocksPlaced} blocks placed (${elapsed}s)`);
        } else {
          bot.chat('No build in progress');
        }
      }

      // Help command
      else if (message === '/build help') {
        bot.chat('B.O.B Commands:');
        bot.chat('  /build <description> - Start a new build');
        bot.chat('  /build cancel - Cancel current build');
        bot.chat('  /build undo - Undo last build');
        bot.chat('  /build status - Check build progress');
      }

      // Build command (check LAST since it uses startsWith)
      else if (message.startsWith('/build ')) {
        const prompt = message.slice(7).trim();

        if (!prompt) {
          bot.chat('Usage: /build <description>');
          return;
        }

        await handleBuildCommand(prompt, bot, builder, apiKey);
      }
    } catch (error) {
      console.error('Command error:', error);
      bot.chat(`✗ Error: ${error.message}`);
    }
  });

  console.log('✓ Chat commands registered');
  console.log('  Available commands: /build, /build cancel, /build undo, /build status, /build help');
}

/**
 * Handle the /build command
 */
async function handleBuildCommand(prompt, bot, builder, apiKey) {
  if (builder.building) {
    bot.chat('✗ Build already in progress');
    return;
  }

  if (!bot.entity || !bot.entity.position) {
    bot.chat('✗ Bot not spawned yet');
    return;
  }

  bot.chat(`Building: "${prompt}"...`);
  
  try {
    // Stage 1: Design Plan
    bot.chat('Stage 1/5: Creating design plan...');
    const designPlan = await generateDesignPlan(prompt, apiKey);
    
    // Stage 2: Allowlist
    bot.chat('Stage 2/5: Deriving block allowlist...');
    const allowlist = deriveBlockAllowlist(designPlan);
    
    // Stage 3: Blueprint
    bot.chat('Stage 3/5: Generating blueprint...');
    const blueprint = await generateBlueprint(designPlan, allowlist, apiKey);
    
    // Stage 4: Validation
    bot.chat('Stage 4/5: Validating blueprint...');
    const validation = await validateAndRepair(blueprint, allowlist, designPlan, apiKey);
    
    if (!validation.valid) {
      bot.chat('✗ Blueprint validation failed');
      console.error('Validation errors:', validation.errors);
      return;
    }
    
    // Stage 5: Execution
    bot.chat('Stage 5/5: Building...');
    const startPos = bot.entity.position.offset(3, 0, 0);  // Build 3 blocks in front
    
    await builder.executeBlueprint(validation.blueprint, {
      x: Math.floor(startPos.x),
      y: Math.floor(startPos.y),
      z: Math.floor(startPos.z)
    });
    
    bot.chat('✓ Build complete!');
  } catch (error) {
    console.error('Build command failed:', error);
    bot.chat(`✗ Build failed: ${error.message}`);
  }
}

import { analyzePrompt } from '../stages/1-analyzer.js';
import { generateBlueprint } from '../stages/2-generator.js';
import { validateBlueprint } from '../stages/4-validator.js';

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
      if (message === '!build cancel') {
        try {
          builder.cancel();
          bot.chat('Build cancelled');
        } catch (error) {
          bot.chat(`Error: ${error.message}`);
        }
      }

      // Undo command
      else if (message === '!build undo') {
        try {
          bot.chat('Undoing last build...');
          await builder.undo();
          bot.chat('Last build undone');
        } catch (error) {
          bot.chat(`Error: ${error.message}`);
        }
      }

      // Status command
      else if (message === '!build status') {
        const progress = builder.getProgress();
        if (progress) {
          const elapsed = (progress.elapsedTime / 1000).toFixed(1);
          bot.chat(`Building... ${elapsed}s elapsed`);
          bot.chat(`  Blocks: ${progress.blocksPlaced}`);

          if (builder.worldEditEnabled) {
            bot.chat(`  WorldEdit ops: ${progress.worldEditOps}`);

            if (progress.fallbacksUsed > 0) {
              bot.chat(`  Fallbacks: ${progress.fallbacksUsed}`);
            }

            const weStatus = builder.worldEdit.getStatus();
            if (weStatus.unconfirmedOps > 0) {
              bot.chat(`  Unconfirmed WE ops: ${weStatus.unconfirmedOps}`);
            }
          }

          if (progress.warnings && progress.warnings.length > 0) {
            bot.chat(`  Warnings: ${progress.warnings.length}`);
          }
        } else {
          bot.chat('No build in progress');
        }
      }

      // Help command
      else if (message === '!build help') {
        bot.chat('B.O.B Commands:');
        bot.chat('  !build <description> - Start a new build');
        bot.chat('  !build cancel - Cancel current build');
        bot.chat('  !build undo - Undo last build');
        bot.chat('  !build status - Check build progress');
      }

      // Build command (check LAST since it uses startsWith)
      else if (message.startsWith('!build ')) {
        const prompt = message.slice(7).trim();

        if (!prompt) {
          bot.chat('Usage: !build <description>');
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
  console.log('  Available commands: !build, !build cancel, !build undo, !build status, !build help');
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
    // Stage 1: ANALYZER (lightweight, no LLM)
    bot.chat('Stage 1/3: Analyzing prompt...');
    const analysis = analyzePrompt(prompt);
    console.log(`  Build Type: ${analysis.buildType} (${analysis.buildTypeInfo.confidence})`);
    console.log(`  Theme: ${analysis.theme?.name || 'default'}`);

    // Stage 2: GENERATOR (single LLM call)
    bot.chat('Stage 2/3: Generating blueprint...');
    const blueprint = await generateBlueprint(
      analysis,
      apiKey,
      builder.worldEditEnabled
    );
    console.log(`  Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);
    console.log(`  Blocks: ${blueprint.palette.length} types`);
    console.log(`  Steps: ${blueprint.steps.length} operations`);

    // Stage 3: VALIDATOR + EXECUTOR
    bot.chat('Stage 3/3: Validating & building...');
    const validation = await validateBlueprint(blueprint, analysis, apiKey);

    if (!validation.valid) {
      bot.chat('✗ Blueprint validation failed');
      console.error('Validation errors:', validation.errors);
      return;
    }

    // Execute
    const startPos = bot.entity.position.offset(3, 0, 0);
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

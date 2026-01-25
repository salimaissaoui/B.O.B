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
      // Cancel command
      if (message === '!build cancel') {
        try {
          builder.cancel();
          safeChat(bot, 'Build cancelled');
        } catch (error) {
          safeChat(bot, `Error: ${error.message}`);
        }
      }

      // Undo command
      else if (message === '!build undo') {
        try {
          safeChat(bot, 'Undoing last build...');
          await builder.undo();
          safeChat(bot, 'Last build undone');
        } catch (error) {
          safeChat(bot, `Error: ${error.message}`);
        }
      }

      // Status command
      else if (message === '!build status') {
        const progress = builder.getProgress();
        if (progress) {
          const elapsed = (progress.elapsedTime / 1000).toFixed(1);
          safeChat(bot, `Building... ${elapsed}s elapsed`);
          safeChat(bot, `  Blocks: ${progress.blocksPlaced}`);

          if (builder.worldEditEnabled) {
            safeChat(bot, `  WorldEdit ops: ${progress.worldEditOps}`);

            if (progress.fallbacksUsed > 0) {
              safeChat(bot, `  Fallbacks: ${progress.fallbacksUsed}`);
            }

            const weStatus = builder.worldEdit.getStatus();
            if (weStatus.unconfirmedOps > 0) {
              safeChat(bot, `  Unconfirmed WE ops: ${weStatus.unconfirmedOps}`);
            }
          }

          if (progress.warnings && progress.warnings.length > 0) {
            safeChat(bot, `  Warnings: ${progress.warnings.length}`);
          }
        } else {
          safeChat(bot, 'No build in progress');
        }
      }

      // Help command
      else if (message === '!build help') {
        safeChat(bot, 'B.O.B Commands:');
        safeChat(bot, '  !build <description> - Start a new build');
        safeChat(bot, '  !build cancel - Cancel current build');
        safeChat(bot, '  !build undo - Undo last build');
        safeChat(bot, '  !build status - Check build progress');
      }

      // Build command (check LAST since it uses startsWith)
      else if (message.startsWith('!build ')) {
        const prompt = message.slice(7).trim();

        if (!prompt) {
          safeChat(bot, 'Usage: !build <description>');
          return;
        }

        await handleBuildCommand(prompt, bot, builder, apiKey, username);
      }
    } catch (error) {
      console.error('Command error:', error);
      safeChat(bot, `✗ Error: ${error.message}`);
    }
  });

  console.log('✓ Chat commands registered');
  console.log('  Available commands: !build, !build cancel, !build undo, !build status, !build help');
}

/**
 * Handle the /build command
 */
async function handleBuildCommand(prompt, bot, builder, apiKey, username) {
  if (builder.building) {
    safeChat(bot, '✗ Build already in progress');
    return;
  }

  if (!bot.entity || !bot.entity.position) {
    safeChat(bot, '✗ Bot not spawned yet');
    return;
  }

  safeChat(bot, `Building: "${prompt}"...`);

  try {
    // Stage 1: ANALYZER (lightweight, no LLM)
    safeChat(bot, 'Stage 1/3: Analyzing prompt...');
    const analysis = analyzePrompt(prompt);
    console.log(`  Build Type: ${analysis.buildType} (${analysis.buildTypeInfo.confidence})`);
    console.log(`  Theme: ${analysis.theme?.name || 'default'}`);

    // Stage 2: GENERATOR (single LLM call)
    safeChat(bot, 'Stage 2/3: Generating blueprint...');
    const blueprint = await generateBlueprint(
      analysis,
      apiKey,
      builder.worldEditEnabled
    );
    console.log(`  Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);
    console.log(`  Blocks: ${blueprint.palette.length} types`);
    console.log(`  Steps: ${blueprint.steps.length} operations`);

    // Stage 3: VALIDATOR + EXECUTOR
    safeChat(bot, 'Stage 3/3: Validating & building...');
    const validation = await validateBlueprint(blueprint, analysis, apiKey);

    if (!validation.valid) {
      safeChat(bot, '✗ Blueprint validation failed');
      console.error('Validation errors:', validation.errors);
      return;
    }

    // Execute
    // Try to build relative to the player who issued the command
    let targetEntity = bot.entity;
    let targetName = 'Bot';

    if (username && bot.players[username] && bot.players[username].entity) {
      targetEntity = bot.players[username].entity;
      targetName = username;
      console.log(`Building relative to player: ${username}`);
    } else {
      console.log('Player entity not found, building relative to bot');
    }

    // Calculate position 5 blocks in front of the target based on yaw
    const viewDir = {
      x: -Math.sin(targetEntity.yaw),
      z: -Math.cos(targetEntity.yaw)
    };

    // Offset 5 blocks forward
    const startPos = targetEntity.position.offset(
      viewDir.x * 5,
      0,
      viewDir.z * 5
    );

    const buildPos = {
      x: Math.floor(startPos.x),
      y: Math.floor(startPos.y),
      z: Math.floor(startPos.z)
    };

    safeChat(bot, `Starting build at: ${buildPos.x}, ${buildPos.y}, ${buildPos.z}`);

    await builder.executeBlueprint(validation.blueprint, buildPos);

    safeChat(bot, '✓ Build complete!');
  } catch (error) {
    console.error('Build command failed:', error);
    safeChat(bot, `✗ Build failed: ${error.message}`);
  }
}

function safeChat(bot, message) {
  try {
    if (bot && bot.chat) {
      bot.chat(message);
    }
  } catch (err) {
    console.warn(`Failed to send chat message: ${message} (Bot likely disconnected)`);
  }
}

import { analyzePrompt } from '../stages/1-analyzer.js';
import { referenceStage } from '../stages/0-reference.js';
import { generateBlueprint } from '../stages/2-generator.js';
import { validateBlueprint } from '../stages/4-validator.js';
import { exportBlueprint } from '../export/index.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { parseCoordinateFlags, stripCoordinateFlags, validateBoundingBox } from '../utils/coordinate-parser.js';
import { getMemory } from '../memory/index.js';

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
        safeChat(bot, '  !build resume - Resume interrupted build');
        safeChat(bot, '  !build rate <1-5> - Rate last build');
        safeChat(bot, '  !build list - List saved builds');
      }

      // Rate command - provide feedback on last build
      else if (message.startsWith('!build rate')) {
        try {
          const parts = message.slice(11).trim().split(/\s+/);
          const rating = parts[0];
          const comment = parts.slice(1).join(' ');

          if (!rating) {
            safeChat(bot, 'Usage: !build rate <1-5> [comment]');
            return;
          }

          const memory = getMemory();
          const result = memory.recordFeedback(rating, comment);

          if (result.success) {
            const stars = '⭐'.repeat(result.rating) + '☆'.repeat(5 - result.rating);
            safeChat(bot, `✓ Thanks for the feedback! ${stars}`);
          } else {
            safeChat(bot, `✗ ${result.error}`);
          }
        } catch (error) {
          safeChat(bot, `Rate failed: ${error.message}`);
        }
      }

      // Resume command
      else if (message === '!build resume') {
        try {
          const resumable = builder.getResumableBuilds();
          if (resumable.length === 0) {
            safeChat(bot, 'No incomplete builds to resume');
            return;
          }

          const resumeData = await builder.resumeBuild();
          if (resumeData) {
            safeChat(bot, `Resuming build: ${resumeData.buildType || 'unknown'}`);
            safeChat(bot, `Progress: ${resumeData.blocksPlacedSoFar} blocks placed`);
            // Note: Full resume would need to reload the blueprint
            safeChat(bot, 'Resume feature will continue from last checkpoint');
          }
        } catch (error) {
          safeChat(bot, `Resume failed: ${error.message}`);
        }
      }

      // List builds command
      else if (message === '!build list') {
        try {
          const builds = builder.stateManager.listSavedBuilds().slice(0, 5);
          if (builds.length === 0) {
            safeChat(bot, 'No saved builds found');
            return;
          }

          safeChat(bot, `Recent builds (${builds.length}):`);
          for (const build of builds) {
            safeChat(bot, `  ${build.status}: ${build.buildType || '?'} - ${build.progress}`);
          }
        } catch (error) {
          safeChat(bot, `List failed: ${error.message}`);
        }
      }

      // WE ACK Test Command (Debug)
      else if (message === '!weacktest') {
        if (!builder.worldEditEnabled) {
          safeChat(bot, 'WorldEdit not detected');
        } else {
          safeChat(bot, 'Starting WE ACK Test (via Executor)...');
          const pos = bot.entity.position.floored();
          const we = builder.worldEdit; // Access the executor instance directly

          try {
            // 1. Selection Mode
            await we.executeCommand('//sel cuboid');

            // 2. Set Positions
            await we.executeCommand(`//pos1 ${pos.x},${pos.y},${pos.z}`);
            await we.executeCommand(`//pos2 ${pos.x + 2},${pos.y + 2},${pos.z + 2}`);

            // 3. Set Block (Strict Verification)
            // checking if fillSelection logic works (should NOT act as -a)
            // But for this test, let's call executeCommand with the CLEAN command to prove it works
            const setRes = await we.executeCommand('//set stone');

            // 4. Clear
            await we.executeCommand('//desel');

            // 5. Verify Set Result
            // Requirement D: Mark PASSED only if observed real completion signal
            const resp = setRes.response ? setRes.response : '';
            const respLower = resp.toLowerCase();

            const isFaweSuccess = respLower.includes('operation completed');
            const isFaweElapsed = respLower.includes('elapsed') && respLower.includes('history') && respLower.includes('changed');
            // FIXED: Use precise regex to avoid false positives like "Selection type changed"
            const isStandardSuccess = /\d+\s*blocks?\s*(changed|affected|set)/i.test(resp);

            // Block count validation (3x3x3 = 27 blocks expected)
            const expectedBlocks = 27;
            const actualBlocks = setRes.blocksChanged;

            if (setRes.confirmed && (isFaweSuccess || isFaweElapsed || isStandardSuccess)) {
              if (actualBlocks !== null && actualBlocks !== expectedBlocks) {
                safeChat(bot, `WE ACK Test WARN: Expected ${expectedBlocks} blocks, got ${actualBlocks}`);
              }
              safeChat(bot, 'WE ACK Test PASSED');
            } else {
              safeChat(bot, 'WE ACK Test FAILED: did not observe completion ACK');
              console.warn(`Failed Response: ${resp}`);
            }
          } catch (err) {
            safeChat(bot, `WE ACK Test FAILED: ${err.message}`);
            console.error(err);
          }
        }
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
 * 
 * Supports flags:
 *   --export schem    Export to .schem file instead of building
 *   --export function Export to .mcfunction file
 *   --at X,Y,Z        Build at specific coordinates
 *   --to X2,Y2,Z2     Define bounding box (requires --at)
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

  // Parse export flag
  let exportFormat = null;
  let cleanPrompt = prompt;

  const exportMatch = prompt.match(/--export\s+(schem|schematic|function|mcfunction)/i);
  if (exportMatch) {
    exportFormat = exportMatch[1].toLowerCase();
    if (exportFormat === 'schematic') exportFormat = 'schem';
    if (exportFormat === 'function') exportFormat = 'mcfunction';
    cleanPrompt = prompt.replace(/--export\s+\w+/i, '').trim();
  }

  // Parse coordinate flags (--at X,Y,Z --to X2,Y2,Z2)
  const coordFlags = parseCoordinateFlags(cleanPrompt);
  cleanPrompt = stripCoordinateFlags(cleanPrompt);

  // Validate bounding box if specified
  if (coordFlags.boundingBox) {
    const boxValidation = validateBoundingBox(coordFlags.boundingBox, SAFETY_LIMITS);
    if (!boxValidation.valid) {
      safeChat(bot, `✗ Invalid bounding box: ${boxValidation.errors[0]}`);
      return;
    }
  }

  if (exportFormat) {
    safeChat(bot, `Generating blueprint for export (${exportFormat})...`);
  } else if (coordFlags.position) {
    safeChat(bot, `Building: "${cleanPrompt}" at ${coordFlags.position.x}, ${coordFlags.position.y}, ${coordFlags.position.z}...`);
  } else {
    safeChat(bot, `Building: "${cleanPrompt}"...`);
  }

  try {
    // Stage 1: ANALYZER (lightweight, no LLM)
    safeChat(bot, 'Stage 1/3: Analyzing prompt...');
    const analysis = analyzePrompt(prompt);
    console.log(`  Build Type: ${analysis.buildType} (${analysis.buildTypeInfo.confidence})`);
    console.log(`  Theme: ${analysis.theme?.name || 'default'}`);

    // Stage 0: REFERENCE (Optional image analysis)
    let reference = { hasReference: false };
    if (analysis.imageSource?.hasImage) {
      safeChat(bot, 'Stage 1.5: Analyzing visual reference...');
      reference = await referenceStage(analysis, apiKey);
    }

    // Stage 2: GENERATOR (single LLM call)
    safeChat(bot, 'Stage 2/3: Generating blueprint...');

    let blueprint;
    try {
      blueprint = await generateBlueprint(
        analysis,
        apiKey,
        builder.worldEditEnabled,
        reference
      );
    } catch (genError) {
      console.error('Blueprint generation failed:', genError);
      safeChat(bot, '✗ Blueprint generation failed (see console)');
      return;
    }
    console.log(`  Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);
    const paletteCount = Array.isArray(blueprint.palette)
      ? blueprint.palette.length
      : Object.keys(blueprint.palette || {}).length;
    console.log(`  Blocks: ${paletteCount} types`);
    console.log(`  Steps: ${blueprint.steps.length} operations`);

    // Stage 3: VALIDATOR + EXECUTOR
    safeChat(bot, 'Stage 3/3: Validating...');
    const validation = await validateBlueprint(blueprint, analysis, apiKey);

    if (!validation.valid) {
      safeChat(bot, '✗ Blueprint validation failed');
      console.error('Validation errors:', validation.errors);
      return;
    }

    // If export mode, write to file instead of building
    if (exportFormat && SAFETY_LIMITS.export?.enabled !== false) {
      try {
        const timestamp = Date.now();
        const filename = `${blueprint.buildType || 'build'}_${timestamp}`;
        const exportPath = await exportBlueprint(validation.blueprint, exportFormat, filename);
        safeChat(bot, `✓ Exported to: ${exportPath}`);
        return;
      } catch (exportError) {
        console.error('Export failed:', exportError);
        safeChat(bot, `✗ Export failed: ${exportError.message}`);
        return;
      }
    }

    // Execute live build
    safeChat(bot, 'Building...');

    let buildPos;

    // Use explicit coordinates if --at flag was provided
    if (coordFlags.position) {
      buildPos = coordFlags.position;
      console.log(`Building at explicit position: ${buildPos.x}, ${buildPos.y}, ${buildPos.z}`);
    } else {
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

      buildPos = {
        x: Math.floor(startPos.x),
        y: Math.floor(startPos.y),
        z: Math.floor(startPos.z)
      };
    }

    safeChat(bot, `Starting build at: ${buildPos.x}, ${buildPos.y}, ${buildPos.z}`);

    await builder.executeBlueprint(validation.blueprint, buildPos);

    // Track in memory for feedback
    try {
      const memory = getMemory();
      memory.trackLastBuild(validation.blueprint);
    } catch (e) {
      console.warn('Failed to track build in memory:', e.message);
    }

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

import { analyzePrompt } from '../stages/1-analyzer.js';
import { referenceStage } from '../stages/0-reference.js';
import { generateBlueprint } from '../stages/2-generator.js';
import { validateBlueprint } from '../stages/4-validator.js';
import { exportBlueprint } from '../export/index.js';
import { SAFETY_LIMITS } from '../config/limits.js';
import { parseCoordinateFlags, stripCoordinateFlags, validateBoundingBox } from '../utils/coordinate-parser.js';
import { getMemory } from '../memory/index.js';
import { isSchematicPath, loadAndConvert } from '../services/schematic-loader.js';
import { findBestMatch as findSchematicMatch, listSchematics } from '../services/schematic-gallery.js';
import {
  getBuilderVersion,
  setBuilderVersion,
  runBuilderV2Pipeline,
  convertToLegacyBlueprint
} from '../builder_v2/index.js';
import { isKnownLandmark } from '../builder_v2/landmarks/registry.js';
import { calculateBuildPosition } from '../positioning/build-position.js';

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
        safeChat(bot, '  !builder v1|v2|status - Toggle builder version');
      }

      // Builder version toggle command
      else if (message.startsWith('!builder')) {
        const arg = message.slice(8).trim().toLowerCase();
        const currentVersion = getBuilderVersion();

        if (arg === 'v1') {
          setBuilderVersion('v1');
          safeChat(bot, '✓ Switched to Builder v1 (legacy)');
        } else if (arg === 'v2') {
          setBuilderVersion('v2');
          safeChat(bot, '✓ Switched to Builder v2 (experimental)');
        } else if (arg === 'status' || arg === '') {
          safeChat(bot, `Builder version: ${currentVersion}`);
          safeChat(bot, '  Use !builder v1 or !builder v2 to switch');
        } else {
          safeChat(bot, 'Usage: !builder v1|v2|status');
        }
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

  // Check for dry-run flag
  const isDryRun = prompt.includes('--dry-run');
  prompt = prompt.replace(/--dry-run/gi, '').trim();

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

  // SCHEMATIC FAST-PATH: Detect schematic file paths
  if (isSchematicPath(cleanPrompt)) {
    safeChat(bot, `📦 Loading schematic: ${cleanPrompt}`);
    try {
      const blueprint = await loadAndConvert(cleanPrompt.trim(), {
        useWorldEdit: builder.worldEditEnabled
      });

      safeChat(bot, `  Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);
      safeChat(bot, `  Blocks: ${blueprint.palette.length} types, ${blueprint.steps.length} ops`);

      // Calculate build position
      const buildPos = calculateBuildPosition(bot, username, coordFlags);

      safeChat(bot, `Building at: ${buildPos.x}, ${buildPos.y}, ${buildPos.z}`);
      await builder.executeBlueprint(blueprint, buildPos);
      safeChat(bot, '✓ Schematic build complete!');
      return;
    } catch (schematicError) {
      console.error('Schematic loading failed:', schematicError);
      safeChat(bot, `✗ Schematic error: ${schematicError.message}`);
      return;
    }
  }

  // SCHEMATIC GALLERY: Search local schematics folder for fuzzy match
  try {
    const schematicMatch = await findSchematicMatch(cleanPrompt, 0.6);
    if (schematicMatch) {
      safeChat(bot, `📦 Found schematic: ${schematicMatch.name} (${(schematicMatch.score * 100).toFixed(0)}% match)`);

      const blueprint = await loadAndConvert(schematicMatch.path, {
        useWorldEdit: builder.worldEditEnabled
      });

      safeChat(bot, `  Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);
      safeChat(bot, `  Blocks: ${blueprint.palette.length} types`);

      // Calculate build position
      const buildPos = calculateBuildPosition(bot, username, coordFlags);

      safeChat(bot, `Building at: ${buildPos.x}, ${buildPos.y}, ${buildPos.z}`);
      await builder.executeBlueprint(blueprint, buildPos);
      safeChat(bot, '✓ Schematic build complete!');
      return;
    }
  } catch (galleryError) {
    console.warn('Schematic gallery search failed:', galleryError.message);
    // Continue to LLM generation
  }

  // Check if Builder v2 should be used
  // Auto-route known landmarks and specific build types to V2 for better quality
  const builderVersion = getBuilderVersion();
  const detectedLandmark = isKnownLandmark(cleanPrompt);

  // Build types that benefit from V2's deterministic components
  const v2BuildTypes = ['lattice', 'statue', 'armature', 'humanoid', 'quadruped', 'monument'];
  const promptLower = cleanPrompt.toLowerCase();
  const hasV2BuildType = v2BuildTypes.some(type => promptLower.includes(type));

  // Auto-route to V2 for:
  // 1. Explicit v2 mode
  // 2. Known landmarks (Eiffel Tower, etc.)
  // 3. Build types that V2 handles better (statues, lattices)
  const shouldUseV2 = builderVersion === 'v2' || detectedLandmark || hasV2BuildType;

  if (shouldUseV2) {
    const reason = detectedLandmark ? 'landmark' : (hasV2BuildType ? 'build type' : 'explicit v2');
    console.log(`  [Commands] Auto-routing to V2 (${reason}): "${cleanPrompt}"`);
    await handleBuildCommandV2(cleanPrompt, bot, builder, apiKey, username, {
      dryRun: isDryRun,
      exportFormat,
      coordFlags
    });
    return;
  }

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

    const buildPos = calculateBuildPosition(bot, username, coordFlags);

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

/**
 * Handle build command using Builder v2 pipeline
 */
async function handleBuildCommandV2(prompt, bot, builder, apiKey, username, options = {}) {
  const { dryRun = false, exportFormat, coordFlags } = options;

  safeChat(bot, `[v2] Building: "${prompt}"${dryRun ? ' (DRY RUN)' : ''}`);

  try {
    // Run v2 pipeline
    const context = {
      worldEditAvailable: builder.worldEditEnabled,
      serverVersion: '1.20.1'  // Could detect from server
    };

    const result = await runBuilderV2Pipeline(prompt, apiKey, context, { dryRun });

    if (!result.success) {
      safeChat(bot, '✗ Builder v2 pipeline failed');
      for (const err of result.errors.slice(0, 3)) {
        safeChat(bot, `  Error: ${err}`);
      }
      return;
    }

    // Report stages
    if (result.stages.intent) {
      safeChat(bot, `  Intent: ${result.stages.intent.category}/${result.stages.intent.scale}`);
    }
    if (result.stages.scene) {
      safeChat(bot, `  Scene: ${result.stages.scene.title || 'untitled'}`);
    }
    if (result.stages.plan) {
      safeChat(bot, `  Plan: ${result.stages.plan.stats.totalBlocks} blocks`);
    }

    // Dry run stops here
    if (dryRun) {
      safeChat(bot, '✓ Dry run complete');
      if (result.stages.placement) {
        const stats = result.stages.placement.stats;
        safeChat(bot, `  WE batches: ${stats.worldEditCommands / 3 | 0}`);
        safeChat(bot, `  Vanilla blocks: ${stats.vanillaBlocks}`);
        safeChat(bot, `  Est. time: ${stats.estimatedTime.toFixed(1)}s`);
      }
      return;
    }

    // Convert to legacy blueprint and execute
    if (result.plan && result.placement) {
      const legacyBlueprint = convertToLegacyBlueprint(result.plan, result.placement);

      // Calculate build position
      const buildPos = calculateBuildPosition(bot, username, coordFlags);

      safeChat(bot, `Building at: ${buildPos.x}, ${buildPos.y}, ${buildPos.z}`);
      await builder.executeBlueprint(legacyBlueprint, buildPos);

      // Track in memory
      try {
        const memory = getMemory();
        memory.trackLastBuild(legacyBlueprint);
      } catch (e) {
        console.warn('Failed to track build in memory:', e.message);
      }

      safeChat(bot, '✓ Build complete! (Builder v2)');
    }
  } catch (error) {
    console.error('Builder v2 error:', error);
    safeChat(bot, `✗ v2 Error: ${error.message}`);
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

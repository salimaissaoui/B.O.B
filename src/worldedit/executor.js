import { SAFETY_LIMITS } from '../config/limits.js';

/**
 * WorldEdit Executor
 * Handles WorldEdit command execution with rate limiting and validation
 */
export class WorldEditExecutor {
  constructor(bot) {
    this.bot = bot;
    this.available = false;
    this.commandQueue = [];
    this.lastCommandTime = 0;
    this.commandsExecuted = 0;
    this.spamDetected = false;
    this.backoffMultiplier = 1.0;

    // P0 Fix: Track executed commands for undo support
    this.commandHistory = [];

    // P0 Fix: Pending response handlers for command acknowledgment
    this.pendingResponse = null;

    // Track unconfirmed operations (no acknowledgment received)
    this.unconfirmedOps = [];

    // Listen for chat messages (spam warnings + command responses)
    if (bot && typeof bot.on === 'function') {
      bot.on('message', (message) => {
        const text = message.toString();
        const textLower = text.toLowerCase();

        // Handle spam warnings
        if (textLower.includes('spam') ||
            textLower.includes('too fast') ||
            textLower.includes('slow down') ||
            textLower.includes('wait')) {
          console.warn('⚠ Spam warning detected, increasing delays...');
          this.spamDetected = true;
          this.backoffMultiplier = Math.min(this.backoffMultiplier * 2, 4.0);
        }

        // P0 Fix: Handle pending response callbacks
        if (this.pendingResponse) {
          this.pendingResponse.handler(text);
        }
      });
    }
  }

  /**
   * Wait for a chat message matching a pattern
   * @param {RegExp|Function} matcher - Pattern or function to match message
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<string|null>} - Matched message or null on timeout
   */
  waitForResponse(matcher, timeoutMs = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const handler = (text) => {
        const matches = typeof matcher === 'function'
          ? matcher(text)
          : matcher.test(text);

        if (matches) {
          this.pendingResponse = null;
          resolve(text);
        } else if (Date.now() - startTime > timeoutMs) {
          this.pendingResponse = null;
          resolve(null);
        }
      };

      this.pendingResponse = { handler, startTime };

      // Set timeout fallback
      setTimeout(() => {
        if (this.pendingResponse && this.pendingResponse.startTime === startTime) {
          this.pendingResponse = null;
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  /**
   * Detect if WorldEdit is available by testing a safe command
   * P0 Fix: Actually parse the response instead of assuming success
   */
  async detectWorldEdit() {
    if (!SAFETY_LIMITS.worldEdit.enabled) {
      console.log('WorldEdit disabled in configuration');
      this.available = false;
      return false;
    }

    if (!this.bot || typeof this.bot.chat !== 'function') {
      console.log('✗ WorldEdit not available: bot.chat not available');
      this.available = false;
      return false;
    }

    try {
      console.log('Detecting WorldEdit plugin...');

      // Start listening for response before sending command
      const responsePromise = this.waitForResponse(
        (text) => {
          const lower = text.toLowerCase();
          // WorldEdit responds with version info like "WorldEdit version 7.2.15"
          // or FAWE: "FastAsyncWorldEdit version 2.x.x"
          return lower.includes('worldedit') ||
                 lower.includes('fawe') ||
                 lower.includes('asyncworldedit');
        },
        3000 // 3 second timeout
      );

      // Send version command
      this.bot.chat('//version');

      // Wait for response
      const response = await responsePromise;

      if (response) {
        this.available = true;
        console.log(`✓ WorldEdit detected: ${response.substring(0, 60)}...`);
        return true;
      } else {
        // No response - try fallback detection with //sel
        console.log('  No //version response, trying //sel...');

        const selPromise = this.waitForResponse(
          (text) => {
            const lower = text.toLowerCase();
            return lower.includes('selection') ||
                   lower.includes('cuboid') ||
                   lower.includes('region');
          },
          2000
        );

        this.bot.chat('//sel');
        const selResponse = await selPromise;

        if (selResponse) {
          this.available = true;
          console.log('✓ WorldEdit detected via //sel command');
          return true;
        }

        console.log('✗ WorldEdit not available: no response to commands');
        this.available = false;
        return false;
      }
    } catch (error) {
      console.log('✗ WorldEdit not available, will use vanilla placement');
      console.log(`  Reason: ${error.message}`);
      this.available = false;
      return false;
    }
  }

  /**
   * Execute a WorldEdit command with rate limiting and validation
   * P0 Fix: Verify command success via response parsing
   */
  async executeCommand(command, options = {}) {
    // Rate limiting with backoff
    const now = Date.now();
    const baseDelay = SAFETY_LIMITS.worldEdit.commandMinDelayMs;
    const effectiveDelay = baseDelay * this.backoffMultiplier;
    const timeSinceLastCmd = now - this.lastCommandTime;

    if (timeSinceLastCmd < effectiveDelay) {
      await this.sleep(effectiveDelay - timeSinceLastCmd);
    }

    // Validation (unless explicitly skipped)
    if (!options.skipValidation) {
      this.validateCommand(command);
    }

    // Check command limit
    if (this.commandsExecuted >= SAFETY_LIMITS.worldEdit.maxCommandsPerBuild) {
      throw new Error(
        `WorldEdit command limit reached: ${SAFETY_LIMITS.worldEdit.maxCommandsPerBuild} ` +
        `commands per build`
      );
    }

    // P0 Fix: Set up response listener for commands that modify blocks
    const expectsBlockChange = this.commandExpectsBlockChange(command);
    let responsePromise = null;

    if (expectsBlockChange && !options.skipAcknowledgment) {
      responsePromise = this.waitForResponse(
        (text) => {
          const lower = text.toLowerCase();
          // WorldEdit/FAWE block change responses:
          // "X blocks have been changed"
          // "X block(s) changed"
          // "0 blocks changed" (FAWE)
          // "No blocks in region"
          // "Operation completed"
          // Error patterns: "Unknown command", "No permission", "Selection too large"
          return /\d+\s*block/.test(lower) ||
                 lower.includes('changed') ||
                 lower.includes('affected') ||
                 lower.includes('operation complete') ||
                 lower.includes('no blocks') ||
                 lower.includes('unknown command') ||
                 lower.includes('no permission') ||
                 lower.includes('don\'t have permission') ||
                 lower.includes('not permitted') ||
                 lower.includes('selection too large') ||
                 lower.includes('maximum') ||
                 lower.includes('error') ||
                 lower.includes('cannot') ||
                 lower.includes('failed');
        },
        options.acknowledgmentTimeout || 5000
      );
    }

    // Execute via chat
    console.log(`  [WorldEdit] ${command}`);
    this.bot.chat(command);

    this.lastCommandTime = Date.now();
    this.commandsExecuted++;

    // P0 Fix: Track command in history for undo support
    this.commandHistory.push({
      command,
      timestamp: this.lastCommandTime,
      options
    });

    // P0 Fix: Wait for and verify response
    if (responsePromise) {
      const response = await responsePromise;

      if (response) {
        const lower = response.toLowerCase();

        // Classify and handle error responses
        const errorInfo = this.classifyError(response, command);
        if (errorInfo) {
          const error = new Error(errorInfo.message);
          error.isWorldEditError = true;
          error.errorType = errorInfo.type;
          error.suggestedFix = errorInfo.suggestedFix;
          error.command = command;
          console.error(`    ✗ WorldEdit error: ${errorInfo.type}`);
          console.error(`      Command: ${command}`);
          console.error(`      Suggestion: ${errorInfo.suggestedFix}`);
          throw error;
        }

        // Check for "0 blocks changed" or "No blocks in region" (not an error, but worth noting)
        const blockMatch = response.match(/(\d+)\s*block/i);
        const blocksChanged = blockMatch ? parseInt(blockMatch[1], 10) : null;

        if (blocksChanged === 0 || lower.includes('no blocks')) {
          console.warn(`    ⚠ Operation completed but changed 0 blocks: ${command}`);
          console.warn(`      This may indicate selection issues or empty region`);
        }

        console.log(`    → ${response.substring(0, 50)}${response.length > 50 ? '...' : ''}`);

        return {
          success: true,
          command,
          response,
          blocksChanged,
          confirmed: true
        };
      } else {
        // No response - command may have worked but no feedback
        console.warn(`    ⚠ No acknowledgment received for: ${command}`);
        console.warn(`      This could indicate: plugin lag, chat spam filter, or command failure`);

        // Track unconfirmed operation
        this.unconfirmedOps.push({
          command,
          timestamp: Date.now()
        });

        // Don't fail, but flag as unconfirmed
        return {
          success: true,
          command,
          confirmed: false,
          blocksChanged: null
        };
      }
    }

    // Non-block-changing commands (pos1, pos2, sel, desel)
    const executionDelay = options.executionDelay || 300;
    await this.sleep(executionDelay);

    return { success: true, command, confirmed: true };
  }

  /**
   * Classify error response and provide suggested fix
   */
  classifyError(response, command) {
    const lower = response.toLowerCase();

    // Permission errors
    if (lower.includes('no permission') ||
        lower.includes('don\'t have permission') ||
        lower.includes('not permitted')) {
      return {
        type: 'PERMISSION_DENIED',
        message: `WorldEdit permission denied: ${response}`,
        suggestedFix: 'Grant WorldEdit permissions to the bot user. Required: worldedit.selection.*, worldedit.region.*, worldedit.generation.*'
      };
    }

    // Unknown command (plugin not installed or command not available)
    if (lower.includes('unknown command')) {
      return {
        type: 'PLUGIN_NOT_FOUND',
        message: `WorldEdit command not recognized: ${response}`,
        suggestedFix: 'Ensure WorldEdit/FAWE plugin is installed and loaded. Check //version command.'
      };
    }

    // Selection too large
    if (lower.includes('selection too large') ||
        lower.includes('maximum') ||
        lower.includes('exceeds limit')) {
      return {
        type: 'SELECTION_TOO_LARGE',
        message: `WorldEdit selection exceeds server limits: ${response}`,
        suggestedFix: 'Reduce selection size or increase server WorldEdit limits. Current B.O.B limits: 50k blocks, 50x50x50 dimensions.'
      };
    }

    // Generic errors
    if (lower.includes('error') || lower.includes('failed') || lower.includes('cannot')) {
      return {
        type: 'COMMAND_FAILED',
        message: `WorldEdit command failed: ${response}`,
        suggestedFix: 'Check command syntax, selection state, and server logs for details.'
      };
    }

    return null; // No error detected
  }

  /**
   * Check if a command is expected to change blocks
   */
  commandExpectsBlockChange(command) {
    const blockChangingCommands = [
      '//set', '//walls', '//replace',
      '//pyramid', '//hpyramid',
      '//cyl', '//hcyl',
      '//sphere', '//hsphere'
    ];

    const cmdLower = command.toLowerCase();
    return blockChangingCommands.some(cmd => cmdLower.startsWith(cmd));
  }

  /**
   * Validate WorldEdit command before execution
   */
  validateCommand(command) {
    // Ensure command starts with //
    if (!command.startsWith('//') && !command.startsWith('/tp')) {
      throw new Error('Invalid WorldEdit command format (must start with //)');
    }

    // Parse command type
    const parts = command.split(' ');
    let cmdType = parts[0];

    if (cmdType.startsWith('//')) {
      cmdType = cmdType.substring(2); // Remove //
    } else if (cmdType.startsWith('/')) {
      cmdType = cmdType.substring(1); // Remove /
    }

    // Validate against allowlist
    const allowedCommands = [
      'pos1', 'pos2', 'set', 'walls', 'replace',
      'pyramid', 'hpyramid', 'cyl', 'hcyl', 'sphere', 'hsphere',
      'desel', 'undo', 'version', 'sel', 'tp'
    ];

    if (!allowedCommands.includes(cmdType)) {
      throw new Error(`WorldEdit command '${cmdType}' not in allowlist`);
    }

    // Additional validation for specific commands
    if (['set', 'walls', 'replace'].includes(cmdType)) {
      if (parts.length < 2) {
        throw new Error(`Command '//${cmdType}' requires block parameter`);
      }
    }

    if (['pyramid', 'hpyramid', 'cyl', 'hcyl', 'sphere', 'hsphere'].includes(cmdType)) {
      if (parts.length < 3) {
        throw new Error(`Command '//${cmdType}' requires block and size parameters`);
      }
    }
  }

  /**
   * Create a cuboid selection
   */
  async createSelection(from, to) {
    // Validate selection size
    const dimensions = {
      x: Math.abs(to.x - from.x) + 1,
      y: Math.abs(to.y - from.y) + 1,
      z: Math.abs(to.z - from.z) + 1
    };

    const volume = dimensions.x * dimensions.y * dimensions.z;

    if (volume > SAFETY_LIMITS.worldEdit.maxSelectionVolume) {
      throw new Error(
        `Selection too large: ${volume} blocks ` +
        `(max: ${SAFETY_LIMITS.worldEdit.maxSelectionVolume})`
      );
    }

    if (dimensions.x > SAFETY_LIMITS.worldEdit.maxSelectionDimension ||
        dimensions.y > SAFETY_LIMITS.worldEdit.maxSelectionDimension ||
        dimensions.z > SAFETY_LIMITS.worldEdit.maxSelectionDimension) {
      throw new Error(
        `Selection dimension too large: ${dimensions.x}x${dimensions.y}x${dimensions.z} ` +
        `(max per axis: ${SAFETY_LIMITS.worldEdit.maxSelectionDimension})`
      );
    }

    // Set cuboid selection mode
    await this.executeCommand('//sel cuboid');

    // Set positions
    await this.executeCommand(`//pos1 ${from.x},${from.y},${from.z}`);
    await this.executeCommand(`//pos2 ${to.x},${to.y},${to.z}`);

    console.log(`  Selection created: ${dimensions.x}x${dimensions.y}x${dimensions.z} (${volume} blocks)`);

    return { from, to, volume, dimensions };
  }

  /**
   * Fill selection with block
   */
  async fillSelection(block) {
    await this.executeCommand(`//set ${block}`, { executionDelay: 500 });
  }

  /**
   * Create walls in selection (hollow)
   */
  async createWalls(block) {
    await this.executeCommand(`//walls ${block}`, { executionDelay: 500 });
  }

  /**
   * Replace blocks in selection
   */
  async replaceBlocks(fromBlock, toBlock) {
    await this.executeCommand(`//replace ${fromBlock} ${toBlock}`, { executionDelay: 500 });
  }

  /**
   * Create pyramid
   */
  async createPyramid(block, height, hollow = false) {
    const cmd = hollow ? 'hpyramid' : 'pyramid';
    await this.executeCommand(`//${cmd} ${block} ${height}`, { executionDelay: 700 });
  }

  /**
   * Create cylinder
   */
  async createCylinder(block, radius, height, hollow = false) {
    const cmd = hollow ? 'hcyl' : 'cyl';
    await this.executeCommand(`//${cmd} ${block} ${radius} ${height}`, { executionDelay: 700 });
  }

  /**
   * Create sphere
   */
  async createSphere(block, radius, hollow = false) {
    const cmd = hollow ? 'hsphere' : 'sphere';
    await this.executeCommand(`//${cmd} ${block} ${radius}`, { executionDelay: 700 });
  }

  /**
   * Clear selection
   */
  async clearSelection() {
    await this.executeCommand('//desel');
  }

  /**
   * Undo last WorldEdit operation
   */
  async undo() {
    await this.executeCommand('//undo');
  }

  /**
   * Reset executor state for new build
   */
  reset() {
    this.commandsExecuted = 0;
    this.commandQueue = [];
    this.spamDetected = false;
    this.backoffMultiplier = 1.0;
    // P0 Fix: Clear command history for new build
    this.commandHistory = [];
    // Clear unconfirmed operations
    this.unconfirmedOps = [];
  }

  /**
   * Reset backoff multiplier (call when build completes successfully)
   */
  resetBackoff() {
    this.spamDetected = false;
    this.backoffMultiplier = 1.0;
  }

  /**
   * Get executor status
   */
  getStatus() {
    return {
      available: this.available,
      commandsExecuted: this.commandsExecuted,
      spamDetected: this.spamDetected,
      backoffMultiplier: this.backoffMultiplier,
      // P0 Fix: Include command history count
      commandHistoryCount: this.commandHistory.length,
      // Track unconfirmed operations
      unconfirmedOps: this.unconfirmedOps.length
    };
  }

  /**
   * P0 Fix: Get command history for undo support
   */
  getCommandHistory() {
    return [...this.commandHistory];
  }

  /**
   * P0 Fix: Undo WorldEdit commands in reverse order
   * @param {number} count - Number of commands to undo (default: all)
   * @returns {Promise<{undone: number, failed: number}>}
   */
  async undoAll(count = null) {
    const toUndo = count || this.commandHistory.length;
    let undone = 0;
    let failed = 0;

    // Only undo block-changing commands
    const blockChangingHistory = this.commandHistory.filter(
      entry => this.commandExpectsBlockChange(entry.command)
    );

    const undoCount = Math.min(toUndo, blockChangingHistory.length);

    console.log(`Undoing ${undoCount} WorldEdit operations...`);

    for (let i = 0; i < undoCount; i++) {
      try {
        await this.undo();
        undone++;
      } catch (error) {
        console.error(`  Failed to undo operation ${i + 1}: ${error.message}`);
        failed++;
      }
    }

    // Clear history after undo
    this.commandHistory = [];

    return { undone, failed };
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

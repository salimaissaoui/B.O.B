import { SAFETY_LIMITS } from '../config/limits.js';

// Debug mode for ACK tracking
const DEBUG_ACK = process.env.BOB_DEBUG_ACK === 'true';

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

    // Command History Tracking
    this.commandHistory = [];

    // Response Handler for Command Verification
    this.pendingResponse = null;

    // Track unconfirmed operations (no acknowledgment received)
    this.unconfirmedOps = [];

    // Message buffer for debugging multi-line responses
    this.messageBuffer = [];
    this.bufferWindowMs = 2000;

    // Listen for chat messages (spam warnings + command responses)
    if (bot && typeof bot.on === 'function') {
      bot.on('message', (message) => {
        const text = message.toString();
        const textLower = text.toLowerCase();

        // Add to message buffer for debugging
        this.messageBuffer.push({ text, timestamp: Date.now() });
        // Clean old messages from buffer
        this.messageBuffer = this.messageBuffer.filter(m => Date.now() - m.timestamp < this.bufferWindowMs);

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
   * Get recent messages from the buffer
   * @param {number} windowMs - Time window in milliseconds (default: 1000)
   * @returns {string[]} - Array of recent message texts
   */
  getRecentMessages(windowMs = 1000) {
    const now = Date.now();
    return this.messageBuffer
      .filter(m => now - m.timestamp < windowMs)
      .map(m => m.text);
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
      let timeoutId;

      const handler = (text) => {
        const matches = typeof matcher === 'function'
          ? matcher(text)
          : matcher.test(text);

        if (matches) {
          if (timeoutId) clearTimeout(timeoutId);
          this.pendingResponse = null;
          resolve(text);
        }
      };

      this.pendingResponse = { handler, startTime };

      // Set timeout fallback
      timeoutId = setTimeout(() => {
        if (this.pendingResponse && this.pendingResponse.startTime === startTime) {
          this.pendingResponse = null;
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  /**
   * Detect if WorldEdit is available by testing commands
   * Updated to favor //sel since //version returns generic errors on some servers
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

      // Method 1: Try //sel (Proven reliable on this server)
      const selPromise = this.waitForResponse(
        (text) => {
          const lower = text.toLowerCase();
          return lower.includes('selection') ||
            lower.includes('cuboid') ||
            lower.includes('region') ||
            lower.includes('cleared') ||
            lower.includes('fawe') ||
            lower.includes('worldedit');
        },
        3000
      );

      this.bot.chat('//sel');
      const selResponse = await selPromise;

      if (selResponse) {
        this.available = true;
        console.log('✓ WorldEdit detected via //sel command');
        return true;
      }

      // Method 2: Try //version as fallback (often hijacked by Bukkit)
      console.log('  No //sel response, trying //version...');

      const responsePromise = this.waitForResponse(
        (text) => {
          const lower = text.toLowerCase();
          return lower.includes('worldedit') ||
            lower.includes('fawe') ||
            lower.includes('asyncworldedit');
        },
        3000
      );

      this.bot.chat('//version');
      const response = await responsePromise;

      if (response) {
        this.available = true;
        console.log(`✓ WorldEdit detected: ${response.substring(0, 60)}...`);
        return true;
      }

      console.log('✗ WorldEdit not available: no response to commands');
      this.available = false;
      return false;
    } catch (error) {
      console.log('✗ WorldEdit not available, will use vanilla placement');
      console.log(`  Reason: ${error.message}`);
      this.available = false;
      return false;
    }
  }

  /**
   * Execute a WorldEdit command with rate limiting and validation
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

    // P0 Fix: Response listener for ALL critical WorldEdit commands (state + edit)
    const expectsAck = this.commandExpectsAck(command);
    let responsePromise = null;

    if (expectsAck && !options.skipAcknowledgment) {
      responsePromise = this.waitForResponse(
        (text) => {
          const lower = text.toLowerCase();

          // 1. FAWE/WorldEdit Success Patterns
          // Pattern A: "Operation completed (123 blocks)."
          if (lower.includes('operation completed')) return true;

          // Pattern B: "0.5s elapsed (history: 123 changed; ...)"
          if (lower.includes('elapsed') && lower.includes('history') && lower.includes('changed')) return true;

          // Pattern C: Standard WE responses
          // FIXED: Use precise patterns to avoid false positives like "Selection type changed to cuboid"
          if (/\d+\s*blocks?\s*(changed|affected|set)/i.test(text)) return true;  // "10 blocks changed"
          if (/history.*\d+\s*changed/i.test(text)) return true;                  // "history: N changed"
          if (lower.includes('set to') && !lower.includes('selection type')) {    // "First position set to..." but not "Selection type"
            return true;
          }
          if (lower.includes('selection cleared') ||  // "//desel"
            lower.includes('region cleared') ||
            lower.includes('pasted') ||
            lower.includes('clipboard') ||
            lower.includes('no blocks')) {         // "No blocks changed" (still a valid ACK)
            return true;
          }
          // Selection mode confirmation (but NOT "Selection type changed to cuboid" as a block-change ACK)
          if (/cuboid.*left click|left click.*cuboid/i.test(text)) {
            return true;
          }

          // Undo/Redo success
          if (lower.includes('undo successful') || lower.includes('undid') || lower.includes('redo successful')) {
            return true;
          }

          // 2. Failure patterns (Fail fast)
          return lower.includes('unknown command') ||
            lower.includes('no permission') ||
            lower.includes('don\'t have permission') ||
            lower.includes('not permitted') ||
            lower.includes('selection too large') ||
            lower.includes('invalid value') ||
            lower.includes('does not match a valid block type') ||
            lower.includes('acceptable values are') ||
            lower.includes('maximum') ||
            lower.includes('error') ||
            lower.includes('cannot') ||
            lower.includes('failed') ||
            lower.includes('unknown or incomplete command') ||
            lower.includes('see below for error') ||
            lower.includes('<--[here]');
        },
        options.acknowledgmentTimeout || 5000
      );
    }

    // Execute via chat
    console.log(`  [WorldEdit] ${command}`);
    if (DEBUG_ACK) {
      console.log(`[WE-ACK] CMD: ${command}`);
    }
    this.bot.chat(command);

    this.lastCommandTime = Date.now();
    this.commandsExecuted++;

    // Track command in history for undo support
    this.commandHistory.push({
      command,
      timestamp: this.lastCommandTime,
      options
    });

    // Wait for and verify response
    if (responsePromise) {
      const response = await responsePromise;

      if (DEBUG_ACK) {
        console.log(`[WE-ACK] RSP: ${response?.substring(0, 100) || '(null)'}`);
      }

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
          console.error(`    ✗ WorldEdit error: ${errorInfo.type} - ${response}`);
          console.error(`      Command: ${command}`);
          console.error(`      Suggestion: ${errorInfo.suggestedFix}`);
          throw error;
        }

        // Check for "0 blocks changed" or "No blocks in region"
        const blockMatch = response.match(/(\d+)\s*block/i);
        const blocksChanged = blockMatch ? parseInt(blockMatch[1], 10) : null;

        if (blocksChanged === 0 || lower.includes('no blocks')) {
          console.warn(`    ⚠ Operation completed but changed 0 blocks: ${command}`);
          console.warn(`      This may indicate selection issues or empty region`);
        }

        return {
          success: true,
          command,
          response,
          blocksChanged,
          confirmed: true
        };
      } else {
        // No response
        console.warn(`    ⚠ No acknowledgment received for: ${command}`);
        console.warn(`      This could indicate: plugin lag, chat spam filter, or command failure`);

        this.unconfirmedOps.push({
          command,
          timestamp: Date.now()
        });

        return {
          success: true,
          command,
          confirmed: false,
          blocksChanged: null
        };
      }
    }

    // For commands not expecting ACK, add small safety delay
    const executionDelay = options.executionDelay || 300;
    await this.sleep(executionDelay);

    return { success: true, command, confirmed: true };
  }

  /**
   * Classify error response and provide suggested fix
   */
  classifyError(response, command) {
    const lower = response.toLowerCase();

    // Command Parser/Syntax Errors (Server doesn't recognize format)
    if (lower.includes('unknown or incomplete command') ||
      lower.includes('see below for error') ||
      lower.includes('<--[here]')) {
      return {
        type: 'COMMAND_NOT_RECOGNIZED',
        message: `Server rejected command syntax: ${response}`,
        suggestedFix: 'Ensure correct WorldEdit command prefix. This server requires // commands (not /).'
      };
    }

    // Invalid Pattern/Argument Errors
    if (lower.includes('invalid value') ||
      lower.includes('does not match a valid block type') ||
      lower.includes('acceptable values are')) {
      return {
        type: 'INVALID_SYNTAX',
        message: `WorldEdit/FAWE rejected arguments: ${response}`,
        suggestedFix: 'Remove invalid flags like -a and confirm block names are standard.'
      };
    }

    // Permission errors
    if (lower.includes('no permission') ||
      lower.includes('don\'t have permission') ||
      lower.includes('not permitted')) {
      return {
        type: 'PERMISSION_DENIED',
        message: `WorldEdit permission denied: ${response}`,
        suggestedFix: 'Grant WorldEdit permissions to the bot user.'
      };
    }

    // Unknown command (plugin specific)
    if (lower.includes('unknown command')) {
      return {
        type: 'PLUGIN_NOT_FOUND',
        message: `WorldEdit command not recognized: ${response}`,
        suggestedFix: 'Ensure WorldEdit/FAWE plugin is installed.'
      };
    }

    // Selection too large
    if (lower.includes('selection too large') ||
      lower.includes('maximum') ||
      lower.includes('exceeds limit')) {
      return {
        type: 'SELECTION_TOO_LARGE',
        message: `WorldEdit selection exceeds server limits: ${response}`,
        suggestedFix: 'Reduce selection size.'
      };
    }

    // No selection defined
    if (/no\s*(?:blocks\s*)?(?:selected|selection)|make\s*a\s*(?:region\s*)?selection/i.test(lower)) {
      return {
        type: 'NO_SELECTION',
        message: `No selection defined: ${response}`,
        suggestedFix: 'Set pos1 and pos2 before this operation'
      };
    }

    // Internal exception
    if (/exception|internal\s*error|stack\s*trace/i.test(lower)) {
      return {
        type: 'INTERNAL_ERROR',
        message: `WorldEdit internal error: ${response}`,
        suggestedFix: 'Check server logs for stack trace'
      };
    }

    // Generic errors
    if (lower.includes('error') || lower.includes('failed') || lower.includes('cannot')) {
      return {
        type: 'COMMAND_FAILED',
        message: `WorldEdit command failed: ${response}`,
        suggestedFix: 'Check server logs.'
      };
    }

    return null; // No error detected
  }

  /**
   * Check if a command expects an ACK (Edit OR Selection State)
   */
  commandExpectsAck(command) {
    const ackCommands = [
      // Block-changing commands
      '//set', '//walls', '//replace',
      '//pyramid', '//hpyramid',
      '//cyl', '//hcyl',
      '//sphere', '//hsphere',

      // Selection / State commands - MUST WAIT FOR ACK
      '//pos1', '//pos2', '//sel', '//desel',
      '//expand', '//wand', '//copy', '//paste', '//undo', '//redo'
    ];

    const cmdLower = command.toLowerCase();
    return ackCommands.some(cmd => cmdLower.startsWith(cmd));
  }

  /**
   * Check if a command is expected to change blocks (Legacy helper)
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
    // Ensure command starts with // or / 
    if (!command.startsWith('//') && !command.startsWith('/')) {
      throw new Error(`Invalid WorldEdit command format: ${command} (must start with // or /)`);
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
      'desel', 'undo', 'version', 'sel', 'tp',
      'brush', 'b', 'v', 'u', 'expand', 'copy', 'paste', 'redo', 'wand'
    ];

    if (!allowedCommands.includes(cmdType)) {
      throw new Error(`WorldEdit command '${cmdType}' not in allowlist`);
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
   * Fill selection with block (REMOVED -a flag)
   */
  async fillSelection(block) {
    // FIX: Removed -a flag which caused FAWE syntax errors
    await this.executeCommand(`//set ${block}`, { executionDelay: 500 });
  }

  /**
   * Create walls in selection (REMOVED -a flag)
   */
  async createWalls(block) {
    // FIX: Removed -a flag which caused FAWE syntax errors
    await this.executeCommand(`//walls ${block}`, { executionDelay: 500 });
  }

  /**
   * Replace blocks in selection (REMOVED -a flag)
   */
  async replaceBlocks(fromBlock, toBlock) {
    // FIX: Removed -a flag which caused FAWE syntax errors
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
   * Create cylinder (REMOVED -a flag)
   */
  async createCylinder(block, radius, height, hollow = false) {
    const cmd = hollow ? 'hcyl' : 'cyl';
    // FIX: Removed -a flag which caused FAWE syntax errors
    await this.executeCommand(`//${cmd} ${block} ${radius} ${height}`, { executionDelay: 700 });
  }

  /**
   * Create sphere (REMOVED -a flag)
   */
  async createSphere(block, radius, hollow = false) {
    const cmd = hollow ? 'hsphere' : 'sphere';
    // FIX: Removed -a flag which caused FAWE syntax errors
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
    // Clear message buffer
    this.messageBuffer = [];
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

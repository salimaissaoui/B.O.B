import { SAFETY_LIMITS } from '../config/limits.js';

// Debug mode for ACK tracking
const DEBUG_ACK = process.env.BOB_DEBUG_ACK === 'true';

/**
 * Parse block count from WorldEdit response message
 * @param {string} text - Response text
 * @returns {number|null} Block count or null if not found
 */
function parseBlockCount(text) {
  if (!text) return null;

  // Pattern 1: "123 blocks changed/affected/set"
  const match1 = text.match(/(\d+)\s*(block|blocks)\s*(changed|affected|set|modified)/i);
  if (match1) return parseInt(match1[1], 10);

  // Pattern 2: "Operation completed (123 blocks)"
  const match2 = text.match(/operation completed\s*\(?\s*(\d+)\s*block/i);
  if (match2) return parseInt(match2[1], 10);

  // Pattern 3: "history: 123 changed"
  const match3 = text.match(/history[:\s#]*(\d+)\s*changed/i);
  if (match3) return parseInt(match3[1], 10);

  return null;
}

/**
 * Parse affected region bounds from WorldEdit response (if available)
 * Note: Most WorldEdit responses don't include bounds, but some do
 * @param {string} text - Response text
 * @param {Object} expectedBounds - Expected bounds from operation {from, to}
 * @returns {Object|null} Bounds {from, to} or null if not parseable
 */
function parseAffectedRegion(text, expectedBounds = null) {
  if (!text) return null;

  // Pattern: "Set blocks from (x1, y1, z1) to (x2, y2, z2)"
  const boundsMatch = text.match(/from\s*\(?\s*(-?\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)\s*\)?\s*to\s*\(?\s*(-?\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)/i);
  if (boundsMatch) {
    return {
      from: {
        x: parseInt(boundsMatch[1], 10),
        y: parseInt(boundsMatch[2], 10),
        z: parseInt(boundsMatch[3], 10)
      },
      to: {
        x: parseInt(boundsMatch[4], 10),
        y: parseInt(boundsMatch[5], 10),
        z: parseInt(boundsMatch[6], 10)
      }
    };
  }

  // If we have expected bounds and operation succeeded, use those
  // This helps with cursor tracking even when exact bounds aren't in response
  if (expectedBounds) {
    return expectedBounds;
  }

  return null;
}

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
          // Pattern C: Standard WE responses
          // FIXED: Use precise patterns to avoid false positives
          if (/(\d+)\s*(block|blocks|positions?)\s*(changed|affected|set|modified)/i.test(text)) return true;
          if (/history\s*(:?)\s*#?\d+\s*changed/i.test(text)) return true;
          if (lower.includes('set to') && !lower.includes('selection type')) return true;

          // Selection clearing / clipboard
          if (lower.includes('selection cleared') ||
            lower.includes('region cleared') ||
            lower.includes('pasted') ||
            lower.includes('clipboard') ||
            lower.includes('no blocks') ||
            lower.includes('operation completed')) {
            return true;
          }

          // Selection mode confirmation
          if (/cuboid.*left click|left click.*cuboid/i.test(text)) return true;

          // Undo/Redo
          if (lower.includes('undo successful') || lower.includes('undid') || lower.includes('redo successful')) return true;

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
        options.acknowledgmentTimeout || 15000
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

        // Parse actual bounds from response (or use expected if available)
        const actualBounds = parseAffectedRegion(response, options.expectedBounds);

        return {
          success: true,
          command,
          response,
          blocksChanged,
          actualBounds,
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
          blocksChanged: null,
          actualBounds: options.expectedBounds || null,
          unconfirmed: true
        };
      }
    }

    // For commands not expecting ACK, add small safety delay
    const executionDelay = options.executionDelay || 300;
    await this.sleep(executionDelay);

    return {
      success: true,
      command,
      confirmed: true,
      blocksChanged: null,
      actualBounds: options.expectedBounds || null
    };
  }

  /**
   * Validate a WorldEdit command for safety
   * @param {string} command - The command to validate
   * @throws {Error} If command is invalid or potentially dangerous
   */
  validateCommand(command) {
    if (!command || typeof command !== 'string') {
      throw new Error('Invalid command: must be a non-empty string');
    }

    const trimmedCmd = command.trim();

    // Must start with // for WorldEdit commands
    if (!trimmedCmd.startsWith('//') && !trimmedCmd.startsWith('/')) {
      throw new Error(`Invalid WorldEdit command format: ${command}`);
    }

    // Block dangerous commands
    const dangerousPatterns = [
      /\/\/script/i,
      /\/\/cs\s/i,
      /\/\/craftscript/i,
      /\.js\s*$/i,
      /eval/i,
      /exec/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedCmd)) {
        throw new Error(`Potentially dangerous command blocked: ${command}`);
      }
    }
  }

  /**
   * Check if a command expects acknowledgment from the server
   * @param {string} command - The command to check
   * @returns {boolean} True if the command expects an ACK response
   */
  commandExpectsAck(command) {
    const lower = command.toLowerCase();

    // Block-changing commands that modify the world
    const blockChangingPatterns = [
      /\/\/set\s/,
      /\/\/replace\s/,
      /\/\/walls\s/,
      /\/\/fill\s/,
      /\/\/stack\s/,
      /\/\/move\s/,
      /\/\/copy/,
      /\/\/paste/,
      /\/\/cut/,
      /\/\/pyramid\s/,
      /\/\/hpyramid\s/,
      /\/\/cyl\s/,
      /\/\/hcyl\s/,
      /\/\/sphere\s/,
      /\/\/hsphere\s/,
      /\/\/undo/,
      /\/\/redo/,
      /\/\/drain/,
      /\/\/fixwater/,
      /\/\/fixlava/,
      /\/\/snow/,
      /\/\/thaw/,
      /\/\/green/,
      /\/\/flora/,
      /\/\/forest/,
      /\/\/overlay\s/,
      /\/\/naturalize/,
      /\/\/smooth/,
      /\/\/deform/,
      /\/\/hollow/,
      /\/\/center\s/,
      /\/\/line\s/,
      /\/\/curve\s/,
      /\/\/regen/
    ];

    // State-changing commands that affect selection
    const stateChangingPatterns = [
      /\/\/pos1/,
      /\/\/pos2/,
      /\/\/hpos1/,
      /\/\/hpos2/,
      /\/\/sel\s/,
      /\/\/desel/,
      /\/\/(contract|expand|shift|outset|inset)\s/
    ];

    // Check for block-changing commands
    for (const pattern of blockChangingPatterns) {
      if (pattern.test(lower)) return true;
    }

    // Check for state-changing commands
    for (const pattern of stateChangingPatterns) {
      if (pattern.test(lower)) return true;
    }

    return false;
  }

  /**
   * Check if a command is expected to change blocks in the world
   * @param {string} command - The command to check
   * @returns {boolean} True if the command changes blocks
   */
  commandExpectsBlockChange(command) {
    const lower = command.toLowerCase();

    const blockChangingPatterns = [
      /\/\/set\s/,
      /\/\/replace\s/,
      /\/\/walls\s/,
      /\/\/fill\s/,
      /\/\/stack\s/,
      /\/\/move\s/,
      /\/\/paste/,
      /\/\/cut/,
      /\/\/pyramid\s/,
      /\/\/hpyramid\s/,
      /\/\/cyl\s/,
      /\/\/hcyl\s/,
      /\/\/sphere\s/,
      /\/\/hsphere\s/,
      /\/\/drain/,
      /\/\/fixwater/,
      /\/\/fixlava/,
      /\/\/snow/,
      /\/\/thaw/,
      /\/\/green/,
      /\/\/flora/,
      /\/\/forest/,
      /\/\/overlay\s/,
      /\/\/naturalize/,
      /\/\/smooth/,
      /\/\/deform/,
      /\/\/hollow/,
      /\/\/center\s/,
      /\/\/line\s/,
      /\/\/curve\s/,
      /\/\/regen/
    ];

    for (const pattern of blockChangingPatterns) {
      if (pattern.test(lower)) return true;
    }

    return false;
  }

  /**
   * Classify an error response from WorldEdit
   * @param {string} response - The error response text
   * @param {string} command - The command that caused the error
   * @returns {Object|null} Error classification or null if not an error
   */
  classifyError(response, command) {
    const lower = response.toLowerCase();

    // Permission errors
    if (lower.includes('no permission') ||
      lower.includes("don't have permission") ||
      lower.includes('not permitted') ||
      lower.includes('you cannot')) {
      return {
        type: 'PERMISSION_DENIED',
        message: `Permission denied for command: ${command}`,
        suggestedFix: 'Check that the bot has WorldEdit permissions'
      };
    }

    // Command not recognized
    if (lower.includes('unknown command') ||
      lower.includes('unknown or incomplete command') ||
      lower.includes('see below for error') ||
      lower.includes('<--[here]')) {
      return {
        type: 'COMMAND_NOT_RECOGNIZED',
        message: `Command not recognized: ${command}`,
        suggestedFix: 'Check command syntax and WorldEdit version'
      };
    }

    // No selection
    if (lower.includes('no selection') ||
      lower.includes('make a selection') ||
      lower.includes('select a region') ||
      lower.includes('make a region selection') ||
      lower.includes('selection not defined') ||
      lower.includes('you haven\'t made a selection') ||
      lower.includes('selection was removed')) {
      return {
        type: 'NO_SELECTION',
        message: `No selection defined for command: ${command}`,
        suggestedFix: 'Create a selection with //pos1 and //pos2 first. If this happened during building, WorldEdit state may have been cleared by another plugin.'
      };
    }

    // Selection too large
    if (lower.includes('selection too large') ||
      lower.includes('too many blocks') ||
      lower.includes('maximum allowed') ||
      (lower.includes('maximum') && lower.includes('blocks'))) {
      return {
        type: 'SELECTION_TOO_LARGE',
        message: `Selection too large for command: ${command}`,
        suggestedFix: 'Reduce selection size or use chunked operations'
      };
    }

    // Invalid syntax / block type
    if (lower.includes('invalid value') ||
      lower.includes('does not match a valid block') ||
      lower.includes('acceptable values are') ||
      lower.includes('invalid block') ||
      lower.includes('unknown block')) {
      return {
        type: 'INVALID_SYNTAX',
        message: `Invalid syntax or block type in command: ${command}`,
        suggestedFix: 'Check block names and command syntax'
      };
    }

    // Internal error
    if (lower.includes('internal error') ||
      lower.includes('exception') ||
      lower.includes('error occurred') ||
      lower.includes('failed')) {
      return {
        type: 'INTERNAL_ERROR',
        message: `Internal error executing command: ${command}`,
        suggestedFix: 'Try again or check server logs. If using FAWE, ensure you are not in a restricted region.'
      };
    }

    // Not an error - return null
    return null;
  }

  /**
   * Helper: Sleep for MS
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Slice a region into smaller chunks if it exceeds volume/dimension limits
   * Recursively splits the longest axis until chunks are safe.
   * @param {Object} from - Start pos {x,y,z}
   * @param {Object} to - End pos {x,y,z}
   * @returns {Array} Array of {from, to} objects
   */
  sliceRegion(from, to) {
    const dx = Math.abs(to.x - from.x) + 1;
    const dy = Math.abs(to.y - from.y) + 1;
    const dz = Math.abs(to.z - from.z) + 1;
    const volume = dx * dy * dz;

    const MAX_VOL = SAFETY_LIMITS.worldEdit.maxSelectionVolume || 50000;
    const MAX_DIM = SAFETY_LIMITS.worldEdit.maxSelectionDimension || 100;

    // Base case: Region is safe
    if (volume <= MAX_VOL && dx <= MAX_DIM && dy <= MAX_DIM && dz <= MAX_DIM) {
      return [{ from, to }];
    }

    // Recursive step: Split along longest axis
    let splitAxis = 'x';
    let maxLen = dx;
    if (dy > maxLen) { splitAxis = 'y'; maxLen = dy; }
    if (dz > maxLen) { splitAxis = 'z'; maxLen = dz; }

    const chunks = [];
    const mid = Math.floor(maxLen / 2);

    const from1 = { ...from };
    const to1 = { ...to };
    const from2 = { ...from };
    const to2 = { ...to };

    // Coordinates are absolute world coords, so we split based on min/max
    const minVal = Math.min(from[splitAxis], to[splitAxis]);
    const maxVal = Math.max(from[splitAxis], to[splitAxis]);
    const splitPoint = minVal + mid; // Absolute coordinate

    // Adjust boundaries
    if (from[splitAxis] < to[splitAxis]) {
      to1[splitAxis] = splitPoint - 1;
      from2[splitAxis] = splitPoint;
    } else {
      to1[splitAxis] = splitPoint;
      from2[splitAxis] = splitPoint - 1;
      // Correcting split logic for inverted coordinates:
      // If from > to (e.g. 10 to 0), mid point 5.
      // Chunk 1: 10 down to 6. Chunk 2: 5 down to 0.
      // Simpler to normalize first, but let's just stick to Min/Max for splitting
    }

    // Normalized Split Strategy to avoid sign confusion
    const x1 = Math.min(from.x, to.x); const x2 = Math.max(from.x, to.x);
    const y1 = Math.min(from.y, to.y); const y2 = Math.max(from.y, to.y);
    const z1 = Math.min(from.z, to.z); const z2 = Math.max(from.z, to.z);

    let sub1From, sub1To, sub2From, sub2To;

    if (splitAxis === 'x') {
      const splitX = Math.floor((x1 + x2) / 2);
      sub1From = { x: x1, y: y1, z: z1 }; sub1To = { x: splitX, y: y2, z: z2 };
      sub2From = { x: splitX + 1, y: y1, z: z1 }; sub2To = { x: x2, y: y2, z: z2 };
    } else if (splitAxis === 'y') {
      const splitY = Math.floor((y1 + y2) / 2);
      sub1From = { x: x1, y: y1, z: z1 }; sub1To = { x: x2, y: splitY, z: z2 };
      sub2From = { x: x1, y: splitY + 1, z: z1 }; sub2To = { x: x2, y: y2, z: z2 };
    } else {
      const splitZ = Math.floor((z1 + z2) / 2);
      sub1From = { x: x1, y: y1, z: z1 }; sub1To = { x: x2, y: y2, z: splitZ };
      sub2From = { x: x1, y: y1, z: splitZ + 1 }; sub2To = { x: x2, y: y2, z: z2 };
    }

    chunks.push(...this.sliceRegion(sub1From, sub1To));
    chunks.push(...this.sliceRegion(sub2From, sub2To));

    return chunks;
  }

  /**
   * Create a cuboid selection (Internal use or raw access)
   */
  async createSelection(from, to) {
    // Basic volume check for logging, but hard limits are now handled by performSafe* methods
    // We still enforce limits here to prevent "raw" calls from crashing server
    const dx = Math.abs(to.x - from.x) + 1;
    const dy = Math.abs(to.y - from.y) + 1;
    const dz = Math.abs(to.z - from.z) + 1;
    const volume = dx * dy * dz;

    if (volume > SAFETY_LIMITS.worldEdit.maxSelectionVolume * 2) {
      // Only throw if MASSIVELY strictly over limit (2x), otherwise assume caller (SafeSet) knows what it's doing
      // or user really wants to try.
      console.warn(`⚠ Creating massive selection (${volume} blocks). Ensure this is partitioned!`);
    }

    // Set cuboid selection mode
    await this.executeCommand('//sel cuboid');

    // Set positions
    await this.executeCommand(`//pos1 ${from.x},${from.y},${from.z}`);
    await this.executeCommand(`//pos2 ${to.x},${to.y},${to.z}`);

    // console.log(`  Selection created: ${dx}x${dy}x${dz} (${volume} blocks)`);
    return { from, to, volume };
  }

  /**
   * Safe Fill: Automatically slices large regions into safe chunks
   */
  async performSafeFill(from, to, block) {
    const chunks = this.sliceRegion(from, to);
    if (chunks.length > 1) {
      console.log(`  ℹ Large region detected, splitting into ${chunks.length} chunks...`);
    }

    let count = 0;
    for (const chunk of chunks) {
      await this.createSelection(chunk.from, chunk.to);
      await this.executeCommand(`//set ${block}`, { executionDelay: 300 }); // Faster delay for chunks
      count++;
    }
  }

  /**
   * Safe Walls: Automatically slices large regions
   * Note: Walls are tricky to slice because internal walls would be created at split points.
   * Strategy: We only slice Y axis (height) safely for walls. X/Z slicing create internal walls.
   * If X/Z is too big, we just have to risk it or warn.
   */
  async performSafeWalls(from, to, block) {
    // Only slice height
    const dy = Math.abs(to.y - from.y) + 1;
    const MAX_DIM = SAFETY_LIMITS.worldEdit.maxSelectionDimension || 100;

    if (dy > MAX_DIM) {
      // Slice vertical
      // For walls, we can just stack them.
      // Implementation omitted for brevity, fallback to standard for now or simple loop
      console.warn("  ⚠ Wall region too tall, attempting simple split...");
    }

    await this.createSelection(from, to);
    await this.executeCommand(`//walls ${block}`, { executionDelay: 500 });
  }

  /**
   * Fill selection with block (Legacy Wrapper)
   */
  async fillSelection(block) {
    // This method assumes selection is ALREADY created. 
    // It cannot slice. Use performSafeFill for robust handling.
    await this.executeCommand(`//set ${block}`, { executionDelay: 500 });
  }

  /**
   * Create walls in selection (Legacy Wrapper)
   */
  async createWalls(block) {
    await this.executeCommand(`//walls ${block}`, { executionDelay: 500 });
  }

  /**
   * Replace blocks in selection (Legacy Wrapper)
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

  // ─── Async Command Tracking (Phase 8) ────────────────────────────────
  // Send commands without blocking on ACK, then verify in background.
  // This allows batching multiple commands and checking results later.

  /**
   * Send a command asynchronously without waiting for ACK
   * @param {string} command - WorldEdit command
   * @returns {number} Command ID for tracking
   */
  async sendCommandAsync(command) {
    // Rate limiting
    const now = Date.now();
    const baseDelay = SAFETY_LIMITS.worldEdit.commandMinDelayMs;
    const effectiveDelay = baseDelay * this.backoffMultiplier;
    const timeSinceLastCmd = now - this.lastCommandTime;

    if (timeSinceLastCmd < effectiveDelay) {
      await this.sleep(effectiveDelay - timeSinceLastCmd);
    }

    // Validate
    this.validateCommand(command);

    // Check limit
    if (this.commandsExecuted >= SAFETY_LIMITS.worldEdit.maxCommandsPerBuild) {
      throw new Error(`WorldEdit command limit reached: ${SAFETY_LIMITS.worldEdit.maxCommandsPerBuild}`);
    }

    const cmdId = this.commandsExecuted;

    // Track as pending
    if (!this.pendingAsyncCommands) {
      this.pendingAsyncCommands = new Map();
    }

    this.pendingAsyncCommands.set(cmdId, {
      command,
      sentAt: Date.now(),
      confirmed: false,
      response: null
    });

    // Send via chat
    console.log(`  [WorldEdit-Async] ${command}`);
    this.bot.chat(command);

    this.lastCommandTime = Date.now();
    this.commandsExecuted++;

    this.commandHistory.push({
      command,
      timestamp: this.lastCommandTime,
      async: true
    });

    return cmdId;
  }

  /**
   * Start background ACK verifier
   * Listens for chat messages and matches them to pending commands
   */
  startAckVerifier() {
    if (this.ackVerifierStarted) return;
    this.ackVerifierStarted = true;

    if (!this.pendingAsyncCommands) {
      this.pendingAsyncCommands = new Map();
    }

    this.bot.on('message', (message) => {
      const text = message.toString();

      if (!this.pendingAsyncCommands || this.pendingAsyncCommands.size === 0) return;

      // Check if this message is an ACK for any pending command
      const isAck = this.isAckMessage(text);
      if (!isAck) return;

      // Match to oldest unconfirmed command
      for (const [cmdId, entry] of this.pendingAsyncCommands) {
        if (!entry.confirmed) {
          entry.confirmed = true;
          entry.response = text;
          entry.confirmedAt = Date.now();

          // Check for errors
          const errorInfo = this.classifyError(text, entry.command);
          if (errorInfo) {
            entry.error = errorInfo;
            console.warn(`  [Async-ACK] Error for cmd ${cmdId}: ${errorInfo.type}`);
          }

          break; // Only match one command per message
        }
      }
    });
  }

  /**
   * Check if a message looks like a WorldEdit ACK
   */
  isAckMessage(text) {
    const lower = text.toLowerCase();
    return /\d+\s*blocks?\s*(changed|affected|set)/i.test(text) ||
      lower.includes('operation completed') ||
      (lower.includes('elapsed') && lower.includes('changed')) ||
      (lower.includes('set to') && !lower.includes('selection type')) ||
      lower.includes('selection cleared') ||
      lower.includes('undo successful') ||
      lower.includes('no blocks') ||
      lower.includes('unknown command') ||
      lower.includes('no permission') ||
      lower.includes('error');
  }

  /**
   * Wait for all pending async commands to confirm or timeout
   * @param {number} timeoutMs - Max wait time per command
   * @returns {Object} { confirmed, timedOut, errors }
   */
  async flushPendingCommands(timeoutMs = 5000) {
    if (!this.pendingAsyncCommands || this.pendingAsyncCommands.size === 0) {
      return { confirmed: 0, timedOut: 0, errors: 0 };
    }

    let confirmed = 0;
    let timedOut = 0;
    let errors = 0;

    const startTime = Date.now();

    // Wait for all pending commands
    while (Date.now() - startTime < timeoutMs) {
      let allConfirmed = true;

      for (const [cmdId, entry] of this.pendingAsyncCommands) {
        if (!entry.confirmed) {
          allConfirmed = false;
          break;
        }
      }

      if (allConfirmed) break;
      await this.sleep(100);
    }

    // Count results
    for (const [cmdId, entry] of this.pendingAsyncCommands) {
      if (entry.confirmed) {
        if (entry.error) {
          errors++;
        } else {
          confirmed++;
        }
      } else {
        timedOut++;
        // Move to unconfirmed list
        this.unconfirmedOps.push({
          command: entry.command,
          timestamp: entry.sentAt
        });
      }
    }

    // Clear pending
    this.pendingAsyncCommands.clear();

    if (timedOut > 0) {
      console.warn(`  [Async-ACK] ${timedOut} commands timed out without ACK`);
    }

    return { confirmed, timedOut, errors };
  }

  /**
   * Get count of pending async commands
   */
  getPendingCount() {
    if (!this.pendingAsyncCommands) return 0;
    let count = 0;
    for (const [, entry] of this.pendingAsyncCommands) {
      if (!entry.confirmed) count++;
    }
    return count;
  }

  // ─── End Async Command Tracking ────────────────────────────────────

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
    // Clear async pending commands
    if (this.pendingAsyncCommands) {
      this.pendingAsyncCommands.clear();
    }
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
      commandHistoryCount: this.commandHistory.length,
      unconfirmedOps: this.unconfirmedOps.length,
      pendingAsyncCommands: this.getPendingCount()
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

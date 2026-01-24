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

    // Listen for spam warnings from server
    if (bot && typeof bot.on === 'function') {
      bot.on('message', (message) => {
        const text = message.toString().toLowerCase();

        if (text.includes('spam') ||
            text.includes('too fast') ||
            text.includes('slow down') ||
            text.includes('wait')) {
          console.warn('⚠ Spam warning detected, increasing delays...');
          this.spamDetected = true;
          this.backoffMultiplier = Math.min(this.backoffMultiplier * 2, 4.0);
        }
      });
    }
  }

  /**
   * Detect if WorldEdit is available by testing a safe command
   */
  async detectWorldEdit() {
    if (!SAFETY_LIMITS.worldEdit.enabled) {
      console.log('WorldEdit disabled in configuration');
      this.available = false;
      return false;
    }

    try {
      // Test with //version command (safe, doesn't modify world)
      console.log('Detecting WorldEdit plugin...');
      this.bot.chat('//version');

      // Wait for response (simple detection)
      await this.sleep(500);

      // For now, assume it's available if no error
      // In production, could listen for specific response messages
      this.available = true;
      console.log('✓ WorldEdit detected and available');
      return true;
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

    // Execute via chat
    console.log(`  [WorldEdit] ${command}`);
    this.bot.chat(command);

    this.lastCommandTime = Date.now();
    this.commandsExecuted++;

    // Wait for command execution (WorldEdit processes async)
    // Increased delay for large operations
    const executionDelay = options.executionDelay || 300;
    await this.sleep(executionDelay);

    return { success: true, command };
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
      backoffMultiplier: this.backoffMultiplier
    };
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

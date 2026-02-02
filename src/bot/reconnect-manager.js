/**
 * Reconnect Manager
 *
 * Handles automatic reconnection when the bot disconnects from the server.
 * Preserves build state and attempts to resume after reconnection.
 */

import { isRetryableError } from '../utils/network-resilience.js';

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ReconnectManager handles automatic bot reconnection
 */
export class ReconnectManager {
  /**
   * Create a new ReconnectManager
   * @param {Object} options - Configuration options
   * @param {Function} options.createBot - Function to create a new bot instance
   * @param {Object} options.config - Bot configuration (host, port, username, version)
   * @param {number} options.maxRetries - Maximum reconnection attempts (default: 10)
   * @param {number} options.baseDelay - Base delay in ms (default: 5000)
   * @param {number} options.maxDelay - Maximum delay in ms (default: 60000)
   * @param {Function} options.onReconnect - Callback when reconnection succeeds
   * @param {Function} options.onGiveUp - Callback when all retries exhausted
   */
  constructor(options = {}) {
    this.createBot = options.createBot;
    this.config = options.config;
    this.maxRetries = options.maxRetries || 10;
    this.baseDelay = options.baseDelay || 5000;
    this.maxDelay = options.maxDelay || 60000;
    this.onReconnect = options.onReconnect || (() => {});
    this.onGiveUp = options.onGiveUp || (() => {});

    this.bot = null;
    this.builder = null;
    this.apiKey = null;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.enabled = true;
    this.lastDisconnectReason = null;
    this.pendingBuildResume = null;
  }

  /**
   * Initialize the manager with a bot instance
   * @param {Object} bot - Mineflayer bot instance
   * @param {Object} builder - Builder instance
   * @param {string} apiKey - API key for commands
   */
  initialize(bot, builder, apiKey) {
    this.bot = bot;
    this.builder = builder;
    this.apiKey = apiKey;

    this.attachListeners();
    console.log('  [Reconnect] Manager initialized');
  }

  /**
   * Attach disconnect event listeners to the bot
   */
  attachListeners() {
    if (!this.bot) return;

    // Handle disconnection
    this.bot.on('end', (reason) => {
      this.handleDisconnect('end', reason);
    });

    // Handle errors that cause disconnection
    this.bot.on('error', (err) => {
      if (this.isConnectionError(err)) {
        this.handleDisconnect('error', err.message);
      }
    });

    // Handle being kicked
    this.bot.on('kicked', (reason) => {
      // Don't auto-reconnect if kicked for ban/whitelist reasons
      if (this.shouldReconnectAfterKick(reason)) {
        this.handleDisconnect('kicked', reason);
      } else {
        console.log('  [Reconnect] Kicked with non-recoverable reason, not reconnecting');
        this.lastDisconnectReason = reason;
      }
    });
  }

  /**
   * Check if an error is a connection-related error
   * @param {Error} err - The error to check
   * @returns {boolean}
   */
  isConnectionError(err) {
    return isRetryableError(err) ||
           err.message?.includes('disconnect') ||
           err.message?.includes('connection');
  }

  /**
   * Check if we should reconnect after being kicked
   * @param {string} reason - Kick reason
   * @returns {boolean}
   */
  shouldReconnectAfterKick(reason) {
    const reasonLower = (reason || '').toLowerCase();

    // Don't reconnect for these reasons
    const noReconnectReasons = [
      'banned',
      'whitelist',
      'not whitelisted',
      'full',
      'server is full',
      'maintenance',
      'shutdown'
    ];

    return !noReconnectReasons.some(r => reasonLower.includes(r));
  }

  /**
   * Handle a disconnection event
   * @param {string} type - Disconnect type ('end', 'error', 'kicked')
   * @param {string} reason - Disconnect reason
   */
  async handleDisconnect(type, reason) {
    if (!this.enabled || this.isReconnecting) {
      return;
    }

    this.lastDisconnectReason = reason;
    console.log(`\n  [Reconnect] Bot disconnected (${type}): ${reason}`);

    // Preserve build state if mid-build
    if (this.builder?.building) {
      console.log('  [Reconnect] Saving build state before reconnection...');
      try {
        this.pendingBuildResume = this.builder.stateManager?.getCurrentStateSummary();
        // State should already be saved by BuildStateManager
      } catch (error) {
        console.warn(`  [Reconnect] Failed to save build state: ${error.message}`);
      }
    }

    // Attempt reconnection
    await this.attemptReconnect();
  }

  /**
   * Attempt to reconnect to the server
   */
  async attemptReconnect() {
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts = 0;

    while (this.reconnectAttempts < this.maxRetries && this.enabled) {
      this.reconnectAttempts++;

      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.baseDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxDelay
      );

      console.log(
        `  [Reconnect] Attempt ${this.reconnectAttempts}/${this.maxRetries} ` +
        `in ${Math.round(delay / 1000)}s...`
      );

      await sleep(delay);

      if (!this.enabled) {
        console.log('  [Reconnect] Reconnection disabled, stopping');
        break;
      }

      try {
        await this.doReconnect();

        // Success!
        console.log('  [Reconnect] Successfully reconnected!');
        this.isReconnecting = false;
        this.reconnectAttempts = 0;

        // Notify callback
        await this.onReconnect(this.bot, this.builder, this.pendingBuildResume);
        this.pendingBuildResume = null;

        return;
      } catch (error) {
        console.log(`  [Reconnect] Attempt failed: ${error.message}`);

        // Check if error is not recoverable
        if (!isRetryableError(error) && !this.isConnectionError(error)) {
          console.log('  [Reconnect] Non-recoverable error, stopping reconnection');
          break;
        }
      }
    }

    // All retries exhausted
    console.log('  [Reconnect] All reconnection attempts failed');
    this.isReconnecting = false;
    this.onGiveUp(this.lastDisconnectReason, this.pendingBuildResume);
  }

  /**
   * Perform the actual reconnection
   */
  async doReconnect() {
    if (!this.createBot || !this.config) {
      throw new Error('ReconnectManager not properly configured');
    }

    // Create new bot instance
    const newBot = this.createBot(this.config);

    // Wait for spawn with timeout
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Reconnection timed out'));
      }, 30000);

      const onSpawn = () => {
        clearTimeout(timeout);
        newBot.removeListener('error', onError);
        newBot.removeListener('kicked', onKicked);
        resolve();
      };

      const onError = (err) => {
        clearTimeout(timeout);
        newBot.removeListener('spawn', onSpawn);
        newBot.removeListener('kicked', onKicked);
        reject(err);
      };

      const onKicked = (reason) => {
        clearTimeout(timeout);
        newBot.removeListener('spawn', onSpawn);
        newBot.removeListener('error', onError);
        reject(new Error(`Kicked: ${reason}`));
      };

      newBot.once('spawn', onSpawn);
      newBot.once('error', onError);
      newBot.once('kicked', onKicked);
    });

    // Update references
    this.bot = newBot;

    // Re-attach listeners
    this.attachListeners();

    // Re-initialize builder with new bot if needed
    if (this.builder) {
      this.builder.bot = newBot;
      await this.builder.initialize();
    }
  }

  /**
   * Enable automatic reconnection
   */
  enable() {
    this.enabled = true;
    console.log('  [Reconnect] Auto-reconnect enabled');
  }

  /**
   * Disable automatic reconnection
   */
  disable() {
    this.enabled = false;
    console.log('  [Reconnect] Auto-reconnect disabled');
  }

  /**
   * Get current status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      enabled: this.enabled,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxRetries: this.maxRetries,
      lastDisconnectReason: this.lastDisconnectReason,
      hasPendingResume: !!this.pendingBuildResume
    };
  }

  /**
   * Manually trigger a reconnection attempt
   * @param {string} reason - Reason for manual reconnection
   */
  async triggerReconnect(reason = 'manual') {
    if (this.isReconnecting) {
      console.log('  [Reconnect] Already reconnecting');
      return;
    }

    this.lastDisconnectReason = reason;
    await this.attemptReconnect();
  }
}

export default ReconnectManager;

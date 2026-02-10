/**
 * Circuit Breaker for WorldEdit operations
 *
 * Prevents cascade failures when server is unresponsive or experiencing issues.
 * Implements the circuit breaker pattern with three states:
 * - CLOSED: Normal operation, commands execute normally
 * - OPEN: Circuit tripped, commands fail fast without execution
 * - HALF_OPEN: Testing recovery, limited commands allowed
 */
export class CircuitBreaker {
  constructor(options = {}) {
    // Configuration
    this.failureThreshold = options.failureThreshold || 5;
    this.timeoutThreshold = options.timeoutThreshold || 3;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
    this.halfOpenRequests = options.halfOpenRequests || 2;

    // State
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.consecutiveTimeouts = 0;
    this.lastFailureTime = null;
    this.lastFailureReason = null;
    this.halfOpenSuccesses = 0;

    // Statistics
    this.stats = {
      totalFailures: 0,
      totalTimeouts: 0,
      totalSuccesses: 0,
      circuitOpenCount: 0,
      lastStateChange: null
    };
  }

  /**
   * Record a successful operation
   * Resets failure counters and may close the circuit
   */
  recordSuccess() {
    this.consecutiveFailures = 0;
    this.consecutiveTimeouts = 0;
    this.stats.totalSuccesses++;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;

      if (this.halfOpenSuccesses >= this.halfOpenRequests) {
        this._transitionTo('CLOSED');
        this.halfOpenSuccesses = 0;
        console.log('[CircuitBreaker] Circuit CLOSED - service recovered');
      }
    }
  }

  /**
   * Record a failed operation
   * May trip the circuit if threshold is exceeded
   */
  recordFailure(reason = 'unknown') {
    this.consecutiveFailures++;
    this.consecutiveTimeouts = 0; // Reset timeout counter on explicit failure
    this.lastFailureTime = Date.now();
    this.lastFailureReason = reason;
    this.stats.totalFailures++;

    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open immediately reopens circuit
      this._transitionTo('OPEN');
      console.warn(`[CircuitBreaker] Circuit re-OPENED - failure during recovery test: ${reason}`);
      return;
    }

    if (this.state === 'CLOSED' && this.consecutiveFailures >= this.failureThreshold) {
      this._transitionTo('OPEN');
      console.warn(`[CircuitBreaker] Circuit OPEN - ${this.consecutiveFailures} consecutive failures (${reason})`);
    }
  }

  /**
   * Record a timeout (no ACK received)
   * Timeouts are tracked separately and may trip the circuit
   */
  recordTimeout() {
    this.consecutiveTimeouts++;
    this.lastFailureTime = Date.now();
    this.lastFailureReason = 'timeout';
    this.stats.totalTimeouts++;

    if (this.state === 'HALF_OPEN') {
      // Timeout in half-open reopens circuit
      this._transitionTo('OPEN');
      console.warn('[CircuitBreaker] Circuit re-OPENED - timeout during recovery test');
      return;
    }

    if (this.state === 'CLOSED' && this.consecutiveTimeouts >= this.timeoutThreshold) {
      this._transitionTo('OPEN');
      console.warn(`[CircuitBreaker] Circuit OPEN - ${this.consecutiveTimeouts} consecutive timeouts`);
    }
  }

  /**
   * Check if an operation can proceed
   * Returns true if operation should be attempted, false if it should fail fast
   */
  canProceed() {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      // Check if reset timeout has elapsed
      const timeSinceFailure = Date.now() - this.lastFailureTime;

      if (timeSinceFailure >= this.resetTimeoutMs) {
        this._transitionTo('HALF_OPEN');
        this.halfOpenSuccesses = 0;
        console.log('[CircuitBreaker] Circuit HALF_OPEN - testing recovery');
        return true;
      }

      return false;
    }

    // HALF_OPEN: allow limited requests for testing
    return true;
  }

  /**
   * Get remaining time until circuit may transition from OPEN to HALF_OPEN
   * Returns 0 if not in OPEN state
   */
  getTimeUntilRetry() {
    if (this.state !== 'OPEN' || !this.lastFailureTime) {
      return 0;
    }

    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.resetTimeoutMs - elapsed);
  }

  /**
   * Get current circuit breaker state information
   */
  getState() {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveTimeouts: this.consecutiveTimeouts,
      lastFailureTime: this.lastFailureTime,
      lastFailureReason: this.lastFailureReason,
      timeUntilRetry: this.getTimeUntilRetry(),
      stats: { ...this.stats }
    };
  }

  /**
   * Forcefully reset the circuit breaker to CLOSED state
   * Use with caution - typically for manual recovery
   */
  reset() {
    this._transitionTo('CLOSED');
    this.consecutiveFailures = 0;
    this.consecutiveTimeouts = 0;
    this.halfOpenSuccesses = 0;
    this.lastFailureTime = null;
    this.lastFailureReason = null;
    console.log('[CircuitBreaker] Circuit manually reset to CLOSED');
  }

  /**
   * Internal state transition
   */
  _transitionTo(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.stats.lastStateChange = Date.now();

      if (newState === 'OPEN') {
        this.stats.circuitOpenCount++;
      }
    }
  }
}

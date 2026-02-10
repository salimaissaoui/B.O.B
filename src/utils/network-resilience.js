/**
 * Network Resilience Utility
 *
 * Provides retry logic with exponential backoff for network operations.
 * Handles ECONNRESET, timeouts, and other transient network failures.
 */

import { sleep } from './sleep.js';

/**
 * Check if an error is retryable (transient network issue)
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
export function isRetryableError(error) {
  // Node.js network error codes
  const retryableCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNREFUSED',
    'EPIPE',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ECONNABORTED',
    'ERR_SOCKET_CONNECTION_TIMEOUT'
  ];

  // Error message patterns that indicate transient failures
  const retryablePatterns = [
    'fetch failed',
    'network',
    'socket hang up',
    'econnreset',
    'connection reset',
    'timeout',
    'aborted',
    'network error',
    'failed to fetch'
  ];

  // Check error code
  if (error.code && retryableCodes.includes(error.code)) {
    return true;
  }

  // Check error message
  const message = (error.message || '').toLowerCase();
  if (retryablePatterns.some(pattern => message.includes(pattern))) {
    return true;
  }

  // Check cause chain (Node.js 16+)
  if (error.cause && isRetryableError(error.cause)) {
    return true;
  }

  return false;
}

/**
 * Execute an async operation with retry logic
 *
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 5)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay cap in ms (default: 30000)
 * @param {string} options.label - Label for logging (default: 'operation')
 * @param {Function} options.onRetry - Callback on each retry (attempt, error, delay)
 * @param {Function} options.shouldRetry - Custom retry predicate (error) => boolean
 * @returns {Promise<*>} Result of the operation
 */
export async function withRetry(operation, options = {}) {
  const {
    maxRetries = 5,
    baseDelay = 1000,
    maxDelay = 30000,
    label = 'operation',
    onRetry = null,
    shouldRetry = isRetryableError
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const canRetry = attempt < maxRetries && shouldRetry(error);

      if (canRetry) {
        // Exponential backoff with jitter
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
        const delay = Math.min(exponentialDelay + jitter, maxDelay);

        console.log(
          `  \u26A0 ${label} failed (${error.code || error.message}), ` +
          `retry ${attempt}/${maxRetries} in ${Math.round(delay)}ms`
        );

        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt, error, delay);
        }

        await sleep(delay);
      } else {
        // Either max retries reached or error not retryable
        if (!shouldRetry(error)) {
          console.log(`  \u2717 ${label} failed with non-retryable error: ${error.message}`);
        } else {
          console.log(`  \u2717 ${label} failed after ${attempt} attempts: ${error.message}`);
        }
        throw error;
      }
    }
  }

  // Should not reach here, but just in case
  throw lastError;
}

/**
 * Fetch with automatic retry for transient failures
 *
 * @param {string} url - URL to fetch
 * @param {Object} fetchOptions - Options to pass to fetch()
 * @param {Object} retryOptions - Options for retry logic
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithRetry(url, fetchOptions = {}, retryOptions = {}) {
  const label = retryOptions.label || `fetch ${new URL(url).hostname}`;

  return withRetry(
    async () => {
      const response = await fetch(url, {
        ...fetchOptions,
        // Add timeout if not specified
        signal: fetchOptions.signal || AbortSignal.timeout(30000)
      });

      // Treat 5xx as retryable
      if (response.status >= 500 && response.status < 600) {
        const error = new Error(`Server error: ${response.status} ${response.statusText}`);
        error.code = 'SERVER_ERROR';
        error.status = response.status;
        throw error;
      }

      return response;
    },
    {
      ...retryOptions,
      label,
      shouldRetry: (error) => {
        // Retry on network errors
        if (isRetryableError(error)) return true;
        // Retry on 5xx server errors
        if (error.code === 'SERVER_ERROR' && error.status >= 500) return true;
        return false;
      }
    }
  );
}

/**
 * Create a wrapped version of any async function with retry logic
 *
 * @param {Function} fn - Async function to wrap
 * @param {Object} defaultOptions - Default retry options
 * @returns {Function} Wrapped function with retry
 */
export function withRetryWrapper(fn, defaultOptions = {}) {
  return async function(...args) {
    return withRetry(() => fn(...args), defaultOptions);
  };
}

export default {
  withRetry,
  fetchWithRetry,
  isRetryableError,
  withRetryWrapper
};

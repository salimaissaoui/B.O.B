/**
 * Seeded Random Number Generator
 *
 * Provides deterministic random number generation for
 * consistent component expansion and detail passes.
 */

/**
 * Create a seeded random number generator
 * Uses a simple mulberry32 algorithm
 * @param {number} seed - Initial seed value
 * @returns {Object} RNG with various utility methods
 */
export function createSeededRandom(seed) {
  let state = seed >>> 0;  // Convert to unsigned 32-bit

  /**
   * Core random function (mulberry32)
   * @returns {number} Float between 0 and 1
   */
  function random() {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  return {
    /**
     * Get next random float between 0 and 1
     */
    random,

    /**
     * Get random integer in range [min, max] (inclusive)
     */
    int(min, max) {
      return Math.floor(random() * (max - min + 1)) + min;
    },

    /**
     * Get random float in range [min, max]
     */
    float(min, max) {
      return random() * (max - min) + min;
    },

    /**
     * Get random boolean with given probability of true
     */
    bool(probability = 0.5) {
      return random() < probability;
    },

    /**
     * Pick random element from array
     */
    pick(array) {
      if (!array || array.length === 0) return undefined;
      return array[Math.floor(random() * array.length)];
    },

    /**
     * Shuffle array in place (Fisher-Yates)
     */
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },

    /**
     * Get random Gaussian (normal) distributed value
     * Using Box-Muller transform
     */
    gaussian(mean = 0, stddev = 1) {
      const u1 = random();
      const u2 = random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return z * stddev + mean;
    },

    /**
     * Pick weighted random element
     * @param {Array} items - Array of {item, weight} objects
     */
    weightedPick(items) {
      const total = items.reduce((sum, i) => sum + (i.weight || 1), 0);
      let r = random() * total;

      for (const item of items) {
        r -= item.weight || 1;
        if (r <= 0) return item.item;
      }

      return items[items.length - 1].item;
    },

    /**
     * Get current state (for saving/restoring)
     */
    getState() {
      return state;
    },

    /**
     * Set state (for restoring)
     */
    setState(newState) {
      state = newState >>> 0;
    }
  };
}

/**
 * Create seed from string (deterministic)
 */
export function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;  // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Create seed from build ID
 */
export function seedFromBuildId(buildId) {
  return seedFromString(buildId);
}

export default {
  createSeededRandom,
  seedFromString,
  seedFromBuildId
};

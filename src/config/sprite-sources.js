/**
 * Sprite Source Configuration
 * Defines API endpoints and keys for sprite reference searching
 */

import dotenv from 'dotenv';
dotenv.config();

export const SPRITE_SOURCES = {
  // PokeAPI (Free, no key required)
  pokeApi: {
    baseUrl: 'https://pokeapi.co/api/v2',
    enabled: true
  },

  // Google Custom Search API (Requires key)
  googleCustomSearch: {
    baseUrl: 'https://www.googleapis.com/customsearch/v1',
    apiKey: process.env.GOOGLE_SEARCH_API_KEY,
    searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
    enabled: !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID)
  }
};

/**
 * Check if a source is configured and enabled
 * @param {string} sourceName - 'pokeApi' or 'googleCustomSearch'
 * @returns {boolean}
 */
export function isSourceConfigured(sourceName) {
  const source = SPRITE_SOURCES[sourceName];
  return source && source.enabled;
}

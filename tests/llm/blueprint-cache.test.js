/**
 * LLM Blueprint Cache Tests
 *
 * Tests for blueprint caching optimization.
 * Verifies:
 * - Cache key generation from prompt
 * - Cache hit returns stored blueprint
 * - Cache miss returns null
 * - TTL expiration works correctly
 * - Cache statistics tracking
 *
 * CLAUDE.md Contract:
 * - Priority 2 Performance: "LLM Response Caching - Cache blueprints (24h TTL)"
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { BlueprintCache, DEFAULT_TTL_MS, getBlueprintCache, resetGlobalCache } from '../../src/llm/blueprint-cache.js';

describe('Blueprint Cache - Contract Tests', () => {
    let cache;

    beforeEach(() => {
        cache = new BlueprintCache();
    });

    describe('Cache key generation', () => {
        test('same prompt generates same key', () => {
            const key1 = cache.generateKey('build a house', 'house', false);
            const key2 = cache.generateKey('build a house', 'house', false);

            expect(key1).toBe(key2);
        });

        test('different prompts generate different keys', () => {
            const key1 = cache.generateKey('build a house', 'house', false);
            const key2 = cache.generateKey('build a castle', 'castle', false);

            expect(key1).not.toBe(key2);
        });

        test('same prompt with different buildType generates different key', () => {
            const key1 = cache.generateKey('build a house', 'house', false);
            const key2 = cache.generateKey('build a house', 'tower', false);

            expect(key1).not.toBe(key2);
        });

        test('same prompt with different worldEdit flag generates different key', () => {
            const key1 = cache.generateKey('build a house', 'house', false);
            const key2 = cache.generateKey('build a house', 'house', true);

            expect(key1).not.toBe(key2);
        });

        test('prompt is case-insensitive', () => {
            const key1 = cache.generateKey('Build A House', 'house', false);
            const key2 = cache.generateKey('build a house', 'house', false);

            expect(key1).toBe(key2);
        });

        test('prompt whitespace is normalized', () => {
            const key1 = cache.generateKey('  build a house  ', 'house', false);
            const key2 = cache.generateKey('build a house', 'house', false);

            expect(key1).toBe(key2);
        });

        test('key format is valid string', () => {
            const key = cache.generateKey('build a house', 'house', false);

            expect(typeof key).toBe('string');
            expect(key.startsWith('bp_')).toBe(true);
        });
    });

    describe('Cache operations', () => {
        const testBlueprint = {
            size: { width: 10, height: 10, depth: 10 },
            palette: ['stone', 'oak_planks'],
            steps: [{ op: 'fill', block: 'stone' }]
        };

        test('set and get returns same blueprint', () => {
            const key = cache.generateKey('build a house', 'house', false);
            cache.set(key, testBlueprint);

            const retrieved = cache.get(key);

            expect(retrieved).toEqual(testBlueprint);
        });

        test('get non-existent key returns null', () => {
            const result = cache.get('nonexistent_key');

            expect(result).toBeNull();
        });

        test('cache miss increments miss counter', () => {
            cache.get('nonexistent_key');

            expect(cache.stats.misses).toBe(1);
        });

        test('cache hit increments hit counter', () => {
            const key = cache.generateKey('build a house', 'house', false);
            cache.set(key, testBlueprint);
            cache.get(key);

            expect(cache.stats.hits).toBe(1);
        });

        test('cache set increments set counter', () => {
            const key = cache.generateKey('build a house', 'house', false);
            cache.set(key, testBlueprint);

            expect(cache.stats.sets).toBe(1);
        });

        test('clear removes all entries', () => {
            const key1 = cache.generateKey('build a house', 'house', false);
            const key2 = cache.generateKey('build a castle', 'castle', false);
            cache.set(key1, testBlueprint);
            cache.set(key2, testBlueprint);

            cache.clear();

            expect(cache.cache.size).toBe(0);
            expect(cache.get(key1)).toBeNull();
            expect(cache.get(key2)).toBeNull();
        });
    });

    describe('TTL expiration', () => {
        const testBlueprint = {
            size: { width: 10, height: 10, depth: 10 },
            palette: ['stone'],
            steps: [{ op: 'fill', block: 'stone' }]
        };

        test('default TTL is 24 hours', () => {
            const cache = new BlueprintCache();
            expect(cache.ttlMs).toBe(24 * 60 * 60 * 1000);
        });

        test('custom TTL is respected', () => {
            const cache = new BlueprintCache({ ttlMs: 1000 }); // 1 second
            expect(cache.ttlMs).toBe(1000);
        });

        test('expired entry returns null', async () => {
            const cache = new BlueprintCache({ ttlMs: 50 }); // 50ms TTL
            const key = cache.generateKey('build a house', 'house', false);
            cache.set(key, testBlueprint);

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 100));

            const result = cache.get(key);
            expect(result).toBeNull();
        });

        test('expired entry increments eviction counter', async () => {
            const cache = new BlueprintCache({ ttlMs: 50 }); // 50ms TTL
            const key = cache.generateKey('build a house', 'house', false);
            cache.set(key, testBlueprint);

            await new Promise(resolve => setTimeout(resolve, 100));
            cache.get(key);

            expect(cache.stats.evictions).toBe(1);
        });

        test('non-expired entry is returned', async () => {
            const cache = new BlueprintCache({ ttlMs: 10000 }); // 10 seconds
            const key = cache.generateKey('build a house', 'house', false);
            cache.set(key, testBlueprint);

            // Small delay, but well within TTL
            await new Promise(resolve => setTimeout(resolve, 50));

            const result = cache.get(key);
            expect(result).toEqual(testBlueprint);
        });
    });

    describe('Cache statistics', () => {
        const testBlueprint = {
            size: { width: 10, height: 10, depth: 10 },
            palette: ['stone'],
            steps: []
        };

        test('getStats returns correct structure', () => {
            const stats = cache.getStats();

            expect(stats).toHaveProperty('hits');
            expect(stats).toHaveProperty('misses');
            expect(stats).toHaveProperty('sets');
            expect(stats).toHaveProperty('evictions');
            expect(stats).toHaveProperty('size');
            expect(stats).toHaveProperty('hitRate');
        });

        test('hitRate is calculated correctly', () => {
            const key = cache.generateKey('build a house', 'house', false);
            cache.set(key, testBlueprint);

            // 3 hits
            cache.get(key);
            cache.get(key);
            cache.get(key);

            // 1 miss
            cache.get('nonexistent');

            const stats = cache.getStats();
            // 3 hits / (3 hits + 1 miss) = 75%
            expect(stats.hitRate).toBe('75.0');
        });

        test('size reflects current cache entries', () => {
            const key1 = cache.generateKey('build a house', 'house', false);
            const key2 = cache.generateKey('build a castle', 'castle', false);

            cache.set(key1, testBlueprint);
            expect(cache.getStats().size).toBe(1);

            cache.set(key2, testBlueprint);
            expect(cache.getStats().size).toBe(2);
        });
    });
});

describe('Blueprint Cache - Integration', () => {
    test('typical usage pattern works correctly', () => {
        const cache = new BlueprintCache();

        // User requests "build a house"
        const prompt = 'build a house';
        const buildType = 'house';
        const weAvailable = true;

        // First request - cache miss
        const key = cache.generateKey(prompt, buildType, weAvailable);
        let blueprint = cache.get(key);
        expect(blueprint).toBeNull();

        // Generate blueprint (simulated)
        const generatedBlueprint = {
            size: { width: 10, height: 8, depth: 10 },
            palette: ['stone', 'oak_planks', 'glass'],
            steps: [
                { op: 'fill', block: 'stone', from: { x: 0, y: 0, z: 0 }, to: { x: 9, y: 0, z: 9 } }
            ]
        };

        // Store in cache
        cache.set(key, generatedBlueprint);

        // Second request - cache hit
        blueprint = cache.get(key);
        expect(blueprint).toEqual(generatedBlueprint);

        // Verify stats
        const stats = cache.getStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.sets).toBe(1);
    });

    test('cache saves multiple different blueprints', () => {
        const cache = new BlueprintCache();

        const blueprints = [
            { prompt: 'build a house', type: 'house', bp: { size: { width: 10, height: 8, depth: 10 }, palette: [], steps: [] } },
            { prompt: 'build a castle', type: 'castle', bp: { size: { width: 30, height: 20, depth: 30 }, palette: [], steps: [] } },
            { prompt: 'build a tower', type: 'tower', bp: { size: { width: 5, height: 15, depth: 5 }, palette: [], steps: [] } }
        ];

        // Store all
        blueprints.forEach(({ prompt, type, bp }) => {
            const key = cache.generateKey(prompt, type, false);
            cache.set(key, bp);
        });

        // Retrieve all
        blueprints.forEach(({ prompt, type, bp }) => {
            const key = cache.generateKey(prompt, type, false);
            const retrieved = cache.get(key);
            expect(retrieved).toEqual(bp);
        });

        expect(cache.getStats().size).toBe(3);
    });
});

describe('Blueprint Cache - Module Exports', () => {
    afterEach(() => {
        resetGlobalCache();
    });

    test('DEFAULT_TTL_MS is 24 hours', () => {
        expect(DEFAULT_TTL_MS).toBe(24 * 60 * 60 * 1000);
    });

    test('getBlueprintCache returns singleton', () => {
        const cache1 = getBlueprintCache();
        const cache2 = getBlueprintCache();

        expect(cache1).toBe(cache2);
    });

    test('resetGlobalCache clears the singleton', () => {
        const cache1 = getBlueprintCache();
        cache1.set('test', { data: 'value' });

        resetGlobalCache();

        const cache2 = getBlueprintCache();
        expect(cache2.get('test')).toBeNull();
    });

    test('has() method returns true for valid entry', () => {
        const cache = new BlueprintCache();
        const key = cache.generateKey('test', 'house', false);

        expect(cache.has(key)).toBe(false);

        cache.set(key, { test: true });

        expect(cache.has(key)).toBe(true);
    });

    test('cleanup() removes expired entries', async () => {
        const cache = new BlueprintCache({ ttlMs: 50 });

        cache.set('key1', { data: 1 });
        cache.set('key2', { data: 2 });

        expect(cache.cache.size).toBe(2);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 100));

        const removed = cache.cleanup();

        expect(removed).toBe(2);
        expect(cache.cache.size).toBe(0);
    });
});

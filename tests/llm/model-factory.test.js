/**
 * Tests for Model Factory and LLM Abstraction Layer
 *
 * Verifies:
 * - Factory creates correct client types
 * - BaseLLMClient interface is properly extended
 * - Environment variable configuration works
 */

import { jest } from '@jest/globals';

// Mock the Gemini API before importing
jest.unstable_mockModule('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: () => '{"test": true}',
                    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 }
                }
            })
        })
    }))
}));

const { createLLMClient, createLLMClientFromEnv, LLM_PROVIDERS } = await import('../../src/llm/model-factory.js');
const { BaseLLMClient } = await import('../../src/llm/base-client.js');
const { GeminiClient } = await import('../../src/llm/gemini-client.js');

describe('Model Factory', () => {
    describe('createLLMClient', () => {
        test('creates GeminiClient for "gemini" provider', () => {
            const client = createLLMClient('gemini', 'test-api-key');
            expect(client).toBeInstanceOf(GeminiClient);
            expect(client).toBeInstanceOf(BaseLLMClient);
        });

        test('creates GeminiClient for "google" alias', () => {
            const client = createLLMClient('google', 'test-api-key');
            expect(client).toBeInstanceOf(GeminiClient);
        });

        test('handles case-insensitive provider names', () => {
            const client1 = createLLMClient('GEMINI', 'test-api-key');
            const client2 = createLLMClient('Gemini', 'test-api-key');
            expect(client1).toBeInstanceOf(GeminiClient);
            expect(client2).toBeInstanceOf(GeminiClient);
        });

        test('throws for unsupported providers', () => {
            expect(() => createLLMClient('openai', 'key'))
                .toThrow('OpenAI provider not yet implemented');
            expect(() => createLLMClient('anthropic', 'key'))
                .toThrow('Anthropic provider not yet implemented');
            expect(() => createLLMClient('unknown', 'key'))
                .toThrow('Unknown LLM provider');
        });

        test('passes options to client', () => {
            const client = createLLMClient('gemini', 'test-key', { model: 'gemini-1.5-pro' });
            expect(client.modelName).toBe('gemini-1.5-pro');
        });
    });

    describe('createLLMClientFromEnv', () => {
        test('creates Gemini client from GEMINI_API_KEY', () => {
            const env = { GEMINI_API_KEY: 'test-gemini-key' };
            const client = createLLMClientFromEnv(env);
            expect(client).toBeInstanceOf(GeminiClient);
        });

        test('uses LLM_PROVIDER to select provider', () => {
            const env = { LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key' };
            const client = createLLMClientFromEnv(env);
            expect(client).toBeInstanceOf(GeminiClient);
        });

        test('throws when API key is missing', () => {
            const env = { LLM_PROVIDER: 'gemini' }; // No API key
            expect(() => createLLMClientFromEnv(env))
                .toThrow('No API key found');
        });

        test('uses LLM_MODEL to override default model', () => {
            const env = { GEMINI_API_KEY: 'test-key', LLM_MODEL: 'gemini-1.5-pro' };
            const client = createLLMClientFromEnv(env);
            expect(client.modelName).toBe('gemini-1.5-pro');
        });
    });

    describe('LLM_PROVIDERS enum', () => {
        test('contains expected providers', () => {
            expect(LLM_PROVIDERS.GEMINI).toBe('gemini');
            expect(LLM_PROVIDERS.OPENAI).toBe('openai');
            expect(LLM_PROVIDERS.ANTHROPIC).toBe('anthropic');
            expect(LLM_PROVIDERS.LOCAL).toBe('local');
        });
    });
});

describe('BaseLLMClient', () => {
    test('throws when abstract methods are called directly', async () => {
        const client = new BaseLLMClient();
        await expect(client.generate('prompt')).rejects.toThrow('must be implemented');
        await expect(client.generateWithImage('prompt', 'url')).rejects.toThrow('must be implemented');
    });

    test('tracks token usage', () => {
        const client = new BaseLLMClient();
        expect(client.getTokenUsage()).toEqual({ totalPromptTokens: 0, totalResponseTokens: 0 });
    });

    test('parseJSON handles markdown code blocks', () => {
        const client = new BaseLLMClient();
        const result = client.parseJSON('```json\n{"key": "value"}\n```');
        expect(result).toEqual({ key: 'value' });
    });

    test('parseJSON throws on invalid JSON', () => {
        const client = new BaseLLMClient();
        expect(() => client.parseJSON('not json')).toThrow('Failed to parse JSON');
    });
});

describe('GeminiClient', () => {
    test('extends BaseLLMClient', () => {
        const client = new GeminiClient('test-key');
        expect(client).toBeInstanceOf(BaseLLMClient);
    });

    test('getModelName returns correct model', () => {
        const client = new GeminiClient('test-key');
        expect(client.getModelName()).toBe('gemini-2.0-flash');

        const clientWithCustomModel = new GeminiClient('test-key', { model: 'gemini-1.5-pro' });
        expect(clientWithCustomModel.getModelName()).toBe('gemini-1.5-pro');
    });

    test('supportsVision returns true', () => {
        const client = new GeminiClient('test-key');
        expect(client.supportsVision()).toBe(true);
    });

    test('throws without API key', () => {
        expect(() => new GeminiClient()).toThrow('GEMINI_API_KEY is required');
        expect(() => new GeminiClient('')).toThrow('GEMINI_API_KEY is required');
    });
});

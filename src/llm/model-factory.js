/**
 * Model Factory
 *
 * Creates LLM clients based on provider configuration.
 * Enables model-agnostic blueprint generation.
 *
 * Inspired by MindCraft's multi-model support.
 *
 * Usage:
 *   const client = createLLMClient('gemini', process.env.GEMINI_API_KEY);
 *   const blueprint = await client.generateJSON(prompt);
 */

import { GeminiClient } from './gemini-client.js';

/**
 * Supported LLM providers
 */
export const LLM_PROVIDERS = {
    GEMINI: 'gemini',
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    LOCAL: 'local'
};

/**
 * Create an LLM client for the specified provider
 *
 * @param {string} provider - Provider name ('gemini', 'openai', 'anthropic', 'local')
 * @param {string} apiKey - API key for the provider
 * @param {Object} options - Additional options
 * @param {string} options.model - Model name override
 * @param {number} options.temperature - Default temperature
 * @returns {BaseLLMClient} LLM client instance
 */
export function createLLMClient(provider, apiKey, options = {}) {
    const normalizedProvider = provider?.toLowerCase() || 'gemini';

    switch (normalizedProvider) {
        case 'gemini':
        case 'google':
            return new GeminiClient(apiKey, options);

        case 'openai':
        case 'gpt':
            // Placeholder for future OpenAI integration
            throw new Error(
                'OpenAI provider not yet implemented. ' +
                'To add support, create src/llm/openai-client.js extending BaseLLMClient.'
            );

        case 'anthropic':
        case 'claude':
            // Placeholder for future Anthropic integration
            throw new Error(
                'Anthropic provider not yet implemented. ' +
                'To add support, create src/llm/anthropic-client.js extending BaseLLMClient.'
            );

        case 'local':
        case 'ollama':
            // Placeholder for local model integration (e.g., Ollama)
            throw new Error(
                'Local provider not yet implemented. ' +
                'To add support, create src/llm/local-client.js extending BaseLLMClient.'
            );

        default:
            throw new Error(`Unknown LLM provider: ${provider}. Supported: gemini, openai, anthropic, local`);
    }
}

/**
 * Create an LLM client from environment variables
 *
 * Reads LLM_PROVIDER and appropriate API key from environment.
 *
 * @param {Object} env - Environment variables (defaults to process.env)
 * @returns {BaseLLMClient} LLM client instance
 */
export function createLLMClientFromEnv(env = process.env) {
    const provider = env.LLM_PROVIDER || 'gemini';

    let apiKey;
    switch (provider.toLowerCase()) {
        case 'gemini':
        case 'google':
            apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
            break;
        case 'openai':
        case 'gpt':
            apiKey = env.OPENAI_API_KEY;
            break;
        case 'anthropic':
        case 'claude':
            apiKey = env.ANTHROPIC_API_KEY;
            break;
        case 'local':
        case 'ollama':
            apiKey = ''; // Local models don't need API keys
            break;
        default:
            apiKey = env.LLM_API_KEY;
    }

    if (!apiKey && provider !== 'local') {
        throw new Error(`No API key found for provider ${provider}. Set the appropriate environment variable.`);
    }

    const options = {
        model: env.LLM_MODEL,
        temperature: env.LLM_TEMPERATURE ? parseFloat(env.LLM_TEMPERATURE) : undefined
    };

    return createLLMClient(provider, apiKey, options);
}

export default createLLMClient;

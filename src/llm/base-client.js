/**
 * Base LLM Client
 *
 * Abstract base class defining the interface for all LLM providers.
 * This enables model-agnostic blueprint generation.
 *
 * Inspired by MindCraft's multi-model support approach.
 */

export class BaseLLMClient {
    constructor(options = {}) {
        this.options = options;
        this.tokenUsage = {
            totalPromptTokens: 0,
            totalResponseTokens: 0
        };
    }

    /**
     * Generate text from a prompt
     * @param {string} prompt - The prompt to send to the model
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, options = {}) {
        throw new Error('generate() must be implemented by subclass');
    }

    /**
     * Generate text from a prompt with an image (multimodal)
     * @param {string} prompt - The prompt to send to the model
     * @param {string} imageUrl - URL or base64 of the image
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generateWithImage(prompt, imageUrl, options = {}) {
        throw new Error('generateWithImage() must be implemented by subclass');
    }

    /**
     * Generate structured JSON output
     * @param {string} prompt - The prompt to send to the model
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Parsed JSON response
     */
    async generateJSON(prompt, options = {}) {
        const response = await this.generate(prompt, options);
        return this.parseJSON(response);
    }

    /**
     * Parse JSON from LLM response, handling common issues
     * @param {string} response - Raw LLM response
     * @returns {Object} Parsed JSON
     */
    parseJSON(response) {
        // Remove markdown code blocks if present
        let cleaned = response.trim();

        // Handle ```json ... ``` blocks
        if (cleaned.startsWith('```')) {
            const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                cleaned = jsonMatch[1].trim();
            }
        }

        try {
            return JSON.parse(cleaned);
        } catch (error) {
            throw new Error(`Failed to parse JSON from LLM response: ${error.message}`);
        }
    }

    /**
     * Get token usage statistics
     * @returns {Object} Token usage {totalPromptTokens, totalResponseTokens}
     */
    getTokenUsage() {
        return { ...this.tokenUsage };
    }

    /**
     * Reset token usage counters
     */
    resetTokenUsage() {
        this.tokenUsage.totalPromptTokens = 0;
        this.tokenUsage.totalResponseTokens = 0;
    }

    /**
     * Get the model name/identifier
     * @returns {string} Model name
     */
    getModelName() {
        return 'unknown';
    }

    /**
     * Check if this client supports vision/image input
     * @returns {boolean} True if vision is supported
     */
    supportsVision() {
        return false;
    }
}

export default BaseLLMClient;

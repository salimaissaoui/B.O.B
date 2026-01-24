import { GoogleGenerativeAI } from '@google/generative-ai';
import { designPlanPrompt } from './prompts/design-plan.js';
import { blueprintPrompt, repairPrompt } from './prompts/blueprint.js';
import { designPlanSchema, blueprintSchema } from '../config/schemas.js';

export class GeminiClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp'
    });
    this.tokenUsage = {
      totalPromptTokens: 0,
      totalResponseTokens: 0
    };
  }

  /**
   * Generate a high-level design plan from user prompt
   * @param {string} userPrompt - Natural language building request
   * @returns {Promise<Object>} - Design plan object
   */
  async generateDesignPlan(userPrompt) {
    const prompt = designPlanPrompt(userPrompt);
    
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: designPlanSchema
        }
      });

      // Track token usage
      if (result.response.usageMetadata) {
        this.tokenUsage.totalPromptTokens += result.response.usageMetadata.promptTokenCount || 0;
        this.tokenUsage.totalResponseTokens += result.response.usageMetadata.candidatesTokenCount || 0;
      }

      const text = result.response.text();
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Design plan generation failed: ${error.message}`);
    }
  }

  /**
   * Generate executable blueprint from design plan
   * @param {Object} designPlan - High-level design plan
   * @param {string[]} allowlist - Allowed block types
   * @returns {Promise<Object>} - Blueprint object
   */
  async generateBlueprint(designPlan, allowlist) {
    const prompt = blueprintPrompt(designPlan, allowlist);
    
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,  // Lower temperature for more structured output
          responseMimeType: 'application/json',
          responseSchema: blueprintSchema
        }
      });

      // Track token usage
      if (result.response.usageMetadata) {
        this.tokenUsage.totalPromptTokens += result.response.usageMetadata.promptTokenCount || 0;
        this.tokenUsage.totalResponseTokens += result.response.usageMetadata.candidatesTokenCount || 0;
      }

      const text = result.response.text();
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Blueprint generation failed: ${error.message}`);
    }
  }

  /**
   * Repair a blueprint based on validation errors
   * @param {Object} blueprint - Current blueprint
   * @param {string[]} errors - Validation errors
   * @param {Object} designPlan - Original design plan
   * @param {string[]} allowlist - Allowed blocks
   * @returns {Promise<Object>} - Repaired blueprint
   */
  async repairBlueprint(blueprint, errors, designPlan, allowlist) {
    const prompt = repairPrompt(blueprint, errors, designPlan, allowlist);
    
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,  // Even lower for repairs
          responseMimeType: 'application/json',
          responseSchema: blueprintSchema
        }
      });

      // Track token usage
      if (result.response.usageMetadata) {
        this.tokenUsage.totalPromptTokens += result.response.usageMetadata.promptTokenCount || 0;
        this.tokenUsage.totalResponseTokens += result.response.usageMetadata.candidatesTokenCount || 0;
      }

      const text = result.response.text();
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Blueprint repair failed: ${error.message}`);
    }
  }

  /**
   * Get total token usage statistics
   * @returns {Object} - Token usage stats
   */
  getTokenUsage() {
    return {
      ...this.tokenUsage,
      total: this.tokenUsage.totalPromptTokens + this.tokenUsage.totalResponseTokens
    };
  }

  /**
   * Reset token usage counters
   */
  resetTokenUsage() {
    this.tokenUsage = {
      totalPromptTokens: 0,
      totalResponseTokens: 0
    };
  }
}

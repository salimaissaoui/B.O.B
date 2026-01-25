import { GoogleGenerativeAI } from '@google/generative-ai';
import { designPlanPrompt } from './prompts/design-plan.js';
import { blueprintPrompt, repairPrompt } from './prompts/blueprint.js';
import { designPlanSchema, blueprintSchema } from '../config/schemas.js';
import { SAFETY_LIMITS } from '../config/limits.js';

export class GeminiClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash'
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
      // Include JSON parsing in retry scope so malformed responses trigger retry
      const designPlan = await this.requestWithRetry('design plan', async () => {
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
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
        return this.parseJsonResponse(text, 'design plan');
      });

      return designPlan;
    } catch (error) {
      throw new Error(`Design plan generation failed: ${error.message}`);
    }
  }

  /**
   * Generate executable blueprint from design plan
   * @param {Object} designPlan - High-level design plan
   * @param {string[]} allowlist - Allowed block types
   * @param {boolean} worldEditAvailable - Whether WorldEdit is available
   * @returns {Promise<Object>} - Blueprint object
   */
  async generateBlueprint(designPlan, allowlist, worldEditAvailable = false) {
    const prompt = blueprintPrompt(designPlan, allowlist, worldEditAvailable);
    
    try {
      // Include JSON parsing in retry scope so malformed responses trigger retry
      const blueprint = await this.requestWithRetry('blueprint', async () => {
        // NOTE: We intentionally don't use responseSchema for blueprints because
        // the schema is too complex and causes Gemini to truncate output.
        // Instead, we rely on the prompt to guide JSON structure and our repair logic.
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: SAFETY_LIMITS.llmMaxOutputTokens || 8192,
            responseMimeType: 'application/json'
            // Removed responseSchema - causes truncation with complex blueprints
          }
        });

        // Track token usage
        if (result.response.usageMetadata) {
          this.tokenUsage.totalPromptTokens += result.response.usageMetadata.promptTokenCount || 0;
          this.tokenUsage.totalResponseTokens += result.response.usageMetadata.candidatesTokenCount || 0;
        }

        const text = result.response.text();
        
        // Log response length for debugging
        if (text.length < 1000) {
          console.warn(`⚠ Short blueprint response: ${text.length} chars (may be truncated)`);
        }
        
        return this.parseJsonResponse(text, 'blueprint');
      });

      return blueprint;
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
   * @param {Object} qualityScore - Optional quality score for feedback
   * @returns {Promise<Object>} - Repaired blueprint
   */
  async repairBlueprint(blueprint, errors, designPlan, allowlist, qualityScore = null) {
    const prompt = repairPrompt(blueprint, errors, designPlan, allowlist, qualityScore);
    
    try {
      // Include JSON parsing in retry scope so malformed responses trigger retry
      const repairedBlueprint = await this.requestWithRetry('repair', async () => {
        // NOTE: We intentionally don't use responseSchema for the same reason as blueprints
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: SAFETY_LIMITS.llmMaxOutputTokens || 8192,
            responseMimeType: 'application/json'
            // Removed responseSchema - causes truncation with complex blueprints
          }
        });

        // Track token usage
        if (result.response.usageMetadata) {
          this.tokenUsage.totalPromptTokens += result.response.usageMetadata.promptTokenCount || 0;
          this.tokenUsage.totalResponseTokens += result.response.usageMetadata.candidatesTokenCount || 0;
        }

        const text = result.response.text();
        return this.parseJsonResponse(text, 'repair');
      });

      return repairedBlueprint;
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

  async requestWithRetry(label, requestFn) {
    let lastError;

    for (let attempt = 0; attempt < SAFETY_LIMITS.llmMaxRetries; attempt++) {
      try {
        return await this.withTimeout(
          requestFn(),
          SAFETY_LIMITS.llmTimeoutMs
        );
      } catch (error) {
        lastError = error;
        const shouldRetry = this.isRetryable(error);
        if (!shouldRetry || attempt === SAFETY_LIMITS.llmMaxRetries - 1) {
          break;
        }
        // Exponential backoff: 1s, 2s, 4s...
        const delay = SAFETY_LIMITS.llmRetryDelayMs * Math.pow(2, attempt);
        console.warn(`⚠ ${label} request failed, retrying in ${delay}ms (${attempt + 1}/${SAFETY_LIMITS.llmMaxRetries})`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  isRetryable(error) {
    const message = error?.message?.toLowerCase() || '';
    return error?.name === 'TimeoutError' ||
      message.includes('timeout') ||
      message.includes('rate') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('json') ||
      message.includes('unterminated') ||
      message.includes('unexpected end') ||
      message.includes('parse');
  }

  withTimeout(promise, timeoutMs) {
    if (!timeoutMs || timeoutMs <= 0) {
      return promise;
    }

    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      const error = new Error('LLM request timed out');
      error.name = 'TimeoutError';
      timeoutId = setTimeout(() => reject(error), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  parseJsonResponse(text, label) {
    // Step 1: Try direct parse
    try {
      return JSON.parse(text);
    } catch (directError) {
      // Continue to cleaning steps
    }

    // Step 2: Strip markdown code blocks and whitespace
    let cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Step 3: Extract JSON object between first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      this.logJsonDebug(label, text, null, 'No valid JSON object found (missing braces)');
      throw new Error(`${label} JSON parse failed: no valid JSON object found`);
    }

    let candidate = cleaned.slice(firstBrace, lastBrace + 1);

    // Step 4: Try parsing the extracted candidate
    try {
      return JSON.parse(candidate);
    } catch (extractError) {
      // Continue to repair attempts
    }

    // Step 5: Attempt common JSON repairs
    const originalCandidate = candidate;
    candidate = this.repairJson(candidate);

    try {
      return JSON.parse(candidate);
    } catch (repairError) {
      this.logJsonDebug(label, originalCandidate, repairError, 'JSON repair failed');
      throw new Error(`${label} JSON parse failed after repair: ${repairError.message}`);
    }
  }

  /**
   * Log detailed debug info for JSON parse failures
   */
  logJsonDebug(label, json, error, reason) {
    console.warn(`\n┌─────────────────────────────────────────────────────────`);
    console.warn(`│ ⚠ ${label.toUpperCase()} JSON PARSE ERROR`);
    console.warn(`├─────────────────────────────────────────────────────────`);
    console.warn(`│ Reason: ${reason}`);
    console.warn(`│ Response length: ${json?.length || 0} characters`);

    if (error?.message) {
      console.warn(`│ Error: ${error.message}`);
      
      // Try to extract position from error message
      const posMatch = error.message.match(/position\s+(\d+)/i);
      if (posMatch && json) {
        const pos = parseInt(posMatch[1], 10);
        const contextStart = Math.max(0, pos - 40);
        const contextEnd = Math.min(json.length, pos + 40);
        const before = json.slice(contextStart, pos);
        const after = json.slice(pos, contextEnd);
        const pointer = ' '.repeat(Math.min(40, pos - contextStart)) + '▲';
        
        console.warn(`│ Position: ${pos}`);
        console.warn(`├─────────────────────────────────────────────────────────`);
        console.warn(`│ Context around error:`);
        console.warn(`│   ...${before}${after}...`);
        console.warn(`│      ${pointer}`);
      }
    }

    // Show start and end of the response
    if (json && json.length > 0) {
      console.warn(`├─────────────────────────────────────────────────────────`);
      const startPreview = json.slice(0, 80).replace(/\n/g, '\\n');
      const endPreview = json.slice(-80).replace(/\n/g, '\\n');
      console.warn(`│ Start: ${startPreview}${json.length > 80 ? '...' : ''}`);
      if (json.length > 160) {
        console.warn(`│ End:   ...${endPreview}`);
      }
    }

    console.warn(`└─────────────────────────────────────────────────────────\n`);
  }

  /**
   * Attempt to repair common JSON malformations from LLM output
   * @param {string} json - Potentially malformed JSON string
   * @returns {string} - Repaired JSON string
   */
  repairJson(json) {
    let repaired = json;

    // Remove trailing commas before } or ]
    repaired = repaired.replace(/,\s*([\]}])/g, '$1');

    // Fix missing commas between properties: }" or ]" patterns
    repaired = repaired.replace(/}(\s*)"(\w)/g, '},$1"$2');
    repaired = repaired.replace(/](\s*)"(\w)/g, '],$1"$2');

    // Fix unescaped newlines in strings (replace with space)
    repaired = repaired.replace(/([^\\])\\n/g, '$1 ');

    // Try to balance braces if truncated
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/]/g) || []).length;

    // If more opens than closes, try to close them
    if (openBrackets > closeBrackets) {
      // Check if we're in the middle of an array - try to close it
      const lastChar = repaired.trim().slice(-1);
      if (lastChar !== ']' && lastChar !== '}') {
        // Might be truncated mid-value, try to close gracefully
        // Remove partial last element if it looks incomplete
        repaired = repaired.replace(/,\s*"[^"]*$/, ''); // Remove incomplete string
        repaired = repaired.replace(/,\s*{[^}]*$/, ''); // Remove incomplete object
      }
      repaired += ']'.repeat(openBrackets - closeBrackets);
    }

    if (openBraces > closeBraces) {
      repaired += '}'.repeat(openBraces - closeBraces);
    }

    return repaired;
  }
}

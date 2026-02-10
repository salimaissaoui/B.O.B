import { GoogleGenerativeAI } from '@google/generative-ai';
import { SAFETY_LIMITS } from '../config/limits.js';
import { BaseLLMClient } from './base-client.js';
import { sleep } from '../utils/sleep.js';

/**
 * Gemini LLM Client
 *
 * Implementation of BaseLLMClient for Google's Gemini models.
 * Supports text generation, vision, and JSON output.
 */
export class GeminiClient extends BaseLLMClient {
  constructor(apiKey, options = {}) {
    super(options);

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.apiKey = apiKey;
    this.modelName = options.model || 'gemini-2.0-flash';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName
    });
  }

  /**
   * Get the model name/identifier
   * @returns {string} Model name
   */
  getModelName() {
    return this.modelName;
  }

  /**
   * Check if this client supports vision/image input
   * @returns {boolean} True if vision is supported
   */
  supportsVision() {
    return true; // Gemini 2.0 Flash supports vision
  }

  /**
   * Generic content generation method
   * @param {Object} options - Generation options
   * @param {string} options.prompt - The prompt to send to the LLM
   * @param {number} options.temperature - Temperature setting (0.0 to 1.0)
   * @param {string} options.responseFormat - Expected response format ('json' or 'text')
   * @returns {Promise<Object|string>} - Generated content
   */
  async generateContent(options) {
    const {
      prompt,
      images = [],
      temperature = 0.5,
      responseFormat = 'json'
    } = options;

    try {
      const label = 'content generation';
      const content = await this.requestWithRetry(label, async () => {

        // Construct parts (Text + Images)
        const parts = [{ text: prompt }];
        if (images && Array.isArray(images)) {
          images.forEach(img => {
            if (img.mimeType && img.data) {
              parts.push({
                inlineData: {
                  mimeType: img.mimeType,
                  data: img.data
                }
              });
            }
          });
        }

        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature,
            maxOutputTokens: SAFETY_LIMITS.llmMaxOutputTokens || 8192,
            responseMimeType: responseFormat === 'json' ? 'application/json' : 'text/plain'
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
          console.warn(`⚠ Short response: ${text.length} chars (may be truncated)`);
        }

        if (responseFormat === 'json') {
          return this.parseJsonResponse(text, label);
        }

        return text;
      });

      return content;
    } catch (error) {
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  /**
   * Stream content generation with progress callback
   * @param {Object} options - Generation options
   * @param {string} options.prompt - The prompt to send to the LLM
   * @param {number} options.temperature - Temperature setting (0.0 to 1.0)
   * @param {Function} options.onProgress - Callback for progress updates (optional)
   * @returns {Promise<Object>} - Generated content
   */
  async streamContent(options) {
    const {
      prompt,
      temperature = 0.5,
      onProgress = null
    } = options;

    try {
      let fullText = '';
      let chunkCount = 0;

      const result = await this.model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: SAFETY_LIMITS.llmMaxOutputTokens || 8192,
          responseMimeType: 'application/json'
        }
      });

      // Process stream chunks
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        chunkCount++;

        // Call progress callback if provided
        if (onProgress && chunkCount % 5 === 0) {
          onProgress({
            chunksReceived: chunkCount,
            bytesReceived: fullText.length,
            partial: fullText
          });
        }
      }

      // Get final response for token tracking
      const response = await result.response;
      if (response.usageMetadata) {
        this.tokenUsage.totalPromptTokens += response.usageMetadata.promptTokenCount || 0;
        this.tokenUsage.totalResponseTokens += response.usageMetadata.candidatesTokenCount || 0;
      }

      // Parse final JSON
      return this.parseJsonResponse(fullText, 'streaming generation');
    } catch (error) {
      throw new Error(`Streaming generation failed: ${error.message}`);
    }
  }

  /**
   * Repair a blueprint based on validation errors
   * @param {Object} blueprint - Current blueprint
   * @param {string[]} errors - Validation errors
   * @param {Object} analysis - Prompt analysis from Stage 1
   * @param {Object} qualityScore - Optional quality score for feedback
   * @returns {Promise<Object>} - Repaired blueprint
   */
  async repairBlueprint(blueprint, errors, analysis, qualityScore = null) {
    // Build repair prompt
    const prompt = this.buildRepairPrompt(blueprint, errors, analysis, qualityScore);

    try {
      // Include JSON parsing in retry scope so malformed responses trigger retry
      const repairedBlueprint = await this.requestWithRetry('repair', async () => {
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: SAFETY_LIMITS.llmMaxOutputTokens || 8192,
            responseMimeType: 'application/json'
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
   * Build repair prompt
   */
  buildRepairPrompt(blueprint, errors, analysis, qualityScore) {
    return `
The following blueprint has validation errors. Fix them while maintaining the design intent.

BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

VALIDATION ERRORS:
${errors.join('\n')}

${qualityScore ? `
QUALITY SCORE: ${(qualityScore.score * 100).toFixed(1)}% (minimum required: 70%)

QUALITY ISSUES:
${qualityScore.penalties.join('\n')}
` : ''}

CONSTRAINTS:
- Only use valid Minecraft 1.20.1 blocks
- Dimensions: ${analysis.hints.dimensions.width}x${analysis.hints.dimensions.height}x${analysis.hints.dimensions.depth}
- All coordinates must be within bounds
- Required features MUST be included: ${analysis.hints.features.join(', ')}

REPAIR INSTRUCTIONS:
1. Fix validation errors (coordinate bounds, invalid blocks, etc.)
2. Ensure ALL required features are present in the blueprint
3. Verify structural integrity (foundation, walls, roof)
4. Check that dimensions match requirements (within 20% tolerance)
5. Minimum ${['pixel_art', 'statue'].includes(blueprint.buildType) ? '1' : '15'} steps
- Use appropriate operations for each feature type

Remember:
- Doors should use "door" operation (creates 2-block tall door)
- Windows should use "window_strip" for rows
- Replace sequences of 3+ "set" operations with "line", "fill", or "hollow_box"
Fix the specific errors mentioned above. Output only the corrected JSON blueprint.
`;
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
        await sleep(delay);
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
      const lastChar = repaired.trim().slice(-1);

      // If we are inside a string (odd number of quotes), close it
      const quoteCount = (repaired.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        repaired += '"';
      }

      // If ends with comma, remove it
      repaired = repaired.replace(/,\s*$/, '');

      repaired += ']'.repeat(openBrackets - closeBrackets);
    }

    if (openBraces > closeBraces) {
      repaired += '}'.repeat(openBraces - closeBraces);
    }

    return repaired;
  }
}

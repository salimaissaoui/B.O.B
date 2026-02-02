/**
 * Stage 0: Reference Analysis
 * Fetches and analyzes visual/textual references before blueprint generation.
 */

import { GeminiClient } from '../llm/gemini-client.js';
import { visualAnalysisPrompt } from '../llm/prompts/visual-blueprint.js';
import { fetchWithRetry } from '../utils/network-resilience.js';

/**
 * Stage 0: Reference
 * Processes image URLs or "from image" keywords
 */
export async function referenceStage(analysis, apiKey) {
    const { imageSource, userPrompt } = analysis;

    if (!imageSource || !imageSource.hasImage || !imageSource.url) {
        return { hasReference: false };
    }

    console.log(`🖼 Reference Stage: Analyzing visual reference from ${imageSource.url}...`);

    try {
        // 1. Fetch Image (with retry for network failures)
        const response = await fetchWithRetry(
            imageSource.url,
            { signal: AbortSignal.timeout(30000) },
            { label: 'image fetch', maxRetries: 3 }
        );
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const imagePayload = {
            mimeType: response.headers.get('content-type') || 'image/jpeg',
            data: Buffer.from(buffer).toString('base64')
        };

        // 2. Analyze with Gemini Vision
        const client = new GeminiClient(apiKey);
        const prompt = visualAnalysisPrompt(userPrompt);

        console.log('  🤖 Calling Gemini Vision for architectural analysis...');
        const result = await client.generateContent({
            prompt,
            images: [imagePayload],
            temperature: 0.4,
            responseFormat: 'json'
        });

        console.log('  ✓ Analysis complete');
        if (process.env.BOB_DEBUG === 'true') {
            console.log('  DEBUG Visual Analysis:', JSON.stringify(result, null, 2));
        }

        return {
            hasReference: true,
            imagePayload,
            analysis: result
        };

    } catch (error) {
        console.warn(`  ⚠ Reference Stage failed: ${error.message}`);
        return {
            hasReference: false,
            error: error.message
        };
    }
}

export default referenceStage;

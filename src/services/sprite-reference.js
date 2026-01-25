/**
 * Online Sprite Reference Service
 * Generates pixel art sprites using Gemini's visual knowledge
 *
 * IMPLEMENTATION STATUS:
 * ✅ generateFromWebReference() - WORKING - Uses Gemini to generate sprites from its knowledge
 * ⏳ searchSpriteReference() - TODO - Placeholder for future web scraping feature
 * ⏳ imageToPixelGrid() - TODO - Placeholder for future image analysis feature
 *
 * FUTURE ENHANCEMENTS:
 * - Implement actual web scraping from sprite databases (Spriters Resource, etc.)
 * - Use Gemini Vision to analyze real sprite images
 * - Add sprite caching for popular subjects
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { SPRITE_SOURCES, isSourceConfigured } from '../config/sprite-sources.js';

/**
 * Search for a sprite reference image using PokeAPI
 * @param {string} subject - Pokemon name
 * @returns {Promise<string|null>} - Image URL or null
 */
async function searchPokeAPI(subject) {
    try {
        const pokemonName = subject.toLowerCase().replace(/[^a-z0-9]/g, '');
        const response = await fetch(`${SPRITE_SOURCES.pokeApi.baseUrl}/pokemon/${pokemonName}`);

        if (!response.ok) return null;

        const data = await response.json();
        const sprite = data.sprites?.front_default || data.sprites?.front_shiny;

        if (sprite) {
            console.log(`✓ Found sprite on PokeAPI: ${pokemonName}`);
            return sprite;
        }
    } catch (error) {
        console.log(`⚠ PokeAPI search failed: ${error.message}`);
    }
    return null;
}

/**
 * Search for a sprite reference image using Google Custom Search
 * @param {string} subject - What to search for
 * @returns {Promise<string|null>} - Image URL or null
 */
async function searchGoogleCustomSearch(subject) {
    const config = SPRITE_SOURCES.googleCustomSearch;

    if (!isSourceConfigured('googleCustomSearch')) {
        console.log('⚠ Google Custom Search not configured (missing API keys)');
        return null;
    }

    try {
        const query = encodeURIComponent(`${subject} pixel art sprite transparent`);
        const url = `${config.baseUrl}?key=${config.apiKey}&cx=${config.searchEngineId}&q=${query}&searchType=image&num=1`;

        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        if (data.items && data.items.length > 0) {
            console.log(`✓ Found sprite via Google Custom Search`);
            return data.items[0].link;
        }
    } catch (error) {
        console.log(`⚠ Google Custom Search failed: ${error.message}`);
    }
    return null;
}

/**
 * Search for a sprite reference image online
 * @param {string} subject - What to search for (e.g., "charizard")
 * @returns {Promise<string|null>} - Image URL or null
 */
export async function searchSpriteReference(subject) {
    console.log(`🔍 Searching for "${subject}" sprite reference...`);

    // Try PokeAPI first (fast and reliable for Pokemon)
    try {
        if (isSourceConfigured('pokeApi')) {
            const pokeSprite = await searchPokeAPI(subject);
            if (pokeSprite) return pokeSprite;
        }

        // Try Google Custom Search if configured
        if (isSourceConfigured('googleCustomSearch')) {
            const googleSprite = await searchGoogleCustomSearch(subject);
            if (googleSprite) return googleSprite;
        }
    } catch (err) {
        console.warn(`⚠ Sprite search error: ${err.message}`);
    }

    console.log(`⚠ No sprite sources found image for "${subject}"`);
    return null;
}

/**
 * Convert an image to a Minecraft pixel art grid using Gemini Vision
 * @param {string} imageUrl - URL of the sprite image
 * @param {string} subject - Subject name for context
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object>} - Grid and legend
 */
export async function imageToPixelGrid(imageUrl, subject, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Fetch the image
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/png';

    const prompt = `Analyze this pixel art sprite of "${subject}" and convert it to a Minecraft build grid.

INSTRUCTIONS:
1. Identify the main colors in the sprite
2. Map each color to the closest Minecraft wool block
3. Output a grid where each cell is a single character representing a block
4. Include a legend mapping characters to block names
5. Preserve the sprite's recognizable features

OUTPUT FORMAT (JSON only):
{
  "subject": "${subject}",
  "description": "Brief description of what you see",
  "width": <number>,
  "height": <number>,
  "legend": {
    ".": "air",
    "#": "black_wool",
    "O": "orange_wool"
  },
  "grid": [
    "...###...",
    "..#OOO#.."
  ]
}

- Determine the true bounding box of the sprite (ignore empty space)
- Map pixels to the OPTIMAL RESOLUTION for detail (between 32x32 and 80x80)
- Do NOT squash the sprite. If it needs to be tall (e.g. 30x60), make it tall.
- Output ONLY valid JSON
- Use '.' for transparent/background pixels
- Use single characters for each color`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                mimeType,
                data: base64Image
            }
        }
    ]);

    const text = result.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to parse grid from image analysis');
    }

    return JSON.parse(jsonMatch[0]);
}

/**
 * Generate a pixel art blueprint from a web search
 * @param {string} subject - What to build
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object|null>} - Blueprint or null if not found
 */
export async function generateFromWebReference(subject, apiKey) {
    console.log(`🌐 Attempting to find online reference for: "${subject}"`);

    // Try to find actual sprite image first
    const imageUrl = await searchSpriteReference(subject);

    if (imageUrl) {
        try {
            console.log(`📷 Analyzing sprite image with Gemini Vision...`);
            const gridData = await imageToPixelGrid(imageUrl, subject, apiKey);

            console.log(`┌─────────────────────────────────────────────────────────`);
            console.log(`│ ✓ SPRITE IMAGE ANALYSIS SUCCESSFUL`);
            console.log(`├─────────────────────────────────────────────────────────`);
            console.log(`│ Subject: "${subject}"`);
            console.log(`│ Source: Image URL`);
            console.log(`│ Size: ${gridData.width}x${gridData.height} pixels`);
            console.log(`│ Colors: ${Object.keys(gridData.legend).length} unique blocks`);
            console.log(`└─────────────────────────────────────────────────────────`);

            // VALIDATION: Strict size check
            if (gridData.width < 16 || gridData.height < 16) {
                throw new Error(`Generated sprite too small: ${gridData.width}x${gridData.height} (min 16x16)`);
            }

            return {
                buildType: 'pixel_art',
                theme: 'default',
                description: gridData.description || `Pixel art: ${subject}`,
                size: { width: gridData.width, height: gridData.height, depth: 1 },
                palette: Object.values(gridData.legend).filter(b => b !== 'air'),
                steps: [{
                    op: 'pixel_art',
                    base: { x: 0, y: 0, z: 0 },
                    facing: 'south',
                    grid: gridData.grid,
                    legend: gridData.legend
                }],
                generationMethod: 'image_analysis'
            };
        } catch (imageError) {
            console.warn(`⚠ Image analysis failed (will retry with AI generation): ${imageError.message}`);
        }
    }

    // Fallback: Use Gemini's knowledge to generate sprite
    console.log(`🤖 Using AI knowledge to generate sprite...`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are creating a pixel art sprite for Minecraft.

SUBJECT: ${subject}

TASK: Create an accurate, recognizable pixel art representation.

REQUIREMENTS:
1. DESIGN:
   - Create a recognizable 32x32 to 64x64 pixel art version
   - MUST be at least 16 pixels wide and 16 pixels tall
   - Do NOT create tiny 5x5 icons - use the full space
   - Include key identifying features (face, wings, tail, etc.)

2. PALETTE:
   - Use standard Minecraft wool colors
   - Use '.' for transparent background
   - use '#' for black outlines

OUTPUT FORMAT (JSON only):
{
  "subject": "${subject}",
  "description": "Detailed description of the sprite",
  "width": <number>, // MINIMUM 16
  "height": <number>, // MINIMUM 16
  "legend": {
    ".": "air",
    "#": "black_wool",
    // map single chars to pokemon colors (O=orange, Y=yellow, etc)
  },
  "grid": [
    // array of strings, each row same length
    // row 0 is TOP of the image
    // MUST BE AT LEAST 16 ROWS
  ]
}

CRITICAL:
- MINIMUM SIZE is 16x16. Do not output anything smaller.
- All rows MUST be exactly the same length
- Output ONLY valid JSON, no explanation`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3, // Lower temp for more consistent output
                maxOutputTokens: 4096,
                responseMimeType: 'application/json'
            }
        });

        const text = result.response.text();
        const data = JSON.parse(text);

        // Validate the grid
        if (!data.grid || !Array.isArray(data.grid) || data.grid.length === 0) {
            throw new Error('Invalid grid in response');
        }

        const width = data.grid[0].length;
        for (const row of data.grid) {
            if (row.length !== width) {
                console.warn(`⚠ Row length mismatch: ${row.length} vs ${width}`);
            }
        }

        console.log(`┌─────────────────────────────────────────────────────────`);
        console.log(`│ ✓ SPRITE GENERATION SUCCESSFUL`);
        console.log(`├─────────────────────────────────────────────────────────`);
        console.log(`│ Subject: "${subject}"`);
        console.log(`│ Size: ${data.width}x${data.height} pixels`);
        console.log(`│ Colors: ${Object.keys(data.legend).length} unique blocks`);
        console.log(`│ Grid rows: ${data.grid.length}`);
        console.log(`│ Legend: ${JSON.stringify(data.legend)}`);
        console.log(`└─────────────────────────────────────────────────────────`);

        return {
            buildType: 'pixel_art',
            theme: 'default',
            description: data.description || `Pixel art: ${subject}`,
            size: { width: data.width, height: data.height, depth: 1 },
            palette: Object.values(data.legend).filter(b => b !== 'air'),
            steps: [{
                op: 'pixel_art',
                base: { x: 0, y: 0, z: 0 },
                facing: 'south',
                grid: data.grid,
                legend: data.legend
            }],
            generationMethod: 'web_reference'
        };
    } catch (error) {
        // Detailed error logging for debugging
        console.error(`┌─────────────────────────────────────────────────────────`);
        console.error(`│ ⚠ SPRITE GENERATION FAILED`);
        console.error(`├─────────────────────────────────────────────────────────`);
        console.error(`│ Subject: "${subject}"`);
        console.error(`│ Error Type: ${error.name || 'Unknown'}`);
        console.error(`│ Error Message: ${error.message}`);

        // Provide specific guidance based on error type
        if (error.message.includes('parse') || error.message.includes('JSON')) {
            console.error(`│ Cause: LLM generated invalid JSON format`);
            console.error(`│ Fix: The sprite data format was incorrect`);
        } else if (error.message.includes('grid') || error.message.includes('Invalid')) {
            console.error(`│ Cause: Grid validation failed`);
            console.error(`│ Fix: The sprite grid had inconsistent row lengths`);
        } else if (error.message.includes('API') || error.message.includes('quota')) {
            console.error(`│ Cause: Gemini API error`);
            console.error(`│ Fix: Check API key and quota limits`);
        }

        console.error(`│ Fallback: Will use standard generation instead`);
        console.error(`└─────────────────────────────────────────────────────────`);

        // Return null to trigger fallback (but now with proper logging)
        return null;
    }
}

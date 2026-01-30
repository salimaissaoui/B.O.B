/**
 * Palette Optimizer
 * 
 * Post-processes generated pixel art to improve block selection.
 * Uses LLM to understand the SUBJECT and suggest better blocks
 * based on context rather than pure color matching.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Optimize a pixel art palette using AI understanding
 * @param {Object} blueprint - The generated blueprint with steps
 * @param {string} subject - What the build represents (e.g., "pikachu")
 * @param {string} apiKey - Gemini API key
 * @returns {Object} - Modified blueprint with optimized palette
 */
export async function optimizePalette(blueprint, subject, apiKey) {
    // Only process pixel_art builds
    const pixelArtStep = blueprint.steps?.find(s => s.op === 'pixel_art');
    if (!pixelArtStep || !pixelArtStep.legend) {
        return blueprint; // No pixel art to optimize
    }

    const currentBlocks = Object.values(pixelArtStep.legend).filter(b => b !== 'air');

    if (currentBlocks.length < 2) {
        return blueprint; // Too few blocks to optimize
    }

    console.log(`  🎨 Optimizing palette for "${subject}"...`);
    console.log(`    Current blocks: ${currentBlocks.join(', ')}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a Minecraft pixel art expert. Review this block palette and suggest improvements.

SUBJECT: "${subject}"

CURRENT PALETTE:
${JSON.stringify(pixelArtStep.legend, null, 2)}

TASK: Suggest block replacements to make the pixel art look BETTER and more ACCURATE to the subject.

RULES:
1. UNDERSTAND the subject - if it's Pikachu, cheeks should be RED (red_concrete), body YELLOW (yellow_concrete)
2. PREFER smooth blocks: concrete > wool > terracotta
3. AVOID ugly blocks: end_stone, sandstone, redstone_block, nether_wart_block, etc.
4. KEEP black_concrete or black_wool for outlines
5. Only suggest replacements that make sense for THIS subject

OUTPUT FORMAT (JSON only):
{
  "replacements": {
    "old_block_name": "new_block_name",
    "another_old": "another_new"
  },
  "reasoning": "Brief explanation of why these changes improve the build"
}

If no improvements needed, output: {"replacements": {}, "reasoning": "Palette is already optimal"}

IMPORTANT: Only output valid JSON, no markdown.`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
                responseMimeType: 'application/json'
            }
        });

        const text = result.response.text();
        const suggestions = JSON.parse(text);

        if (!suggestions.replacements || Object.keys(suggestions.replacements).length === 0) {
            console.log(`    ✓ Palette already optimal`);
            return blueprint;
        }

        // Apply replacements to legend
        const newLegend = { ...pixelArtStep.legend };
        let changesApplied = 0;

        for (const [oldBlock, newBlock] of Object.entries(suggestions.replacements)) {
            // Find the legend key that maps to oldBlock
            for (const [char, block] of Object.entries(newLegend)) {
                if (block === oldBlock) {
                    newLegend[char] = newBlock;
                    console.log(`    ✨ ${oldBlock} → ${newBlock}`);
                    changesApplied++;
                    break;
                }
            }
        }

        if (changesApplied > 0) {
            console.log(`    ${suggestions.reasoning || ''}`);

            // Update the blueprint
            const optimizedBlueprint = { ...blueprint };
            const stepIndex = optimizedBlueprint.steps.findIndex(s => s.op === 'pixel_art');
            optimizedBlueprint.steps[stepIndex] = {
                ...pixelArtStep,
                legend: newLegend
            };

            return optimizedBlueprint;
        }

        return blueprint;
    } catch (error) {
        console.warn(`    ⚠ Palette optimization failed: ${error.message}`);
        return blueprint; // Return unmodified on error
    }
}

/**
 * Quick block replacement without LLM - uses known mappings
 * @param {Object} legend - The pixel art legend
 * @returns {Object} - Updated legend with ugly blocks replaced
 */
export function quickBlockCleanup(legend) {
    const UGLY_BLOCK_REPLACEMENTS = {
        // Yellow-ish ugly blocks → yellow_concrete
        'end_stone': 'yellow_concrete',
        'sandstone': 'yellow_concrete',
        'hay_block': 'yellow_concrete',
        'glowstone': 'yellow_concrete',

        // Red-ish ugly blocks → red_concrete
        'red_sandstone': 'red_concrete',
        'redstone_block': 'red_concrete',
        'nether_wart_block': 'red_concrete',

        // Orange-ish ugly blocks → orange_concrete
        'pumpkin': 'orange_concrete',
        'jack_o_lantern': 'orange_concrete',
        'shroomlight': 'orange_concrete',
        'copper_block': 'orange_concrete',

        // Brown ugly blocks → brown_concrete
        'dirt': 'brown_concrete',
        'coarse_dirt': 'brown_concrete',

        // Gray ugly blocks → gray_concrete  
        'cobblestone': 'gray_concrete',
        'gravel': 'gray_concrete',
        'stone': 'gray_concrete',

        // Wool → Concrete upgrades
        'white_wool': 'white_concrete',
        'yellow_wool': 'yellow_concrete',
        'red_wool': 'red_concrete',
        'orange_wool': 'orange_concrete',
        'black_wool': 'black_concrete',
        'brown_wool': 'brown_concrete',
        'gray_wool': 'gray_concrete',
        'light_gray_wool': 'light_gray_concrete',
        'pink_wool': 'pink_concrete',
        'blue_wool': 'blue_concrete',
        'light_blue_wool': 'light_blue_concrete',
        'cyan_wool': 'cyan_concrete',
        'green_wool': 'green_concrete',
        'lime_wool': 'lime_concrete',
        'purple_wool': 'purple_concrete',
        'magenta_wool': 'magenta_concrete'
    };

    const cleanedLegend = { ...legend };
    let changesCount = 0;

    for (const [char, block] of Object.entries(cleanedLegend)) {
        if (UGLY_BLOCK_REPLACEMENTS[block]) {
            const replacement = UGLY_BLOCK_REPLACEMENTS[block];
            cleanedLegend[char] = replacement;
            console.log(`    ✨ Quick fix: ${block} → ${replacement}`);
            changesCount++;
        }
    }

    if (changesCount > 0) {
        console.log(`    ✓ Applied ${changesCount} quick block fixes`);
    }

    return cleanedLegend;
}

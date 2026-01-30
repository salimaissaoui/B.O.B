/**
 * Character Palettes - Iconic character color mappings for optimal block selection
 *
 * When BOB detects a known character (Pikachu, Charizard, Mario, etc.),
 * it uses these pre-defined palettes for consistent, beautiful builds.
 */

export const ICONIC_CHARACTERS = {
    // ==================== POKEMON ====================
    pikachu: {
        name: 'Pikachu',
        keywords: ['pikachu', 'pika', 'electric mouse'],
        colors: {
            body: 'yellow_concrete',
            body_highlight: 'gold_block',
            cheeks: 'red_concrete',
            ears_tip: 'black_concrete',
            eyes: 'black_concrete',
            eye_highlight: 'white_concrete',
            nose: 'brown_concrete',
            tail_base: 'brown_concrete',
            tail: 'yellow_concrete'
        },
        style: 'vibrant',
        tips: [
            'Body should be bright yellow concrete for vibrant look',
            'Red cheeks are signature - use red_concrete',
            'Ear tips are black, not brown',
            'Gold_block for highlights adds premium feel'
        ]
    },

    charizard: {
        name: 'Charizard',
        keywords: ['charizard', 'lizardon', 'fire dragon'],
        colors: {
            body: 'orange_concrete',
            body_dark: 'orange_terracotta',
            belly: 'yellow_concrete',
            wings_inner: 'cyan_terracotta',
            wings_outer: 'cyan_concrete',
            eyes: 'white_concrete',
            pupils: 'black_concrete',
            flame: ['red_concrete', 'orange_concrete', 'yellow_concrete'],
            horns: 'orange_terracotta',
            claws: 'white_concrete'
        },
        style: 'dynamic',
        tips: [
            'Orange body with yellow belly creates depth',
            'Cyan wings are iconic - use terracotta for inner shading',
            'Flame on tail should gradient: red → orange → yellow'
        ]
    },

    bulbasaur: {
        name: 'Bulbasaur',
        keywords: ['bulbasaur', 'fushigidane'],
        colors: {
            body: 'cyan_terracotta',
            body_dark: 'cyan_concrete',
            spots: 'dark_prismarine',
            bulb: 'green_concrete',
            bulb_dark: 'lime_terracotta',
            eyes: 'red_concrete',
            mouth: 'pink_terracotta'
        },
        style: 'natural'
    },

    squirtle: {
        name: 'Squirtle',
        keywords: ['squirtle', 'zenigame'],
        colors: {
            body: 'light_blue_concrete',
            shell: 'brown_concrete',
            shell_belly: 'yellow_concrete',
            eyes: 'brown_concrete',
            tail: 'light_blue_concrete'
        },
        style: 'vibrant'
    },

    // ==================== MARIO CHARACTERS ====================
    mario: {
        name: 'Mario',
        keywords: ['mario', 'super mario', 'mario bros'],
        colors: {
            hat: 'red_concrete',
            shirt: 'red_concrete',
            overalls: 'blue_concrete',
            skin: 'orange_terracotta',
            hair: 'brown_concrete',
            mustache: 'brown_concrete',
            buttons: 'gold_block',
            shoes: 'brown_concrete',
            gloves: 'white_concrete'
        },
        style: 'vibrant',
        tips: [
            'Red hat and shirt should match',
            'Blue overalls with gold buttons',
            'Use orange_terracotta for skin tone'
        ]
    },

    luigi: {
        name: 'Luigi',
        keywords: ['luigi', 'green mario'],
        colors: {
            hat: 'green_concrete',
            shirt: 'green_concrete',
            overalls: 'blue_concrete',
            skin: 'orange_terracotta',
            hair: 'brown_concrete',
            mustache: 'brown_concrete',
            buttons: 'gold_block',
            shoes: 'brown_concrete',
            gloves: 'white_concrete'
        },
        style: 'vibrant'
    },

    // ==================== MINECRAFT CHARACTERS ====================
    creeper: {
        name: 'Creeper',
        keywords: ['creeper', 'ssss', 'minecraft creeper'],
        colors: {
            body: 'green_concrete',
            body_dark: 'green_terracotta',
            face: 'black_concrete',
            feet: 'gray_concrete'
        },
        style: 'blocky',
        tips: [
            'Keep it blocky - this is Minecraft native!',
            'Face pattern: black pixels for eyes and mouth',
            'Body should be green with darker green shading'
        ]
    },

    steve: {
        name: 'Steve',
        keywords: ['steve', 'minecraft steve', 'minecraft player'],
        colors: {
            skin: 'orange_terracotta',
            hair: 'brown_concrete',
            eyes: 'blue_concrete',
            shirt: 'cyan_concrete',
            pants: 'blue_terracotta',
            shoes: 'gray_concrete'
        },
        style: 'blocky'
    },

    enderman: {
        name: 'Enderman',
        keywords: ['enderman', 'ender man', 'tall black'],
        colors: {
            body: 'black_concrete',
            eyes: 'magenta_concrete',
            particles: 'purple_concrete'
        },
        style: 'tall_thin'
    },

    // ==================== OTHER GAMING CHARACTERS ====================
    sonic: {
        name: 'Sonic',
        keywords: ['sonic', 'sonic the hedgehog', 'blue hedgehog'],
        colors: {
            body: 'blue_concrete',
            belly: 'orange_terracotta',
            eyes: 'green_concrete',
            eye_white: 'white_concrete',
            shoes: 'red_concrete',
            shoe_stripe: 'white_concrete',
            gloves: 'white_concrete'
        },
        style: 'dynamic'
    },

    kirby: {
        name: 'Kirby',
        keywords: ['kirby', 'pink puff'],
        colors: {
            body: 'pink_concrete',
            feet: 'red_concrete',
            cheeks: 'magenta_concrete',
            eyes: 'blue_concrete',
            eye_white: 'white_concrete'
        },
        style: 'rounded'
    },

    // ==================== FANTASY CREATURES ====================
    dragon: {
        name: 'Dragon (Generic)',
        keywords: ['dragon', 'drake', 'wyvern', 'wyrm'],
        colors: {
            body: 'red_terracotta',
            scales: 'red_concrete',
            belly: 'orange_terracotta',
            wings: 'red_terracotta',
            eyes: 'yellow_concrete',
            horns: 'gray_concrete',
            claws: 'gray_concrete',
            fire: ['red_concrete', 'orange_concrete', 'yellow_concrete']
        },
        style: 'organic',
        tips: [
            'Use terracotta for shading on body',
            'Wings should have visible membrane texture',
            'Fire gradient from red to yellow'
        ]
    },

    phoenix: {
        name: 'Phoenix',
        keywords: ['phoenix', 'fire bird', 'firebird'],
        colors: {
            body: 'orange_concrete',
            wings: 'red_concrete',
            wing_tips: 'yellow_concrete',
            tail: ['red_concrete', 'orange_concrete', 'yellow_concrete'],
            eyes: 'white_concrete',
            beak: 'gold_block'
        },
        style: 'dynamic'
    },

    unicorn: {
        name: 'Unicorn',
        keywords: ['unicorn', 'alicorn'],
        colors: {
            body: 'white_concrete',
            mane: 'pink_concrete',
            horn: 'gold_block',
            hooves: 'light_gray_concrete',
            eyes: 'blue_concrete'
        },
        style: 'elegant'
    }
};

/**
 * Detect if the prompt mentions a known character
 * @param {string} prompt - User's build request
 * @returns {Object|null} - Character data if found, null otherwise
 */
export function detectCharacter(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    for (const [id, character] of Object.entries(ICONIC_CHARACTERS)) {
        for (const keyword of character.keywords) {
            if (lowerPrompt.includes(keyword)) {
                return {
                    id,
                    ...character
                };
            }
        }
    }

    return null;
}

/**
 * Get color palette instructions for LLM prompt
 * @param {Object} character - Detected character object
 * @returns {string} - Formatted palette instructions
 */
export function getCharacterPalettePrompt(character) {
    if (!character) return '';

    const colorLines = Object.entries(character.colors)
        .map(([part, block]) => {
            if (Array.isArray(block)) {
                return `  - ${part}: gradient using ${block.join(' → ')}`;
            }
            return `  - ${part}: ${block}`;
        })
        .join('\n');

    const tips = character.tips
        ? character.tips.map(t => `  • ${t}`).join('\n')
        : '';

    return `
=== CHARACTER DETECTED: ${character.name.toUpperCase()} ===
This is an iconic character! Use this MANDATORY color palette:

${colorLines}

Style: ${character.style || 'standard'}
${tips ? `\nDesign Tips:\n${tips}` : ''}

IMPORTANT: Do NOT deviate from this palette. These colors are canonical.
`;
}

/**
 * Get block for a specific character part
 * @param {string} characterId - Character ID (e.g., 'pikachu')
 * @param {string} part - Part name (e.g., 'body', 'eyes')
 * @returns {string|null} - Block name or null
 */
export function getCharacterBlock(characterId, part) {
    const character = ICONIC_CHARACTERS[characterId];
    if (!character || !character.colors[part]) return null;

    const block = character.colors[part];
    return Array.isArray(block) ? block[0] : block;
}

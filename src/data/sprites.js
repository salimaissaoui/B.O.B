/**
 * Sprite Reference Database
 * Pre-built pixel art templates for consistent, verified output
 * These serve as "ground truth" references for the LLM
 */

// Common color palettes
const PALETTES = {
    charizard: {
        '.': 'air',
        '#': 'black_wool',
        'O': 'orange_wool',
        'Y': 'yellow_wool',
        'W': 'white_wool',
        'B': 'blue_wool',
        'R': 'red_wool'
    },
    pikachu: {
        '.': 'air',
        '#': 'black_wool',
        'Y': 'yellow_wool',
        'R': 'red_wool',
        'W': 'white_wool',
        'B': 'brown_wool'
    },
    creeper: {
        '.': 'air',
        '#': 'black_wool',
        'G': 'green_wool',
        'L': 'lime_wool'
    },
    heart: {
        '.': 'air',
        '#': 'black_wool',
        'R': 'red_wool',
        'P': 'pink_wool'
    }
};

// Pre-built sprite templates (16x16 or smaller for reliability)
const SPRITES = {
    charizard: {
        width: 16,
        height: 16,
        legend: PALETTES.charizard,
        grid: [
            '....##.....##...',
            '...#OO#...#OO#..',
            '..#OOOO###OOOO#.',
            '.#OOOOOOOOOOOO#.',
            '#OOOOOOOOOOOOOO#',
            '#OOO#OO##OO#OOO#',
            '#OOOWOO##OOWOO#.',
            '.#OOOOOOOOOOOO#.',
            '..#OOOOOOOOOO#..',
            '..#OO#OOOO#OO#..',
            '.#OOO#OOOO#OOO#.',
            '#YYYY#OOOO#YYYY#',
            '.#YY#.#OO#.#YY#.',
            '..##...##...##..',
            '......#OO#......',
            '.......##.......',
        ]
    },
    pikachu: {
        width: 16,
        height: 16,
        legend: PALETTES.pikachu,
        grid: [
            '..#............#',
            '.#Y#..........#Y',
            '#YY#..........#Y',
            '#YY#..YYYY..#YY#',
            '.#Y#.YYYYYY.#Y#.',
            '....YYYYYYYY....',
            '...YYY#YY#YY....',
            '...YYYYYYYYYYY..',
            '..YYRYYYYYRYYY..',
            '..YYYYYYYYYY....',
            '...YYYY##YYY....',
            '....YYYYYY......',
            '.....YYYY.......',
            '......YY........',
            '................',
            '................',
        ]
    },
    creeper: {
        width: 8,
        height: 8,
        legend: PALETTES.creeper,
        grid: [
            'GGGGGGGG',
            'G##GG##G',
            'G##GG##G',
            'GGGG##GG',
            'GG####GG',
            'GG#GG#GG',
            'GG#GG#GG',
            'GGGGGGGG',
        ]
    },
    heart: {
        width: 9,
        height: 8,
        legend: PALETTES.heart,
        grid: [
            '.##...##.',
            '#RR#.#RR#',
            '#RRRRRRR#',
            '#RRRRRRR#',
            '.#RRRRR#.',
            '..#RRR#..',
            '...#R#...',
            '....#....',
        ]
    }
};

/**
 * Get a pre-built sprite template by name
 * @param {string} name - Sprite name (fuzzy matched)
 * @returns {Object|null} - Sprite template or null
 */
export function getSprite(name) {
    const normalized = name.toLowerCase().trim();

    // Exact match
    if (SPRITES[normalized]) {
        return SPRITES[normalized];
    }

    // Fuzzy match
    for (const [key, sprite] of Object.entries(SPRITES)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return sprite;
        }
    }

    return null;
}

/**
 * List all available sprites
 */
export function listSprites() {
    return Object.keys(SPRITES);
}

/**
 * Check if a sprite exists
 */
export function hasSprite(name) {
    return getSprite(name) !== null;
}

export { SPRITES, PALETTES };

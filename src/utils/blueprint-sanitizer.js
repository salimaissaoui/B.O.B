import { ALL_BLOCKS, suggestAlternatives, getPixelArtBlock } from '../config/blocks.js';

/**
 * Blueprint Sanitizer
 * 
 * Responsibilities:
 * 1. Validate and fix block names (typo correction)
 * 2. Sort build steps for structural integrity (bottom-up)
 * 3. Ensure consistent data types
 * 4. Upgrade blocks to premium alternatives (wool → concrete)
 */

/**
 * Premium block upgrades for pixel art
 * Wool → Concrete for smoother, more vibrant look
 */
const PREMIUM_UPGRADES = {
    // Wool → Concrete (smoother, more vibrant)
    'white_wool': 'white_concrete',
    'orange_wool': 'orange_concrete',
    'magenta_wool': 'magenta_concrete',
    'light_blue_wool': 'light_blue_concrete',
    'yellow_wool': 'yellow_concrete',
    'lime_wool': 'lime_concrete',
    'pink_wool': 'pink_concrete',
    'gray_wool': 'gray_concrete',
    'light_gray_wool': 'light_gray_concrete',
    'cyan_wool': 'cyan_concrete',
    'purple_wool': 'purple_concrete',
    'blue_wool': 'blue_concrete',
    'brown_wool': 'brown_concrete',
    'green_wool': 'green_concrete',
    'red_wool': 'red_concrete',
    'black_wool': 'black_concrete',

    // Dull blocks → Better alternatives for pixel art
    'dirt': 'brown_concrete',
    'coarse_dirt': 'brown_terracotta',
    'gravel': 'gray_concrete',
    'cobblestone': 'gray_concrete',
    'stone': 'gray_concrete'
};

export class BlueprintSanitizer {
    constructor() {
        this.fixedCount = 0;
    }

    /**
     * sanitize a blueprint in-place
     * @param {Object} blueprint 
     * @returns {Object} The sanitized blueprint
     */
    sanitize(blueprint) {
        this.fixedCount = 0;
        console.log('Sanitizing blueprint...');

        // 1. Sanitize Palette & Steps
        if (blueprint.steps) {
            this.sanitizeSteps(blueprint.steps);
        }

        // 2. Sort Steps (Bottom-Up)
        if (blueprint.steps) {
            blueprint.steps = this.sortSteps(blueprint.steps);
        }

        if (this.fixedCount > 0) {
            console.log(`✓ Sanitizer fixed ${this.fixedCount} issues`);
        }

        return blueprint;
    }

    sanitizeSteps(steps) {
        for (const step of steps) {
            // Special handling for pixel art
            if (step.op === 'pixel_art') {
                this.sanitizePixelArt(step);
                continue;
            }

            // Sanitize 'block' property
            if (step.block) {
                step.block = this.validateBlock(step.block);
            }
        }
    }

    /**
     * Sanitize pixel art legends and grids
     */
    sanitizePixelArt(step) {
        if (!step.grid) return;

        // 1. Sanitize Legend
        if (step.legend) {
            for (const key of Object.keys(step.legend)) {
                const original = step.legend[key];
                // Use getPixelArtBlock for legend values if they look like colors
                step.legend[key] = this.validateBlock(original, true);
            }
        }

        // 2. Sanitize Grid (if it contains direct block names/colors)
        if (step.grid && Array.isArray(step.grid)) {
            for (let r = 0; r < step.grid.length; r++) {
                if (!Array.isArray(step.grid[r])) continue;
                for (let c = 0; c < step.grid[r].length; c++) {
                    const raw = step.grid[r][c];
                    if (!raw || raw === '.' || (step.legend && step.legend[raw])) continue;

                    // If not in legend and not empty, it's a direct block/color
                    const fixed = this.validateBlock(raw, true);
                    if (fixed !== raw) {
                        step.grid[r][c] = fixed;
                    }
                }
            }
        }
    }

    validateBlock(blockName, isPixelArt = false) {
        if (!blockName || blockName === 'air') return blockName;

        // Remove namespace if present
        const cleanName = blockName.replace(/^minecraft:/, '');

        // Check if valid
        if (ALL_BLOCKS.includes(cleanName)) {
            // For pixel art, apply PREMIUM_UPGRADES (wool → concrete, etc.)
            if (isPixelArt && PREMIUM_UPGRADES[cleanName]) {
                const upgraded = PREMIUM_UPGRADES[cleanName];
                console.log(`  ✨ Premium upgrade: ${cleanName} → ${upgraded}`);
                this.fixedCount++;
                return upgraded;
            }
            return cleanName;
        }

        // Attempt fix using Pixel Art logic first if applicable
        if (isPixelArt) {
            const pixelFixed = getPixelArtBlock(cleanName);
            if (pixelFixed !== 'white_concrete' || cleanName.toLowerCase().includes('white')) {
                console.log(`  🎨 Style-fixed block: ${cleanName} -> ${pixelFixed}`);
                this.fixedCount++;
                return pixelFixed;
            }
        }

        // Attempt general fuzzy fix
        const alternatives = suggestAlternatives(cleanName);
        if (alternatives && alternatives.length > 0) {
            const fixed = alternatives[0];
            console.log(`  ⚠ Auto-fixed block: ${cleanName} -> ${fixed}`);
            this.fixedCount++;
            return fixed;
        }

        // Fallback to stone if completely unknown
        console.warn(`  ⚠ Unknown block '${cleanName}', falling back to stone`);
        this.fixedCount++;
        return 'stone';
    }

    sortSteps(steps) {
        // We want to sort primarily by Y level (ascending) so we build from ground up
        return steps.sort((a, b) => {
            const yA = this.getStepY(a);
            const yB = this.getStepY(b);

            // If both have Y coordinates, sort by Y
            if (yA !== null && yB !== null) {
                return yA - yB;
            }
            return 0; // Keep original order if no Y comparison possible
        });
    }

    getStepY(step) {
        if (step.pos) return step.pos.y;
        if (step.from) return Math.min(step.from.y, step.to ? step.to.y : step.from.y);
        if (step.base) return step.base.y; // for pixel art
        return null;
    }
}

export const sanitizer = new BlueprintSanitizer();

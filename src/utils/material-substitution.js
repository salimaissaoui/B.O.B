/**
 * Material Substitution
 *
 * Handles material substitution in blueprints for quick material changes.
 * Supports wood type swaps, color changes, and palette-based substitution.
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "Material Substitution"
 */

/**
 * Material families for related block substitution
 */
export const MATERIAL_FAMILIES = {
    wood: ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'bamboo', 'crimson', 'warped'],
    stone: ['stone', 'cobblestone', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'smooth_stone', 'andesite', 'diorite', 'granite', 'deepslate', 'tuff'],
    colored: ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'],
    metal: ['iron', 'gold', 'copper', 'netherite'],
    nether: ['nether_bricks', 'red_nether_bricks', 'blackstone', 'basalt', 'soul_soil'],
    prismarine: ['prismarine', 'prismarine_bricks', 'dark_prismarine'],
    sandstone: ['sandstone', 'red_sandstone', 'smooth_sandstone', 'cut_sandstone'],
    quartz: ['quartz', 'smooth_quartz', 'quartz_bricks', 'chiseled_quartz']
};

/**
 * Block suffixes that can follow material names
 */
const BLOCK_SUFFIXES = [
    '_planks', '_log', '_wood', '_stairs', '_slab', '_fence', '_fence_gate',
    '_door', '_trapdoor', '_button', '_pressure_plate', '_sign', '_wall_sign',
    '_hanging_sign', '_boat', '_chest_boat', '_leaves', '_sapling',
    '_bricks', '_wall', '_block', '_wool', '_carpet', '_terracotta',
    '_glazed_terracotta', '_concrete', '_concrete_powder', '_stained_glass',
    '_stained_glass_pane', '_shulker_box', '_bed', '_banner', '_candle'
];

/**
 * Get the material family for a block name
 * @param {string} blockName - Block name to analyze
 * @returns {string|null} Family name or null
 */
export function getMaterialFamily(blockName) {
    const lowerName = blockName.toLowerCase();

    for (const [family, members] of Object.entries(MATERIAL_FAMILIES)) {
        for (const member of members) {
            if (lowerName.includes(member)) {
                return family;
            }
        }
    }

    return null;
}

/**
 * Get related materials for a block (same suffix, different material)
 * @param {string} blockName - Block name
 * @returns {string[]} Array of related block names
 */
export function getRelatedMaterials(blockName) {
    const lowerName = blockName.toLowerCase();
    const related = [];

    // Find which suffix this block uses
    let foundSuffix = null;
    let foundMaterial = null;
    let foundFamily = null;

    for (const [family, members] of Object.entries(MATERIAL_FAMILIES)) {
        for (const member of members) {
            for (const suffix of BLOCK_SUFFIXES) {
                if (lowerName === member + suffix || lowerName === member) {
                    foundSuffix = suffix || '';
                    foundMaterial = member;
                    foundFamily = family;
                    break;
                }
            }
            if (foundMaterial) break;
        }
        if (foundMaterial) break;
    }

    if (!foundFamily) return [];

    // Generate related blocks
    for (const member of MATERIAL_FAMILIES[foundFamily]) {
        if (member !== foundMaterial) {
            related.push(member + foundSuffix);
        }
    }

    return related;
}

/**
 * Substitute material in a block name
 * @param {string} blockName - Original block name
 * @param {string} fromMaterial - Material to replace
 * @param {string} toMaterial - Replacement material
 * @returns {string} Substituted block name
 */
export function substituteBlock(blockName, fromMaterial, toMaterial) {
    const lowerBlock = blockName.toLowerCase();
    const lowerFrom = fromMaterial.toLowerCase();
    const lowerTo = toMaterial.toLowerCase();

    // Direct match replacement
    if (lowerBlock === lowerFrom) {
        return toMaterial;
    }

    // Check if block contains the source material
    if (lowerBlock.includes(lowerFrom)) {
        return blockName.replace(new RegExp(fromMaterial, 'gi'), toMaterial);
    }

    return blockName;
}

/**
 * Substitute materials throughout a blueprint
 * @param {Object} blueprint - Blueprint object
 * @param {string} fromMaterial - Material to replace
 * @param {string} toMaterial - Replacement material
 * @returns {Object} New blueprint with substitutions
 */
export function substituteBlueprint(blueprint, fromMaterial, toMaterial) {
    // Deep clone the blueprint
    const result = JSON.parse(JSON.stringify(blueprint));

    if (!result.operations) {
        return result;
    }

    // Process each operation
    for (const op of result.operations) {
        // Check all properties that might contain block names
        for (const key of Object.keys(op)) {
            if (typeof op[key] === 'string' && key.toLowerCase().includes('block')) {
                op[key] = substituteBlock(op[key], fromMaterial, toMaterial);
            }
        }
    }

    return result;
}

/**
 * Parse a material substitution command from natural language
 * @param {string} command - User command
 * @returns {Object|null} Parsed substitution {from, to} or null
 */
export function parseMaterialCommand(command) {
    const normalized = command.toLowerCase().trim().replace(/\s+/g, ' ');

    // Pattern: "use X instead of Y"
    let match = normalized.match(/use\s+(\S+)\s+instead\s+of\s+(\S+)/);
    if (match) {
        return { from: match[2], to: match[1] };
    }

    // Pattern: "replace X with Y"
    match = normalized.match(/replace\s+(\S+)\s+with\s+(\S+)/);
    if (match) {
        return { from: match[1], to: match[2] };
    }

    // Pattern: "change X to Y"
    match = normalized.match(/change\s+(\S+)\s+to\s+(\S+)/);
    if (match) {
        return { from: match[1], to: match[2] };
    }

    // Pattern: "swap X for Y"
    match = normalized.match(/swap\s+(\S+)\s+for\s+(\S+)/);
    if (match) {
        return { from: match[1], to: match[2] };
    }

    return null;
}

/**
 * Material Substitutor class for managing substitutions
 */
export class MaterialSubstitutor {
    constructor() {
        this.substitutions = new Map();
        this.palette = {};
        this.stats = {
            substitutionsMade: 0
        };
    }

    /**
     * Add a material substitution rule
     * @param {string} from - Source material
     * @param {string} to - Target material
     */
    addSubstitution(from, to) {
        this.substitutions.set(from.toLowerCase(), to.toLowerCase());
    }

    /**
     * Set a material palette
     * @param {Object} palette - Palette with primary, accent, etc.
     */
    setPalette(palette) {
        this.palette = palette;
    }

    /**
     * Apply substitutions to a block name
     * @param {string} blockName - Block name to substitute
     * @returns {string} Substituted block name
     */
    apply(blockName) {
        let result = blockName;

        // First resolve palette placeholders
        if (result.startsWith('$')) {
            for (const [key, value] of Object.entries(this.palette)) {
                const placeholder = `$${key}`;
                if (result === placeholder) {
                    result = value;
                    this.stats.substitutionsMade++;
                    break;
                } else if (result.startsWith(placeholder)) {
                    result = result.replace(placeholder, value);
                    this.stats.substitutionsMade++;
                    break;
                }
            }
        }

        // Then apply material substitutions
        for (const [from, to] of this.substitutions) {
            const original = result;
            result = substituteBlock(result, from, to);
            if (result !== original) {
                this.stats.substitutionsMade++;
            }
        }

        return result;
    }

    /**
     * Apply substitutions to an entire blueprint
     * @param {Object} blueprint - Blueprint to transform
     * @returns {Object} Transformed blueprint
     */
    applyToBlueprint(blueprint) {
        const result = JSON.parse(JSON.stringify(blueprint));

        if (!result.operations) {
            return result;
        }

        for (const op of result.operations) {
            for (const key of Object.keys(op)) {
                if (typeof op[key] === 'string') {
                    // Check if this looks like a block name
                    const lowerKey = key.toLowerCase();
                    if (lowerKey === 'block' || lowerKey.endsWith('block')) {
                        op[key] = this.apply(op[key]);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Get substitution statistics
     * @returns {Object} Stats
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = { substitutionsMade: 0 };
    }

    /**
     * Clear all substitutions
     */
    clear() {
        this.substitutions.clear();
        this.palette = {};
        this.resetStats();
    }
}

export default MaterialSubstitutor;

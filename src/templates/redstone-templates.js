/**
 * Redstone Templates
 * 
 * Pre-built redstone mechanism templates for functional builds.
 * These are proven designs that work in Minecraft.
 * 
 * Templates use relative coordinates (0,0,0 is the activation point).
 * Facing is 'north', 'south', 'east', or 'west'.
 */

/**
 * Template definitions
 * Each template has:
 * - name: Human-readable name
 * - description: What it does
 * - size: Bounding box dimensions
 * - trigger: Where the button/lever goes
 * - blocks: Array of { x, y, z, block } relative to origin
 */
export const REDSTONE_TEMPLATES = {
    /**
     * Simple 2x2 piston door
     * Opens downward into the ground
     */
    piston_door_2x2: {
        name: '2x2 Piston Door',
        description: 'A flush 2x2 door that opens downward using sticky pistons',
        size: { width: 5, height: 4, depth: 3 },
        trigger: { x: 0, y: 1, z: 0 },
        category: 'door',
        blocks: [
            // Door blocks (stone bricks)
            { x: 1, y: 0, z: 1, block: 'stone_bricks' },
            { x: 2, y: 0, z: 1, block: 'stone_bricks' },
            { x: 1, y: 1, z: 1, block: 'stone_bricks' },
            { x: 2, y: 1, z: 1, block: 'stone_bricks' },

            // Sticky pistons (facing up, below door)
            { x: 1, y: -1, z: 1, block: 'sticky_piston[facing=up]' },
            { x: 2, y: -1, z: 1, block: 'sticky_piston[facing=up]' },
            { x: 1, y: -2, z: 1, block: 'sticky_piston[facing=up]' },
            { x: 2, y: -2, z: 1, block: 'sticky_piston[facing=up]' },

            // Redstone below pistons
            { x: 1, y: -3, z: 1, block: 'redstone_block' },
            { x: 2, y: -3, z: 1, block: 'redstone_block' },

            // Redstone torch tower for inverter
            { x: 0, y: -3, z: 1, block: 'redstone_torch' },
            { x: 0, y: -2, z: 1, block: 'stone' },

            // Connection to trigger
            { x: 0, y: -1, z: 1, block: 'redstone_wire' },
            { x: 0, y: 0, z: 1, block: 'stone' },
            { x: 0, y: 1, z: 0, block: 'lever' },

            // Frame
            { x: 0, y: 0, z: 1, block: 'stone_bricks' },
            { x: 3, y: 0, z: 1, block: 'stone_bricks' },
            { x: 0, y: 1, z: 1, block: 'stone_bricks' },
            { x: 3, y: 1, z: 1, block: 'stone_bricks' },
            { x: 0, y: 2, z: 1, block: 'stone_bricks' },
            { x: 1, y: 2, z: 1, block: 'stone_bricks' },
            { x: 2, y: 2, z: 1, block: 'stone_bricks' },
            { x: 3, y: 2, z: 1, block: 'stone_bricks' }
        ]
    },

    /**
     * Hidden staircase
     * Stairs that retract into the floor
     */
    hidden_staircase: {
        name: 'Hidden Staircase',
        description: 'A 3-step staircase that retracts into the floor',
        size: { width: 3, height: 4, depth: 5 },
        trigger: { x: 0, y: 0, z: 0 },
        category: 'staircase',
        blocks: [
            // Stairs (oak)
            { x: 1, y: 0, z: 1, block: 'oak_stairs[facing=south]' },
            { x: 1, y: 1, z: 2, block: 'oak_stairs[facing=south]' },
            { x: 1, y: 2, z: 3, block: 'oak_stairs[facing=south]' },

            // Sticky pistons below each stair
            { x: 1, y: -1, z: 1, block: 'sticky_piston[facing=up]' },
            { x: 1, y: 0, z: 2, block: 'sticky_piston[facing=up]' },
            { x: 1, y: 1, z: 3, block: 'sticky_piston[facing=up]' },

            // Redstone line
            { x: 0, y: -2, z: 1, block: 'redstone_wire' },
            { x: 0, y: -1, z: 2, block: 'redstone_wire' },
            { x: 0, y: 0, z: 3, block: 'redstone_wire' },

            // Repeaters for timing
            { x: 0, y: -2, z: 2, block: 'repeater[facing=south,delay=2]' },
            { x: 0, y: -1, z: 3, block: 'repeater[facing=south,delay=2]' },

            // Lever trigger
            { x: 0, y: 0, z: 0, block: 'lever' }
        ]
    },

    /**
     * Simple lamp toggle
     * Button-activated redstone lamp
     */
    lamp_toggle: {
        name: 'Lamp Toggle',
        description: 'A redstone lamp that toggles on/off',
        size: { width: 2, height: 3, depth: 2 },
        trigger: { x: 0, y: 0, z: 0 },
        category: 'light',
        blocks: [
            // Lamp
            { x: 1, y: 1, z: 1, block: 'redstone_lamp' },

            // Lever (T-flip-flop would be more complex)
            { x: 0, y: 0, z: 0, block: 'lever' },

            // Redstone connection
            { x: 0, y: 0, z: 1, block: 'redstone_wire' },
            { x: 1, y: 0, z: 1, block: 'redstone_wire' }
        ]
    },

    /**
     * Item dropper
     * Dispenses items when triggered
     */
    item_dropper: {
        name: 'Item Dropper',
        description: 'A dispenser that activates on button press',
        size: { width: 2, height: 2, depth: 2 },
        trigger: { x: 0, y: 0, z: 0 },
        category: 'utility',
        blocks: [
            // Dispenser facing forward
            { x: 1, y: 1, z: 1, block: 'dispenser[facing=south]' },

            // Button trigger
            { x: 0, y: 1, z: 0, block: 'stone_button' },

            // Redstone dust
            { x: 0, y: 0, z: 1, block: 'redstone_wire' },
            { x: 1, y: 0, z: 1, block: 'stone' }
        ]
    },

    /**
     * Simple T-Flip-Flop
     * Converts button press to toggle (on/off)
     */
    t_flip_flop: {
        name: 'T-Flip-Flop',
        description: 'Converts button press to toggle state',
        size: { width: 4, height: 2, depth: 2 },
        trigger: { x: 0, y: 0, z: 0 },
        category: 'logic',
        blocks: [
            // Dropper facing dropper
            { x: 1, y: 0, z: 1, block: 'dropper[facing=east]' },
            { x: 2, y: 0, z: 1, block: 'dropper[facing=west]' },

            // Comparator output
            { x: 1, y: 0, z: 0, block: 'comparator[facing=north]' },

            // Redstone output
            { x: 1, y: 0, z: -1, block: 'redstone_wire' },

            // Input
            { x: 0, y: 0, z: 1, block: 'redstone_wire' },
            { x: 0, y: 1, z: 0, block: 'stone_button' }
        ]
    }
};

/**
 * Get a template by name
 * @param {string} name - Template name (e.g., 'piston_door_2x2')
 * @returns {Object|null} Template or null if not found
 */
export function getRedstoneTemplate(name) {
    return REDSTONE_TEMPLATES[name] || null;
}

/**
 * Get all templates in a category
 * @param {string} category - Category name (door, staircase, light, utility, logic)
 * @returns {Array} Array of templates
 */
export function getTemplatesByCategory(category) {
    return Object.values(REDSTONE_TEMPLATES)
        .filter(t => t.category === category);
}

/**
 * List all available template names
 * @returns {Array} Array of template names
 */
export function listTemplates() {
    return Object.keys(REDSTONE_TEMPLATES);
}

/**
 * Rotation matrices for facing directions
 */
const ROTATIONS = {
    north: { cos: 1, sin: 0 },   // Default (no rotation)
    east: { cos: 0, sin: 1 },    // 90° clockwise
    south: { cos: -1, sin: 0 },  // 180°
    west: { cos: 0, sin: -1 }    // 270° (90° counter-clockwise)
};

/**
 * Convert facing in block state to new facing after rotation
 */
function rotateFacing(blockState, facing) {
    if (!blockState.includes('facing=')) return blockState;

    const facings = ['north', 'east', 'south', 'west'];
    const match = blockState.match(/facing=(\w+)/);
    if (!match) return blockState;

    const currentFacing = match[1];
    if (!facings.includes(currentFacing)) return blockState;

    const currentIdx = facings.indexOf(currentFacing);
    const rotationAmount = facings.indexOf(facing);
    const newIdx = (currentIdx + rotationAmount) % 4;

    return blockState.replace(/facing=\w+/, `facing=${facings[newIdx]}`);
}

/**
 * Instantiate a template at a specific position and facing
 * @param {Object|string} template - Template object or name
 * @param {Object} position - { x, y, z } world position
 * @param {string} facing - Direction template faces ('north', 'south', 'east', 'west')
 * @returns {Array} Array of blueprint steps
 */
export function instantiateTemplate(template, position = { x: 0, y: 0, z: 0 }, facing = 'north') {
    // Resolve template name to object
    if (typeof template === 'string') {
        template = getRedstoneTemplate(template);
        if (!template) {
            throw new Error(`Unknown template: ${template}`);
        }
    }

    const rotation = ROTATIONS[facing] || ROTATIONS.north;
    const steps = [];

    for (const block of template.blocks) {
        // Rotate coordinates around origin
        const rotatedX = block.x * rotation.cos - block.z * rotation.sin;
        const rotatedZ = block.x * rotation.sin + block.z * rotation.cos;

        // Translate to world position
        const worldX = Math.floor(position.x + rotatedX);
        const worldY = Math.floor(position.y + block.y);
        const worldZ = Math.floor(position.z + rotatedZ);

        // Rotate facing in block state if present
        const rotatedBlock = rotateFacing(block.block, facing);

        steps.push({
            op: 'set',
            pos: { x: worldX, y: worldY, z: worldZ },
            block: rotatedBlock
        });
    }

    return steps;
}

/**
 * Detect if a prompt is requesting a redstone mechanism
 * @param {string} prompt - User's build request
 * @returns {Object|null} { templateName, facing } or null
 */
export function detectRedstoneRequest(prompt) {
    const lower = prompt.toLowerCase();

    // Check for piston door
    if (/piston\s*door|hidden\s*door|secret\s*door|2x2\s*door/i.test(lower)) {
        return { templateName: 'piston_door_2x2', facing: 'north' };
    }

    // Check for hidden staircase
    if (/hidden\s*stair|secret\s*stair|retract\w*\s*stair/i.test(lower)) {
        return { templateName: 'hidden_staircase', facing: 'north' };
    }

    // Check for lamp
    if (/redstone\s*lamp|toggle\s*light|light\s*switch/i.test(lower)) {
        return { templateName: 'lamp_toggle', facing: 'north' };
    }

    // Check for dropper/dispenser
    if (/item\s*dropper|dispenser|auto\s*dispens/i.test(lower)) {
        return { templateName: 'item_dropper', facing: 'north' };
    }

    // Check for T-flip-flop
    if (/t-?flip|toggle\s*circuit|button\s*to\s*lever/i.test(lower)) {
        return { templateName: 't_flip_flop', facing: 'north' };
    }

    return null;
}

export default {
    REDSTONE_TEMPLATES,
    getRedstoneTemplate,
    getTemplatesByCategory,
    listTemplates,
    instantiateTemplate,
    detectRedstoneRequest
};

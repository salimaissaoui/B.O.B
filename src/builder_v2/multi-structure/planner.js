/**
 * Multi-Structure Planner
 *
 * Plans and coordinates multi-structure builds like villages.
 * Handles layout generation, spacing, and collision avoidance.
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "Multi-Structure Builds"
 */

/**
 * Structure templates with default sizes and parameters
 */
export const STRUCTURE_TEMPLATES = {
    house: {
        baseSize: 10,
        component: 'room',
        defaultParams: {
            width: 8,
            depth: 8,
            height: 5,
            hasRoof: true
        }
    },
    well: {
        baseSize: 5,
        component: 'cylinder',
        defaultParams: {
            radius: 2,
            height: 3,
            hollow: true
        }
    },
    tower: {
        baseSize: 8,
        component: 'lattice_tower',
        defaultParams: {
            radius: 3,
            height: 15,
            floors: 3
        }
    },
    farm: {
        baseSize: 12,
        component: 'platform',
        defaultParams: {
            width: 10,
            depth: 10,
            height: 1
        }
    },
    shop: {
        baseSize: 8,
        component: 'room',
        defaultParams: {
            width: 6,
            depth: 8,
            height: 4,
            hasRoof: true
        }
    },
    church: {
        baseSize: 14,
        component: 'room',
        defaultParams: {
            width: 10,
            depth: 16,
            height: 8,
            hasRoof: true
        }
    },
    barn: {
        baseSize: 16,
        component: 'room',
        defaultParams: {
            width: 12,
            depth: 16,
            height: 6,
            hasRoof: true
        }
    },
    stable: {
        baseSize: 12,
        component: 'room',
        defaultParams: {
            width: 10,
            depth: 8,
            height: 4,
            hasRoof: true
        }
    },
    blacksmith: {
        baseSize: 10,
        component: 'room',
        defaultParams: {
            width: 8,
            depth: 10,
            height: 5,
            hasRoof: true
        }
    },
    watchtower: {
        baseSize: 6,
        component: 'lattice_tower',
        defaultParams: {
            radius: 2,
            height: 20,
            floors: 4
        }
    }
};

/**
 * Calculate bounding box from primitives array
 * @param {Object[]} primitives - Array of primitives with pos property
 * @returns {Object} Bounding box with min, max, width, height, depth
 */
export function calculateBoundingBox(primitives) {
    if (!primitives || primitives.length === 0) {
        return {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 0, y: 0, z: 0 },
            width: 0,
            height: 0,
            depth: 0
        };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const prim of primitives) {
        if (prim.pos) {
            minX = Math.min(minX, prim.pos.x);
            minY = Math.min(minY, prim.pos.y);
            minZ = Math.min(minZ, prim.pos.z);
            maxX = Math.max(maxX, prim.pos.x);
            maxY = Math.max(maxY, prim.pos.y);
            maxZ = Math.max(maxZ, prim.pos.z);
        }
    }

    return {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        depth: maxZ - minZ + 1
    };
}

/**
 * Check if two bounding boxes overlap (XZ plane only)
 * @param {Object} box1 - First bounding box
 * @param {Object} box2 - Second bounding box
 * @param {number} spacing - Minimum spacing between boxes (default: 0)
 * @returns {boolean} True if boxes overlap
 */
export function checkOverlap(box1, box2, spacing = 0) {
    const xOverlap = box1.min.x - spacing <= box2.max.x && box1.max.x + spacing >= box2.min.x;
    const zOverlap = box1.min.z - spacing <= box2.max.z && box1.max.z + spacing >= box2.min.z;
    return xOverlap && zOverlap;
}

/**
 * Structure Layout class to track and manage multi-structure builds
 */
export class StructureLayout {
    constructor(center) {
        this.center = center;
        this.structures = [];
    }

    /**
     * Add a structure to the layout
     * @param {Object} structure - Structure definition
     */
    addStructure(structure) {
        this.structures.push(structure);
    }

    /**
     * Get total estimated block count
     * @returns {number} Total blocks
     */
    getTotalBlocks() {
        return this.structures.reduce((sum, s) => sum + (s.estimatedBlocks || 0), 0);
    }

    /**
     * Get overall bounding box of all structures
     * @returns {Object} Combined bounding box
     */
    getTotalBounds() {
        if (this.structures.length === 0) {
            return {
                min: { x: 0, y: 0, z: 0 },
                max: { x: 0, y: 0, z: 0 }
            };
        }

        let minX = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxZ = -Infinity;

        for (const structure of this.structures) {
            const pos = structure.position;
            const bounds = structure.bounds || { width: 10, depth: 10 };

            minX = Math.min(minX, pos.x);
            minZ = Math.min(minZ, pos.z);
            maxX = Math.max(maxX, pos.x + bounds.width);
            maxZ = Math.max(maxZ, pos.z + bounds.depth);
        }

        return {
            min: { x: minX, y: this.center.y, z: minZ },
            max: { x: maxX, y: this.center.y, z: maxZ }
        };
    }

    /**
     * Export layout to execution plan
     * @returns {Object} Execution plan
     */
    toExecutionPlan() {
        return {
            center: this.center,
            structures: this.structures.map(s => ({
                type: s.type,
                position: s.position,
                params: s.params || STRUCTURE_TEMPLATES[s.type]?.defaultParams || {}
            })),
            totalBlocks: this.getTotalBlocks(),
            bounds: this.getTotalBounds()
        };
    }
}

/**
 * Multi-Structure Planner
 * Plans layouts for multi-structure builds
 */
export class MultiStructurePlanner {
    constructor(options = {}) {
        this.defaultSpacing = options.defaultSpacing || 5;
        this.maxAttempts = options.maxAttempts || 100;
    }

    /**
     * Create a layout for multiple structures
     * @param {Object} options - Layout options
     * @returns {StructureLayout} Planned layout
     */
    createLayout(options) {
        const {
            center,
            structures,
            spacing = this.defaultSpacing,
            pattern = 'organic',
            maxRadius = 100,
            radius = 30
        } = options;

        const layout = new StructureLayout(center);

        switch (pattern) {
            case 'grid':
                this._placeGrid(layout, structures, center, spacing);
                break;
            case 'radial':
                this._placeRadial(layout, structures, center, radius);
                break;
            case 'organic':
            default:
                this._placeOrganic(layout, structures, center, spacing, maxRadius);
                break;
        }

        return layout;
    }

    /**
     * Place structures in a grid pattern
     */
    _placeGrid(layout, structures, center, spacing) {
        const count = structures.length;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);

        let idx = 0;
        for (let row = 0; row < rows && idx < count; row++) {
            for (let col = 0; col < cols && idx < count; col++) {
                const structure = structures[idx];
                const template = STRUCTURE_TEMPLATES[structure.type] || { baseSize: 10 };
                const size = template.baseSize;

                const x = center.x + (col - (cols - 1) / 2) * (size + spacing);
                const z = center.z + (row - (rows - 1) / 2) * (size + spacing);

                layout.addStructure({
                    type: structure.type,
                    position: { x, y: center.y, z },
                    params: structure.params || template.defaultParams,
                    bounds: { width: size, depth: size },
                    estimatedBlocks: size * size * 5
                });

                idx++;
            }
        }
    }

    /**
     * Place structures in a radial pattern
     */
    _placeRadial(layout, structures, center, radius) {
        const count = structures.length;
        const angleStep = (2 * Math.PI) / count;

        for (let i = 0; i < count; i++) {
            const structure = structures[i];
            const template = STRUCTURE_TEMPLATES[structure.type] || { baseSize: 10 };
            const angle = i * angleStep;

            const x = center.x + Math.cos(angle) * radius;
            const z = center.z + Math.sin(angle) * radius;

            layout.addStructure({
                type: structure.type,
                position: { x: Math.round(x), y: center.y, z: Math.round(z) },
                params: structure.params || template.defaultParams,
                bounds: { width: template.baseSize, depth: template.baseSize },
                estimatedBlocks: template.baseSize * template.baseSize * 5
            });
        }
    }

    /**
     * Place structures organically (clustered with randomness)
     */
    _placeOrganic(layout, structures, center, spacing, maxRadius) {
        const placed = [];

        for (let i = 0; i < structures.length; i++) {
            const structure = structures[i];
            const template = STRUCTURE_TEMPLATES[structure.type] || { baseSize: 10 };
            const size = template.baseSize;

            let position = null;
            let attempts = 0;

            while (!position && attempts < this.maxAttempts) {
                attempts++;

                // Generate candidate position
                let x, z;
                if (i === 0) {
                    // First structure at center
                    x = center.x;
                    z = center.z;
                } else {
                    // Random offset from center, weighted towards inner area
                    const distance = Math.random() * maxRadius * 0.8;
                    const angle = Math.random() * 2 * Math.PI;
                    x = center.x + Math.cos(angle) * distance;
                    z = center.z + Math.sin(angle) * distance;
                }

                // Check for collisions with placed structures
                const candidate = {
                    min: { x: x - size / 2, z: z - size / 2 },
                    max: { x: x + size / 2, z: z + size / 2 }
                };

                let valid = true;
                for (const p of placed) {
                    if (checkOverlap(candidate, p.bounds, spacing)) {
                        valid = false;
                        break;
                    }
                }

                if (valid) {
                    position = { x: Math.round(x), y: center.y, z: Math.round(z) };
                }
            }

            // Fallback: place at offset if no valid position found
            if (!position) {
                const offset = i * (size + spacing);
                position = { x: center.x + offset, y: center.y, z: center.z };
            }

            const bounds = {
                min: { x: position.x - size / 2, z: position.z - size / 2 },
                max: { x: position.x + size / 2, z: position.z + size / 2 }
            };

            placed.push({ bounds });

            layout.addStructure({
                type: structure.type,
                position,
                params: structure.params || template.defaultParams,
                bounds: { width: size, depth: size },
                estimatedBlocks: size * size * 5
            });
        }
    }
}

/**
 * Village composition based on size
 */
const VILLAGE_COMPOSITIONS = {
    small: {
        minStructures: 3,
        maxStructures: 5,
        types: ['house', 'house', 'house', 'well', 'farm']
    },
    medium: {
        minStructures: 6,
        maxStructures: 12,
        types: ['house', 'house', 'house', 'house', 'well', 'farm', 'farm', 'shop', 'church', 'blacksmith', 'stable', 'barn']
    },
    large: {
        minStructures: 13,
        maxStructures: 20,
        types: [
            'house', 'house', 'house', 'house', 'house', 'house',
            'well', 'farm', 'farm', 'farm',
            'shop', 'shop', 'church', 'blacksmith', 'stable', 'barn',
            'watchtower', 'watchtower', 'tower', 'tower'
        ]
    }
};

/**
 * Generate a village layout
 * @param {Object} options - Village options
 * @returns {StructureLayout} Village layout
 */
export function generateVillageLayout(options) {
    const {
        center,
        size = 'small',
        centralStructure = 'well',
        spacing = 8,
        pattern = 'organic'
    } = options;

    const composition = VILLAGE_COMPOSITIONS[size] || VILLAGE_COMPOSITIONS.small;

    // Determine number of structures
    const count = composition.minStructures +
        Math.floor(Math.random() * (composition.maxStructures - composition.minStructures + 1));

    // Select structures from composition
    const structures = [];

    // Add central structure first
    if (centralStructure) {
        structures.push({ type: centralStructure, size: 'small' });
    }

    // Fill remaining with random selection from composition types
    const remainingCount = count - structures.length;
    const availableTypes = [...composition.types];

    for (let i = 0; i < remainingCount && availableTypes.length > 0; i++) {
        const idx = Math.floor(Math.random() * availableTypes.length);
        structures.push({ type: availableTypes[idx], size: 'small' });
        availableTypes.splice(idx, 1);
    }

    // Create layout using planner
    const planner = new MultiStructurePlanner();
    const maxRadius = size === 'large' ? 80 : size === 'medium' ? 50 : 30;

    return planner.createLayout({
        center,
        structures,
        spacing,
        pattern,
        maxRadius
    });
}

export default MultiStructurePlanner;

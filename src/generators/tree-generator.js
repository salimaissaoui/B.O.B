/**
 * Tree Generator
 * Creates procedural organic trees with trunks and spherical leaf clusters
 */

import { getBlock } from './utils.js';

export function generateTreeBlueprint(analysis) {
    const { hints } = analysis;
    const dims = hints.dimensions || { height: 15 };

    const trunkHeight = Math.max(5, dims.height || 15);
    const canopyRadius = Math.max(3, Math.floor(trunkHeight / 2.5));

    const palette = analysis.palette || hints.palette || {};

    const blocks = {
        log: getBlock(palette, 'log', 'oak_log'),
        leaves: getBlock(palette, 'leaves', 'oak_leaves')
    };

    const steps = [
        { op: 'site_prep' },

        // 1. Trunk
        {
            op: 'we_cylinder',
            base: { x: 0, y: 0, z: 0 },
            radius: Math.max(1, Math.floor(trunkHeight / 8)),
            height: trunkHeight,
            block: blocks.log,
            hollow: false
        },

        // 2. Main Canopy (overlapping spheres for organic look)
        {
            op: 'we_sphere',
            center: { x: 0, y: trunkHeight, z: 0 },
            radius: canopyRadius,
            block: blocks.leaves,
            hollow: false
        },
        // Top cluster
        {
            op: 'we_sphere',
            center: { x: 0, y: trunkHeight + Math.floor(canopyRadius / 2), z: 0 },
            radius: Math.max(2, canopyRadius - 1),
            block: blocks.leaves,
            hollow: false
        },
        // Side clusters
        {
            op: 'we_sphere',
            center: { x: canopyRadius - 1, y: trunkHeight - 2, z: 0 },
            radius: Math.max(2, canopyRadius - 2),
            block: blocks.leaves,
            hollow: false
        },
        {
            op: 'we_sphere',
            center: { x: -(canopyRadius - 1), y: trunkHeight - 2, z: 0 },
            radius: Math.max(2, canopyRadius - 2),
            block: blocks.leaves,
            hollow: false
        },
        {
            op: 'we_sphere',
            center: { x: 0, y: trunkHeight - 2, z: canopyRadius - 1 },
            radius: Math.max(2, canopyRadius - 2),
            block: blocks.leaves,
            hollow: false
        },
        {
            op: 'we_sphere',
            center: { x: 0, y: trunkHeight - 2, z: -(canopyRadius - 1) },
            radius: Math.max(2, canopyRadius - 2),
            block: blocks.leaves,
            hollow: false
        }
    ];

    return {
        buildType: 'tree',
        theme: analysis.theme?.theme || 'default',
        size: {
            width: canopyRadius * 2,
            height: trunkHeight + canopyRadius,
            depth: canopyRadius * 2
        },
        palette: blocks,
        steps,
        generationMethod: 'procedural_tree'
    };
}

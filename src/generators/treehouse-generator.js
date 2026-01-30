/**
 * Treehouse Generator
 * Creates a tree with a house/platform built into/around it
 */

import { getBlock } from './utils.js';

export function generateTreehouseBlueprint(analysis) {
    const { hints } = analysis;
    const isMassive = hints.size === 'massive' || hints.size === 'colossal' || hints.size === 'large';

    // Scale based on size modifier
    const scale = isMassive ? 3 : 1;
    const trunkHeight = Math.max(15, (hints.dimensions?.height || 20)) * scale;
    const trunkRadius = Math.max(2, Math.floor(trunkHeight / 10));
    const platformHeight = Math.floor(trunkHeight * 0.6); // Platform at 60% height
    const platformSize = Math.max(8, 12 * scale);
    const canopyRadius = Math.max(5, Math.floor(trunkHeight / 3));

    const palette = analysis.palette || hints.palette || {};

    const blocks = {
        log: getBlock(palette, 'log', 'oak_log'),
        leaves: getBlock(palette, 'leaves', 'oak_leaves'),
        planks: getBlock(palette, 'primary', 'oak_planks'),
        fence: getBlock(palette, 'fence', 'oak_fence'),
        stairs: getBlock(palette, 'stairs', 'oak_stairs'),
        lantern: 'lantern'
    };

    const steps = [
        { op: 'site_prep' },

        // ===== TREE TRUNK =====
        {
            op: 'we_cylinder',
            base: { x: 0, y: 0, z: 0 },
            radius: trunkRadius,
            height: trunkHeight,
            block: blocks.log,
            hollow: false
        },

        // ===== ROOT FLARE (wider base) =====
        {
            op: 'we_cylinder',
            base: { x: 0, y: 0, z: 0 },
            radius: trunkRadius + 2,
            height: 3,
            block: blocks.log,
            hollow: false
        },

        // ===== MAIN PLATFORM =====
        {
            op: 'we_fill',
            from: { x: trunkRadius + 1, y: platformHeight, z: trunkRadius + 1 },
            to: { x: trunkRadius + platformSize, y: platformHeight, z: trunkRadius + platformSize },
            block: blocks.planks
        },

        // ===== PLATFORM RAILING =====
        // Front rail
        {
            op: 'we_fill',
            from: { x: trunkRadius + 1, y: platformHeight + 1, z: trunkRadius + 1 },
            to: { x: trunkRadius + platformSize, y: platformHeight + 1, z: trunkRadius + 1 },
            block: blocks.fence
        },
        // Back rail
        {
            op: 'we_fill',
            from: { x: trunkRadius + 1, y: platformHeight + 1, z: trunkRadius + platformSize },
            to: { x: trunkRadius + platformSize, y: platformHeight + 1, z: trunkRadius + platformSize },
            block: blocks.fence
        },
        // Left rail
        {
            op: 'we_fill',
            from: { x: trunkRadius + 1, y: platformHeight + 1, z: trunkRadius + 2 },
            to: { x: trunkRadius + 1, y: platformHeight + 1, z: trunkRadius + platformSize - 1 },
            block: blocks.fence
        },
        // Right rail
        {
            op: 'we_fill',
            from: { x: trunkRadius + platformSize, y: platformHeight + 1, z: trunkRadius + 2 },
            to: { x: trunkRadius + platformSize, y: platformHeight + 1, z: trunkRadius + platformSize - 1 },
            block: blocks.fence
        },

        // ===== SMALL CABIN ON PLATFORM =====
        {
            op: 'we_walls',
            from: { x: trunkRadius + 3, y: platformHeight + 1, z: trunkRadius + 3 },
            to: { x: trunkRadius + platformSize - 2, y: platformHeight + 4, z: trunkRadius + platformSize - 2 },
            block: blocks.planks
        },

        // ===== CABIN ROOF (simple flat) =====
        {
            op: 'we_fill',
            from: { x: trunkRadius + 2, y: platformHeight + 5, z: trunkRadius + 2 },
            to: { x: trunkRadius + platformSize - 1, y: platformHeight + 5, z: trunkRadius + platformSize - 1 },
            block: blocks.stairs
        },

        // ===== LADDER UP TRUNK =====
        {
            op: 'we_fill',
            from: { x: trunkRadius + 1, y: 1, z: 0 },
            to: { x: trunkRadius + 1, y: platformHeight - 1, z: 0 },
            block: 'ladder'
        },

        // ===== CANOPY (leaf spheres) =====
        {
            op: 'we_sphere',
            center: { x: 0, y: trunkHeight, z: 0 },
            radius: canopyRadius,
            block: blocks.leaves,
            hollow: false
        },
        {
            op: 'we_sphere',
            center: { x: canopyRadius - 2, y: trunkHeight - 3, z: 0 },
            radius: Math.max(3, canopyRadius - 2),
            block: blocks.leaves,
            hollow: false
        },
        {
            op: 'we_sphere',
            center: { x: -(canopyRadius - 2), y: trunkHeight - 3, z: 0 },
            radius: Math.max(3, canopyRadius - 2),
            block: blocks.leaves,
            hollow: false
        },
        {
            op: 'we_sphere',
            center: { x: 0, y: trunkHeight - 3, z: canopyRadius - 2 },
            radius: Math.max(3, canopyRadius - 2),
            block: blocks.leaves,
            hollow: false
        },
        {
            op: 'we_sphere',
            center: { x: 0, y: trunkHeight - 3, z: -(canopyRadius - 2) },
            radius: Math.max(3, canopyRadius - 2),
            block: blocks.leaves,
            hollow: false
        },

        // ===== DECORATIVE LANTERNS =====
        {
            op: 'set',
            pos: { x: trunkRadius + 2, y: platformHeight + 2, z: trunkRadius + 2 },
            block: blocks.lantern
        },
        {
            op: 'set',
            pos: { x: trunkRadius + platformSize - 1, y: platformHeight + 2, z: trunkRadius + 2 },
            block: blocks.lantern
        }
    ];

    return {
        buildType: 'treehouse',
        theme: analysis.theme?.theme || 'fantasy',
        size: {
            width: platformSize + trunkRadius * 2 + 4,
            height: trunkHeight + canopyRadius + 2,
            depth: platformSize + trunkRadius * 2 + 4
        },
        palette: blocks,
        steps,
        generationMethod: 'procedural_treehouse'
    };
}

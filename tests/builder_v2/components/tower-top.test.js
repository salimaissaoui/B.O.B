/**
 * Tower Top Component Tests
 *
 * Tests for the V2 tower_top component.
 * Verifies:
 * - Different roof styles (crenellated, pointed, dome)
 * - Dimension parameters
 * - Block materials
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "V2 Component Library Growth - Add tower_top"
 */

import { describe, test, expect } from '@jest/globals';
import { towerTop } from '../../../src/builder_v2/components/structural/tower-top.js';

describe('Tower Top Component - Contract Tests', () => {
    describe('Basic generation', () => {
        test('generates primitives array', () => {
            const result = towerTop({});

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        test('primitives have required properties', () => {
            const result = towerTop({});

            for (const prim of result) {
                expect(prim).toHaveProperty('id');
                expect(prim).toHaveProperty('type');
                expect(prim).toHaveProperty('block');
            }
        });
    });

    describe('Roof styles', () => {
        test('crenellated style generates battlements', () => {
            const result = towerTop({ style: 'crenellated', radius: 4 });

            expect(result.length).toBeGreaterThan(0);
        });

        test('pointed style generates conical roof', () => {
            const result = towerTop({ style: 'pointed', radius: 4 });

            expect(result.length).toBeGreaterThan(0);
        });

        test('dome style generates domed roof', () => {
            const result = towerTop({ style: 'dome', radius: 4 });

            expect(result.length).toBeGreaterThan(0);
        });

        test('flat style generates flat top', () => {
            const result = towerTop({ style: 'flat', radius: 4 });

            expect(result.length).toBeGreaterThan(0);
        });

        test('different styles produce different results', () => {
            const crenellated = towerTop({ style: 'crenellated', radius: 4 });
            const pointed = towerTop({ style: 'pointed', radius: 4 });
            const dome = towerTop({ style: 'dome', radius: 4 });

            // Each style should have different number of blocks
            const counts = [crenellated.length, pointed.length, dome.length];
            const uniqueCounts = [...new Set(counts)];

            // At least 2 styles should differ
            expect(uniqueCounts.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Dimension parameters', () => {
        test('radius controls tower diameter', () => {
            const small = towerTop({ radius: 2 });
            const large = towerTop({ radius: 6 });

            expect(large.length).toBeGreaterThan(small.length);
        });

        test('height parameter affects pointed roof', () => {
            const short = towerTop({ style: 'pointed', height: 3 });
            const tall = towerTop({ style: 'pointed', height: 8 });

            expect(tall.length).toBeGreaterThan(short.length);
        });

        test('crenelHeight affects battlement height', () => {
            const short = towerTop({ style: 'crenellated', crenelHeight: 1 });
            const tall = towerTop({ style: 'crenellated', crenelHeight: 3 });

            expect(tall.length).toBeGreaterThan(short.length);
        });
    });

    describe('Block materials', () => {
        test('uses default block when not specified', () => {
            const result = towerTop({});

            const hasBlocks = result.some(p => p.block !== undefined);
            expect(hasBlocks).toBe(true);
        });

        test('custom block is applied', () => {
            const result = towerTop({ block: 'stone_bricks' });

            const stoneBricks = result.filter(p => p.block === 'stone_bricks');
            expect(stoneBricks.length).toBeGreaterThan(0);
        });

        test('roofBlock uses separate material for pointed/dome', () => {
            const result = towerTop({
                style: 'pointed',
                block: 'stone_bricks',
                roofBlock: 'spruce_planks'
            });

            const roofBlocks = result.filter(p => p.block === 'spruce_planks');
            expect(roofBlocks.length).toBeGreaterThan(0);
        });
    });

    describe('Position parameter', () => {
        test('respects custom position', () => {
            const result = towerTop({
                position: { x: 100, y: 64, z: 100 },
                radius: 3
            });

            // Check some positions are near the specified location
            const nearTarget = result.filter(p => {
                if (!p.pos) return false;
                return Math.abs(p.pos.x - 100) <= 10 &&
                       Math.abs(p.pos.y - 64) <= 20 &&
                       Math.abs(p.pos.z - 100) <= 10;
            });

            expect(nearTarget.length).toBeGreaterThan(0);
        });
    });

    describe('Scale parameter', () => {
        test('scale multiplies dimensions', () => {
            const normal = towerTop({ radius: 3, scale: 1 });
            const scaled = towerTop({ radius: 3, scale: 2 });

            expect(scaled.length).toBeGreaterThan(normal.length);
        });
    });
});

describe('Tower Top Component - Integration', () => {
    test('complete tower top with crenellations', () => {
        const result = towerTop({
            position: { x: 50, y: 80, z: 50 },
            radius: 5,
            style: 'crenellated',
            crenelHeight: 2,
            block: 'stone_bricks'
        });

        expect(result.length).toBeGreaterThan(20);

        for (const prim of result) {
            expect(prim.id).toBeDefined();
            expect(prim.type).toBeDefined();
        }
    });

    test('complete tower top with pointed roof', () => {
        const result = towerTop({
            position: { x: 50, y: 80, z: 50 },
            radius: 4,
            style: 'pointed',
            height: 6,
            block: 'cobblestone',
            roofBlock: 'dark_oak_planks'
        });

        expect(result.length).toBeGreaterThan(30);
    });
});

/**
 * Bridge Component Tests
 *
 * Tests for the V2 bridge component.
 * Verifies:
 * - Basic bridge generation
 * - Span and width parameters
 * - Railing options
 * - Support pillars
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "V2 Component Library Growth - Add bridge"
 */

import { describe, test, expect } from '@jest/globals';
import { bridge } from '../../../src/builder_v2/components/structural/bridge.js';

describe('Bridge Component - Contract Tests', () => {
    describe('Basic generation', () => {
        test('generates primitives array', () => {
            const result = bridge({});

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        test('primitives have required properties', () => {
            const result = bridge({});

            for (const prim of result) {
                expect(prim).toHaveProperty('id');
                expect(prim).toHaveProperty('type');
                expect(prim).toHaveProperty('block');
            }
        });

        test('uses default position when not specified', () => {
            const result = bridge({});

            const hasValidPositions = result.every(prim => {
                if (prim.pos) {
                    return typeof prim.pos.x === 'number' &&
                           typeof prim.pos.y === 'number' &&
                           typeof prim.pos.z === 'number';
                }
                return true; // Allow primitives without pos (like fill)
            });

            expect(hasValidPositions).toBe(true);
        });
    });

    describe('Dimension parameters', () => {
        test('span parameter controls length', () => {
            const shortBridge = bridge({ span: 5 });
            const longBridge = bridge({ span: 15 });

            expect(longBridge.length).toBeGreaterThan(shortBridge.length);
        });

        test('width parameter controls width', () => {
            const narrowBridge = bridge({ width: 3 });
            const wideBridge = bridge({ width: 7 });

            expect(wideBridge.length).toBeGreaterThan(narrowBridge.length);
        });

        test('default span is reasonable', () => {
            const result = bridge({});

            // Should have enough blocks for a usable bridge
            expect(result.length).toBeGreaterThan(10);
        });
    });

    describe('Railing options', () => {
        test('railings can be enabled', () => {
            const withRailings = bridge({ railings: true, span: 10, width: 3 });
            const withoutRailings = bridge({ railings: false, span: 10, width: 3 });

            expect(withRailings.length).toBeGreaterThan(withoutRailings.length);
        });

        test('railing height parameter works', () => {
            const lowRailings = bridge({ railings: true, railingHeight: 1 });
            const highRailings = bridge({ railings: true, railingHeight: 3 });

            expect(highRailings.length).toBeGreaterThan(lowRailings.length);
        });
    });

    describe('Support pillars', () => {
        test('supports can be enabled', () => {
            const withSupports = bridge({ supports: true, span: 20 });
            const withoutSupports = bridge({ supports: false, span: 20 });

            expect(withSupports.length).toBeGreaterThan(withoutSupports.length);
        });

        test('supportHeight controls pillar height', () => {
            const shortSupports = bridge({ supports: true, supportHeight: 3 });
            const tallSupports = bridge({ supports: true, supportHeight: 10 });

            expect(tallSupports.length).toBeGreaterThan(shortSupports.length);
        });
    });

    describe('Direction parameter', () => {
        test('ns direction generates north-south bridge', () => {
            const result = bridge({ direction: 'ns', span: 10 });

            // Check that z coordinates vary (north-south)
            const zCoords = result
                .filter(p => p.pos)
                .map(p => p.pos.z);
            const uniqueZ = [...new Set(zCoords)];

            expect(uniqueZ.length).toBeGreaterThan(1);
        });

        test('ew direction generates east-west bridge', () => {
            const result = bridge({ direction: 'ew', span: 10 });

            // Check that x coordinates vary (east-west)
            const xCoords = result
                .filter(p => p.pos)
                .map(p => p.pos.x);
            const uniqueX = [...new Set(xCoords)];

            expect(uniqueX.length).toBeGreaterThan(1);
        });
    });

    describe('Block materials', () => {
        test('uses default block when not specified', () => {
            const result = bridge({});

            const blocks = result.map(p => p.block);
            expect(blocks.some(b => b !== undefined)).toBe(true);
        });

        test('custom block is applied', () => {
            const result = bridge({ block: 'oak_planks' });

            const blocks = result.filter(p => p.block === 'oak_planks');
            expect(blocks.length).toBeGreaterThan(0);
        });

        test('railingBlock uses separate material', () => {
            const result = bridge({
                railings: true,
                block: 'stone_bricks',
                railingBlock: 'oak_fence'
            });

            const fenceBlocks = result.filter(p => p.block === 'oak_fence');
            expect(fenceBlocks.length).toBeGreaterThan(0);
        });
    });

    describe('Scale parameter', () => {
        test('scale multiplies dimensions', () => {
            const normalBridge = bridge({ span: 10, width: 3, scale: 1 });
            const scaledBridge = bridge({ span: 10, width: 3, scale: 2 });

            expect(scaledBridge.length).toBeGreaterThan(normalBridge.length);
        });
    });
});

describe('Bridge Component - Integration', () => {
    test('complete bridge with all features', () => {
        const result = bridge({
            position: { x: 100, y: 64, z: 100 },
            span: 15,
            width: 5,
            railings: true,
            railingHeight: 1,
            supports: true,
            supportHeight: 8,
            block: 'stone_bricks',
            railingBlock: 'stone_brick_wall',
            direction: 'ns'
        });

        expect(result.length).toBeGreaterThan(50);

        // Check all primitives have valid structure
        for (const prim of result) {
            expect(prim.id).toBeDefined();
            expect(['set', 'fill', 'line'].includes(prim.type) || prim.type.startsWith('bridge')).toBe(true);
        }
    });
});

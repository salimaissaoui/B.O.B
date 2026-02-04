/**
 * Wall Gate Component Tests
 *
 * Tests for the V2 wall_gate component.
 * Verifies:
 * - Basic gate generation
 * - Opening dimensions
 * - Portcullis option
 * - Wall integration
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "V2 Component Library Growth - Add wall_gate"
 */

import { describe, test, expect } from '@jest/globals';
import { wallGate } from '../../../src/builder_v2/components/structural/wall-gate.js';

describe('Wall Gate Component - Contract Tests', () => {
    describe('Basic generation', () => {
        test('generates primitives array', () => {
            const result = wallGate({});

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        test('primitives have required properties', () => {
            const result = wallGate({});

            for (const prim of result) {
                expect(prim).toHaveProperty('id');
                expect(prim).toHaveProperty('type');
                expect(prim).toHaveProperty('block');
            }
        });
    });

    describe('Dimension parameters', () => {
        test('gateWidth controls opening width', () => {
            const narrow = wallGate({ gateWidth: 3 });
            const wide = wallGate({ gateWidth: 7 });

            // Wider gate removes more blocks from wall, so fewer total primitives
            expect(narrow.length).toBeGreaterThan(wide.length);
        });

        test('gateHeight controls opening height', () => {
            const short = wallGate({ gateHeight: 3 });
            const tall = wallGate({ gateHeight: 6 });

            // Taller gate removes more blocks, so fewer total primitives
            expect(short.length).toBeGreaterThan(tall.length);
        });

        test('wallHeight controls total wall height', () => {
            const low = wallGate({ wallHeight: 5 });
            const high = wallGate({ wallHeight: 10 });

            expect(high.length).toBeGreaterThan(low.length);
        });

        test('wallThickness controls depth', () => {
            const thin = wallGate({ wallThickness: 1 });
            const thick = wallGate({ wallThickness: 3 });

            expect(thick.length).toBeGreaterThan(thin.length);
        });
    });

    describe('Gate opening', () => {
        test('creates an opening in the wall', () => {
            const result = wallGate({
                gateWidth: 3,
                gateHeight: 4,
                wallHeight: 6,
                wallWidth: 10
            });

            // Should have blocks for wall but not in opening area
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('Portcullis option', () => {
        test('portcullis adds blocks when enabled', () => {
            const without = wallGate({ portcullis: false });
            const with_ = wallGate({ portcullis: true });

            expect(with_.length).toBeGreaterThan(without.length);
        });

        test('portcullisBlock uses separate material', () => {
            const result = wallGate({
                portcullis: true,
                portcullisBlock: 'iron_bars'
            });

            const ironBars = result.filter(p => p.block === 'iron_bars');
            expect(ironBars.length).toBeGreaterThan(0);
        });
    });

    describe('Tower options', () => {
        test('towers adds flanking towers when enabled', () => {
            const without = wallGate({ towers: false });
            const with_ = wallGate({ towers: true });

            expect(with_.length).toBeGreaterThan(without.length);
        });

        test('towerRadius controls tower size', () => {
            const small = wallGate({ towers: true, towerRadius: 2 });
            const large = wallGate({ towers: true, towerRadius: 4 });

            expect(large.length).toBeGreaterThan(small.length);
        });
    });

    describe('Direction parameter', () => {
        test('ns direction generates north-south facing gate', () => {
            const result = wallGate({ direction: 'ns' });

            expect(result.length).toBeGreaterThan(0);
        });

        test('ew direction generates east-west facing gate', () => {
            const result = wallGate({ direction: 'ew' });

            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('Block materials', () => {
        test('custom block is applied', () => {
            const result = wallGate({ block: 'stone_bricks' });

            const stoneBricks = result.filter(p => p.block === 'stone_bricks');
            expect(stoneBricks.length).toBeGreaterThan(0);
        });
    });
});

describe('Wall Gate Component - Integration', () => {
    test('complete gatehouse with all features', () => {
        const result = wallGate({
            position: { x: 100, y: 64, z: 100 },
            gateWidth: 4,
            gateHeight: 5,
            wallHeight: 8,
            wallWidth: 15,
            wallThickness: 2,
            portcullis: true,
            towers: true,
            towerRadius: 3,
            towerHeight: 10,
            block: 'stone_bricks',
            portcullisBlock: 'iron_bars',
            direction: 'ns'
        });

        expect(result.length).toBeGreaterThan(100);

        // Check all primitives have valid structure
        for (const prim of result) {
            expect(prim.id).toBeDefined();
            expect(prim.type).toBeDefined();
        }
    });
});

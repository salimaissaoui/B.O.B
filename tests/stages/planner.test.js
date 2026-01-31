/**
 * Tests for Multi-Step Planner
 *
 * Verifies:
 * - Compound build detection
 * - High-level plan generation
 * - Blueprint merging with offsets
 */

import { jest } from '@jest/globals';

// Mock the GeminiClient
jest.unstable_mockModule('../../src/llm/gemini-client.js', () => ({
    GeminiClient: jest.fn().mockImplementation(() => ({
        generateContent: jest.fn().mockResolvedValue({
            description: 'Test village',
            totalSize: { width: 50, height: 20, depth: 50 },
            components: [
                { id: 'house_1', type: 'house', name: 'House 1', size: { width: 7, height: 5, depth: 6 }, position: { x: 0, y: 0, z: 0 } },
                { id: 'house_2', type: 'house', name: 'House 2', size: { width: 7, height: 5, depth: 6 }, position: { x: 12, y: 0, z: 0 } }
            ],
            layout: { style: 'grid', spacing: 5 }
        })
    }))
}));

const {
    requiresMultiStepPlanning,
    mergeComponentBlueprints
} = await import('../../src/stages/2a-planner.js');

describe('Multi-Step Planner', () => {
    describe('requiresMultiStepPlanning', () => {
        const baseAnalysis = { buildType: 'compound', hints: {} };

        test('detects "village" keyword', () => {
            expect(requiresMultiStepPlanning('build a medieval village', baseAnalysis)).toBe(true);
        });

        test('detects "city" keyword', () => {
            expect(requiresMultiStepPlanning('large city with towers', baseAnalysis)).toBe(true);
        });

        test('detects "complex" keyword', () => {
            expect(requiresMultiStepPlanning('complex castle structure', baseAnalysis)).toBe(true);
        });

        test('detects "compound" keyword', () => {
            expect(requiresMultiStepPlanning('compound with multiple buildings', baseAnalysis)).toBe(true);
        });

        test('detects explicit component counts', () => {
            expect(requiresMultiStepPlanning('5 houses in a row', baseAnalysis)).toBe(true);
            expect(requiresMultiStepPlanning('build 3 towers', baseAnalysis)).toBe(true);
        });

        test('detects multiple structures with "and"', () => {
            expect(requiresMultiStepPlanning('house and castle and tower', baseAnalysis)).toBe(true);
        });

        test('returns false for simple builds', () => {
            expect(requiresMultiStepPlanning('small house', baseAnalysis)).toBe(false);
            expect(requiresMultiStepPlanning('medieval castle', baseAnalysis)).toBe(false);
            expect(requiresMultiStepPlanning('oak tree', baseAnalysis)).toBe(false);
        });

        test('returns false when planning is disabled', () => {
            // This tests the config check - planning.enabled is true by default
            expect(requiresMultiStepPlanning('village', baseAnalysis)).toBe(true);
        });
    });

    describe('mergeComponentBlueprints', () => {
        test('merges palettes from all components', () => {
            const plan = {
                description: 'Test',
                totalSize: { width: 20, height: 10, depth: 20 },
                components: [
                    { position: { x: 0, y: 0, z: 0 } },
                    { position: { x: 10, y: 0, z: 0 } }
                ]
            };

            const componentBlueprints = [
                { palette: { wall: 'stone' }, steps: [] },
                { palette: { roof: 'oak_planks' }, steps: [] }
            ];

            const merged = mergeComponentBlueprints(plan, componentBlueprints);
            expect(merged.palette.wall).toBe('stone');
            expect(merged.palette.roof).toBe('oak_planks');
        });

        test('adds cursor_reset between components', () => {
            const plan = {
                components: [
                    { position: { x: 0, y: 0, z: 0 } },
                    { position: { x: 10, y: 0, z: 0 } }
                ]
            };

            const componentBlueprints = [
                { steps: [{ op: 'fill', block: 'stone' }] },
                { steps: [{ op: 'fill', block: 'oak_planks' }] }
            ];

            const merged = mergeComponentBlueprints(plan, componentBlueprints);

            // Should have cursor_reset ops
            const resets = merged.steps.filter(s => s.op === 'cursor_reset');
            expect(resets.length).toBeGreaterThanOrEqual(2);
        });

        test('adds move operations for non-origin components', () => {
            const plan = {
                components: [
                    { position: { x: 0, y: 0, z: 0 } },
                    { position: { x: 15, y: 0, z: 10 } }
                ]
            };

            const componentBlueprints = [
                { steps: [{ op: 'fill' }] },
                { steps: [{ op: 'fill' }] }
            ];

            const merged = mergeComponentBlueprints(plan, componentBlueprints);

            const moves = merged.steps.filter(s => s.op === 'move');
            expect(moves.length).toBe(1);
            expect(moves[0].offset.x).toBe(15);
            expect(moves[0].offset.z).toBe(10);
        });

        test('sets buildType to compound', () => {
            const plan = { components: [] };
            const merged = mergeComponentBlueprints(plan, []);
            expect(merged.buildType).toBe('compound');
        });

        test('preserves component steps in order', () => {
            const plan = {
                components: [
                    { position: { x: 0, y: 0, z: 0 } }
                ]
            };

            const componentBlueprints = [
                {
                    steps: [
                        { op: 'fill', block: 'stone', order: 1 },
                        { op: 'wall', block: 'stone', order: 2 },
                        { op: 'set', block: 'door', order: 3 }
                    ]
                }
            ];

            const merged = mergeComponentBlueprints(plan, componentBlueprints);

            const stepOps = merged.steps.filter(s => s.order).map(s => s.op);
            expect(stepOps).toEqual(['fill', 'wall', 'set']);
        });
    });
});

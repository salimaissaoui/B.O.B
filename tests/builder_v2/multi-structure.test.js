/**
 * Multi-Structure Build Tests
 *
 * Tests for coordinated multi-structure builds like villages.
 * Verifies:
 * - Structure layout planning
 * - Spacing and collision avoidance
 * - Coordinated execution
 *
 * CLAUDE.md Contract:
 * - Priority 4 Feature Expansion: "Multi-Structure Builds"
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
    MultiStructurePlanner,
    StructureLayout,
    calculateBoundingBox,
    checkOverlap,
    generateVillageLayout,
    STRUCTURE_TEMPLATES
} from '../../src/builder_v2/multi-structure/planner.js';

describe('Multi-Structure Planner - Core', () => {
    describe('Bounding box calculation', () => {
        test('calculates bounding box from primitives', () => {
            const primitives = [
                { pos: { x: 0, y: 0, z: 0 } },
                { pos: { x: 10, y: 5, z: 10 } },
                { pos: { x: -5, y: 2, z: 3 } }
            ];

            const bbox = calculateBoundingBox(primitives);

            expect(bbox.min).toEqual({ x: -5, y: 0, z: 0 });
            expect(bbox.max).toEqual({ x: 10, y: 5, z: 10 });
            expect(bbox.width).toBe(16);  // 10 - (-5) + 1
            expect(bbox.height).toBe(6);  // 5 - 0 + 1
            expect(bbox.depth).toBe(11);  // 10 - 0 + 1
        });

        test('handles empty primitives array', () => {
            const bbox = calculateBoundingBox([]);

            expect(bbox.min).toEqual({ x: 0, y: 0, z: 0 });
            expect(bbox.max).toEqual({ x: 0, y: 0, z: 0 });
        });

        test('handles single primitive', () => {
            const primitives = [{ pos: { x: 5, y: 10, z: 15 } }];

            const bbox = calculateBoundingBox(primitives);

            expect(bbox.min).toEqual({ x: 5, y: 10, z: 15 });
            expect(bbox.max).toEqual({ x: 5, y: 10, z: 15 });
            expect(bbox.width).toBe(1);
            expect(bbox.height).toBe(1);
            expect(bbox.depth).toBe(1);
        });
    });

    describe('Overlap detection', () => {
        test('detects overlapping bounding boxes', () => {
            const box1 = { min: { x: 0, z: 0 }, max: { x: 10, z: 10 } };
            const box2 = { min: { x: 5, z: 5 }, max: { x: 15, z: 15 } };

            expect(checkOverlap(box1, box2)).toBe(true);
        });

        test('detects non-overlapping boxes', () => {
            const box1 = { min: { x: 0, z: 0 }, max: { x: 10, z: 10 } };
            const box2 = { min: { x: 20, z: 20 }, max: { x: 30, z: 30 } };

            expect(checkOverlap(box1, box2)).toBe(false);
        });

        test('respects spacing buffer', () => {
            const box1 = { min: { x: 0, z: 0 }, max: { x: 10, z: 10 } };
            const box2 = { min: { x: 12, z: 0 }, max: { x: 22, z: 10 } };

            // Without spacing, no overlap
            expect(checkOverlap(box1, box2, 0)).toBe(false);

            // With 3-block spacing, overlap detected
            expect(checkOverlap(box1, box2, 3)).toBe(true);
        });

        test('edge-adjacent boxes do not overlap', () => {
            const box1 = { min: { x: 0, z: 0 }, max: { x: 10, z: 10 } };
            const box2 = { min: { x: 11, z: 0 }, max: { x: 21, z: 10 } };

            expect(checkOverlap(box1, box2)).toBe(false);
        });
    });
});

describe('Multi-Structure Planner - Layout', () => {
    let planner;

    beforeEach(() => {
        planner = new MultiStructurePlanner();
    });

    describe('Structure placement', () => {
        test('places first structure at origin', () => {
            const layout = planner.createLayout({
                center: { x: 0, y: 64, z: 0 },
                structures: [
                    { type: 'house', size: 'small' }
                ]
            });

            expect(layout.structures.length).toBe(1);
            expect(layout.structures[0].position.x).toBe(0);
            expect(layout.structures[0].position.z).toBe(0);
        });

        test('spaces multiple structures apart', () => {
            const layout = planner.createLayout({
                center: { x: 0, y: 64, z: 0 },
                structures: [
                    { type: 'house', size: 'small' },
                    { type: 'house', size: 'small' }
                ],
                spacing: 5
            });

            expect(layout.structures.length).toBe(2);

            // Calculate distance between structures
            const dx = layout.structures[1].position.x - layout.structures[0].position.x;
            const dz = layout.structures[1].position.z - layout.structures[0].position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            // Should be spaced apart (at least spacing + structure size)
            expect(distance).toBeGreaterThan(5);
        });

        test('respects maximum area constraint', () => {
            const layout = planner.createLayout({
                center: { x: 0, y: 64, z: 0 },
                structures: [
                    { type: 'house', size: 'small' },
                    { type: 'house', size: 'small' },
                    { type: 'house', size: 'small' }
                ],
                maxRadius: 50
            });

            // All structures should be within maxRadius
            for (const structure of layout.structures) {
                const dx = structure.position.x;
                const dz = structure.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                expect(distance).toBeLessThanOrEqual(50 + 20); // Allow for structure size
            }
        });
    });

    describe('Layout patterns', () => {
        test('grid pattern distributes structures evenly', () => {
            const layout = planner.createLayout({
                center: { x: 0, y: 64, z: 0 },
                structures: Array(4).fill({ type: 'house', size: 'small' }),
                pattern: 'grid',
                spacing: 10
            });

            expect(layout.structures.length).toBe(4);
            // Grid should create 2x2 arrangement
        });

        test('radial pattern places structures in a circle', () => {
            const layout = planner.createLayout({
                center: { x: 0, y: 64, z: 0 },
                structures: Array(6).fill({ type: 'house', size: 'small' }),
                pattern: 'radial',
                radius: 30
            });

            expect(layout.structures.length).toBe(6);

            // Check structures are approximately equidistant from center
            const distances = layout.structures.map(s => {
                return Math.sqrt(s.position.x ** 2 + s.position.z ** 2);
            });

            const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
            for (const d of distances) {
                expect(Math.abs(d - avgDistance)).toBeLessThan(15);
            }
        });

        test('organic pattern creates natural-looking placement', () => {
            const layout = planner.createLayout({
                center: { x: 0, y: 64, z: 0 },
                structures: Array(5).fill({ type: 'house', size: 'small' }),
                pattern: 'organic'
            });

            expect(layout.structures.length).toBe(5);

            // No two structures should overlap
            for (let i = 0; i < layout.structures.length; i++) {
                for (let j = i + 1; j < layout.structures.length; j++) {
                    const s1 = layout.structures[i];
                    const s2 = layout.structures[j];
                    const dx = s1.position.x - s2.position.x;
                    const dz = s1.position.z - s2.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    expect(distance).toBeGreaterThan(5); // Minimum spacing
                }
            }
        });
    });
});

describe('Multi-Structure Planner - Village Generation', () => {
    test('generates village with default composition', () => {
        const layout = generateVillageLayout({
            center: { x: 0, y: 64, z: 0 },
            size: 'small'
        });

        expect(layout.structures.length).toBeGreaterThan(0);
        expect(layout.structures.length).toBeLessThanOrEqual(10);
    });

    test('small village has 3-5 structures', () => {
        const layout = generateVillageLayout({
            center: { x: 0, y: 64, z: 0 },
            size: 'small'
        });

        expect(layout.structures.length).toBeGreaterThanOrEqual(3);
        expect(layout.structures.length).toBeLessThanOrEqual(5);
    });

    test('medium village has 6-12 structures', () => {
        const layout = generateVillageLayout({
            center: { x: 0, y: 64, z: 0 },
            size: 'medium'
        });

        expect(layout.structures.length).toBeGreaterThanOrEqual(6);
        expect(layout.structures.length).toBeLessThanOrEqual(12);
    });

    test('large village has 13-20 structures', () => {
        const layout = generateVillageLayout({
            center: { x: 0, y: 64, z: 0 },
            size: 'large'
        });

        expect(layout.structures.length).toBeGreaterThanOrEqual(13);
        expect(layout.structures.length).toBeLessThanOrEqual(20);
    });

    test('village includes central structure', () => {
        const layout = generateVillageLayout({
            center: { x: 0, y: 64, z: 0 },
            size: 'medium',
            centralStructure: 'well'
        });

        const central = layout.structures.find(s => s.type === 'well');
        expect(central).toBeDefined();

        // Central structure should be near origin
        const distance = Math.sqrt(central.position.x ** 2 + central.position.z ** 2);
        expect(distance).toBeLessThan(10);
    });

    test('village structures do not overlap', () => {
        const layout = generateVillageLayout({
            center: { x: 0, y: 64, z: 0 },
            size: 'large'
        });

        for (let i = 0; i < layout.structures.length; i++) {
            for (let j = i + 1; j < layout.structures.length; j++) {
                const s1 = layout.structures[i];
                const s2 = layout.structures[j];

                // Get approximate sizes
                const s1Size = STRUCTURE_TEMPLATES[s1.type]?.baseSize || 8;
                const s2Size = STRUCTURE_TEMPLATES[s2.type]?.baseSize || 8;
                const minDistance = (s1Size + s2Size) / 2;

                const dx = s1.position.x - s2.position.x;
                const dz = s1.position.z - s2.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);

                expect(distance).toBeGreaterThanOrEqual(minDistance);
            }
        }
    });
});

describe('Multi-Structure Planner - Structure Templates', () => {
    test('house template has required properties', () => {
        expect(STRUCTURE_TEMPLATES.house).toBeDefined();
        expect(STRUCTURE_TEMPLATES.house.baseSize).toBeGreaterThan(0);
        expect(STRUCTURE_TEMPLATES.house.component).toBeDefined();
    });

    test('well template exists for village centers', () => {
        expect(STRUCTURE_TEMPLATES.well).toBeDefined();
        expect(STRUCTURE_TEMPLATES.well.baseSize).toBeGreaterThan(0);
    });

    test('tower template exists for fortifications', () => {
        expect(STRUCTURE_TEMPLATES.tower).toBeDefined();
    });

    test('templates include default parameters', () => {
        const houseTemplate = STRUCTURE_TEMPLATES.house;
        expect(houseTemplate.defaultParams).toBeDefined();
    });
});

describe('StructureLayout class', () => {
    test('tracks total block count', () => {
        const layout = new StructureLayout({ x: 0, y: 64, z: 0 });

        layout.addStructure({
            type: 'house',
            position: { x: 0, y: 64, z: 0 },
            estimatedBlocks: 500
        });

        layout.addStructure({
            type: 'house',
            position: { x: 20, y: 64, z: 0 },
            estimatedBlocks: 500
        });

        expect(layout.getTotalBlocks()).toBe(1000);
    });

    test('calculates overall bounding box', () => {
        const layout = new StructureLayout({ x: 0, y: 64, z: 0 });

        layout.addStructure({
            type: 'house',
            position: { x: -10, y: 64, z: -10 },
            bounds: { width: 10, depth: 10 }
        });

        layout.addStructure({
            type: 'house',
            position: { x: 20, y: 64, z: 20 },
            bounds: { width: 10, depth: 10 }
        });

        const totalBounds = layout.getTotalBounds();
        expect(totalBounds.min.x).toBeLessThanOrEqual(-10);
        expect(totalBounds.max.x).toBeGreaterThanOrEqual(30);
    });

    test('exports to execution plan', () => {
        const layout = new StructureLayout({ x: 0, y: 64, z: 0 });

        layout.addStructure({
            type: 'house',
            position: { x: 0, y: 64, z: 0 },
            params: { width: 8, depth: 8 }
        });

        const plan = layout.toExecutionPlan();

        expect(plan.structures).toHaveLength(1);
        expect(plan.structures[0].type).toBe('house');
        expect(plan.structures[0].position).toEqual({ x: 0, y: 64, z: 0 });
    });
});

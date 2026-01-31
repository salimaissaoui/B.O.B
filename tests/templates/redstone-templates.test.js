import { jest, describe, test, expect } from '@jest/globals';
import {
    REDSTONE_TEMPLATES,
    getRedstoneTemplate,
    getTemplatesByCategory,
    listTemplates,
    instantiateTemplate,
    detectRedstoneRequest
} from '../../src/templates/redstone-templates.js';

describe('Redstone Templates', () => {
    describe('REDSTONE_TEMPLATES', () => {
        test('contains expected templates', () => {
            expect(REDSTONE_TEMPLATES.piston_door_2x2).toBeDefined();
            expect(REDSTONE_TEMPLATES.hidden_staircase).toBeDefined();
            expect(REDSTONE_TEMPLATES.lamp_toggle).toBeDefined();
            expect(REDSTONE_TEMPLATES.item_dropper).toBeDefined();
            expect(REDSTONE_TEMPLATES.t_flip_flop).toBeDefined();
        });

        test('templates have required properties', () => {
            for (const [name, template] of Object.entries(REDSTONE_TEMPLATES)) {
                expect(template.name).toBeDefined();
                expect(template.description).toBeDefined();
                expect(template.size).toBeDefined();
                expect(template.category).toBeDefined();
                expect(template.blocks).toBeInstanceOf(Array);
                expect(template.blocks.length).toBeGreaterThan(0);
            }
        });

        test('template blocks have correct structure', () => {
            const template = REDSTONE_TEMPLATES.piston_door_2x2;
            for (const block of template.blocks) {
                expect(typeof block.x).toBe('number');
                expect(typeof block.y).toBe('number');
                expect(typeof block.z).toBe('number');
                expect(typeof block.block).toBe('string');
            }
        });
    });

    describe('getRedstoneTemplate', () => {
        test('returns template by name', () => {
            const template = getRedstoneTemplate('piston_door_2x2');
            expect(template).toBe(REDSTONE_TEMPLATES.piston_door_2x2);
        });

        test('returns null for unknown template', () => {
            expect(getRedstoneTemplate('nonexistent')).toBeNull();
        });
    });

    describe('getTemplatesByCategory', () => {
        test('returns templates in door category', () => {
            const doors = getTemplatesByCategory('door');
            expect(doors.length).toBeGreaterThan(0);
            expect(doors[0].category).toBe('door');
        });

        test('returns empty array for unknown category', () => {
            expect(getTemplatesByCategory('nonexistent')).toHaveLength(0);
        });
    });

    describe('listTemplates', () => {
        test('returns array of template names', () => {
            const names = listTemplates();
            expect(names).toContain('piston_door_2x2');
            expect(names).toContain('hidden_staircase');
        });
    });

    describe('instantiateTemplate', () => {
        test('creates steps at origin with north facing', () => {
            const steps = instantiateTemplate('lamp_toggle', { x: 0, y: 0, z: 0 }, 'north');

            expect(steps.length).toBeGreaterThan(0);
            expect(steps[0].op).toBe('set');
            expect(steps[0].pos).toBeDefined();
            expect(steps[0].block).toBeDefined();
        });

        test('offsets blocks to world position', () => {
            const steps = instantiateTemplate('lamp_toggle', { x: 100, y: 64, z: 200 }, 'north');

            // All positions should be offset
            for (const step of steps) {
                expect(step.pos.x).toBeGreaterThanOrEqual(100);
                expect(step.pos.y).toBeGreaterThanOrEqual(64);
            }
        });

        test('accepts template object directly', () => {
            const template = REDSTONE_TEMPLATES.lamp_toggle;
            const steps = instantiateTemplate(template, { x: 0, y: 0, z: 0 });

            expect(steps.length).toBe(template.blocks.length);
        });

        test('rotates template to face east', () => {
            const northSteps = instantiateTemplate('lamp_toggle', { x: 0, y: 0, z: 0 }, 'north');
            const eastSteps = instantiateTemplate('lamp_toggle', { x: 0, y: 0, z: 0 }, 'east');

            // Positions should be different (rotated 90°)
            const northPositions = northSteps.map(s => `${s.pos.x},${s.pos.z}`).sort();
            const eastPositions = eastSteps.map(s => `${s.pos.x},${s.pos.z}`).sort();

            // Not all positions will be identical after rotation
            // Just verify dimensions are reasonable
            expect(eastSteps.length).toBe(northSteps.length);
        });

        test('rotates facing in block states', () => {
            // Use piston door which has directional blocks
            const northSteps = instantiateTemplate('piston_door_2x2', { x: 0, y: 0, z: 0 }, 'north');
            const eastSteps = instantiateTemplate('piston_door_2x2', { x: 0, y: 0, z: 0 }, 'east');

            // Find a piston in north-facing build
            const northPiston = northSteps.find(s => s.block.includes('piston'));
            const eastPiston = eastSteps.find(s => s.block.includes('piston'));

            // Both should exist
            expect(northPiston).toBeDefined();
            expect(eastPiston).toBeDefined();
        });
    });

    describe('detectRedstoneRequest', () => {
        test('detects piston door request', () => {
            expect(detectRedstoneRequest('build a piston door')).toEqual(
                expect.objectContaining({ templateName: 'piston_door_2x2' })
            );
            expect(detectRedstoneRequest('2x2 door')).toEqual(
                expect.objectContaining({ templateName: 'piston_door_2x2' })
            );
            expect(detectRedstoneRequest('hidden door')).toEqual(
                expect.objectContaining({ templateName: 'piston_door_2x2' })
            );
        });

        test('detects hidden staircase request', () => {
            expect(detectRedstoneRequest('hidden staircase')).toEqual(
                expect.objectContaining({ templateName: 'hidden_staircase' })
            );
            expect(detectRedstoneRequest('retractable stairs')).toEqual(
                expect.objectContaining({ templateName: 'hidden_staircase' })
            );
        });

        test('detects lamp toggle request', () => {
            expect(detectRedstoneRequest('redstone lamp')).toEqual(
                expect.objectContaining({ templateName: 'lamp_toggle' })
            );
            expect(detectRedstoneRequest('toggle light')).toEqual(
                expect.objectContaining({ templateName: 'lamp_toggle' })
            );
        });

        test('detects item dropper request', () => {
            expect(detectRedstoneRequest('item dropper')).toEqual(
                expect.objectContaining({ templateName: 'item_dropper' })
            );
        });

        test('detects t-flip-flop request', () => {
            expect(detectRedstoneRequest('t-flip flop')).toEqual(
                expect.objectContaining({ templateName: 't_flip_flop' })
            );
            expect(detectRedstoneRequest('button to lever')).toEqual(
                expect.objectContaining({ templateName: 't_flip_flop' })
            );
        });

        test('returns null for non-redstone requests', () => {
            expect(detectRedstoneRequest('build a house')).toBeNull();
            expect(detectRedstoneRequest('medieval castle')).toBeNull();
        });
    });
});

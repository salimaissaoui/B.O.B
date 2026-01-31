import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { CodeInterpreter } from '../../src/interpreter/code-interpreter.js';
import { createSandbox } from '../../src/interpreter/code-sandbox.js';

describe('Code Sandbox', () => {
    describe('createSandbox', () => {
        test('creates sandbox with build API', () => {
            const sandbox = createSandbox();
            expect(sandbox.api).toBeDefined();
            expect(sandbox.api.place).toBeInstanceOf(Function);
            expect(sandbox.api.fill).toBeInstanceOf(Function);
            expect(sandbox.api.sphere).toBeInstanceOf(Function);
            expect(sandbox.api.cylinder).toBeInstanceOf(Function);
        });

        test('place() adds step with correct format', () => {
            const sandbox = createSandbox();
            sandbox.api.place(10, 20, 30, 'stone');

            const steps = sandbox.getSteps();
            expect(steps).toHaveLength(1);
            expect(steps[0]).toEqual({
                op: 'set',
                pos: { x: 10, y: 20, z: 30 },
                block: 'stone'
            });
        });

        test('place() strips minecraft: prefix', () => {
            const sandbox = createSandbox();
            sandbox.api.place(0, 0, 0, 'minecraft:diamond_block');

            expect(sandbox.getSteps()[0].block).toBe('diamond_block');
        });

        test('fill() adds we_fill step', () => {
            const sandbox = createSandbox();
            sandbox.api.fill(0, 0, 0, 10, 5, 10, 'stone');

            const steps = sandbox.getSteps();
            expect(steps[0].op).toBe('we_fill');
            expect(steps[0].start).toEqual({ x: 0, y: 0, z: 0 });
            expect(steps[0].end).toEqual({ x: 10, y: 5, z: 10 });
        });

        test('fill() normalizes coordinates (min/max)', () => {
            const sandbox = createSandbox();
            sandbox.api.fill(10, 10, 10, 0, 0, 0, 'stone');

            const steps = sandbox.getSteps();
            expect(steps[0].start).toEqual({ x: 0, y: 0, z: 0 });
            expect(steps[0].end).toEqual({ x: 10, y: 10, z: 10 });
        });

        test('sphere() adds we_sphere step', () => {
            const sandbox = createSandbox();
            sandbox.api.sphere(50, 64, 50, 10, 'glass');

            const steps = sandbox.getSteps();
            expect(steps[0].op).toBe('we_sphere');
            expect(steps[0].center).toEqual({ x: 50, y: 64, z: 50 });
            expect(steps[0].radius).toBe(10);
        });

        test('sphere() hollow option uses we_hsphere', () => {
            const sandbox = createSandbox();
            sandbox.api.sphere(0, 0, 0, 5, 'glass', true);

            expect(sandbox.getSteps()[0].op).toBe('we_hsphere');
        });

        test('cylinder() adds we_cyl step', () => {
            const sandbox = createSandbox();
            sandbox.api.cylinder(0, 0, 0, 5, 10, 'stone');

            const steps = sandbox.getSteps();
            expect(steps[0].op).toBe('we_cyl');
            expect(steps[0].radius).toBe(5);
            expect(steps[0].height).toBe(10);
        });

        test('box() hollow option uses we_walls', () => {
            const sandbox = createSandbox();
            sandbox.api.box(0, 0, 0, 10, 10, 10, 'stone_bricks', true);

            expect(sandbox.getSteps()[0].op).toBe('we_walls');
        });

        test('enforces iteration limit', () => {
            const sandbox = createSandbox({ maxIterations: 5 });

            expect(() => {
                for (let i = 0; i < 10; i++) {
                    sandbox.api.place(i, 0, 0, 'stone');
                }
            }).toThrow('Maximum iterations exceeded');
        });

        test('records errors for invalid input', () => {
            const sandbox = createSandbox();
            sandbox.api.place('invalid', 0, 0, 'stone');
            sandbox.api.place(0, 0, 0, null);

            const errors = sandbox.getErrors();
            expect(errors.length).toBe(2);
        });

        test('floors floating point coordinates', () => {
            const sandbox = createSandbox();
            sandbox.api.place(1.7, 2.3, 3.9, 'stone');

            const steps = sandbox.getSteps();
            expect(steps[0].pos).toEqual({ x: 1, y: 2, z: 3 });
        });
    });
});

describe('Code Interpreter', () => {
    let interpreter;

    beforeEach(() => {
        interpreter = new CodeInterpreter({ enabled: true, maxIterations: 1000, timeoutMs: 2000 });
    });

    describe('validation', () => {
        test('rejects require()', () => {
            const result = interpreter.validate('require("fs")');
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('require');
        });

        test('rejects eval()', () => {
            const result = interpreter.validate('eval("1+1")');
            expect(result.valid).toBe(false);
        });

        test('rejects process access', () => {
            const result = interpreter.validate('process.exit()');
            expect(result.valid).toBe(false);
        });

        test('accepts valid build code', () => {
            const code = `
        for (let x = 0; x < 10; x++) {
          place(x, 0, 0, 'stone');
        }
      `;
            const result = interpreter.validate(code);
            expect(result.valid).toBe(true);
        });
    });

    describe('execution', () => {
        test('returns error when disabled', () => {
            const disabled = new CodeInterpreter({ enabled: false });
            const result = disabled.execute('place(0, 0, 0, "stone")');

            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain('disabled');
        });

        test('executes simple place command', () => {
            const result = interpreter.execute('place(0, 0, 0, "stone")');

            expect(result.success).toBe(true);
            expect(result.steps).toHaveLength(1);
            expect(result.steps[0].block).toBe('stone');
        });

        test('executes loop to generate spiral', () => {
            const code = `
        for (let i = 0; i < 20; i++) {
          const angle = i * 0.5;
          const x = Math.floor(Math.cos(angle) * 5);
          const z = Math.floor(Math.sin(angle) * 5);
          place(x, i, z, 'stone');
        }
      `;
            const result = interpreter.execute(code);

            expect(result.success).toBe(true);
            expect(result.steps.length).toBe(20);
        });

        test('executes fill commands', () => {
            const result = interpreter.execute('fill(0, 0, 0, 10, 5, 10, "oak_planks")');

            expect(result.success).toBe(true);
            expect(result.steps[0].op).toBe('we_fill');
        });

        test('handles syntax errors gracefully', () => {
            const result = interpreter.execute('place(0, 0, 0, "stone"');  // Missing )

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('handles runtime errors gracefully', () => {
            const result = interpreter.execute('throw new Error("test error")');

            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain('test error');
        });

        test('respects iteration limit', () => {
            const limited = new CodeInterpreter({ enabled: true, maxIterations: 10 });
            const code = `
        for (let i = 0; i < 100; i++) {
          place(i, 0, 0, 'stone');
        }
      `;
            const result = limited.execute(code);

            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain('iterations');
        });

        test('has access to Math', () => {
            const code = `
        const r = 5;
        for (let a = 0; a < Math.PI * 2; a += 0.5) {
          place(Math.round(Math.cos(a) * r), 0, Math.round(Math.sin(a) * r), 'stone');
        }
      `;
            const result = interpreter.execute(code);

            expect(result.success).toBe(true);
            expect(result.steps.length).toBeGreaterThan(0);
        });
    });

    describe('toBlueprint', () => {
        test('converts result to blueprint format', () => {
            const result = interpreter.execute(`
        fill(0, 0, 0, 10, 5, 10, 'stone');
        fill(1, 1, 1, 9, 4, 9, 'air');
      `);

            const blueprint = interpreter.toBlueprint(result, {
                buildType: 'box',
                description: 'Test box'
            });

            expect(blueprint.buildType).toBe('box');
            expect(blueprint.steps).toHaveLength(2);
            expect(blueprint.palette).toContain('stone');
            expect(blueprint.codeGenerated).toBe(true);
        });

        test('calculates correct dimensions', () => {
            const result = interpreter.execute(`
        place(0, 0, 0, 'stone');
        place(10, 20, 30, 'stone');
      `);

            const blueprint = interpreter.toBlueprint(result);

            expect(blueprint.size.width).toBe(11);
            expect(blueprint.size.height).toBe(21);
            expect(blueprint.size.depth).toBe(31);
        });

        test('throws on failed execution with no steps', () => {
            const result = interpreter.execute('throw new Error("fail")');

            expect(() => interpreter.toBlueprint(result)).toThrow();
        });
    });
});

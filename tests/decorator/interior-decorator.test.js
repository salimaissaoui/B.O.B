/**
 * Tests for Interior Decorator
 *
 * Verifies:
 * - Room detection from blueprint
 * - Room type classification
 * - Furniture placement
 */

const { InteriorDecorator } = await import('../../src/decorator/interior-decorator.js');

describe('InteriorDecorator', () => {
    let decorator;

    beforeEach(() => {
        decorator = new InteriorDecorator();
    });

    describe('constructor', () => {
        test('is enabled by default', () => {
            expect(decorator.enabled).toBe(true);
        });

        test('can be disabled via options', () => {
            const disabled = new InteriorDecorator({ enabled: false });
            expect(disabled.enabled).toBe(false);
        });
    });

    describe('detectRooms', () => {
        test('detects rooms from hollow_box operations', () => {
            const blueprint = {
                steps: [{
                    op: 'hollow_box',
                    from: { x: 0, y: 0, z: 0 },
                    to: { x: 10, y: 5, z: 10 },
                    block: 'stone_bricks'
                }]
            };

            const rooms = decorator.detectRooms(blueprint);
            expect(rooms.length).toBe(1);
            expect(rooms[0].size.width).toBe(9); // Interior width (10 - 1 - 1 + 1)
        });

        test('detects rooms from we_walls operations', () => {
            const blueprint = {
                steps: [{
                    op: 'we_walls',
                    from: { x: 5, y: 0, z: 5 },
                    to: { x: 15, y: 6, z: 15 },
                    block: 'cobblestone'
                }]
            };

            const rooms = decorator.detectRooms(blueprint);
            expect(rooms.length).toBe(1);
        });

        test('returns empty array for blueprints without walls', () => {
            const blueprint = {
                steps: [{ op: 'set', pos: { x: 0, y: 0, z: 0 }, block: 'stone' }]
            };

            const rooms = decorator.detectRooms(blueprint);
            expect(rooms.length).toBe(0);
        });
    });

    describe('classifyRoom', () => {
        // Based on current logic:
        // - storage: area <= 9
        // - library: area >= 25 AND height >= 4
        // - kitchen: area <= 16 AND (width <= 4 OR depth <= 4)
        // - bedroom: area <= 12 (after kitchen check, so area 10-12 with both dims > 4)
        // - living_room: everything else

        test('classifies very small rooms as storage', () => {
            const room = { size: { width: 3, height: 3, depth: 3 } }; // area = 9
            const type = decorator.classifyRoom(room, {});
            expect(type).toBe('storage');
        });

        test('classifies large tall rooms as library', () => {
            const room = { size: { width: 6, height: 5, depth: 6 } }; // area = 36, height = 5
            const type = decorator.classifyRoom(room, {});
            expect(type).toBe('library');
        });

        test('classifies narrow rooms as kitchen', () => {
            // Area 10-16 with one narrow dimension
            const room = { size: { width: 4, height: 3, depth: 3 } }; // area = 12, width = 4
            const type = decorator.classifyRoom(room, {});
            expect(type).toBe('kitchen');
        });

        test('classifies medium rooms as living_room', () => {
            // Area 17-24 falls to living_room
            const room = { size: { width: 5, height: 3, depth: 4 } }; // area = 20
            const type = decorator.classifyRoom(room, {});
            expect(type).toBe('living_room');
        });

        test('classifies large short rooms as living_room', () => {
            // Large but not tall enough for library
            const room = { size: { width: 6, height: 3, depth: 6 } }; // area = 36, height = 3
            const type = decorator.classifyRoom(room, {});
            expect(type).toBe('living_room');
        });
    });

    describe('getFurnitureForRoom', () => {
        test('returns essential furniture for bedroom', () => {
            const room = { type: 'bedroom', size: { width: 4, height: 3, depth: 4 } };
            const furniture = decorator.getFurnitureForRoom(room);

            const blocks = furniture.map(f => f.block);
            expect(blocks).toContain('red_bed');
            expect(blocks).toContain('chest');
        });

        test('returns essential furniture for kitchen', () => {
            const room = { type: 'kitchen', size: { width: 4, height: 3, depth: 4 } };
            const furniture = decorator.getFurnitureForRoom(room);

            const blocks = furniture.map(f => f.block);
            expect(blocks).toContain('furnace');
            expect(blocks).toContain('crafting_table');
        });

        test('adds more optional items for larger rooms', () => {
            const smallRoom = { type: 'living_room', size: { width: 3, height: 3, depth: 3 } };
            const largeRoom = { type: 'living_room', size: { width: 6, height: 3, depth: 6 } };

            const smallFurniture = decorator.getFurnitureForRoom(smallRoom);
            const largeFurniture = decorator.getFurnitureForRoom(largeRoom);

            expect(largeFurniture.length).toBeGreaterThan(smallFurniture.length);
        });
    });

    describe('decorate', () => {
        test('adds decoration steps to blueprint', () => {
            const blueprint = {
                steps: [{
                    op: 'hollow_box',
                    from: { x: 0, y: 0, z: 0 },
                    to: { x: 8, y: 4, z: 8 },
                    block: 'stone_bricks'
                }]
            };

            const decorated = decorator.decorate(blueprint);

            expect(decorated.steps.length).toBeGreaterThan(blueprint.steps.length);
            expect(decorated.interiorDecorated).toBe(true);
        });

        test('returns original blueprint when disabled', () => {
            const disabled = new InteriorDecorator({ enabled: false });
            const blueprint = { steps: [] };

            const result = disabled.decorate(blueprint);
            expect(result).toBe(blueprint);
        });

        test('decoration steps have furniture comments', () => {
            const blueprint = {
                steps: [{
                    op: 'hollow_box',
                    from: { x: 0, y: 0, z: 0 },
                    to: { x: 10, y: 5, z: 10 },
                    block: 'oak_planks'
                }]
            };

            const decorated = decorator.decorate(blueprint);
            const decorSteps = decorated.steps.filter(s => s.comment?.includes('Interior'));

            expect(decorSteps.length).toBeGreaterThan(0);
        });
    });

    describe('placeFurniture', () => {
        test('generates set operations for each furniture item', () => {
            const room = {
                type: 'bedroom',
                bounds: {
                    from: { x: 1, y: 0, z: 1 },
                    to: { x: 5, y: 3, z: 5 }
                },
                size: { width: 5, height: 4, depth: 5 }
            };

            const furniture = [{ block: 'chest', placement: 'floor' }];
            const steps = decorator.placeFurniture(room, furniture);

            expect(steps.length).toBe(1);
            expect(steps[0].op).toBe('set');
            expect(steps[0].block).toBe('chest');
        });

        test('avoids duplicate positions', () => {
            const room = {
                type: 'bedroom',
                bounds: {
                    from: { x: 0, y: 0, z: 0 },
                    to: { x: 2, y: 3, z: 2 }
                },
                size: { width: 3, height: 4, depth: 3 }
            };

            const furniture = [
                { block: 'chest', placement: 'floor' },
                { block: 'crafting_table', placement: 'floor' }
            ];

            const steps = decorator.placeFurniture(room, furniture);
            const positions = steps.map(s => `${s.pos.x},${s.pos.y},${s.pos.z}`);
            const uniquePositions = new Set(positions);

            expect(uniquePositions.size).toBe(positions.length);
        });
    });
});

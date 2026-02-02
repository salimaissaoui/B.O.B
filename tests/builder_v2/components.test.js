/**
 * Builder v2 Component Tests
 */

import { expandComponent, expandComponentTree, isValidComponent, listComponents } from '../../src/builder_v2/components/index.js';
import { createSeededRandom } from '../../src/builder_v2/utils/seed.js';

describe('Component Registry', () => {
  test('lists all available components', () => {
    const components = listComponents();
    expect(components).toContain('lattice_tower');
    expect(components).toContain('room');
    expect(components).toContain('roof_gable');
    expect(components).toContain('sphere');
    expect(components).toContain('statue_armature');
  });

  test('validates component types', () => {
    expect(isValidComponent('room')).toBe(true);
    expect(isValidComponent('lattice_tower')).toBe(true);
    expect(isValidComponent('nonexistent')).toBe(false);
  });
});

describe('Lattice Tower Component', () => {
  const rng = createSeededRandom(12345);

  test('generates geometry primitives', () => {
    const node = {
      id: 'tower1',
      type: 'lattice_tower',
      transform: { position: { x: 0, y: 0, z: 0 } },
      params: {
        height: 50,
        baseWidth: 20,
        taperRatio: 0.2
      }
    };

    const primitives = expandComponent(node, rng);
    expect(primitives.length).toBeGreaterThan(0);

    // Check that primitives have required properties
    for (const prim of primitives) {
      expect(prim.type).toBeDefined();
      expect(prim.block).toBeDefined();
    }
  });

  test('includes platforms at specified ratios', () => {
    const node = {
      id: 'tower1',
      type: 'lattice_tower',
      transform: { position: { x: 0, y: 0, z: 0 } },
      params: {
        height: 100,
        baseWidth: 40,
        platforms: [
          { heightRatio: 0.33 },
          { heightRatio: 0.66 }
        ]
      }
    };

    const primitives = expandComponent(node, rng);
    // Should have platform primitives (type: 'box')
    const boxes = primitives.filter(p => p.type === 'box');
    expect(boxes.length).toBeGreaterThan(0);
  });
});

describe('Room Component', () => {
  const rng = createSeededRandom(12345);

  test('generates walls and floor', () => {
    const node = {
      id: 'room1',
      type: 'room',
      transform: { position: { x: 0, y: 0, z: 0 } },
      params: {
        width: 10,
        height: 5,
        depth: 10
      }
    };

    const primitives = expandComponent(node, rng);
    expect(primitives.length).toBeGreaterThan(0);

    // Should have hollow_box for walls
    const hollowBoxes = primitives.filter(p => p.type === 'hollow_box');
    expect(hollowBoxes.length).toBeGreaterThan(0);
  });

  test('handles openings', () => {
    const node = {
      id: 'room1',
      type: 'room',
      transform: { position: { x: 0, y: 0, z: 0 } },
      params: {
        width: 10,
        height: 5,
        depth: 10,
        openings: [
          { type: 'door', wall: 'south' },
          { type: 'window', wall: 'east', yOffset: 1 }
        ]
      }
    };

    const primitives = expandComponent(node, rng);
    // Should have air blocks for openings
    const airBlocks = primitives.filter(p => p.block === 'air');
    expect(airBlocks.length).toBeGreaterThan(0);
  });
});

describe('Sphere Component', () => {
  const rng = createSeededRandom(12345);

  test('generates sphere primitive', () => {
    const node = {
      id: 'sphere1',
      type: 'sphere',
      transform: { position: { x: 10, y: 10, z: 10 } },
      params: {
        radius: 5,
        hollow: false
      }
    };

    const primitives = expandComponent(node, rng);
    expect(primitives.length).toBe(1);
    expect(primitives[0].type).toBe('sphere');
    expect(primitives[0].radius).toBe(5);
    expect(primitives[0].center).toEqual({ x: 10, y: 10, z: 10 });
  });
});

describe('Statue Armature Component', () => {
  const rng = createSeededRandom(12345);

  test('generates humanoid armature', () => {
    const node = {
      id: 'statue1',
      type: 'statue_armature',
      transform: { position: { x: 0, y: 0, z: 0 } },
      params: {
        height: 20,
        style: 'humanoid'
      }
    };

    const primitives = expandComponent(node, rng);
    expect(primitives.length).toBeGreaterThan(0);

    // Should have cylinders for limbs and spheres for joints/head
    const cylinders = primitives.filter(p => p.type === 'cylinder');
    const spheres = primitives.filter(p => p.type === 'sphere');
    expect(cylinders.length).toBeGreaterThan(0);
    expect(spheres.length).toBeGreaterThan(0);
  });

  test('generates quadruped armature', () => {
    const node = {
      id: 'creature1',
      type: 'statue_armature',
      transform: { position: { x: 0, y: 0, z: 0 } },
      params: {
        height: 15,
        style: 'quadruped'
      }
    };

    const primitives = expandComponent(node, rng);
    // Quadruped should have 4 leg cylinders
    const cylinders = primitives.filter(p => p.type === 'cylinder');
    expect(cylinders.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Component Tree Expansion', () => {
  const rng = createSeededRandom(12345);

  test('expands nested components', () => {
    const tree = {
      id: 'building',
      type: 'room',
      transform: { position: { x: 0, y: 0, z: 0 } },
      params: { width: 10, height: 5, depth: 10 },
      children: [
        {
          id: 'roof',
          type: 'roof_gable',
          transform: { position: { x: 0, y: 6, z: 0 } },
          params: { width: 12, depth: 12, pitch: 0.5 }
        }
      ]
    };

    const primitives = expandComponentTree(tree, rng);
    expect(primitives.length).toBeGreaterThan(0);

    // Should have both room and roof primitives
    const roomPrims = primitives.filter(p => p.sourceComponent === 'building');
    const roofPrims = primitives.filter(p => p.sourceComponent === 'roof');
    expect(roomPrims.length).toBeGreaterThan(0);
    expect(roofPrims.length).toBeGreaterThan(0);
  });

  test('applies parent position offset to children', () => {
    const tree = {
      id: 'base',
      type: 'platform',
      transform: { position: { x: 100, y: 50, z: 100 } },
      params: { width: 5, depth: 5 },
      children: [
        {
          id: 'column',
          type: 'column',
          transform: { position: { x: 2, y: 1, z: 2 } },
          params: { height: 8 }
        }
      ]
    };

    const primitives = expandComponentTree(tree, rng);
    const columnPrims = primitives.filter(p => p.sourceComponent === 'column');

    // Column should be at parent position + child offset
    // Check that at least one primitive has y > 50
    const hasOffsetY = columnPrims.some(p =>
      (p.from?.y > 50) || (p.base?.y > 50) || (p.pos?.y > 50)
    );
    expect(hasOffsetY).toBe(true);
  });
});

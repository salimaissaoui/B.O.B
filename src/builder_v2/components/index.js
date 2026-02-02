/**
 * Builder v2 Component Registry
 *
 * Central registry for all parametric building components.
 * Components generate GeometryPrimitive arrays from parameters.
 */

import { latticeTower } from './structural/lattice-tower.js';
import { arch } from './structural/arch.js';
import { column } from './structural/column.js';
import { platform } from './structural/platform.js';
import { staircase } from './structural/staircase.js';
import { room } from './rooms/room.js';
import { roofGable } from './roofs/roof-gable.js';
import { roofDome } from './roofs/roof-dome.js';
import { sphere } from './organic/sphere.js';
import { cylinder } from './organic/cylinder.js';
import { statueArmature } from './organic/statue-armature.js';
import { box, wall } from './primitives.js';

/**
 * Component registry mapping type names to generator functions
 */
export const COMPONENT_REGISTRY = {
  // Structural
  lattice_tower: latticeTower,
  arch: arch,
  column: column,
  platform: platform,
  staircase: staircase,

  // Rooms
  room: room,

  // Roofs
  roof_gable: roofGable,
  roof_dome: roofDome,

  // Organic
  sphere: sphere,
  cylinder: cylinder,
  statue_armature: statueArmature,

  // Primitives
  box: box,
  wall: wall
};

/**
 * Check if a component type is registered
 * @param {string} type - Component type name
 * @returns {boolean}
 */
export function isValidComponent(type) {
  return type in COMPONENT_REGISTRY;
}

/**
 * Get component generator function
 * @param {string} type - Component type name
 * @returns {Function|null}
 */
export function getComponent(type) {
  return COMPONENT_REGISTRY[type] || null;
}

/**
 * List all available component types
 * @returns {string[]}
 */
export function listComponents() {
  return Object.keys(COMPONENT_REGISTRY);
}

/**
 * Expand a component node into geometry primitives
 * @param {Object} node - ComponentNode from BuildSceneV2
 * @param {Object} rng - Seeded random generator
 * @param {string} theme - Theme for material resolution
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function expandComponent(node, rng, theme = 'default') {
  const generator = COMPONENT_REGISTRY[node.type];

  if (!generator) {
    console.warn(`[ComponentRegistry] Unknown component type: ${node.type}`);
    return [];
  }

  // Apply transform to position
  const basePosition = node.transform?.position || { x: 0, y: 0, z: 0 };
  const rotation = node.transform?.rotation || 0;
  const scale = node.transform?.scale || 1;

  // Generate primitives from component
  const primitives = generator({
    ...node.params,
    position: basePosition,
    rotation,
    scale,
    materials: node.materials || {},
    rng,
    theme
  });

  // Tag primitives with source component
  return primitives.map(prim => ({
    ...prim,
    sourceComponent: node.id
  }));
}

/**
 * Recursively expand component tree
 * @param {Object} node - ComponentNode (may have children)
 * @param {Object} rng - Seeded random generator
 * @param {string} theme - Theme
 * @returns {Object[]} All geometry primitives
 */
export function expandComponentTree(node, rng, theme = 'default') {
  const primitives = expandComponent(node, rng, theme);

  // Expand children
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      // Child positions are relative to parent
      const childWithOffset = {
        ...child,
        transform: {
          ...child.transform,
          position: {
            x: (node.transform?.position?.x || 0) + (child.transform?.position?.x || 0),
            y: (node.transform?.position?.y || 0) + (child.transform?.position?.y || 0),
            z: (node.transform?.position?.z || 0) + (child.transform?.position?.z || 0)
          }
        }
      };
      primitives.push(...expandComponentTree(childWithOffset, rng, theme));
    }
  }

  return primitives;
}

export default {
  COMPONENT_REGISTRY,
  isValidComponent,
  getComponent,
  listComponents,
  expandComponent,
  expandComponentTree
};

/**
 * Builder v2 Plan Compiler
 *
 * Compiles BuildSceneV2 into deterministic BuildPlanV2.
 * Expands components, applies style, runs detail passes.
 */

import { expandComponentTree, isValidComponent } from '../components/index.js';
import { resolvePalette, resolveBlock } from '../style/engine.js';
import { createSeededRandom, seedFromBuildId } from '../utils/seed.js';
import { hashBuildPlan } from '../utils/hash.js';
import { validatePlan } from '../validate/validators.js';

/**
 * Compile BuildSceneV2 into BuildPlanV2
 * @param {Object} scene - BuildSceneV2 object
 * @param {Object} options - Compilation options
 * @param {number} options.seed - Random seed for determinism
 * @param {string} options.serverVersion - Server version for block validation
 * @returns {Object} BuildPlanV2 object
 */
export function compilePlan(scene, options = {}) {
  const {
    seed = seedFromBuildId(scene.intentId || 'default'),
    serverVersion = '1.20.1'
  } = options;

  console.log(`  [PlanCompiler] Compiling scene: ${scene.description?.title || 'Untitled'}`);
  console.log(`  [PlanCompiler] Seed: ${seed}`);

  // Create seeded RNG
  const rng = createSeededRandom(seed);

  // Resolve palette
  const theme = scene.style?.theme || 'default';
  const rawPalette = scene.style?.palette || {};
  const palette = resolvePalette(rawPalette, theme, serverVersion);

  console.log(`  [PlanCompiler] Theme: ${theme}, Palette keys: ${Object.keys(palette).join(', ')}`);

  // Expand all components into geometry primitives
  let geometry = [];
  let componentsExpanded = 0;

  for (const component of scene.components || []) {
    if (!isValidComponent(component.type)) {
      console.warn(`  [PlanCompiler] Unknown component type: ${component.type}, using box fallback`);
      component.type = 'box';
    }

    const primitives = expandComponentTree(component, rng, theme);
    geometry.push(...primitives);
    componentsExpanded++;
  }

  console.log(`  [PlanCompiler] Expanded ${componentsExpanded} components into ${geometry.length} primitives`);

  // Apply detail passes
  let detailPassesApplied = 0;
  for (const pass of scene.detailPasses || []) {
    const passResult = applyDetailPass(geometry, pass, rng, scene.bounds);
    geometry = passResult.geometry;
    detailPassesApplied++;
    console.log(`  [PlanCompiler] Applied detail pass: ${pass} (+${passResult.added} primitives)`);
  }

  // Resolve all block references in geometry
  geometry = geometry.map((prim, idx) => {
    let resolvedBlock = prim.block;

    if (resolvedBlock) {
      // Handle palette references ($primary, $secondary, etc.)
      if (resolvedBlock.startsWith('$')) {
        const paletteKey = resolvedBlock.slice(1);
        resolvedBlock = palette[paletteKey] || resolveBlock(resolvedBlock, theme, serverVersion);
      } else {
        resolvedBlock = resolveBlock(resolvedBlock, theme, serverVersion);
      }
    }

    return {
      ...prim,
      id: prim.id || `prim_${idx}`,
      block: resolvedBlock
    };
  });

  // Calculate statistics
  const blockCounts = {};
  let totalBlocks = 0;

  for (const prim of geometry) {
    const estimated = estimatePrimitiveBlocks(prim);
    totalBlocks += estimated;

    if (prim.block) {
      blockCounts[prim.block] = (blockCounts[prim.block] || 0) + estimated;
    }
  }

  // Build plan object
  const plan = {
    version: '2.0',
    sceneId: scene.intentId,
    hash: '', // Will be set after full construction
    seed,
    bounds: { ...scene.bounds },
    palette,
    geometry,
    stats: {
      totalBlocks,
      uniqueBlocks: Object.keys(blockCounts).length,
      componentsExpanded,
      detailPassesApplied
    }
  };

  // Calculate deterministic hash
  plan.hash = hashBuildPlan(plan);

  console.log(`  [PlanCompiler] Plan hash: ${plan.hash.substring(0, 16)}...`);
  console.log(`  [PlanCompiler] Stats: ${totalBlocks} blocks, ${plan.stats.uniqueBlocks} types`);

  return plan;
}

/**
 * Estimate block count for a primitive
 */
function estimatePrimitiveBlocks(prim) {
  switch (prim.type) {
    case 'set':
      return 1;
    case 'line':
      if (prim.from && prim.to) {
        const dx = Math.abs(prim.to.x - prim.from.x);
        const dy = Math.abs(prim.to.y - prim.from.y);
        const dz = Math.abs(prim.to.z - prim.from.z);
        return Math.max(dx, dy, dz) + 1;
      }
      return 10;
    case 'box':
      if (prim.from && prim.to) {
        const w = Math.abs(prim.to.x - prim.from.x) + 1;
        const h = Math.abs(prim.to.y - prim.from.y) + 1;
        const d = Math.abs(prim.to.z - prim.from.z) + 1;
        return w * h * d;
      }
      return 100;
    case 'hollow_box':
      if (prim.from && prim.to) {
        const w = Math.abs(prim.to.x - prim.from.x) + 1;
        const h = Math.abs(prim.to.y - prim.from.y) + 1;
        const d = Math.abs(prim.to.z - prim.from.z) + 1;
        const inner = Math.max(0, w - 2) * Math.max(0, h - 2) * Math.max(0, d - 2);
        return w * h * d - inner;
      }
      return 80;
    case 'sphere':
      if (prim.radius) {
        const r = prim.radius;
        const volume = (4 / 3) * Math.PI * r * r * r;
        return prim.hollow ? Math.round(volume * 0.3) : Math.round(volume);
      }
      return 500;
    case 'cylinder':
      if (prim.radius && prim.height) {
        const r = prim.radius;
        const h = prim.height;
        const volume = Math.PI * r * r * h;
        return prim.hollow ? Math.round(volume * 0.3) : Math.round(volume);
      }
      return 300;
    case 'stairs':
    case 'slab':
    case 'door':
      return 1;
    default:
      return 50;
  }
}

/**
 * Apply a detail pass to geometry
 */
function applyDetailPass(geometry, passName, rng, bounds) {
  const added = [];

  switch (passName) {
    case 'lighting':
      // Add lanterns at intervals
      added.push(...generateLighting(geometry, rng, bounds));
      break;

    case 'edge_trim':
      // Add trim blocks to corners
      added.push(...generateEdgeTrim(geometry, rng));
      break;

    case 'interior_furnish':
      // This would need room detection - simplified version
      added.push(...generateBasicFurniture(geometry, rng));
      break;

    case 'landscaping':
      // Add grass/flowers around base
      added.push(...generateLandscaping(geometry, rng, bounds));
      break;

    default:
      console.warn(`  [PlanCompiler] Unknown detail pass: ${passName}`);
  }

  return {
    geometry: [...geometry, ...added],
    added: added.length
  };
}

/**
 * Generate lighting primitives
 */
function generateLighting(geometry, rng, bounds) {
  const lights = [];
  const spacing = 8;
  let lightIdx = 0;

  // Find floor level
  const floors = geometry.filter(g => g.type === 'box' && g.layer === 0);

  if (floors.length > 0) {
    // Add lights along floors
    for (const floor of floors) {
      if (!floor.from || !floor.to) continue;

      for (let x = floor.from.x; x <= floor.to.x; x += spacing) {
        for (let z = floor.from.z; z <= floor.to.z; z += spacing) {
          if (rng.bool(0.5)) {
            lights.push({
              id: `light_${lightIdx++}`,
              type: 'set',
              pos: { x, y: floor.from.y + 1, z },
              block: '$light',
              layer: 100
            });
          }
        }
      }
    }
  } else {
    // Add lights at corners of bounds
    const positions = [
      { x: 2, z: 2 },
      { x: bounds.width - 3, z: 2 },
      { x: 2, z: bounds.depth - 3 },
      { x: bounds.width - 3, z: bounds.depth - 3 }
    ];

    for (const pos of positions) {
      lights.push({
        id: `light_${lightIdx++}`,
        type: 'set',
        pos: { x: pos.x, y: 1, z: pos.z },
        block: '$light',
        layer: 100
      });
    }
  }

  return lights;
}

/**
 * Generate edge trim primitives
 */
function generateEdgeTrim(geometry, rng) {
  // Simplified - just return empty for now
  return [];
}

/**
 * Generate basic furniture primitives
 */
function generateBasicFurniture(geometry, rng) {
  // Simplified - would need room detection
  return [];
}

/**
 * Generate landscaping primitives
 */
function generateLandscaping(geometry, rng, bounds) {
  const landscaping = [];

  // Add a few grass blocks around the edge
  for (let i = 0; i < 8; i++) {
    const x = rng.int(0, bounds.width - 1);
    const z = rng.int(0, bounds.depth - 1);

    landscaping.push({
      id: `landscape_${i}`,
      type: 'set',
      pos: { x, y: 0, z },
      block: rng.pick(['grass_block', 'dirt', 'coarse_dirt']),
      layer: 99
    });
  }

  return landscaping;
}

/**
 * Verify plan determinism
 */
export function verifyDeterminism(scene, seed) {
  const plan1 = compilePlan(scene, { seed });
  const plan2 = compilePlan(scene, { seed });

  return plan1.hash === plan2.hash;
}

export default {
  compilePlan,
  verifyDeterminism,
  estimatePrimitiveBlocks
};

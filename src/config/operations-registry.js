/**
 * Operations Registry
 * Maps operation types to handlers and metadata
 */

export const OPERATIONS_REGISTRY = {
  // Universal Operations (New Standard)
  box: {
    handler: 'box',
    type: 'universal',
    avgBlocksPerOp: 100,
    complexity: 1,
    requiredOneOf: [['size', 'from', 'to']],
    requiredParams: ['block'],
    description: 'Creates a solid volume (universal optimized)'
  },

  wall: {
    handler: 'wall',
    type: 'universal',
    avgBlocksPerOp: 80,
    complexity: 2,
    requiredOneOf: [['size', 'from', 'to']],
    requiredParams: ['block'],
    description: 'Creates hollow walls (universal optimized)'
  },

  outline: {
    handler: 'outline',
    type: 'universal',
    avgBlocksPerOp: 40,
    complexity: 2,
    requiredOneOf: [['size', 'from', 'to']],
    requiredParams: ['block'],
    description: 'Creates a wireframe outline'
  },

  move: {
    handler: 'move',
    type: 'universal',
    avgBlocksPerOp: 0,
    complexity: 1,
    requiredParams: ['offset'],
    description: 'Moves the build cursor'
  },

  cursor_reset: {
    handler: 'cursor_reset',
    type: 'universal',
    avgBlocksPerOp: 0,
    complexity: 1,
    requiredParams: [],
    description: 'Resets cursor to origin'
  },

  // Vanilla operations (existing)
  fill: {
    handler: 'fill',
    type: 'vanilla',
    avgBlocksPerOp: 100,
    complexity: 1,
    requiredParams: ['block', 'from', 'to'],
    description: 'Fills a rectangular region with blocks'
  },

  hollow_box: {
    handler: 'hollow-box',
    type: 'vanilla',
    avgBlocksPerOp: 80,
    complexity: 2,
    requiredParams: ['block', 'from', 'to'],
    description: 'Creates a hollow rectangular structure'
  },

  set: {
    handler: 'set',
    type: 'vanilla',
    avgBlocksPerOp: 1,
    complexity: 1,
    requiredParams: ['block', 'pos'],
    description: 'Places a single block'
  },

  line: {
    handler: 'line',
    type: 'vanilla',
    avgBlocksPerOp: 10,
    complexity: 1,
    requiredParams: ['block', 'from', 'to'],
    description: 'Creates a line of blocks'
  },

  window_strip: {
    handler: 'window-strip',
    type: 'vanilla',
    avgBlocksPerOp: 5,
    complexity: 2,
    requiredParams: ['block', 'from', 'to'],
    description: 'Creates a row of windows with spacing'
  },

  roof_gable: {
    handler: 'roof-gable',
    type: 'vanilla',
    avgBlocksPerOp: 50,
    complexity: 3,
    requiredParams: ['block', 'from', 'to', 'peakHeight'],
    description: 'Creates a triangular gable roof'
  },

  roof_flat: {
    handler: 'roof-flat',
    type: 'vanilla',
    avgBlocksPerOp: 30,
    complexity: 1,
    requiredParams: ['block', 'from', 'to'],
    description: 'Creates a flat roof'
  },

  site_prep: {
    handler: 'site-prep',
    type: 'system',
    avgBlocksPerOp: 0,
    complexity: 1,
    requiredParams: [],
    description: 'Clears the build area before starting'
  },

  // WorldEdit operations (new)
  we_fill: {
    handler: 'we-fill',
    type: 'worldedit',
    avgBlocksPerOp: 5000,
    complexity: 1,
    fallback: 'fill',
    requiredParams: ['block', 'from', 'to'],
    description: 'WorldEdit: Fills large rectangular regions (up to 50k blocks)'
  },

  we_walls: {
    handler: 'we-walls',
    type: 'worldedit',
    avgBlocksPerOp: 2000,
    complexity: 2,
    fallback: 'hollow_box',
    requiredParams: ['block', 'from', 'to'],
    description: 'WorldEdit: Creates hollow structures (walls only)'
  },

  we_pyramid: {
    handler: 'we-pyramid',
    type: 'worldedit',
    avgBlocksPerOp: 3000,
    complexity: 3,
    fallback: 'roof_gable',
    requiredParams: ['block', 'height'],
    requiredOneOf: [['base', 'pos']],
    description: 'WorldEdit: Creates pyramids or roofs'
  },

  we_cylinder: {
    handler: 'we-cylinder',
    type: 'worldedit',
    avgBlocksPerOp: 4000,
    complexity: 3,
    fallback: null,
    requiredParams: ['block', 'radius', 'height'],
    requiredOneOf: [['base', 'pos']],
    description: 'WorldEdit: Creates cylindrical towers'
  },

  we_sphere: {
    handler: 'we-sphere',
    type: 'worldedit',
    avgBlocksPerOp: 3000,
    complexity: 3,
    fallback: null,
    requiredParams: ['block', 'radius'],
    requiredOneOf: [['center', 'pos', 'base']],
    description: 'WorldEdit: Creates spherical domes'
  },

  we_replace: {
    handler: 'we-replace',
    type: 'worldedit',
    avgBlocksPerOp: 2000,
    complexity: 2,
    fallback: null,
    requiredParams: ['from', 'to', 'fromBlock', 'toBlock'],
    description: 'WorldEdit: Replaces blocks in selection'
  },

  // New Primitives (FAWE)
  sphere: {
    handler: 'sphere',
    type: 'worldedit',
    avgBlocksPerOp: 1000,
    complexity: 2,
    requiredParams: ['block', 'radius'],
    description: 'Creates a filled sphere using FAWE async commands'
  },

  cylinder: {
    handler: 'cylinder',
    type: 'worldedit',
    avgBlocksPerOp: 1500,
    complexity: 2,
    requiredParams: ['block', 'radius', 'height'],
    description: 'Creates a filled cylinder using FAWE async commands'
  },


  // Detail operations (new - vanilla)
  stairs: {
    handler: 'stairs',
    type: 'vanilla',
    avgBlocksPerOp: 1,
    complexity: 2,
    requiresOrientation: true,
    requiredParams: ['block', 'pos'],
    blockSuffix: 'stairs',
    description: 'Places oriented stair blocks'
  },

  slab: {
    handler: 'slab',
    type: 'vanilla',
    avgBlocksPerOp: 1,
    complexity: 2,
    requiredParams: ['block', 'pos'],
    blockSuffix: 'slab',
    description: 'Places top or bottom slab blocks'
  },

  fence_connect: {
    handler: 'fence-connect',
    type: 'vanilla',
    avgBlocksPerOp: 10,
    complexity: 2,
    requiredParams: ['block', 'from', 'to'],
    blockSuffix: 'fence',
    description: 'Creates auto-connecting fence lines'
  },

  door: {
    handler: 'door',
    type: 'vanilla',
    avgBlocksPerOp: 2,
    complexity: 2,
    requiresOrientation: true,
    requiredParams: ['block', 'pos'],
    blockSuffix: 'door',
    description: 'Places door with proper orientation'
  },

  // Complex operations (new - vanilla)
  spiral_staircase: {
    handler: 'spiral-staircase',
    type: 'vanilla',
    avgBlocksPerOp: 20,
    complexity: 4,
    requiredParams: ['block', 'base', 'height'],
    blockSuffix: 'stairs',
    description: 'Creates a spiral staircase'
  },

  balcony: {
    handler: 'balcony',
    type: 'vanilla',
    avgBlocksPerOp: 30,
    complexity: 3,
    requiredParams: ['block', 'base'],
    description: 'Creates a protruding balcony with railing'
  },

  roof_hip: {
    handler: 'roof-hip',
    type: 'vanilla',
    avgBlocksPerOp: 60,
    complexity: 4,
    requiredParams: ['block', 'from', 'to'],
    description: 'Creates a four-sided hip roof'
  },

  pixel_art: {
    handler: 'pixel-art',
    type: 'vanilla',
    avgBlocksPerOp: 100,
    complexity: 3,
    requiredParams: ['base', 'grid'],
    description: 'Creates 2D pixel art from a grid'
  },

  // NEW: 3D Layered Generation (Success Pattern from Pixel Art)
  // Each layer is a 2D grid of characters representing blocks
  // Index 0 is bottom layer (Y=0 relative to base)
  three_d_layers: {
    handler: 'three-d-layers',
    type: 'vanilla',
    avgBlocksPerOp: 1000,
    complexity: 4,
    requiredParams: ['base', 'layers', 'legend'],
    description: 'Creates 3D structures from stacked 2D grids (slices)'
  },

  // Smart Operations (High-Level Procedural Tools)
  //
  // SMART VS LEGACY OPERATIONS:
  // Smart operations provide high-level procedural generation with patterns/styles,
  // designed for AI-friendly usage where architectural variety is desired.
  // Legacy operations provide precise, low-level control for explicit building.
  //
  // WHEN TO USE SMART OPERATIONS:
  // - When creating structures with architectural patterns (checkered, tiled, etc.)
  // - When variety and procedural detail are desired
  // - When LLM should have creative freedom in pattern selection
  //
  // WHEN TO USE LEGACY OPERATIONS:
  // - When precise block placement is required
  // - When replicating exact designs or blueprints
  // - When performance is critical (smart ops generate more blocks)
  //
  // OVERLAP EXAMPLES:
  // - smart_wall with pattern='solid' ≈ fill (but smart_wall offers patterns)
  // - smart_roof with style='gable' ≈ roof_gable (but smart_roof offers more styles)
  // - smart_floor with pattern='solid' ≈ roof_flat (but smart_floor offers patterns)
  //
  smart_wall: {
    handler: 'smart-wall',
    type: 'smart',
    avgBlocksPerOp: 200,
    complexity: 3,
    requiredParams: ['from', 'to', 'palette'],
    description: 'Procedurally generated wall with patterns (solid, striped, checkered, border)'
  },

  smart_floor: {
    handler: 'smart-floor',
    type: 'smart',
    avgBlocksPerOp: 400,
    complexity: 3,
    requiredParams: ['from', 'to', 'palette'],
    description: 'Procedurally generated floor with patterns (parquet, tiled, radial)'
  },

  smart_roof: {
    handler: 'smart-roof',
    type: 'smart',
    avgBlocksPerOp: 500,
    complexity: 4,
    requiredParams: ['from', 'to', 'block'],
    description: 'Procedurally generated roof with styles (A-frame, dome, pagoda)'
  }
};

/**
 * Get operation metadata by operation name
 */
export function getOperationMetadata(opName) {
  return OPERATIONS_REGISTRY[opName] || null;
}

/**
 * Get all operations of a specific type
 */
export function getOperationsByType(type) {
  return Object.entries(OPERATIONS_REGISTRY)
    .filter(([_, meta]) => meta.type === type)
    .map(([name, _]) => name);
}

/**
 * Check if operation is a WorldEdit operation
 */
export function isWorldEditOperation(opName) {
  const meta = getOperationMetadata(opName);
  return meta && meta.type === 'worldedit';
}

/**
 * Get fallback operation for WorldEdit operation
 */
export function getFallbackOperation(opName) {
  const meta = getOperationMetadata(opName);
  return meta && meta.fallback ? meta.fallback : null;
}

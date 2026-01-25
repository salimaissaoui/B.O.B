/**
 * Operations Registry
 * Maps operation types to handlers and metadata
 */

export const OPERATIONS_REGISTRY = {
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

  // WorldEdit operations (new)
  we_fill: {
    handler: 'we-fill',
    type: 'worldedit',
    avgBlocksPerOp: 5000,
    complexity: 1,
    fallback: 'fill',
    requiredParams: ['block', 'from', 'to', 'fallback'],
    description: 'WorldEdit: Fills large rectangular regions (up to 50k blocks)'
  },

  we_walls: {
    handler: 'we-walls',
    type: 'worldedit',
    avgBlocksPerOp: 2000,
    complexity: 2,
    fallback: 'hollow_box',
    requiredParams: ['block', 'from', 'to', 'fallback'],
    description: 'WorldEdit: Creates hollow structures (walls only)'
  },

  we_pyramid: {
    handler: 'we-pyramid',
    type: 'worldedit',
    avgBlocksPerOp: 3000,
    complexity: 3,
    fallback: 'roof_gable',
    requiredParams: ['block', 'height', 'fallback'],
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

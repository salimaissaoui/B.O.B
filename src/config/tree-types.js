/**
 * Tree Type Definitions
 *
 * Defines different tree archetypes with specific characteristics:
 * - Silhouette and canopy shape
 * - Height ranges
 * - Branch patterns
 * - Trunk characteristics
 * - Randomization parameters
 */

export const TREE_TYPES = {
  oak: {
    name: 'Oak Tree',
    keywords: ['oak'],
    description: 'Wide spreading canopy with thick trunk, classic tree shape',

    dimensions: {
      simple: { width: 11, height: 15, depth: 11 },
      medium: { width: 15, height: 20, depth: 15 },
      detailed: { width: 19, height: 25, depth: 19 }
    },

    trunk: {
      baseWidth: 3,      // 3x3 at bottom
      taperLevels: 3,    // Tapers in 3 sections
      minHeight: 8,
      maxHeight: 12,
      material: 'oak_log'
    },

    branches: {
      count: { min: 6, max: 10 },
      startHeight: 0.6,   // Start at 60% of trunk height
      angle: 'horizontal', // Mostly horizontal
      length: { min: 4, max: 6 },
      material: 'oak_log'
    },

    canopy: {
      shape: 'spreading',  // Wide and spreading
      layers: 3,           // Multiple canopy layers
      radius: { min: 4, max: 6 },
      heightAboveTrunk: 3,
      asymmetry: 0.3,      // 30% position variance
      material: 'oak_leaves'
    },

    variation: {
      heightVariance: 0.2,      // ±20% height
      widthVariance: 0.2,       // ±20% width
      branchAngleVariance: 15,  // ±15 degrees
      asymmetricCanopy: true    // Canopy not centered
    }
  },

  birch: {
    name: 'Birch Tree',
    keywords: ['birch'],
    description: 'Tall and slender with narrow canopy, elegant appearance',

    dimensions: {
      simple: { width: 7, height: 12, depth: 7 },
      medium: { width: 9, height: 18, depth: 9 },
      detailed: { width: 11, height: 24, depth: 11 }
    },

    trunk: {
      baseWidth: 1,      // Thin 1x1 trunk
      taperLevels: 2,
      minHeight: 10,
      maxHeight: 16,
      material: 'birch_log'
    },

    branches: {
      count: { min: 4, max: 7 },
      startHeight: 0.7,   // Branches higher up
      angle: 'upward',    // Angled upward
      length: { min: 2, max: 4 },
      material: 'birch_log'
    },

    canopy: {
      shape: 'narrow',     // Tall and narrow
      layers: 2,
      radius: { min: 2, max: 4 },
      heightAboveTrunk: 4,
      asymmetry: 0.2,
      material: 'birch_leaves'
    },

    variation: {
      heightVariance: 0.25,
      widthVariance: 0.15,
      branchAngleVariance: 10,
      asymmetricCanopy: false
    }
  },

  spruce: {
    name: 'Spruce Tree',
    keywords: ['spruce', 'pine', 'conifer', 'evergreen'],
    description: 'Conical shape with downward-angling branches, Christmas tree',

    dimensions: {
      simple: { width: 9, height: 20, depth: 9 },
      medium: { width: 13, height: 30, depth: 13 },
      detailed: { width: 17, height: 40, depth: 17 }
    },

    trunk: {
      baseWidth: 2,      // 2x2 trunk
      taperLevels: 3,
      minHeight: 15,
      maxHeight: 25,
      material: 'spruce_log'
    },

    branches: {
      count: { min: 8, max: 14 },
      startHeight: 0.3,   // Branches start lower
      angle: 'downward',  // Drooping branches
      length: { min: 3, max: 5 },
      material: 'spruce_log'
    },

    canopy: {
      shape: 'conical',    // Cone/pyramid shape
      layers: 5,           // Many layers
      radius: { min: 3, max: 5 },
      heightAboveTrunk: 2,
      asymmetry: 0.1,      // Mostly symmetric
      material: 'spruce_leaves'
    },

    variation: {
      heightVariance: 0.2,
      widthVariance: 0.15,
      branchAngleVariance: 8,
      asymmetricCanopy: false
    }
  },

  jungle: {
    name: 'Jungle Tree',
    keywords: ['jungle', 'tropical'],
    description: 'Massive tree with multiple canopy layers and thick trunk',

    dimensions: {
      simple: { width: 17, height: 25, depth: 17 },
      medium: { width: 23, height: 35, depth: 23 },
      detailed: { width: 31, height: 45, depth: 31 }
    },

    trunk: {
      baseWidth: 4,      // Massive 4x4 trunk
      taperLevels: 4,
      minHeight: 18,
      maxHeight: 30,
      material: 'jungle_log'
    },

    branches: {
      count: { min: 10, max: 16 },
      startHeight: 0.5,
      angle: 'varied',    // Mix of angles
      length: { min: 5, max: 9 },
      material: 'jungle_log'
    },

    canopy: {
      shape: 'layered',    // Multiple distinct layers
      layers: 4,
      radius: { min: 6, max: 9 },
      heightAboveTrunk: 5,
      asymmetry: 0.4,      // Very asymmetric
      material: 'jungle_leaves'
    },

    features: {
      vines: true,         // Add hanging vines
      cocoa: true          // Add cocoa pods
    },

    variation: {
      heightVariance: 0.25,
      widthVariance: 0.25,
      branchAngleVariance: 20,
      asymmetricCanopy: true
    }
  },

  willow: {
    name: 'Willow Tree',
    keywords: ['willow', 'weeping'],
    description: 'Drooping branches hanging down, wide canopy',

    dimensions: {
      simple: { width: 13, height: 15, depth: 13 },
      medium: { width: 17, height: 22, depth: 17 },
      detailed: { width: 23, height: 28, depth: 23 }
    },

    trunk: {
      baseWidth: 3,
      taperLevels: 2,
      minHeight: 8,
      maxHeight: 14,
      material: 'oak_log'
    },

    branches: {
      count: { min: 8, max: 12 },
      startHeight: 0.5,
      angle: 'downward',   // Strongly downward
      length: { min: 6, max: 10 },
      material: 'oak_log'
    },

    canopy: {
      shape: 'drooping',   // Hangs down
      layers: 3,
      radius: { min: 5, max: 8 },
      heightAboveTrunk: 1,
      asymmetry: 0.35,
      material: 'oak_leaves'
    },

    variation: {
      heightVariance: 0.2,
      widthVariance: 0.3,  // Wide variance
      branchAngleVariance: 12,
      asymmetricCanopy: true
    }
  },

  cherry: {
    name: 'Cherry Blossom',
    keywords: ['cherry', 'blossom', 'sakura'],
    description: 'Delicate tree with pink blossoms, spreading canopy',

    dimensions: {
      simple: { width: 11, height: 12, depth: 11 },
      medium: { width: 15, height: 16, depth: 15 },
      detailed: { width: 19, height: 20, depth: 19 }
    },

    trunk: {
      baseWidth: 2,
      taperLevels: 2,
      minHeight: 6,
      maxHeight: 10,
      material: 'cherry_log'
    },

    branches: {
      count: { min: 6, max: 10 },
      startHeight: 0.6,
      angle: 'horizontal',
      length: { min: 3, max: 6 },
      material: 'cherry_log'
    },

    canopy: {
      shape: 'spreading',
      layers: 2,
      radius: { min: 4, max: 6 },
      heightAboveTrunk: 2,
      asymmetry: 0.25,
      material: 'cherry_leaves'
    },

    variation: {
      heightVariance: 0.2,
      widthVariance: 0.2,
      branchAngleVariance: 15,
      asymmetricCanopy: true
    }
  },

  dark_oak: {
    name: 'Dark Oak',
    keywords: ['dark oak', 'dark', 'roofed forest'],
    description: 'Dark wood with thick canopy, imposing presence',

    dimensions: {
      simple: { width: 13, height: 18, depth: 13 },
      medium: { width: 17, height: 24, depth: 17 },
      detailed: { width: 21, height: 30, depth: 21 }
    },

    trunk: {
      baseWidth: 4,      // 2x2 but can be 4-trunks
      taperLevels: 2,
      minHeight: 10,
      maxHeight: 16,
      material: 'dark_oak_log'
    },

    branches: {
      count: { min: 8, max: 12 },
      startHeight: 0.5,
      angle: 'horizontal',
      length: { min: 4, max: 7 },
      material: 'dark_oak_log'
    },

    canopy: {
      shape: 'dense',      // Very thick canopy
      layers: 3,
      radius: { min: 5, max: 7 },
      heightAboveTrunk: 3,
      asymmetry: 0.3,
      material: 'dark_oak_leaves'
    },

    variation: {
      heightVariance: 0.2,
      widthVariance: 0.2,
      branchAngleVariance: 15,
      asymmetricCanopy: true
    }
  }
};

/**
 * Detect tree type from prompt
 * @param {string} prompt - User's tree request
 * @returns {string} - Tree type key
 */
export function detectTreeType(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  // Check each tree type's keywords
  for (const [typeKey, typeInfo] of Object.entries(TREE_TYPES)) {
    for (const keyword of typeInfo.keywords) {
      if (lowerPrompt.includes(keyword)) {
        return typeKey;
      }
    }
  }

  // Default to oak
  return 'oak';
}

/**
 * Detect detail level from prompt adjectives
 * @param {string} prompt - User's tree request
 * @returns {string} - 'simple', 'medium', or 'detailed'
 */
export function detectDetailLevel(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  const detailKeywords = {
    simple: ['simple', 'basic', 'small', 'tiny', 'quick', 'minimal'],
    detailed: ['beautiful', 'detailed', 'elaborate', 'complex', 'intricate', 'fancy', 'gorgeous', 'stunning', 'nice', 'pretty']
  };

  // Check for detailed keywords first
  for (const keyword of detailKeywords.detailed) {
    if (lowerPrompt.includes(keyword)) {
      return 'detailed';
    }
  }

  // Check for simple keywords
  for (const keyword of detailKeywords.simple) {
    if (lowerPrompt.includes(keyword)) {
      return 'simple';
    }
  }

  // Default to medium
  return 'medium';
}

/**
 * Apply randomization to tree dimensions
 * @param {Object} treeType - Tree type definition
 * @param {string} detailLevel - 'simple', 'medium', or 'detailed'
 * @returns {Object} - Randomized tree parameters
 */
export function randomizeTreeParams(treeType, detailLevel = 'medium') {
  const baseDims = treeType.dimensions[detailLevel];
  const variance = treeType.variation;

  // Helper to randomize a value within variance
  const randomize = (value, variancePercent) => {
    const min = value * (1 - variancePercent);
    const max = value * (1 + variancePercent);
    return Math.round(min + Math.random() * (max - min));
  };

  return {
    width: randomize(baseDims.width, variance.widthVariance),
    height: randomize(baseDims.height, variance.heightVariance),
    depth: randomize(baseDims.depth, variance.widthVariance),

    trunkHeight: randomize(
      (treeType.trunk.minHeight + treeType.trunk.maxHeight) / 2,
      0.15
    ),

    branchCount: Math.floor(
      treeType.branches.count.min +
      Math.random() * (treeType.branches.count.max - treeType.branches.count.min)
    ),

    branchLength: Math.floor(
      treeType.branches.length.min +
      Math.random() * (treeType.branches.length.max - treeType.branches.length.min)
    ),

    canopyRadius: Math.floor(
      treeType.canopy.radius.min +
      Math.random() * (treeType.canopy.radius.max - treeType.canopy.radius.min)
    ),

    asymmetryOffset: variance.asymmetricCanopy
      ? {
          x: Math.floor((Math.random() - 0.5) * baseDims.width * treeType.canopy.asymmetry),
          z: Math.floor((Math.random() - 0.5) * baseDims.depth * treeType.canopy.asymmetry)
        }
      : { x: 0, z: 0 }
  };
}

export default TREE_TYPES;

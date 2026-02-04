/**
 * Landmark Registry
 *
 * Deterministic component configurations for known famous structures.
 * Bypasses LLM generation for reliable, fast landmark builds.
 */

/**
 * Registry of known landmarks with their component configurations.
 * Each landmark defines:
 * - aliases: Alternative names/keywords that should match
 * - components: Array of V2 component definitions
 * - materials: Material palette overrides
 * - scale: Optional size multipliers for different scales
 */
export const LANDMARK_REGISTRY = {
  // Tower-type landmarks
  eiffel: {
    aliases: ['eiffel_tower', 'eiffel tower', 'the eiffel tower'],
    components: [{
      id: 'tower',
      type: 'lattice_tower',
      transform: { position: { x: 0, y: 0, z: 0 } },
      params: {
        height: 100,
        baseWidth: 40,
        taperRatio: 0.15,
        platforms: [
          { heightRatio: 0.33, widthRatio: 0.6 },
          { heightRatio: 0.66, widthRatio: 0.4 },
          { heightRatio: 1.0, widthRatio: 0.2 }
        ]
      }
    }],
    materials: {
      leg: 'iron_block',
      brace: 'iron_bars',
      platform: 'smooth_stone',
      primary: 'iron_block',
      secondary: 'iron_bars',
      accent: 'smooth_stone'
    },
    scale: { tiny: 0.25, small: 0.5, medium: 1, large: 1.5, massive: 2 },
    defaultBounds: { width: 50, height: 110, depth: 50 }
  },

  leaning_tower: {
    aliases: ['leaning tower', 'pisa', 'tower of pisa', 'leaning tower of pisa'],
    components: [{
      id: 'tower',
      type: 'cylinder',
      transform: { position: { x: 0, y: 0, z: 0 } },
      params: {
        radius: 8,
        height: 55,
        hollow: true
      }
    }],
    materials: {
      primary: 'white_concrete',
      secondary: 'smooth_quartz',
      accent: 'chiseled_quartz_block'
    },
    scale: { tiny: 0.3, small: 0.6, medium: 1, large: 1.5 },
    defaultBounds: { width: 20, height: 60, depth: 20 }
  },

  // Statue-type landmarks
  statue_of_liberty: {
    aliases: ['liberty', 'statue of liberty', 'lady liberty'],
    components: [
      {
        id: 'pedestal',
        type: 'platform',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: {
          width: 20,
          depth: 20,
          thickness: 15
        }
      },
      {
        id: 'figure',
        type: 'statue_armature',
        transform: { position: { x: 10, y: 15, z: 10 } },
        params: {
          height: 45,
          style: 'humanoid'
        }
      }
    ],
    materials: {
      primary: 'oxidized_copper',
      secondary: 'weathered_copper',
      accent: 'oxidized_cut_copper',
      pedestal: 'stone_bricks'
    },
    scale: { tiny: 0.3, small: 0.5, medium: 1, large: 1.5, massive: 2 },
    defaultBounds: { width: 25, height: 65, depth: 25 }
  },

  // Building-type landmarks
  big_ben: {
    aliases: ['big ben', 'elizabeth tower', 'clock tower', 'westminster'],
    components: [
      {
        id: 'base',
        type: 'room',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: {
          width: 15,
          height: 60,
          depth: 15,
          openings: [
            { type: 'window', wall: 'north', yOffset: 50 },
            { type: 'window', wall: 'south', yOffset: 50 },
            { type: 'window', wall: 'east', yOffset: 50 },
            { type: 'window', wall: 'west', yOffset: 50 }
          ]
        }
      },
      {
        id: 'top',
        type: 'tower_top',
        transform: { position: { x: 0, y: 60, z: 0 } },
        params: {
          width: 15,
          depth: 15,
          style: 'spire'
        }
      }
    ],
    materials: {
      primary: 'stone_bricks',
      secondary: 'chiseled_stone_bricks',
      accent: 'gold_block',
      trim: 'dark_oak_planks'
    },
    scale: { tiny: 0.3, small: 0.5, medium: 1, large: 1.5 },
    defaultBounds: { width: 20, height: 80, depth: 20 }
  },

  taj_mahal: {
    aliases: ['taj mahal', 'taj', 'the taj mahal'],
    components: [
      {
        id: 'base',
        type: 'platform',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: {
          width: 60,
          depth: 60,
          thickness: 3
        }
      },
      {
        id: 'main',
        type: 'room',
        transform: { position: { x: 10, y: 3, z: 10 } },
        params: {
          width: 40,
          height: 25,
          depth: 40,
          openings: [
            { type: 'door', wall: 'south' },
            { type: 'window', wall: 'north', yOffset: 5 },
            { type: 'window', wall: 'east', yOffset: 5 },
            { type: 'window', wall: 'west', yOffset: 5 }
          ]
        }
      },
      {
        id: 'dome',
        type: 'roof_dome',
        transform: { position: { x: 10, y: 28, z: 10 } },
        params: {
          width: 40,
          depth: 40,
          height: 20
        }
      }
    ],
    materials: {
      primary: 'white_concrete',
      secondary: 'smooth_quartz',
      accent: 'light_blue_concrete',
      trim: 'gold_block'
    },
    scale: { tiny: 0.25, small: 0.5, medium: 1, large: 1.5, massive: 2 },
    defaultBounds: { width: 65, height: 50, depth: 65 }
  },

  pyramid: {
    aliases: ['pyramids', 'giza', 'egyptian pyramid', 'great pyramid', 'pyramid of giza'],
    // Uses V1 we_pyramid operation via legacy bridge
    useLegacyOperation: 'we_pyramid',
    legacyParams: { size: 50, block: 'sandstone' },
    materials: {
      primary: 'sandstone',
      secondary: 'smooth_sandstone',
      accent: 'chiseled_sandstone'
    },
    scale: { tiny: 0.25, small: 0.5, medium: 1, large: 1.5, massive: 2 },
    defaultBounds: { width: 55, height: 52, depth: 55 }
  },

  colosseum: {
    aliases: ['colosseum', 'coliseum', 'roman colosseum', 'the colosseum'],
    components: [
      {
        id: 'outer_ring',
        type: 'cylinder',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: {
          radius: 45,
          height: 25,
          hollow: true
        }
      },
      {
        id: 'inner_ring',
        type: 'cylinder',
        transform: { position: { x: 5, y: 0, z: 5 } },
        params: {
          radius: 35,
          height: 20,
          hollow: true
        }
      }
    ],
    materials: {
      primary: 'stone_bricks',
      secondary: 'cracked_stone_bricks',
      accent: 'mossy_stone_bricks'
    },
    scale: { tiny: 0.25, small: 0.5, medium: 1, large: 1.5 },
    defaultBounds: { width: 95, height: 30, depth: 95 }
  }
};

/**
 * Find landmark configuration by keyword
 * @param {string} keyword - Search term (e.g., "eiffel tower", "statue of liberty")
 * @returns {Object|null} { key, config } or null if not found
 */
export function findLandmark(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    return null;
  }

  const normalized = keyword.toLowerCase().replace(/[_-]/g, ' ').trim();

  for (const [key, config] of Object.entries(LANDMARK_REGISTRY)) {
    // Check exact key match
    const normalizedKey = key.replace(/[_-]/g, ' ');
    if (normalizedKey === normalized) {
      return { key, config };
    }

    // Check aliases
    if (config.aliases?.some(alias => normalized.includes(alias.toLowerCase()))) {
      return { key, config };
    }
  }

  return null;
}

/**
 * Check if keyword matches a known landmark
 * @param {string} keyword - Search term
 * @returns {boolean}
 */
export function isKnownLandmark(keyword) {
  return findLandmark(keyword) !== null;
}

/**
 * Get all registered landmark keys
 * @returns {string[]}
 */
export function listLandmarks() {
  return Object.keys(LANDMARK_REGISTRY);
}

/**
 * Scale component parameters based on scale factor
 * @param {Object} params - Component parameters
 * @param {number} scaleFactor - Scale multiplier
 * @returns {Object} Scaled parameters
 */
export function scaleParams(params, scaleFactor) {
  if (!params || scaleFactor === 1) {
    return params;
  }

  const scaled = { ...params };
  const dimensionKeys = ['width', 'height', 'depth', 'radius', 'thickness', 'baseWidth'];

  for (const key of dimensionKeys) {
    if (typeof scaled[key] === 'number') {
      scaled[key] = Math.round(scaled[key] * scaleFactor);
    }
  }

  // Scale platform arrays if present
  if (Array.isArray(scaled.platforms)) {
    scaled.platforms = scaled.platforms.map(p => ({ ...p }));
  }

  return scaled;
}

/**
 * Calculate bounds from component configurations
 * @param {Object[]} components - Component definitions
 * @param {number} scaleFactor - Scale multiplier
 * @param {Object} defaultBounds - Fallback bounds
 * @returns {Object} { width, height, depth }
 */
export function calculateBoundsFromConfig(components, scaleFactor, defaultBounds) {
  if (defaultBounds) {
    return {
      width: Math.round(defaultBounds.width * scaleFactor),
      height: Math.round(defaultBounds.height * scaleFactor),
      depth: Math.round(defaultBounds.depth * scaleFactor)
    };
  }

  // Estimate from components
  let maxX = 0, maxY = 0, maxZ = 0;

  for (const comp of components) {
    const pos = comp.transform?.position || { x: 0, y: 0, z: 0 };
    const p = comp.params || {};

    maxX = Math.max(maxX, pos.x + (p.width || p.radius * 2 || 10));
    maxY = Math.max(maxY, pos.y + (p.height || 10));
    maxZ = Math.max(maxZ, pos.z + (p.depth || p.radius * 2 || 10));
  }

  return {
    width: Math.round(maxX * scaleFactor) + 5,
    height: Math.round(maxY * scaleFactor) + 5,
    depth: Math.round(maxZ * scaleFactor) + 5
  };
}

export default {
  LANDMARK_REGISTRY,
  findLandmark,
  isKnownLandmark,
  listLandmarks,
  scaleParams,
  calculateBoundsFromConfig
};

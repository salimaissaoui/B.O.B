/**
 * Build Type Definitions
 * 
 * Each build type has specific:
 * - Detection keywords
 * - Recommended operations
 * - Material palettes
 * - Structural guidelines
 * - Dimension recommendations
 */

// =====================================================
// GLOBAL THEMES - Apply to ANY build type
// =====================================================
export const BUILD_THEMES = {
  // Dark/Gothic theme - dramatic, imposing, dark materials
  gothic: {
    name: 'Gothic',
    keywords: ['gothic', 'dark', 'evil', 'haunted', 'spooky', 'vampire', 'dark fantasy'],
    description: 'Dark, imposing structures with dramatic proportions',
    materials: {
      primary: 'deepslate_bricks',
      secondary: 'blackstone',
      accent: 'polished_blackstone',
      roof: 'deepslate_tile_stairs',
      windows: 'purple_stained_glass',
      door: 'dark_oak_door',
      floor: 'deepslate_tiles',
      trim: 'polished_blackstone_bricks'
    },
    modifiers: {
      heightMultiplier: 1.3,  // Taller, more dramatic
      windowStyle: 'tall_narrow',
      roofStyle: 'steep'
    },
    tips: [
      'Use tall, narrow windows',
      'Add pointed arches where possible',
      'Include dramatic height differences',
      'Add spires and towers'
    ]
  },

  // Medieval/Classic theme - traditional stone and wood
  medieval: {
    name: 'Medieval',
    keywords: ['medieval', 'old', 'classic', 'traditional', 'historic', 'olden', 'ancient'],
    description: 'Traditional medieval construction with stone and timber',
    materials: {
      primary: 'cobblestone',
      secondary: 'stone_bricks',
      accent: 'mossy_cobblestone',
      roof: 'spruce_stairs',
      windows: 'glass_pane',
      door: 'spruce_door',
      floor: 'stone_bricks',
      trim: 'spruce_log'
    },
    modifiers: {
      heightMultiplier: 1.0,
      windowStyle: 'small_square',
      roofStyle: 'gable'
    },
    tips: [
      'Mix cobblestone with stone bricks',
      'Add timber framing with logs',
      'Use mossy variants for aged look',
      'Include battlements on walls'
    ]
  },

  // Rustic/Wooden theme - warm, natural wood
  rustic: {
    name: 'Rustic',
    keywords: ['rustic', 'wooden', 'wood', 'cozy', 'warm', 'countryside', 'rural', 'log'],
    description: 'Warm wooden structures with natural materials',
    materials: {
      primary: 'oak_planks',
      secondary: 'oak_log',
      accent: 'stripped_oak_log',
      roof: 'oak_stairs',
      windows: 'glass_pane',
      door: 'oak_door',
      floor: 'oak_planks',
      trim: 'oak_fence'
    },
    modifiers: {
      heightMultiplier: 0.9,
      windowStyle: 'shuttered',
      roofStyle: 'gable'
    },
    tips: [
      'Use log corners for structural look',
      'Add flower boxes under windows',
      'Include exposed beams',
      'Use fences for railings'
    ]
  },

  // Modern/Contemporary theme - clean lines, concrete, glass
  modern: {
    name: 'Modern',
    keywords: ['modern', 'contemporary', 'minimalist', 'sleek', 'futuristic', 'clean'],
    description: 'Clean lines with concrete and large glass panels',
    materials: {
      primary: 'white_concrete',
      secondary: 'gray_concrete',
      accent: 'black_concrete',
      roof: 'smooth_stone_slab',
      windows: 'glass',
      door: 'iron_door',
      floor: 'polished_andesite',
      trim: 'quartz_block'
    },
    modifiers: {
      heightMultiplier: 1.1,
      windowStyle: 'floor_to_ceiling',
      roofStyle: 'flat'
    },
    tips: [
      'Use large unbroken glass panels',
      'Keep surfaces smooth and uniform',
      'Flat roofs only',
      'Minimal ornamentation'
    ]
  },

  // Fantasy/Magical theme - colorful, enchanted
  fantasy: {
    name: 'Fantasy',
    keywords: ['fantasy', 'magical', 'enchanted', 'fairy', 'mystical', 'wizard', 'mage'],
    description: 'Magical structures with vibrant colors and mystical elements',
    materials: {
      primary: 'purpur_block',
      secondary: 'prismarine_bricks',
      accent: 'sea_lantern',
      roof: 'purpur_stairs',
      windows: 'magenta_stained_glass',
      door: 'warped_door',
      floor: 'end_stone_bricks',
      trim: 'amethyst_block'
    },
    modifiers: {
      heightMultiplier: 1.2,
      windowStyle: 'arched',
      roofStyle: 'spire'
    },
    tips: [
      'Add glowing elements (sea lanterns, end rods)',
      'Use curved shapes where possible',
      'Include towers with pointed roofs',
      'Add floating or unusual elements'
    ]
  },

  // Nether theme - hellish, fiery
  nether: {
    name: 'Nether',
    keywords: ['nether', 'hell', 'infernal', 'demonic', 'fire', 'lava', 'hellish'],
    description: 'Hellish structures from the Nether dimension',
    materials: {
      primary: 'nether_bricks',
      secondary: 'red_nether_bricks',
      accent: 'cracked_nether_bricks',
      roof: 'nether_brick_stairs',
      windows: 'red_stained_glass',
      door: 'crimson_door',
      floor: 'blackstone',
      trim: 'gilded_blackstone'
    },
    modifiers: {
      heightMultiplier: 1.1,
      windowStyle: 'narrow_slit',
      roofStyle: 'flat'
    },
    tips: [
      'Use lava as decoration',
      'Add soul lanterns for lighting',
      'Include nether portal frames',
      'Use blackstone for foundations'
    ]
  },

  // Ice/Frozen theme - cold, crystalline
  ice: {
    name: 'Ice/Frozen',
    keywords: ['ice', 'frozen', 'snow', 'winter', 'cold', 'arctic', 'frost', 'icy'],
    description: 'Frozen structures made of ice and snow',
    materials: {
      primary: 'packed_ice',
      secondary: 'blue_ice',
      accent: 'snow_block',
      roof: 'prismarine_stairs',
      windows: 'light_blue_stained_glass',
      door: 'iron_door',
      floor: 'packed_ice',
      trim: 'quartz_block'
    },
    modifiers: {
      heightMultiplier: 1.0,
      windowStyle: 'crystalline',
      roofStyle: 'dome'
    },
    tips: [
      'Use ice for translucent walls',
      'Add snow layers on surfaces',
      'Include icicle details with end rods',
      'Use blue stained glass for windows'
    ]
  },

  // Sandstone/Desert theme - warm, arid
  desert: {
    name: 'Desert/Sandstone',
    keywords: ['desert', 'sandstone', 'egyptian', 'arabian', 'sand', 'oasis', 'dune', 'sahara'],
    description: 'Desert structures with sandstone and terracotta',
    materials: {
      primary: 'sandstone',
      secondary: 'smooth_sandstone',
      accent: 'chiseled_sandstone',
      roof: 'sandstone_stairs',
      windows: 'orange_stained_glass',
      door: 'acacia_door',
      floor: 'cut_sandstone',
      trim: 'terracotta'
    },
    modifiers: {
      heightMultiplier: 0.9,
      windowStyle: 'small_arched',
      roofStyle: 'dome'
    },
    tips: [
      'Use domes for roofs',
      'Add arched doorways',
      'Include terracotta accents',
      'Keep structures low and wide'
    ]
  },

  // Underwater/Oceanic theme
  underwater: {
    name: 'Underwater/Oceanic',
    keywords: ['underwater', 'ocean', 'aquatic', 'marine', 'sea', 'atlantis', 'submarine'],
    description: 'Underwater or ocean-themed structures',
    materials: {
      primary: 'prismarine_bricks',
      secondary: 'dark_prismarine',
      accent: 'sea_lantern',
      roof: 'prismarine_stairs',
      windows: 'cyan_stained_glass',
      door: 'warped_door',
      floor: 'prismarine',
      trim: 'prismarine_wall'
    },
    modifiers: {
      heightMultiplier: 1.0,
      windowStyle: 'porthole',
      roofStyle: 'dome'
    },
    tips: [
      'Use glass domes for visibility',
      'Include sea lanterns for lighting',
      'Add tube connections between sections',
      'Use prismarine for all structures'
    ]
  },

  // Ruins/Ancient theme - weathered, overgrown
  ruins: {
    name: 'Ruins/Ancient',
    keywords: ['ruins', 'ruined', 'ancient', 'abandoned', 'overgrown', 'decayed', 'crumbling'],
    description: 'Weathered and partially destroyed structures',
    materials: {
      primary: 'mossy_cobblestone',
      secondary: 'cracked_stone_bricks',
      accent: 'mossy_stone_bricks',
      roof: 'cobblestone_stairs',
      windows: 'air',  // Broken windows
      door: 'air',  // No door
      floor: 'gravel',
      trim: 'cobblestone_wall'
    },
    modifiers: {
      heightMultiplier: 0.8,  // Shorter, collapsed
      windowStyle: 'broken',
      roofStyle: 'damaged'
    },
    tips: [
      'Include gaps and holes in walls',
      'Add vines and leaves for overgrowth',
      'Use cracked variants',
      'Leave some sections incomplete'
    ]
  },

  // Japanese/Asian theme
  japanese: {
    name: 'Japanese/Asian',
    keywords: ['japanese', 'asian', 'pagoda', 'temple', 'zen', 'oriental', 'chinese', 'shrine'],
    description: 'Traditional Asian architecture with curved roofs',
    materials: {
      primary: 'dark_oak_planks',
      secondary: 'white_terracotta',
      accent: 'red_terracotta',
      roof: 'dark_oak_stairs',
      windows: 'white_stained_glass_pane',
      door: 'dark_oak_door',
      floor: 'dark_oak_planks',
      trim: 'dark_oak_fence'
    },
    modifiers: {
      heightMultiplier: 1.1,
      windowStyle: 'paper_screen',
      roofStyle: 'curved_up'
    },
    tips: [
      'Use upward-curved roof edges',
      'Add sliding door frames',
      'Include garden elements',
      'Use dark wood with white walls'
    ]
  },

  // Steampunk theme
  steampunk: {
    name: 'Steampunk',
    keywords: ['steampunk', 'industrial', 'victorian', 'clockwork', 'brass', 'gears'],
    description: 'Victorian industrial with copper and mechanical elements',
    materials: {
      primary: 'bricks',
      secondary: 'copper_block',
      accent: 'lightning_rod',
      roof: 'brick_stairs',
      windows: 'tinted_glass',
      door: 'iron_door',
      floor: 'polished_deepslate',
      trim: 'chain'
    },
    modifiers: {
      heightMultiplier: 1.2,
      windowStyle: 'round',
      roofStyle: 'industrial'
    },
    tips: [
      'Add pipes and chains',
      'Use copper for accents',
      'Include smokestacks',
      'Add gears and mechanical details'
    ]
  }
};

// =====================================================
// BUILD TYPES - Structure types (what to build)
// =====================================================
export const BUILD_TYPES = {
  // =====================
  // PIXEL ART (2D)
  // =====================
  pixel_art: {
    name: 'Pixel Art',
    keywords: ['pixel', 'pixelart', 'sprite', '2d', '8-bit', '16-bit', 'retro', 'pixel art'],
    description: 'Flat 2D images rendered as blocks on a vertical plane',
    primaryOperation: 'pixel_art',
    dimensions: {
      simple: { width: 16, height: 16, depth: 1 },
      medium: { width: 32, height: 32, depth: 1 },
      detailed: { width: 48, height: 48, depth: 1 },
      large: { width: 64, height: 64, depth: 1 }
    },
    materials: {
      palette: ['wool', 'concrete', 'terracotta'],
      recommended: [
        'white_wool', 'black_wool', 'red_wool', 'orange_wool', 'yellow_wool',
        'lime_wool', 'green_wool', 'cyan_wool', 'light_blue_wool', 'blue_wool',
        'purple_wool', 'magenta_wool', 'pink_wool', 'brown_wool', 'gray_wool'
      ]
    },
    features: ['pixel_art', 'facing_south'],
    tips: [
      'Use single pixel_art operation with complete grid',
      'Row 0 is TOP of image',
      'Use wool for vibrant colors, concrete for flat colors'
    ]
  },

  // =====================
  // HOUSE / COTTAGE
  // =====================
  house: {
    name: 'House/Cottage',
    keywords: ['house', 'cottage', 'cabin', 'home', 'hut', 'shack', 'bungalow', 'villa'],
    description: 'Residential building with walls, roof, door, and windows',
    primaryOperations: ['hollow_box', 'roof_gable', 'door', 'window_strip'],
    dimensions: {
      small: { width: 7, height: 6, depth: 7 },
      medium: { width: 11, height: 8, depth: 9 },
      large: { width: 15, height: 10, depth: 12 }
    },
    materials: {
      styles: {
        wooden: { primary: 'oak_planks', secondary: 'oak_log', roof: 'oak_stairs', windows: 'glass_pane' },
        stone: { primary: 'cobblestone', secondary: 'stone_bricks', roof: 'stone_brick_stairs', windows: 'glass_pane' },
        brick: { primary: 'bricks', secondary: 'stone_bricks', roof: 'brick_stairs', windows: 'glass_pane' },
        modern: { primary: 'white_concrete', secondary: 'gray_concrete', roof: 'stone_slab', windows: 'glass' }
      }
    },
    features: ['foundation', 'walls', 'door', 'windows', 'roof'],
    buildOrder: ['foundation (fill)', 'walls (hollow_box)', 'door', 'windows (window_strip)', 'roof (roof_gable/roof_hip)'],
    tips: [
      'Use hollow_box for walls, not individual fill operations',
      'Use window_strip for window rows',
      'Add foundation layer at y=0',
      'Roof should extend 1 block beyond walls'
    ]
  },

  // =====================
  // TOWER
  // =====================
  tower: {
    name: 'Tower',
    keywords: ['tower', 'lighthouse', 'watchtower', 'bell tower', 'spire', 'turret', 'minaret'],
    description: 'Tall vertical structure, often cylindrical',
    primaryOperations: ['we_cylinder', 'hollow_box', 'spiral_staircase', 'roof_gable'],
    dimensions: {
      small: { width: 5, height: 15, depth: 5 },
      medium: { width: 7, height: 25, depth: 7 },
      large: { width: 9, height: 40, depth: 9 }
    },
    materials: {
      styles: {
        stone: { primary: 'cobblestone', secondary: 'stone_bricks', roof: 'cobblestone_stairs' },
        wizard: { primary: 'purple_terracotta', secondary: 'obsidian', roof: 'purpur_stairs' },
        lighthouse: { primary: 'white_concrete', secondary: 'red_concrete', roof: 'stone_slab' }
      }
    },
    features: ['base', 'shaft', 'windows', 'spiral_staircase', 'roof', 'battlements'],
    buildOrder: ['foundation', 'cylinder/walls', 'spiral_staircase', 'windows', 'roof/battlements'],
    tips: [
      'Use we_cylinder for round towers when WorldEdit available',
      'Add spiral_staircase for interior access',
      'Windows at regular vertical intervals',
      'Consider adding battlements at top'
    ]
  },

  // =====================
  // CASTLE / FORTRESS
  // =====================
  castle: {
    name: 'Castle/Fortress',
    keywords: ['castle', 'fortress', 'fort', 'citadel', 'stronghold', 'keep', 'palace'],
    styleKeywords: ['gothic', 'medieval', 'dark', 'sandstone', 'nether', 'ice', 'fantasy', 'ruins', 'ancient'],
    description: 'Large defensive structure with walls and towers',
    primaryOperations: ['we_walls', 'we_fill', 'hollow_box', 'fill'],
    dimensions: {
      small: { width: 25, height: 15, depth: 25 },
      medium: { width: 40, height: 20, depth: 40 },
      large: { width: 60, height: 30, depth: 60 }
    },
    materials: {
      styles: {
        medieval: { primary: 'cobblestone', secondary: 'stone_bricks', accent: 'mossy_cobblestone', roof: 'cobblestone_stairs' },
        gothic: { primary: 'deepslate_bricks', secondary: 'blackstone', accent: 'polished_blackstone', roof: 'deepslate_tile_stairs', windows: 'purple_stained_glass' },
        dark: { primary: 'deepslate_bricks', secondary: 'deepslate_tiles', accent: 'polished_deepslate', roof: 'deepslate_tile_stairs' },
        sandstone: { primary: 'sandstone', secondary: 'smooth_sandstone', accent: 'chiseled_sandstone', roof: 'sandstone_stairs' },
        nether: { primary: 'nether_bricks', secondary: 'red_nether_bricks', accent: 'cracked_nether_bricks', roof: 'nether_brick_stairs' },
        ice: { primary: 'packed_ice', secondary: 'blue_ice', accent: 'snow_block', roof: 'prismarine_stairs' },
        fantasy: { primary: 'prismarine_bricks', secondary: 'dark_prismarine', accent: 'sea_lantern', roof: 'prismarine_stairs' },
        ruins: { primary: 'mossy_cobblestone', secondary: 'cracked_stone_bricks', accent: 'mossy_stone_bricks', roof: 'cobblestone_stairs' },
        ancient: { primary: 'deepslate_tiles', secondary: 'polished_deepslate', accent: 'reinforced_deepslate', roof: 'deepslate_tile_stairs' }
      }
    },
    features: ['outer_walls', 'towers', 'gatehouse', 'courtyard', 'keep', 'battlements'],
    buildOrder: ['outer_walls', 'corner_towers', 'gatehouse', 'inner_keep', 'battlements', 'details'],
    tips: [
      'Build walls first using we_walls or hollow_box',
      'Add towers at corners',
      'Include gatehouse with door',
      'Add battlements (alternating blocks) at top of walls',
      'Gothic style: Use pointed arches and tall spires',
      'Ruins style: Add gaps and mossy blocks for aged look'
    ]
  },

  // =====================
  // TREE / ORGANIC
  // =====================
  tree: {
    name: 'Tree/Organic',
    keywords: ['tree', 'oak', 'birch', 'spruce', 'willow', 'cherry', 'bonsai', 'giant tree', 'world tree', 'jungle tree', 'dark oak'],
    description: 'Natural tree structure with trunk and canopy - supports multiple tree types',
    primaryOperations: ['we_fill', 'fill', 'line', 'set'],  // REMOVED: we_cylinder, we_sphere (unnatural)
    dimensions: {
      small: { width: 7, height: 10, depth: 7 },
      medium: { width: 15, height: 25, depth: 15 },
      large: { width: 30, height: 50, depth: 30 }
    },
    materials: {
      styles: {
        oak: { trunk: 'oak_log', leaves: 'oak_leaves' },
        spruce: { trunk: 'spruce_log', leaves: 'spruce_leaves' },
        birch: { trunk: 'birch_log', leaves: 'birch_leaves' },
        cherry: { trunk: 'cherry_log', leaves: 'cherry_leaves' },
        dark_oak: { trunk: 'dark_oak_log', leaves: 'dark_oak_leaves' },
        jungle: { trunk: 'jungle_log', leaves: 'jungle_leaves' },
        willow: { trunk: 'oak_log', leaves: 'oak_leaves' }  // Willows use oak materials
      }
    },
    // Tree subtypes with different characteristics
    subtypes: {
      oak: {
        name: 'Oak Tree',
        silhouette: 'spreading',
        heightRange: [15, 25],
        canopyShape: 'rounded'
      },
      birch: {
        name: 'Birch Tree',
        silhouette: 'tall_narrow',
        heightRange: [12, 24],
        canopyShape: 'columnar'
      },
      spruce: {
        name: 'Spruce/Pine',
        silhouette: 'conical',
        heightRange: [20, 40],
        canopyShape: 'pyramid'
      },
      jungle: {
        name: 'Jungle Tree',
        silhouette: 'massive',
        heightRange: [25, 45],
        canopyShape: 'multi_layer'
      },
      willow: {
        name: 'Willow Tree',
        silhouette: 'drooping',
        heightRange: [15, 28],
        canopyShape: 'weeping'
      },
      cherry: {
        name: 'Cherry Blossom',
        silhouette: 'delicate',
        heightRange: [12, 20],
        canopyShape: 'spreading'
      },
      dark_oak: {
        name: 'Dark Oak',
        silhouette: 'dense',
        heightRange: [18, 30],
        canopyShape: 'thick_rounded'
      }
    },
    features: ['trunk', 'branches', 'canopy', 'asymmetric_shape', 'natural_variation'],
    buildOrder: ['trunk (tapered)', 'primary_branches', 'secondary_branches', 'main_canopy', 'detail_leaves'],
    tips: [
      'NEVER use we_sphere or we_cylinder - they create unnatural geometric shapes',
      'Use we_fill for trunk sections and leaf volumes',
      'Use line for individual branches',
      'Randomize branch angles and lengths for natural look',
      'Make canopy asymmetric (offset from center)',
      'Vary leaf cluster sizes and positions'
    ]
  },

  // =====================
  // STATUE / SCULPTURE
  // =====================
  statue: {
    name: 'Statue/Sculpture',
    keywords: ['statue', 'sculpture', 'monument', 'figure', 'bust', 'effigy', '3d model', '3d'],
    characterKeywords: ['charizard', 'pikachu', 'pokemon', 'mario', 'sonic', 'creeper', 'steve', 'character', 'creature', 'person', 'animal', 'dragon', 'dinosaur'],
    description: '3D representation of a character or object',
    primaryOperations: ['set', 'fill', 'we_sphere', 'we_cylinder'],
    dimensions: {
      small: { width: 5, height: 10, depth: 5 },
      medium: { width: 10, height: 20, depth: 10 },
      large: { width: 20, height: 40, depth: 20 }
    },
    materials: {
      styles: {
        stone: { primary: 'smooth_stone', secondary: 'stone', accent: 'polished_andesite' },
        marble: { primary: 'quartz_block', secondary: 'smooth_quartz', accent: 'white_concrete' },
        bronze: { primary: 'copper_block', secondary: 'exposed_copper', accent: 'weathered_copper' },
        gold: { primary: 'gold_block', secondary: 'yellow_concrete', accent: 'orange_concrete' }
      }
    },
    features: ['base', 'figure', 'details'],
    buildOrder: ['pedestal/base', 'body_core', 'limbs', 'head', 'details'],
    tips: [
      'Build from bottom up',
      'Use spheres for rounded parts (head, shoulders)',
      'Use cylinders for limbs',
      'Add pedestal/base for stability'
    ]
  },

  // =====================
  // SHIP / VEHICLE
  // =====================
  ship: {
    name: 'Ship/Vehicle',
    keywords: ['ship', 'boat', 'pirate ship', 'galleon', 'yacht', 'airship', 'car', 'plane', 'rocket'],
    description: 'Vehicle or vessel structure',
    primaryOperations: ['fill', 'hollow_box', 'stairs', 'line'],
    dimensions: {
      small: { width: 10, height: 8, depth: 20 },
      medium: { width: 15, height: 15, depth: 40 },
      large: { width: 25, height: 25, depth: 80 }
    },
    materials: {
      styles: {
        wooden_ship: { primary: 'oak_planks', secondary: 'dark_oak_planks', accent: 'white_wool' },
        pirate: { primary: 'dark_oak_planks', secondary: 'spruce_planks', accent: 'black_wool' },
        modern: { primary: 'iron_block', secondary: 'white_concrete', accent: 'blue_stained_glass' }
      }
    },
    features: ['hull', 'deck', 'mast', 'sails', 'cabin'],
    buildOrder: ['hull_bottom', 'hull_sides', 'deck', 'cabin', 'mast', 'sails'],
    tips: [
      'Hull should be wider in middle, narrow at ends',
      'Use stairs for curved hull edges',
      'Masts can be fence posts or logs',
      'Sails can be wool or banners'
    ]
  },

  // =====================
  // BRIDGE
  // =====================
  bridge: {
    name: 'Bridge',
    keywords: ['bridge', 'overpass', 'walkway', 'crossing', 'viaduct', 'aqueduct'],
    description: 'Structure spanning a gap or water',
    primaryOperations: ['line', 'fill', 'fence_connect', 'stairs'],
    dimensions: {
      small: { width: 5, height: 5, depth: 15 },
      medium: { width: 7, height: 8, depth: 30 },
      large: { width: 11, height: 15, depth: 50 }
    },
    materials: {
      styles: {
        wooden: { primary: 'oak_planks', secondary: 'oak_fence', accent: 'oak_stairs' },
        stone: { primary: 'stone_bricks', secondary: 'cobblestone_wall', accent: 'stone_brick_stairs' },
        suspension: { primary: 'iron_block', secondary: 'chain', accent: 'oak_planks' }
      }
    },
    features: ['supports', 'deck', 'railings', 'arches'],
    buildOrder: ['supports/pillars', 'main_span', 'deck', 'railings'],
    tips: [
      'Add support pillars at regular intervals',
      'Use fence_connect for railings',
      'Arched bridges look more natural',
      'Deck should be flat and walkable'
    ]
  },

  // =====================
  // PYRAMID / MONUMENT
  // =====================
  pyramid: {
    name: 'Pyramid/Monument',
    keywords: ['pyramid', 'obelisk', 'monument', 'memorial', 'sphinx', 'ziggurat'],
    description: 'Monumental geometric structure',
    primaryOperations: ['we_pyramid', 'fill', 'stairs'],
    dimensions: {
      small: { width: 15, height: 10, depth: 15 },
      medium: { width: 30, height: 20, depth: 30 },
      large: { width: 50, height: 35, depth: 50 }
    },
    materials: {
      styles: {
        sandstone: { primary: 'sandstone', secondary: 'smooth_sandstone', accent: 'gold_block' },
        stone: { primary: 'stone_bricks', secondary: 'polished_andesite', accent: 'quartz_block' },
        obsidian: { primary: 'obsidian', secondary: 'crying_obsidian', accent: 'glowstone' }
      }
    },
    features: ['base', 'stepped_sides', 'capstone', 'entrance'],
    buildOrder: ['base_layer', 'stepped_layers', 'capstone', 'entrance', 'details'],
    tips: [
      'Use we_pyramid for solid pyramids',
      'For hollow: build layer by layer decreasing size',
      'Add entrance at ground level',
      'Capstone can be different material (gold)'
    ]
  },

  // =====================
  // FARM / GARDEN
  // =====================
  farm: {
    name: 'Farm/Garden',
    keywords: ['farm', 'garden', 'greenhouse', 'barn', 'windmill', 'field', 'orchard'],
    description: 'Agricultural structure with fields and buildings',
    primaryOperations: ['fill', 'hollow_box', 'line', 'door'],
    dimensions: {
      small: { width: 20, height: 8, depth: 20 },
      medium: { width: 40, height: 12, depth: 40 },
      large: { width: 60, height: 15, depth: 60 }
    },
    materials: {
      styles: {
        rustic: { primary: 'oak_planks', secondary: 'hay_block', accent: 'oak_fence' },
        greenhouse: { primary: 'glass', secondary: 'iron_block', accent: 'white_concrete' }
      }
    },
    features: ['barn', 'fields', 'fences', 'paths', 'windmill'],
    buildOrder: ['field_plots', 'paths', 'fences', 'barn', 'details'],
    tips: [
      'Use fence_connect for field boundaries',
      'Paths can be gravel or stone',
      'Include water sources for farms',
      'Barn uses same pattern as house'
    ]
  },

  // =====================
  // UNDERWATER / AQUATIC
  // =====================
  underwater: {
    name: 'Underwater Structure',
    keywords: ['underwater', 'aquarium', 'submarine', 'dome', 'atlantis', 'sea base'],
    description: 'Structure designed for underwater environment',
    primaryOperations: ['we_sphere', 'we_cylinder', 'hollow_box', 'fill'],
    dimensions: {
      small: { width: 15, height: 10, depth: 15 },
      medium: { width: 25, height: 15, depth: 25 },
      large: { width: 40, height: 25, depth: 40 }
    },
    materials: {
      styles: {
        glass_dome: { primary: 'glass', secondary: 'prismarine', accent: 'sea_lantern' },
        prismarine: { primary: 'prismarine_bricks', secondary: 'dark_prismarine', accent: 'prismarine' }
      }
    },
    features: ['dome', 'tunnels', 'airlocks', 'lighting'],
    buildOrder: ['main_dome', 'connecting_tunnels', 'interior', 'lighting', 'details'],
    tips: [
      'Use we_sphere for domes',
      'Include sea_lantern for lighting',
      'Glass allows viewing fish',
      'Prismarine blocks fit underwater theme'
    ]
  },

  // =====================
  // MODERN BUILDING
  // =====================
  modern: {
    name: 'Modern Building',
    keywords: ['modern', 'skyscraper', 'office', 'apartment', 'mall', 'contemporary', 'minimalist'],
    description: 'Contemporary architecture with clean lines',
    primaryOperations: ['fill', 'hollow_box', 'window_strip', 'roof_flat'],
    dimensions: {
      small: { width: 12, height: 15, depth: 12 },
      medium: { width: 20, height: 30, depth: 20 },
      large: { width: 30, height: 50, depth: 30 }
    },
    materials: {
      styles: {
        glass_steel: { primary: 'white_concrete', secondary: 'light_gray_concrete', windows: 'glass', accent: 'iron_block' },
        brutalist: { primary: 'gray_concrete', secondary: 'light_gray_concrete', windows: 'glass_pane', accent: 'stone' }
      }
    },
    features: ['foundation', 'floors', 'glass_facade', 'flat_roof', 'entrance'],
    buildOrder: ['foundation', 'structural_frame', 'floors', 'glass_walls', 'roof', 'entrance'],
    tips: [
      'Use window_strip for repeating window patterns',
      'Flat roofs work best',
      'Use concrete for clean modern look',
      'Large glass panels for facades'
    ]
  }
};

/**
 * Detect build type from user prompt
 * @param {string} prompt - User's build request
 * @returns {Object} - Detected build type info
 */
export function detectBuildType(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  // CRITICAL: Check for explicit "pixel art" / "2D" FIRST before character detection
  const pixelArtPattern = /\b(pixel\s*art|pixelart|2d|sprite|8-bit|16-bit)\b/i;
  if (pixelArtPattern.test(prompt)) {
    return {
      type: 'pixel_art',
      ...BUILD_TYPES.pixel_art,
      confidence: 'high',
      matchedKeyword: 'pixel art',
      reason: 'Explicit pixel art keyword detected'
    };
  }

  // Check character names → default to 3D statue
  const statueInfo = BUILD_TYPES.statue;
  if (statueInfo.characterKeywords) {
    for (const keyword of statueInfo.characterKeywords) {
      if (lowerPrompt.includes(keyword)) {
        return {
          type: 'statue',
          ...statueInfo,
          confidence: 'high',
          matchedKeyword: keyword,
          reason: 'Character detected - building 3D statue (add "pixel art" for 2D)'
        };
      }
    }
  }

  // Priority order for detection (more specific types first)
  const priorityOrder = [
    'underwater', // Specific environment
    'modern',     // Style modifier - check before house
    'castle',     // Large structures first
    'pyramid',
    'ship',
    'bridge',
    'tower',      // Before house (lighthouse contains "house")
    'tree',
    'statue',
    'farm',
    'house'       // Most generic - check last
  ];

  // Check in priority order
  for (const typeKey of priorityOrder) {
    const typeInfo = BUILD_TYPES[typeKey];
    if (!typeInfo) continue;

    // Check main keywords
    for (const keyword of typeInfo.keywords) {
      // Use word boundary matching for more accuracy
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerPrompt)) {
        return {
          type: typeKey,
          ...typeInfo,
          confidence: 'high',
          matchedKeyword: keyword
        };
      }
    }
  }

  // Default to house for generic "build" requests
  return {
    type: 'house',
    ...BUILD_TYPES.house,
    confidence: 'low',
    reason: 'No specific type detected - defaulting to house'
  };
}

/**
 * Detect theme from user prompt
 * Themes are cross-cutting and apply to any build type
 * @param {string} prompt - User's build request
 * @returns {Object} - Detected theme info or null
 */
export function detectTheme(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check each theme's keywords
  for (const [themeKey, themeInfo] of Object.entries(BUILD_THEMES)) {
    for (const keyword of themeInfo.keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerPrompt)) {
        return {
          theme: themeKey,
          ...themeInfo,
          matchedKeyword: keyword
        };
      }
    }
  }
  
  // No theme detected - return null (will use type defaults)
  return null;
}

/**
 * Merge theme materials with build type
 * Theme materials override type materials
 * @param {Object} typeInfo - Build type info
 * @param {Object} themeInfo - Theme info (can be null)
 * @returns {Object} - Merged materials
 */
export function getMergedMaterials(typeInfo, themeInfo) {
  // If no theme, use type defaults
  if (!themeInfo) {
    return getRecommendedMaterials(typeInfo);
  }
  
  // Theme materials take precedence
  return {
    ...getRecommendedMaterials(typeInfo),
    ...themeInfo.materials
  };
}

/**
 * Get dimension recommendation based on size modifier
 * @param {Object} buildType - Build type info
 * @param {string} sizeModifier - 'small', 'medium', 'large', or 'simple', 'detailed'
 * @returns {Object} - Recommended dimensions
 */
export function getRecommendedDimensions(buildType, sizeModifier = 'medium') {
  const dimensions = buildType.dimensions || BUILD_TYPES.house.dimensions;
  
  // Map alternative size words
  const sizeMap = {
    'tiny': 'small',
    'little': 'small',
    'simple': 'small',
    'basic': 'small',
    'normal': 'medium',
    'standard': 'medium',
    'big': 'large',
    'huge': 'large',
    'giant': 'large',
    'detailed': 'large',
    'complex': 'large'
  };
  
  const normalizedSize = sizeMap[sizeModifier] || sizeModifier;
  return dimensions[normalizedSize] || dimensions.medium || { width: 15, height: 15, depth: 15 };
}

/**
 * Get material recommendations for a build type and style
 * @param {Object} buildType - Build type info
 * @param {string} style - Style name (optional)
 * @returns {Object} - Material recommendations
 */
export function getRecommendedMaterials(buildType, style = null) {
  const materials = buildType.materials || BUILD_TYPES.house.materials;
  
  if (materials.styles) {
    // If style specified, use it
    if (style && materials.styles[style]) {
      return materials.styles[style];
    }
    // Otherwise return first style as default
    const defaultStyle = Object.keys(materials.styles)[0];
    return materials.styles[defaultStyle];
  }
  
  return materials;
}

/**
 * Detect size modifier from prompt
 * @param {string} prompt - User's build request
 * @returns {Object} - { size: 'small'|'medium'|'large', matchedWord: string|null }
 */
export function detectSize(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  const sizeKeywords = {
    small: ['small', 'tiny', 'little', 'mini', 'simple', 'basic', 'compact', 'cozy'],
    medium: ['medium', 'normal', 'standard', 'regular', 'average'],
    large: ['large', 'big', 'huge', 'giant', 'massive', 'grand', 'epic', 'enormous', 'detailed', 'elaborate', 'complex']
  };
  
  for (const [size, keywords] of Object.entries(sizeKeywords)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerPrompt)) {
        return { size, matchedWord: keyword };
      }
    }
  }
  
  return { size: 'medium', matchedWord: null };
}

/**
 * Get theme-specific operation recommendations
 * @param {Object} themeInfo - Theme info object
 * @param {Object} typeInfo - Build type info object  
 * @returns {Object} - { preferred: string[], avoid: string[], tips: string[] }
 */
export function getThemeOperations(themeInfo, typeInfo) {
  if (!themeInfo) {
    return {
      preferred: typeInfo?.primaryOperations || ['fill', 'hollow_box'],
      avoid: [],
      tips: typeInfo?.tips || []
    };
  }
  
  // Theme-specific operation preferences
  const themeOps = {
    gothic: {
      preferred: ['we_cylinder', 'spiral_staircase', 'window_strip', 'roof_gable'],
      featureAdditions: ['tall_spires', 'pointed_windows', 'buttresses'],
      tips: ['Add tall spires using we_cylinder', 'Use narrow tall windows', 'Include dramatic height']
    },
    medieval: {
      preferred: ['we_walls', 'hollow_box', 'fill', 'door'],
      featureAdditions: ['battlements', 'timber_framing'],
      tips: ['Add battlements on walls', 'Mix stone with log framing']
    },
    rustic: {
      preferred: ['fill', 'hollow_box', 'stairs', 'fence_connect'],
      featureAdditions: ['flower_boxes', 'exposed_beams'],
      tips: ['Use log corners', 'Add flower boxes under windows']
    },
    modern: {
      preferred: ['fill', 'hollow_box', 'window_strip', 'roof_flat'],
      featureAdditions: ['glass_walls', 'flat_roof', 'clean_lines'],
      tips: ['Use large glass panels', 'Keep flat roofs only', 'Minimize details']
    },
    fantasy: {
      preferred: ['we_sphere', 'we_cylinder', 'spiral_staircase', 'set'],
      featureAdditions: ['glowing_accents', 'floating_elements', 'curved_shapes'],
      tips: ['Add sea_lantern accents', 'Use curved shapes', 'Include magical glow']
    },
    nether: {
      preferred: ['we_fill', 'we_walls', 'fill', 'hollow_box'],
      featureAdditions: ['lava_moat', 'soul_lighting'],
      tips: ['Use lava for decoration', 'Add soul_lantern lighting']
    },
    ice: {
      preferred: ['we_sphere', 'we_cylinder', 'fill'],
      featureAdditions: ['ice_spikes', 'snow_layers'],
      tips: ['Use glass for translucent effect', 'Add snow layers on surfaces']
    },
    desert: {
      preferred: ['we_sphere', 'fill', 'hollow_box', 'stairs'],
      featureAdditions: ['domes', 'arched_doorways', 'terraces'],
      tips: ['Use dome roofs', 'Add arched doorways', 'Keep structures low and wide']
    },
    underwater: {
      preferred: ['we_sphere', 'we_cylinder', 'fill'],
      featureAdditions: ['glass_domes', 'tube_connectors', 'sea_lantern_lighting'],
      tips: ['Use glass domes', 'Connect sections with tubes', 'Add ample lighting']
    },
    ruins: {
      preferred: ['set', 'fill', 'hollow_box'],
      featureAdditions: ['gaps', 'overgrowth', 'crumbling_walls'],
      tips: ['Leave gaps in walls', 'Add vines/leaves', 'Use cracked variants']
    },
    japanese: {
      preferred: ['fill', 'hollow_box', 'stairs', 'roof_gable'],
      featureAdditions: ['curved_roof_edges', 'sliding_doors', 'garden'],
      tips: ['Curve roof edges upward', 'Use paper screen windows', 'Add garden elements']
    },
    steampunk: {
      preferred: ['we_cylinder', 'fill', 'hollow_box', 'line'],
      featureAdditions: ['pipes', 'smokestacks', 'gears'],
      tips: ['Add pipes and chains', 'Include smokestacks', 'Use copper accents']
    }
  };
  
  const themeSpecific = themeOps[themeInfo.theme] || {};
  
  return {
    preferred: themeSpecific.preferred || typeInfo?.primaryOperations || ['fill', 'hollow_box'],
    featureAdditions: themeSpecific.featureAdditions || [],
    tips: [...(themeSpecific.tips || []), ...(themeInfo.tips || [])]
  };
}

/**
 * Comprehensive prompt analysis - returns all detected information
 * This is the main entry point for analyzing a user's build request
 * @param {string} prompt - User's build request
 * @returns {Object} - Complete analysis with type, theme, size, materials, operations
 */
export function analyzePrompt(prompt) {
  const detectedType = detectBuildType(prompt);
  const detectedTheme = detectTheme(prompt);
  const detectedSize = detectSize(prompt);
  
  const typeInfo = BUILD_TYPES[detectedType.type] || BUILD_TYPES.house;
  const materials = getMergedMaterials(typeInfo, detectedTheme);
  const dimensions = getRecommendedDimensions(typeInfo, detectedSize.size);
  const operations = getThemeOperations(detectedTheme, typeInfo);
  
  // Apply theme height multiplier if present
  if (detectedTheme?.modifiers?.heightMultiplier) {
    dimensions.height = Math.round(dimensions.height * detectedTheme.modifiers.heightMultiplier);
  }
  
  return {
    // Detection results
    type: detectedType,
    theme: detectedTheme,
    size: detectedSize,
    
    // Derived recommendations
    typeInfo,
    materials,
    dimensions,
    operations,
    
    // Combined features (type features + theme additions)
    features: [
      ...(typeInfo.features || []),
      ...(operations.featureAdditions || [])
    ],
    
    // Combined tips
    tips: [
      ...(typeInfo.tips || []),
      ...(operations.tips || [])
    ],
    
    // Build order
    buildOrder: typeInfo.buildOrder || ['foundation', 'walls', 'roof', 'details']
  };
}

export default BUILD_TYPES;

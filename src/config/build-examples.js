/**
 * Build Examples Database
 * 
 * High-quality example blueprints for the LLM to reference.
 * These serve as few-shot learning examples to improve generation quality.
 */

export const BUILD_EXAMPLES = {
  // =====================================================
  // HOUSES
  // =====================================================
  house: {
    simple_cottage: {
      name: "Simple Cottage",
      description: "A cozy 9x7 cottage with pitched roof and porch",
      designPlan: {
        buildType: "house",
        dimensions: { width: 9, height: 8, depth: 7 },
        materials: {
          primary: "oak_planks",
          secondary: "oak_log",
          roof: "oak_stairs",
          windows: "glass_pane",
          door: "oak_door"
        },
        features: ["pitched_roof", "windows", "door", "porch"]
      },
      blueprint: {
        size: { width: 9, height: 8, depth: 7 },
        palette: ["oak_planks", "oak_log", "oak_stairs", "oak_slab", "glass_pane", "oak_door", "oak_fence", "cobblestone", "lantern"],
        steps: [
          // Foundation
          { op: "fill", block: "cobblestone", from: { x: 0, y: 0, z: 0 }, to: { x: 8, y: 0, z: 6 } },
          // Corner pillars (logs for depth)
          { op: "fill", block: "oak_log", from: { x: 0, y: 1, z: 0 }, to: { x: 0, y: 4, z: 0 } },
          { op: "fill", block: "oak_log", from: { x: 8, y: 1, z: 0 }, to: { x: 8, y: 4, z: 0 } },
          { op: "fill", block: "oak_log", from: { x: 0, y: 1, z: 6 }, to: { x: 0, y: 4, z: 6 } },
          { op: "fill", block: "oak_log", from: { x: 8, y: 1, z: 6 }, to: { x: 8, y: 4, z: 6 } },
          // Walls
          { op: "hollow_box", block: "oak_planks", from: { x: 0, y: 1, z: 0 }, to: { x: 8, y: 4, z: 6 } },
          // Floor
          { op: "fill", block: "oak_planks", from: { x: 1, y: 1, z: 1 }, to: { x: 7, y: 1, z: 5 } },
          // Door
          { op: "door", block: "oak_door", pos: { x: 4, y: 1, z: 0 }, facing: "south" },
          // Windows - front
          { op: "window_strip", block: "glass_pane", from: { x: 1, y: 2, z: 0 }, to: { x: 3, y: 3, z: 0 }, spacing: 2 },
          { op: "window_strip", block: "glass_pane", from: { x: 5, y: 2, z: 0 }, to: { x: 7, y: 3, z: 0 }, spacing: 2 },
          // Windows - sides
          { op: "window_strip", block: "glass_pane", from: { x: 0, y: 2, z: 2 }, to: { x: 0, y: 3, z: 4 }, spacing: 2 },
          { op: "window_strip", block: "glass_pane", from: { x: 8, y: 2, z: 2 }, to: { x: 8, y: 3, z: 4 }, spacing: 2 },
          // Roof
          { op: "roof_gable", block: "oak_stairs", from: { x: -1, y: 5, z: -1 }, to: { x: 9, y: 5, z: 7 }, peakHeight: 3 },
          // Roof overhang with slabs
          { op: "line", block: "oak_slab", from: { x: -1, y: 4, z: -1 }, to: { x: 9, y: 4, z: -1 } },
          { op: "line", block: "oak_slab", from: { x: -1, y: 4, z: 7 }, to: { x: 9, y: 4, z: 7 } },
          // Porch
          { op: "fill", block: "oak_planks", from: { x: 2, y: 0, z: -2 }, to: { x: 6, y: 0, z: -1 } },
          { op: "fence_connect", block: "oak_fence", from: { x: 2, y: 1, z: -2 }, to: { x: 2, y: 1, z: -1 } },
          { op: "fence_connect", block: "oak_fence", from: { x: 6, y: 1, z: -2 }, to: { x: 6, y: 1, z: -1 } },
          // Porch roof
          { op: "line", block: "oak_slab", from: { x: 2, y: 2, z: -2 }, to: { x: 6, y: 2, z: -2 } },
          // Lighting
          { op: "set", block: "lantern", pos: { x: 4, y: 3, z: -1 } }
        ]
      }
    },
    
    medieval_house: {
      name: "Medieval Timber Frame House",
      description: "A 11x9 medieval house with exposed timber frame",
      designPlan: {
        buildType: "house",
        theme: "medieval",
        dimensions: { width: 11, height: 9, depth: 9 },
        materials: {
          primary: "white_terracotta",
          secondary: "dark_oak_log",
          accent: "stripped_dark_oak_log",
          roof: "dark_oak_stairs",
          windows: "glass_pane",
          door: "dark_oak_door"
        },
        features: ["timber_frame", "pitched_roof", "windows", "door", "chimney"]
      },
      blueprint: {
        size: { width: 11, height: 9, depth: 9 },
        palette: ["white_terracotta", "dark_oak_log", "stripped_dark_oak_log", "dark_oak_stairs", "dark_oak_slab", "glass_pane", "dark_oak_door", "cobblestone", "stone_bricks", "lantern"],
        steps: [
          // Foundation
          { op: "fill", block: "cobblestone", from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 0, z: 8 } },
          // Corner posts
          { op: "fill", block: "dark_oak_log", from: { x: 0, y: 1, z: 0 }, to: { x: 0, y: 5, z: 0 } },
          { op: "fill", block: "dark_oak_log", from: { x: 10, y: 1, z: 0 }, to: { x: 10, y: 5, z: 0 } },
          { op: "fill", block: "dark_oak_log", from: { x: 0, y: 1, z: 8 }, to: { x: 0, y: 5, z: 8 } },
          { op: "fill", block: "dark_oak_log", from: { x: 10, y: 1, z: 8 }, to: { x: 10, y: 5, z: 8 } },
          // Mid-wall posts
          { op: "fill", block: "dark_oak_log", from: { x: 5, y: 1, z: 0 }, to: { x: 5, y: 5, z: 0 } },
          { op: "fill", block: "dark_oak_log", from: { x: 5, y: 1, z: 8 }, to: { x: 5, y: 5, z: 8 } },
          // Horizontal beams (bottom)
          { op: "line", block: "stripped_dark_oak_log", from: { x: 0, y: 1, z: 0 }, to: { x: 10, y: 1, z: 0 } },
          { op: "line", block: "stripped_dark_oak_log", from: { x: 0, y: 1, z: 8 }, to: { x: 10, y: 1, z: 8 } },
          // Horizontal beams (mid)
          { op: "line", block: "stripped_dark_oak_log", from: { x: 0, y: 3, z: 0 }, to: { x: 10, y: 3, z: 0 } },
          { op: "line", block: "stripped_dark_oak_log", from: { x: 0, y: 3, z: 8 }, to: { x: 10, y: 3, z: 8 } },
          // Horizontal beams (top)
          { op: "line", block: "stripped_dark_oak_log", from: { x: 0, y: 5, z: 0 }, to: { x: 10, y: 5, z: 0 } },
          { op: "line", block: "stripped_dark_oak_log", from: { x: 0, y: 5, z: 8 }, to: { x: 10, y: 5, z: 8 } },
          // Fill walls with terracotta
          { op: "fill", block: "white_terracotta", from: { x: 1, y: 2, z: 0 }, to: { x: 4, y: 2, z: 0 } },
          { op: "fill", block: "white_terracotta", from: { x: 6, y: 2, z: 0 }, to: { x: 9, y: 2, z: 0 } },
          { op: "fill", block: "white_terracotta", from: { x: 1, y: 4, z: 0 }, to: { x: 4, y: 4, z: 0 } },
          { op: "fill", block: "white_terracotta", from: { x: 6, y: 4, z: 0 }, to: { x: 9, y: 4, z: 0 } },
          // Side walls
          { op: "hollow_box", block: "white_terracotta", from: { x: 0, y: 2, z: 0 }, to: { x: 10, y: 4, z: 8 } },
          // Floor
          { op: "fill", block: "dark_oak_planks", from: { x: 1, y: 1, z: 1 }, to: { x: 9, y: 1, z: 7 } },
          // Door
          { op: "door", block: "dark_oak_door", pos: { x: 5, y: 1, z: 0 }, facing: "south" },
          // Windows
          { op: "window_strip", block: "glass_pane", from: { x: 2, y: 2, z: 0 }, to: { x: 3, y: 4, z: 0 }, spacing: 1 },
          { op: "window_strip", block: "glass_pane", from: { x: 7, y: 2, z: 0 }, to: { x: 8, y: 4, z: 0 }, spacing: 1 },
          // Roof
          { op: "roof_gable", block: "dark_oak_stairs", from: { x: -1, y: 6, z: -1 }, to: { x: 11, y: 6, z: 9 }, peakHeight: 4 },
          // Chimney
          { op: "fill", block: "stone_bricks", from: { x: 9, y: 5, z: 6 }, to: { x: 10, y: 9, z: 7 } },
          // Lighting
          { op: "set", block: "lantern", pos: { x: 5, y: 4, z: -1 } }
        ]
      }
    }
  },
  
  // =====================================================
  // TOWERS
  // =====================================================
  tower: {
    watchtower: {
      name: "Stone Watchtower",
      description: "A 7x20 defensive watchtower with spiral stairs",
      designPlan: {
        buildType: "tower",
        dimensions: { width: 7, height: 20, depth: 7 },
        materials: {
          primary: "stone_bricks",
          secondary: "cobblestone",
          roof: "stone_brick_stairs",
          windows: "glass_pane",
          door: "oak_door"
        },
        features: ["spiral_staircase", "windows", "battlements", "door"]
      },
      blueprint: {
        size: { width: 7, height: 20, depth: 7 },
        palette: ["stone_bricks", "cobblestone", "stone_brick_stairs", "stone_brick_slab", "glass_pane", "oak_door", "torch"],
        steps: [
          // Foundation
          { op: "fill", block: "cobblestone", from: { x: 0, y: 0, z: 0 }, to: { x: 6, y: 0, z: 6 } },
          // Tower shaft (hollow)
          { op: "hollow_box", block: "stone_bricks", from: { x: 0, y: 1, z: 0 }, to: { x: 6, y: 16, z: 6 } },
          // Thicker base walls
          { op: "hollow_box", block: "cobblestone", from: { x: -1, y: 0, z: -1 }, to: { x: 7, y: 3, z: 7 } },
          // Door
          { op: "door", block: "oak_door", pos: { x: 3, y: 1, z: -1 }, facing: "south" },
          // Spiral staircase
          { op: "spiral_staircase", block: "stone_brick_stairs", base: { x: 3, y: 1, z: 3 }, height: 15, radius: 2 },
          // Windows at intervals (every 4 blocks)
          { op: "window_strip", block: "glass_pane", from: { x: 2, y: 4, z: 0 }, to: { x: 4, y: 5, z: 0 }, spacing: 2 },
          { op: "window_strip", block: "glass_pane", from: { x: 2, y: 8, z: 0 }, to: { x: 4, y: 9, z: 0 }, spacing: 2 },
          { op: "window_strip", block: "glass_pane", from: { x: 2, y: 12, z: 0 }, to: { x: 4, y: 13, z: 0 }, spacing: 2 },
          // Side windows
          { op: "window_strip", block: "glass_pane", from: { x: 0, y: 6, z: 2 }, to: { x: 0, y: 7, z: 4 }, spacing: 2 },
          { op: "window_strip", block: "glass_pane", from: { x: 6, y: 6, z: 2 }, to: { x: 6, y: 7, z: 4 }, spacing: 2 },
          { op: "window_strip", block: "glass_pane", from: { x: 0, y: 10, z: 2 }, to: { x: 0, y: 11, z: 4 }, spacing: 2 },
          { op: "window_strip", block: "glass_pane", from: { x: 6, y: 10, z: 2 }, to: { x: 6, y: 11, z: 4 }, spacing: 2 },
          // Top platform
          { op: "fill", block: "stone_bricks", from: { x: 0, y: 16, z: 0 }, to: { x: 6, y: 16, z: 6 } },
          // Battlements (alternating)
          { op: "line", block: "stone_bricks", from: { x: 0, y: 17, z: 0 }, to: { x: 0, y: 18, z: 0 } },
          { op: "line", block: "stone_bricks", from: { x: 2, y: 17, z: 0 }, to: { x: 2, y: 18, z: 0 } },
          { op: "line", block: "stone_bricks", from: { x: 4, y: 17, z: 0 }, to: { x: 4, y: 18, z: 0 } },
          { op: "line", block: "stone_bricks", from: { x: 6, y: 17, z: 0 }, to: { x: 6, y: 18, z: 0 } },
          // Lighting
          { op: "set", block: "torch", pos: { x: 3, y: 3, z: -1 } },
          { op: "set", block: "torch", pos: { x: 3, y: 17, z: 3 } }
        ]
      }
    }
  },
  
  // =====================================================
  // CASTLES
  // =====================================================
  castle: {
    small_keep: {
      name: "Small Castle Keep",
      description: "A 20x15 castle keep with corner towers",
      designPlan: {
        buildType: "castle",
        dimensions: { width: 20, height: 15, depth: 20 },
        materials: {
          primary: "stone_bricks",
          secondary: "cobblestone",
          accent: "mossy_stone_bricks",
          roof: "stone_brick_stairs",
          windows: "glass_pane",
          door: "dark_oak_door"
        },
        features: ["outer_walls", "corner_towers", "gatehouse", "battlements", "courtyard"]
      },
      blueprint: {
        size: { width: 20, height: 15, depth: 20 },
        palette: ["stone_bricks", "cobblestone", "mossy_stone_bricks", "stone_brick_stairs", "glass_pane", "dark_oak_door", "oak_planks", "lantern"],
        steps: [
          // Foundation
          { op: "fill", block: "cobblestone", from: { x: 0, y: 0, z: 0 }, to: { x: 19, y: 0, z: 19 } },
          // Outer walls
          { op: "hollow_box", block: "stone_bricks", from: { x: 0, y: 1, z: 0 }, to: { x: 19, y: 8, z: 19 } },
          // Corner towers (higher than walls)
          { op: "hollow_box", block: "stone_bricks", from: { x: 0, y: 1, z: 0 }, to: { x: 4, y: 12, z: 4 } },
          { op: "hollow_box", block: "stone_bricks", from: { x: 15, y: 1, z: 0 }, to: { x: 19, y: 12, z: 4 } },
          { op: "hollow_box", block: "stone_bricks", from: { x: 0, y: 1, z: 15 }, to: { x: 4, y: 12, z: 19 } },
          { op: "hollow_box", block: "stone_bricks", from: { x: 15, y: 1, z: 15 }, to: { x: 19, y: 12, z: 19 } },
          // Gatehouse
          { op: "hollow_box", block: "stone_bricks", from: { x: 8, y: 1, z: 0 }, to: { x: 11, y: 10, z: 3 } },
          { op: "door", block: "dark_oak_door", pos: { x: 9, y: 1, z: 0 }, facing: "south" },
          { op: "door", block: "dark_oak_door", pos: { x: 10, y: 1, z: 0 }, facing: "south" },
          // Courtyard (clear interior)
          { op: "fill", block: "cobblestone", from: { x: 5, y: 1, z: 5 }, to: { x: 14, y: 1, z: 14 } },
          // Walkway on walls
          { op: "fill", block: "oak_planks", from: { x: 1, y: 8, z: 1 }, to: { x: 18, y: 8, z: 1 } },
          { op: "fill", block: "oak_planks", from: { x: 1, y: 8, z: 18 }, to: { x: 18, y: 8, z: 18 } },
          { op: "fill", block: "oak_planks", from: { x: 1, y: 8, z: 1 }, to: { x: 1, y: 8, z: 18 } },
          { op: "fill", block: "oak_planks", from: { x: 18, y: 8, z: 1 }, to: { x: 18, y: 8, z: 18 } },
          // Battlements (alternating merlons)
          { op: "line", block: "stone_bricks", from: { x: 0, y: 9, z: 0 }, to: { x: 0, y: 10, z: 0 } },
          { op: "line", block: "stone_bricks", from: { x: 2, y: 9, z: 0 }, to: { x: 2, y: 10, z: 0 } },
          { op: "line", block: "stone_bricks", from: { x: 4, y: 9, z: 0 }, to: { x: 4, y: 10, z: 0 } },
          { op: "line", block: "stone_bricks", from: { x: 6, y: 9, z: 0 }, to: { x: 6, y: 10, z: 0 } },
          // Continue battlements pattern...
          { op: "line", block: "stone_bricks", from: { x: 12, y: 9, z: 0 }, to: { x: 12, y: 10, z: 0 } },
          { op: "line", block: "stone_bricks", from: { x: 14, y: 9, z: 0 }, to: { x: 14, y: 10, z: 0 } },
          { op: "line", block: "stone_bricks", from: { x: 17, y: 9, z: 0 }, to: { x: 17, y: 10, z: 0 } },
          { op: "line", block: "stone_bricks", from: { x: 19, y: 9, z: 0 }, to: { x: 19, y: 10, z: 0 } },
          // Tower roofs
          { op: "roof_hip", block: "stone_brick_stairs", from: { x: 0, y: 13, z: 0 }, to: { x: 4, y: 13, z: 4 }, peakHeight: 2 },
          { op: "roof_hip", block: "stone_brick_stairs", from: { x: 15, y: 13, z: 0 }, to: { x: 19, y: 13, z: 4 }, peakHeight: 2 },
          { op: "roof_hip", block: "stone_brick_stairs", from: { x: 0, y: 13, z: 15 }, to: { x: 4, y: 13, z: 19 }, peakHeight: 2 },
          { op: "roof_hip", block: "stone_brick_stairs", from: { x: 15, y: 13, z: 15 }, to: { x: 19, y: 13, z: 19 }, peakHeight: 2 },
          // Mossy accent on lower walls
          { op: "line", block: "mossy_stone_bricks", from: { x: 0, y: 1, z: 1 }, to: { x: 0, y: 1, z: 18 } },
          { op: "line", block: "mossy_stone_bricks", from: { x: 19, y: 1, z: 1 }, to: { x: 19, y: 1, z: 18 } },
          // Lighting
          { op: "set", block: "lantern", pos: { x: 9, y: 4, z: -1 } },
          { op: "set", block: "lantern", pos: { x: 10, y: 4, z: -1 } }
        ]
      }
    }
  },
  
  // =====================================================
  // TREES - CRITICAL: No windows, doors, roofs, or pyramids!
  // =====================================================
  tree: {
    giant_oak: {
      name: "Giant Oak Tree",
      description: "A large oak tree with sprawling branches - uses ONLY fill, line, and set",
      designPlan: {
        buildType: "tree",
        dimensions: { width: 15, height: 20, depth: 15 },
        materials: {
          primary: "oak_log",
          secondary: "oak_leaves"
        },
        features: ["trunk", "branches", "canopy"]
      },
      blueprint: {
        size: { width: 15, height: 20, depth: 15 },
        palette: ["oak_log", "oak_leaves"],
        steps: [
          // STEP 1-2: TRUNK (tapered - thick at base, thin at top)
          { op: "fill", block: "oak_log", from: { x: 6, y: 0, z: 6 }, to: { x: 8, y: 8, z: 8 } },
          { op: "fill", block: "oak_log", from: { x: 7, y: 9, z: 7 }, to: { x: 7, y: 12, z: 7 } },
          // STEP 3-8: BRANCHES (line operations going outward AND upward)
          { op: "line", block: "oak_log", from: { x: 6, y: 8, z: 7 }, to: { x: 2, y: 10, z: 7 } },
          { op: "line", block: "oak_log", from: { x: 8, y: 8, z: 7 }, to: { x: 12, y: 10, z: 7 } },
          { op: "line", block: "oak_log", from: { x: 7, y: 8, z: 6 }, to: { x: 7, y: 10, z: 2 } },
          { op: "line", block: "oak_log", from: { x: 7, y: 8, z: 8 }, to: { x: 7, y: 10, z: 12 } },
          { op: "line", block: "oak_log", from: { x: 6, y: 9, z: 6 }, to: { x: 3, y: 11, z: 3 } },
          { op: "line", block: "oak_log", from: { x: 8, y: 9, z: 8 }, to: { x: 11, y: 11, z: 11 } },
          // STEP 9-16: LEAF CLUSTERS (overlapping fill cubes - NOT pyramids!)
          { op: "fill", block: "oak_leaves", from: { x: 3, y: 10, z: 3 }, to: { x: 11, y: 14, z: 11 } },
          { op: "fill", block: "oak_leaves", from: { x: 5, y: 15, z: 5 }, to: { x: 9, y: 17, z: 9 } },
          { op: "fill", block: "oak_leaves", from: { x: 0, y: 9, z: 5 }, to: { x: 4, y: 12, z: 9 } },
          { op: "fill", block: "oak_leaves", from: { x: 10, y: 9, z: 5 }, to: { x: 14, y: 12, z: 9 } },
          { op: "fill", block: "oak_leaves", from: { x: 5, y: 9, z: 0 }, to: { x: 9, y: 12, z: 4 } },
          { op: "fill", block: "oak_leaves", from: { x: 5, y: 9, z: 10 }, to: { x: 9, y: 12, z: 14 } },
          { op: "fill", block: "oak_leaves", from: { x: 1, y: 10, z: 1 }, to: { x: 5, y: 13, z: 5 } },
          { op: "fill", block: "oak_leaves", from: { x: 9, y: 10, z: 9 }, to: { x: 13, y: 13, z: 13 } }
        ]
      }
    },
    
    spruce_tree: {
      name: "Tall Spruce Tree",
      description: "A conical spruce tree with layered branches",
      designPlan: {
        buildType: "tree",
        dimensions: { width: 11, height: 18, depth: 11 },
        materials: {
          primary: "spruce_log",
          secondary: "spruce_leaves"
        },
        features: ["trunk", "branches", "conical_canopy"]
      },
      blueprint: {
        size: { width: 11, height: 18, depth: 11 },
        palette: ["spruce_log", "spruce_leaves"],
        steps: [
          // Trunk - single column
          { op: "fill", block: "spruce_log", from: { x: 5, y: 0, z: 5 }, to: { x: 5, y: 16, z: 5 } },
          // Layered leaf rings (largest at bottom, smallest at top)
          { op: "fill", block: "spruce_leaves", from: { x: 2, y: 4, z: 2 }, to: { x: 8, y: 5, z: 8 } },
          { op: "fill", block: "spruce_leaves", from: { x: 3, y: 6, z: 3 }, to: { x: 7, y: 7, z: 7 } },
          { op: "fill", block: "spruce_leaves", from: { x: 2, y: 8, z: 2 }, to: { x: 8, y: 9, z: 8 } },
          { op: "fill", block: "spruce_leaves", from: { x: 3, y: 10, z: 3 }, to: { x: 7, y: 11, z: 7 } },
          { op: "fill", block: "spruce_leaves", from: { x: 4, y: 12, z: 4 }, to: { x: 6, y: 13, z: 6 } },
          { op: "fill", block: "spruce_leaves", from: { x: 4, y: 14, z: 4 }, to: { x: 6, y: 15, z: 6 } },
          { op: "fill", block: "spruce_leaves", from: { x: 5, y: 16, z: 5 }, to: { x: 5, y: 17, z: 5 } },
          // Branch extensions at each layer
          { op: "line", block: "spruce_log", from: { x: 5, y: 5, z: 5 }, to: { x: 2, y: 5, z: 5 } },
          { op: "line", block: "spruce_log", from: { x: 5, y: 5, z: 5 }, to: { x: 8, y: 5, z: 5 } },
          { op: "line", block: "spruce_log", from: { x: 5, y: 5, z: 5 }, to: { x: 5, y: 5, z: 2 } },
          { op: "line", block: "spruce_log", from: { x: 5, y: 5, z: 5 }, to: { x: 5, y: 5, z: 8 } },
          { op: "line", block: "spruce_log", from: { x: 5, y: 9, z: 5 }, to: { x: 3, y: 9, z: 5 } },
          { op: "line", block: "spruce_log", from: { x: 5, y: 9, z: 5 }, to: { x: 7, y: 9, z: 5 } }
        ]
      }
    }
  },
  
  // =====================================================
  // MODERN BUILDINGS
  // =====================================================
  modern: {
    glass_office: {
      name: "Modern Glass Office",
      description: "A sleek modern office building with glass facade",
      designPlan: {
        buildType: "modern",
        dimensions: { width: 12, height: 16, depth: 10 },
        materials: {
          primary: "white_concrete",
          secondary: "gray_concrete",
          windows: "light_blue_stained_glass",
          floor: "polished_andesite"
        },
        features: ["glass_facade", "flat_roof", "lobby", "multiple_floors"]
      },
      blueprint: {
        size: { width: 12, height: 16, depth: 10 },
        palette: ["white_concrete", "gray_concrete", "light_blue_stained_glass", "polished_andesite", "sea_lantern", "iron_door"],
        steps: [
          // Foundation
          { op: "fill", block: "gray_concrete", from: { x: 0, y: 0, z: 0 }, to: { x: 11, y: 0, z: 9 } },
          // Core structure
          { op: "hollow_box", block: "white_concrete", from: { x: 0, y: 1, z: 0 }, to: { x: 11, y: 15, z: 9 } },
          // Floor plates
          { op: "fill", block: "polished_andesite", from: { x: 1, y: 1, z: 1 }, to: { x: 10, y: 1, z: 8 } },
          { op: "fill", block: "polished_andesite", from: { x: 1, y: 5, z: 1 }, to: { x: 10, y: 5, z: 8 } },
          { op: "fill", block: "polished_andesite", from: { x: 1, y: 9, z: 1 }, to: { x: 10, y: 9, z: 8 } },
          { op: "fill", block: "polished_andesite", from: { x: 1, y: 13, z: 1 }, to: { x: 10, y: 13, z: 8 } },
          // Glass facade - front
          { op: "window_strip", block: "light_blue_stained_glass", from: { x: 1, y: 2, z: 0 }, to: { x: 10, y: 4, z: 0 }, spacing: 1 },
          { op: "window_strip", block: "light_blue_stained_glass", from: { x: 1, y: 6, z: 0 }, to: { x: 10, y: 8, z: 0 }, spacing: 1 },
          { op: "window_strip", block: "light_blue_stained_glass", from: { x: 1, y: 10, z: 0 }, to: { x: 10, y: 12, z: 0 }, spacing: 1 },
          { op: "window_strip", block: "light_blue_stained_glass", from: { x: 1, y: 14, z: 0 }, to: { x: 10, y: 15, z: 0 }, spacing: 1 },
          // Glass facade - sides
          { op: "window_strip", block: "light_blue_stained_glass", from: { x: 0, y: 2, z: 1 }, to: { x: 0, y: 4, z: 8 }, spacing: 1 },
          { op: "window_strip", block: "light_blue_stained_glass", from: { x: 11, y: 2, z: 1 }, to: { x: 11, y: 4, z: 8 }, spacing: 1 },
          { op: "window_strip", block: "light_blue_stained_glass", from: { x: 0, y: 6, z: 1 }, to: { x: 0, y: 8, z: 8 }, spacing: 1 },
          { op: "window_strip", block: "light_blue_stained_glass", from: { x: 11, y: 6, z: 1 }, to: { x: 11, y: 8, z: 8 }, spacing: 1 },
          // Entrance
          { op: "door", block: "iron_door", pos: { x: 5, y: 1, z: 0 }, facing: "south" },
          { op: "door", block: "iron_door", pos: { x: 6, y: 1, z: 0 }, facing: "south" },
          // Roof
          { op: "roof_flat", block: "gray_concrete", from: { x: 0, y: 16, z: 0 }, to: { x: 11, y: 16, z: 9 } },
          // Rooftop details
          { op: "fill", block: "white_concrete", from: { x: 4, y: 17, z: 3 }, to: { x: 7, y: 18, z: 6 } },
          // Interior lighting
          { op: "set", block: "sea_lantern", pos: { x: 3, y: 4, z: 4 } },
          { op: "set", block: "sea_lantern", pos: { x: 8, y: 4, z: 4 } },
          { op: "set", block: "sea_lantern", pos: { x: 5, y: 8, z: 4 } }
        ]
      }
    }
  }
};

/**
 * Get relevant examples for a build type
 * @param {string} buildType - The type of build
 * @param {string} theme - Optional theme
 * @param {number} maxExamples - Maximum examples to return
 * @returns {Object[]} Array of example blueprints
 */
export function getExamplesForType(buildType, theme = null, maxExamples = 2) {
  const examples = [];
  
  // Get examples from the build type category
  const typeExamples = BUILD_EXAMPLES[buildType];
  if (typeExamples) {
    for (const [key, example] of Object.entries(typeExamples)) {
      // Prioritize examples matching the theme
      if (theme && example.designPlan.theme === theme) {
        examples.unshift(example);
      } else {
        examples.push(example);
      }
    }
  }
  
  // If we don't have enough, add house examples as fallback
  if (examples.length < maxExamples && buildType !== 'house') {
    const houseExamples = BUILD_EXAMPLES.house;
    if (houseExamples) {
      for (const example of Object.values(houseExamples)) {
        if (examples.length < maxExamples) {
          examples.push(example);
        }
      }
    }
  }
  
  return examples.slice(0, maxExamples);
}

/**
 * Format examples for inclusion in prompts
 * @param {Object[]} examples - Array of example objects
 * @param {string} buildType - The type of build (for custom formatting)
 * @returns {string} Formatted examples string
 */
export function formatExamplesForPrompt(examples, buildType = 'house') {
  if (!examples || examples.length === 0) return '';
  
  const isTree = buildType === 'tree';
  const isOrganic = isTree || buildType === 'statue';
  
  let formatted = '\n=== REFERENCE BUILDS (FOLLOW THESE PATTERNS!) ===\n';
  
  if (isTree) {
    formatted += `
*** CRITICAL FOR TREES ***
- ONLY use: fill, line, set
- NEVER use: window_strip, door, hollow_box, roof_*, we_pyramid
- Look at how the examples use MULTIPLE overlapping fill cubes for leaves
- Branches use LINE operations, not fill
`;
  }
  
  for (const example of examples) {
    // For trees, show ALL steps since they're commonly done wrong
    const stepsToShow = isTree ? example.blueprint.steps : example.blueprint.steps.slice(0, 6);
    const remainingSteps = isTree ? 0 : Math.max(0, example.blueprint.steps.length - 6);
    
    formatted += `
--- ${example.name} ---
${example.description}
Dimensions: ${example.designPlan.dimensions.width}x${example.designPlan.dimensions.height}x${example.designPlan.dimensions.depth}
Materials: ${Object.values(example.designPlan.materials).join(', ')}
Total steps: ${example.blueprint.steps.length}

${isTree ? 'COMPLETE STEPS (follow this pattern exactly):' : 'Sample steps:'}
${JSON.stringify(stepsToShow, null, 2)}
${remainingSteps > 0 ? `... and ${remainingSteps} more steps` : ''}
`;
  }
  
  // Build-type specific patterns
  if (isTree) {
    formatted += `
=== TREE BUILDING PATTERN ===
1. TRUNK: fill operations (tapered - thicker at base)
2. BRANCHES: line operations (going outward AND upward)
3. LEAF CLUSTERS: Multiple overlapping fill cubes
4. DETAIL: set operations for individual leaves

FORBIDDEN: window_strip, door, roof_*, hollow_box, we_pyramid
`;
  } else if (isOrganic) {
    formatted += `
=== ORGANIC BUILD PATTERN ===
- Use fill for solid masses
- Use line for elongated shapes
- Use set for details
- NO architectural elements (doors, windows, roofs)
`;
  } else {
    formatted += `
=== KEY PATTERNS FROM EXAMPLES ===
- Foundation FIRST (fill at y=0)
- Corner pillars with secondary material for depth
- Walls use hollow_box for efficiency
- Windows use window_strip with proper spacing
- Roofs use roof_gable or roof_hip operations
- Details (lighting, trim) come LAST
- Aim for ${examples[0]?.blueprint.steps.length || 15}+ build steps
`;
  }
  
  return formatted;
}

/**
 * Get a complete example blueprint for validation reference
 * @param {string} buildType 
 * @returns {Object|null}
 */
export function getValidationExample(buildType) {
  const typeExamples = BUILD_EXAMPLES[buildType] || BUILD_EXAMPLES.house;
  const firstKey = Object.keys(typeExamples)[0];
  return typeExamples[firstKey]?.blueprint || null;
}

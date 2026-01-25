import { BUILD_TYPES, BUILD_THEMES, getThemeOperations } from '../../config/build-types.js';
import { getExamplesForType, formatExamplesForPrompt } from '../../config/build-examples.js';

export const blueprintPrompt = (designPlan, allowlist, worldEditAvailable = false) => {
  // Detect build type and theme
  const buildType = designPlan.buildType || 'house';
  const themeKey = designPlan.theme || null;
  const typeInfo = BUILD_TYPES[buildType] || BUILD_TYPES.house;
  const themeInfo = themeKey && themeKey !== 'default' ? BUILD_THEMES[themeKey] : null;
  
  // Get theme-specific operations
  const themeOps = getThemeOperations(themeInfo, typeInfo);
  
  const isPixelArt = buildType === 'pixel_art';
  const isTower = buildType === 'tower';
  const isCastle = buildType === 'castle';
  const isTree = buildType === 'tree';
  const isStatue = buildType === 'statue';
  const isShip = buildType === 'ship';
  const isBridge = buildType === 'bridge';
  const isPyramid = buildType === 'pyramid';
  const isModern = buildType === 'modern';
  const isUnderwater = buildType === 'underwater';
  
  // Build theme guidance section
  const themeGuidance = themeInfo ? `
***** THEME: ${themeInfo.name.toUpperCase()} *****
${themeInfo.description}

THEME-PREFERRED OPERATIONS:
${themeOps.preferred?.map(op => `- ${op}`).join('\n') || '- standard operations'}

THEME FEATURES TO INCLUDE:
${themeOps.featureAdditions?.map(f => `- ${f}`).join('\n') || '- none specific'}

THEME TIPS:
${themeOps.tips?.map(t => `• ${t}`).join('\n') || ''}

THEME MATERIALS:
- Primary: ${themeInfo.materials.primary}
- Secondary: ${themeInfo.materials.secondary}
- Windows: ${themeInfo.materials.windows}
- Roof: ${themeInfo.materials.roof}
` : '';
  
  // Get type-specific guidance
  const getTypeGuidance = () => {
    if (isPixelArt) {
      return `
***** PIXEL ART MODE *****
Use the pixel_art operation to generate a 2D grid.

PIXEL ART OPERATION:
- pixel_art: Renders a 2D image from a grid. Params:
  - base: {x, y, z} - Bottom-left corner position
  - facing: "south" - Direction art faces
  - grid: string[][] - 2D array where grid[0] is TOP row
    - Each cell is a block name (e.g., "red_wool", "black_concrete")
    - Use "air" or "" for transparent pixels

GUIDELINES:
1. Grid dimensions = design plan dimensions (width x height)
2. Row 0 is TOP of image
3. Use wool for vibrant colors, concrete for flat colors
4. Include outlines with black_wool

EXAMPLE (5x5 heart):
{"op": "pixel_art", "base": {"x": 0, "y": 0, "z": 0}, "facing": "south",
 "grid": [["", "red_wool", "", "red_wool", ""],
          ["red_wool", "red_wool", "red_wool", "red_wool", "red_wool"],
          ["red_wool", "red_wool", "red_wool", "red_wool", "red_wool"],
          ["", "red_wool", "red_wool", "red_wool", ""],
          ["", "", "red_wool", "", ""]]}
`;
    }
    
    if (isTower) {
      return `
***** TOWER BUILD MODE *****
Build a tall vertical structure.

RECOMMENDED OPERATIONS:
${worldEditAvailable ? '- we_cylinder: For round tower shaft' : '- hollow_box: For square tower shaft'}
- spiral_staircase: Interior stairs (REQUIRED)
- window_strip: Windows at regular intervals
- roof_gable or fill: For roof/battlements

BUILD ORDER:
1. Foundation: ${worldEditAvailable ? 'we_fill' : 'fill'} at y=0
2. Tower shaft: ${worldEditAvailable ? 'we_cylinder (hollow=true)' : 'hollow_box'} for walls
3. Spiral staircase: spiral_staircase inside
4. Windows: window_strip on each side at multiple heights
5. Roof: roof_gable or battlements at top

KEY POINTS:
- Height should be 2-4x the base width
- Add windows every 4-5 blocks vertically
- Include entry door at ground level
`;
    }
    
    if (isCastle) {
      return `
***** CASTLE BUILD MODE *****
Build a defensive fortification.

RECOMMENDED OPERATIONS:
- ${worldEditAvailable ? 'we_walls' : 'hollow_box'}: Outer walls
- ${worldEditAvailable ? 'we_cylinder' : 'hollow_box'}: Corner towers
- door: Gatehouse entrance
- fill: Battlements (alternating blocks)

BUILD ORDER:
1. Outer walls: ${worldEditAvailable ? 'we_walls' : 'hollow_box'} for perimeter
2. Corner towers: ${worldEditAvailable ? 'we_cylinder' : 'hollow_box'} at corners
3. Gatehouse: hollow_box + door at entrance
4. Keep: Central building (hollow_box + roof)
5. Battlements: Alternating blocks on wall tops
6. Courtyard: Open area inside (clear)

KEY POINTS:
- Walls should be 3+ blocks thick
- Towers at corners and along long walls
- Include main keep in center
`;
    }
    
    if (isTree) {
      return `
***** TREE/ORGANIC BUILD MODE *****
Build a NATURAL tree structure - NOT a building!

FORBIDDEN OPERATIONS (DO NOT USE):
- window_strip: Trees don't have windows!
- door: Trees don't have doors!
- hollow_box: Trees are solid, not hollow!
- roof_gable, roof_hip, roof_flat: Trees don't have roofs!
- we_walls: Trees are not buildings!
- we_pyramid: Creates unnatural geometric shapes - DON'T USE for leaves!

REQUIRED OPERATIONS (USE THESE):
- fill: For trunk sections (tapered - thicker at base)
- line: For branches extending from trunk
- fill: For leaf clusters (multiple overlapping cubes, NOT pyramids)
- set: For scattered individual leaves (organic feel)

BUILD ORDER (follow exactly):
1. TRUNK BASE: fill with log block, thick (3x3) at bottom
   Example: { "op": "fill", "block": "oak_log", "from": {"x": 6, "y": 0, "z": 6}, "to": {"x": 8, "y": 6, "z": 8} }

2. TRUNK MIDDLE: fill with log, thinner (2x2 or 1x1)
   Example: { "op": "fill", "block": "oak_log", "from": {"x": 7, "y": 7, "z": 7}, "to": {"x": 7, "y": 10, "z": 7} }

3. MAIN BRANCHES: line operations going outward AND upward
   Example: { "op": "line", "block": "oak_log", "from": {"x": 7, "y": 8, "z": 7}, "to": {"x": 3, "y": 10, "z": 7} }

4. DIAGONAL BRANCHES: More line operations at angles
   Example: { "op": "line", "block": "oak_log", "from": {"x": 7, "y": 9, "z": 7}, "to": {"x": 11, "y": 11, "z": 11} }

5. LEAF CLUSTERS: Multiple overlapping fill cubes (NOT pyramid!)
   - Main canopy around top of trunk
   - Smaller clusters at branch ends
   - Clusters should OVERLAP for natural look
   Example: { "op": "fill", "block": "oak_leaves", "from": {"x": 4, "y": 10, "z": 4}, "to": {"x": 10, "y": 14, "z": 10} }

6. ADDITIONAL LEAF CLUSTERS: Add 3-5 more at different heights/positions
   Example: { "op": "fill", "block": "oak_leaves", "from": {"x": 1, "y": 9, "z": 5}, "to": {"x": 4, "y": 12, "z": 8} }

7. DETAIL LEAVES: Scattered set operations for organic edges
   Example: { "op": "set", "block": "oak_leaves", "pos": {"x": 0, "y": 11, "z": 7} }

KEY TECHNIQUES:
- Trunk TAPERS: 3x3 at base → 2x2 middle → 1x1 at top
- Branches go OUTWARD and UPWARD (not horizontal)
- Leaf clusters are OVERLAPPING CUBES (not geometric shapes)
- Add 4-6 branches minimum for realistic look
- Leave small gaps in leaves for organic feel
- Total should be 15-25 steps for a quality tree
`;
    }
    
    if (isShip) {
      return `
***** SHIP/VEHICLE BUILD MODE *****
Build a vessel structure.

RECOMMENDED OPERATIONS:
- fill: Hull sections
- stairs: Curved hull edges
- hollow_box: Cabin
- line: Mast
- fill: Sails (wool)

BUILD ORDER:
1. Hull bottom: fill for keel
2. Hull sides: fill + stairs for curved shape
3. Deck: fill for flat deck
4. Cabin: hollow_box for captain's quarters
5. Mast: line of fence_posts or logs
6. Sails: fill with wool

KEY POINTS:
- Hull wider in middle, narrow at ends
- Use stairs for curved hull edges
- Deck should be flat and walkable
`;
    }
    
    if (isPyramid) {
      return `
***** PYRAMID BUILD MODE *****
Build a monumental geometric structure.

RECOMMENDED OPERATIONS:
- ${worldEditAvailable ? 'we_pyramid' : 'fill'}: Main pyramid shape
- fill: Entrance chamber
- stairs: Interior passages

BUILD ORDER:
1. Base: ${worldEditAvailable ? 'we_pyramid or' : ''} layered fill operations
2. For stepped pyramid: Decreasing fill layers
3. Entrance: hollow_box for chamber
4. Capstone: Different material at peak

KEY POINTS:
- Each layer 1 block smaller per side
- Include entrance at ground level
- Capstone can be gold_block
`;
    }
    
    if (isModern) {
      return `
***** MODERN BUILDING MODE *****
Build contemporary architecture.

RECOMMENDED OPERATIONS:
- ${worldEditAvailable ? 'we_fill' : 'fill'}: Floor plates
- hollow_box: Structural frame
- window_strip: Glass facades (ESSENTIAL)
- roof_flat: Flat roof

BUILD ORDER:
1. Foundation: fill at y=0
2. Floors: Stacked hollow_box for each floor
3. Glass walls: window_strip on all sides
4. Roof: roof_flat
5. Entrance: door + glass

KEY POINTS:
- Use concrete for clean look
- Large glass panels (window_strip)
- Flat roofs only
- Minimal ornamentation
`;
    }
    
    if (isUnderwater) {
      return `
***** UNDERWATER BUILD MODE *****
Build an underwater structure.

RECOMMENDED OPERATIONS:
- ${worldEditAvailable ? 'we_sphere' : 'fill'}: Glass domes
- ${worldEditAvailable ? 'we_cylinder' : 'hollow_box'}: Connecting tubes
- fill: Interior floors
- set: Lighting (sea_lantern)

BUILD ORDER:
1. Main dome: ${worldEditAvailable ? 'we_sphere' : 'spherical fill pattern'}
2. Connectors: ${worldEditAvailable ? 'we_cylinder' : 'hollow_box'} tubes
3. Interior: fill for floors
4. Lighting: sea_lantern throughout

KEY POINTS:
- Use glass for visibility
- Prismarine blocks fit theme
- Include ample lighting
`;
    }
    
    // Default house/building guidance
    return `
***** BUILDING MODE *****
Build a detailed, quality structure with depth and character.

RECOMMENDED OPERATIONS:
- ${worldEditAvailable ? 'we_fill' : 'fill'}: Foundation, floors (use secondary material for frame)
- ${worldEditAvailable ? 'we_walls' : 'hollow_box'}: Main walls (primary material)
- fill: Corner pillars (secondary material for depth)
- door: Entry (creates 2-block door)
- window_strip: Window rows with proper spacing
- roof_gable/roof_hip: Pitched roofs with overhang
- slab: Roof trim and details
- fence_connect: Porch railings, supports
- stairs: Porch steps, trim details

BUILD ORDER (10-20+ steps for quality):
1. Foundation: ${worldEditAvailable ? 'we_fill' : 'fill'} at y=0 (floor material)
2. Frame/Pillars: fill at corners (secondary material like logs)
3. Walls: ${worldEditAvailable ? 'we_walls' : 'hollow_box'} (primary material)
4. Wall Detail: fill horizontal beams at mid-height (accent material)
5. Door Frame: fill around door (secondary material)
6. Door: door operation at entrance
7. Windows: window_strip on each wall (y=2-3 typically)
8. Window Frames: Optional fill around windows (trim)
9. Roof Base: roof_gable or roof_hip (roof material)
10. Roof Trim: slab along roof edges for overhang
11. Chimney: fill stack on roof (stone material)
12. Porch: fill for porch floor
13. Porch Supports: fence_connect for supports
14. Porch Roof: slab or stairs above porch
15. Lighting: set torches/lanterns at entrance

QUALITY TECHNIQUES:
- Use logs/secondary at corners for structural depth
- Add trapdoors beside windows as shutters
- Create 1-block roof overhang with slabs
- Add a small porch with fence railings
- Mix materials: walls (planks) + frame (logs) + trim (slabs)
- Vary wall texture with occasional accent blocks
`;
  };
  
  // Get relevant example builds for few-shot learning
  const examples = isPixelArt ? [] : getExamplesForType(buildType, themeKey, 2);
  const examplesSection = formatExamplesForPrompt(examples, buildType);
  
  return `
Convert this design plan into executable build instructions:

${JSON.stringify(designPlan, null, 2)}

BUILD TYPE: ${typeInfo?.name || 'Building'}
${themeInfo ? `THEME: ${themeInfo.name}` : ''}
${examplesSection}
${getTypeGuidance()}
${themeGuidance}
STRICT CONSTRAINTS:
- Only use these blocks: ${allowlist.join(', ')}
- Coordinates must be relative (start at 0,0,0)
- Maximum dimensions: ${designPlan.dimensions.width}x${designPlan.dimensions.height}x${designPlan.dimensions.depth}
- ALL requested features MUST be included in the blueprint

${worldEditAvailable && !isPixelArt ? `
WORLDEDIT AVAILABLE - Optimize for performance:
- Use WorldEdit operations (we_*) for large volumes (>100 blocks)
- Use vanilla operations for details and small features
- For operations that support fallbacks (we_fill, we_walls, we_pyramid), include a fallback vanilla operation
` : ''}

AVAILABLE OPERATIONS:

BASIC OPERATIONS (vanilla - use for all builds):
- fill: Solid rectangular fill. Params: block, from {x,y,z}, to {x,y,z}
- hollow_box: Hollow box (walls only). Params: block, from {x,y,z}, to {x,y,z}
- set: Single block. Params: block, pos {x,y,z}
- line: Line of blocks. Params: block, from {x,y,z}, to {x,y,z}
- window_strip: Row of windows with spacing. Params: block, from {x,y,z}, to {x,y,z}, spacing (default: 2)
- roof_gable: Triangular roof. Params: block, from {x,y,z}, to {x,y,z}, peakHeight
- roof_flat: Flat roof. Params: block, from {x,y,z}, to {x,y,z}

DETAIL OPERATIONS (vanilla - use for quality builds):
- stairs: Oriented stairs. Params: block (must be *_stairs), pos {x,y,z}, facing (north/south/east/west)
- slab: Top/bottom slabs. Params: block (must be *_slab), pos {x,y,z}, half (top/bottom)
- fence_connect: Fence line. Params: block (must be *_fence), from {x,y,z}, to {x,y,z}
- door: Door placement. Params: block (must be *_door), pos {x,y,z}, facing (north/south/east/west)

COMPLEX OPERATIONS (vanilla - use for advanced features):
- spiral_staircase: Spiral stairs. Params: block (*_stairs), base {x,y,z}, height, radius (default: 2)
- balcony: Protruding balcony. Params: block (floor), base {x,y,z}, width, depth, facing, railing (optional)
- roof_hip: Four-sided hip roof. Params: block, from {x,y,z}, to {x,y,z}, peakHeight

${worldEditAvailable ? `
WORLDEDIT OPERATIONS (fast - use for large volumes):
- we_fill: Large fill (up to 50k blocks). Params: block, from {x,y,z}, to {x,y,z}, fallback {op, from, to, block}
- we_walls: Hollow structure. Params: block, from {x,y,z}, to {x,y,z}, fallback {op: "hollow_box", ...}
- we_pyramid: Pyramid/roof. Params: block, base {x,y,z}, height, hollow (true/false), fallback {...}
- we_cylinder: Cylindrical tower. Params: block, base {x,y,z}, radius, height, hollow, fallback {...}
- we_sphere: Spherical dome. Params: block, center {x,y,z}, radius, hollow, fallback {...}
- we_replace: Replace blocks. Params: from {x,y,z}, to {x,y,z}, fromBlock, toBlock
` : ''}

BUILDING SEQUENCE (follow this order):
1. Foundation: Use ${worldEditAvailable ? 'we_fill' : 'fill'} for base/floor (y=0 or y=1)
2. Walls: Use ${worldEditAvailable ? 'we_walls' : 'hollow_box'} for main structure
3. Features:
   - Doors: Use "door" operation (NOT set) - automatically creates 2-block tall doors
   - Windows: Use "window_strip" for evenly spaced window rows (preferred over multiple set operations)
   - Framed doorways/windows: Use window_strip with appropriate spacing for architectural detail
   - Stairs: Use "spiral_staircase" or regular "stairs"
   - Balconies: Use "balcony" operation
4. Roof: Use roof_gable, roof_hip, ${worldEditAvailable ? 'we_pyramid,' : ''} or roof_flat
5. Details: Add fences, slabs, decorative elements last

CRITICAL EFFICIENCY RULES:
- NEVER use multiple consecutive "set" operations - use "line", "fill", or "hollow_box" instead
- For 3+ blocks in a row: use "line" (not multiple set calls)
- For rectangular areas: use "fill" or ${worldEditAvailable ? '"we_fill"' : '"fill"'} (not nested loops of set)
- For hollow rooms/boxes: use "hollow_box" or ${worldEditAvailable ? '"we_walls"' : '"hollow_box"'} (not individual walls)
- Window rows: use "window_strip" with spacing parameter (not individual set operations)
${worldEditAvailable ? `
WORLDEDIT vs VANILLA GUIDANCE:
- WorldEdit operations (we_*) require a SELECTION (from/to coords) or CENTER/BASE point
- WorldEdit is fast for LARGE volumes (>100 blocks) - use we_fill, we_walls, we_sphere
- Vanilla operations work block-by-block - better for small details and precise placement
- When in doubt: Use WorldEdit for structure, vanilla for details
- Always include fallback for WorldEdit operations in case plugin is unavailable
` : ''}

QUALITY REQUIREMENTS:
- Include ALL features from design plan (${designPlan.features.join(', ')})
- Ensure structural integrity (foundation → walls → roof)
- Use ALL appropriate materials from design plan (aim for 6-10 unique blocks)
- Coordinates must stay within bounds: x[0-${designPlan.dimensions.width-1}], y[0-${designPlan.dimensions.height-1}], z[0-${designPlan.dimensions.depth-1}]
- MINIMUM 10-15 build steps for quality structures (unless pixel art)
- Add architectural details: corner posts, window frames, roof overhang
- Mix materials for visual depth (primary walls + secondary frame + accent trim)
- Include lighting (torches or lanterns at entrances)

REQUIRED JSON OUTPUT FORMAT:
Your response must be a valid, complete JSON object with this exact structure:
{
  "size": {"width": <number>, "height": <number>, "depth": <number>},
  "palette": ["<block1>", "<block2>", ...],
  "steps": [
    {"op": "<operation_name>", "block": "<block>", ...other params...},
    ...more steps...
  ]
}

IMPORTANT:
- Output ONLY valid JSON - no markdown, no explanations, no comments
- Make sure ALL braces and brackets are properly closed
- Include at least 5-20 steps to build the structure (or 1 pixel_art step for pixel art)
- Every step must have an "op" field specifying the operation type
- Complete the entire JSON response - do not truncate
${isPixelArt ? `- For pixel art: Use a SINGLE pixel_art operation with the complete grid` : ''}

Output only the JSON blueprint now:
`;
};

export const repairPrompt = (blueprint, errors, designPlan, allowlist, qualityScore = null) => `
The following blueprint has validation errors. Fix them while maintaining the design intent.

BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

VALIDATION ERRORS:
${errors.join('\n')}

${qualityScore ? `
QUALITY SCORE: ${(qualityScore.score * 100).toFixed(1)}% (minimum required: 70%)

QUALITY ISSUES:
${qualityScore.penalties.join('\n')}
` : ''}

CONSTRAINTS:
- Only use blocks from allowlist: ${allowlist.join(', ')}
- Dimensions: ${designPlan.dimensions.width}x${designPlan.dimensions.height}x${designPlan.dimensions.depth}
- All coordinates must be within bounds
- Required features MUST be included: ${designPlan.features.join(', ')}

REPAIR INSTRUCTIONS:
1. Fix validation errors (coordinate bounds, block allowlist, etc.)
2. Ensure ALL required features are present in the blueprint
3. Verify structural integrity (foundation, walls, roof)
4. Check that dimensions match design plan (within 20% tolerance)
5. Use appropriate operations for each feature type

Remember:
- Doors should use "door" operation (creates 2-block tall door)
- Windows should use "window_strip" for rows (NOT multiple set operations)
- Stairs should use "stairs" or "spiral_staircase"
- Roofs should use roof_gable, roof_hip, or roof_flat operations

EFFICIENCY REQUIREMENTS:
- Replace any sequence of 3+ "set" operations with "line", "fill", or "hollow_box"
- Never use set operations for rectangular areas - use fill instead
- Use "window_strip" with spacing parameter for window rows, not individual set calls

Fix the specific errors mentioned above. Output only the corrected JSON blueprint.
`;

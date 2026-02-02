/**
 * Unified blueprint prompt - merges design planning + blueprint generation
 * Single LLM call for complete executable blueprint
 */

import { getCharacterPalettePrompt } from '../../config/character-palettes.js';

/**
 * Check if this is a creative build type where LLM has block freedom
 */
function isCreativeBuild(buildType) {
  return ['pixel_art', 'statue', 'character', 'art', 'sculpture', 'three_d_layers'].includes(buildType);
}

/**
 * Get build type-specific guidance
 */
function getBuildTypeGuidance(buildType, hints) {
  const isMassive = hints.size === 'massive' || hints.size === 'colossal' || hints.size === 'large';

  const massiveGuidance = isMassive ? `
=== MASSIVE SCALE ENABLED ===
- You are authorized to build HUGE structures (50-100+ blocks).
- USE WorldEdit operations (we_sphere, we_cylinder, we_fill, we_walls) for main shapes.
- Do NOT build small boxy structures. Think grand scale.
` : '';

  // Universal design principles for visually impressive builds
  const designPrinciples = `
=== ARCHITECTURAL DESIGN PRINCIPLES (MANDATORY) ===
1. DEPTH & LAYERING: Never flat walls. Add pillars, recesses, overhangs.
2. MATERIAL VARIETY: Use 3-5 block types. Primary(60%), Secondary(25%), Accent(15%).
3. PROPORTIONS: Roof ~1/3 height, windows ~1/4 wall height, pillars tapered.
4. DECORATIVE DETAILS: Lanterns, flower pots, banners, shutters (trapdoors).
5. NO PLAIN BOXES: Every surface needs visual interest.
`;

  const guidance = {
    pixel_art: `
=== PIXEL ART BUILD ===
⚠️ CRITICAL: You MUST use the "pixel_art" operation.
- SIZE: Use 32x32 to 64x64 for detail.
- VISUALIZATION: Imagine the sprite as ASCII art first.
- ROW 0 is TOP of image. All rows MUST have the SAME length.
- COMPRESSED FORMAT (REQUIRED):
  - Output 'grid' as an array of strings
  - Output 'legend' object mapping chars to blocks
- LEGEND:
  - '.' = air (transparent)
  - '#' = black_wool (outlines)
  - Use ANY block that matches the color (Concrete, Terracotta, Gold, etc.)
`,

    statue: `
=== 3D STATUE BUILD ===
${massiveGuidance}
ESTABLISH PROPORTIONS:
1. FORM: Use we_sphere/we_cylinder for large muscle groups and limbs.
2. DETAIL: Use "three_d_layers" for complex facial features or intricate armor.
3. SILHOUETTE: Build from bottom up: base → legs → torso → arms → head.
- Use move operations to position each part relative to cursor.
`,

    tree: `
=== TREE BUILD ===
${massiveGuidance}
BUILD A NATURAL, ORGANIC TREE:
1. TRUNK:
   - Use we_cylinder (tapered radius) or solid box/we_fill
   - Root base should be wider than top
2. BRANCHES:
   - Angled outward from trunk
   - Use we_cylinder or heavy lines
3. CANOPY (Leaves):
   - CRITICAL: Use we_sphere for leaf clusters!
   - Overlap multiple spheres for irregular, organic look
   - Do NOT use a single box.
`,

    treehouse: `
=== TREEHOUSE BUILD ===
${massiveGuidance}
A TREEHOUSE MUST HAVE CONNECTED PARTS - NO FLOATING SECTIONS!

BUILD ORDER (CRITICAL - follow exactly):
1. TREE TRUNK (Ground to Platform):
   - Start at Y=0, use we_fill or we_cylinder
   - Make trunk TALL (at least 8-12 blocks high)
   - Trunk must reach UP TO the platform level

2. PLATFORM (Connected to Trunk):
   - Platform Y-level = trunk top (e.g., if trunk goes from Y=0 to Y=10, platform starts at Y=10)
   - Use we_fill for platform floor (oak_planks)
   - Platform MUST touch/surround the trunk
   - Extend platform outward from trunk center

3. HOUSE WALLS (On Platform):
   - Build walls ON TOP of the platform (Y = platform + 1)
   - Use we_walls sitting directly on the platform
   - Leave opening for trunk if it continues through

4. ROOF (On Walls):
   - Roof sits on top of walls
   - Use roof_gable or we_fill for flat roof
   - Add slight overhang (1-2 blocks)

5. ACCESS (Ground to Platform):
   - Ladder: line of ladder blocks from Y=0 to platform
   - OR stairs spiraling around trunk
   - MUST connect ground to platform entrance

6. RAILINGS (Platform Edges):
   - Fence posts on platform edges
   - Prevents falling

CONNECTIVITY RULES:
- Trunk Y-max = Platform Y-min (no gap!)
- Platform extends FROM trunk, not floating beside it
- Walls sit ON platform, roof ON walls
- Ladder/stairs connect ground to platform
`,

    house: `
=== HOUSE/MANSION BUILD ===
${massiveGuidance}
${designPrinciples}
STRUCTURE:
- Foundation: Stone base extending 1 block beyond walls
- Walls: we_walls with pillar corners (oak_log or stone_bricks)
- Roof: roof_gable with 1-2 block overhang
DETAILS (required):
- Porch with fence railings
- Window frames (trapdoors/stairs)
- Chimney with cobblestone + campfire
- Flower boxes (trapdoors + flowers)
`,

    castle: `
=== CASTLE/FORTRESS BUILD ===
${massiveGuidance}
- Walls: we_walls or we_fill
- Towers: we_cylinder (hollow) + roof cone (we_pyramid or manual)
- Gatehouse: Massive entrance with doors
- Keep: Central fortified structure
- Battlements: Crenellations on top of walls
`,

    tower: `
=== TOWER BUILD ===
${massiveGuidance}
${designPrinciples}
- Shaft: we_cylinder (hollow) or octagonal we_walls
- Interior: spiral_staircase (central)
- Levels: Multiple floors with windows
- Top: Spire (we_pyramid), dome (we_sphere), or battlements
`,

    modern: `
=== MODERN ARCHITECTURE ===
${massiveGuidance}
${designPrinciples}
MODERN STYLE RULES:
- Clean geometric shapes with asymmetric composition
- Large glass facades (glass_pane walls, NOT scattered small windows)
- Materials: white_concrete, quartz_block, glass, black_concrete trim
- Cantilevered sections (overhangs without visible supports)
- Flat or angular roofs with edge trim
- NO traditional elements (no chimneys, no peaked roofs)
`
  };

  return guidance[buildType] || `
=== STANDARD BUILD ===
${massiveGuidance}
${designPrinciples}
- Create the structure with visual appeal
- Use appropriate materials for the theme
- Add decorative details and layering
`;
}

/**
 * Get WorldEdit guidance section
 */
function getWorldEditGuidance(worldEditAvailable) {
  if (!worldEditAvailable) {
    return `
=== WORLDEDIT: DISABLED ===
Use vanilla operations only (box, wall, line, set, door, window_strip, etc.)
`;
  }

  return `
=== WORLDEDIT: ENABLED ===
WorldEdit operations available for large volumes (auto-used by universal operations).

WORLDEDIT OPERATIONS (use for volumes > 20 blocks):
- we_fill: Large solid volumes. Params: block, from {x,y,z}, to {x,y,z}
  Fallback: {"op": "box", "from": {...}, "to": {...}, "block": "..."}

- we_walls: Hollow structures. Params: block, from {x,y,z}, to {x,y,z}
  Fallback: {"op": "wall", "from": {...}, "to": {...}, "block": "..."}

- we_sphere: Domes/organic shapes. Params: block, center {x,y,z}, radius, hollow (true/false)
  Fallback: {"op": "box", ...approximate with boxes...}

- we_cylinder: Towers/pillars. Params: block, base {x,y,z}, radius, height, hollow (true/false)
  Fallback: {"op": "wall", ...approximate...}

- we_pyramid: Pyramids. Params: block, base {x,y,z}, height, hollow (true/false)
  Fallback: {"op": "box", ...layered boxes...}

IMPORTANT:
- Always include fallback for each WorldEdit operation
- Use WorldEdit for large volumes, vanilla for details
`;
}

/**
 * Get operation reference
 */
function getOperationReference() {
  return `
=== AVAILABLE OPERATIONS ===

UNIVERSAL OPERATIONS (PREFER THESE - Cursor-aware, auto-optimized):
- box: Solid volume. Params: size {x,y,z} OR from/to, block
  Example: {"op": "box", "size": {"x": 10, "y": 5, "z": 10}, "block": "$primary"}

- wall: Hollow box/walls. Params: size {x,y,z} OR from/to, block
  Example: {"op": "wall", "size": {"x": 10, "y": 5, "z": 10}, "block": "$primary"}

- outline: Frame/wireframe. Params: size {x,y,z} OR from/to, block
  Example: {"op": "outline", "size": {"x": 10, "y": 5, "z": 10}, "block": "$accent"}

- move: Move cursor relative. Params: offset {x,y,z}
  Example: {"op": "move", "offset": {"x": 0, "y": 5, "z": 0}}

- cursor_reset: Reset cursor to origin.
  Example: {"op": "cursor_reset"}

SPECIALIST OPERATIONS:
- pixel_art: 2D sprite. Params: base {x,y,z}, grid (array of strings), legend, facing
- three_d_layers: 3D structured build. Success pattern from pixel art. Params: base {x,y,z}, layers (array of grids), legend
  Example: {"op": "three_d_layers", "base": {"x": 0, "y": 0, "z": 0}, "layers": [[..grid..], [..grid..]], "legend": {...}}

- spiral_staircase: Spiral stairs. Params: block (*_stairs), base {x,y,z}, height, radius
  Example: {"op": "spiral_staircase", "block": "oak_stairs", "base": {"x": 5, "y": 0, "z": 5}, "height": 10, "radius": 2}

- window_strip: Windows with spacing. Params: block (*_pane), from {x,y,z}, to {x,y,z}, spacing (default: 2)
  Example: {"op": "window_strip", "block": "glass_pane", "from": {"x": 1, "y": 2, "z": 0}, "to": {"x": 9, "y": 2, "z": 0}, "spacing": 2}

- door: Door (2 blocks tall). Params: block (*_door), pos {x,y,z}, facing (north/south/east/west)
  Example: {"op": "door", "block": "oak_door", "pos": {"x": 5, "y": 0, "z": 0}, "facing": "south"}

- roof_gable: Gabled roof. Params: block (*_stairs), from {x,y,z}, to {x,y,z}, direction ("north"/"south"/"east"/"west")
- roof_hip: Hip roof. Params: block (*_stairs), from {x,y,z}, to {x,y,z}
- roof_flat: Flat roof. Params: block, from {x,y,z}, to {x,y,z}

SMART OPERATIONS (Procedural generation):
- smart_wall: Procedural wall. Params: from, to, palette ["primary", ...], pattern ("checker", "striped", "noise", "border")
- smart_floor: Procedural floor. Params: from, to, palette, pattern ("checker", "tiled", "parquet", "radial")
- smart_roof: Procedural roof. Params: from, to, block, style ("gable", "dome", "pagoda", "a-frame")

LEGACY OPERATIONS (avoid if possible, use universal ops instead):
- fill: Use 'box' instead
- hollow_box: Use 'wall' instead
- set: Use for single blocks only
- line: Use for lines only
`;
}

/**
 * Get quality-specific guidance
 */
function getQualityGuidance(quality) {
  if (!quality || quality.quality === 'standard') {
    return '';
  }

  if (quality.quality === 'exceptional') {
    return `
=== EXCEPTIONAL QUALITY REQUESTED ===
⭐ The user wants a MASTERPIECE. Go above and beyond!

QUALITY REQUIREMENTS:
- Add EXTRA architectural details and ornamentation
- Use VARIED materials for visual richness (don't just use one block type)
- Include ASYMMETRIC elements for natural, organic feel
- Add DEPTH with layered walls, recessed windows, protruding elements
- Consider DRAMATIC proportions - taller spires, wider bases, more impressive scale
- Include ACCENT DETAILS - trim, molding, decorative elements
- Use COMPLEMENTARY COLORS in your block palette
- Add VISUAL INTEREST at every level of the build
- FOR STATUES/CHARACTERS: Use "three_d_layers" for high-fidelity forms.

QUALITY TIPS FROM DETECTED MODIFIERS (${quality.modifiers?.join(', ')}):
${quality.tips?.map(t => `- ${t}`).join('\n') || '- Make it impressive!'}

DO NOT create a basic or minimal build. This should be SHOWCASE quality.
`;
  }

  if (quality.quality === 'high') {
    return `
=== HIGH QUALITY REQUESTED ===
The user wants something nice - add appropriate details.

QUALITY REQUIREMENTS:
- Include finishing touches and details
- Use accent blocks for visual interest
- Ensure pleasing proportions
- Add appropriate decorative elements

QUALITY TIPS:
${quality.tips?.map(t => `- ${t}`).join('\n') || '- Make it look good!'}
`;
  }

  return '';
}

/**
 * Main unified blueprint prompt
 */
export function unifiedBlueprintPrompt(analysis, worldEditAvailable, hasImage = false) {
  const { userPrompt, buildType, theme, hints, quality, character } = analysis;

  const themeName = theme?.name || 'default';
  const themeSection = theme ? `
THEME: ${theme.name}
Theme materials:
- Primary: ${theme.materials.primary}
- Secondary: ${theme.materials.secondary}
- Accent: ${theme.materials.accent}
- Roof: ${theme.materials.roof}
- Windows: ${theme.materials.windows}
` : '';

  const qualitySection = getQualityGuidance(quality);
  const creativeBuild = isCreativeBuild(buildType);

  // NEW: Character palette injection
  const characterSection = getCharacterPalettePrompt(character);

  const imageInstruction = hasImage ? `
=== VISUAL ANALYSIS MODE ===
An image has been provided.
1. ANALYZE the image to understand the architectural style, proportions, and materials.
2. REPLICATE the structure in the image as closely as possible using available blocks.
3. IGNORE generic style rules if they conflict with the image.
` : '';

  return `
You are an expert Minecraft architect. Build: "${userPrompt}"
${imageInstruction}
${characterSection}

BUILD TYPE: ${buildType.toUpperCase()}
${themeSection}
${qualitySection}

=== YOUR TASK ===
Generate a COMPLETE executable blueprint including:
1. Choose appropriate dimensions for this build
2. Select blocks that best represent the subject
3. Output all build operations needed

${getBuildTypeGuidance(buildType, hints)}

=== BLOCK SELECTION (YOU DECIDE) ===
${creativeBuild ? `
CREATIVE BUILD - AESTHETIC EXCELLENCE REQUIRED:
${character ? '(Character palette provided above - USE IT!)' : `
- Starting suggestions: ${hints.materials.primary}, ${hints.materials.secondary}
- Choose colors/materials that best represent: "${userPrompt}"
`}

=== AESTHETIC GUIDELINES ===
BLOCK PRIORITY (in order of preference):
1. CONCRETE - Smooth, vibrant, premium look. Use for main colors.
2. TERRACOTTA - Muted, earthy tones. Use for skin, shading, browns.
3. WOOL - Only when texture variety needed. Avoid mixing with concrete for same color.

AVOID:
- Mixing wool + concrete for the same color (inconsistent look)
- Using dull blocks (dirt, cobblestone) for vibrant subjects
- Default gray/stone when colorful blocks exist

THINK PREMIUM: Would this look good in a Minecraft build showcase?
` : `
STRUCTURED BUILD - Material Recommendations:
- Primary: ${hints.materials.primary} (walls)
- Secondary: ${hints.materials.secondary} (frame/pillars)
- Accent: ${hints.materials.accent} (trim/details)
- Roof: ${hints.materials.roof} (roof blocks)
- Theme: ${themeName}
- You may adjust materials to fit the design
`}

=== DIMENSIONS (INTENT-BASED SCALING) ===
Scale based on user intent - bigger is often better for impressive builds:
- "tiny/small" builds: 10-25 blocks
- "medium/normal" builds: 25-50 blocks
- "large/big" builds: 50-80 blocks
- "massive/huge" builds: 80-120 blocks
- "colossal/epic/legendary" builds: 120-200+ blocks
- ONLY hard limit: height ≤ 256 (Minecraft world ceiling)
- DO NOT artificially constrain yourself based on "typical" Minecraft builds

=== CREATIVE FREEDOM CLAUSE ===
PRIORITIZE VISUAL IMPACT over simplicity:
- SILHOUETTE FIRST: Build overall shape/mass before any details
- SCALE MATTERS: Bigger is often better for impressive builds
- ASYMMETRY IS BEAUTIFUL: Avoid perfect symmetry for organic builds
- NEGATIVE SPACE: Use air gaps, overhangs, recesses for depth
- EXAGGERATED PROPORTIONS: Taller towers, wider bases, dramatic angles
- DO NOT limit yourself based on old conventions - be creative!

=== MANDATORY BUILD PHASES ===
You MUST build in this order:

PHASE 1 - SILHOUETTE (~40% of operations):
- Establish overall shape and mass
- Use: we_sphere, we_cylinder, we_fill, box, wall
- This defines the build's profile from a distance

PHASE 2 - SECONDARY FORMS (~35% of operations):
- Major features and structural elements
- Use: we_fill, fill, hollow_box, three_d_layers
- Branches, towers, major protrusions

PHASE 3 - DETAILS (~25% of operations):
- Fine details and finishing
- Use: set, line, stairs, slab, three_d_layers
- Windows, doors, trim, decorations

${getWorldEditGuidance(worldEditAvailable)}

${getOperationReference()}

=== VARIABLE MATERIALS (USE THESE) ===
Use variables in 'block' fields to allow theming:
- "$primary" - Main walls
- "$secondary" - Frames/Pillars
- "$accent" - Details/Trim
- "$roof" - Roofing
- "$window" - Glass

=== CURSOR-RELATIVE BUILDING ===
IMPORTANT: All operations are relative to a CURSOR that starts at (0, 0, 0).
- Use "move" to reposition cursor before each operation
- Use "cursor_reset" to return to origin
- Coordinates in operations are relative to CURSOR position

Example structure:
  {"op": "box", "size": {"x": 10, "y": 1, "z": 10}, "block": "$primary"}, // Foundation at cursor
  {"op": "move", "offset": {"x": 0, "y": 1, "z": 0}},                    // Move cursor up 1
  {"op": "wall", "size": {"x": 10, "y": 5, "z": 10}, "block": "$primary"}, // Walls above foundation
  {"op": "move", "offset": {"x": 4, "y": 0, "z": 0}},                    // Move cursor to door position
  {"op": "door", "block": "oak_door", "pos": {"x": 0, "y": 0, "z": 0}, "facing": "south"}

=== OUTPUT FORMAT ===
{
  "buildType": "\${buildType}",
  "theme": "\${theme?.theme || 'default'}",
  "description": "Brief description",
  "size": {"width": <number>, "height": <number>, "depth": <number>},
  "palette": {
     "primary": "stone_bricks",
     "secondary": "oak_log",
     "accent": "cracked_stone_bricks",
     "roof": "spruce_stairs",
     "window": "glass_pane"
  },
  "steps": [
    {"op": "box", "size": {"x": 10, "y": 1, "z": 10}, "block": "$primary"},
    {"op": "move", "offset": {"x": 0, "y": 1, "z": 0}},
    {"op": "wall", "size": {"x": 10, "y": 5, "z": 10}, "block": "$primary"},
    ...
  ]
}

CRITICAL CONSTRAINTS – MUST FOLLOW:

1. VALID OPERATIONS ONLY (use EXACTLY these names):
   box, wall, outline, move, cursor_reset, pixel_art, three_d_layers,
   we_fill, we_walls, we_sphere, we_cylinder, we_pyramid,
   door, window_strip, roof_gable, roof_hip, roof_flat,
   smart_wall, smart_floor, smart_roof, spiral_staircase,
   set, line, fill, hollow_box, balcony, fence_connect, site_prep
   
   ❌ WRONG: "walls" (use "we_walls" or "wall")
   ❌ WRONG: "cylinder" (use "we_cylinder")
   ❌ WRONG: "pyramid" (use "we_pyramid")

2. COORDINATES MUST BE >= 0:
   All from.x, from.y, from.z, to.x, to.y, to.z, pos.x, etc. MUST be zero or positive.
   Build origin (0,0,0) is the player's position.
   ❌ WRONG: {"from": {"x": -5, "y": 0, "z": 0}}
   ✅ RIGHT: {"from": {"x": 0, "y": 0, "z": 0}}

3. USE SIZE OR FROM/TO – NOT BOTH:
   Universal ops (box, wall) use "size" or "from"/"to", not both.

4. REQUIRED PARAMS PER OPERATION:
   - box/wall/outline: size OR (from + to), block
   - we_sphere: center, radius, block, hollow
   - we_cylinder: base, radius, height, block, hollow
   - we_pyramid: base, height, block, hollow  
   - we_fill/we_walls: from, to, block
   - pixel_art: base, grid, legend, facing
   - three_d_layers: base, layers, legend
   - door: pos, block, facing
   - window_strip: from, to, block
   - roof_*: from, to, block (+ direction for gable)

5. OUTPUT FORMAT:
   - Output ONLY valid JSON (no markdown)
   - For pixel_art/three_d_layers: ALL rows must have EXACTLY the same length
   - Use "$primary", "$secondary" etc. for themed blocks

6. EFFICIENCY – FEWER OPERATIONS IS BETTER:
   - Prefer ONE large we_fill over MANY small set operations
   - Use we_sphere/we_cylinder for organic shapes, not many boxes
   - Use we_walls for hollow structures, not 4 separate wall ops
   - A good build has 10-50 operations, not 500+
   - ALWAYS use WorldEdit ops (we_*) for volumes > 10 blocks
`;
}

export default unifiedBlueprintPrompt;

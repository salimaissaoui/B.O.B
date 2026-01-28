/**
 * Unified blueprint prompt - merges design planning + blueprint generation
 * Single LLM call for complete executable blueprint
 */

/**
 * Check if this is a creative build type where LLM has block freedom
 */
function isCreativeBuild(buildType) {
  return ['pixel_art', 'statue', 'character', 'art', 'sculpture'].includes(buildType);
}

/**
 * Get build type-specific guidance
 */
function getBuildTypeGuidance(buildType, hints) {
  const guidance = {
    pixel_art: `
=== PIXEL ART BUILD ===
⚠️ CRITICAL: You MUST use the "pixel_art" operation. Do NOT use fill/hollow_box/set operations.

- SIZE LIMIT: Maximum 64x64 pixels. Keep it simple and iconic.
- VISUALIZATION: Imagine the sprite as ASCII art first.
- ROW 0 is TOP of image. All rows MUST have the SAME length.
- COMPRESSED FORMAT (REQUIRED):
  - Output 'grid' as an array of strings (e.g. ["...###...", "...#O#..."])
  - Output 'legend' object mapping chars to blocks
- LEGEND (REQUIRED):
  - '.' = air (transparent background)
  - '#' = black_wool (outlines)
  - Use single chars for all colors (O, Y, R, W, B, etc.)
- CRITICAL: Every row must be the exact same length. Pad with '.' if needed.
- OPERATION FORMAT:
  {
    "op": "pixel_art",
    "base": {"x": 0, "y": 0, "z": 0},
    "facing": "south",
    "grid": ["row0", "row1", ...],
    "legend": {".": "air", "#": "black_wool", ...}
  }
`,

    statue: `
=== 3D STATUE BUILD ===
- Use box for body volumes (solid structures)
- Use wall for hollow volumes (if needed)
- Build from bottom up: base → body → limbs → head → details
- Choose colors that match the character/subject
- Use move operations to position each part relative to cursor
`,

    tree: `
=== TREE BUILD ===
BUILD A BEAUTIFUL ORGANIC TREE with these steps:

1. TRUNK (bottom to top):
   - Use box for trunk sections
   - Trunk should be 2-4 blocks wide at base, tapering to 1-2 at top
   - Oak log for oak trees, spruce log for spruce, etc.
   - Height: 8-15 blocks for medium tree, 15-25 for large

2. MAIN BRANCHES (from trunk):
   - Use box operations angled outward from trunk
   - 3-5 main branches per tree
   - Branches should be 1-2 blocks thick
   - Offset each branch at different Y levels and directions

3. CANOPY (leaves):
   - Use multiple overlapping box operations
   - Create 3-4 leaf clusters at different positions
   - Each cluster: roughly spherical 4-7 blocks diameter
   - Offset clusters so canopy looks natural, NOT perfectly symmetric
   - Use oak_leaves, spruce_leaves, etc. matching the wood type

4. ROOTS (optional for large trees):
   - Use box for exposed roots at base spreading outward

EXAMPLE OPERATIONS for a "big beautiful oak tree":
  {"op": "box", "size": {"x": 2, "y": 12, "z": 2}, "block": "$primary"},
  {"op": "move", "offset": {"x": 0, "y": 8, "z": 0}},
  {"op": "box", "size": {"x": 4, "y": 1, "z": 1}, "block": "$primary"},
  {"op": "box", "size": {"x": 10, "y": 5, "z": 10}, "block": "$secondary"}
`,

    house: `
=== HOUSE BUILD ===
- Foundation: box at ground level
- Walls: wall operation (hollow box)
- Door: door operation (auto creates 2-block tall)
- Windows: window_strip for rows
- Roof: roof_gable or roof_hip
- Add details: porch, chimney, window frames
`,

    castle: `
=== CASTLE BUILD ===
- Outer walls: wall operation or we_walls
- Corner towers: we_cylinder or wall (hollow box)
- Gatehouse: wall + door
- Battlements: alternating blocks on wall tops
- Keep: central building with roof
`,

    tower: `
=== TOWER BUILD ===
- Base foundation: box
- Shaft: wall (hollow) or we_cylinder (hollow)
- Interior: spiral_staircase (REQUIRED)
- Windows: window_strip at regular intervals
- Top: roof_gable or battlements
`
  };

  return guidance[buildType] || `
=== STANDARD BUILD ===
- Foundation → Walls → Features → Roof → Details
- Use wall for hollow structures
- Use box for solid volumes
- Use door operation for doors
- Use window_strip for windows
- Use appropriate roof operation
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
  Example: {"op": "pixel_art", "base": {"x": 0, "y": 0, "z": 0}, "facing": "south", "grid": [...], "legend": {...}}

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
export function unifiedBlueprintPrompt(analysis, worldEditAvailable) {
  const { userPrompt, buildType, theme, hints, quality } = analysis;

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

  return `
You are an expert Minecraft architect. Build: "${userPrompt}"

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
CREATIVE BUILD - Full Freedom:
- Starting suggestions: ${hints.materials.primary}, ${hints.materials.secondary}
- You may use ANY valid Minecraft 1.20.1 blocks
- Choose colors/materials that best represent: "${userPrompt}"
- Be creative! Don't limit yourself to suggested blocks
` : `
STRUCTURED BUILD - Material Recommendations:
- Primary: ${hints.materials.primary} (walls)
- Secondary: ${hints.materials.secondary} (frame/pillars)
- Accent: ${hints.materials.accent} (trim/details)
- Roof: ${hints.materials.roof} (roof blocks)
- Theme: ${themeName}
- You may adjust materials to fit the design
`}

=== DIMENSIONS (ADAPTIVE SCALING) ===
Determine the natural size needed for high detail:
- Simple objects (e.g. apple, ball): 16x16 - 32x32
- Complex objects (e.g. dragon, castle): 48x48 - 80x80
- Max Limit: 100x100x100 (Safety Cap)
- DO NOT artificially squash the build. Use the space needed for quality.

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
  "buildType": "${buildType}",
  "theme": "${theme?.theme || 'default'}",
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

CRITICAL RULES:
- Prefer "box", "wall", "outline" for structural elements
- USE "pixel_art" operation for 2D sprites/images (MANDATORY for pixel_art buildType)
- Use "$variables" for blocks whenever possible
- Use "move" to position cursor before operations
- All coordinates are relative to CURSOR position
- Output ONLY valid JSON
- For pixel_art: ALL rows must have EXACTLY the same length
`;
}

export default unifiedBlueprintPrompt;

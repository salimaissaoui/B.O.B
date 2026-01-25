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
- Use fill/we_fill for body volumes
- Use we_sphere for rounded parts (head, joints)
- Use we_cylinder for limbs
- Build from bottom up: base → body → limbs → head → details
- Choose colors that match the character/subject
`,

    tree: `
=== TREE BUILD ===
- Use we_fill for trunk sections and leaf volumes
- Use line for individual branches
- Make canopy asymmetric (offset from center)
- Randomize branch angles and lengths
- NEVER use we_sphere or we_cylinder (too geometric)
`,

    house: `
=== HOUSE BUILD ===
- Foundation: fill/we_fill at y=0
- Walls: hollow_box/we_walls
- Door: door operation (auto creates 2-block tall)
- Windows: window_strip for rows
- Roof: roof_gable or roof_hip
- Add details: porch, chimney, window frames
`,

    castle: `
=== CASTLE BUILD ===
- Outer walls: we_walls or hollow_box
- Corner towers: we_cylinder or hollow_box
- Gatehouse: hollow_box + door
- Battlements: alternating blocks on wall tops
- Keep: central building with roof
`,

    tower: `
=== TOWER BUILD ===
- Base foundation: fill/we_fill
- Shaft: we_cylinder (hollow) or hollow_box
- Interior: spiral_staircase (REQUIRED)
- Windows: window_strip at regular intervals
- Top: roof_gable or battlements
`
  };

  return guidance[buildType] || `
=== STANDARD BUILD ===
- Foundation → Walls → Features → Roof → Details
- Use hollow_box/we_walls for walls
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
Use vanilla operations only (fill, hollow_box, line, set, door, window_strip, etc.)
`;
  }

  return `
=== WORLDEDIT: ENABLED ===
Generate WorldEdit operations DIRECTLY in the blueprint:

WORLDEDIT OPERATIONS (use for volumes > 3 blocks):
- we_fill: Large volumes. Params: block, from {x,y,z}, to {x,y,z}
  Fallback: {"op": "fill", "block": "...", "from": {...}, "to": {...}}

- we_walls: Hollow structures. Params: block, from {x,y,z}, to {x,y,z}
  Fallback: {"op": "hollow_box", "block": "...", "from": {...}, "to": {...}}

- we_sphere: Domes/organic shapes. Params: block, center {x,y,z}, radius, hollow (true/false)
  Fallback: {"op": "fill", ...approximate with fills...}

- we_cylinder: Towers/pillars. Params: block, base {x,y,z}, radius, height, hollow (true/false)
  Fallback: {"op": "hollow_box", ...approximate...}

- we_pyramid: Pyramids. Params: block, base {x,y,z}, height, hollow (true/false)
  Fallback: {"op": "fill", ...layered fills...}

IMPORTANT:
- Generate WorldEdit ops natively (don't generate vanilla ops for later conversion)
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

SMART OPERATIONS (PREFER THESE for structures):
- smart_wall: Procedural wall. Params: from, to, palette ["primary", ...], pattern ("checker", "striped", "noise", "border")
- smart_floor: Procedural floor. Params: from, to, palette, pattern ("checker", "tiled", "parquet", "radial")
- smart_roof: Procedural roof. Params: from, to, block, style ("gable", "dome", "pagoda", "a-frame")

BASIC (vanilla):
- fill: Solid box. Params: block, from {x,y,z}, to {x,y,z}
- hollow_box: Hollow box. Params: block, from {x,y,z}, to {x,y,z}
- set: Single block. Params: block, pos {x,y,z}
- line: Line of blocks. Params: block, from {x,y,z}, to {x,y,z}
- door: Door (2 blocks tall). Params: block (*_door), pos {x,y,z}, facing (north/south/east/west)
- window_strip: Window row with spacing. Params: block, from {x,y,z}, to {x,y,z}, spacing (default: 2)
- spiral_staircase: Spiral stairs. Params: block (*_stairs), base {x,y,z}, height, radius (default: 2)
- pixel_art: 2D image. Params: base {x,y,z}, facing (south), grid, legend

WORLDEDIT (fast for large volumes):
- we_fill: Large fill. Params: block, from, to, fallback
- we_walls: Hollow structure. Params: block, from, to, fallback
- we_sphere: Sphere/dome. Params: block, center, radius, hollow, fallback
- we_cylinder: Cylinder/tower. Params: block, base, radius, height, hollow, fallback
- we_pyramid: Pyramid. Params: block, base, height, hollow, fallback
`;
}

/**
 * Main unified blueprint prompt
 */
export function unifiedBlueprintPrompt(analysis, worldEditAvailable) {
  const { userPrompt, buildType, theme, hints } = analysis;

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

  const creativeBuild = isCreativeBuild(buildType);

  return `
You are an expert Minecraft architect. Build: "${userPrompt}"

BUILD TYPE: ${buildType.toUpperCase()}
${themeSection}

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

=== DIMENSIONS (YOU DECIDE) ===
Suggested: ${hints.dimensions.width}x${hints.dimensions.height}x${hints.dimensions.depth}
Adjust based on subject (max: 100x256x100)

${getWorldEditGuidance(worldEditAvailable)}

=== UNIVERSAL OPERATIONS (PREFER THESE) ===
- box: Solid volume. Params: size {x,y,z} OR from/to, block
- wall: Hollow box/walls. Params: size {x,y,z} OR from/to, block
- outline: Frame/wireframe. Params: size {x,y,z} OR from/to, block
- move: Move cursor relative. Params: offset {x,y,z}
- cursor_reset: Reset cursor to origin.

=== SPECIALIST OPERATIONS ===
- pixel_art: 2D sprite. Params: grid (array of strings), legend, facing
- spiral_staircase: Params: block, height, radius
- window_strip: Params: block, spacing

=== VARIABLE MATERIALS ===
Use variables in 'block' fields to allow theming:
- "$primary" (Main walls)
- "$secondary" (Frames/Pillars)
- "$accent" (Details)
- "$roof" (Roofing)
- "$window" (Glass)

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
     "window": "glass_pane",
     // Add others as needed
  },
  "steps": [
    {"op": "box", "size": {"x": 10, "y": 1, "z": 10}, "block": "$primary"}, // Foundation
    {"op": "move", "offset": {"x": 0, "y": 1, "z": 0}},
    {"op": "wall", "size": {"x": 10, "y": 5, "z": 10}, "block": "$primary"}, // Walls
    ...
  ]
}

CRITICAL RULES:
- Prefer "box", "wall", "outline" for structural elements.
- USE "pixel_art" operation for 2D sprites/images.
- Use "$variables" for blocks whenever possible.
- Coordinates relative to CURSOR (which starts at 0,0,0).
- Use "move" to stack structures easily.
- Output ONLY valid JSON.
`;
}

export default unifiedBlueprintPrompt;

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
- Use pixel_art operation with 2D grid
- Grid dimensions: width x height x 1 depth
- Row 0 is TOP of image
- Use wool for vibrant colors, concrete for flat tones
- Include outlines with black_wool
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

BASIC (vanilla):
- fill: Solid box. Params: block, from {x,y,z}, to {x,y,z}
- hollow_box: Hollow box. Params: block, from {x,y,z}, to {x,y,z}
- set: Single block. Params: block, pos {x,y,z}
- line: Line of blocks. Params: block, from {x,y,z}, to {x,y,z}
- door: Door (2 blocks tall). Params: block (*_door), pos {x,y,z}, facing (north/south/east/west)
- window_strip: Window row with spacing. Params: block, from {x,y,z}, to {x,y,z}, spacing (default: 2)
- roof_gable: Triangular roof. Params: block, from {x,y,z}, to {x,y,z}, peakHeight
- roof_hip: Hip roof. Params: block, from {x,y,z}, to {x,y,z}, peakHeight
- roof_flat: Flat roof. Params: block, from {x,y,z}, to {x,y,z}
- spiral_staircase: Spiral stairs. Params: block (*_stairs), base {x,y,z}, height, radius (default: 2)
- pixel_art: 2D image. Params: base {x,y,z}, facing (south), grid (2D array of blocks)

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

${getOperationReference()}

=== OUTPUT FORMAT ===
{
  "buildType": "${buildType}",
  "theme": "${theme?.theme || 'default'}",
  "description": "Brief description of the build",
  "size": {"width": <number>, "height": <number>, "depth": <number>},
  "palette": ["all", "blocks", "used"],
  "steps": [
    {"op": "operation_name", "block": "block_name", ...params...},
    ...
  ]
}

CRITICAL RULES:
- Coordinates are relative (start at 0,0,0)
- Include ALL required features: ${hints.features.join(', ')}
- Minimum ${creativeBuild ? '15' : '20'} steps for quality builds (prefer more details)
- LAYER YOUR BUILDS: Base shape -> Secondary shapes -> Details/Trim -> Interior
- AVOID flat walls: Use depth, pillars, and window sills to add texture
- Output ONLY valid JSON (no markdown, no explanations)
- Complete the entire JSON (don't truncate)

⚠️ OPERATION NAMES - USE EXACTLY THESE (DO NOT INVENT NAMES):
Vanilla: fill, hollow_box, set, line, door, window_strip, roof_gable, roof_hip, roof_flat, spiral_staircase, pixel_art
WorldEdit: we_fill, we_walls, we_sphere, we_cylinder, we_pyramid
❌ INVALID: fill_cylinder, fill_sphere, fill_box (these do NOT exist - use we_cylinder, we_sphere instead)

Output only the JSON blueprint now:
`;
}

export default unifiedBlueprintPrompt;

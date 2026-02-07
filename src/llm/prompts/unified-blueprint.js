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
BUILD ORDER:
1. PEDESTAL/BASE:
   - Always start with a solid base platform
   - Use we_fill for rectangular base
   - Stone_bricks or quartz for classic look
   - Height: 2-5 blocks depending on statue size

2. BODY CORE:
   - Use we_fill boxes for torso/main mass
   - Build from bottom up: legs → torso → shoulders

3. LIMBS:
   - Use we_fill rectangular shapes for arms/legs
   - NOT we_sphere - blocky is more Minecraft-authentic
   - Position with move operations

4. HEAD:
   - Use we_fill for head block shape
   - Add details with individual set operations

5. DETAILS:
   - Use "three_d_layers" for complex features
   - Add small accent blocks for facial features, clothing details
`,

      tree: `
=== TREE BUILD (CSD Philosophy) ===
${massiveGuidance}

PHASE 1 – CORE (Trunk Base):
- ONE we_cylinder or we_fill for the main trunk mass
- Start wide at base, this is just the core shape

PHASE 2 – STRUCTURE (Trunk Taper + Branches + Canopy):
- Add 2-3 additional trunk segments, each NARROWER than below (tapering trunk)
- Add 3-5 BRANCHES using we_fill or we_cylinder, angled outward from trunk
- CANOPY: Use 3-5 OVERLAPPING we_sphere operations at DIFFERENT positions
  * Vary sphere radii by 1-2 blocks (e.g., radius 4, 3, 3, 4, 2)
  * Offset sphere centers asymmetrically (+/-2 blocks in X/Z, +/-1 in Y)
  * Overlapping spheres create NATURAL, IRREGULAR canopy shapes
  * DO NOT use a single sphere (looks like a lollipop)

PHASE 3 – DETAIL (Texture + Hollows + Roots):
- Add ROOTS spreading from base using small we_fill or line ops
- Add BARK TEXTURE by setting mossy/cracked blocks on trunk surface
- CARVE a TREE HOLLOW using set with "air" block (optional, adds realism)
- Add HANGING VINES using line of vine blocks from canopy edges
- Add SMALL LEAF CLUSTERS (we_sphere radius 1-2) to fill gaps in canopy
- Add LANTERNS or FLOWERS in/around tree for builds with that theme

CRITICAL: A tree with only trunk + single-sphere canopy is INCOMPLETE.
You MUST have:
- Multiple overlapping spheres for canopy (3-5 minimum)
- Roots OR bark texture OR vines for organic detail
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
BUILD IN THIS ORDER:
1. OUTER WALLS:
   - Use we_walls or we_fill for thick walls (2-3 blocks)
   - Height: 10-15 blocks minimum
   - Add battlements (alternating merlon/crenel pattern) at top

2. CORNER TOWERS:
   - we_cylinder (hollow) at each corner
   - Taller than walls by 5-10 blocks
   - Add conical roof (manual stepped circles) or battlements

3. GATEHOUSE:
   - Main entrance with large archway
   - Portcullis area (iron bars)
   - Flanking towers

4. KEEP (Central building):
   - Largest, tallest structure inside walls
   - Multiple floors with windows
   - Grand entrance with stairs

5. COURTYARD:
   - Open space between walls and keep
   - Add well, stables, barracks structures

6. DETAILS:
   - Arrow slits (1x2 windows)
   - Torches/lanterns on walls
   - Banners for decoration
`,

      ship: `
=== SHIP/VESSEL BUILD ===
${massiveGuidance}
BUILD A PROPER SHIP STRUCTURE:
1. HULL (Main body):
   - Use we_fill for hull base - wider in middle, narrow at bow/stern
   - Build CURVED sides using stepped we_fill boxes at angles
   - Hull should be hollow with walls 1-2 blocks thick
   - Use dark_oak_planks or spruce_planks

2. DECK (Floor):
   - Flat floor on top of hull
   - Add raised sections (forecastle at front, quarterdeck at rear)
   - Use trapdoors for hatch details

3. MASTS (Vertical):
   - Use oak_fence or spruce_log for masts
   - Position: 1 main mast center, optional fore/mizzen masts
   - Height should be ~1.5x hull length

4. SAILS:
   - Use white_wool or light_gray_wool
   - Attach to masts with horizontal yard arms
   - Multiple sail levels on each mast

5. DETAILS:
   - Railings: fence posts around deck edges
   - Cabin: small room structure at stern
   - Windows: portholes along hull sides
`,

      farm: `
=== FARM/AGRICULTURAL BUILD ===
${massiveGuidance}
${designPrinciples}
BUILD A WORKING FARM:
1. FIELDS (Growing areas):
   - Use we_fill for farmland/dirt plots
   - Leave 1-block water channels every 8 blocks
   - Separate crop types into distinct sections

2. BARN (Main building):
   - Large open interior for storage
   - Wide double doors for cart access
   - Hay bale storage areas
   - Use roof_gable with significant overhang

3. PATHS:
   - Gravel or stone paths between areas
   - 2-3 blocks wide for cart access

4. FENCES:
   - Oak or spruce fence around perimeter
   - Gates at entry points
   - Animal pens separate from crops

5. WINDMILL (Optional for large farms):
   - Cylindrical tower using we_fill boxes
   - Sails made from wool + fence posts
`,

      pyramid: `
=== PYRAMID/MONUMENT BUILD ===
${massiveGuidance}
BUILD A PROPER PYRAMID:
1. BASE:
   - Square foundation using we_fill
   - Sandstone or smooth_sandstone for Egyptian style

2. LAYERS (Stepped construction):
   - Use we_pyramid operation for solid pyramids
   - OR build manually: decreasing we_fill squares stacked vertically
   - Each layer 1 block smaller on each side

3. ENTRANCE:
   - Ground-level door on one face
   - Short tunnel leading to interior chamber

4. CAPSTONE:
   - Use gold_block or glowstone at apex
   - Single block or small pyramid tip

5. INTERIOR (Optional):
   - Central burial chamber
   - Narrow passages connecting rooms
   - Use chiseled_sandstone for decoration
`,

      underwater: `
=== UNDERWATER/AQUATIC BUILD ===
${massiveGuidance}
BUILD AN UNDERWATER STRUCTURE:
1. MAIN DOME/CHAMBER:
   - Use we_sphere (hollow) for dome shapes - spheres work great for underwater domes!
   - For irregular shapes: use 2-3 overlapping we_sphere operations
   - Glass for visibility, prismarine for structure
   - Make it hollow for interior space

2. CONNECTING TUBES:
   - we_cylinder (hollow) for tube corridors
   - Glass or glass_pane walls for views
   - 3-5 block diameter minimum

3. AIRLOCKS:
   - Double-door systems at entrances
   - Small transition chambers

4. LIGHTING:
   - Sea_lantern embedded in floors/ceilings
   - Glowstone behind glass for ambient glow
   - Place at regular intervals

5. MATERIALS:
   - Prismarine_bricks for main structure
   - Dark_prismarine for accents
   - Glass for windows/domes
   - TIP: Combine 2-3 overlapping spheres for organic-looking domes
`,

      tower: `
=== TOWER/LANDMARK BUILD (CSD Philosophy) ===
${massiveGuidance}
${designPrinciples}

PHASE 1 – CORE (Main Shaft):
- ONE we_cylinder or we_walls for the primary vertical mass
- This is the overall height and width envelope

PHASE 2 – STRUCTURE (Tiers + Protrusions):
- Divide into 3-5 DISTINCT TIERS (base wider, top narrower)
- Add HORIZONTAL BANDS/TRIM at tier boundaries using box or line
- Add BALCONIES or BUTTRESSES protruding from corners
- For CLOCK TOWERS (Big Ben): Add distinct clock face tier with recessed face

PHASE 3 – DETAIL (Windows + Carvings + Spire):
- Add WINDOW STRIPS at regular vertical intervals using window_strip
- CARVE decorative arches using set with "air" (gothic/ornate towers)
- Add CORNER PILASTERS using vertical line of accent blocks
- Add SPIRE or FINIAL at top using small pyramid or line
- For LATTICE TOWERS (Eiffel): 
  * Build solid A-frame, then CARVE grid pattern with air blocks
  * Add DIAGONAL BRACING using line operations between legs

CRITICAL FOR LATTICE/SKELETON STRUCTURES:
- Build the SOLID FRAME first
- Then CARVE the open spaces using box with "air" block
- Result: Open lattice, not solid slab
`,

      modern: `
=== MODERN ARCHITECTURE ===
${massiveGuidance}
${designPrinciples}
MODERN STYLE RULES:
- Clean geometric shapes with asymmetric composition
- Large glass facades (glass_pane walls, NOT scattered small windows)
- Materials: white_concrete, quartz_block, glass, black_concrete trim
- Overhangs supported by visible pillars or extending from solid walls
- Flat or angular roofs with edge trim
- NO traditional elements (no chimneys, no peaked roofs)
- Use we_fill for clean rectangular volumes
- Create visual interest through MATERIAL CONTRAST, not ornamentation
`,

      lattice: `
=== LATTICE/SKELETON/OPEN FRAME STRUCTURES ===
${massiveGuidance}

USE THIS FOR: Eiffel Tower, radio towers, cranes, scaffolding, bridges, geodesic domes

CRITICAL BUILD METHOD (Solid → Carve):
1. Build the SOLID ENVELOPE first (the shape if it were filled in)
2. CARVE the open spaces using set/box with "air" block

PHASE 1 – CORE (Solid Envelope):
- Build the overall shape AS IF it were solid
- Example: Eiffel Tower = solid tapered pyramid

PHASE 2 – STRUCTURE (Major Voids):
- CARVE large openings between legs/supports
- Use box with "air" to remove rectangular sections
- Leave only the frame/skeleton

PHASE 3 – DETAIL (Bracing + Rivets):
- Add DIAGONAL BRACING between supports using line
- Add HORIZONTAL PLATFORMS at intervals
- Add small accent blocks for "rivets" or joints

EXAMPLE – Eiffel Tower:
1. Core: we_pyramid (solid, iron_block, base 40x40, height 120)
2. Structure: Carve 4 large arch voids at base (box with air)
3. Structure: Carve rectangular voids between platform levels
4. Detail: Add horizontal platforms at 3-4 heights
5. Detail: Add diagonal braces between legs
6. Detail: Add small accent blocks at joints
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

CARVING OPERATIONS (for negative space):
- set with air: Remove a single block. {"op": "set", "pos": {...}, "block": "air"}
- box with air: Carve a rectangular void. {"op": "box", "from": {...}, "to": {...}, "block": "air"}
  USE FOR: Windows, arches, lattice gaps, hollow interiors, wear/damage
  CRITICAL: Build solid first, then carve. This creates clean negative space.

LEGACY OPERATIONS (avoid if possible, use universal ops instead):
- fill: Use 'box' instead
- hollow_box: Use 'wall' instead
- set: Use for single blocks only (or carving with air)
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

=== MANDATORY BUILD PHASES (CSD Philosophy) ===
You MUST build in this order. Skipping phases = failed build.

PHASE 1 – CORE (~25-35% of operations):
- Establish the PRIMARY MASS only (one or two large volumes)
- Use: we_fill, we_walls, we_cylinder, box, wall
- This is the "bounding shape" seen from far away
- DO NOT add details here. Keep it simple.

PHASE 2 – STRUCTURE (~30-40% of operations):
- Add SECONDARY FORMS that break up the core mass
- Use: we_fill, box, wall, three_d_layers, line
- Examples: towers on a castle, branches on a tree, tiers on a tower
- These should create ASYMMETRY and VISUAL INTEREST
- Each secondary form should be DISTINCT (different size, position, or angle)

PHASE 3 – DETAIL (~30-40% of operations):
- Add TEXTURE, ACCENTS, and CARVING
- Use: set, line, stairs, slab, trapdoor, fence, lantern, door, window_strip
- Use: set with "air" block to CARVE negative space (arches, lattices, holes)
- This phase is MANDATORY. You may NOT skip it.
- If you have fewer than 10 detail operations, you have FAILED.

CARVING EXAMPLES (use "air" block):
- Gothic arch: Fill rectangular window, then carve pointed top with air
- Lattice tower: Fill solid frame, then carve grid of air gaps
- Tree hollow: Fill trunk cylinder, then carve oval void with air
- Wear/ruins: Randomly set air blocks on edges for crumbling effect

PHASE BALANCE CHECK (before outputting):
- Count your operations by phase
- Core: 25-35%, Structure: 30-40%, Detail: 30-40%
- If Detail < 25%, add more detail operations before outputting

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

6. CSD PHILOSOPHY – DETAIL IS MANDATORY:
   - FEWER core ops is better; FEWER detail ops is WORSE
   - Prefer ONE large we_fill for core, then ADD detail operations on top
   - Use we_sphere/we_cylinder for organic shapes
   - Use we_walls for hollow structures
   - A good build has 30-80 operations total:
     * Core: 5-15 ops (large, simple shapes)
     * Structure: 10-25 ops (secondary forms, breaking up mass)
     * Detail: 15-40 ops (texture, accents, carving with air)
   - ALWAYS use WorldEdit ops (we_*) for volumes > 10 blocks
   - Detail operations (set, line, slab, stairs, door) are CHEAP – use many!
`;
}

export default unifiedBlueprintPrompt;

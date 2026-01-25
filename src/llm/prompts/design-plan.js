import { analyzePrompt } from '../../config/build-types.js';

export const designPlanPrompt = (userPrompt) => {
  // Use comprehensive prompt analysis
  const analysis = analyzePrompt(userPrompt);
  
  const { type, theme, size, typeInfo, materials, dimensions, operations, features, tips } = analysis;
  
  // Build theme section if detected
  const themeSection = theme ? `
=== THEME: ${theme.name.toUpperCase()} ===
${theme.description}

THEME MATERIALS (USE THESE!):
- Primary: ${theme.materials.primary}
- Secondary: ${theme.materials.secondary}
- Accent: ${theme.materials.accent}
- Roof: ${theme.materials.roof}
- Windows: ${theme.materials.windows}
- Door: ${theme.materials.door}

THEME-SPECIFIC FEATURES TO ADD:
${operations.featureAdditions?.map(f => `- ${f}`).join('\n') || '(none)'}

THEME TIPS:
${operations.tips?.map(t => `• ${t}`).join('\n') || ''}
` : '';

  // Size section
  const sizeSection = size.matchedWord ? 
    `DETECTED SIZE: ${size.size.toUpperCase()} (matched: "${size.matchedWord}")` : '';

  return `
You are an expert Minecraft architect. Create a detailed design plan for:

"${userPrompt}"

DETECTED BUILD TYPE: ${typeInfo.name.toUpperCase()}
${type.reason ? `(${type.reason})` : ''}
${theme ? `DETECTED THEME: ${theme.name.toUpperCase()} (matched: "${theme.matchedKeyword}")` : ''}
${sizeSection}
${themeSection}
=== BUILD TYPE: ${typeInfo.name} ===
${typeInfo.description}

RECOMMENDED DIMENSIONS for ${size.size} size:
${JSON.stringify(dimensions)}

REQUIRED FEATURES:
${features?.map(f => `- ${f}`).join('\n') || '- walls\n- roof\n- door'}

PREFERRED OPERATIONS:
${operations.preferred?.map(op => `- ${op}`).join('\n') || '- fill\n- hollow_box'}

BUILD ORDER:
${analysis.buildOrder?.map((step, i) => `${i + 1}. ${step}`).join('\n') || '1. Foundation\n2. Walls\n3. Roof\n4. Details'}

TIPS:
${tips?.map(t => `• ${t}`).join('\n') || '• Use efficient operations'}

${type.type === 'pixel_art' ? `
=== PIXEL ART SPECIFIC ===
- Set "buildType": "pixel_art" in response
- Dimensions: width = art width, height = art height, depth = 1
- Simple (16x16), Medium (32x32), Detailed (48x48), Large (64x64)
- Add "facing_south" to features

COLOR BLOCKS for pixel art:
- Red/Orange/Yellow: red_wool, orange_wool, yellow_wool
- Green/Blue: green_wool, lime_wool, blue_wool, cyan_wool
- Purple/Pink: purple_wool, magenta_wool, pink_wool
- Neutrals: white_wool, black_wool, gray_wool, brown_wool
- Skin: orange_terracotta, brown_terracotta, pink_terracotta

Materials format for pixel art:
{
  "primary": "most common color",
  "secondary": "second color",
  "outline": "black_wool",
  "colors": ["all", "colors", "used"]
}
` : `
=== MATERIALS TO USE (8-12 BLOCK TYPES) ===
${theme ? 'Use the THEME MATERIALS specified above!' : 'Use appropriate materials for this build type.'}

Include ALL of these material categories for a quality build:
{
  "primary": "${materials.primary || 'oak_planks'}" (main walls),
  "secondary": "${materials.secondary || 'oak_log'}" (frame/pillars),
  "accent": "${materials.accent || 'stripped_oak_log'}" (trim/details),
  "roof": "${materials.roof || 'oak_stairs'}" (roof blocks),
  "roofSlab": "${materials.roof?.replace('_stairs', '_slab') || 'oak_slab'}" (roof edges),
  "floor": "${materials.floor || 'oak_planks'}" (flooring),
  "windows": "${materials.windows || 'glass_pane'}" (windows),
  "door": "${materials.door || 'oak_door'}" (entrance),
  "lighting": "lantern" or "torch" (lighting),
  "fence": "${materials.primary?.replace('_planks', '_fence') || 'oak_fence'}" (railings/details),
  "trapdoor": "${materials.primary?.replace('_planks', '_trapdoor') || 'oak_trapdoor'}" (shutters/details)
}

MATERIAL TIPS:
- Mix planks with logs for depth
- Use stairs and slabs for detailed rooflines
- Add trapdoors as window shutters
- Include fence posts as supports
`}

=== GENERAL RULES ===
- Use valid Minecraft 1.20.1 block names
- Dimensions max: 100x256x100
- Keep proportions realistic
- Include ALL features listed above
${theme?.modifiers?.heightMultiplier ? `- Height already scaled by ${theme.modifiers.heightMultiplier}x for ${theme.name} theme` : ''}

=== REQUIRED JSON OUTPUT ===
{
  "buildType": "${type.type}",
  "theme": "${theme?.theme || 'default'}",
  "description": "Brief description of what will be built",
  "style": "${theme?.name || 'default'}",
  "dimensions": ${JSON.stringify(dimensions)},
  "materials": {
    "primary": "main wall material",
    "secondary": "frame/pillar material", 
    "accent": "trim/detail material",
    "roof": "roof stair block",
    "roofSlab": "roof slab block",
    "floor": "floor material",
    "windows": "window material",
    "door": "door type",
    "lighting": "torch or lantern",
    "fence": "fence type for railings",
    "trapdoor": "trapdoor for shutters"
  },
  "features": ["list", "of", "architectural", "features"],
  "palette": ["all", "unique", "blocks", "used"]
}

IMPORTANT: Include 8-12 unique blocks in materials + palette for quality builds.
Output valid JSON only.
`;
};

export const blueprintPrompt = (designPlan, allowlist, worldEditAvailable = false) => `
Convert this design plan into executable build instructions:

${JSON.stringify(designPlan, null, 2)}

STRICT CONSTRAINTS:
- Only use these blocks: ${allowlist.join(', ')}
- Coordinates must be relative (start at 0,0,0)
- Maximum dimensions: ${designPlan.dimensions.width}x${designPlan.dimensions.height}x${designPlan.dimensions.depth}
- ALL requested features MUST be included in the blueprint

${worldEditAvailable ? `
WORLDEDIT AVAILABLE - Optimize for performance:
- Use WorldEdit operations (we_*) for large volumes (>100 blocks)
- Use vanilla operations for details and small features
- Each WorldEdit operation MUST include a fallback vanilla operation
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
` : ''}

BUILDING SEQUENCE (follow this order):
1. Foundation: Use ${worldEditAvailable ? 'we_fill' : 'fill'} for base/floor (y=0 or y=1)
2. Walls: Use ${worldEditAvailable ? 'we_walls' : 'hollow_box'} for main structure
3. Features:
   - Doors: Use "door" operation (NOT set)
   - Windows: Use "window_strip" for rows of windows
   - Stairs: Use "spiral_staircase" or regular "stairs"
   - Balconies: Use "balcony" operation
4. Roof: Use roof_gable, roof_hip, ${worldEditAvailable ? 'we_pyramid,' : ''} or roof_flat
5. Details: Add fences, slabs, decorative elements last

QUALITY REQUIREMENTS:
- Include ALL features from design plan (${designPlan.features.join(', ')})
- Ensure structural integrity (foundation → walls → roof)
- Use appropriate materials from design plan
- Coordinates must stay within bounds: x[0-${designPlan.dimensions.width-1}], y[0-${designPlan.dimensions.height-1}], z[0-${designPlan.dimensions.depth-1}]

${worldEditAvailable ? `
EXECUTION PLAN (include this in your response):
{
  "execution_plan": {
    "worldedit_available": true,
    "estimated_blocks": <total blocks>,
    "operations_count": {
      "worldedit": <count of we_* operations>,
      "vanilla": <count of other operations>
    }
  }
}
` : ''}

Output only valid JSON matching the blueprint schema.
`;

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
- Windows should use "window_strip" for rows
- Stairs should use "stairs" or "spiral_staircase"
- Roofs should use roof_gable, roof_hip, or roof_flat operations

Fix the specific errors mentioned above. Output only the corrected JSON blueprint.
`;

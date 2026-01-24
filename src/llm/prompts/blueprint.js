export const blueprintPrompt = (designPlan, allowlist) => `
Convert this design plan into executable build instructions:

${JSON.stringify(designPlan, null, 2)}

STRICT CONSTRAINTS:
- Only use these blocks: ${allowlist.join(', ')}
- Use only these operations: fill, hollow_box, set, line, window_strip, roof_gable, roof_flat
- Coordinates must be relative (start at 0,0,0)
- Maximum dimensions: ${designPlan.dimensions.width}x${designPlan.dimensions.height}x${designPlan.dimensions.depth}

OPERATION SPECIFICATIONS:
- fill: Fills a solid rectangular area. Requires: block, from {x,y,z}, to {x,y,z}
- hollow_box: Creates a hollow box (walls only). Requires: block, from {x,y,z}, to {x,y,z}
- set: Places a single block. Requires: block, pos {x,y,z}
- line: Creates a line of blocks. Requires: block, from {x,y,z}, to {x,y,z}
- window_strip: Creates a row of windows. Requires: block, from {x,y,z}, to {x,y,z}, spacing
- roof_gable: Triangular roof. Requires: block, from {x,y,z}, to {x,y,z}, peakHeight
- roof_flat: Flat roof. Requires: block, from {x,y,z}, to {x,y,z}

Generate a step-by-step blueprint. Think like a builder:
1. Foundation first (fill operation for floor)
2. Walls (hollow_box or fill for walls)
3. Interior features (door using set, windows using window_strip)
4. Roof last (roof_gable or roof_flat)

ALL coordinates must be within bounds: x[0-${designPlan.dimensions.width-1}], y[0-${designPlan.dimensions.height-1}], z[0-${designPlan.dimensions.depth-1}]

Output only valid JSON matching the blueprint schema.
`;

export const repairPrompt = (blueprint, errors, designPlan, allowlist) => `
The following blueprint has validation errors. Fix them while maintaining the design intent.

BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

ERRORS:
${errors.join('\n')}

CONSTRAINTS:
- Only use blocks from allowlist: ${allowlist.join(', ')}
- Dimensions: ${designPlan.dimensions.width}x${designPlan.dimensions.height}x${designPlan.dimensions.depth}
- All coordinates must be within bounds
- Required features: ${designPlan.features.join(', ')}

Fix the specific errors mentioned above. Output only the corrected JSON blueprint.
`;

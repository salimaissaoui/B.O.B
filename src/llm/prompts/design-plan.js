export const designPlanPrompt = (userPrompt) => `
You are an expert Minecraft architect. Create a detailed design plan for:

"${userPrompt}"

Requirements:
- Dimensions should be proportional and realistic (max 100x256x100, typical house: 10-20 blocks)
- Use valid Minecraft 1.20.1 block names (e.g., "oak_planks", "stone_bricks", "glass_pane")
- Include architectural details (stairs, slabs, fences) for higher quality builds
- Consider the building's purpose when selecting materials

Materials format (use these exact keys):
{
  "primary": "main building block (e.g., oak_planks, stone_bricks)",
  "secondary": "accent block for details (optional)",
  "accent": "decorative accent block (optional)",
  "roof": "roof material (stairs work best, e.g., oak_stairs)",
  "floor": "floor material (optional, default to primary)",
  "windows": "window material (glass_pane recommended)",
  "door": "door type (e.g., oak_door, iron_door)"
}

Features array - Be specific about what to include:
- Use descriptive feature names: "spiral_staircase", "balcony", "tower", "dome"
- Common features: "door", "windows", "roof", "fence", "stairs"
- Architectural details: "gable_roof", "hip_roof", "flat_roof"

Architectural best practices:
- Houses: Include foundation, walls, windows, door, roof
- Towers: Use cylindrical shapes if possible, include stairs
- Castles: Include walls, towers, battlements
- Modern buildings: Use glass, concrete, flat roofs

Keep dimensions proportional:
- Width and depth should be similar for square buildings
- Height should be 0.5-1.5x the base dimension
- Leave room for interior and roof

Output valid JSON only.
`;

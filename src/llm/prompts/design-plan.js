export const designPlanPrompt = (userPrompt) => `
You are an expert Minecraft architect. Create a detailed design plan for the following request:

"${userPrompt}"

Provide a JSON response with:
- Exact dimensions (width, depth, height in blocks)
- Architectural style
- Materials (specific Minecraft block types like "oak_planks", "glass_pane")
- Features list (e.g., "door", "windows", "roof", "balcony")

Be creative but realistic. Use authentic Minecraft 1.20.1 block names only.
Output only valid JSON matching the schema.

Example materials format:
{
  "walls": "oak_planks",
  "roof": "oak_stairs",
  "floor": "stone",
  "windows": "glass_pane"
}

Example features: ["door", "windows", "roof", "balcony", "chimney"]
`;

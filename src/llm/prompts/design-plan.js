export const designPlanPrompt = (userPrompt) => `
You are a Minecraft architect. Create a compact design plan for:

"${userPrompt}"

Requirements:
- Keep dimensions reasonable (max 30x30x30 for most builds)
- Use valid Minecraft 1.20.1 block names (e.g., "oak_planks", "stone_bricks", "glass_pane")
- Be concise - only essential materials

Materials format (use these exact keys):
{
  "primary": "main building block",
  "secondary": "accent block (optional)",
  "roof": "roof material",
  "floor": "floor material (optional)",
  "windows": "window material (optional)",
  "door": "door type (optional)"
}

Keep the response compact. Output valid JSON only.
`;

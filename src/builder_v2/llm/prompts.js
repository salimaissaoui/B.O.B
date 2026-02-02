/**
 * Builder v2 Hardened LLM Prompts
 *
 * Strict prompts that enforce JSON-only output with schema compliance.
 */

import { listComponents } from '../components/index.js';

/**
 * Get condensed schema definition for prompt
 */
function getSchemaDefinition() {
  return `
BUILDSCENEV2 SCHEMA (REQUIRED FORMAT):
{
  "version": "2.0",
  "intentId": "<from intent>",
  "description": { "title": "<short name>", "summary": "<1-2 sentences>" },
  "bounds": { "width": <int>, "height": <int>, "depth": <int> },
  "style": {
    "palette": {
      "primary": "<block or token>",
      "secondary": "<block or token>",
      "accent": "<block or token>",
      "trim": "<optional>",
      "glass": "<optional>",
      "light": "<optional>"
    },
    "theme": "<medieval|modern|gothic|rustic|oriental|fantasy|organic|industrial|default>"
  },
  "components": [
    {
      "id": "<unique id>",
      "type": "<component type>",
      "transform": { "position": { "x": <int>, "y": <int>=0, "z": <int> } },
      "params": { <type-specific params> }
    }
  ],
  "detailPasses": ["edge_trim", "lighting"] // optional
}`;
}

/**
 * Get component reference for prompt
 */
function getComponentReference() {
  const components = listComponents();

  return `
AVAILABLE COMPONENTS:
${components.map(c => `- ${c}`).join('\n')}

KEY COMPONENT PARAMS:
- lattice_tower: { height, baseWidth, taperRatio, platforms: [{heightRatio, widthRatio}] }
- room: { width, height, depth, openings: [{type:"door"|"window", wall:"north"|"south"|"east"|"west"}] }
- roof_gable: { width, depth, pitch, overhang, direction:"ns"|"ew" }
- roof_dome: { radius, heightRatio, hollow }
- sphere: { radius, hollow }
- cylinder: { radius, height, hollow }
- statue_armature: { height, style:"humanoid"|"quadruped", proportions }
- platform: { width, depth, railings, supports, supportHeight }
- column: { height, radius, style:"simple"|"doric"|"ionic", capital, base }
- staircase: { height, style:"straight"|"spiral", direction, width }
- arch: { width, height, thickness, style:"rounded"|"pointed"|"flat" }
- box: { width, height, depth }
- wall: { width, height, depth }`;
}

/**
 * Get few-shot examples
 */
function getFewShotExamples() {
  return `
EXAMPLE 1 - Landmark (Eiffel Tower):
{
  "version": "2.0",
  "intentId": "abc-123",
  "description": { "title": "Eiffel Tower", "summary": "Iconic iron lattice tower with observation platforms" },
  "bounds": { "width": 50, "height": 120, "depth": 50 },
  "style": {
    "palette": { "primary": "iron_bars", "secondary": "smooth_stone", "accent": "stone_bricks" },
    "theme": "industrial"
  },
  "components": [
    { "id": "tower", "type": "lattice_tower", "transform": { "position": { "x": 0, "y": 0, "z": 0 } },
      "params": { "height": 100, "baseWidth": 40, "taperRatio": 0.15, "platforms": [{"heightRatio": 0.33}, {"heightRatio": 0.66}, {"heightRatio": 1.0}] } },
    { "id": "plaza", "type": "platform", "transform": { "position": { "x": -5, "y": 0, "z": -5 } },
      "params": { "width": 50, "depth": 50, "thickness": 1, "railings": true } }
  ],
  "detailPasses": ["edge_trim", "lighting"]
}

EXAMPLE 2 - Architecture (Modern House):
{
  "version": "2.0",
  "intentId": "def-456",
  "description": { "title": "Modern House", "summary": "Two-story contemporary home with interior" },
  "bounds": { "width": 20, "height": 12, "depth": 15 },
  "style": {
    "palette": { "primary": "white_concrete", "secondary": "gray_concrete", "accent": "black_concrete", "glass": "glass" },
    "theme": "modern"
  },
  "components": [
    { "id": "floor1", "type": "room", "transform": { "position": { "x": 0, "y": 0, "z": 0 } },
      "params": { "width": 18, "height": 4, "depth": 13, "openings": [{"type": "door", "wall": "south"}, {"type": "window", "wall": "east", "yOffset": 1}] } },
    { "id": "floor2", "type": "room", "transform": { "position": { "x": 0, "y": 5, "z": 0 } },
      "params": { "width": 18, "height": 4, "depth": 13, "openings": [{"type": "window", "wall": "south", "yOffset": 1}, {"type": "window", "wall": "north", "yOffset": 1}] } },
    { "id": "roof", "type": "roof_gable", "transform": { "position": { "x": 0, "y": 10, "z": 0 } },
      "params": { "width": 20, "depth": 15, "pitch": 0.4, "overhang": 1 } },
    { "id": "stairs", "type": "staircase", "transform": { "position": { "x": 2, "y": 1, "z": 2 } },
      "params": { "height": 4, "style": "straight", "direction": "north", "width": 2 } }
  ],
  "interiors": [
    { "roomId": "floor1", "type": "living", "style": "modern", "features": ["sofa", "table"] },
    { "roomId": "floor2", "type": "bedroom", "style": "cozy", "features": ["bed", "desk"] }
  ],
  "detailPasses": ["lighting", "interior_furnish"]
}

EXAMPLE 3 - Statue (Pikachu):
{
  "version": "2.0",
  "intentId": "ghi-789",
  "description": { "title": "Pikachu Statue", "summary": "3D Pikachu statue with base platform" },
  "bounds": { "width": 15, "height": 25, "depth": 15 },
  "style": {
    "palette": { "primary": "yellow_concrete", "secondary": "orange_concrete", "accent": "black_concrete" },
    "theme": "organic"
  },
  "components": [
    { "id": "base", "type": "platform", "transform": { "position": { "x": 0, "y": 0, "z": 0 } },
      "params": { "width": 15, "depth": 15, "thickness": 2 } },
    { "id": "body", "type": "statue_armature", "transform": { "position": { "x": 7, "y": 2, "z": 7 } },
      "params": { "height": 18, "style": "humanoid", "proportions": { "headRatio": 0.35, "torsoRatio": 0.4, "legRatio": 0.2 },
        "materials": { "head": "yellow_concrete", "body": "yellow_concrete", "accent": "red_terracotta" } } },
    { "id": "ears_l", "type": "cylinder", "transform": { "position": { "x": 5, "y": 18, "z": 7 } },
      "params": { "radius": 1, "height": 5, "block": "yellow_concrete" } },
    { "id": "ears_r", "type": "cylinder", "transform": { "position": { "x": 9, "y": 18, "z": 7 } },
      "params": { "radius": 1, "height": 5, "block": "yellow_concrete" } },
    { "id": "ear_tips_l", "type": "box", "transform": { "position": { "x": 5, "y": 23, "z": 7 } },
      "params": { "width": 2, "height": 2, "depth": 2, "block": "black_concrete" } },
    { "id": "ear_tips_r", "type": "box", "transform": { "position": { "x": 9, "y": 23, "z": 7 } },
      "params": { "width": 2, "height": 2, "depth": 2, "block": "black_concrete" } }
  ]
}`;
}

/**
 * Build the main scene generation prompt
 * @param {Object} intent - BuildIntentV2
 * @returns {string} Complete prompt
 */
export function buildScenePrompt(intent) {
  const scaleGuide = {
    tiny: '5-15 blocks',
    small: '15-30 blocks',
    medium: '30-60 blocks',
    large: '60-100 blocks',
    massive: '100-200 blocks',
    colossal: '200+ blocks'
  };

  return `You are a Minecraft architect AI. Output ONLY valid JSON matching the BuildSceneV2 schema.

CRITICAL RULES:
1. Output ONLY JSON - no markdown, no comments, no explanations
2. All coordinates must be >= 0 (build origin is 0,0,0)
3. Use only components from the AVAILABLE COMPONENTS list
4. Use semantic palette tokens ($primary, $secondary) OR valid Minecraft block names
5. Height must be <= 256 (Minecraft limit)

${getSchemaDefinition()}

${getComponentReference()}

${getFewShotExamples()}

=== YOUR TASK ===

Generate a BuildSceneV2 for:
"${intent.prompt.raw}"

Intent Analysis:
- Category: ${intent.intent.category}
- Scale: ${intent.intent.scale} (${scaleGuide[intent.intent.scale]})
- Complexity: ${intent.intent.complexity}
- Reference: ${intent.intent.reference || 'none'}
- Style: ${intent.constraints.style || 'auto-detect'}
- Features: ${intent.constraints.features?.join(', ') || 'standard'}

Intent ID to use: ${intent.id}

Output ONLY the JSON object, starting with { and ending with }:`;
}

/**
 * Build repair prompt for invalid scene
 * @param {Object} intent - BuildIntentV2
 * @param {string} previousOutput - Previous invalid output
 * @param {string[]} errors - Validation errors
 * @returns {string} Repair prompt
 */
export function buildRepairPrompt(intent, previousOutput, errors) {
  return `Your previous output was INVALID. Fix these errors:

ERRORS:
${errors.map(e => `- ${e}`).join('\n')}

PREVIOUS OUTPUT (DO NOT REPEAT THESE MISTAKES):
${previousOutput.substring(0, 1000)}...

REQUIREMENTS:
1. Output ONLY valid JSON
2. All coordinates >= 0
3. Use only valid component types
4. Include required fields: version, intentId, description, bounds, style, components

Original request: "${intent.prompt.raw}"
Intent ID: ${intent.id}

Output the CORRECTED JSON now:`;
}

/**
 * Build simplified fallback prompt
 * @param {Object} intent - BuildIntentV2
 * @returns {string} Simplified prompt
 */
export function buildFallbackPrompt(intent) {
  return `Output a SIMPLE BuildSceneV2 JSON for: "${intent.prompt.raw}"

Use ONLY these components: box, wall, platform, room
Use default theme, simple structure.
Intent ID: ${intent.id}

JSON only:`;
}

export default {
  buildScenePrompt,
  buildRepairPrompt,
  buildFallbackPrompt,
  getSchemaDefinition,
  getComponentReference,
  getFewShotExamples
};

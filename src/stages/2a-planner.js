/**
 * Multi-Step Planner (Stage 2a)
 *
 * Implements chain-of-thought decomposition for complex compound builds.
 * Inspired by APT (Architectural Planning Transformer) research.
 *
 * For simple builds: Bypasses to single-shot generation (fast path)
 * For compound builds: Decomposes into components, generates each, merges
 *
 * Example:
 *   Input: "medieval village with 5 houses and a church"
 *   Output: High-level plan with layout and component list
 */

import { GeminiClient } from '../llm/gemini-client.js';
import { SAFETY_LIMITS } from '../config/limits.js';

const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

/**
 * Check if a prompt requires multi-step planning
 *
 * @param {string} prompt - User's build request
 * @param {Object} analysis - Analyzer output
 * @returns {boolean} True if compound build detected
 */
export function requiresMultiStepPlanning(prompt, analysis) {
    if (!SAFETY_LIMITS.planning?.enabled) return false;

    const lowerPrompt = prompt.toLowerCase();

    // Check trigger keywords
    const triggerKeywords = SAFETY_LIMITS.planning?.triggerKeywords || [
        'village', 'city', 'complex', 'compound', 'multiple', 'collection'
    ];

    for (const keyword of triggerKeywords) {
        if (lowerPrompt.includes(keyword)) {
            return true;
        }
    }

    // Check for explicit component counts
    const countMatch = lowerPrompt.match(/(\d+)\s+(houses?|buildings?|towers?|structures?)/);
    if (countMatch && parseInt(countMatch[1]) > 2) {
        return true;
    }

    // Check for "and" connecting multiple structures
    const structurePattern = /(house|castle|tower|church|shop|farm|barn|stable|wall|gate)/g;
    const structures = lowerPrompt.match(structurePattern);
    if (structures && structures.length >= 3) {
        return true;
    }

    return false;
}

/**
 * Generate a high-level plan for a compound build
 *
 * @param {Object} analysis - Analyzer output
 * @param {string} apiKey - LLM API key
 * @returns {Promise<Object>} High-level plan with components and layout
 */
export async function generateHighLevelPlan(analysis, apiKey) {
    const client = new GeminiClient(apiKey);
    const maxComponents = SAFETY_LIMITS.planning?.maxComponents || 10;

    const prompt = buildPlanningPrompt(analysis, maxComponents);

    if (DEBUG) {
        console.log('Multi-step planning: Generating high-level plan...');
    }

    const plan = await client.generateContent({
        prompt,
        temperature: 0.4,
        responseFormat: 'json'
    });

    // Validate and cap component count
    if (plan.components && plan.components.length > maxComponents) {
        console.warn(`⚠ Plan has ${plan.components.length} components, capping at ${maxComponents}`);
        plan.components = plan.components.slice(0, maxComponents);
    }

    return plan;
}

/**
 * Build the planning prompt
 */
function buildPlanningPrompt(analysis, maxComponents) {
    return `
You are a Minecraft master planner. Create a HIGH-LEVEL PLAN for this compound build.

REQUEST: "${analysis.userPrompt}"
BUILD TYPE: ${analysis.buildType}
THEME: ${analysis.theme?.name || 'default'}

YOUR TASK:
1. Break down the request into individual components (buildings/structures)
2. Design a logical layout (positions of each component)
3. Ensure components don't overlap

OUTPUT FORMAT:
{
  "description": "Brief description of the compound build",
  "totalSize": { "width": <number>, "height": <number>, "depth": <number> },
  "components": [
    {
      "id": "component_1",
      "type": "house|castle|tower|church|...",
      "name": "Human-readable name",
      "size": { "width": <number>, "height": <number>, "depth": <number> },
      "position": { "x": <offset from origin>, "y": 0, "z": <offset from origin> },
      "attributes": ["any special features"]
    }
  ],
  "layout": {
    "style": "grid|circular|organic|linear",
    "spacing": <blocks between components>,
    "centerPoint": { "x": 0, "y": 0, "z": 0 }
  },
  "sharedElements": {
    "roads": true/false,
    "walls": true/false,
    "fences": true/false
  }
}

CONSTRAINTS:
- Maximum ${maxComponents} components
- Each component position must be unique (no overlaps)
- Positions are offsets from origin (0,0,0)
- Leave 3-5 blocks between components for paths/roads
- Y position should usually be 0 (ground level)

Output ONLY valid JSON.
`;
}

/**
 * Merge component blueprints into a master blueprint
 *
 * @param {Object} plan - High-level plan with layout
 * @param {Array} componentBlueprints - Array of generated blueprints for each component
 * @returns {Object} Merged master blueprint
 */
export function mergeComponentBlueprints(plan, componentBlueprints) {
    const masterBlueprint = {
        buildType: 'compound',
        theme: plan.theme || 'default',
        description: plan.description,
        size: plan.totalSize,
        palette: {},
        steps: []
    };

    // Merge palettes from all components
    for (const component of componentBlueprints) {
        if (component.palette) {
            Object.assign(masterBlueprint.palette, component.palette);
        }
    }

    // Add steps from each component with position offsets
    for (let i = 0; i < componentBlueprints.length; i++) {
        const component = componentBlueprints[i];
        const layout = plan.components[i];

        if (!layout || !component.steps) continue;

        const offsetX = layout.position?.x || 0;
        const offsetY = layout.position?.y || 0;
        const offsetZ = layout.position?.z || 0;

        // Add a move operation to position cursor at component location
        masterBlueprint.steps.push({
            op: 'cursor_reset'
        });

        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0) {
            masterBlueprint.steps.push({
                op: 'move',
                offset: { x: offsetX, y: offsetY, z: offsetZ }
            });
        }

        // Add all steps from this component
        for (const step of component.steps) {
            masterBlueprint.steps.push(step);
        }
    }

    // Add shared elements (roads, walls) if specified
    if (plan.sharedElements?.roads) {
        masterBlueprint.steps.push({
            op: 'cursor_reset'
        });
        // Road generation would go here (simplified for now)
    }

    return masterBlueprint;
}

/**
 * Main entry point for multi-step planning
 *
 * @param {Object} analysis - Analyzer output
 * @param {string} apiKey - LLM API key
 * @param {Function} generateSingleBlueprint - Function to generate a single component
 * @param {boolean} worldEditEnabled - Whether WorldEdit is available
 * @returns {Promise<Object>} Complete merged blueprint
 */
export async function planAndGenerate(analysis, apiKey, generateSingleBlueprint, worldEditEnabled) {
    const maxCalls = SAFETY_LIMITS.planning?.maxLLMCalls || 15;
    let callCount = 0;

    // 1. Generate high-level plan
    console.log('  → Multi-step planning: Phase 1 - High-level plan');
    const plan = await generateHighLevelPlan(analysis, apiKey);
    callCount++;

    if (DEBUG) {
        console.log(`  Plan: ${plan.components?.length || 0} components`);
    }

    // 2. Generate blueprint for each component
    console.log(`  → Multi-step planning: Phase 2 - Generating ${plan.components?.length || 0} components`);
    const componentBlueprints = [];

    for (const component of plan.components || []) {
        if (callCount >= maxCalls) {
            console.warn(`⚠ Reached max LLM calls (${maxCalls}), stopping component generation`);
            break;
        }

        // Create a mini-analysis for this component
        const componentAnalysis = {
            userPrompt: `${component.name} (${component.type})`,
            buildType: component.type,
            theme: analysis.theme,
            hints: {
                ...analysis.hints,
                dimensions: component.size,
                features: component.attributes || []
            }
        };

        try {
            const blueprint = await generateSingleBlueprint(
                componentAnalysis,
                apiKey,
                worldEditEnabled
            );
            componentBlueprints.push(blueprint);
            callCount++;

            if (DEBUG) {
                console.log(`    ✓ Generated: ${component.name}`);
            }
        } catch (error) {
            console.error(`    ✗ Failed: ${component.name} - ${error.message}`);
            // Continue with other components
        }
    }

    // 3. Merge into master blueprint
    console.log('  → Multi-step planning: Phase 3 - Merging blueprints');
    const masterBlueprint = mergeComponentBlueprints(plan, componentBlueprints);

    console.log(`  ✓ Multi-step planning complete: ${callCount} LLM calls, ${masterBlueprint.steps.length} steps`);

    return masterBlueprint;
}

export default {
    requiresMultiStepPlanning,
    generateHighLevelPlan,
    mergeComponentBlueprints,
    planAndGenerate
};

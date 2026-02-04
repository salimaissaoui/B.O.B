/**
 * Builder v2 Scene Generator
 *
 * Generates BuildSceneV2 from BuildIntentV2 using LLM with retry logic.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateScene, formatValidationErrors } from '../validate/validators.js';
import { buildScenePrompt, buildRepairPrompt, buildFallbackPrompt } from './prompts.js';
import { SAFETY_LIMITS } from '../../config/limits.js';
import { findLandmark, scaleParams, calculateBoundsFromConfig } from '../landmarks/registry.js';

/**
 * Extract JSON from potentially messy LLM output
 */
function extractJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Ignore
  }

  // Find JSON object boundaries
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const jsonStr = text.substring(startIdx, endIdx + 1);
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // Try removing common artifacts
      const cleaned = jsonStr
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/\/\/.*$/gm, '')  // Remove line comments
        .replace(/,\s*}/g, '}')    // Remove trailing commas
        .replace(/,\s*]/g, ']');

      return JSON.parse(cleaned);
    }
  }

  throw new Error('No valid JSON found in response');
}

/**
 * Generate BuildSceneV2 from BuildIntentV2
 * @param {Object} intent - BuildIntentV2 object
 * @param {string} apiKey - Gemini API key
 * @param {Object} options - Generation options
 * @returns {Object} BuildSceneV2 object
 */
export async function generateSceneV2(intent, apiKey, options = {}) {
  const {
    maxRetries = 3,
    timeout = SAFETY_LIMITS.llmTimeoutMs || 120000,
    temperature = 0.7
  } = options;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature,
      maxOutputTokens: SAFETY_LIMITS.llmMaxOutputTokens || 8192,
      responseMimeType: 'application/json'
    }
  });

  let lastError = null;
  let lastOutput = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  [SceneGenerator] Attempt ${attempt}/${maxRetries}`);

      // Build prompt based on attempt
      let prompt;
      if (attempt === 1) {
        prompt = buildScenePrompt(intent);
      } else if (attempt === 2 && lastError) {
        prompt = buildRepairPrompt(intent, lastOutput, [lastError.message]);
      } else {
        prompt = buildFallbackPrompt(intent);
      }

      // Make API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const result = await model.generateContent(prompt);
        clearTimeout(timeoutId);

        const response = await result.response;
        const text = response.text();
        lastOutput = text;

        // Extract and parse JSON
        const scene = extractJSON(text);

        // Ensure version and intentId are set
        scene.version = '2.0';
        scene.intentId = intent.id;

        // Validate against schema
        const validation = validateScene(scene);

        if (!validation.valid) {
          const errors = formatValidationErrors(validation);
          console.warn(`  [SceneGenerator] Validation failed: ${errors.join(', ')}`);
          lastError = new Error(errors[0]);
          continue;
        }

        console.log(`  [SceneGenerator] Generated scene: ${scene.description?.title || 'Untitled'}`);
        return scene;

      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }

    } catch (error) {
      console.warn(`  [SceneGenerator] Attempt ${attempt} failed: ${error.message}`);
      lastError = error;

      // Add delay between retries
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  // All retries failed - generate deterministic fallback
  console.warn('  [SceneGenerator] All attempts failed, using deterministic fallback');
  return generateFallbackScene(intent);
}

/**
 * Generate a deterministic scene for a known landmark
 */
function generateLandmarkScene(intent, landmarkKey, landmarkConfig) {
  const scale = intent.intent?.scale || 'medium';
  const scaleFactor = landmarkConfig.scale?.[scale] || 1;

  // Scale all component parameters
  const scaledComponents = landmarkConfig.components.map((comp, idx) => ({
    ...comp,
    id: comp.id || `landmark_${idx}`,
    transform: comp.transform ? {
      ...comp.transform,
      position: comp.transform.position ? {
        x: Math.round((comp.transform.position.x || 0) * scaleFactor),
        y: Math.round((comp.transform.position.y || 0) * scaleFactor),
        z: Math.round((comp.transform.position.z || 0) * scaleFactor)
      } : { x: 0, y: 0, z: 0 }
    } : { position: { x: 0, y: 0, z: 0 } },
    params: scaleParams(comp.params, scaleFactor)
  }));

  const bounds = calculateBoundsFromConfig(
    landmarkConfig.components,
    scaleFactor,
    landmarkConfig.defaultBounds
  );

  console.log(`  [SceneGenerator] Using landmark template: ${landmarkKey} (scale: ${scale})`);

  return {
    version: '2.0',
    intentId: intent.id,
    description: {
      title: landmarkKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      summary: `${landmarkKey} landmark structure`
    },
    bounds,
    style: {
      palette: landmarkConfig.materials || {
        primary: 'stone_bricks',
        secondary: 'oak_planks',
        accent: 'cobblestone'
      },
      theme: 'default'
    },
    components: scaledComponents,
    detailPasses: [],
    // Mark as landmark-generated for debugging
    _landmarkKey: landmarkKey
  };
}

/**
 * Generate a simple deterministic fallback scene
 */
function generateFallbackScene(intent) {
  const scale = intent.intent?.scale || 'medium';
  const category = intent.intent?.category;
  const reference = intent.intent?.reference || intent.rawPrompt || '';

  // Check for known landmark FIRST
  if (category === 'landmark' || reference) {
    const landmarkMatch = findLandmark(reference);
    if (landmarkMatch) {
      return generateLandmarkScene(intent, landmarkMatch.key, landmarkMatch.config);
    }
  }

  // Scale to dimensions mapping
  const scaleDimensions = {
    tiny: { w: 8, h: 6, d: 8 },
    small: { w: 12, h: 8, d: 12 },
    medium: { w: 20, h: 12, d: 20 },
    large: { w: 35, h: 20, d: 35 },
    massive: { w: 60, h: 40, d: 60 },
    colossal: { w: 100, h: 80, d: 100 }
  };

  const dims = scaleDimensions[scale] || scaleDimensions.medium;

  // Generate based on category
  let components = [];

  if (category === 'architecture') {
    // Simple building with room and roof (for non-landmark architecture)
    components = [
      {
        id: 'main_room',
        type: 'room',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: {
          width: dims.w - 2,
          height: Math.floor(dims.h * 0.6),
          depth: dims.d - 2,
          openings: [
            { type: 'door', wall: 'south' },
            { type: 'window', wall: 'east', yOffset: 1 },
            { type: 'window', wall: 'west', yOffset: 1 }
          ]
        }
      },
      {
        id: 'roof',
        type: 'roof_gable',
        transform: { position: { x: 0, y: Math.floor(dims.h * 0.6) + 1, z: 0 } },
        params: {
          width: dims.w,
          depth: dims.d,
          pitch: 0.5,
          overhang: 1
        }
      }
    ];
  } else if (category === 'landmark') {
    // Unknown landmark - use a generic tower structure (better than room+roof)
    components = [
      {
        id: 'tower_base',
        type: 'room',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: {
          width: dims.w,
          height: dims.h,
          depth: dims.d,
          openings: [
            { type: 'door', wall: 'south' },
            { type: 'window', wall: 'north', yOffset: Math.floor(dims.h * 0.7) }
          ]
        }
      },
      {
        id: 'tower_top',
        type: 'tower_top',
        transform: { position: { x: 0, y: dims.h, z: 0 } },
        params: {
          width: dims.w,
          depth: dims.d,
          style: 'spire'
        }
      }
    ];
  } else if (category === 'statue' || category === 'organic') {
    // Simple statue
    components = [
      {
        id: 'base',
        type: 'platform',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: { width: dims.w, depth: dims.d, thickness: 2 }
      },
      {
        id: 'figure',
        type: 'statue_armature',
        transform: { position: { x: Math.floor(dims.w / 2), y: 2, z: Math.floor(dims.d / 2) } },
        params: { height: dims.h - 4, style: 'humanoid' }
      }
    ];
  } else {
    // Generic box structure
    components = [
      {
        id: 'structure',
        type: 'box',
        transform: { position: { x: 0, y: 0, z: 0 } },
        params: { width: dims.w, height: dims.h, depth: dims.d }
      }
    ];
  }

  return {
    version: '2.0',
    intentId: intent.id,
    description: {
      title: intent.intent.reference || 'Structure',
      summary: `Fallback ${category} structure`
    },
    bounds: { width: dims.w, height: dims.h, depth: dims.d },
    style: {
      palette: {
        primary: 'stone_bricks',
        secondary: 'oak_planks',
        accent: 'cobblestone'
      },
      theme: 'default'
    },
    components,
    detailPasses: ['lighting']
  };
}

export default {
  generateSceneV2,
  extractJSON,
  generateFallbackScene,
  generateLandmarkScene
};

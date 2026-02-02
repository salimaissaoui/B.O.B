/**
 * Envelope Repair Module
 *
 * Provides auto-repair capabilities for BlueprintEnvelopes that fail validation.
 * The repair loop:
 * 1. Attempts LLM-based repair up to 2 times
 * 2. Falls back to scale reduction if repair fails
 * 3. Preserves envelope version and kind throughout
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateEnvelope, ENVELOPE_VERSION } from './envelope.js';
import { BlueprintKind } from './router.js';
import { validateWithProfile } from '../validation/validation-profiles.js';
import { SAFETY_LIMITS } from '../config/limits.js';

/**
 * Repair configuration
 */
const REPAIR_CONFIG = {
  maxAttempts: 2,
  minQualityScore: 0.5,
  llmTemperature: 0.5,  // Lower temp for repairs
  maxPayloadSize: 10000, // Max chars for payload in repair prompt
  fallbackScaleFactor: 0.5
};

/**
 * Attempt to repair an envelope that failed validation
 *
 * @param {Object} envelope - The failing BlueprintEnvelope
 * @param {Object} intent - Original intent/routing info
 * @param {string[]} errors - Validation errors
 * @param {string} apiKey - LLM API key
 * @param {Object} options - Repair options
 * @returns {Object} Repair result { success, envelope, attempts, fallbackUsed }
 */
export async function repairEnvelope(envelope, intent, errors, apiKey, options = {}) {
  const {
    maxAttempts = REPAIR_CONFIG.maxAttempts,
    minQualityScore = REPAIR_CONFIG.minQualityScore
  } = options;

  let currentEnvelope = { ...envelope };
  let currentErrors = [...errors];
  let attempts = 0;

  console.log(`[Repair] Starting envelope repair (${currentErrors.length} errors)`);

  // LLM repair attempts
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    attempts++;
    console.log(`[Repair] Attempt ${attempt + 1}/${maxAttempts}...`);

    try {
      const repairedPayload = await callRepairLLM(
        currentEnvelope,
        intent,
        currentErrors,
        apiKey,
        attempt
      );

      // Rebuild envelope with repaired payload
      const repairedEnvelope = {
        ...currentEnvelope,
        blueprintVersion: ENVELOPE_VERSION,
        kind: currentEnvelope.kind, // Preserve kind
        payload: repairedPayload,
        validation: {
          ...currentEnvelope.validation,
          validated: false
        }
      };

      // Revalidate
      const schemaValidation = validateEnvelope(repairedEnvelope);
      const profileValidation = validateWithProfile(
        extractBlueprintFromEnvelope(repairedEnvelope),
        { buildType: intent?.buildType }
      );

      const combinedValid = schemaValidation.valid && profileValidation.safetyPassed;
      const qualityScore = profileValidation.qualityScore;

      if (combinedValid && qualityScore >= minQualityScore) {
        console.log(`[Repair] Success on attempt ${attempt + 1} (quality: ${(qualityScore * 100).toFixed(1)}%)`);

        repairedEnvelope.validation = {
          profile: profileValidation.profile,
          qualityScore,
          qualityGrade: profileValidation.qualityGrade,
          warnings: profileValidation.warnings,
          validated: true,
          validatedAt: new Date().toISOString()
        };

        return {
          success: true,
          envelope: repairedEnvelope,
          attempts,
          fallbackUsed: false
        };
      }

      // Update errors for next attempt
      currentErrors = [
        ...schemaValidation.errors.map(e => typeof e === 'string' ? e : e.message),
        ...profileValidation.errors.map(e => typeof e === 'string' ? e : e.message)
      ];
      currentEnvelope = repairedEnvelope;

      console.log(`[Repair] Attempt ${attempt + 1} still invalid (${currentErrors.length} errors, quality: ${(qualityScore * 100).toFixed(1)}%)`);

    } catch (repairError) {
      console.warn(`[Repair] Attempt ${attempt + 1} failed: ${repairError.message}`);
    }
  }

  // Fallback: reduce scale and simplify
  console.log('[Repair] LLM repair failed, attempting fallback...');

  const fallbackResult = attemptFallback(envelope, intent);

  if (fallbackResult.success) {
    console.log('[Repair] Fallback successful');
    return {
      success: true,
      envelope: fallbackResult.envelope,
      attempts,
      fallbackUsed: true,
      fallbackStrategy: fallbackResult.strategy
    };
  }

  console.error('[Repair] All repair attempts failed');
  return {
    success: false,
    envelope: currentEnvelope,
    attempts,
    fallbackUsed: true,
    errors: currentErrors
  };
}

/**
 * Call LLM to repair the payload
 */
async function callRepairLLM(envelope, intent, errors, apiKey, attemptNumber) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: REPAIR_CONFIG.llmTemperature,
      maxOutputTokens: SAFETY_LIMITS.llmMaxOutputTokens || 8192,
      responseMimeType: 'application/json'
    }
  });

  const prompt = buildRepairPrompt(envelope, intent, errors, attemptNumber);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON from response
  const payload = extractJSON(text);

  if (!payload) {
    throw new Error('Failed to extract valid JSON from repair response');
  }

  return payload;
}

/**
 * Build the repair prompt
 */
function buildRepairPrompt(envelope, intent, errors, attemptNumber) {
  // Truncate payload if too large
  let payloadStr = JSON.stringify(envelope.payload, null, 2);
  if (payloadStr.length > REPAIR_CONFIG.maxPayloadSize) {
    payloadStr = payloadStr.substring(0, REPAIR_CONFIG.maxPayloadSize) + '\n... (truncated)';
  }

  const basePrompt = `You are repairing a Minecraft build blueprint that failed validation.

## Original Intent
${intent ? JSON.stringify({
  buildType: intent.buildType,
  style: intent.style,
  passes: intent.passes
}, null, 2) : 'Not provided'}

## Envelope Info
- Version: ${envelope.blueprintVersion}
- Kind: ${envelope.kind}
- Tags: ${JSON.stringify(envelope.tags)}
- Bounds: ${JSON.stringify(envelope.bounds?.local)}

## Current Payload (${envelope.kind})
${payloadStr}

## Validation Errors
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

## Instructions
1. Fix the specific errors listed above
2. Maintain the original design intent
3. Keep the same structure (${envelope.kind} payload format)
4. Ensure all block names are valid Minecraft blocks
5. Ensure all coordinates are within bounds

${attemptNumber > 0 ? `
## Previous Attempt Failed
This is attempt ${attemptNumber + 1}. The previous repair attempt also failed.
Focus on:
- Being more conservative with dimensions
- Using simpler operations
- Ensuring basic structural requirements are met
` : ''}

Return ONLY the repaired payload JSON (not the full envelope), with no markdown formatting.
For ${envelope.kind}:
${envelope.kind === BlueprintKind.OPS_SCRIPT ? `
{
  "palette": { "primary": "stone_bricks", ... },
  "steps": [
    { "op": "fill", "from": {...}, "to": {...}, "block": "$primary" },
    ...
  ]
}` : `
{
  "palette": { "0": "stone", "1": "cobblestone", ... },
  "voxels": [
    { "x": 0, "y": 0, "z": 0, "block": 0 },
    ...
  ]
}`}`;

  return basePrompt;
}

/**
 * Extract JSON from LLM response
 */
function extractJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Ignore and try extraction
  }

  // Try to extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // Ignore
    }
  }

  // Try to find JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      // Clean common issues
      let cleaned = jsonMatch[0]
        .replace(/,\s*}/g, '}')  // Trailing commas
        .replace(/,\s*]/g, ']')  // Trailing commas in arrays
        .replace(/\/\/.*$/gm, ''); // Comments

      return JSON.parse(cleaned);
    } catch (e) {
      // Ignore
    }
  }

  return null;
}

/**
 * Extract blueprint-like object from envelope for validation
 */
function extractBlueprintFromEnvelope(envelope) {
  if (envelope.kind === BlueprintKind.OPS_SCRIPT) {
    return {
      palette: envelope.payload?.palette || {},
      steps: envelope.payload?.steps || [],
      size: {
        width: envelope.bounds?.local?.max?.x - envelope.bounds?.local?.min?.x + 1 || 10,
        height: envelope.bounds?.local?.max?.y - envelope.bounds?.local?.min?.y + 1 || 10,
        depth: envelope.bounds?.local?.max?.z - envelope.bounds?.local?.min?.z + 1 || 10
      },
      buildType: envelope.tags?.buildType?.[0] || 'generic'
    };
  }

  // For voxel sparse, convert to steps
  const steps = (envelope.payload?.voxels || []).slice(0, 100).map(v => ({
    op: 'set',
    pos: { x: v.x, y: v.y, z: v.z },
    block: typeof v.block === 'number'
      ? (envelope.payload?.palette?.[v.block] || 'stone')
      : v.block
  }));

  return {
    palette: envelope.payload?.palette || {},
    steps,
    size: {
      width: envelope.bounds?.local?.max?.x - envelope.bounds?.local?.min?.x + 1 || 10,
      height: envelope.bounds?.local?.max?.y - envelope.bounds?.local?.min?.y + 1 || 10,
      depth: envelope.bounds?.local?.max?.z - envelope.bounds?.local?.min?.z + 1 || 10
    },
    buildType: envelope.tags?.buildType?.[0] || 'generic'
  };
}

/**
 * Fallback repair strategies when LLM repair fails
 */
function attemptFallback(envelope, intent) {
  const strategies = [
    scaleReduction,
    simplifyPasses,
    switchKind
  ];

  for (const strategy of strategies) {
    const result = strategy(envelope, intent);
    if (result.success) {
      return result;
    }
  }

  return { success: false };
}

/**
 * Fallback strategy: Reduce scale by 50%
 */
function scaleReduction(envelope, intent) {
  try {
    const scaleFactor = REPAIR_CONFIG.fallbackScaleFactor;

    // Scale bounds
    const newBounds = {
      local: {
        min: envelope.bounds.local.min,
        max: {
          x: Math.floor(envelope.bounds.local.max.x * scaleFactor),
          y: Math.floor(envelope.bounds.local.max.y * scaleFactor),
          z: Math.floor(envelope.bounds.local.max.z * scaleFactor)
        }
      }
    };

    // Scale payload based on kind
    let newPayload;
    if (envelope.kind === BlueprintKind.OPS_SCRIPT) {
      newPayload = scaleOpsScriptPayload(envelope.payload, scaleFactor, newBounds);
    } else if (envelope.kind === BlueprintKind.VOXEL_SPARSE) {
      newPayload = scaleVoxelSparsePayload(envelope.payload, scaleFactor, newBounds);
    } else {
      return { success: false };
    }

    const scaledEnvelope = {
      ...envelope,
      bounds: {
        ...envelope.bounds,
        local: newBounds.local
      },
      payload: newPayload,
      estimates: {
        ...envelope.estimates,
        blockCount: Math.floor(envelope.estimates.blockCount * scaleFactor * scaleFactor * scaleFactor)
      },
      metadata: {
        ...envelope.metadata,
        fallback: 'scale_reduction',
        originalScale: 1.0,
        newScale: scaleFactor
      }
    };

    // Validate scaled envelope
    const validation = validateEnvelope(scaledEnvelope);
    if (validation.valid) {
      return {
        success: true,
        envelope: scaledEnvelope,
        strategy: 'scale_reduction'
      };
    }

    return { success: false };
  } catch (e) {
    console.warn(`[Repair] Scale reduction failed: ${e.message}`);
    return { success: false };
  }
}

/**
 * Scale OPS_SCRIPT payload coordinates
 */
function scaleOpsScriptPayload(payload, scaleFactor, bounds) {
  const maxX = bounds.local.max.x;
  const maxY = bounds.local.max.y;
  const maxZ = bounds.local.max.z;

  const scaledSteps = (payload.steps || []).map(step => {
    const scaledStep = { ...step };

    // Scale coordinate fields
    for (const key of ['from', 'to', 'pos', 'base', 'center']) {
      if (scaledStep[key]) {
        scaledStep[key] = {
          x: Math.min(Math.floor(scaledStep[key].x * scaleFactor), maxX),
          y: Math.min(Math.floor(scaledStep[key].y * scaleFactor), maxY),
          z: Math.min(Math.floor(scaledStep[key].z * scaleFactor), maxZ)
        };
      }
    }

    // Scale size fields
    if (scaledStep.size) {
      scaledStep.size = {
        x: Math.max(1, Math.floor((scaledStep.size.x || 1) * scaleFactor)),
        y: Math.max(1, Math.floor((scaledStep.size.y || 1) * scaleFactor)),
        z: Math.max(1, Math.floor((scaledStep.size.z || 1) * scaleFactor))
      };
    }

    // Scale dimension fields
    for (const key of ['height', 'radius', 'width', 'depth']) {
      if (scaledStep[key] !== undefined) {
        scaledStep[key] = Math.max(1, Math.floor(scaledStep[key] * scaleFactor));
      }
    }

    return scaledStep;
  });

  return {
    palette: payload.palette,
    steps: scaledSteps
  };
}

/**
 * Scale VOXEL_SPARSE payload coordinates
 */
function scaleVoxelSparsePayload(payload, scaleFactor, bounds) {
  const maxX = bounds.local.max.x;
  const maxY = bounds.local.max.y;
  const maxZ = bounds.local.max.z;

  const scaledVoxels = (payload.voxels || [])
    .map(v => ({
      x: Math.min(Math.floor(v.x * scaleFactor), maxX),
      y: Math.min(Math.floor(v.y * scaleFactor), maxY),
      z: Math.min(Math.floor(v.z * scaleFactor), maxZ),
      block: v.block
    }))
    // Remove duplicates after scaling
    .filter((v, i, arr) =>
      arr.findIndex(v2 => v2.x === v.x && v2.y === v.y && v2.z === v.z) === i
    );

  return {
    palette: payload.palette,
    voxels: scaledVoxels
  };
}

/**
 * Fallback strategy: Simplify passes (remove non-essential)
 */
function simplifyPasses(envelope, intent) {
  try {
    // Only keep 'shell' pass
    const simplifiedEnvelope = {
      ...envelope,
      tags: {
        ...envelope.tags,
        passes: ['shell']
      }
    };

    // If OPS_SCRIPT, filter out detail/interior operations
    if (envelope.kind === BlueprintKind.OPS_SCRIPT) {
      const detailOps = ['window_strip', 'door', 'lantern', 'flower', 'painting', 'bed', 'chair', 'table'];

      simplifiedEnvelope.payload = {
        ...envelope.payload,
        steps: (envelope.payload.steps || []).filter(step =>
          !detailOps.includes(step.op)
        )
      };
    }

    const validation = validateEnvelope(simplifiedEnvelope);
    if (validation.valid) {
      return {
        success: true,
        envelope: simplifiedEnvelope,
        strategy: 'simplify_passes'
      };
    }

    return { success: false };
  } catch (e) {
    return { success: false };
  }
}

/**
 * Fallback strategy: Switch kind (OPS_SCRIPT ↔ VOXEL_SPARSE)
 */
function switchKind(envelope, intent) {
  // Only switch if it makes sense for the build type
  const buildType = envelope.tags?.buildType?.[0] || 'generic';

  // Don't switch pixel_art or statue from VOXEL_SPARSE
  if (['pixel_art', 'statue'].includes(buildType) && envelope.kind === BlueprintKind.VOXEL_SPARSE) {
    return { success: false };
  }

  // Don't switch house/castle from OPS_SCRIPT
  if (['house', 'castle', 'infrastructure'].includes(buildType) && envelope.kind === BlueprintKind.OPS_SCRIPT) {
    return { success: false };
  }

  // For other cases, switching is too complex for fallback
  return { success: false };
}

/**
 * Determine if an envelope needs repair
 */
export function needsRepair(envelope, validationResult) {
  if (!validationResult) {
    const validation = validateEnvelope(envelope);
    return !validation.valid;
  }

  return !validationResult.valid ||
    (validationResult.qualityScore !== undefined && validationResult.qualityScore < REPAIR_CONFIG.minQualityScore);
}

// Named exports for direct import
export { REPAIR_CONFIG };

export default {
  repairEnvelope,
  needsRepair,
  REPAIR_CONFIG
};

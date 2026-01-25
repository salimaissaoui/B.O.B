import { detectBuildType, detectTheme, analyzePrompt as analyzeBuildTypes } from '../config/build-types.js';

/**
 * Stage 1: Lightweight analyzer (no LLM)
 * Extracts hints from prompt for generator guidance
 *
 * This stage is fast and deterministic - no API calls.
 * It provides suggestions that the generator can use or override.
 */
export function analyzePrompt(userPrompt) {
  // Use existing analysis from build-types.js
  const analysis = analyzeBuildTypes(userPrompt);

  // Enhanced build type detection
  const buildTypeInfo = detectBuildType(userPrompt);
  const themeInfo = detectTheme(userPrompt);

  return {
    userPrompt,
    buildType: buildTypeInfo.type,
    buildTypeInfo,
    theme: themeInfo,
    hints: {
      dimensions: analysis.dimensions,
      materials: analysis.materials,
      features: analysis.features,
      size: analysis.size?.size || 'medium',
      operations: analysis.operations
    }
  };
}

export default analyzePrompt;

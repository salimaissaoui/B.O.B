/**
 * Enhanced Hybrid Generator
 * Intelligent blueprint generation with quality priority:
 * 1. Template (proven designs, instant, highest quality)
 * 2. Template + LLM Enhancement (customized quality, fast)
 * 3. Algorithmic (procedural, instant, basic quality)
 * 4. Pure LLM (most flexible, slower, variable quality)
 */

import { generateFromTemplate, getAvailableTemplates } from './template-builder.js';
import { generateCastle } from './castle-builder.js';
import { generatePixelArt } from './pixel-art-builder.js';
import { generateHouse } from './house-builder.js';
import { GeminiClient } from '../llm/gemini-client.js';

/**
 * Generate blueprint using best available method with quality priority
 * @param {Object} designPlan - Design plan
 * @param {string[]} allowlist - Allowed blocks
 * @param {string} apiKey - Gemini API key (optional for template/algorithmic)
 * @param {boolean} worldEditAvailable - Whether WorldEdit is available
 * @returns {Promise<Object>} - Blueprint object
 */
export async function generateBlueprintEnhanced(designPlan, allowlist, apiKey, worldEditAvailable = false) {
  const buildType = designPlan.buildType || 'house';
  const description = designPlan.description?.toLowerCase() || '';
  const theme = designPlan.theme || 'default';

  console.log(`Enhanced hybrid generator: Analyzing "${buildType}" (theme: ${theme})...`);

  // Priority 1: Try template-based generation (highest quality)
  try {
    const templates = getAvailableTemplates(buildType);
    const hasTemplates = templates && Object.keys(templates).length > 0;

    if (hasTemplates) {
      const isSimpleRequest = isSimpleBuildRequest(designPlan, description);

      if (isSimpleRequest) {
        // Use template directly (fastest, proven quality)
        console.log('  → Strategy: Template-based (proven design, instant)');
        const blueprint = generateFromTemplate(designPlan, allowlist, false);
        return blueprint;
      } else if (apiKey) {
        // Use template + LLM enhancement (best of both worlds)
        console.log('  → Strategy: Template + LLM Enhancement (quality + customization)');
        const baseBlueprint = generateFromTemplate(designPlan, allowlist, true);
        const enhanced = await enhanceTemplateWithLLM(baseBlueprint, designPlan, allowlist, apiKey);
        return enhanced;
      }
    }
  } catch (templateError) {
    console.warn(`  ⚠ Template generation failed: ${templateError.message}`);
  }

  // Priority 2: Try algorithmic generation (fast, basic quality)
  try {
    if (shouldUseAlgorithmic(buildType, description, designPlan)) {
      console.log('  → Strategy: Algorithmic (procedural, instant)');
      return generateAlgorithmic(buildType, designPlan, allowlist, worldEditAvailable);
    }
  } catch (algorithmicError) {
    console.warn(`  ⚠ Algorithmic generation failed: ${algorithmicError.message}`);
  }

  // Priority 3: Fall back to pure LLM (most flexible)
  if (!apiKey) {
    throw new Error('No suitable generation method available. API key required for this build type.');
  }

  console.log('  → Strategy: Pure LLM (flexible, creative)');
  return await generateWithLLM(designPlan, allowlist, apiKey, worldEditAvailable);
}

/**
 * Enhance template blueprint with LLM customization
 */
async function enhanceTemplateWithLLM(baseBlueprint, designPlan, allowlist, apiKey) {
  const client = new GeminiClient(apiKey);

  const enhancementPrompt = `
You are enhancing a proven blueprint template for Minecraft.

BASE TEMPLATE:
${JSON.stringify(baseBlueprint, null, 2)}

USER REQUEST:
${JSON.stringify(designPlan, null, 2)}

ENHANCEMENT TASK:
The base template is a proven, high-quality design. Your job is to:
1. Keep the core structure intact (walls, roof, foundation)
2. Add requested custom features: ${designPlan.features?.join(', ') || 'standard features'}
3. Enhance decorative details (more varied blocks, architectural details)
4. Maintain structural integrity and build quality
5. Stay within allowlist: ${allowlist.join(', ')}

GUIDELINES:
- Do NOT remove or significantly alter core structural operations
- ADD new operations for custom features
- ENHANCE existing operations with better materials from allowlist
- Keep the proven quality of the original template
- Add 5-10 detail operations for visual interest

OUTPUT:
Return the enhanced blueprint as valid JSON with the same structure as the base template.
Only output the JSON, no explanations.
`;

  try {
    const result = await client.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: enhancementPrompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    });

    const enhanced = client.parseJsonResponse(result.response.text(), 'template enhancement');
    enhanced.generationMethod = 'template+llm';
    enhanced.baseTemplate = baseBlueprint.templateName;

    return enhanced;
  } catch (error) {
    console.warn(`  ⚠ LLM enhancement failed, using base template: ${error.message}`);
    return baseBlueprint; // Fallback to unenhanced template
  }
}

/**
 * Check if this is a simple build request (suitable for direct template use)
 */
function isSimpleBuildRequest(designPlan, description) {
  const features = designPlan.features || [];

  // Simple if:
  // 1. No unusual features requested
  // 2. Description doesn't contain complex customization words
  const complexWords = [
    'unique', 'custom', 'special', 'unusual', 'fancy', 'elaborate',
    'intricate', 'detailed', 'ornate', 'grand', 'massive', 'huge'
  ];

  const hasComplexRequest = complexWords.some(word => description.includes(word));

  // Standard features that templates handle well
  const standardFeatures = [
    'door', 'window', 'roof', 'chimney', 'porch', 'entrance',
    'walls', 'floor', 'foundation', 'stairs'
  ];

  const hasOnlyStandardFeatures = features.every(f =>
    standardFeatures.some(sf => f.toLowerCase().includes(sf))
  );

  return !hasComplexRequest && (features.length === 0 || hasOnlyStandardFeatures);
}

/**
 * Check if algorithmic generation should be used
 */
function shouldUseAlgorithmic(buildType, description, designPlan) {
  // Castle: Use algorithmic if no template available and dimensions suitable
  if (buildType === 'castle') {
    const { width, depth } = designPlan.dimensions;
    return width >= 15 && depth >= 15 && width <= 100 && depth <= 100;
  }

  // Pixel art: Use algorithmic for known patterns
  if (buildType === 'pixel_art') {
    const patterns = [
      'heart', 'smiley', 'face', 'creeper', 'sword', 'star',
      'arrow', 'cross', 'plus', 'checkerboard'
    ];
    return patterns.some(pattern => description.includes(pattern));
  }

  // House: Use algorithmic only if no template matches
  if (buildType === 'house') {
    const { width, height, depth } = designPlan.dimensions;
    return width >= 5 && width <= 30 &&
           depth >= 5 && depth <= 30 &&
           height >= 5 && height <= 20;
  }

  return false;
}

/**
 * Generate blueprint algorithmically
 */
function generateAlgorithmic(buildType, designPlan, allowlist, worldEditAvailable) {
  switch (buildType) {
    case 'castle':
      return generateCastle(designPlan, allowlist, worldEditAvailable);
    case 'pixel_art':
      return generatePixelArt(designPlan, allowlist);
    case 'house':
      return generateHouse(designPlan, allowlist, worldEditAvailable);
    default:
      throw new Error(`No algorithmic generator for build type: ${buildType}`);
  }
}

/**
 * Generate blueprint using pure LLM
 */
async function generateWithLLM(designPlan, allowlist, apiKey, worldEditAvailable) {
  const client = new GeminiClient(apiKey);
  const blueprint = await client.generateBlueprint(designPlan, allowlist, worldEditAvailable);
  blueprint.generationMethod = 'llm';
  return blueprint;
}

/**
 * Get generation strategy recommendation
 */
export function getRecommendedStrategy(designPlan, hasApiKey) {
  const buildType = designPlan.buildType || 'house';
  const templates = getAvailableTemplates(buildType);
  const hasTemplates = templates && Object.keys(templates).length > 0;

  if (hasTemplates) {
    const description = designPlan.description?.toLowerCase() || '';
    const isSimple = isSimpleBuildRequest(designPlan, description);

    if (isSimple) {
      return {
        strategy: 'template',
        quality: 'high',
        speed: 'instant',
        cost: 'free'
      };
    } else if (hasApiKey) {
      return {
        strategy: 'template+llm',
        quality: 'highest',
        speed: 'fast',
        cost: 'low'
      };
    }
  }

  if (shouldUseAlgorithmic(buildType, designPlan.description || '', designPlan)) {
    return {
      strategy: 'algorithmic',
      quality: 'medium',
      speed: 'instant',
      cost: 'free'
    };
  }

  if (hasApiKey) {
    return {
      strategy: 'llm',
      quality: 'variable',
      speed: 'slow',
      cost: 'medium'
    };
  }

  return {
    strategy: 'none',
    error: 'No suitable generation method available'
  };
}

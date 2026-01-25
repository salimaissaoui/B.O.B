/**
 * Template-Based Blueprint Builder
 * Uses high-quality pre-designed templates that can be:
 * 1. Scaled/parameterized for different sizes
 * 2. Enhanced by LLM for variations
 * 3. Combined for complex structures
 */

import { BUILD_EXAMPLES } from '../config/build-examples.js';

/**
 * Generate blueprint from template with optional LLM enhancement
 * @param {Object} designPlan - Design plan
 * @param {string[]} allowlist - Allowed blocks
 * @param {boolean} enhanceWithLLM - Whether to enhance template with LLM
 * @returns {Object} - Blueprint object
 */
export function generateFromTemplate(designPlan, allowlist, enhanceWithLLM = false) {
  const buildType = designPlan.buildType || 'house';
  const theme = designPlan.theme || 'default';

  // Find best matching template
  const template = findBestTemplate(buildType, theme, designPlan);

  if (!template) {
    throw new Error(`No template found for ${buildType} (theme: ${theme})`);
  }

  console.log(`  → Using template: ${template.name}`);

  // Clone and parameterize template
  let blueprint = parameterizeTemplate(template.blueprint, designPlan, allowlist);

  // Mark as template-based
  blueprint.generationMethod = enhanceWithLLM ? 'template+llm' : 'template';
  blueprint.templateName = template.name;

  return blueprint;
}

/**
 * Find best matching template for design plan
 */
function findBestTemplate(buildType, theme, designPlan) {
  const examples = BUILD_EXAMPLES[buildType];

  if (!examples) {
    return null;
  }

  // Convert to array of templates
  const templates = Object.values(examples);

  // Score each template based on match quality
  const scored = templates.map(template => ({
    template,
    score: scoreTemplateMatch(template, theme, designPlan)
  }));

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Return best match if score is good enough
  return scored[0]?.score > 0 ? scored[0].template : null;
}

/**
 * Score how well a template matches the design plan
 */
function scoreTemplateMatch(template, theme, designPlan) {
  let score = 100; // Start with base score

  // Theme match
  const templateTheme = template.designPlan.theme || 'default';
  if (templateTheme === theme) {
    score += 50;
  }

  // Size similarity (prefer templates close to requested size)
  const templateDims = template.designPlan.dimensions;
  const requestedDims = designPlan.dimensions;

  const sizeRatio = Math.min(
    requestedDims.width / templateDims.width,
    requestedDims.height / templateDims.height,
    requestedDims.depth / templateDims.depth
  );

  // Score based on how close sizes are (prefer 0.8-1.2x ratio)
  if (sizeRatio >= 0.8 && sizeRatio <= 1.2) {
    score += 30;
  } else if (sizeRatio >= 0.5 && sizeRatio <= 2.0) {
    score += 15;
  }

  // Feature match (count matching features)
  const templateFeatures = template.designPlan.features || [];
  const requestedFeatures = designPlan.features || [];

  const matchingFeatures = requestedFeatures.filter(f =>
    templateFeatures.some(tf => tf.toLowerCase().includes(f.toLowerCase()) ||
                               f.toLowerCase().includes(tf.toLowerCase()))
  );

  score += matchingFeatures.length * 10;

  return score;
}

/**
 * Parameterize template to match design plan
 * Adjusts materials, scales dimensions slightly
 */
function parameterizeTemplate(templateBlueprint, designPlan, allowlist) {
  let blueprint = JSON.parse(JSON.stringify(templateBlueprint)); // Deep clone

  // Material substitution based on allowlist
  blueprint.palette = substituteMaterials(blueprint.palette, allowlist);

  // Update all block references in steps
  blueprint.steps = blueprint.steps.map(step => {
    const newStep = { ...step };
    if (newStep.block) {
      newStep.block = findClosestMatch(newStep.block, allowlist);
    }
    return newStep;
  });

  // Optional: Scale blueprint if requested size differs significantly
  const scaleNeeded = shouldScale(templateBlueprint.size, designPlan.dimensions);
  if (scaleNeeded) {
    console.log(`  → Scaling template from ${templateBlueprint.size.width}x${templateBlueprint.size.height}x${templateBlueprint.size.depth} to ${designPlan.dimensions.width}x${designPlan.dimensions.height}x${designPlan.dimensions.depth}`);
    blueprint = scaleBlueprint(blueprint, templateBlueprint.size, designPlan.dimensions);
  }

  return blueprint;
}

/**
 * Check if blueprint should be scaled
 */
function shouldScale(templateSize, requestedSize) {
  // Scale if requested size is significantly different (>20% difference)
  const widthRatio = requestedSize.width / templateSize.width;
  const heightRatio = requestedSize.height / templateSize.height;
  const depthRatio = requestedSize.depth / templateSize.depth;

  return widthRatio < 0.8 || widthRatio > 1.2 ||
         heightRatio < 0.8 || heightRatio > 1.2 ||
         depthRatio < 0.8 || depthRatio > 1.2;
}

/**
 * Scale blueprint to new dimensions
 */
function scaleBlueprint(blueprint, oldSize, newSize) {
  const scaleX = newSize.width / oldSize.width;
  const scaleY = newSize.height / oldSize.height;
  const scaleZ = newSize.depth / oldSize.depth;

  // Update size
  blueprint.size = { ...newSize };

  // Scale all coordinate-based operations
  blueprint.steps = blueprint.steps.map(step => {
    const newStep = { ...step };

    // Scale coordinates
    if (newStep.from) {
      newStep.from = {
        x: Math.floor(newStep.from.x * scaleX),
        y: Math.floor(newStep.from.y * scaleY),
        z: Math.floor(newStep.from.z * scaleZ)
      };
    }

    if (newStep.to) {
      newStep.to = {
        x: Math.floor(newStep.to.x * scaleX),
        y: Math.floor(newStep.to.y * scaleY),
        z: Math.floor(newStep.to.z * scaleZ)
      };
    }

    if (newStep.pos) {
      newStep.pos = {
        x: Math.floor(newStep.pos.x * scaleX),
        y: Math.floor(newStep.pos.y * scaleY),
        z: Math.floor(newStep.pos.z * scaleZ)
      };
    }

    if (newStep.base) {
      newStep.base = {
        x: Math.floor(newStep.base.x * scaleX),
        y: Math.floor(newStep.base.y * scaleY),
        z: Math.floor(newStep.base.z * scaleZ)
      };
    }

    if (newStep.center) {
      newStep.center = {
        x: Math.floor(newStep.center.x * scaleX),
        y: Math.floor(newStep.center.y * scaleY),
        z: Math.floor(newStep.center.z * scaleZ)
      };
    }

    // Scale height/radius parameters
    if (newStep.height !== undefined) {
      newStep.height = Math.max(1, Math.floor(newStep.height * scaleY));
    }

    if (newStep.radius !== undefined) {
      newStep.radius = Math.max(1, Math.floor(newStep.radius * Math.min(scaleX, scaleZ)));
    }

    if (newStep.peakHeight !== undefined) {
      newStep.peakHeight = Math.max(1, Math.floor(newStep.peakHeight * scaleY));
    }

    return newStep;
  });

  return blueprint;
}

/**
 * Substitute template materials with available blocks
 */
function substituteMaterials(templatePalette, allowlist) {
  return templatePalette.map(block => findClosestMatch(block, allowlist));
}

/**
 * Find closest matching block in allowlist
 */
function findClosestMatch(templateBlock, allowlist) {
  // Exact match
  if (allowlist.includes(templateBlock)) {
    return templateBlock;
  }

  // Extract base material type
  const baseType = getBlockType(templateBlock);

  // Find similar blocks
  const candidates = allowlist.filter(b => {
    const candidateType = getBlockType(b);
    return candidateType === baseType;
  });

  if (candidates.length > 0) {
    return candidates[0];
  }

  // Fallback to functional equivalent
  const equivalent = findFunctionalEquivalent(templateBlock, allowlist);
  if (equivalent) {
    return equivalent;
  }

  // Last resort: first allowlist item
  return allowlist[0] || 'stone';
}

/**
 * Get block type (e.g., "oak_planks" -> "planks")
 */
function getBlockType(blockName) {
  if (blockName.includes('planks')) return 'planks';
  if (blockName.includes('log')) return 'log';
  if (blockName.includes('stairs')) return 'stairs';
  if (blockName.includes('slab')) return 'slab';
  if (blockName.includes('fence')) return 'fence';
  if (blockName.includes('door')) return 'door';
  if (blockName.includes('glass')) return 'glass';
  if (blockName.includes('stone')) return 'stone';
  if (blockName.includes('brick')) return 'brick';
  if (blockName.includes('concrete')) return 'concrete';
  if (blockName.includes('terracotta')) return 'terracotta';
  if (blockName.includes('wool')) return 'wool';
  return 'misc';
}

/**
 * Find functionally equivalent block
 */
function findFunctionalEquivalent(templateBlock, allowlist) {
  const equivalents = {
    planks: ['oak_planks', 'spruce_planks', 'birch_planks', 'dark_oak_planks'],
    log: ['oak_log', 'spruce_log', 'birch_log', 'dark_oak_log'],
    stairs: ['oak_stairs', 'spruce_stairs', 'stone_stairs', 'brick_stairs'],
    slab: ['oak_slab', 'spruce_slab', 'stone_slab', 'brick_slab'],
    fence: ['oak_fence', 'spruce_fence', 'dark_oak_fence'],
    door: ['oak_door', 'spruce_door', 'iron_door'],
    glass: ['glass', 'glass_pane'],
    stone: ['stone', 'cobblestone', 'stone_bricks'],
    brick: ['bricks', 'stone_bricks']
  };

  const type = getBlockType(templateBlock);
  const options = equivalents[type];

  if (options) {
    for (const option of options) {
      if (allowlist.includes(option)) {
        return option;
      }
    }
  }

  return null;
}

/**
 * List available templates
 */
export function getAvailableTemplates(buildType = null) {
  if (buildType) {
    return BUILD_EXAMPLES[buildType] || {};
  }
  return BUILD_EXAMPLES;
}

/**
 * Get template details
 */
export function getTemplateInfo(buildType, templateKey) {
  return BUILD_EXAMPLES[buildType]?.[templateKey] || null;
}

/**
 * Stage 0: Prompt Router
 *
 * Deterministically classifies user prompts into:
 * - BlueprintKind (execution strategy)
 * - buildTypeTags (for validation profile selection)
 * - Required passes (shell, detail, interior, landscape)
 *
 * This router runs BEFORE the analyzer and provides early classification
 * that guides the entire pipeline.
 */

import { getValidationProfile, VALIDATION_PROFILES } from '../validation/validation-profiles.js';

/**
 * Blueprint execution strategy kinds
 * Determines how the blueprint payload is structured and executed
 */
export const BlueprintKind = {
  OPS_SCRIPT: 'ops_script',           // Sequential operations (V1/V2 default)
  VOXEL_SPARSE: 'voxel_sparse',       // Sparse voxel map for pixel art/statues
  FLOORPLAN_SEMANTIC: 'floorplan_semantic',  // Future: room-based floor plans
  ASSET_REFERENCE: 'asset_reference'   // Future: external asset reference
};

/**
 * Routing rules for prompt classification
 * Order matters - first match wins
 */
const ROUTING_RULES = [
  // Pixel art (thin extrusion, 2D-like)
  {
    patterns: ['pixel art', 'pixelart', 'pixel_art', 'mosaic', 'map art', 'map_art', '2d art', '2d_art', 'flat art'],
    kind: BlueprintKind.VOXEL_SPARSE,
    buildType: 'pixel_art',
    profile: 'pixel_art',
    defaultPasses: ['shell']
  },

  // Statues and 3D figures (voxel-based sculpting)
  {
    patterns: ['statue', 'sculpture', 'figure', 'character model', '3d figure', '3d model', 'bust', 'monument'],
    kind: BlueprintKind.VOXEL_SPARSE,
    buildType: 'statue',
    profile: 'statue',
    defaultPasses: ['shell', 'detail']
  },

  // Treehouses (special case: elevated structure with tree)
  {
    patterns: ['treehouse', 'tree house', 'tree_house'],
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'treehouse',
    profile: 'treehouse',
    defaultPasses: ['shell', 'detail']
  },

  // Trees and organic nature
  {
    patterns: ['tree', 'oak tree', 'birch tree', 'spruce tree', 'jungle tree', 'plant', 'bush', 'shrub'],
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'tree',
    profile: 'tree',
    defaultPasses: ['shell']
  },

  // Houses and residential
  {
    patterns: ['house', 'home', 'mansion', 'cottage', 'cabin', 'villa', 'bungalow', 'apartment', 'dwelling'],
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'house',
    profile: 'house',
    defaultPasses: ['shell', 'detail']
  },

  // Modern buildings
  {
    patterns: ['modern home', 'modern house', 'modern building', 'contemporary', 'minimalist house'],
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'house',
    profile: 'house',
    style: 'modern',
    defaultPasses: ['shell', 'detail', 'interior']
  },

  // Castles and fortresses
  {
    patterns: ['castle', 'fortress', 'fort', 'citadel', 'stronghold', 'keep', 'palace', 'chateau'],
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'castle',
    profile: 'castle',
    defaultPasses: ['shell', 'detail']
  },

  // Towers
  {
    patterns: ['tower', 'watchtower', 'bell tower', 'clock tower', 'lighthouse', 'spire', 'minaret'],
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'infrastructure',
    profile: 'infrastructure',
    defaultPasses: ['shell', 'detail']
  },

  // Bridges
  {
    patterns: ['bridge', 'overpass', 'viaduct', 'aqueduct', 'walkway'],
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'infrastructure',
    profile: 'infrastructure',
    defaultPasses: ['shell']
  },

  // Landmarks and replicas
  {
    patterns: ['eiffel', 'big ben', 'statue of liberty', 'colosseum', 'pyramid', 'sphinx',
      'landmark', 'replica', 'famous', 'iconic', 'recreation'],
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'landmark',
    profile: 'landmark',
    defaultPasses: ['shell', 'detail']
  },

  // Terrain and landscapes
  {
    patterns: ['terrain', 'landscape', 'mountain', 'hill', 'valley', 'cliff', 'canyon',
      'river', 'lake', 'island', 'volcano', 'cave'],
    kind: BlueprintKind.VOXEL_SPARSE,
    buildType: 'terrain',
    profile: 'terrain',
    defaultPasses: ['shell', 'landscape']
  },

  // Walls and fences
  {
    patterns: ['wall', 'fence', 'barrier', 'perimeter', 'boundary'],
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'infrastructure',
    profile: 'infrastructure',
    defaultPasses: ['shell']
  },

  // Ships and vehicles
  {
    patterns: ['ship', 'boat', 'yacht', 'galleon', 'submarine', 'aircraft', 'plane', 'car', 'train'],
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'infrastructure',
    profile: 'infrastructure',
    defaultPasses: ['shell', 'detail']
  }
];

/**
 * Keywords that indicate additional passes should be included
 */
const PASS_INDICATORS = {
  interior: ['interior', 'furnished', 'inside', 'rooms', 'bedroom', 'kitchen', 'bathroom', 'living room'],
  detail: ['detailed', 'decorated', 'ornate', 'fancy', 'elaborate', 'intricate'],
  landscape: ['garden', 'landscaping', 'yard', 'courtyard', 'surrounding', 'path', 'flowers']
};

/**
 * Style keywords for theme detection
 */
const STYLE_KEYWORDS = {
  medieval: ['medieval', 'castle', 'fortress', 'knight', 'kingdom', 'old', 'ancient'],
  modern: ['modern', 'contemporary', 'minimalist', 'sleek', 'glass', 'steel'],
  gothic: ['gothic', 'dark', 'spooky', 'haunted', 'cathedral'],
  rustic: ['rustic', 'farmhouse', 'country', 'barn', 'wooden', 'log'],
  oriental: ['oriental', 'asian', 'japanese', 'chinese', 'pagoda', 'temple'],
  fantasy: ['fantasy', 'magical', 'enchanted', 'wizard', 'fairy', 'elven'],
  industrial: ['industrial', 'factory', 'warehouse', 'steampunk', 'mechanical'],
  organic: ['organic', 'natural', 'tree', 'living', 'grown']
};

/**
 * Route a user prompt to determine blueprint kind and validation profile
 *
 * @param {string} prompt - The user's build prompt
 * @param {Object} options - Additional routing options
 * @returns {Object} Routing result with kind, buildType, profile, passes, style
 */
export function routePrompt(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string') {
    return getDefaultRouting();
  }

  const normalized = prompt.toLowerCase().trim();

  // Find matching rule
  let matchedRule = null;
  let matchedPattern = null;

  for (const rule of ROUTING_RULES) {
    for (const pattern of rule.patterns) {
      if (normalized.includes(pattern)) {
        matchedRule = rule;
        matchedPattern = pattern;
        break;
      }
    }
    if (matchedRule) break;
  }

  // Use matched rule or default
  const baseRouting = matchedRule || {
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'generic',
    profile: 'generic',
    defaultPasses: ['shell']
  };

  // Determine passes
  const passes = inferPasses(normalized, baseRouting.defaultPasses || ['shell']);

  // Determine style
  const style = inferStyle(normalized, baseRouting.style);

  // Get the validation profile
  const validationProfile = getValidationProfile(baseRouting.profile);

  return {
    kind: baseRouting.kind,
    buildType: baseRouting.buildType,
    profile: baseRouting.profile,
    validationProfile,
    passes,
    style,
    matchedPattern,
    confidence: matchedRule ? 'high' : 'low'
  };
}

/**
 * Infer which passes should be included based on prompt keywords
 */
function inferPasses(prompt, defaultPasses) {
  const passes = new Set(defaultPasses);

  for (const [pass, keywords] of Object.entries(PASS_INDICATORS)) {
    if (keywords.some(kw => prompt.includes(kw))) {
      passes.add(pass);
    }
  }

  return Array.from(passes);
}

/**
 * Infer style/theme from prompt keywords
 */
function inferStyle(prompt, defaultStyle = 'default') {
  for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
    if (keywords.some(kw => prompt.includes(kw))) {
      return style;
    }
  }
  return defaultStyle;
}

/**
 * Get default routing for unknown prompts
 */
function getDefaultRouting() {
  return {
    kind: BlueprintKind.OPS_SCRIPT,
    buildType: 'generic',
    profile: 'house', // Most restrictive by default for safety
    validationProfile: VALIDATION_PROFILES.house,
    passes: ['shell'],
    style: 'default',
    matchedPattern: null,
    confidence: 'none'
  };
}

/**
 * Check if a build type should use voxel-sparse format
 */
export function shouldUseVoxelSparse(buildType) {
  const voxelTypes = ['pixel_art', 'statue', 'terrain'];
  return voxelTypes.includes(buildType);
}

/**
 * Check if a build type is organic/natural
 */
export function isOrganicBuildType(buildType) {
  const organicTypes = ['tree', 'terrain', 'organic'];
  return organicTypes.includes(buildType);
}

/**
 * Get all available build types
 */
export function getAvailableBuildTypes() {
  const types = new Set();
  for (const rule of ROUTING_RULES) {
    types.add(rule.buildType);
  }
  types.add('generic');
  return Array.from(types);
}

/**
 * Get all available blueprint kinds
 */
export function getAvailableKinds() {
  return Object.values(BlueprintKind);
}

export default {
  BlueprintKind,
  routePrompt,
  shouldUseVoxelSparse,
  isOrganicBuildType,
  getAvailableBuildTypes,
  getAvailableKinds
};

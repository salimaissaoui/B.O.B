/**
 * Validation Profiles
 *
 * Build-type-aware validation profiles that customize which structural
 * checks are required vs optional for different build types.
 *
 * This replaces the one-size-fits-all approach where every build needed
 * a roof, walls, and door regardless of type.
 */

/**
 * Validation profile definitions
 * Each profile specifies:
 * - Structural requirements (roof, walls, door, foundation)
 * - Allowed build characteristics (floating, organic, extreme scale)
 * - Quality checks to perform
 * - Optional overrides for bounds/safety
 */
export const VALIDATION_PROFILES = {
  pixel_art: {
    id: 'pixel_art',
    name: 'Pixel Art',
    description: '2D or thin 3D pixel art builds',

    // Structural requirements
    requireRoof: false,
    requireWalls: false,
    requireDoor: false,
    requireFoundation: false,

    // Allowed characteristics
    allowFlat: true,
    allowFloating: true,
    allowOrganic: false,
    allowIrregular: true,
    allowExtremeScale: false,

    // Bounds
    maxHeight: 256,
    maxWidth: 256,
    maxDepth: 16, // Typically thin

    // Quality checks to run
    qualityChecks: ['bounded', 'planar_thin', 'palette_diversity'],

    // Weight for quality scoring (lower = more lenient)
    qualityWeight: 0.5
  },

  statue: {
    id: 'statue',
    name: 'Statue / Sculpture',
    description: '3D figures, characters, and sculptures',

    requireRoof: false,
    requireWalls: false,
    requireDoor: false,
    requireFoundation: true, // Needs a base

    allowFlat: false,
    allowFloating: false,
    allowOrganic: true,
    allowIrregular: true,
    allowExtremeScale: false,

    maxHeight: 128,
    maxWidth: 64,
    maxDepth: 64,

    qualityChecks: ['bounded', 'has_base', 'structural_integrity', 'volume_density'],
    qualityWeight: 0.6
  },

  tree: {
    id: 'tree',
    name: 'Tree / Plant',
    description: 'Natural organic structures',

    requireRoof: false,
    requireWalls: false,
    requireDoor: false,
    requireFoundation: false,

    allowFlat: false,
    allowFloating: false,
    allowOrganic: true,
    allowIrregular: true,
    allowExtremeScale: false,

    maxHeight: 64,
    maxWidth: 32,
    maxDepth: 32,

    qualityChecks: ['has_trunk', 'has_canopy', 'organic_shape'],
    qualityWeight: 0.5
  },

  treehouse: {
    id: 'treehouse',
    name: 'Treehouse',
    description: 'Elevated structures built around/on trees',

    requireRoof: true,
    requireWalls: true,
    requireDoor: true,
    requireFoundation: false, // Tree trunk is foundation

    allowFlat: false,
    allowFloating: false,
    allowElevated: true,
    allowOrganic: true,
    allowIrregular: false,
    allowExtremeScale: false,

    maxHeight: 64,
    maxWidth: 32,
    maxDepth: 32,

    qualityChecks: ['has_trunk', 'enclosed_shell', 'has_access', 'has_platform'],
    qualityWeight: 0.7
  },

  house: {
    id: 'house',
    name: 'House / Building',
    description: 'Standard residential or commercial structures',

    requireRoof: true,
    requireWalls: true,
    requireDoor: true,
    requireFoundation: true,

    allowFlat: false,
    allowFloating: false,
    allowOrganic: false,
    allowIrregular: false,
    allowExtremeScale: false,

    maxHeight: 64,
    maxWidth: 64,
    maxDepth: 64,

    qualityChecks: ['enclosed_shell', 'roof_coverage', 'door_accessible', 'foundation_solid'],
    qualityWeight: 1.0
  },

  castle: {
    id: 'castle',
    name: 'Castle / Fortress',
    description: 'Large fortified structures with towers and walls',

    requireRoof: true, // Can be towers/battlements
    requireWalls: true,
    requireDoor: true,
    requireFoundation: true,

    allowFlat: false,
    allowFloating: false,
    allowOrganic: false,
    allowIrregular: false,
    allowExtremeScale: true,

    maxHeight: 128,
    maxWidth: 256,
    maxDepth: 256,

    qualityChecks: ['enclosed_shell', 'structural_integrity', 'has_towers', 'has_entrance'],
    qualityWeight: 0.9
  },

  landmark: {
    id: 'landmark',
    name: 'Landmark / Monument',
    description: 'Famous structures, replicas, monuments',

    requireRoof: false,
    requireWalls: false,
    requireDoor: false,
    requireFoundation: true,

    allowFlat: false,
    allowFloating: false,
    allowOrganic: false,
    allowIrregular: true,
    allowExtremeScale: true,

    maxHeight: 256,
    maxWidth: 256,
    maxDepth: 256,

    qualityChecks: ['bounded', 'structural_integrity', 'has_base'],
    qualityWeight: 0.7
  },

  infrastructure: {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Bridges, towers, roads, utilities',

    requireRoof: false,
    requireWalls: false,
    requireDoor: false,
    requireFoundation: true,

    allowFlat: false,
    allowFloating: false,
    allowOrganic: false,
    allowIrregular: false,
    allowExtremeScale: true,

    maxHeight: 256,  // Increased for tall towers like Eiffel Tower
    maxWidth: 512,
    maxDepth: 512,

    qualityChecks: ['bounded', 'connected', 'structural_integrity'],
    qualityWeight: 0.6
  },

  terrain: {
    id: 'terrain',
    name: 'Terrain / Landscape',
    description: 'Natural terrain features, landscaping',

    requireRoof: false,
    requireWalls: false,
    requireDoor: false,
    requireFoundation: false,

    allowFlat: true,
    allowFloating: false,
    allowOrganic: true,
    allowIrregular: true,
    allowExtremeScale: true,

    maxHeight: 128,
    maxWidth: 512,
    maxDepth: 512,

    qualityChecks: ['bounded', 'smooth_transitions', 'natural_variation'],
    qualityWeight: 0.4
  },

  generic: {
    id: 'generic',
    name: 'Generic Build',
    description: 'Default fallback profile',

    requireRoof: true,
    requireWalls: true,
    requireDoor: true,
    requireFoundation: true,

    allowFlat: false,
    allowFloating: false,
    allowOrganic: false,
    allowIrregular: false,
    allowExtremeScale: false,

    maxHeight: 64,
    maxWidth: 64,
    maxDepth: 64,

    qualityChecks: ['bounded', 'enclosed_shell'],
    qualityWeight: 1.0
  }
};

/**
 * Build type to profile mapping
 * Maps various build type strings to their validation profile
 */
const BUILD_TYPE_TO_PROFILE = {
  // Pixel art variants
  'pixel_art': 'pixel_art',
  'pixel art': 'pixel_art',
  'pixelart': 'pixel_art',
  'mosaic': 'pixel_art',
  'map_art': 'pixel_art',
  'map art': 'pixel_art',
  '2d_art': 'pixel_art',
  '2d art': 'pixel_art',

  // Statue variants
  'statue': 'statue',
  'sculpture': 'statue',
  'figure': 'statue',
  'character': 'statue',
  '3d_model': 'statue',
  '3d model': 'statue',

  // Tree variants
  'tree': 'tree',
  'plant': 'tree',
  'organic': 'tree',
  'nature': 'tree',

  // Treehouse
  'treehouse': 'treehouse',
  'tree_house': 'treehouse',
  'tree house': 'treehouse',

  // House variants
  'house': 'house',
  'home': 'house',
  'cabin': 'house',
  'cottage': 'house',
  'mansion': 'house',
  'building': 'house',
  'modern_home': 'house',
  'modern home': 'house',
  'residential': 'house',

  // Castle variants
  'castle': 'castle',
  'fortress': 'castle',
  'fort': 'castle',
  'palace': 'castle',
  'keep': 'castle',

  // Landmark variants
  'landmark': 'landmark',
  'monument': 'landmark',
  'replica': 'landmark',
  'famous': 'landmark',
  'eiffel': 'landmark',
  'eiffel_tower': 'landmark',
  'statue_of_liberty': 'landmark',
  'colosseum': 'landmark',
  'big_ben': 'landmark',
  'pyramids': 'landmark',
  'pyramid': 'landmark',
  'sphinx': 'landmark',
  'taj_mahal': 'landmark',
  'leaning_tower': 'landmark',

  // Infrastructure variants
  'infrastructure': 'infrastructure',
  'tower': 'infrastructure',
  'bridge': 'infrastructure',
  'road': 'infrastructure',
  'wall': 'infrastructure',
  'fence': 'infrastructure',
  'gate': 'infrastructure',

  // Terrain variants
  'terrain': 'terrain',
  'landscape': 'terrain',
  'mountain': 'terrain',
  'hill': 'terrain',
  'valley': 'terrain',
  'river': 'terrain'
};

/**
 * Get the validation profile for a build type
 * @param {string} buildType - The build type string
 * @returns {Object} The validation profile
 */
export function getValidationProfile(buildType) {
  if (!buildType) {
    return VALIDATION_PROFILES.generic;
  }

  const normalized = buildType.toLowerCase().trim().replace(/[_\s]+/g, '_');

  // Direct match
  if (VALIDATION_PROFILES[normalized]) {
    return VALIDATION_PROFILES[normalized];
  }

  // Mapped match
  const mappedProfile = BUILD_TYPE_TO_PROFILE[normalized];
  if (mappedProfile && VALIDATION_PROFILES[mappedProfile]) {
    return VALIDATION_PROFILES[mappedProfile];
  }

  // Partial match - check if buildType contains any known type
  for (const [key, profileId] of Object.entries(BUILD_TYPE_TO_PROFILE)) {
    if (normalized.includes(key.replace(/\s+/g, '_')) || key.replace(/\s+/g, '_').includes(normalized)) {
      return VALIDATION_PROFILES[profileId];
    }
  }

  // Default fallback
  return VALIDATION_PROFILES.generic;
}

/**
 * Detect build type from blueprint and intent
 * @param {Object} blueprint - The blueprint object
 * @param {Object} intent - Optional intent object with analysis
 * @returns {string} The detected build type
 */
export function detectBuildType(blueprint, intent = null) {
  // Check intent first (most reliable)
  if (intent?.buildType) {
    return intent.buildType;
  }

  // Check blueprint buildType field
  if (blueprint?.buildType) {
    return blueprint.buildType;
  }

  // Check design plan
  if (blueprint?.designPlan?.buildType) {
    return blueprint.designPlan.buildType;
  }

  // Check tags
  if (blueprint?.tags?.buildType) {
    const tag = Array.isArray(blueprint.tags.buildType)
      ? blueprint.tags.buildType[0]
      : blueprint.tags.buildType;
    return tag;
  }

  // Infer from operations
  if (blueprint?.steps) {
    const ops = blueprint.steps.map(s => s.op).join(' ');

    if (ops.includes('pixel_art') || ops.includes('three_d_layers')) {
      return 'pixel_art';
    }
    if (ops.includes('roof') && ops.includes('wall') && ops.includes('door')) {
      return 'house';
    }
  }

  return 'generic';
}

/**
 * Validate structural requirements based on profile
 * @param {Object} blueprint - The blueprint to validate
 * @param {Object} profile - The validation profile
 * @returns {Object} Validation result with score and issues
 */
export function validateStructuralRequirements(blueprint, profile) {
  const issues = [];
  const warnings = [];
  let score = 1.0;

  const steps = blueprint?.steps || [];
  const ops = steps.map(s => s.op?.toLowerCase() || '').join(' ');
  const blocks = steps.flatMap(s => [s.block, s.blocks].filter(Boolean)).join(' ').toLowerCase();

  // Check roof requirement
  if (profile.requireRoof) {
    const hasRoof = ops.includes('roof') ||
      ops.includes('pyramid') ||
      blocks.includes('stairs') ||
      blocks.includes('slab');

    if (!hasRoof) {
      warnings.push({
        code: 'MISSING_ROOF',
        message: 'No roof structure detected',
        severity: 'warning'
      });
      score *= 0.9;
    }
  }

  // Check walls requirement
  if (profile.requireWalls) {
    const hasWalls = ops.includes('wall') ||
      ops.includes('hollow_box') ||
      ops.includes('we_walls');

    if (!hasWalls && steps.length > 3) {
      warnings.push({
        code: 'MISSING_WALLS',
        message: 'No wall structure detected',
        severity: 'warning'
      });
      score *= 0.85;
    }
  }

  // Check door requirement
  if (profile.requireDoor) {
    const hasDoor = ops.includes('door') ||
      blocks.includes('door');

    if (!hasDoor) {
      warnings.push({
        code: 'MISSING_DOOR',
        message: 'No door detected',
        severity: 'warning'
      });
      score *= 0.95;
    }
  }

  // Check foundation requirement
  if (profile.requireFoundation) {
    const hasLowY = steps.some(step => {
      const y = step.from?.y || step.to?.y || step.pos?.y || step.base?.y;
      return y !== undefined && y <= 2;
    });

    if (!hasLowY && !profile.allowElevated) {
      warnings.push({
        code: 'MISSING_FOUNDATION',
        message: 'No foundation/base detected at ground level',
        severity: 'warning'
      });
      score *= 0.9;
    }
  }

  return {
    valid: issues.length === 0,
    score: Math.max(0, score),
    issues,
    warnings,
    profile: profile.id
  };
}

/**
 * Calculate quality score with profile-aware weighting
 * @param {Object} blueprint - The blueprint
 * @param {Object} profile - The validation profile
 * @param {Object} structuralResult - Result from structural validation
 * @returns {Object} Quality score result
 */
export function calculateQualityScore(blueprint, profile, structuralResult) {
  const baseScore = structuralResult?.score || 1.0;
  const weight = profile.qualityWeight || 1.0;

  // Apply profile weight (lenient profiles have lower weight)
  const weightedScore = 1.0 - ((1.0 - baseScore) * weight);

  // Calculate grade
  const grade = weightedScore >= 0.9 ? 'A'
    : weightedScore >= 0.8 ? 'B'
      : weightedScore >= 0.7 ? 'C'
        : weightedScore >= 0.5 ? 'D'
          : 'F';

  return {
    score: weightedScore,
    grade,
    rawScore: baseScore,
    weight,
    profile: profile.id,
    passed: weightedScore >= 0.5
  };
}

/**
 * Full profile-based validation
 * @param {Object} blueprint - The blueprint to validate
 * @param {Object} options - Validation options
 * @returns {Object} Complete validation result
 */
export function validateWithProfile(blueprint, options = {}) {
  const buildType = options.buildType || detectBuildType(blueprint, options.intent);
  const profile = getValidationProfile(buildType);

  // Structural validation
  const structuralResult = validateStructuralRequirements(blueprint, profile);

  // Quality score
  const qualityResult = calculateQualityScore(blueprint, profile, structuralResult);

  // Safety checks (always enforced regardless of profile)
  const safetyIssues = validateSafetyBounds(blueprint, profile);

  return {
    valid: structuralResult.valid && safetyIssues.length === 0,
    safetyPassed: safetyIssues.length === 0,
    profile: profile.id,
    profileName: profile.name,
    buildType,
    qualityScore: qualityResult.score,
    qualityGrade: qualityResult.grade,
    errors: safetyIssues,
    warnings: structuralResult.warnings,
    checksPerformed: profile.qualityChecks,
    structuralResult,
    qualityResult
  };
}

/**
 * Safety bounds validation (always enforced)
 * @param {Object} blueprint - The blueprint
 * @param {Object} profile - The validation profile
 * @returns {Array} Array of safety issues
 */
function validateSafetyBounds(blueprint, profile) {
  const issues = [];

  // Calculate bounds from steps
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  const steps = blueprint?.steps || [];

  for (const step of steps) {
    const positions = [
      step.from, step.to, step.pos, step.base,
      step.origin, step.center
    ].filter(Boolean);

    for (const pos of positions) {
      if (pos.x !== undefined) {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
      }
      if (pos.y !== undefined) {
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
      }
      if (pos.z !== undefined) {
        minZ = Math.min(minZ, pos.z);
        maxZ = Math.max(maxZ, pos.z);
      }
    }

    // Also check size fields
    if (step.size) {
      maxX = Math.max(maxX, minX + (step.size.x || step.size.width || 0));
      maxY = Math.max(maxY, minY + (step.size.y || step.size.height || 0));
      maxZ = Math.max(maxZ, minZ + (step.size.z || step.size.depth || 0));
    }
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const depth = maxZ - minZ + 1;

  // Check profile bounds
  if (height > profile.maxHeight) {
    issues.push({
      code: 'EXCEEDS_MAX_HEIGHT',
      message: `Build height ${height} exceeds profile maximum ${profile.maxHeight}`,
      severity: 'error',
      value: height,
      limit: profile.maxHeight
    });
  }

  if (profile.maxWidth && width > profile.maxWidth) {
    issues.push({
      code: 'EXCEEDS_MAX_WIDTH',
      message: `Build width ${width} exceeds profile maximum ${profile.maxWidth}`,
      severity: 'error',
      value: width,
      limit: profile.maxWidth
    });
  }

  if (profile.maxDepth && depth > profile.maxDepth) {
    issues.push({
      code: 'EXCEEDS_MAX_DEPTH',
      message: `Build depth ${depth} exceeds profile maximum ${profile.maxDepth}`,
      severity: 'error',
      value: depth,
      limit: profile.maxDepth
    });
  }

  // Check floating if not allowed
  if (!profile.allowFloating && minY > 10) {
    issues.push({
      code: 'FLOATING_STRUCTURE',
      message: `Build appears to be floating (minY=${minY}), but profile does not allow floating`,
      severity: 'warning'
    });
  }

  return issues;
}

export default {
  VALIDATION_PROFILES,
  getValidationProfile,
  detectBuildType,
  validateStructuralRequirements,
  calculateQualityScore,
  validateWithProfile
};

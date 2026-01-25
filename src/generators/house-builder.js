/**
 * Algorithmic House Builder
 * Generates simple house blueprints deterministically
 */

/**
 * Generate a house blueprint algorithmically
 * @param {Object} designPlan - Design plan with dimensions and features
 * @param {string[]} allowlist - Allowed blocks
 * @param {boolean} worldEditAvailable - Whether WorldEdit is available
 * @returns {Object} - Blueprint object
 */
export function generateHouse(designPlan, allowlist, worldEditAvailable = false) {
  const { width, height, depth } = designPlan.dimensions;
  const features = designPlan.features || [];
  const palette = deriveHousePalette(allowlist, designPlan.theme);
  const steps = [];

  // Validate minimum dimensions
  if (width < 5 || depth < 5 || height < 5) {
    throw new Error('House must be at least 5x5x5 blocks');
  }

  // Determine structure style
  const hasChimney = features.some(f => f.includes('chimney') || f.includes('fireplace'));
  const hasPorch = features.some(f => f.includes('porch'));
  const hasWindows = features.some(f => f.includes('window'));
  const hasDoor = features.some(f => f.includes('door') || f.includes('entrance'));
  const hasRoof = !features.some(f => f.includes('flat'));

  const wallHeight = Math.min(Math.floor(height * 0.6), 5);
  const roofHeight = Math.min(height - wallHeight - 1, Math.floor(wallHeight / 2));

  // 1. Foundation/Floor
  if (worldEditAvailable) {
    steps.push({
      op: 'we_fill',
      block: palette.floor,
      from: { x: 0, y: 0, z: 0 },
      to: { x: width - 1, y: 0, z: depth - 1 },
      fallback: {
        op: 'fill',
        block: palette.floor,
        from: { x: 0, y: 0, z: 0 },
        to: { x: width - 1, y: 0, z: depth - 1 }
      }
    });
  } else {
    steps.push({
      op: 'fill',
      block: palette.floor,
      from: { x: 0, y: 0, z: 0 },
      to: { x: width - 1, y: 0, z: depth - 1 }
    });
  }

  // 2. Corner pillars (structural detail)
  const corners = [
    { x: 0, y: 1, z: 0 },
    { x: width - 1, y: 1, z: 0 },
    { x: 0, y: 1, z: depth - 1 },
    { x: width - 1, y: 1, z: depth - 1 }
  ];

  corners.forEach(corner => {
    steps.push({
      op: 'fill',
      block: palette.frame,
      from: corner,
      to: { x: corner.x, y: wallHeight, z: corner.z }
    });
  });

  // 3. Walls
  const wallOp = worldEditAvailable ? 'we_walls' : 'hollow_box';
  const wallStep = {
    op: wallOp,
    block: palette.walls,
    from: { x: 0, y: 1, z: 0 },
    to: { x: width - 1, y: wallHeight, z: depth - 1 }
  };

  if (worldEditAvailable) {
    wallStep.fallback = {
      op: 'hollow_box',
      block: palette.walls,
      from: { x: 0, y: 1, z: 0 },
      to: { x: width - 1, y: wallHeight, z: depth - 1 }
    };
  }
  steps.push(wallStep);

  // 4. Door (front center)
  if (hasDoor) {
    const doorX = Math.floor(width / 2);
    const doorZ = 0;

    // Door frame
    steps.push({
      op: 'fill',
      block: palette.frame,
      from: { x: doorX - 1, y: 1, z: doorZ },
      to: { x: doorX + 1, y: 3, z: doorZ }
    });

    steps.push({
      op: 'fill',
      block: 'air',
      from: { x: doorX, y: 1, z: doorZ },
      to: { x: doorX, y: 2, z: doorZ }
    });

    steps.push({
      op: 'door',
      block: palette.door,
      pos: { x: doorX, y: 1, z: doorZ },
      facing: 'south'
    });
  }

  // 5. Windows
  if (hasWindows) {
    const windowY = 2;

    // Front wall windows
    if (width > 7) {
      steps.push({
        op: 'window_strip',
        block: palette.windows,
        from: { x: 2, y: windowY, z: 0 },
        to: { x: width - 3, y: windowY, z: 0 },
        spacing: 3
      });
    }

    // Back wall windows
    if (width > 7) {
      steps.push({
        op: 'window_strip',
        block: palette.windows,
        from: { x: 2, y: windowY, z: depth - 1 },
        to: { x: width - 3, y: windowY, z: depth - 1 },
        spacing: 3
      });
    }

    // Side wall windows
    if (depth > 7) {
      steps.push({
        op: 'window_strip',
        block: palette.windows,
        from: { x: 0, y: windowY, z: 2 },
        to: { x: 0, y: windowY, z: depth - 3 },
        spacing: 3
      });

      steps.push({
        op: 'window_strip',
        block: palette.windows,
        from: { x: width - 1, y: windowY, z: 2 },
        to: { x: width - 1, y: windowY, z: depth - 3 },
        spacing: 3
      });
    }
  }

  // 6. Roof
  if (hasRoof && roofHeight > 0) {
    steps.push({
      op: 'roof_gable',
      block: palette.roof,
      from: { x: -1, y: wallHeight + 1, z: -1 },
      to: { x: width, y: wallHeight + 1, z: depth },
      peakHeight: roofHeight
    });
  } else {
    // Flat roof
    steps.push({
      op: 'roof_flat',
      block: palette.roof,
      from: { x: -1, y: wallHeight + 1, z: -1 },
      to: { x: width, y: wallHeight + 1, z: depth }
    });
  }

  // 7. Chimney
  if (hasChimney) {
    const chimneyX = Math.floor(width * 0.75);
    const chimneyZ = Math.floor(depth * 0.5);
    const chimneyTop = wallHeight + roofHeight + 2;

    steps.push({
      op: 'fill',
      block: palette.chimney,
      from: { x: chimneyX, y: 0, z: chimneyZ },
      to: { x: chimneyX + 1, y: chimneyTop, z: chimneyZ + 1 }
    });

    // Chimney opening
    steps.push({
      op: 'fill',
      block: 'air',
      from: { x: chimneyX, y: chimneyTop - 1, z: chimneyZ },
      to: { x: chimneyX + 1, y: chimneyTop, z: chimneyZ + 1 }
    });
  }

  // 8. Porch
  if (hasPorch && width > 7 && depth > 7) {
    const porchDepth = 3;
    const porchWidth = Math.min(width - 4, 7);
    const porchX = Math.floor((width - porchWidth) / 2);
    const porchZ = -porchDepth;

    // Porch floor
    steps.push({
      op: 'fill',
      block: palette.floor,
      from: { x: porchX, y: 0, z: porchZ },
      to: { x: porchX + porchWidth, y: 0, z: 0 }
    });

    // Porch supports
    steps.push({
      op: 'fence_connect',
      block: palette.fence,
      from: { x: porchX, y: 1, z: porchZ },
      to: { x: porchX, y: 3, z: porchZ }
    });

    steps.push({
      op: 'fence_connect',
      block: palette.fence,
      from: { x: porchX + porchWidth, y: 1, z: porchZ },
      to: { x: porchX + porchWidth, y: 3, z: porchZ }
    });

    // Porch roof
    steps.push({
      op: 'fill',
      block: palette.roof,
      from: { x: porchX - 1, y: 4, z: porchZ - 1 },
      to: { x: porchX + porchWidth + 1, y: 4, z: 0 }
    });
  }

  // 9. Lighting (torches at entrance)
  const doorX = Math.floor(width / 2);
  steps.push({
    op: 'set',
    pos: { x: doorX - 1, y: 2, z: 0 },
    block: 'torch'
  });

  steps.push({
    op: 'set',
    pos: { x: doorX + 1, y: 2, z: 0 },
    block: 'torch'
  });

  return {
    size: { width, height, depth },
    palette: Object.values(palette).filter((v, i, a) => a.indexOf(v) === i),
    steps,
    buildType: 'house',
    generationMethod: 'algorithmic'
  };
}

/**
 * Derive appropriate palette from allowlist
 */
function deriveHousePalette(allowlist, theme) {
  let preferences;

  // Theme-based material selection
  if (theme === 'medieval') {
    preferences = {
      walls: ['oak_planks', 'spruce_planks', 'dark_oak_planks'],
      frame: ['oak_log', 'spruce_log', 'dark_oak_log'],
      roof: ['oak_stairs', 'spruce_stairs', 'brick_stairs'],
      floor: ['oak_planks', 'stone', 'cobblestone'],
      door: ['oak_door', 'spruce_door'],
      windows: ['glass_pane', 'glass'],
      chimney: ['stone_bricks', 'bricks', 'cobblestone'],
      fence: ['oak_fence', 'spruce_fence']
    };
  } else if (theme === 'modern') {
    preferences = {
      walls: ['white_concrete', 'light_gray_concrete', 'quartz_block'],
      frame: ['gray_concrete', 'stone_bricks'],
      roof: ['gray_concrete', 'dark_gray_concrete'],
      floor: ['smooth_stone', 'polished_andesite'],
      door: ['iron_door', 'dark_oak_door'],
      windows: ['glass', 'glass_pane'],
      chimney: ['stone_bricks', 'concrete'],
      fence: ['iron_bars', 'dark_oak_fence']
    };
  } else {
    // Default/traditional
    preferences = {
      walls: ['oak_planks', 'birch_planks', 'spruce_planks'],
      frame: ['oak_log', 'stone_bricks'],
      roof: ['oak_stairs', 'brick_stairs', 'stone_brick_stairs'],
      floor: ['oak_planks', 'stone'],
      door: ['oak_door', 'spruce_door', 'birch_door'],
      windows: ['glass_pane', 'glass'],
      chimney: ['bricks', 'stone_bricks', 'cobblestone'],
      fence: ['oak_fence', 'birch_fence']
    };
  }

  const palette = {};
  for (const [key, prefs] of Object.entries(preferences)) {
    palette[key] = findBlock(allowlist, prefs);
  }

  return palette;
}

/**
 * Find first matching block from preferences
 */
function findBlock(allowlist, preferences) {
  for (const pref of preferences) {
    if (allowlist.includes(pref)) {
      return pref;
    }
  }
  // Fallback
  if (preferences[0].includes('stairs')) {
    return allowlist.find(b => b.includes('stairs')) || allowlist[0] || 'oak_stairs';
  }
  if (preferences[0].includes('fence')) {
    return allowlist.find(b => b.includes('fence')) || allowlist[0] || 'oak_fence';
  }
  if (preferences[0].includes('door')) {
    return allowlist.find(b => b.includes('door')) || allowlist[0] || 'oak_door';
  }
  return allowlist[0] || 'oak_planks';
}

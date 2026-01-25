/**
 * Algorithmic Castle Builder
 * Generates castle blueprints deterministically without LLM
 */

import { SAFETY_LIMITS } from '../config/limits.js';

/**
 * Generate a castle blueprint algorithmically
 * @param {Object} designPlan - Design plan with dimensions and features
 * @param {string[]} allowlist - Allowed blocks
 * @param {boolean} worldEditAvailable - Whether WorldEdit is available
 * @returns {Object} - Blueprint object
 */
export function generateCastle(designPlan, allowlist, worldEditAvailable = false) {
  const { width, height, depth } = designPlan.dimensions;
  const palette = derivePalette(allowlist);
  const steps = [];

  // Validate minimum dimensions
  if (width < 15 || depth < 15) {
    throw new Error('Castle must be at least 15x15 blocks');
  }

  const wallThickness = 2;
  const towerRadius = Math.min(Math.floor(width * 0.15), 4);
  const wallHeight = Math.min(Math.floor(height * 0.6), 12);
  const towerHeight = Math.min(height, wallHeight + 8);
  const gateWidth = 4;

  // 1. Foundation
  if (worldEditAvailable) {
    steps.push({
      op: 'we_fill',
      block: palette.foundation,
      from: { x: 0, y: 0, z: 0 },
      to: { x: width - 1, y: 0, z: depth - 1 },
      fallback: {
        op: 'fill',
        block: palette.foundation,
        from: { x: 0, y: 0, z: 0 },
        to: { x: width - 1, y: 0, z: depth - 1 }
      }
    });
  } else {
    steps.push({
      op: 'fill',
      block: palette.foundation,
      from: { x: 0, y: 0, z: 0 },
      to: { x: width - 1, y: 0, z: depth - 1 }
    });
  }

  // 2. Outer walls (perimeter)
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

  // 3. Corner towers (4 towers)
  const corners = [
    { x: 0, z: 0 },
    { x: width - towerRadius * 2, z: 0 },
    { x: 0, z: depth - towerRadius * 2 },
    { x: width - towerRadius * 2, z: depth - towerRadius * 2 }
  ];

  corners.forEach((corner, idx) => {
    const centerX = corner.x + towerRadius;
    const centerZ = corner.z + towerRadius;

    if (worldEditAvailable) {
      steps.push({
        op: 'we_cylinder',
        block: palette.towers,
        base: { x: corner.x, y: 1, z: corner.z },
        radius: towerRadius,
        height: towerHeight - 1,
        hollow: true,
        fallback: {
          op: 'hollow_box',
          block: palette.towers,
          from: { x: corner.x, y: 1, z: corner.z },
          to: { x: corner.x + towerRadius * 2, y: towerHeight, z: corner.z + towerRadius * 2 }
        }
      });
    } else {
      steps.push({
        op: 'hollow_box',
        block: palette.towers,
        from: { x: corner.x, y: 1, z: corner.z },
        to: { x: corner.x + towerRadius * 2, y: towerHeight, z: corner.z + towerRadius * 2 }
      });
    }

    // Tower battlements
    for (let angle = 0; angle < 8; angle++) {
      const rad = (angle * Math.PI) / 4;
      const bx = centerX + Math.floor(towerRadius * Math.cos(rad));
      const bz = centerZ + Math.floor(towerRadius * Math.sin(rad));

      if (angle % 2 === 0) {
        steps.push({
          op: 'set',
          pos: { x: bx, y: towerHeight + 1, z: bz },
          block: palette.battlements
        });
      }
    }

    // Spiral staircase in one tower
    if (idx === 0 && towerHeight > 8) {
      steps.push({
        op: 'spiral_staircase',
        block: palette.stairs,
        base: { x: centerX, y: 1, z: centerZ },
        height: towerHeight - 2,
        radius: Math.max(1, towerRadius - 1)
      });
    }
  });

  // 4. Gatehouse (front center)
  const gateX = Math.floor(width / 2) - Math.floor(gateWidth / 2);
  const gateZ = 0;

  // Clear gate opening
  steps.push({
    op: 'fill',
    block: 'air',
    from: { x: gateX, y: 1, z: gateZ },
    to: { x: gateX + gateWidth - 1, y: 4, z: gateZ + wallThickness }
  });

  // Door
  steps.push({
    op: 'door',
    block: palette.door,
    pos: { x: gateX + 1, y: 1, z: gateZ },
    facing: 'south'
  });

  // Gatehouse structure above
  steps.push({
    op: 'fill',
    block: palette.gatehouse,
    from: { x: gateX - 1, y: 5, z: gateZ },
    to: { x: gateX + gateWidth, y: wallHeight + 2, z: gateZ + 4 }
  });

  // Gatehouse windows
  steps.push({
    op: 'window_strip',
    block: palette.windows,
    from: { x: gateX, y: 6, z: gateZ },
    to: { x: gateX + gateWidth - 1, y: 6, z: gateZ },
    spacing: 2
  });

  // 5. Central keep (inner building)
  const keepWidth = Math.floor(width * 0.4);
  const keepDepth = Math.floor(depth * 0.4);
  const keepX = Math.floor((width - keepWidth) / 2);
  const keepZ = Math.floor((depth - keepDepth) / 2);
  const keepHeight = Math.min(height - 2, wallHeight + 4);

  if (worldEditAvailable) {
    steps.push({
      op: 'we_walls',
      block: palette.keep,
      from: { x: keepX, y: 1, z: keepZ },
      to: { x: keepX + keepWidth, y: keepHeight, z: keepZ + keepDepth },
      fallback: {
        op: 'hollow_box',
        block: palette.keep,
        from: { x: keepX, y: 1, z: keepZ },
        to: { x: keepX + keepWidth, y: keepHeight, z: keepZ + keepDepth }
      }
    });
  } else {
    steps.push({
      op: 'hollow_box',
      block: palette.keep,
      from: { x: keepX, y: 1, z: keepZ },
      to: { x: keepX + keepWidth, y: keepHeight, z: keepZ + keepDepth }
    });
  }

  // Keep entrance
  steps.push({
    op: 'door',
    block: palette.door,
    pos: { x: Math.floor(width / 2), y: 1, z: keepZ },
    facing: 'south'
  });

  // Keep windows
  for (let side = 0; side < 4; side++) {
    const winY = 3;
    let winFrom, winTo;

    if (side === 0) { // Front
      winFrom = { x: keepX + 2, y: winY, z: keepZ };
      winTo = { x: keepX + keepWidth - 2, y: winY, z: keepZ };
    } else if (side === 1) { // Back
      winFrom = { x: keepX + 2, y: winY, z: keepZ + keepDepth };
      winTo = { x: keepX + keepWidth - 2, y: winY, z: keepZ + keepDepth };
    } else if (side === 2) { // Left
      winFrom = { x: keepX, y: winY, z: keepZ + 2 };
      winTo = { x: keepX, y: winY, z: keepZ + keepDepth - 2 };
    } else { // Right
      winFrom = { x: keepX + keepWidth, y: winY, z: keepZ + 2 };
      winTo = { x: keepX + keepWidth, y: winY, z: keepZ + keepDepth - 2 };
    }

    steps.push({
      op: 'window_strip',
      block: palette.windows,
      from: winFrom,
      to: winTo,
      spacing: 3
    });
  }

  // 6. Wall battlements (alternating blocks)
  const battlementY = wallHeight + 1;
  for (let x = 2; x < width - 2; x += 2) {
    steps.push({
      op: 'set',
      pos: { x, y: battlementY, z: 0 },
      block: palette.battlements
    });
    steps.push({
      op: 'set',
      pos: { x, y: battlementY, z: depth - 1 },
      block: palette.battlements
    });
  }

  for (let z = 2; z < depth - 2; z += 2) {
    steps.push({
      op: 'set',
      pos: { x: 0, y: battlementY, z },
      block: palette.battlements
    });
    steps.push({
      op: 'set',
      pos: { x: width - 1, y: battlementY, z },
      block: palette.battlements
    });
  }

  // 7. Courtyard floor (between walls and keep)
  steps.push({
    op: 'fill',
    block: palette.courtyard,
    from: { x: 3, y: 0, z: 3 },
    to: { x: width - 4, y: 0, z: keepZ - 2 }
  });

  // 8. Torches for lighting
  const torchPositions = [
    { x: gateX, y: 2, z: gateZ + 1 },
    { x: gateX + gateWidth, y: 2, z: gateZ + 1 },
    { x: Math.floor(width / 2), y: 2, z: keepZ + 1 }
  ];

  torchPositions.forEach(pos => {
    steps.push({
      op: 'set',
      pos,
      block: 'torch'
    });
  });

  return {
    size: { width, height, depth },
    palette: Object.values(palette).filter((v, i, a) => a.indexOf(v) === i),
    steps,
    buildType: 'castle',
    generationMethod: 'algorithmic'
  };
}

/**
 * Derive appropriate palette from allowlist
 */
function derivePalette(allowlist) {
  const palette = {
    foundation: findBlock(allowlist, ['stone_bricks', 'cobblestone', 'stone', 'andesite']),
    walls: findBlock(allowlist, ['stone_bricks', 'cobblestone', 'stone']),
    towers: findBlock(allowlist, ['dark_oak_planks', 'spruce_planks', 'stone_bricks', 'cobblestone']),
    keep: findBlock(allowlist, ['stone_bricks', 'bricks', 'cobblestone']),
    battlements: findBlock(allowlist, ['stone', 'cobblestone', 'stone_bricks']),
    gatehouse: findBlock(allowlist, ['oak_planks', 'spruce_planks', 'dark_oak_planks']),
    windows: findBlock(allowlist, ['glass', 'glass_pane', 'air']),
    door: findBlock(allowlist, ['oak_door', 'spruce_door', 'iron_door', 'dark_oak_door']),
    stairs: findBlock(allowlist, ['stone_stairs', 'cobblestone_stairs', 'stone_brick_stairs']),
    courtyard: findBlock(allowlist, ['cobblestone', 'stone', 'gravel'])
  };

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
  // Fallback to first stone-like block in allowlist
  const stoneLike = allowlist.find(b =>
    b.includes('stone') || b.includes('brick') || b.includes('cobble')
  );
  return stoneLike || allowlist[0] || 'stone';
}

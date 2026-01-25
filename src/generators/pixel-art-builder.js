/**
 * Algorithmic Pixel Art Builder
 * Generates simple pixel art patterns deterministically
 */

/**
 * Generate pixel art blueprint algorithmically
 * @param {Object} designPlan - Design plan with dimensions and description
 * @param {string[]} allowlist - Allowed blocks
 * @returns {Object} - Blueprint object
 */
export function generatePixelArt(designPlan, allowlist) {
  const { width, height } = designPlan.dimensions;
  const description = designPlan.description?.toLowerCase() || '';

  // Validate dimensions
  if (width < 3 || height < 3 || width > 64 || height > 64) {
    throw new Error('Pixel art must be between 3x3 and 64x64');
  }

  const palette = derivePixelArtPalette(allowlist, description);
  let grid;

  // Match patterns
  if (description.includes('heart')) {
    grid = generateHeart(width, height, palette);
  } else if (description.includes('smiley') || description.includes('face')) {
    grid = generateSmiley(width, height, palette);
  } else if (description.includes('creeper')) {
    grid = generateCreeper(width, height, palette);
  } else if (description.includes('sword')) {
    grid = generateSword(width, height, palette);
  } else if (description.includes('star')) {
    grid = generateStar(width, height, palette);
  } else if (description.includes('arrow')) {
    grid = generateArrow(width, height, palette);
  } else if (description.includes('cross') || description.includes('plus')) {
    grid = generateCross(width, height, palette);
  } else if (description.includes('checkerboard')) {
    grid = generateCheckerboard(width, height, palette);
  } else {
    // Default: centered square with border
    grid = generateDefault(width, height, palette);
  }

  return {
    size: { width, height, depth: 1 },
    palette: Object.values(palette).filter((v, i, a) => v && a.indexOf(v) === i),
    steps: [{
      op: 'pixel_art',
      base: { x: 0, y: 0, z: 0 },
      facing: 'south',
      grid
    }],
    buildType: 'pixel_art',
    generationMethod: 'algorithmic'
  };
}

/**
 * Generate heart pattern
 */
function generateHeart(width, height, palette) {
  const grid = createEmptyGrid(width, height);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const size = Math.min(width, height);
  const color = palette.primary;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Normalize coordinates to -1 to 1 range
      const nx = (x - centerX) / (size / 2);
      const ny = (centerY - y) / (size / 2);

      // Heart equation: (x^2 + y^2 - 1)^3 - x^2 * y^3 < 0
      const heart = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);

      if (heart < 0.1) {
        grid[y][x] = color;
      }
    }
  }

  return grid;
}

/**
 * Generate smiley face
 */
function generateSmiley(width, height, palette) {
  const grid = createEmptyGrid(width, height);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const radius = Math.min(width, height) / 2 - 1;

  // Circle outline
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Face circle
      if (Math.abs(dist - radius) < 1.5) {
        grid[y][x] = palette.outline;
      } else if (dist < radius) {
        grid[y][x] = palette.primary;
      }
    }
  }

  // Eyes
  const eyeY = centerY - Math.floor(radius / 3);
  const eyeSpacing = Math.floor(radius / 2);
  grid[eyeY][centerX - eyeSpacing] = palette.detail;
  grid[eyeY][centerX + eyeSpacing] = palette.detail;

  // Smile
  const smileY = centerY + Math.floor(radius / 3);
  for (let x = centerX - eyeSpacing; x <= centerX + eyeSpacing; x++) {
    const dx = x - centerX;
    const curve = Math.floor(Math.abs(dx) / 3);
    if (smileY + curve < height) {
      grid[smileY + curve][x] = palette.detail;
    }
  }

  return grid;
}

/**
 * Generate Minecraft creeper face
 */
function generateCreeper(width, height, palette) {
  const grid = createEmptyGrid(width, height);
  const size = Math.min(width, height);

  // Use fixed 8x8 pattern, scaled to fit
  const pattern = [
    [0,0,1,1,1,1,0,0],
    [0,0,1,1,1,1,0,0],
    [0,0,2,2,2,2,0,0],
    [0,0,2,2,2,2,0,0],
    [0,0,2,1,1,2,0,0],
    [0,0,2,2,2,2,0,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0]
  ];

  for (let y = 0; y < height && y < pattern.length; y++) {
    for (let x = 0; x < width && x < pattern[0].length; x++) {
      if (pattern[y][x] === 1) {
        grid[y][x] = palette.primary;
      } else if (pattern[y][x] === 2) {
        grid[y][x] = palette.detail;
      }
    }
  }

  return grid;
}

/**
 * Generate sword
 */
function generateSword(width, height, palette) {
  const grid = createEmptyGrid(width, height);
  const centerX = Math.floor(width / 2);

  // Blade
  for (let y = 0; y < Math.floor(height * 0.6); y++) {
    grid[y][centerX] = palette.primary;
    if (centerX > 0) grid[y][centerX - 1] = palette.outline;
    if (centerX < width - 1) grid[y][centerX + 1] = palette.outline;
  }

  // Guard
  const guardY = Math.floor(height * 0.6);
  for (let x = Math.max(0, centerX - 3); x < Math.min(width, centerX + 4); x++) {
    grid[guardY][x] = palette.detail;
  }

  // Handle
  for (let y = guardY + 1; y < Math.min(height, guardY + Math.floor(height * 0.3)); y++) {
    grid[y][centerX] = palette.accent;
  }

  return grid;
}

/**
 * Generate star
 */
function generateStar(width, height, palette) {
  const grid = createEmptyGrid(width, height);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const size = Math.min(width, height) / 2;

  // 5-pointed star
  const points = 5;
  for (let i = 0; i < points; i++) {
    const angle1 = (i * 2 * Math.PI) / points - Math.PI / 2;
    const angle2 = ((i + 0.5) * 2 * Math.PI) / points - Math.PI / 2;

    const x1 = centerX + Math.floor(size * Math.cos(angle1));
    const y1 = centerY + Math.floor(size * Math.sin(angle1));
    const x2 = centerX + Math.floor((size / 2.5) * Math.cos(angle2));
    const y2 = centerY + Math.floor((size / 2.5) * Math.sin(angle2));

    drawLine(grid, centerX, centerY, x1, y1, palette.primary);
    drawLine(grid, centerX, centerY, x2, y2, palette.primary);
  }

  return grid;
}

/**
 * Generate arrow
 */
function generateArrow(width, height, palette) {
  const grid = createEmptyGrid(width, height);
  const centerY = Math.floor(height / 2);

  // Arrow shaft
  for (let x = 0; x < width - Math.floor(width / 3); x++) {
    grid[centerY][x] = palette.primary;
  }

  // Arrowhead
  const headX = width - Math.floor(width / 3);
  const headSize = Math.floor(height / 3);
  for (let i = 0; i < headSize; i++) {
    if (centerY - i >= 0 && headX + i < width) {
      grid[centerY - i][headX + i] = palette.detail;
    }
    if (centerY + i < height && headX + i < width) {
      grid[centerY + i][headX + i] = palette.detail;
    }
  }

  return grid;
}

/**
 * Generate cross/plus
 */
function generateCross(width, height, palette) {
  const grid = createEmptyGrid(width, height);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const thickness = Math.max(1, Math.floor(Math.min(width, height) / 8));

  // Vertical bar
  for (let y = 0; y < height; y++) {
    for (let dx = -thickness; dx <= thickness; dx++) {
      if (centerX + dx >= 0 && centerX + dx < width) {
        grid[y][centerX + dx] = palette.primary;
      }
    }
  }

  // Horizontal bar
  for (let x = 0; x < width; x++) {
    for (let dy = -thickness; dy <= thickness; dy++) {
      if (centerY + dy >= 0 && centerY + dy < height) {
        grid[centerY + dy][x] = palette.primary;
      }
    }
  }

  return grid;
}

/**
 * Generate checkerboard
 */
function generateCheckerboard(width, height, palette) {
  const grid = createEmptyGrid(width, height);
  const tileSize = Math.max(1, Math.floor(Math.min(width, height) / 8));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);
      grid[y][x] = (tileX + tileY) % 2 === 0 ? palette.primary : palette.secondary;
    }
  }

  return grid;
}

/**
 * Generate default pattern (bordered square)
 */
function generateDefault(width, height, palette) {
  const grid = createEmptyGrid(width, height);
  const borderSize = Math.max(1, Math.floor(Math.min(width, height) / 10));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < borderSize || x >= width - borderSize ||
          y < borderSize || y >= height - borderSize) {
        grid[y][x] = palette.outline;
      } else {
        grid[y][x] = palette.primary;
      }
    }
  }

  return grid;
}

/**
 * Create empty grid filled with air
 */
function createEmptyGrid(width, height) {
  return Array(height).fill(null).map(() => Array(width).fill(''));
}

/**
 * Draw line using Bresenham's algorithm
 */
function drawLine(grid, x0, y0, x1, y1, color) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      grid[y][x] = color;
    }

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Derive appropriate color palette from allowlist
 */
function derivePixelArtPalette(allowlist, description) {
  const palette = {};

  // Determine primary color based on description
  if (description.includes('red') || description.includes('heart')) {
    palette.primary = findBlock(allowlist, ['red_wool', 'red_concrete', 'red_terracotta']);
    palette.detail = findBlock(allowlist, ['pink_wool', 'pink_concrete']);
  } else if (description.includes('blue')) {
    palette.primary = findBlock(allowlist, ['blue_wool', 'blue_concrete', 'lapis_block']);
    palette.detail = findBlock(allowlist, ['light_blue_wool', 'light_blue_concrete']);
  } else if (description.includes('green') || description.includes('creeper')) {
    palette.primary = findBlock(allowlist, ['lime_wool', 'lime_concrete', 'green_wool']);
    palette.detail = findBlock(allowlist, ['black_wool', 'black_concrete']);
  } else if (description.includes('yellow')) {
    palette.primary = findBlock(allowlist, ['yellow_wool', 'yellow_concrete', 'gold_block']);
    palette.detail = findBlock(allowlist, ['orange_wool', 'orange_concrete']);
  } else {
    palette.primary = findBlock(allowlist, ['white_wool', 'white_concrete', 'quartz_block']);
    palette.detail = findBlock(allowlist, ['black_wool', 'black_concrete', 'coal_block']);
  }

  palette.outline = findBlock(allowlist, ['black_wool', 'black_concrete', 'coal_block']);
  palette.secondary = findBlock(allowlist, ['gray_wool', 'gray_concrete', 'stone']);
  palette.accent = findBlock(allowlist, ['brown_wool', 'brown_concrete', 'oak_planks']);

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
  // Fallback to first wool or concrete in allowlist
  const colorBlock = allowlist.find(b => b.includes('wool') || b.includes('concrete'));
  return colorBlock || allowlist[0] || 'white_wool';
}

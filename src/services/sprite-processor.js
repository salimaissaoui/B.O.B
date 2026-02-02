/**
 * Deterministic Sprite Processor
 *
 * Converts images to Minecraft pixel art grids using algorithmic color matching.
 * NO AI guessing - pure math-based RGB to block mapping.
 *
 * Features:
 * - Extended palette with wool, concrete, terracotta, and special blocks
 * - LAB color space for perceptually accurate matching
 * - Dithering option for gradients
 */

// Minecraft wool colors with their RGB values
const WOOL_COLORS = {
  'white_wool': [233, 236, 236],
  'orange_wool': [234, 126, 53],
  'magenta_wool': [189, 68, 179],
  'light_blue_wool': [58, 175, 217],
  'yellow_wool': [248, 198, 39],
  'lime_wool': [112, 185, 25],
  'pink_wool': [237, 141, 172],
  'gray_wool': [62, 68, 71],
  'light_gray_wool': [142, 142, 134],
  'cyan_wool': [21, 137, 145],
  'purple_wool': [121, 42, 172],
  'blue_wool': [53, 57, 157],
  'brown_wool': [114, 71, 40],
  'green_wool': [84, 109, 27],
  'red_wool': [160, 39, 34],
  'black_wool': [20, 21, 25]
};

// Concrete colors for more saturated options
const CONCRETE_COLORS = {
  'white_concrete': [207, 213, 214],
  'orange_concrete': [224, 97, 0],
  'magenta_concrete': [169, 48, 159],
  'light_blue_concrete': [35, 137, 198],
  'yellow_concrete': [241, 175, 21],
  'lime_concrete': [94, 169, 24],
  'pink_concrete': [214, 101, 143],
  'gray_concrete': [54, 57, 61],
  'light_gray_concrete': [125, 125, 115],
  'cyan_concrete': [21, 119, 136],
  'purple_concrete': [100, 31, 156],
  'blue_concrete': [44, 46, 143],
  'brown_concrete': [96, 59, 31],
  'green_concrete': [73, 91, 36],
  'red_concrete': [142, 32, 32],
  'black_concrete': [8, 10, 15]
};

// Terracotta for earthier tones
const TERRACOTTA_COLORS = {
  'terracotta': [152, 94, 67],
  'white_terracotta': [209, 178, 161],
  'orange_terracotta': [161, 83, 37],
  'magenta_terracotta': [149, 88, 108],
  'light_blue_terracotta': [113, 108, 137],
  'yellow_terracotta': [186, 133, 35],
  'lime_terracotta': [103, 117, 52],
  'pink_terracotta': [161, 78, 78],
  'gray_terracotta': [57, 42, 35],
  'light_gray_terracotta': [135, 106, 97],
  'cyan_terracotta': [86, 91, 91],
  'purple_terracotta': [118, 70, 86],
  'blue_terracotta': [74, 59, 91],
  'brown_terracotta': [77, 51, 35],
  'green_terracotta': [76, 83, 42],
  'red_terracotta': [143, 61, 46],
  'black_terracotta': [37, 22, 16]
};

// Special blocks for unique colors
const SPECIAL_BLOCKS = {
  'gold_block': [246, 208, 61],
  'iron_block': [220, 220, 220],
  'diamond_block': [98, 237, 228],
  'emerald_block': [81, 217, 117],
  'lapis_block': [31, 67, 140],
  'redstone_block': [170, 26, 10],
  'coal_block': [16, 15, 15],
  'netherite_block': [66, 61, 63],
  'copper_block': [192, 107, 79],
  'amethyst_block': [133, 97, 191],
  'prismarine': [99, 156, 151],
  'dark_prismarine': [51, 91, 75],
  'sea_lantern': [172, 199, 190],
  'glowstone': [171, 131, 85],
  'shroomlight': [240, 146, 70],
  'bone_block': [229, 225, 207],
  'quartz_block': [236, 233, 226],
  'obsidian': [15, 10, 24],
  'crying_obsidian': [32, 10, 60],
  'purpur_block': [169, 125, 169],
  'end_stone': [219, 222, 158],
  'sandstone': [216, 203, 155],
  'red_sandstone': [186, 99, 29],
  'nether_bricks': [44, 21, 26],
  'red_nether_bricks': [69, 7, 9],
  'packed_ice': [141, 180, 224],
  'blue_ice': [116, 167, 253],
  'snow_block': [249, 254, 254],
  'hay_block': [166, 139, 12],
  'melon': [111, 145, 30],
  'pumpkin': [198, 118, 24],
  'jack_o_lantern': [213, 139, 42]
};

// Combined full palette
const FULL_PALETTE = {
  ...WOOL_COLORS,
  ...CONCRETE_COLORS,
  ...TERRACOTTA_COLORS,
  ...SPECIAL_BLOCKS
};

// Minimal palette (wool + concrete only - original behavior)
const BASIC_PALETTE = { ...WOOL_COLORS, ...CONCRETE_COLORS };

/**
 * VIBRANT PALETTE - Best blocks for pixel art
 * Prioritizes CONCRETE over wool, excludes ugly/dull blocks
 * This is the DEFAULT for pixel art
 *
 * NOTE: gold_block removed - it was matching bright yellow pixels
 * and creating weird metallic-looking spots. yellow_concrete is better.
 */
const VIBRANT_PALETTE = {
  // CONCRETE FIRST (smooth, vibrant) - preferred for main colors
  ...CONCRETE_COLORS,

  // Add some terracotta for skin tones and shading only
  'orange_terracotta': [161, 83, 37],  // Skin tone
  'brown_terracotta': [77, 51, 35],    // Dark brown
  'white_terracotta': [209, 178, 161], // Light skin

  // Exclude: gold_block (matches yellow pixels incorrectly),
  // end_stone, sandstone, redstone_block, wool, etc.
};

/**
 * Convert RGB to LAB color space for perceptually accurate comparison
 * Uses D65 illuminant
 */
function rgbToLab(r, g, b) {
  // Normalize RGB to 0-1
  let rn = r / 255;
  let gn = g / 255;
  let bn = b / 255;

  // Convert to linear RGB
  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

  // Convert to XYZ (D65 illuminant)
  let x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047;
  let y = (rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750);
  let z = (rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041) / 1.08883;

  // Convert to LAB
  x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

  return [
    (116 * y) - 16,  // L
    500 * (x - y),   // a
    200 * (y - z)    // b
  ];
}

/**
 * Calculate Delta E (CIE76) color difference in LAB space
 * Lower values = more similar colors
 */
function deltaE(lab1, lab2) {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Calculate simple Euclidean distance in RGB space (fallback)
 */
function colorDistanceRGB(rgb1, rgb2) {
  const dr = rgb1[0] - rgb2[0];
  const dg = rgb1[1] - rgb2[1];
  const db = rgb1[2] - rgb2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Pre-compute LAB values for all palette blocks (optimization)
const PALETTE_LAB_CACHE = {};
function getPaletteLab(blockName, rgb) {
  if (!PALETTE_LAB_CACHE[blockName]) {
    PALETTE_LAB_CACHE[blockName] = rgbToLab(rgb[0], rgb[1], rgb[2]);
  }
  return PALETTE_LAB_CACHE[blockName];
}

/**
 * Find the closest Minecraft block for a given RGB color
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @param {Object} options - Matching options
 * @param {string} options.palette - 'vibrant' (default), 'full', 'basic', or 'wool'
 * @param {boolean} options.useLab - Use LAB color space (default: true)
 * @returns {string} - Block name
 */
function findClosestBlock(r, g, b, options = {}) {
  const { palette = 'vibrant', useLab = true } = options;

  // Select palette
  let paletteMap;
  switch (palette) {
    case 'wool':
      paletteMap = WOOL_COLORS;
      break;
    case 'basic':
      paletteMap = BASIC_PALETTE;
      break;
    case 'full':
      paletteMap = FULL_PALETTE;
      break;
    case 'vibrant':
    default:
      paletteMap = VIBRANT_PALETTE;
      break;
  }

  let closestBlock = 'white_concrete';
  let minDistance = Infinity;

  if (useLab) {
    const targetLab = rgbToLab(r, g, b);

    for (const [blockName, blockRGB] of Object.entries(paletteMap)) {
      const blockLab = getPaletteLab(blockName, blockRGB);
      const distance = deltaE(targetLab, blockLab);

      if (distance < minDistance) {
        minDistance = distance;
        closestBlock = blockName;
      }
    }
  } else {
    // RGB fallback
    const targetRGB = [r, g, b];

    for (const [blockName, blockRGB] of Object.entries(paletteMap)) {
      const distance = colorDistanceRGB(targetRGB, blockRGB);

      if (distance < minDistance) {
        minDistance = distance;
        closestBlock = blockName;
      }
    }
  }

  return closestBlock;
}

/**
 * Check if a color is actually transparent or background
 * More conservative to avoid treating white-colored subjects (Lugia, etc.) as background
 */
function isTransparent(r, g, b, a) {
  // Only alpha channel is reliable for transparency
  if (a !== undefined && a < 128) return true;

  // Only treat pure white (255,255,255) as background if combined with semi-transparency
  // This prevents white Pokemon like Lugia from being rendered as invisible
  if (r === 255 && g === 255 && b === 255 && (a === undefined || a < 200)) return true;

  return false;
}

/**
 * Process image buffer to pixel art grid
 * @param {Buffer} imageBuffer - Raw image data
 * @param {number} targetWidth - Target width in blocks
 * @param {number} targetHeight - Target height in blocks
 * @param {Object} options - Processing options
 * @param {string} options.palette - 'vibrant' (default), 'full', 'basic', or 'wool'
 * @param {boolean} options.useLab - Use LAB color space matching
 * @returns {Object} Grid and legend
 */
export async function imageToGrid(imageBuffer, targetWidth = 64, targetHeight = 64, options = {}) {
  const { palette = 'vibrant', useLab = true } = options;

  // Dynamic import of sharp (only when needed)
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch (e) {
    console.error('Sharp not installed. Run: npm install sharp');
    throw new Error('Image processing requires sharp package');
  }

  // Process image
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  console.log(`  Original image: ${metadata.width}x${metadata.height}`);

  // Resize to target dimensions using nearest-neighbor for pixel art
  const resized = await image
    .resize(targetWidth, targetHeight, {
      kernel: 'nearest',  // Preserves sharp pixel edges
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  const channels = info.channels;

  console.log(`  Resized to: ${info.width}x${info.height} (${channels} channels)`);
  console.log(`  Using palette: ${palette}, LAB matching: ${useLab}`);

  // Build grid and collect unique blocks for legend
  const grid = [];
  const blockSet = new Set();
  const charMap = {};
  let charIndex = 0;

  // Extended character set for larger palettes
  const chars = '.#OYBRGPCMLWSATUKI0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHJNQUVXZ';

  // Pre-assign common mappings
  charMap['air'] = '.';
  charMap['black_wool'] = '#';
  charMap['black_concrete'] = '#';

  for (let y = 0; y < info.height; y++) {
    let row = '';

    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = channels === 4 ? data[idx + 3] : 255;

      let block;
      if (isTransparent(r, g, b, a)) {
        block = 'air';
      } else {
        block = findClosestBlock(r, g, b, { palette, useLab });
      }

      blockSet.add(block);

      // Assign character if not already assigned
      if (!charMap[block]) {
        // Use meaningful first letter if available
        const firstChar = block.charAt(0).toUpperCase();
        if (!Object.values(charMap).includes(firstChar) && chars.includes(firstChar)) {
          charMap[block] = firstChar;
        } else {
          // Find next available character
          while (charIndex < chars.length && Object.values(charMap).includes(chars[charIndex])) {
            charIndex++;
          }
          if (charIndex < chars.length) {
            charMap[block] = chars[charIndex];
            charIndex++;
          } else {
            // Fallback: use block name
            charMap[block] = block.substring(0, 1);
          }
        }
      }

      row += charMap[block];
    }

    grid.push(row);
  }

  // Build legend (reverse of charMap)
  const legend = {};
  for (const [block, char] of Object.entries(charMap)) {
    legend[char] = block;
  }

  console.log(`  Unique colors: ${blockSet.size}`);
  console.log(`  Grid size: ${grid[0].length}x${grid.length}`);

  return {
    grid,
    legend,
    width: info.width,
    height: info.height,
    uniqueBlocks: Array.from(blockSet)
  };
}

/**
 * Download and process image from URL
 */
export async function processImageUrl(url, targetWidth = 64, targetHeight = 64, options = {}) {
  console.log(`  Downloading image from URL...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return imageToGrid(buffer, targetWidth, targetHeight, options);
}

export {
  WOOL_COLORS,
  CONCRETE_COLORS,
  TERRACOTTA_COLORS,
  SPECIAL_BLOCKS,
  FULL_PALETTE,
  BASIC_PALETTE,
  VIBRANT_PALETTE,
  findClosestBlock,
  rgbToLab,
  deltaE
};

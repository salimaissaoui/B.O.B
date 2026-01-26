/**
 * Deterministic Sprite Processor
 * 
 * Converts images to Minecraft pixel art grids using algorithmic color matching.
 * NO AI guessing - pure math-based RGB to block mapping.
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

// Extended palette with concrete for better color matching
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

// Combined palette
const BLOCK_COLORS = { ...WOOL_COLORS, ...CONCRETE_COLORS };

/**
 * Calculate color distance (Euclidean in RGB space)
 */
function colorDistance(rgb1, rgb2) {
    const dr = rgb1[0] - rgb2[0];
    const dg = rgb1[1] - rgb2[1];
    const db = rgb1[2] - rgb2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Find the closest Minecraft block for a given RGB color
 */
function findClosestBlock(r, g, b, useWoolOnly = true) {
    const palette = useWoolOnly ? WOOL_COLORS : BLOCK_COLORS;
    const targetRGB = [r, g, b];

    let closestBlock = 'white_wool';
    let minDistance = Infinity;

    for (const [blockName, blockRGB] of Object.entries(palette)) {
        const distance = colorDistance(targetRGB, blockRGB);
        if (distance < minDistance) {
            minDistance = distance;
            closestBlock = blockName;
        }
    }

    return closestBlock;
}

/**
 * Check if a color is mostly transparent or background
 */
function isTransparent(r, g, b, a, bgThreshold = 240) {
    // Check alpha channel
    if (a !== undefined && a < 128) return true;

    // Check if it's a light gray background (common in sprite sheets)
    if (r > bgThreshold && g > bgThreshold && b > bgThreshold) return true;

    return false;
}

/**
 * Process image buffer to pixel art grid
 * @param {Buffer} imageBuffer - Raw image data
 * @param {number} targetWidth - Target width in blocks
 * @param {number} targetHeight - Target height in blocks  
 * @returns {Object} Grid and legend
 */
export async function imageToGrid(imageBuffer, targetWidth = 64, targetHeight = 64) {
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

    // Build grid and collect unique blocks for legend
    const grid = [];
    const blockSet = new Set();
    const charMap = {};
    let charIndex = 0;
    const chars = '.#OYBRGPCMLWSATUK0123456789abcdefghijklmnopqrstuvwxyz';

    // Pre-assign common mappings
    charMap['air'] = '.';
    charMap['black_wool'] = '#';

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
                block = findClosestBlock(r, g, b);
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
                    while (Object.values(charMap).includes(chars[charIndex])) {
                        charIndex++;
                    }
                    charMap[block] = chars[charIndex];
                    charIndex++;
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
export async function processImageUrl(url, targetWidth = 64, targetHeight = 64) {
    console.log(`  Downloading image from URL...`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return imageToGrid(buffer, targetWidth, targetHeight);
}

export { WOOL_COLORS, BLOCK_COLORS, findClosestBlock };

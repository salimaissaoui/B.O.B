/**
 * Pixel Art operation - Creates 2D pixel art from a grid
 * @param {Object} step - Step configuration
 * @param {Object} step.base - Base corner position {x, y, z}
 * @param {string} step.facing - Direction the art faces: 'north', 'south', 'east', 'west' (default: 'south')
 * @param {string[][]} step.grid - 2D array of block names (row 0 is TOP of the art)
 *                                 Use 'air' or '' for empty/transparent pixels
 * @returns {Array} - List of block placements {x, y, z, block}
 * 
 * Grid format example (5x5 smiley face):
 * [
 *   ["", "yellow_wool", "yellow_wool", "yellow_wool", ""],
 *   ["yellow_wool", "black_wool", "yellow_wool", "black_wool", "yellow_wool"],
 *   ["yellow_wool", "yellow_wool", "yellow_wool", "yellow_wool", "yellow_wool"],
 *   ["yellow_wool", "black_wool", "yellow_wool", "black_wool", "yellow_wool"],
 *   ["", "yellow_wool", "black_wool", "yellow_wool", ""]
 * ]
 * 
 * The grid is rendered with:
 * - Row 0 at the TOP (highest Y)
 * - Column 0 at the LEFT (from viewer's perspective)
 */
export function pixelArt(step) {
  const { base, grid, legend, facing = 'south' } = step;

  if (!base || !grid || !Array.isArray(grid)) {
    throw new Error('Pixel art requires base position and grid array');
  }

  if (grid.length === 0) {
    throw new Error('Pixel art grid cannot be empty');
  }

  const blocks = [];
  const height = grid.length;
  // Handle both array-of-strings and array-of-arrays
  const firstRow = grid[0];
  // FIX: Normalize grid width (auto-pad rows)
  let maxW = 0;
  for (let i = 0; i < grid.length; i++) {
    const len = typeof grid[i] === 'string' ? grid[i].length : grid[i].length;
    maxW = Math.max(maxW, len);
  }

  // Auto-pad rows to maxW
  const isStringGrid = typeof firstRow === 'string';
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];
    const len = isStringGrid ? row.length : row.length;

    if (len < maxW) {
      const padding = maxW - len;
      // Center-align short rows to prevent skewed/lopsided pixel art
      // Original bug: Short rows were left-aligned, causing diagonal skew
      // Fix: Add equal padding to both sides (center alignment)
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;

      if (isStringGrid) {
        grid[i] = '.'.repeat(leftPad) + row + '.'.repeat(rightPad);
      } else {
        // Array format
        for (let k = 0; k < leftPad; k++) grid[i].unshift('air');
        for (let k = 0; k < rightPad; k++) grid[i].push('air');
      }
      console.log(`    Autofixed row ${i}: centered with ${leftPad}L/${rightPad}R padding`);
    } else if (len > maxW) {
      // Should not happen given logic above, but safety check
      if (isStringGrid) {
        grid[i] = row.substring(0, maxW);
      } else {
        grid[i] = grid[i].slice(0, maxW);
      }
    }
  }

  const width = maxW; // Update width to normalized value

  // VALIDATION: Check all rows have consistent width (should pass now)
  for (let i = 0; i < grid.length; i++) {
    const rowLen = typeof grid[i] === 'string' ? grid[i].length : grid[i].length;
    if (rowLen !== width) {
      console.warn(`⚠ Pixel art row ${i} has inconsistent width: ${rowLen} vs expected ${width}`);
    }
  }

  // VALIDATION: If using compressed format (strings), legend is required
  if (typeof firstRow === 'string' && !legend) {
    console.warn('⚠ Pixel art uses compressed format but no legend provided, blocks may not render');
  }

  // Auto-Frame logic: If frame requested, pad grid with border blocks
  if (step.frame) {
    const frameBlock = step.frameBlock || 'black_wool';
    const newWidth = width + 2;

    // Add Top Border
    const borderRow = isStringGrid ? frameBlock[0].repeat(newWidth) : Array(newWidth).fill(frameBlock);

    // Modify existing rows
    for (let i = 0; i < grid.length; i++) {
      if (isStringGrid) {
        grid[i] = frameBlock[0] + grid[i] + frameBlock[0];
      } else {
        grid[i].unshift(frameBlock);
        grid[i].push(frameBlock);
      }
    }

    // Add Top/Bottom
    // Wait, adding rows to grid array logic needs care if string vs array
    // Actually, simpler to just add frame blocks directly to `blocks` list by iterating -1 to width
    // But that requires knowing the coordinate math.
    // Let's stick to the grid manipulation if possible, or just post-processing.

    // Actually, just let's add a "Background/Frame" pass.
    // Iterate -1 to Width, -1 to Height. If it's a border coordinate, place frame block.
  }

  // Pre-calculate frame bounds if needed
  const frameBlock = step.frame || 'black_wool'; // Default frame
  const useFrame = step.addFrame === true;

  console.log(`  Pixel art grid: ${width}x${height}, legend: ${legend ? 'yes' : 'no'}`);

  // Direction mappings... (omitted)

  for (let row = -1; row <= height; row++) {
    for (let col = -1; col <= width; col++) {
      // ... (logic below)
    }
  }
  // Wait, I should not rewrite the whole loop structure inside a replace.
  // I will append a "Frame Pass" AFTER the main loop.

  // ... (Existing Loop) ...

  // POST-LOOP: Frame Generation
  if (step.useFrame) {
    const frameMat = step.frameBlock || 'black_wool';
    // Generate border rect
    // Top/Bottom rows
    for (let c = -1; c <= width; c++) {
      // Top (row -1)
      // Bottom (row height)
      // Need to calculate absolute coordinates using same logic as main loop
      // ...
    }
  }

  // If framing, expand iteration bounds by 1 in all directions
  const rowStart = useFrame ? -1 : 0;
  const rowEnd = useFrame ? height : height - 1;
  const colStart = useFrame ? -1 : 0;
  const colEnd = useFrame ? width : width - 1;

  for (let row = rowStart; row <= rowEnd; row++) {
    const isFrameRow = row < 0 || row >= height;
    const gridRow = !isFrameRow ? grid[row] : null;
    const isStringRow = typeof gridRow === 'string';

    for (let col = colStart; col <= colEnd; col++) {
      const isFrameCol = col < 0 || col >= width;
      let block;

      if (isFrameRow || isFrameCol) {
        // Frame Logic: Only place frame if it borders a non-empty pixel?
        // Or simple bounding box? User asked for "frame", typically a bounding box.
        // Let's do a simple bounding box for now.
        block = frameBlock;
      } else {
        // Normal Logic
        let rawSymbol = isStringRow ? gridRow[col] : gridRow[col];
        if (legend && rawSymbol) {
          block = legend[rawSymbol] || 'air';
        } else {
          block = rawSymbol;
        }
      }

      // Defensive trimming
      if (typeof block === 'string') block = block.trim();

      // Skip empty pixels
      if (!block || block === '' || block === 'air' || block === 'void' || block === 'cave_air' || block === '.') {
        continue;
      }

      // Calculate Y: row 0 is top, so invert Y
      const y = base.y + (height - 1 - row);

      let x, z;

      switch (facing) {
        case 'north':
          // Facing north: built on X-Y plane, viewer looks from +Z toward -Z
          // Mirror X so left appears on left from north
          x = base.x + (width - 1 - col);
          z = base.z;
          break;

        case 'east':
          // Facing east: built on Z-Y plane, viewer looks from -X toward +X
          x = base.x;
          z = base.z + col;
          break;

        case 'west':
          // Facing west: built on Z-Y plane, viewer looks from +X toward -X
          // Mirror Z so left appears on left from west
          x = base.x;
          z = base.z + (width - 1 - col);
          break;

        case 'south':
        default:
          // Facing south: built on X-Y plane, viewer looks from -Z toward +Z
          x = base.x + col;
          z = base.z;
          break;
      }

      blocks.push({ x, y, z, block });
    }
  }

  return blocks;
}



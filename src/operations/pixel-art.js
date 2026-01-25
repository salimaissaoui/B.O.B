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
      if (isStringGrid) {
        grid[i] = row + '.'.repeat(padding); // Append air
      } else {
        // Append air blocks for array format
        for (let k = 0; k < padding; k++) grid[i].push('air');
      }
      console.log(`    Autofixed row ${i}: padded with ${padding} blocks`);
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

  console.log(`  Pixel art grid: ${width}x${height}, legend: ${legend ? 'yes' : 'no'}`);

  // Direction mappings... (omitted)

  for (let row = 0; row < height; row++) {
    const gridRow = grid[row];
    // Handle row being string or array
    const isStringRow = typeof gridRow === 'string';

    for (let col = 0; col < width; col++) {
      let rawSymbol = isStringRow ? gridRow[col] : gridRow[col];

      // If we have a legend, resolve the symbol to a block name
      let block;
      if (legend && rawSymbol) {
        block = legend[rawSymbol] || 'air'; // Default to air if not in legend
      } else {
        block = rawSymbol; // Legacy mode: symbol IS the block name
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



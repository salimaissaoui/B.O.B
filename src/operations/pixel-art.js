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
  const { base, grid, facing = 'south' } = step;
  
  if (!base || !grid || !Array.isArray(grid)) {
    throw new Error('Pixel art requires base position and grid array');
  }
  
  if (grid.length === 0) {
    throw new Error('Pixel art grid cannot be empty');
  }
  
  const blocks = [];
  const height = grid.length;
  const width = grid[0]?.length || 0;
  
  if (width === 0) {
    throw new Error('Pixel art grid rows cannot be empty');
  }
  
  // Direction mappings:
  // facing 'south' = art faces south, built on X-Y plane at constant Z
  // facing 'north' = art faces north, built on X-Y plane at constant Z (mirrored X)
  // facing 'east'  = art faces east, built on Z-Y plane at constant X
  // facing 'west'  = art faces west, built on Z-Y plane at constant X (mirrored Z)
  
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const block = grid[row][col];
      
      // Skip empty pixels
      if (!block || block === '' || block === 'air') {
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

/**
 * Optimized pixel art that uses lines for horizontal runs of same blocks
 * This reduces the number of individual set operations
 */
export function pixelArtOptimized(step) {
  const { base, grid, facing = 'south' } = step;
  
  if (!base || !grid || !Array.isArray(grid)) {
    throw new Error('Pixel art requires base position and grid array');
  }
  
  if (grid.length === 0 || !grid[0]?.length) {
    throw new Error('Pixel art grid cannot be empty');
  }
  
  const blocks = [];
  const height = grid.length;
  const width = grid[0].length;
  
  // Process each row and find horizontal runs
  for (let row = 0; row < height; row++) {
    let runStart = null;
    let runBlock = null;
    
    for (let col = 0; col <= width; col++) {
      const block = col < width ? grid[row][col] : null;
      const isValidBlock = block && block !== '' && block !== 'air';
      
      if (isValidBlock && block === runBlock) {
        // Continue current run
        continue;
      }
      
      // End current run if exists
      if (runBlock !== null && runStart !== null) {
        const y = base.y + (height - 1 - row);
        const runEnd = col - 1;
        
        // Add blocks for this run
        for (let c = runStart; c <= runEnd; c++) {
          let x, z;
          switch (facing) {
            case 'north':
              x = base.x + (width - 1 - c);
              z = base.z;
              break;
            case 'east':
              x = base.x;
              z = base.z + c;
              break;
            case 'west':
              x = base.x;
              z = base.z + (width - 1 - c);
              break;
            case 'south':
            default:
              x = base.x + c;
              z = base.z;
              break;
          }
          blocks.push({ x, y, z, block: runBlock });
        }
      }
      
      // Start new run if valid block
      if (isValidBlock) {
        runStart = col;
        runBlock = block;
      } else {
        runStart = null;
        runBlock = null;
      }
    }
  }
  
  return blocks;
}

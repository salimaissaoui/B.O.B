/**
 * Pixel Art operation - Creates 2D pixel art from a grid
 * @param {Object} step - Step configuration
 * @param {Object} step.base - Base corner position {x, y, z}
 * @param {string} step.facing - Direction the art faces: 'north', 'south', 'east', 'west' (default: 'south')
 * @param {string[]|string[][]} step.grid - 2D array of block names or strings (row 0 is TOP of the art)
 *                                          Use 'air' or '' for empty/transparent pixels
 * @param {Object} step.legend - Optional legend mapping characters to block names
 * @param {boolean} step.frame - Add a frame around the pixel art
 * @param {string} step.frameBlock - Block to use for frame (default: 'black_wool')
 * @returns {Array} - List of block placements {x, y, z, block}
 */
export function pixelArt(step) {
  const { base, grid: rawGrid, legend, facing: rawFacing = 'south' } = step;
  const facing = rawFacing.toLowerCase();

  if (!base || !rawGrid || !Array.isArray(rawGrid) || rawGrid.length === 0) {
    throw new Error('Pixel art requires base position and grid array');
  }

  // Normalize grid to 2D array of block names
  const height = rawGrid.length;
  let width = 0;
  rawGrid.forEach(row => {
    if (!row) return;
    width = Math.max(width, row.length);
  });

  if (width === 0) throw new Error('Pixel art grid cannot be empty');

  const useFrame = step.frame === true;
  const frameBlock = step.frameBlock || 'black_wool';
  const blocks = [];

  // Logic: row 0 is TOP (highest Y).
  // Column 0 is LEFT (from viewer's perspective).

  const rStart = useFrame ? -1 : 0;
  const rEnd = useFrame ? height : height - 1;
  const cStart = useFrame ? -1 : 0;
  const cEnd = useFrame ? width : width - 1;

  for (let r = rStart; r <= rEnd; r++) {
    for (let c = cStart; c <= cEnd; c++) {
      let block = null;
      const isFrame = r < 0 || r >= height || c < 0 || c >= width;

      if (isFrame) {
        block = frameBlock;
      } else {
        const rowData = rawGrid[r];
        const raw = rowData[c];

        if (legend && raw && legend[raw]) {
          block = legend[raw];
        } else {
          block = raw;
        }
      }

      // Filter transparency
      if (!block || block === '' || block === 'air' || block === 'void' || block === '.') continue;

      // Coordinate calculation
      // rowIdx 0 is top
      const finalHeight = useFrame ? height + 2 : height;
      const finalWidth = useFrame ? width + 2 : width;
      const rowIdx = useFrame ? r + 1 : r;
      const colIdx = useFrame ? c + 1 : c;

      // y decreases as rowIdx increases because row 0 is TOP
      const y = base.y + (finalHeight - 1 - rowIdx);

      let x = base.x;
      let z = base.z;

      switch (facing) {
        case 'north':
          // Mirror X so col 0 is left from north view (facing -Z)
          x = base.x + (finalWidth - 1 - colIdx);
          break;
        case 'east':
          // Built on Z-Y plane, col 0 is left from east view (facing +X)
          z = base.z + colIdx;
          break;
        case 'west':
          // Built on Z-Y plane, col 0 is left from west view (facing -X)
          z = base.z + (finalWidth - 1 - colIdx);
          break;
        case 'south':
        default:
          // col 0 is left from south view (facing +Z)
          x = base.x + colIdx;
          break;
      }

      blocks.push({ x, y, z, block: block.trim() });
    }
  }

  console.log(`  Generated ${blocks.length} pixel art placements`);
  return blocks;
}

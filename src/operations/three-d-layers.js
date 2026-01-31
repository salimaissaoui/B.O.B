/**
 * 3D Layers operation - Creates 3D structures from stacked 2D grids (slices)
 * Success pattern adapted from Pixel Art generation.
 * 
 * @param {Object} step - Step configuration
 * @param {Object} step.base - Base corner position {x, y, z}
 * @param {string[][]} step.layers - Array of 2D grids (slices). layers[0] is bottom-most (Y=0).
 * @param {Object} step.legend - Mapping of characters to block names
 * @returns {Array} - List of block placements {x, y, z, block}
 */
export function threeDLayers(step) {
    const { base, layers, legend } = step;

    if (!base || !layers || !Array.isArray(layers) || layers.length === 0) {
        throw new Error('3D Layers requires base position and layers array');
    }

    const blocks = [];

    // layers[0] is Y=0 relative to base.y
    for (let yOffset = 0; yOffset < layers.length; yOffset++) {
        const grid = layers[yOffset];
        if (!grid || !Array.isArray(grid)) continue;

        // grid[0] is typically the row with minimum Z (north-most)
        // grid[row][col] mapping to world coordinates:
        // x = base.x + col
        // y = base.y + yOffset
        // z = base.z + row
        for (let row = 0; row < grid.length; row++) {
            const rowData = grid[row];
            if (!rowData) continue;

            for (let col = 0; col < rowData.length; col++) {
                const char = rowData[col];

                // Skip air/dots
                if (!char || char === '.' || char === ' ' || char === 'air') continue;

                let block = char;
                if (legend && legend[char]) {
                    block = legend[char];
                }

                if (!block || block === 'air') continue;

                blocks.push({
                    x: base.x + col,
                    y: base.y + yOffset,
                    z: base.z + row,
                    block: block.trim()
                });
            }
        }
    }

    console.log(`  Generated ${blocks.length} 3D layered block placements`);
    return blocks;
}

/**
 * Spatial Validator
 *
 * Analyzes blueprint spatial connectivity to detect:
 * - Floating roofs (roofs not connected to walls)
 * - Floating pillars (columns that don't reach the ground)
 * - Disconnected components (isolated floating sections)
 * - Gaps between structural elements
 *
 * Uses a 3D occupancy grid to simulate the build and check connectivity.
 */

/**
 * Block category tags for structural analysis
 */
const STRUCTURAL_TAGS = {
  foundation: ['floor', 'foundation', 'base', 'platform'],
  wall: ['wall', 'walls', 'we_walls', 'smart_wall', 'outline'],
  roof: ['roof', 'roof_gable', 'roof_flat', 'roof_hip', 'smart_roof', 'ceiling'],
  pillar: ['pillar', 'column', 'support', 'post'],
  fill: ['fill', 'we_fill', 'box', 'hollow_box', 'volume']
};

/**
 * Determine structural tags for an operation
 * @param {Object} step - Blueprint step
 * @returns {Array} Array of structural tags
 */
function getStructuralTags(step) {
  const tags = [];
  const opType = (step.op || step.type || '').toLowerCase();

  for (const [tag, patterns] of Object.entries(STRUCTURAL_TAGS)) {
    if (patterns.some(p => opType.includes(p))) {
      tags.push(tag);
    }
  }

  // Check for explicit tags in step
  if (step.tags) {
    tags.push(...step.tags);
  }

  // Default to 'structure' if no specific tags
  if (tags.length === 0) {
    tags.push('structure');
  }

  return tags;
}

/**
 * Calculate the bounding box of an operation
 * @param {Object} step - Blueprint step
 * @returns {Object|null} Bounding box {from, to} or null if not calculable
 */
function getOperationBounds(step) {
  // Operations with explicit from/to
  if (step.from && step.to) {
    return {
      from: { x: step.from.x || 0, y: step.from.y || 0, z: step.from.z || 0 },
      to: { x: step.to.x || 0, y: step.to.y || 0, z: step.to.z || 0 }
    };
  }

  // Operations with position and size
  if (step.pos && step.size) {
    return {
      from: { x: step.pos.x || 0, y: step.pos.y || 0, z: step.pos.z || 0 },
      to: {
        x: (step.pos.x || 0) + (step.size.width || step.size.x || 1) - 1,
        y: (step.pos.y || 0) + (step.size.height || step.size.y || 1) - 1,
        z: (step.pos.z || 0) + (step.size.depth || step.size.z || 1) - 1
      }
    };
  }

  // Operations with position only (single block)
  if (step.pos) {
    return {
      from: { x: step.pos.x || 0, y: step.pos.y || 0, z: step.pos.z || 0 },
      to: { x: step.pos.x || 0, y: step.pos.y || 0, z: step.pos.z || 0 }
    };
  }

  // Roof operations
  if (step.op?.includes('roof') && step.width && step.depth) {
    const y = step.y || 0;
    return {
      from: { x: 0, y, z: 0 },
      to: { x: step.width - 1, y: y + (step.height || 5), z: step.depth - 1 }
    };
  }

  return null;
}

/**
 * Build a sparse occupancy grid from blueprint steps
 * @param {Array} steps - Blueprint steps
 * @returns {Object} Occupancy data {blocks, byY, byTag}
 */
function buildOccupancyGrid(steps) {
  const blocks = new Map(); // key: "x,y,z" -> {pos, tags, stepIndex}
  const byY = new Map();    // y -> [{pos, tags}]
  const byTag = new Map();  // tag -> [{pos, tags}]

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const bounds = getOperationBounds(step);
    const tags = getStructuralTags(step);

    if (!bounds) continue;

    // Normalize bounds
    const minX = Math.min(bounds.from.x, bounds.to.x);
    const maxX = Math.max(bounds.from.x, bounds.to.x);
    const minY = Math.min(bounds.from.y, bounds.to.y);
    const maxY = Math.max(bounds.from.y, bounds.to.y);
    const minZ = Math.min(bounds.from.z, bounds.to.z);
    const maxZ = Math.max(bounds.from.z, bounds.to.z);

    // For very large operations, just record the bounds rather than every block
    const volume = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
    if (volume > 10000) {
      // Record corners and edges for large operations
      const cornerPoints = [
        { x: minX, y: minY, z: minZ },
        { x: maxX, y: minY, z: minZ },
        { x: minX, y: maxY, z: minZ },
        { x: maxX, y: maxY, z: minZ },
        { x: minX, y: minY, z: maxZ },
        { x: maxX, y: minY, z: maxZ },
        { x: minX, y: maxY, z: maxZ },
        { x: maxX, y: maxY, z: maxZ }
      ];

      for (const pos of cornerPoints) {
        addBlock(blocks, byY, byTag, pos, tags, i);
      }
      continue;
    }

    // Record each block position
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          addBlock(blocks, byY, byTag, { x, y, z }, tags, i);
        }
      }
    }
  }

  return { blocks, byY, byTag };
}

/**
 * Add a block to the occupancy grid
 */
function addBlock(blocks, byY, byTag, pos, tags, stepIndex) {
  const key = `${pos.x},${pos.y},${pos.z}`;
  const entry = { pos: { ...pos }, tags, stepIndex };

  blocks.set(key, entry);

  // Index by Y level
  if (!byY.has(pos.y)) {
    byY.set(pos.y, []);
  }
  byY.get(pos.y).push(entry);

  // Index by tag
  for (const tag of tags) {
    if (!byTag.has(tag)) {
      byTag.set(tag, []);
    }
    byTag.get(tag).push(entry);
  }
}

/**
 * Check if there's a block at or adjacent to a position
 * @param {Map} blocks - Occupancy grid blocks
 * @param {Object} pos - Position to check
 * @param {number} dy - Y offset to check
 * @returns {boolean}
 */
function hasBlockAt(blocks, pos, dy = 0) {
  const key = `${pos.x},${pos.y + dy},${pos.z}`;
  return blocks.has(key);
}

/**
 * Check if a block has any adjacent block below
 * @param {Map} blocks - Occupancy grid blocks
 * @param {Object} pos - Position to check
 * @returns {boolean}
 */
function hasAdjacentBelow(blocks, pos) {
  // Check directly below
  if (hasBlockAt(blocks, pos, -1)) return true;

  // Check cardinal directions one level below
  const offsets = [
    { x: -1, z: 0 }, { x: 1, z: 0 },
    { x: 0, z: -1 }, { x: 0, z: 1 }
  ];

  for (const off of offsets) {
    const key = `${pos.x + off.x},${pos.y - 1},${pos.z + off.z}`;
    if (blocks.has(key)) return true;
  }

  return false;
}

/**
 * Find connected components using flood fill
 * @param {Map} blocks - Occupancy grid blocks
 * @returns {Array} Array of components, each containing block keys
 */
function findConnectedComponents(blocks) {
  const visited = new Set();
  const components = [];

  for (const [key, entry] of blocks) {
    if (visited.has(key)) continue;

    // Start new component
    const component = [];
    const queue = [key];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;

      visited.add(current);
      component.push(current);

      // Parse position from key
      const [x, y, z] = current.split(',').map(Number);

      // Check all 6 adjacent positions
      const neighbors = [
        `${x - 1},${y},${z}`, `${x + 1},${y},${z}`,
        `${x},${y - 1},${z}`, `${x},${y + 1},${z}`,
        `${x},${y},${z - 1}`, `${x},${y},${z + 1}`
      ];

      for (const neighbor of neighbors) {
        if (blocks.has(neighbor) && !visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  // Sort by size (largest first)
  components.sort((a, b) => b.length - a.length);

  return components;
}

/**
 * Validate blueprint connectivity and detect structural issues
 *
 * @param {Object} blueprint - Blueprint to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result {valid, issues, stats}
 */
export function validateConnectivity(blueprint, options = {}) {
  const { verbose = false, maxIssues = 10 } = options;
  const issues = [];
  const stats = {
    totalBlocks: 0,
    roofBlocks: 0,
    wallBlocks: 0,
    foundationBlocks: 0,
    components: 0
  };

  if (!blueprint.steps || blueprint.steps.length === 0) {
    return { valid: true, issues: [], stats };
  }

  // Build occupancy grid
  const grid = buildOccupancyGrid(blueprint.steps);
  stats.totalBlocks = grid.blocks.size;

  // Get blocks by structural type
  const roofBlocks = grid.byTag.get('roof') || [];
  const wallBlocks = grid.byTag.get('wall') || [];
  const foundationBlocks = grid.byTag.get('foundation') || [];
  const pillarBlocks = grid.byTag.get('pillar') || [];

  stats.roofBlocks = roofBlocks.length;
  stats.wallBlocks = wallBlocks.length;
  stats.foundationBlocks = foundationBlocks.length;

  // Check 1: Roof connectivity
  // Roofs should have support below (walls or other structure)
  if (roofBlocks.length > 0 && wallBlocks.length > 0) {
    // Get Y ranges
    const roofYLevels = [...new Set(roofBlocks.map(b => b.pos.y))].sort((a, b) => a - b);
    const wallYLevels = [...new Set(wallBlocks.map(b => b.pos.y))].sort((a, b) => a - b);

    if (roofYLevels.length > 0 && wallYLevels.length > 0) {
      const minRoofY = roofYLevels[0];
      const maxWallY = wallYLevels[wallYLevels.length - 1];

      // Check for gap between wall top and roof bottom
      const gap = minRoofY - maxWallY - 1;
      if (gap > 1) {
        // Large gaps (5+ blocks) are errors that trigger repair
        const severity = gap >= 5 ? 'error' : 'warning';
        issues.push({
          type: 'roof_gap',
          severity,
          message: `Roof starts at Y=${minRoofY}, but walls end at Y=${maxWallY}. ` +
                   `There's a ${gap} block gap that may cause a floating roof.`,
          suggestion: `Extend walls to Y=${minRoofY - 1} or lower roof to Y=${maxWallY + 1}`,
          positions: { roofY: minRoofY, wallY: maxWallY, gap }
        });
      }
    }
  }

  // Check 2: Pillar grounding
  // Pillars should reach Y=0 (ground level in relative coordinates)
  for (const pillar of pillarBlocks) {
    if (pillar.pos.y > 0 && !hasBlockAt(grid.blocks, pillar.pos, -1)) {
      if (issues.length < maxIssues) {
        issues.push({
          type: 'floating_pillar',
          severity: 'warning',
          message: `Pillar at (${pillar.pos.x}, ${pillar.pos.y}, ${pillar.pos.z}) ` +
                   `doesn't reach the ground (Y=0)`,
          suggestion: 'Extend pillar down to Y=0',
          position: pillar.pos
        });
      }
    }
  }

  // Check 3: Connected components
  // The build should ideally be one connected structure
  const components = findConnectedComponents(grid.blocks);
  stats.components = components.length;

  if (components.length > 1) {
    // Find components that are truly floating (not touching Y=0)
    const floatingComponents = [];

    for (let i = 1; i < components.length; i++) {
      const comp = components[i];
      // Check if any block in component is at Y=0
      const touchesGround = comp.some(key => {
        const [, y] = key.split(',').map(Number);
        return y === 0;
      });

      if (!touchesGround && comp.length >= 3) {
        floatingComponents.push({
          index: i,
          size: comp.length,
          sample: comp[0]
        });
      }
    }

    if (floatingComponents.length > 0 && issues.length < maxIssues) {
      for (const fc of floatingComponents.slice(0, 3)) {
        const [x, y, z] = fc.sample.split(',').map(Number);
        // Large floating components (10+ blocks) are errors that trigger repair
        const severity = fc.size >= 10 ? 'error' : 'warning';
        issues.push({
          type: 'floating_component',
          severity,
          message: `${fc.size} blocks are disconnected from the main structure ` +
                   `(near position ${x}, ${y}, ${z})`,
          suggestion: 'Connect this section to the main structure or lower its Y position',
          componentIndex: fc.index,
          blockCount: fc.size
        });
      }
    }
  }

  // Check 4: Foundation at Y=0
  // Buildings should have some blocks at ground level
  const groundBlocks = grid.byY.get(0) || [];
  if (grid.blocks.size > 10 && groundBlocks.length === 0) {
    // Check if there are blocks near ground level
    const lowBlocks = [...grid.byY.entries()]
      .filter(([y]) => y >= 0 && y <= 2)
      .reduce((sum, [, blocks]) => sum + blocks.length, 0);

    if (lowBlocks === 0) {
      issues.push({
        type: 'no_foundation',
        severity: 'info',
        message: 'Build has no blocks at or near ground level (Y=0-2). ' +
                 'The structure may appear floating.',
        suggestion: 'Add a foundation or floor at Y=0'
      });
    }
  }

  if (verbose && issues.length > 0) {
    console.log('  [Spatial] Connectivity issues found:');
    for (const issue of issues) {
      console.log(`    [${issue.severity}] ${issue.type}: ${issue.message}`);
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats,
    hasWarnings: issues.length > 0
  };
}

/**
 * Format connectivity issues for LLM repair prompt
 * @param {Array} issues - Array of connectivity issues
 * @returns {string} Formatted string for LLM
 */
export function formatConnectivityIssuesForRepair(issues) {
  if (!issues || issues.length === 0) {
    return '';
  }

  const lines = ['The blueprint has the following structural issues that need repair:'];

  for (const issue of issues) {
    lines.push(`- ${issue.message}`);
    if (issue.suggestion) {
      lines.push(`  Fix: ${issue.suggestion}`);
    }
    if (issue.positions) {
      lines.push(`  Details: ${JSON.stringify(issue.positions)}`);
    }
  }

  lines.push('');
  lines.push('Please modify the blueprint to fix these issues while maintaining the overall design.');

  return lines.join('\n');
}

export default {
  validateConnectivity,
  formatConnectivityIssuesForRepair
};

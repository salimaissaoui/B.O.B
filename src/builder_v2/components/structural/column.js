/**
 * Column Component
 *
 * Generates architectural columns with optional capitals and bases.
 */

/**
 * Generate a column structure
 * @param {Object} params - Column parameters
 * @param {Object} params.position - Base position (center bottom)
 * @param {number} params.height - Column height (default: 8)
 * @param {number} params.radius - Column radius (default: 1)
 * @param {string} params.style - Column style: 'simple', 'doric', 'ionic'
 * @param {boolean} params.capital - Include capital (top decoration)
 * @param {boolean} params.base - Include base (bottom decoration)
 * @param {string} params.block - Main block type
 * @param {string} params.accentBlock - Accent block for capital/base
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function column(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    height = 8,
    radius = 1,
    style = 'simple',
    capital = true,
    base = true,
    block = '$primary',
    accentBlock = '$accent',
    scale = 1
  } = params;

  const primitives = [];
  let idCounter = 0;
  const nextId = () => `column_${idCounter++}`;
  const h = Math.round(height * scale);
  const r = Math.max(1, Math.round(radius * scale));

  // Main shaft
  if (r === 1) {
    // Simple line for radius 1
    primitives.push({
      id: nextId(),
      type: 'line',
      from: { x: position.x, y: position.y + (base ? 1 : 0), z: position.z },
      to: { x: position.x, y: position.y + h - (capital ? 2 : 1), z: position.z },
      block
    });
  } else {
    // Cylinder for larger radius
    primitives.push({
      id: nextId(),
      type: 'cylinder',
      base: { x: position.x, y: position.y + (base ? 1 : 0), z: position.z },
      radius: r,
      height: h - (base ? 1 : 0) - (capital ? 2 : 0),
      hollow: false,
      block
    });
  }

  // Base (slightly wider)
  if (base) {
    if (r === 1) {
      // Simple cross pattern for small columns
      primitives.push({
        id: nextId(),
        type: 'set',
        pos: { x: position.x, y: position.y, z: position.z },
        block: accentBlock
      });
      primitives.push({
        id: nextId(),
        type: 'set',
        pos: { x: position.x + 1, y: position.y, z: position.z },
        block: accentBlock
      });
      primitives.push({
        id: nextId(),
        type: 'set',
        pos: { x: position.x - 1, y: position.y, z: position.z },
        block: accentBlock
      });
      primitives.push({
        id: nextId(),
        type: 'set',
        pos: { x: position.x, y: position.y, z: position.z + 1 },
        block: accentBlock
      });
      primitives.push({
        id: nextId(),
        type: 'set',
        pos: { x: position.x, y: position.y, z: position.z - 1 },
        block: accentBlock
      });
    } else {
      primitives.push({
        id: nextId(),
        type: 'cylinder',
        base: { x: position.x, y: position.y, z: position.z },
        radius: r + 1,
        height: 1,
        hollow: false,
        block: accentBlock
      });
    }
  }

  // Capital (decorative top)
  if (capital) {
    const capY = position.y + h - 2;

    if (style === 'doric') {
      // Simple slab capital
      primitives.push({
        id: nextId(),
        type: 'box',
        from: { x: position.x - r, y: capY, z: position.z - r },
        to: { x: position.x + r, y: capY, z: position.z + r },
        block: accentBlock
      });
      primitives.push({
        id: nextId(),
        type: 'box',
        from: { x: position.x - r - 1, y: capY + 1, z: position.z - r - 1 },
        to: { x: position.x + r + 1, y: capY + 1, z: position.z + r + 1 },
        block: accentBlock
      });
    } else if (style === 'ionic') {
      // Scrolled capital (simplified)
      primitives.push({
        id: nextId(),
        type: 'box',
        from: { x: position.x - r - 1, y: capY, z: position.z - r },
        to: { x: position.x + r + 1, y: capY, z: position.z + r },
        block: accentBlock
      });
      primitives.push({
        id: nextId(),
        type: 'box',
        from: { x: position.x - r, y: capY + 1, z: position.z - r - 1 },
        to: { x: position.x + r, y: capY + 1, z: position.z + r + 1 },
        block: accentBlock
      });
    } else {
      // Simple capital
      primitives.push({
        id: nextId(),
        type: 'box',
        from: { x: position.x - r, y: capY, z: position.z - r },
        to: { x: position.x + r, y: capY + 1, z: position.z + r },
        block: accentBlock
      });
    }
  }

  return primitives;
}

export default column;

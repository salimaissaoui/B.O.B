/**
 * Primitive Component Generators
 *
 * Basic building blocks for more complex components.
 */

let primCounter = 0;
const nextPrimId = (prefix) => `${prefix}_${primCounter++}`;

/**
 * Generate a solid box
 * @param {Object} params - Box parameters
 * @param {Object} params.position - Base position {x, y, z}
 * @param {number} params.width - X dimension
 * @param {number} params.height - Y dimension
 * @param {number} params.depth - Z dimension
 * @param {string} params.block - Block type or $palette reference
 * @returns {Object[]} Array with single box primitive
 */
export function box(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    width = 1,
    height = 1,
    depth = 1,
    block = '$primary',
    scale = 1
  } = params;

  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const d = Math.round(depth * scale);

  return [{
    id: nextPrimId('box'),
    type: 'box',
    from: { ...position },
    to: {
      x: position.x + w - 1,
      y: position.y + h - 1,
      z: position.z + d - 1
    },
    block
  }];
}

/**
 * Generate hollow walls (box without floor/ceiling)
 * @param {Object} params - Wall parameters
 * @param {Object} params.position - Base position {x, y, z}
 * @param {number} params.width - X dimension
 * @param {number} params.height - Y dimension
 * @param {number} params.depth - Z dimension
 * @param {string} params.block - Block type or $palette reference
 * @returns {Object[]} Array with single hollow_box primitive
 */
export function wall(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    width = 1,
    height = 1,
    depth = 1,
    block = '$primary',
    scale = 1
  } = params;

  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const d = Math.round(depth * scale);

  return [{
    id: nextPrimId('wall'),
    type: 'hollow_box',
    from: { ...position },
    to: {
      x: position.x + w - 1,
      y: position.y + h - 1,
      z: position.z + d - 1
    },
    block
  }];
}

/**
 * Generate a line of blocks
 * @param {Object} params - Line parameters
 * @param {Object} params.from - Start position {x, y, z}
 * @param {Object} params.to - End position {x, y, z}
 * @param {string} params.block - Block type
 * @returns {Object[]} Array with single line primitive
 */
export function line(params) {
  const { from, to, block = '$primary' } = params;

  return [{
    id: nextPrimId('line'),
    type: 'line',
    from: { ...from },
    to: { ...to },
    block
  }];
}

/**
 * Generate a single block placement
 * @param {Object} params - Set parameters
 * @param {Object} params.pos - Position {x, y, z}
 * @param {string} params.block - Block type
 * @returns {Object[]} Array with single set primitive
 */
export function set(params) {
  const { pos, block = '$primary' } = params;

  return [{
    id: nextPrimId('set'),
    type: 'set',
    pos: { ...pos },
    block
  }];
}

export default { box, wall, line, set };

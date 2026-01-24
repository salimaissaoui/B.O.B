/**
 * Set operation - Places a single block
 * @param {Object} step - Step configuration
 * @param {Object} step.pos - Position coordinate {x, y, z}
 * @param {string} step.block - Block type
 * @returns {Array} - List with single block placement {x, y, z, block}
 */
export function set(step) {
  const { pos, block } = step;
  
  if (!pos || !block) {
    throw new Error('Set operation requires pos and block');
  }
  
  return [{ x: pos.x, y: pos.y, z: pos.z, block }];
}

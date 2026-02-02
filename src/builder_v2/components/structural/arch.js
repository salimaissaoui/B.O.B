/**
 * Arch Component
 *
 * Generates various arch styles (rounded, pointed, flat).
 */

/**
 * Generate an arch structure
 * @param {Object} params - Arch parameters
 * @param {Object} params.position - Base position (center bottom of arch)
 * @param {number} params.width - Span width (default: 5)
 * @param {number} params.height - Height of arch (default: 4)
 * @param {number} params.thickness - Depth/thickness (default: 1)
 * @param {string} params.style - Arch style: 'rounded', 'pointed', 'flat'
 * @param {string} params.block - Block type
 * @param {string} params.direction - 'ns' (north-south) or 'ew' (east-west)
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function arch(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    width = 5,
    height = 4,
    thickness = 1,
    style = 'rounded',
    block = '$primary',
    direction = 'ns',
    scale = 1
  } = params;

  const primitives = [];
  let idCounter = 0;
  const nextId = () => `arch_${idCounter++}`;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const t = Math.round(thickness * scale);

  const halfWidth = Math.floor(w / 2);

  // Generate arch profile based on style
  const generateArchProfile = () => {
    const profile = [];

    if (style === 'flat') {
      // Simple flat top
      for (let x = -halfWidth; x <= halfWidth; x++) {
        profile.push({ x, y: h - 1 });
      }
      // Columns
      profile.push({ x: -halfWidth, y: 0 });
      profile.push({ x: halfWidth, y: 0 });
      for (let y = 0; y < h - 1; y++) {
        profile.push({ x: -halfWidth, y });
        profile.push({ x: halfWidth, y });
      }
    } else if (style === 'pointed') {
      // Gothic pointed arch
      for (let x = -halfWidth; x <= halfWidth; x++) {
        const dist = Math.abs(x);
        const y = h - 1 - Math.floor(dist * (h - 1) / halfWidth);
        profile.push({ x, y });
      }
      // Columns
      for (let y = 0; y < h - 1; y++) {
        profile.push({ x: -halfWidth, y });
        profile.push({ x: halfWidth, y });
      }
    } else {
      // Rounded arch (semicircle)
      for (let x = -halfWidth; x <= halfWidth; x++) {
        // Semicircle equation
        const normalizedX = x / halfWidth;
        const y = Math.floor(Math.sqrt(1 - normalizedX * normalizedX) * (h - 1));
        profile.push({ x, y: y + Math.floor(h * 0.3) });
      }
      // Columns
      for (let y = 0; y < Math.floor(h * 0.3); y++) {
        profile.push({ x: -halfWidth, y });
        profile.push({ x: halfWidth, y });
      }
    }

    return profile;
  };

  const profile = generateArchProfile();

  // Generate blocks for each thickness layer
  for (let tIdx = 0; tIdx < t; tIdx++) {
    for (const point of profile) {
      const blockPos = direction === 'ns'
        ? { x: position.x + point.x, y: position.y + point.y, z: position.z + tIdx }
        : { x: position.x + tIdx, y: position.y + point.y, z: position.z + point.x };

      primitives.push({
        id: nextId(),
        type: 'set',
        pos: blockPos,
        block
      });
    }
  }

  return primitives;
}

export default arch;

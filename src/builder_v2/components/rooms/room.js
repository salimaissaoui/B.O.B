/**
 * Room Component
 *
 * Generates room boxes with configurable openings (doors, windows).
 */

/**
 * Generate a room structure
 * @param {Object} params - Room parameters
 * @param {Object} params.position - Base position (corner)
 * @param {number} params.width - X dimension (interior)
 * @param {number} params.height - Y dimension (interior)
 * @param {number} params.depth - Z dimension (interior)
 * @param {number} params.wallThickness - Wall thickness (default: 1)
 * @param {boolean} params.floor - Include floor (default: true)
 * @param {boolean} params.ceiling - Include ceiling (default: true)
 * @param {Object[]} params.openings - Array of opening definitions
 * @param {string} params.wallBlock - Wall block type
 * @param {string} params.floorBlock - Floor block type
 * @param {string} params.ceilingBlock - Ceiling block type
 * @returns {Object[]} Array of GeometryPrimitive objects
 */
export function room(params) {
  const {
    position = { x: 0, y: 0, z: 0 },
    width = 8,
    height = 4,
    depth = 8,
    wallThickness = 1,
    floor = true,
    ceiling = true,
    openings = [],
    wallBlock = '$primary',
    floorBlock = '$floor',
    ceilingBlock = '$primary',
    scale = 1
  } = params;

  const primitives = [];
  let idCounter = 0;
  const nextId = () => `room_${idCounter++}`;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const d = Math.round(depth * scale);
  const t = Math.round(wallThickness * scale);

  // Total dimensions including walls
  const totalW = w + 2 * t;
  const totalD = d + 2 * t;
  const totalH = h + (floor ? t : 0) + (ceiling ? t : 0);

  // Floor
  if (floor) {
    primitives.push({
      id: nextId(),
      type: 'box',
      from: { ...position },
      to: {
        x: position.x + totalW - 1,
        y: position.y + t - 1,
        z: position.z + totalD - 1
      },
      block: floorBlock,
      layer: 0
    });
  }

  // Walls (hollow box)
  const wallBaseY = position.y + (floor ? t : 0);
  primitives.push({
    id: nextId(),
    type: 'hollow_box',
    from: {
      x: position.x,
      y: wallBaseY,
      z: position.z
    },
    to: {
      x: position.x + totalW - 1,
      y: wallBaseY + h - 1,
      z: position.z + totalD - 1
    },
    block: wallBlock,
    layer: 1
  });

  // Ceiling
  if (ceiling) {
    primitives.push({
      id: nextId(),
      type: 'box',
      from: {
        x: position.x,
        y: wallBaseY + h,
        z: position.z
      },
      to: {
        x: position.x + totalW - 1,
        y: wallBaseY + h + t - 1,
        z: position.z + totalD - 1
      },
      block: ceilingBlock,
      layer: 2
    });
  }

  // Process openings (doors, windows)
  for (const opening of openings) {
    const {
      type = 'door',
      wall = 'south',  // north, south, east, west
      offset = 0,      // Horizontal offset from center
      yOffset = 0,     // Vertical offset from floor
      width: openW = type === 'door' ? 1 : 2,
      height: openH = type === 'door' ? 2 : 1
    } = opening;

    // Calculate opening position based on wall
    let openPos;
    const centerX = position.x + Math.floor(totalW / 2);
    const centerZ = position.z + Math.floor(totalD / 2);

    if (wall === 'south') {
      openPos = {
        x: centerX + offset - Math.floor(openW / 2),
        y: wallBaseY + yOffset,
        z: position.z
      };
    } else if (wall === 'north') {
      openPos = {
        x: centerX + offset - Math.floor(openW / 2),
        y: wallBaseY + yOffset,
        z: position.z + totalD - 1
      };
    } else if (wall === 'west') {
      openPos = {
        x: position.x,
        y: wallBaseY + yOffset,
        z: centerZ + offset - Math.floor(openW / 2)
      };
    } else if (wall === 'east') {
      openPos = {
        x: position.x + totalW - 1,
        y: wallBaseY + yOffset,
        z: centerZ + offset - Math.floor(openW / 2)
      };
    }

    if (openPos) {
      // Clear the opening (set to air)
      for (let dx = 0; dx < openW; dx++) {
        for (let dy = 0; dy < openH; dy++) {
          const clearPos = wall === 'west' || wall === 'east'
            ? { x: openPos.x, y: openPos.y + dy, z: openPos.z + dx }
            : { x: openPos.x + dx, y: openPos.y + dy, z: openPos.z };

          primitives.push({
            id: nextId(),
            type: 'set',
            pos: clearPos,
            block: 'air',
            layer: 3
          });
        }
      }

      // Add door block if it's a door
      if (type === 'door') {
        const doorFacing = {
          south: 'south',
          north: 'north',
          east: 'east',
          west: 'west'
        }[wall];

        primitives.push({
          id: nextId(),
          type: 'door',
          pos: openPos,
          block: '$door',
          facing: doorFacing,
          layer: 4
        });
      } else if (type === 'window') {
        // Add glass pane for window
        for (let dx = 0; dx < openW; dx++) {
          for (let dy = 0; dy < openH; dy++) {
            const glassPos = wall === 'west' || wall === 'east'
              ? { x: openPos.x, y: openPos.y + dy, z: openPos.z + dx }
              : { x: openPos.x + dx, y: openPos.y + dy, z: openPos.z };

            primitives.push({
              id: nextId(),
              type: 'set',
              pos: glassPos,
              block: '$glass',
              layer: 4
            });
          }
        }
      }
    }
  }

  return primitives;
}

export default room;

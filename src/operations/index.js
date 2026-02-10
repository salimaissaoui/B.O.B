/**
 * Operations Barrel - Centralized OPERATION_MAP registry
 *
 * All operation handlers are imported here and exposed via OPERATION_MAP.
 * The builder (src/stages/5-builder.js) imports only this barrel instead
 * of 25+ individual operation files.
 *
 * To add a new operation:
 *   1. Create src/operations/your-op.js exporting a handler function
 *   2. Import it below
 *   3. Add an entry to OPERATION_MAP
 */

import { volume as universalVolume } from './universal/volume.js';
import { fill } from './fill.js';
import { hollowBox } from './hollow-box.js';
import { set } from './set.js';
import { line } from './line.js';
import { windowStrip } from './window-strip.js';
import { roofGable } from './roof-gable.js';
import { roofFlat } from './roof-flat.js';
import { weFill } from './we-fill.js';
import { weWalls } from './we-walls.js';
import { wePyramid } from './we-pyramid.js';
import { weCylinder, weCone } from './we-cylinder.js';
import { weSphere } from './we-sphere.js';
import { weReplace } from './we-replace.js';
import { stairs } from './stairs.js';
import { slab } from './slab.js';
import { fenceConnect } from './fence-connect.js';
import { door } from './door.js';
import { spiralStaircase } from './spiral-staircase.js';
import { balcony } from './balcony.js';
import { roofHip } from './roof-hip.js';
import { pixelArt } from './pixel-art.js';
import { threeDLayers } from './three-d-layers.js';
import { smartWall } from './smart-wall.js';
import { smartFloor } from './smart-floor.js';
import { smartRoof } from './smart-roof.js';

/**
 * OPERATION_MAP - Maps operation names to handler functions.
 *
 * Each handler has signature: (step, ctx?) => blocks[] | descriptor
 * - Returns an array of block placements for vanilla ops
 * - Returns a { type: 'worldedit', command, ... } descriptor for WE ops
 * - Returns [] for cursor-only ops (move, cursor_reset)
 */
export const OPERATION_MAP = {
  // Universal Ops (Cursor-aware & Auto-optimized)
  box: universalVolume,
  wall: (step, ctx) => universalVolume({ ...step, hollow: true }, ctx),
  outline: (step, ctx) => universalVolume({ ...step, hollow: true }, ctx),
  move: (step, ctx) => {
    if (ctx && ctx.cursor) {
      ctx.cursor.move(step.offset);
    }
    return []; // No blocks to place
  },
  cursor_reset: (step, ctx) => {
    if (ctx && ctx.cursor) {
      ctx.cursor.reset();
    }
    return []; // No blocks to place
  },
  fill: universalVolume,
  hollow_box: (step, ctx) => universalVolume({ ...step, hollow: true }, ctx),

  // Legacy mappings
  set,
  line,
  window_strip: windowStrip,
  roof_gable: roofGable,
  roof_flat: roofFlat,
  we_fill: weFill,
  we_walls: weWalls,
  we_pyramid: wePyramid,
  we_cylinder: weCylinder,
  we_cone: weCone,
  we_sphere: weSphere,
  we_replace: weReplace,
  stairs,
  slab,
  fence_connect: fenceConnect,
  door,
  spiral_staircase: spiralStaircase,
  balcony,
  roof_hip: roofHip,
  pixel_art: pixelArt,
  three_d_layers: threeDLayers,
  smart_wall: smartWall,
  smart_floor: smartFloor,
  smart_roof: smartRoof,

  // New Mappings
  sphere: (step) => ({ type: 'worldedit', command: 'sphere', ...step }),
  cylinder: (step) => ({ type: 'worldedit', command: 'cylinder', ...step }),
  cone: weCone,  // Cone is tapered cylinder with topRadius=0
  smooth: (step) => ({ type: 'organic', command: 'smooth', ...step }),
  grow_tree: (step) => ({ type: 'organic', command: 'grow_tree', ...step })
};

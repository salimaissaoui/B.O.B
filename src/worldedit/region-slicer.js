import { SAFETY_LIMITS } from '../config/limits.js';

/**
 * Slice a region into smaller chunks if it exceeds volume/dimension limits.
 * Recursively splits the longest axis until chunks are safe.
 *
 * Pure geometric algorithm — no WorldEdit or bot dependency.
 *
 * @param {Object} from - Start pos {x,y,z}
 * @param {Object} to - End pos {x,y,z}
 * @returns {Array<{from: Object, to: Object}>} Array of safe-sized chunks
 */
export function sliceRegion(from, to) {
  const dx = Math.abs(to.x - from.x) + 1;
  const dy = Math.abs(to.y - from.y) + 1;
  const dz = Math.abs(to.z - from.z) + 1;
  const volume = dx * dy * dz;

  const MAX_VOL = SAFETY_LIMITS.worldEdit.maxSelectionVolume || 50000;
  const MAX_DIM = SAFETY_LIMITS.worldEdit.maxSelectionDimension || 100;

  // Base case: Region is safe
  if (volume <= MAX_VOL && dx <= MAX_DIM && dy <= MAX_DIM && dz <= MAX_DIM) {
    return [{ from, to }];
  }

  // Recursive step: Split along longest axis
  let splitAxis = 'x';
  let maxLen = dx;
  if (dy > maxLen) { splitAxis = 'y'; maxLen = dy; }
  if (dz > maxLen) { splitAxis = 'z'; maxLen = dz; }

  const chunks = [];

  // Normalized Split Strategy to avoid sign confusion
  const x1 = Math.min(from.x, to.x); const x2 = Math.max(from.x, to.x);
  const y1 = Math.min(from.y, to.y); const y2 = Math.max(from.y, to.y);
  const z1 = Math.min(from.z, to.z); const z2 = Math.max(from.z, to.z);

  let sub1From, sub1To, sub2From, sub2To;

  if (splitAxis === 'x') {
    const splitX = Math.floor((x1 + x2) / 2);
    sub1From = { x: x1, y: y1, z: z1 }; sub1To = { x: splitX, y: y2, z: z2 };
    sub2From = { x: splitX + 1, y: y1, z: z1 }; sub2To = { x: x2, y: y2, z: z2 };
  } else if (splitAxis === 'y') {
    const splitY = Math.floor((y1 + y2) / 2);
    sub1From = { x: x1, y: y1, z: z1 }; sub1To = { x: x2, y: splitY, z: z2 };
    sub2From = { x: x1, y: splitY + 1, z: z1 }; sub2To = { x: x2, y: y2, z: z2 };
  } else {
    const splitZ = Math.floor((z1 + z2) / 2);
    sub1From = { x: x1, y: y1, z: z1 }; sub1To = { x: x2, y: y2, z: splitZ };
    sub2From = { x: x1, y: y1, z: splitZ + 1 }; sub2To = { x: x2, y: y2, z: z2 };
  }

  chunks.push(...sliceRegion(sub1From, sub1To));
  chunks.push(...sliceRegion(sub2From, sub2To));

  return chunks;
}

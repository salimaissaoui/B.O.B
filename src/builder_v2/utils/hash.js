/**
 * Deterministic Hashing Utilities
 *
 * Provides consistent hashing for BuildPlan and PlacementPlan
 * to verify determinism (same input = same hash).
 */

import crypto from 'crypto';

/**
 * Deep sort object keys for consistent serialization
 */
export function deepSortKeys(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepSortKeys);
  }

  const sorted = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = deepSortKeys(obj[key]);
  }

  return sorted;
}

/**
 * Remove non-deterministic fields from an object
 */
export function removeNonDeterministic(obj, fieldsToRemove = ['timestamp', 'createdAt', 'updatedAt']) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeNonDeterministic(item, fieldsToRemove));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!fieldsToRemove.includes(key)) {
      result[key] = removeNonDeterministic(value, fieldsToRemove);
    }
  }

  return result;
}

/**
 * Compute SHA-256 hash of an object
 * @param {Object} obj - Object to hash
 * @param {string[]} excludeFields - Fields to exclude from hash
 * @returns {string} 64-character hex hash
 */
export function hashObject(obj, excludeFields = ['timestamp']) {
  const cleaned = removeNonDeterministic(obj, excludeFields);
  const sorted = deepSortKeys(cleaned);
  const json = JSON.stringify(sorted);

  return crypto.createHash('sha256')
    .update(json)
    .digest('hex');
}

/**
 * Compute hash for BuildPlanV2
 * Excludes timestamp but includes seed for reproducibility verification
 */
export function hashBuildPlan(plan) {
  return hashObject(plan, ['timestamp', 'createdAt']);
}

/**
 * Compute hash for PlacementPlanV2
 */
export function hashPlacementPlan(placement) {
  return hashObject(placement, ['timestamp', 'createdAt', 'estimatedTime']);
}

/**
 * Verify that two plans are deterministically equivalent
 */
export function verifyDeterminism(plan1, plan2) {
  const hash1 = hashBuildPlan(plan1);
  const hash2 = hashBuildPlan(plan2);
  return hash1 === hash2;
}

export default {
  deepSortKeys,
  removeNonDeterministic,
  hashObject,
  hashBuildPlan,
  hashPlacementPlan,
  verifyDeterminism
};

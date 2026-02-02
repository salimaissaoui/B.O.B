/**
 * Builder v2 Schema Validators
 *
 * AJV-based validators for all v2 contracts with clear error codes.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize AJV with formats
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false  // Allow additional properties for extensibility
});
addFormats(ajv);

// Load schemas
const SCHEMA_DIR = join(__dirname, '../schemas');

function loadSchema(name) {
  const path = join(SCHEMA_DIR, `${name}.schema.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// Load all schemas
const intentSchema = loadSchema('build-intent-v2');
const sceneSchema = loadSchema('build-scene-v2');
const planSchema = loadSchema('build-plan-v2');
const placementSchema = loadSchema('placement-plan-v2');

// Compile validators
const validateIntentRaw = ajv.compile(intentSchema);
const validateSceneRaw = ajv.compile(sceneSchema);
const validatePlanRaw = ajv.compile(planSchema);
const validatePlacementRaw = ajv.compile(placementSchema);

/**
 * Error codes for validation failures
 */
export const ErrorCodes = {
  INVALID_VERSION: 'INVALID_VERSION',
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  INVALID_TYPE: 'INVALID_TYPE',
  OUT_OF_BOUNDS: 'OUT_OF_BOUNDS',
  INVALID_COMPONENT: 'INVALID_COMPONENT',
  INVALID_BLOCK: 'INVALID_BLOCK',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  INVALID_FORMAT: 'INVALID_FORMAT',
  SCHEMA_MISMATCH: 'SCHEMA_MISMATCH'
};

/**
 * Convert AJV errors to structured error codes
 */
function mapErrorCode(ajvError) {
  const keyword = ajvError.keyword;
  const path = ajvError.instancePath;

  if (keyword === 'required') {
    return ErrorCodes.MISSING_REQUIRED;
  }
  if (keyword === 'type') {
    return ErrorCodes.INVALID_TYPE;
  }
  if (keyword === 'enum') {
    if (path.includes('component') || path.includes('type')) {
      return ErrorCodes.INVALID_COMPONENT;
    }
    return ErrorCodes.INVALID_TYPE;
  }
  if (keyword === 'minimum' || keyword === 'maximum') {
    return ErrorCodes.OUT_OF_BOUNDS;
  }
  if (keyword === 'const') {
    if (path.includes('version')) {
      return ErrorCodes.INVALID_VERSION;
    }
    return ErrorCodes.CONSTRAINT_VIOLATION;
  }
  if (keyword === 'pattern' || keyword === 'format') {
    return ErrorCodes.INVALID_FORMAT;
  }

  return ErrorCodes.SCHEMA_MISMATCH;
}

/**
 * Create structured validation result
 */
function createValidationResult(isValid, validator, data) {
  if (isValid) {
    return {
      valid: true,
      errors: [],
      data
    };
  }

  const errors = (validator.errors || []).map(err => ({
    code: mapErrorCode(err),
    path: err.instancePath || '/',
    message: err.message,
    params: err.params,
    schemaPath: err.schemaPath
  }));

  return {
    valid: false,
    errors,
    data: null
  };
}

/**
 * Validate BuildIntentV2
 * @param {Object} intent - Intent object to validate
 * @returns {Object} Validation result with errors or validated data
 */
export function validateIntent(intent) {
  const isValid = validateIntentRaw(intent);
  return createValidationResult(isValid, validateIntentRaw, intent);
}

/**
 * Validate BuildSceneV2
 * @param {Object} scene - Scene object to validate
 * @returns {Object} Validation result with errors or validated data
 */
export function validateScene(scene) {
  const isValid = validateSceneRaw(scene);
  return createValidationResult(isValid, validateSceneRaw, scene);
}

/**
 * Validate BuildPlanV2
 * @param {Object} plan - Plan object to validate
 * @returns {Object} Validation result with errors or validated data
 */
export function validatePlan(plan) {
  const isValid = validatePlanRaw(plan);
  return createValidationResult(isValid, validatePlanRaw, plan);
}

/**
 * Validate PlacementPlanV2
 * @param {Object} placement - Placement plan to validate
 * @returns {Object} Validation result with errors or validated data
 */
export function validatePlacement(placement) {
  const isValid = validatePlacementRaw(placement);
  return createValidationResult(isValid, validatePlacementRaw, placement);
}

/**
 * Get human-readable error message
 */
export function formatValidationError(error) {
  return `[${error.code}] ${error.path}: ${error.message}`;
}

/**
 * Get all validation errors as formatted strings
 */
export function formatValidationErrors(result) {
  if (result.valid) return [];
  return result.errors.map(formatValidationError);
}

/**
 * Quick validation check (returns boolean)
 */
export function isValidIntent(intent) {
  return validateIntentRaw(intent);
}

export function isValidScene(scene) {
  return validateSceneRaw(scene);
}

export function isValidPlan(plan) {
  return validatePlanRaw(plan);
}

export function isValidPlacement(placement) {
  return validatePlacementRaw(placement);
}

export default {
  validateIntent,
  validateScene,
  validatePlan,
  validatePlacement,
  isValidIntent,
  isValidScene,
  isValidPlan,
  isValidPlacement,
  formatValidationError,
  formatValidationErrors,
  ErrorCodes
};

import { SAFETY_LIMITS } from '../config/limits.js';
import { isWorldEditOperation, getOperationMetadata } from '../config/operations-registry.js';

/**
 * WorldEdit Validator
 * Validates WorldEdit operations in blueprints
 */
export class WorldEditValidator {
  /**
   * Validate WorldEdit operations in blueprint
   */
  static validateWorldEditOps(blueprint) {
    const errors = [];
    let totalWorldEditCmds = 0;
    let totalWorldEditBlocks = 0;

    if (!blueprint.steps || !Array.isArray(blueprint.steps)) {
      return {
        valid: false,
        errors: ['Blueprint missing steps array'],
        stats: { worldEditCommands: 0, worldEditBlocks: 0 }
      };
    }

    for (const step of blueprint.steps) {
      if (!isWorldEditOperation(step.op)) continue;

      totalWorldEditCmds++;

      // Note: fallback is optional in the step - if not specified, the builder
      // will use the operation's default fallback from the operations registry.
      // Only log a warning if fallbackOnError is enabled but no fallback exists
      // anywhere (neither in step nor in registry).
      const opMeta = getOperationMetadata(step.op);
      const hasAnyFallback = step.fallback || opMeta?.fallback;
      if (SAFETY_LIMITS.worldEdit.fallbackOnError && !hasAnyFallback) {
        // This is just informational - operations like we_cylinder and we_sphere
        // intentionally have no vanilla fallback
        // No error needed here - the builder handles this gracefully
      }

      // Validate selection size for operations with from/to
      if (step.from && step.to) {
        const validation = this.validateSelection(step.from, step.to, step.op);
        if (!validation.valid) {
          errors.push(...validation.errors);
        }
        totalWorldEditBlocks += validation.volume;
      }

      // Validate cylinder parameters
      if (step.op === 'we_cylinder') {
        const validation = this.validateCylinder(step);
        if (!validation.valid) {
          errors.push(...validation.errors);
        }
        totalWorldEditBlocks += validation.volume;
      }

      // Validate sphere parameters
      if (step.op === 'we_sphere') {
        const validation = this.validateSphere(step);
        if (!validation.valid) {
          errors.push(...validation.errors);
        }
        totalWorldEditBlocks += validation.volume;
      }

      // Validate pyramid parameters
      if (step.op === 'we_pyramid') {
        const validation = this.validatePyramid(step);
        if (!validation.valid) {
          errors.push(...validation.errors);
        }
        totalWorldEditBlocks += validation.volume;
      }
    }

    // Check total command limit
    if (totalWorldEditCmds > SAFETY_LIMITS.worldEdit.maxCommandsPerBuild) {
      errors.push(
        `Too many WorldEdit commands: ${totalWorldEditCmds} ` +
        `(max: ${SAFETY_LIMITS.worldEdit.maxCommandsPerBuild})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      stats: {
        worldEditCommands: totalWorldEditCmds,
        worldEditBlocks: totalWorldEditBlocks
      }
    };
  }

  /**
   * Validate cuboid selection (from/to)
   */
  static validateSelection(from, to, opName) {
    const errors = [];

    // Calculate dimensions
    const dimensions = {
      x: Math.abs(to.x - from.x) + 1,
      y: Math.abs(to.y - from.y) + 1,
      z: Math.abs(to.z - from.z) + 1
    };

    const volume = dimensions.x * dimensions.y * dimensions.z;

    // Check volume limit
    if (volume > SAFETY_LIMITS.worldEdit.maxSelectionVolume) {
      errors.push(
        `${opName}: Selection too large: ${volume} blocks ` +
        `(max: ${SAFETY_LIMITS.worldEdit.maxSelectionVolume})`
      );
    }

    // Check dimension limits
    const maxDim = SAFETY_LIMITS.worldEdit.maxSelectionDimension;
    if (dimensions.x > maxDim || dimensions.y > maxDim || dimensions.z > maxDim) {
      errors.push(
        `${opName}: Selection dimension too large: ` +
        `${dimensions.x}x${dimensions.y}x${dimensions.z} ` +
        `(max per axis: ${maxDim})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      volume,
      dimensions
    };
  }

  /**
   * Validate cylinder parameters
   */
  static validateCylinder(step) {
    const errors = [];

    if (!step.radius || !step.height) {
      errors.push('we_cylinder requires radius and height parameters');
      return { valid: false, errors, volume: 0 };
    }

    const radius = step.radius;
    const height = step.height;

    // Approximate volume
    const volume = Math.floor(Math.PI * radius * radius * height);

    // Check volume
    if (volume > SAFETY_LIMITS.worldEdit.maxSelectionVolume) {
      errors.push(
        `we_cylinder: Volume too large: ${volume} blocks ` +
        `(max: ${SAFETY_LIMITS.worldEdit.maxSelectionVolume})`
      );
    }

    // Check dimensions
    const maxDim = SAFETY_LIMITS.worldEdit.maxSelectionDimension;
    if (radius * 2 > maxDim || height > maxDim) {
      errors.push(
        `we_cylinder: Dimensions too large: radius ${radius}, height ${height} ` +
        `(max dimension: ${maxDim})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      volume
    };
  }

  /**
   * Validate sphere parameters
   */
  static validateSphere(step) {
    const errors = [];

    if (!step.radius) {
      errors.push('we_sphere requires radius parameter');
      return { valid: false, errors, volume: 0 };
    }

    const radius = step.radius;

    // Approximate volume
    const volume = Math.floor((4 / 3) * Math.PI * radius * radius * radius);

    // Check volume
    if (volume > SAFETY_LIMITS.worldEdit.maxSelectionVolume) {
      errors.push(
        `we_sphere: Volume too large: ${volume} blocks ` +
        `(max: ${SAFETY_LIMITS.worldEdit.maxSelectionVolume})`
      );
    }

    // Check dimension
    const maxDim = SAFETY_LIMITS.worldEdit.maxSelectionDimension;
    if (radius * 2 > maxDim) {
      errors.push(
        `we_sphere: Radius too large: ${radius} ` +
        `(max dimension: ${maxDim})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      volume
    };
  }

  /**
   * Validate pyramid parameters
   */
  static validatePyramid(step) {
    const errors = [];

    if (!step.height) {
      errors.push('we_pyramid requires height parameter');
      return { valid: false, errors, volume: 0 };
    }

    const height = step.height;

    // Approximate volume (pyramid)
    const volume = Math.floor((height * height * height) / 3);

    // Check volume
    if (volume > SAFETY_LIMITS.worldEdit.maxSelectionVolume) {
      errors.push(
        `we_pyramid: Volume too large: ${volume} blocks ` +
        `(max: ${SAFETY_LIMITS.worldEdit.maxSelectionVolume})`
      );
    }

    // Check dimension
    const maxDim = SAFETY_LIMITS.worldEdit.maxSelectionDimension;
    if (height > maxDim) {
      errors.push(
        `we_pyramid: Height too large: ${height} ` +
        `(max dimension: ${maxDim})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      volume
    };
  }

}

import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

// Design Plan Schema - High-level architectural plan
// Note: Gemini API doesn't support additionalProperties, so we use specific fields
export const designPlanSchema = {
  type: "object",
  properties: {
    dimensions: {
      type: "object",
      properties: {
        width: { type: "integer" },
        depth: { type: "integer" },
        height: { type: "integer" }
      },
      required: ["width", "depth", "height"]
    },
    style: {
      type: "string"
    },
    materials: {
      type: "object",
      properties: {
        primary: { type: "string" },
        secondary: { type: "string" },
        accent: { type: "string" },
        roof: { type: "string" },
        floor: { type: "string" },
        windows: { type: "string" },
        door: { type: "string" }
      },
      required: ["primary"]
    },
    features: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["dimensions", "style", "materials", "features"]
};

// Blueprint Schema - Executable build instructions
export const blueprintSchema = {
  type: "object",
  properties: {
    size: {
      type: "object",
      properties: {
        width: { type: "integer" },
        depth: { type: "integer" },
        height: { type: "integer" }
      },
      required: ["width", "depth", "height"]
    },
    palette: {
      type: "array",
      items: { type: "string" }
    },
    execution_plan: {
      type: "object",
      properties: {
        worldedit_available: { type: "boolean" },
        estimated_blocks: { type: "integer" },
        operations_count: {
          type: "object",
          properties: {
            worldedit: { type: "integer" },
            vanilla: { type: "integer" }
          }
        }
      }
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          op: {
            type: "string",
            enum: [
              // Vanilla operations (existing)
              "fill", "hollow_box", "set", "line", "window_strip", "roof_gable", "roof_flat",
              // WorldEdit operations (new)
              "we_fill", "we_walls", "we_pyramid", "we_cylinder", "we_sphere", "we_replace",
              // Detail operations (new)
              "stairs", "slab", "fence_connect", "door",
              // Complex operations (new)
              "spiral_staircase", "balcony", "roof_hip"
            ]
          },
          block: { type: "string" },
          from: {
            type: "object",
            properties: {
              x: { type: "integer" },
              y: { type: "integer" },
              z: { type: "integer" }
            },
            required: ["x", "y", "z"]
          },
          to: {
            type: "object",
            properties: {
              x: { type: "integer" },
              y: { type: "integer" },
              z: { type: "integer" }
            },
            required: ["x", "y", "z"]
          },
          pos: {
            type: "object",
            properties: {
              x: { type: "integer" },
              y: { type: "integer" },
              z: { type: "integer" }
            },
            required: ["x", "y", "z"]
          },
          base: {
            type: "object",
            properties: {
              x: { type: "integer" },
              y: { type: "integer" },
              z: { type: "integer" }
            },
            required: ["x", "y", "z"]
          },
          width: { type: "integer" },
          spacing: { type: "integer" },
          peakHeight: { type: "integer" },
          radius: { type: "integer" },
          height: { type: "integer" },
          facing: { type: "string", enum: ["north", "south", "east", "west"] },
          half: { type: "string", enum: ["top", "bottom", "upper", "lower"] },
          hollow: { type: "boolean" },
          fallback: {
            type: "object",
            properties: {
              op: { type: "string" },
              from: { type: "object" },
              to: { type: "object" },
              pos: { type: "object" },
              block: { type: "string" }
            }
          }
        },
        required: ["op", "block"]
      }
    }
  },
  required: ["size", "palette", "steps"]
};

// Compile validators
export const validateDesignPlan = ajv.compile(designPlanSchema);
export const validateBlueprint = ajv.compile(blueprintSchema);

/**
 * Get human-readable validation errors
 * @param {Function} validator - AJV validator function
 * @returns {string[]} - Array of error messages
 */
export function getValidationErrors(validator) {
  if (!validator.errors) return [];

  return validator.errors.map(err => {
    const path = err.instancePath || 'root';
    return `${path}: ${err.message}`;
  });
}

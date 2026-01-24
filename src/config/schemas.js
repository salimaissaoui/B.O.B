import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

// Design Plan Schema - High-level architectural plan
export const designPlanSchema = {
  type: "object",
  properties: {
    dimensions: {
      type: "object",
      properties: {
        width: { type: "integer", minimum: 1, maximum: 100 },
        depth: { type: "integer", minimum: 1, maximum: 100 },
        height: { type: "integer", minimum: 1, maximum: 256 }
      },
      required: ["width", "depth", "height"],
      additionalProperties: false
    },
    style: { 
      type: "string",
      minLength: 1
    },
    materials: { 
      type: "object",
      additionalProperties: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } }
        ]
      }
    },
    features: { 
      type: "array", 
      items: { type: "string" },
      minItems: 1
    }
  },
  required: ["dimensions", "style", "materials", "features"],
  additionalProperties: false
};

// Blueprint Schema - Executable build instructions
export const blueprintSchema = {
  type: "object",
  properties: {
    size: {
      type: "object",
      properties: {
        width: { type: "integer", minimum: 1, maximum: 100 },
        depth: { type: "integer", minimum: 1, maximum: 100 },
        height: { type: "integer", minimum: 1, maximum: 256 }
      },
      required: ["width", "depth", "height"],
      additionalProperties: false
    },
    palette: {
      type: "array",
      items: { type: "string", minLength: 1 },
      maxItems: 15,
      minItems: 1,
      uniqueItems: true
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          op: {
            type: "string",
            enum: ["fill", "hollow_box", "set", "line", "window_strip", "roof_gable", "roof_flat"]
          },
          block: { type: "string" },
          from: {
            type: "object",
            properties: {
              x: { type: "integer" },
              y: { type: "integer" },
              z: { type: "integer" }
            },
            required: ["x", "y", "z"],
            additionalProperties: false
          },
          to: {
            type: "object",
            properties: {
              x: { type: "integer" },
              y: { type: "integer" },
              z: { type: "integer" }
            },
            required: ["x", "y", "z"],
            additionalProperties: false
          },
          pos: {
            type: "object",
            properties: {
              x: { type: "integer" },
              y: { type: "integer" },
              z: { type: "integer" }
            },
            required: ["x", "y", "z"],
            additionalProperties: false
          },
          width: { type: "integer", minimum: 1 },
          spacing: { type: "integer", minimum: 1 },
          peakHeight: { type: "integer", minimum: 1 }
        },
        required: ["op", "block"],
        additionalProperties: false
      },
      minItems: 1
    }
  },
  required: ["size", "palette", "steps"],
  additionalProperties: false
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

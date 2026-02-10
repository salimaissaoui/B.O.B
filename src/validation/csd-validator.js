/**
 * CSD Phase Validator
 * Classifies operations into CORE, STRUCTURE, or DETAIL phases
 * per CLAUDE.md "Core → Structure → Detail (CSD) Build Philosophy"
 *
 * v1.1 Hygiene fixes:
 * - Added missing ops: fill, hollow_box, smart_wall, smart_floor, pixel_art
 * - Added EXCLUDED list for movement/system ops that don't count toward totals
 */

export const CSD_PHASE_CLASSIFICATION = {
  // CORE: Primary mass operations (25-35% of build)
  // Large volume fills that establish the bounding shape
  CORE: ['we_fill', 'we_walls', 'we_cylinder', 'we_sphere', 'we_pyramid',
         'box', 'wall', 'fill', 'hollow_box'],

  // STRUCTURE: Secondary forms that break up core (30-40% of build)
  // Intermediate complexity, roofs, procedural surfaces
  STRUCTURE: ['three_d_layers', 'roof_gable', 'roof_hip', 'roof_flat', 'smart_roof',
              'outline', 'smart_wall', 'smart_floor', 'we_replace'],

  // DETAIL: Texture, accents, carving (30-40% of build, MANDATORY)
  // Fine-grained ops, single blocks, creative pixel work
  DETAIL: ['set', 'line', 'slab', 'stairs', 'door', 'window_strip', 'fence_connect',
           'balcony', 'spiral_staircase', 'lantern', 'trapdoor', 'flower_pot',
           'pixel_art'],

  // EXCLUDED: Movement and system ops that don't represent build content
  // These are filtered out before calculating phase percentages
  EXCLUDED: ['move', 'cursor_reset', 'site_prep']
};

/**
 * Classify a single operation into CSD phase
 * @param {Object} step - Blueprint operation step
 * @returns {string|null} - 'CORE', 'STRUCTURE', 'DETAIL', or null for excluded ops
 */
export function classifyCSDPhase(step) {
  if (!step || !step.op) return 'DETAIL'; // Default to detail for safety

  const op = step.op.toLowerCase();

  // EXCLUDED: Movement and system ops don't count toward CSD balance
  if (CSD_PHASE_CLASSIFICATION.EXCLUDED.includes(op)) return null;

  // Any operation using "air" block is DETAIL (carving)
  if (step.block === 'air') return 'DETAIL';

  if (CSD_PHASE_CLASSIFICATION.CORE.includes(op)) return 'CORE';
  if (CSD_PHASE_CLASSIFICATION.STRUCTURE.includes(op)) return 'STRUCTURE';
  if (CSD_PHASE_CLASSIFICATION.DETAIL.includes(op)) return 'DETAIL';

  // Default: unrecognized ops fall to STRUCTURE (conservative)
  return 'STRUCTURE';
}

/**
 * Validate CSD phase balance per CLAUDE.md requirements
 * Returns WARNINGS only (no hard failures per implementation rules)
 *
 * Contract thresholds:
 * - CORE: 25-35%
 * - STRUCTURE: 30-40%
 * - DETAIL: 30-40% (MANDATORY, minimum 10 operations)
 */
export function validateCSDPhaseBalance(blueprint) {
  const warnings = [];
  const steps = blueprint.steps || [];

  if (steps.length === 0) return { warnings, phases: {}, excluded: 0 };

  // Classify all steps, filtering out EXCLUDED ops (movement, system)
  const phases = { CORE: 0, STRUCTURE: 0, DETAIL: 0 };
  let excludedCount = 0;

  for (const step of steps) {
    const phase = classifyCSDPhase(step);
    if (phase === null) {
      excludedCount++;
    } else {
      phases[phase]++;
    }
  }

  // Total for percentage calculation excludes movement/system ops
  const total = phases.CORE + phases.STRUCTURE + phases.DETAIL;

  // Edge case: all ops were excluded (e.g., pure cursor movement blueprint)
  if (total === 0) {
    return { warnings, phases, excluded: excludedCount, percentages: { core: 0, structure: 0, detail: 0 } };
  }

  const detailPercent = (phases.DETAIL / total) * 100;
  const corePercent = (phases.CORE / total) * 100;

  // Check DETAIL minimum (CLAUDE.md: "fewer than 10 detail operations = FAILED")
  // Per instruction: emit WARNING only, not hard failure
  if (phases.DETAIL < 10) {
    warnings.push({
      code: 'CSD_DETAIL_COUNT',
      message: `Detail phase has only ${phases.DETAIL} operations (minimum: 10). Build may appear flat or unfinished.`,
      severity: 'warning'
    });
  }

  // Check DETAIL percentage (CLAUDE.md: 30-40%)
  if (detailPercent < 25) {
    warnings.push({
      code: 'CSD_DETAIL_PERCENT',
      message: `Detail phase is ${detailPercent.toFixed(1)}% of operations (expected: 30-40%). Consider adding texture, accents, or carving.`,
      severity: 'warning'
    });
  }

  // Check CORE percentage (shouldn't dominate)
  if (corePercent > 50) {
    warnings.push({
      code: 'CSD_CORE_HEAVY',
      message: `Core phase is ${corePercent.toFixed(1)}% of operations (expected: 25-35%). Build may appear boxy or simplistic.`,
      severity: 'warning'
    });
  }

  return {
    warnings,
    phases,
    excluded: excludedCount,
    percentages: {
      core: corePercent,
      structure: (phases.STRUCTURE / total) * 100,
      detail: detailPercent
    }
  };
}

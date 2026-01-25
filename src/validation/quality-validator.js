import { SAFETY_LIMITS } from '../config/limits.js';

/**
 * Quality Validator
 * Validates architectural quality and feature completeness
 */
export class QualityValidator {
  /**
   * Score blueprint quality (0.0 - 1.0)
   * P1 Fix: Integrated palette usage check
   */
  static scoreBlueprint(blueprint, designPlan) {
    let score = 1.0;
    const penalties = [];

    // Check feature completeness
    const featureScore = this.checkFeatureCompleteness(blueprint, designPlan);
    score *= featureScore.score;
    penalties.push(...featureScore.penalties);

    // Check structural integrity
    const structureScore = this.checkStructuralIntegrity(blueprint, designPlan);
    score *= structureScore.score;
    penalties.push(...structureScore.penalties);

    // Check proportions
    const proportionScore = this.checkProportions(blueprint, designPlan);
    score *= proportionScore.score;
    penalties.push(...proportionScore.penalties);

    // P1 Fix: Check palette usage (was dead code before)
    const paletteScore = this.checkPaletteUsage(blueprint);
    score *= paletteScore.score;
    penalties.push(...paletteScore.penalties);

    return {
      score,
      passed: score >= SAFETY_LIMITS.minQualityScore,
      penalties,
      breakdown: {
        featureCompleteness: featureScore.score,
        structuralIntegrity: structureScore.score,
        proportions: proportionScore.score,
        paletteUsage: paletteScore.score  // P1 Fix: Include in breakdown
      }
    };
  }

  /**
   * Verify requested features are present in blueprint
   */
  static checkFeatureCompleteness(blueprint, designPlan) {
    const penalties = [];
    let score = 1.0;

    if (!designPlan.features || designPlan.features.length === 0) {
      return { score: 1.0, penalties: [] };
    }

    const requestedFeatures = new Set(
      designPlan.features.map(f => f.toLowerCase())
    );
    const enforceableFeatures = new Set(
      [...requestedFeatures].filter(feature => this.isEnforceableFeature(feature))
    );
    if (enforceableFeatures.size === 0) {
      return { score: 1.0, penalties: [] };
    }
    const presentFeatures = new Set();

    // Scan blueprint for feature operations
    for (const step of blueprint.steps) {
      const op = step.op.toLowerCase();
      const block = step.block?.toLowerCase() || '';

      // Door detection
      if (op.includes('door') || block.includes('door')) {
        presentFeatures.add('door');
        presentFeatures.add('doors');
      }

      // Window detection
      if (op.includes('window') || block.includes('glass') || block.includes('pane')) {
        presentFeatures.add('window');
        presentFeatures.add('windows');
      }

      // Roof detection
      if (op.includes('roof') || op.includes('pyramid')) {
        presentFeatures.add('roof');
      }

      // Stairs detection
      if (op.includes('stairs') || block.includes('stairs')) {
        presentFeatures.add('stairs');
        presentFeatures.add('staircase');
      }

      // Spiral staircase detection
      if (op.includes('spiral')) {
        presentFeatures.add('spiral_staircase');
        presentFeatures.add('spiral staircase');
      }

      // Balcony detection
      if (op.includes('balcony') || op === 'balcony') {
        presentFeatures.add('balcony');
      }

      // Tower detection
      if (op.includes('tower') || op.includes('cylinder')) {
        presentFeatures.add('tower');
        presentFeatures.add('towers');
      }

      // Dome detection
      if (op.includes('dome') || op.includes('sphere')) {
        presentFeatures.add('dome');
      }

      // Fence/railing detection
      if (block.includes('fence') || op.includes('fence')) {
        presentFeatures.add('fence');
        presentFeatures.add('railing');
      }
    }

    // Check for missing features
    for (const feature of enforceableFeatures) {
      if (!presentFeatures.has(feature)) {
        penalties.push(`Missing requested feature: ${feature}`);
        score *= 0.7; // 30% penalty per missing feature
      }
    }

    return { score, penalties };
  }

  /**
   * Check structural integrity (foundation, walls, roof order)
   */
  static checkStructuralIntegrity(blueprint, designPlan) {
    const penalties = [];
    let score = 1.0;
    if (this.isOrganicStructure(blueprint, designPlan)) {
      return { score: 1.0, penalties: [] };
    }

    // Ensure there's a foundation (operations at y=0 or y=1)
    const hasFoundation = blueprint.steps.some(step => {
      const hasLowY =
        (step.from && step.from.y <= 1) ||
        (step.to && step.to.y <= 1) ||
        (step.pos && step.pos.y <= 1) ||
        (step.base && step.base.y <= 1);
      return hasLowY;
    });

    if (!hasFoundation) {
      penalties.push('No foundation detected (recommended: operations at y=0-1)');
      score *= 0.9;
    }

    // Check for walls
    const hasWalls = blueprint.steps.some(step => {
      return step.op.includes('wall') ||
             step.op === 'hollow_box' ||
             step.op === 'we_walls';
    });

    if (!hasWalls && blueprint.steps.length > 3) {
      penalties.push('No walls detected (recommended for structures)');
      score *= 0.85;
    }

    // Check for roof (if building is tall enough)
    const maxHeight = Math.max(
      ...blueprint.steps.map(step => {
        if (step.to) return step.to.y;
        if (step.pos) return step.pos.y;
        if (step.height) return step.height;
        return 0;
      })
    );

    if (maxHeight > 5) {
      const hasRoof = blueprint.steps.some(step => {
        return step.op.includes('roof') || step.op.includes('pyramid');
      });

      if (!hasRoof) {
        penalties.push('No roof detected for tall structure (height > 5)');
        score *= 0.9;
      }
    }

    return { score, penalties };
  }

  /**
   * Check if dimensions match design plan
   */
  static checkProportions(blueprint, designPlan) {
    const penalties = [];
    let score = 1.0;

    if (!designPlan.dimensions) {
      return { score: 1.0, penalties: [] };
    }

    const planned = designPlan.dimensions;
    const actual = blueprint.size;

    // Allow 20% tolerance for creative interpretation
    const tolerance = 0.2;

    // Check width
    const widthDiff = Math.abs(actual.width - planned.width) / planned.width;
    if (widthDiff > tolerance) {
      penalties.push(
        `Width mismatch: planned ${planned.width}, got ${actual.width} ` +
        `(${(widthDiff * 100).toFixed(0)}% difference)`
      );
      score *= 0.95;
    }

    // Check height
    const heightDiff = Math.abs(actual.height - planned.height) / planned.height;
    if (heightDiff > tolerance) {
      penalties.push(
        `Height mismatch: planned ${planned.height}, got ${actual.height} ` +
        `(${(heightDiff * 100).toFixed(0)}% difference)`
      );
      score *= 0.95;
    }

    // Check depth
    const depthDiff = Math.abs(actual.depth - planned.depth) / planned.depth;
    if (depthDiff > tolerance) {
      penalties.push(
        `Depth mismatch: planned ${planned.depth}, got ${actual.depth} ` +
        `(${(depthDiff * 100).toFixed(0)}% difference)`
      );
      score *= 0.95;
    }

    return { score, penalties };
  }

  static isEnforceableFeature(feature) {
    const enforceable = [
      'door', 'doors', 'window', 'windows', 'roof',
      'stairs', 'staircase', 'spiral staircase', 'spiral_staircase',
      'balcony', 'tower', 'towers', 'dome', 'fence', 'railing'
    ];
    return enforceable.includes(feature);
  }

  static isOrganicStructure(blueprint, designPlan) {
    const style = designPlan?.style?.toLowerCase() || '';
    const organicStyle = style.includes('tree') ||
      style.includes('foliage') ||
      style.includes('organic') ||
      style.includes('natural');
    if (organicStyle) {
      return true;
    }
    const organicFeatures = (designPlan?.features || [])
      .some(feature => ['tree', 'foliage', 'canopy', 'roots', 'leaves'].includes(
        String(feature).toLowerCase()
      ));
    if (organicFeatures) {
      return true;
    }
    return blueprint.steps.some(step => {
      const op = step.op?.toLowerCase() || '';
      return op.includes('tree') || op.includes('foliage');
    });
  }

  /**
   * Check if blueprint uses palette efficiently
   */
  static checkPaletteUsage(blueprint) {
    const penalties = [];
    let score = 1.0;

    // Count block usage
    const blockCounts = {};
    for (const step of blueprint.steps) {
      if (step.block) {
        blockCounts[step.block] = (blockCounts[step.block] || 0) + 1;
      }
    }

    // Check if palette blocks are actually used
    const paletteBlocks = new Set(blueprint.palette || []);
    const usedBlocks = new Set(Object.keys(blockCounts));

    for (const block of paletteBlocks) {
      if (!usedBlocks.has(block)) {
        penalties.push(`Palette block '${block}' is not used in blueprint`);
        score *= 0.98;
      }
    }

    // Check for blocks used but not in palette
    for (const block of usedBlocks) {
      if (!paletteBlocks.has(block)) {
        penalties.push(`Block '${block}' used but not in palette`);
        score *= 0.95;
      }
    }

    return { score, penalties };
  }
}

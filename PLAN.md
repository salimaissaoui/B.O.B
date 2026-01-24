# B.O.B WorldEdit Integration & Build Accuracy Improvement Plan

**Date:** 2026-01-24
**Status:** Pending Approval
**Scope:** Architecture enhancement for higher-fidelity builds and WorldEdit integration

---

## 1. GOALS

### Primary Objectives

1. **Increase Build Fidelity**
   - Improve accuracy between user prompts and final Minecraft structures
   - Add support for architectural details (stairs, slabs, fences, doors, detailed roofing)
   - Enable complex shapes (cylinders, spheres, pyramids) for organic builds
   - Better material selection and palette generation

2. **Integrate WorldEdit for Performance**
   - Accelerate large fill operations (10,000x faster for bulk placement)
   - Reduce server load and prevent timeouts on large builds
   - Add advanced operations (//walls, //pyramid, //cyl, //hsphere)
   - Maintain safety limits and prevent abuse

3. **Reliability & Safety**
   - Graceful fallback when WorldEdit unavailable or commands fail
   - Anti-spam protection to prevent kicks
   - Rate limiting for both WorldEdit and vanilla placement
   - Audit trail for all WorldEdit commands

4. **Validation & Quality**
   - Enhanced blueprint validation for architectural correctness
   - Feature completeness checks (ensure doors, windows, roofs are actually placed)
   - LLM-driven quality scoring before execution

### Success Metrics

- **Build Speed:** 50-100x faster for builds >1000 blocks when WorldEdit available
- **Accuracy:** >90% feature completeness (requested features present in final build)
- **Reliability:** <5% failure rate with automatic retry/fallback
- **Safety:** Zero kicks/bans due to command spam
- **User Satisfaction:** Natural language prompts produce expected results

---

## 2. PROPOSED ARCHITECTURE CHANGES

### 2.1 Enhanced Pipeline Overview

```
USER INPUT: "modern oak house with spiral staircase and balcony"
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1: Design Planner (ENHANCED)                              │
│ - Architectural style analysis                                  │
│ - Dimension calculation with proportions                        │
│ - Material palette with detail blocks (stairs, slabs, fences)   │
│ - Feature list with specificity (gable vs hip roof, etc.)       │
│ Output: Enhanced design plan with detail_blocks array           │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2: Allowlist Deriver (UNCHANGED)                          │
│ - Validates blocks against Minecraft 1.20.1 registry            │
│ - Enforces 15 unique block limit                                │
│ Output: Validated block allowlist                               │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 3: Blueprint Generator (ENHANCED)                         │
│ - NEW: WorldEdit operation support                              │
│ - NEW: Detail operations (stairs, slabs placement)              │
│ - NEW: Complex shape operations (pyramid, cylinder, sphere)     │
│ - NEW: Operation optimizer (combines adjacent fills)            │
│ Output: Blueprint with worldedit_ops + vanilla_ops              │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 4: Validator & Repair (ENHANCED)                          │
│ - NEW: WorldEdit command validation                             │
│ - NEW: Selection size limit checking                            │
│ - NEW: Architectural quality scoring                            │
│ - NEW: Feature presence verification                            │
│ Output: Validated blueprint + quality score                     │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 5: Builder (MAJOR REFACTOR)                               │
│ - NEW: WorldEdit capability detection                           │
│ - NEW: WorldEdit executor with error handling                   │
│ - NEW: Adaptive fallback (WorldEdit → vanilla)                  │
│ - NEW: Smart rate limiting (command throttling)                 │
│ Output: Completed build with execution log                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 New Operations Library

**Expand `src/operations/` with:**

1. **Detail Operations** (vanilla placement)
   - `stairs.js` - Oriented stair placement
   - `slab.js` - Top/bottom slab placement
   - `fence-connect.js` - Auto-connecting fence lines
   - `door.js` - Double door placement with orientation
   - `window-detailed.js` - Windows with panes + trapdoor shutters

2. **WorldEdit Operations** (requires plugin)
   - `we-fill.js` - `//set <block>` for large volumes
   - `we-walls.js` - `//walls <block>` for hollow structures
   - `we-pyramid.js` - `//pyramid <block> <size>` for roofs
   - `we-cylinder.js` - `//cyl <block> <radius> <height>` for towers
   - `we-sphere.js` - `//sphere <block> <radius>` for domes
   - `we-replace.js` - `//replace <from> <to>` for material swaps

3. **Complex Operations** (decomposed to basics)
   - `spiral-staircase.js` - Generates spiral using set + stairs operations
   - `arch.js` - Creates arched doorways/windows
   - `roof-hip.js` - Four-sided sloped roof
   - `balcony.js` - Protruding platform with railing

### 2.3 Configuration Changes

**`src/config/limits.js` additions:**

```javascript
export const SAFETY_LIMITS = {
  // Existing limits...
  maxBlocks: 10000,
  maxUniqueBlocks: 15,
  maxHeight: 256,
  maxWidth: 100,
  maxDepth: 100,
  maxSteps: 1000,
  buildRateLimit: 50,

  // NEW: WorldEdit limits
  worldEdit: {
    enabled: true,                    // Feature flag
    maxSelectionVolume: 50000,        // Max blocks per //set command
    maxSelectionDimension: 50,        // Max single dimension (x/y/z)
    commandRateLimit: 5,              // WorldEdit commands per second
    commandMinDelayMs: 200,           // Min delay between WE commands
    maxCommandsPerBuild: 100,         // Total WE commands per build
    fallbackOnError: true,            // Auto-fallback to vanilla if WE fails
    requiredPermissions: [            // Expected permissions
      'worldedit.selection',
      'worldedit.region.set',
      'worldedit.region.walls'
    ]
  },

  // NEW: Quality thresholds
  minQualityScore: 0.7,               // Reject blueprints below this score
  requireFeatureCompletion: true       // Ensure all requested features present
};
```

**New file `src/config/operations-registry.js`:**

```javascript
// Maps operation types to handlers and metadata
export const OPERATIONS_REGISTRY = {
  // Vanilla operations
  fill: {
    handler: 'fill',
    type: 'vanilla',
    avgBlocksPerOp: 100,
    complexity: 1
  },

  // WorldEdit operations
  we_fill: {
    handler: 'we-fill',
    type: 'worldedit',
    avgBlocksPerOp: 5000,
    complexity: 1,
    fallback: 'fill'
  },

  we_walls: {
    handler: 'we-walls',
    type: 'worldedit',
    avgBlocksPerOp: 2000,
    complexity: 2,
    fallback: 'hollow_box'
  },

  // Detail operations
  stairs: {
    handler: 'stairs',
    type: 'vanilla',
    requiresOrientation: true,
    complexity: 2
  }
  // ... etc
};
```

### 2.4 LLM Prompt Enhancements

**`src/llm/prompts/design-plan.js` updates:**

- Add guidance for detail blocks (stairs, slabs, fences, trapdoors)
- Request specific architectural features (spiral_staircase, balcony, archway)
- Include proportions and architectural best practices
- Ask for roof_type (flat, gable, hip, pyramid, dome)

**New file `src/llm/prompts/blueprint-worldedit.js`:**

```javascript
export const BLUEPRINT_WORLDEDIT_PROMPT = `
You are generating a Minecraft building blueprint with WorldEdit support.

AVAILABLE OPERATIONS:
1. WorldEdit operations (FAST - use for large volumes):
   - we_fill: Fill large rectangular regions (up to 50k blocks)
   - we_walls: Create hollow structures (walls only)
   - we_pyramid: Create pyramids/roofs
   - we_cylinder: Create cylindrical towers
   - we_sphere: Create domes/spherical shapes

2. Vanilla operations (SLOW - use for details):
   - fill, hollow_box, set, line (existing ops)
   - stairs, slab, fence_connect, door, window_detailed (new detail ops)

OPTIMIZATION STRATEGY:
- Use WorldEdit for foundations, walls, large fills
- Use vanilla for stairs, doors, windows, decorative details
- Combine operations efficiently (foundation → walls → roof → details)

CONSTRAINTS:
- Each WorldEdit selection max 50x50x50 blocks
- Max 100 WorldEdit commands per build
- Must provide fallback vanilla operations for each WorldEdit op
...
`;
```

### 2.5 Schema Updates

**`src/config/schemas.js` - Enhanced blueprint schema:**

```javascript
export const blueprintSchema = {
  type: 'object',
  required: ['size', 'palette', 'steps', 'execution_plan'],
  properties: {
    size: { /* existing */ },
    palette: { /* existing */ },

    // NEW: Execution plan
    execution_plan: {
      type: 'object',
      required: ['worldedit_available', 'estimated_blocks', 'operations_count'],
      properties: {
        worldedit_available: { type: 'boolean' },
        estimated_blocks: { type: 'number' },
        operations_count: {
          type: 'object',
          properties: {
            worldedit: { type: 'number' },
            vanilla: { type: 'number' }
          }
        }
      }
    },

    steps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['op', 'block'],
        properties: {
          op: {
            type: 'string',
            enum: [
              // Vanilla ops
              'fill', 'hollow_box', 'set', 'line',
              'window_strip', 'roof_gable', 'roof_flat',
              // NEW: Detail ops
              'stairs', 'slab', 'fence_connect', 'door',
              // NEW: WorldEdit ops
              'we_fill', 'we_walls', 'we_pyramid',
              'we_cylinder', 'we_sphere', 'we_replace'
            ]
          },
          block: { type: 'string' },

          // NEW: Fallback operation for WorldEdit ops
          fallback: {
            type: 'object',
            properties: {
              op: { type: 'string' },
              params: { type: 'object' }
            }
          }
        }
      }
    }
  }
};
```

---

## 3. WORLDEDIT INTEGRATION APPROACH

### 3.1 WorldEdit Command Reference

**Core Commands to Support:**

1. **Selection Management**
   ```
   //pos1           - Set first corner of selection
   //pos2           - Set second corner
   //sel cuboid     - Set selection mode to cuboid
   //desel          - Clear selection
   ```

2. **Fill Operations**
   ```
   //set <block>                    - Fill selection with block
   //set 50%stone,50%cobblestone    - Pattern fill (50/50 mix)
   //replace <from> <to>            - Replace blocks in selection
   //walls <block>                  - Create walls (hollow)
   ```

3. **Shape Operations**
   ```
   //pyramid <block> <size>         - Create pyramid
   //hpyramid <block> <size>        - Hollow pyramid
   //cyl <block> <radius> <height>  - Create cylinder
   //hcyl <block> <radius> <height> - Hollow cylinder
   //sphere <block> <radius>        - Create sphere
   //hsphere <block> <radius>       - Hollow sphere
   ```

4. **Utility Commands**
   ```
   //undo          - Undo last operation
   //redo          - Redo last undone operation
   //count <block> - Count blocks in selection
   ```

### 3.2 Implementation: WorldEdit Executor

**New file `src/worldedit/executor.js`:**

```javascript
import { SAFETY_LIMITS } from '../config/limits.js';

export class WorldEditExecutor {
  constructor(bot) {
    this.bot = bot;
    this.available = false;
    this.commandQueue = [];
    this.lastCommandTime = 0;
    this.commandsExecuted = 0;
  }

  /**
   * Detect if WorldEdit is available by testing a safe command
   */
  async detectWorldEdit() {
    try {
      // Test with //version or //sel command
      await this.executeCommand('//version', { skipValidation: true });
      this.available = true;
      console.log('✓ WorldEdit detected and available');
      return true;
    } catch (error) {
      this.available = false;
      console.log('✗ WorldEdit not available, will use vanilla placement');
      return false;
    }
  }

  /**
   * Execute a WorldEdit command with rate limiting and validation
   */
  async executeCommand(command, options = {}) {
    // Rate limiting
    const now = Date.now();
    const minDelay = SAFETY_LIMITS.worldEdit.commandMinDelayMs;
    const timeSinceLastCmd = now - this.lastCommandTime;

    if (timeSinceLastCmd < minDelay) {
      await this.sleep(minDelay - timeSinceLastCmd);
    }

    // Validation
    if (!options.skipValidation) {
      this.validateCommand(command);
    }

    // Check command limit
    if (this.commandsExecuted >= SAFETY_LIMITS.worldEdit.maxCommandsPerBuild) {
      throw new Error('WorldEdit command limit reached for this build');
    }

    // Execute via chat
    console.log(`[WorldEdit] ${command}`);
    this.bot.chat(command);

    this.lastCommandTime = Date.now();
    this.commandsExecuted++;

    // Wait for command execution (WorldEdit processes async)
    await this.sleep(300); // Increased delay for WorldEdit processing

    return { success: true, command };
  }

  /**
   * Validate WorldEdit command before execution
   */
  validateCommand(command) {
    // Ensure command starts with //
    if (!command.startsWith('//')) {
      throw new Error('Invalid WorldEdit command format');
    }

    // Parse command type
    const parts = command.split(' ');
    const cmdType = parts[0].substring(2); // Remove //

    // Validate against allowlist
    const allowedCommands = [
      'pos1', 'pos2', 'set', 'walls', 'replace',
      'pyramid', 'hpyramid', 'cyl', 'hcyl', 'sphere', 'hsphere',
      'desel', 'undo', 'version', 'sel'
    ];

    if (!allowedCommands.includes(cmdType)) {
      throw new Error(`WorldEdit command '${cmdType}' not allowed`);
    }

    // Additional validation for specific commands
    if (cmdType === 'set' || cmdType === 'walls' || cmdType === 'replace') {
      // Ensure block parameter is provided
      if (parts.length < 2) {
        throw new Error(`Command '${cmdType}' requires block parameter`);
      }
    }
  }

  /**
   * Create a cuboid selection
   */
  async createSelection(from, to) {
    // Validate selection size
    const dimensions = {
      x: Math.abs(to.x - from.x) + 1,
      y: Math.abs(to.y - from.y) + 1,
      z: Math.abs(to.z - from.z) + 1
    };

    const volume = dimensions.x * dimensions.y * dimensions.z;

    if (volume > SAFETY_LIMITS.worldEdit.maxSelectionVolume) {
      throw new Error(
        `Selection too large: ${volume} blocks ` +
        `(max: ${SAFETY_LIMITS.worldEdit.maxSelectionVolume})`
      );
    }

    if (dimensions.x > SAFETY_LIMITS.worldEdit.maxSelectionDimension ||
        dimensions.y > SAFETY_LIMITS.worldEdit.maxSelectionDimension ||
        dimensions.z > SAFETY_LIMITS.worldEdit.maxSelectionDimension) {
      throw new Error(
        `Selection dimension too large: ${JSON.stringify(dimensions)} ` +
        `(max per axis: ${SAFETY_LIMITS.worldEdit.maxSelectionDimension})`
      );
    }

    // Set cuboid selection mode
    await this.executeCommand('//sel cuboid');

    // Set positions
    await this.executeCommand(`//pos1 ${from.x},${from.y},${from.z}`);
    await this.executeCommand(`//pos2 ${to.x},${to.y},${to.z}`);

    return { from, to, volume, dimensions };
  }

  /**
   * Fill selection with block
   */
  async fillSelection(block) {
    await this.executeCommand(`//set ${block}`);
  }

  /**
   * Create walls in selection
   */
  async createWalls(block) {
    await this.executeCommand(`//walls ${block}`);
  }

  /**
   * Clear selection
   */
  async clearSelection() {
    await this.executeCommand('//desel');
  }

  /**
   * Reset executor state for new build
   */
  reset() {
    this.commandsExecuted = 0;
    this.commandQueue = [];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3.3 WorldEdit Operation Implementations

**Example: `src/operations/we-fill.js`**

```javascript
/**
 * WorldEdit fill operation
 * Fills a large rectangular region using //set command
 */
export function weFill(step) {
  // Validate required parameters
  if (!step.from || !step.to || !step.block) {
    throw new Error('we_fill requires from, to, and block parameters');
  }

  // Return operation descriptor (not actual blocks)
  // Builder will execute via WorldEditExecutor
  return {
    type: 'worldedit',
    command: 'fill',
    from: step.from,
    to: step.to,
    block: step.block,
    estimatedBlocks: calculateVolume(step.from, step.to),
    fallback: {
      op: 'fill',
      from: step.from,
      to: step.to,
      block: step.block
    }
  };
}

function calculateVolume(from, to) {
  return Math.abs(to.x - from.x + 1) *
         Math.abs(to.y - from.y + 1) *
         Math.abs(to.z - from.z + 1);
}
```

**Example: `src/operations/we-pyramid.js`**

```javascript
/**
 * WorldEdit pyramid operation
 */
export function wePyramid(step) {
  if (!step.base || !step.height || !step.block) {
    throw new Error('we_pyramid requires base, height, and block');
  }

  return {
    type: 'worldedit',
    command: 'pyramid',
    base: step.base,        // Center position
    height: step.height,
    block: step.block,
    hollow: step.hollow || false,
    estimatedBlocks: Math.pow(step.height, 3) / 3, // Approx pyramid volume
    fallback: {
      op: 'roof_gable', // Fallback to simpler roof operation
      from: step.base,
      to: { x: step.base.x + step.height, y: step.base.y + step.height, z: step.base.z },
      block: step.block,
      peakHeight: step.height
    }
  };
}
```

### 3.4 Builder Refactor for WorldEdit

**Enhanced `src/stages/5-builder.js`:**

```javascript
import { WorldEditExecutor } from '../worldedit/executor.js';

export class Builder {
  constructor(bot) {
    this.bot = bot;
    this.worldEdit = new WorldEditExecutor(bot);
    this.worldEditEnabled = false;
    // ... existing fields
  }

  /**
   * Initialize builder and detect capabilities
   */
  async initialize() {
    this.worldEditEnabled = await this.worldEdit.detectWorldEdit();
  }

  /**
   * Execute blueprint with WorldEdit support
   */
  async executeBlueprint(blueprint, startPos) {
    // ... existing setup code

    this.worldEdit.reset();

    for (let i = 0; i < blueprint.steps.length; i++) {
      const step = blueprint.steps[i];

      // Check if this is a WorldEdit operation
      if (step.op.startsWith('we_')) {
        try {
          await this.executeWorldEditOperation(step, startPos);
        } catch (weError) {
          console.warn(`WorldEdit operation failed: ${weError.message}`);

          // Fallback to vanilla if enabled
          if (SAFETY_LIMITS.worldEdit.fallbackOnError && step.fallback) {
            console.log('Falling back to vanilla operation...');
            await this.executeVanillaOperation(step.fallback, startPos);
          } else {
            throw weError;
          }
        }
      } else {
        // Vanilla operation
        await this.executeVanillaOperation(step, startPos);
      }
    }

    // ... existing completion code
  }

  /**
   * Execute WorldEdit operation
   */
  async executeWorldEditOperation(step, startPos) {
    if (!this.worldEditEnabled) {
      throw new Error('WorldEdit not available');
    }

    const operation = OPERATION_MAP[step.op];
    if (!operation) {
      throw new Error(`Unknown operation: ${step.op}`);
    }

    // Get operation descriptor
    const descriptor = operation(step);

    if (descriptor.type !== 'worldedit') {
      throw new Error('Not a WorldEdit operation');
    }

    // Calculate world coordinates
    const worldFrom = {
      x: startPos.x + descriptor.from.x,
      y: startPos.y + descriptor.from.y,
      z: startPos.z + descriptor.from.z
    };

    const worldTo = {
      x: startPos.x + descriptor.to.x,
      y: startPos.y + descriptor.to.y,
      z: startPos.z + descriptor.to.z
    };

    // Execute WorldEdit command sequence
    switch (descriptor.command) {
      case 'fill':
        await this.worldEdit.createSelection(worldFrom, worldTo);
        await this.worldEdit.fillSelection(descriptor.block);
        await this.worldEdit.clearSelection();
        break;

      case 'walls':
        await this.worldEdit.createSelection(worldFrom, worldTo);
        await this.worldEdit.createWalls(descriptor.block);
        await this.worldEdit.clearSelection();
        break;

      case 'pyramid':
        // Position bot at base for //pyramid command
        await this.worldEdit.executeCommand(
          `/tp @s ${descriptor.base.x} ${descriptor.base.y} ${descriptor.base.z}`
        );
        await this.worldEdit.executeCommand(
          `//${descriptor.hollow ? 'hpyramid' : 'pyramid'} ${descriptor.block} ${descriptor.height}`
        );
        break;

      // ... other WorldEdit operations
    }

    this.currentBuild.blocksPlaced += descriptor.estimatedBlocks;
  }

  /**
   * Execute vanilla operation (existing + new detail ops)
   */
  async executeVanillaOperation(step, startPos) {
    // ... existing vanilla operation code
  }
}
```

---

## 4. SAFETY + VALIDATION UPDATES

### 4.1 WorldEdit-Specific Validations

**New file `src/validation/worldedit-validator.js`:**

```javascript
export class WorldEditValidator {
  /**
   * Validate WorldEdit operations in blueprint
   */
  static validateWorldEditOps(blueprint) {
    const errors = [];
    let totalWorldEditCmds = 0;
    let totalWorldEditBlocks = 0;

    for (const step of blueprint.steps) {
      if (!step.op.startsWith('we_')) continue;

      totalWorldEditCmds++;

      // Validate operation has fallback
      if (!step.fallback) {
        errors.push(`WorldEdit operation '${step.op}' missing fallback`);
      }

      // Validate selection size
      if (step.from && step.to) {
        const volume = this.calculateVolume(step.from, step.to);

        if (volume > SAFETY_LIMITS.worldEdit.maxSelectionVolume) {
          errors.push(
            `WorldEdit selection too large: ${volume} blocks ` +
            `(max: ${SAFETY_LIMITS.worldEdit.maxSelectionVolume})`
          );
        }

        totalWorldEditBlocks += volume;
      }

      // Validate dimensions
      if (step.from && step.to) {
        const dims = {
          x: Math.abs(step.to.x - step.from.x) + 1,
          y: Math.abs(step.to.y - step.from.y) + 1,
          z: Math.abs(step.to.z - step.from.z) + 1
        };

        const maxDim = SAFETY_LIMITS.worldEdit.maxSelectionDimension;
        if (dims.x > maxDim || dims.y > maxDim || dims.z > maxDim) {
          errors.push(
            `WorldEdit dimension too large: ${JSON.stringify(dims)} ` +
            `(max per axis: ${maxDim})`
          );
        }
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

  static calculateVolume(from, to) {
    return Math.abs(to.x - from.x + 1) *
           Math.abs(to.y - from.y + 1) *
           Math.abs(to.z - from.z + 1);
  }
}
```

### 4.2 Architectural Quality Validation

**New file `src/validation/quality-validator.js`:**

```javascript
/**
 * Validates architectural quality and feature completeness
 */
export class QualityValidator {
  /**
   * Score blueprint quality (0.0 - 1.0)
   */
  static scoreBlueprint(blueprint, designPlan) {
    let score = 1.0;
    const penalties = [];

    // Check feature completeness
    const featureScore = this.checkFeatureCompleteness(blueprint, designPlan);
    score *= featureScore.score;
    penalties.push(...featureScore.penalties);

    // Check structural integrity
    const structureScore = this.checkStructuralIntegrity(blueprint);
    score *= structureScore.score;
    penalties.push(...structureScore.penalties);

    // Check proportions
    const proportionScore = this.checkProportions(blueprint, designPlan);
    score *= proportionScore.score;
    penalties.push(...proportionScore.penalties);

    return {
      score,
      passed: score >= SAFETY_LIMITS.minQualityScore,
      penalties
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

    const requestedFeatures = new Set(designPlan.features.map(f => f.toLowerCase()));
    const presentFeatures = new Set();

    // Scan blueprint for feature operations
    for (const step of blueprint.steps) {
      const op = step.op.toLowerCase();

      // Door detection
      if (op.includes('door') || step.block?.includes('door')) {
        presentFeatures.add('door');
      }

      // Window detection
      if (op.includes('window') || step.block?.includes('glass')) {
        presentFeatures.add('window');
        presentFeatures.add('windows');
      }

      // Roof detection
      if (op.includes('roof') || op.includes('pyramid')) {
        presentFeatures.add('roof');
      }

      // Stairs detection
      if (op.includes('stairs') || step.block?.includes('stairs')) {
        presentFeatures.add('stairs');
        presentFeatures.add('staircase');
      }

      // Balcony detection
      if (op.includes('balcony') || op === 'balcony') {
        presentFeatures.add('balcony');
      }
    }

    // Check for missing features
    for (const feature of requestedFeatures) {
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
  static checkStructuralIntegrity(blueprint) {
    const penalties = [];
    let score = 1.0;

    // Ensure there's a foundation (operations at y=0 or y=1)
    const hasFoundation = blueprint.steps.some(step => {
      return step.from?.y <= 1 || step.to?.y <= 1 || step.pos?.y <= 1;
    });

    if (!hasFoundation) {
      penalties.push('No foundation detected');
      score *= 0.9;
    }

    // Check for walls
    const hasWalls = blueprint.steps.some(step => {
      return step.op.includes('wall') || step.op === 'hollow_box';
    });

    if (!hasWalls) {
      penalties.push('No walls detected');
      score *= 0.8;
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

    // Allow 10% tolerance
    const tolerance = 0.1;

    if (Math.abs(actual.width - planned.width) / planned.width > tolerance) {
      penalties.push(`Width mismatch: planned ${planned.width}, got ${actual.width}`);
      score *= 0.95;
    }

    if (Math.abs(actual.height - planned.height) / planned.height > tolerance) {
      penalties.push(`Height mismatch: planned ${planned.height}, got ${actual.height}`);
      score *= 0.95;
    }

    if (Math.abs(actual.depth - planned.depth) / planned.depth > tolerance) {
      penalties.push(`Depth mismatch: planned ${planned.depth}, got ${actual.depth}`);
      score *= 0.95;
    }

    return { score, penalties };
  }
}
```

### 4.3 Enhanced Stage 4 Validator

**Updates to `src/stages/4-validator.js`:**

```javascript
import { WorldEditValidator } from '../validation/worldedit-validator.js';
import { QualityValidator } from '../validation/quality-validator.js';

export async function validateBlueprint(blueprint, allowlist, designPlan, geminiClient) {
  const errors = [];

  // Existing validations...
  // 1. JSON schema validation
  // 2. Block allowlist check
  // 3. Coordinate bounds check

  // NEW: WorldEdit operation validation
  const weValidation = WorldEditValidator.validateWorldEditOps(blueprint);
  if (!weValidation.valid) {
    errors.push(...weValidation.errors);
  }

  // NEW: Quality validation
  const qualityCheck = QualityValidator.scoreBlueprint(blueprint, designPlan);

  if (!qualityCheck.passed) {
    errors.push(
      `Blueprint quality too low: ${(qualityCheck.score * 100).toFixed(1)}% ` +
      `(minimum: ${SAFETY_LIMITS.minQualityScore * 100}%)`
    );
    errors.push(...qualityCheck.penalties);
  }

  // If errors found, attempt repair
  if (errors.length > 0) {
    console.log(`Validation errors found (${errors.length}), attempting repair...`);

    // Enhanced repair prompt includes quality feedback
    const repairedBlueprint = await geminiClient.repairBlueprint(
      blueprint,
      errors,
      designPlan,
      allowlist,
      qualityCheck  // Pass quality score for context
    );

    // Recursive validation (max retries enforced in gemini-client)
    return validateBlueprint(repairedBlueprint, allowlist, designPlan, geminiClient);
  }

  console.log('✓ Blueprint validation passed');
  console.log(`  Quality score: ${(qualityCheck.score * 100).toFixed(1)}%`);
  console.log(`  WorldEdit commands: ${weValidation.stats.worldEditCommands}`);
  console.log(`  Total operations: ${blueprint.steps.length}`);

  return {
    valid: true,
    blueprint,
    errors: [],
    quality: qualityCheck,
    worldedit: weValidation.stats
  };
}
```

### 4.4 Anti-Spam Protection

**Rate Limiting Strategy:**

1. **WorldEdit Commands:** 5 commands/second (200ms delay)
2. **Vanilla Placement:** 50 blocks/second (20ms delay) via setBlock
3. **Chat Commands:** 2 commands/second (500ms delay) for /setblock
4. **Adaptive Throttling:** Detect "command spam" warnings and back off

**Implementation in `src/worldedit/executor.js`:**

```javascript
export class WorldEditExecutor {
  constructor(bot) {
    this.bot = bot;
    this.spamDetected = false;
    this.backoffMultiplier = 1.0;

    // Listen for spam warnings
    this.bot.on('message', (message) => {
      const text = message.toString().toLowerCase();

      if (text.includes('spam') ||
          text.includes('too fast') ||
          text.includes('slow down')) {
        console.warn('Spam warning detected, increasing delays...');
        this.spamDetected = true;
        this.backoffMultiplier = Math.min(this.backoffMultiplier * 2, 4.0);
      }
    });
  }

  async executeCommand(command, options = {}) {
    // Apply backoff if spam detected
    const baseDelay = SAFETY_LIMITS.worldEdit.commandMinDelayMs;
    const effectiveDelay = baseDelay * this.backoffMultiplier;

    // ... rest of rate limiting logic
  }

  resetBackoff() {
    this.spamDetected = false;
    this.backoffMultiplier = 1.0;
  }
}
```

---

## 5. ROLLOUT STEPS

### Phase 1: Foundation (Week 1)

**Goal:** Prepare architecture without breaking existing functionality

1. **Add new configuration**
   - Update `src/config/limits.js` with WorldEdit limits
   - Create `src/config/operations-registry.js`
   - Add feature flags for gradual rollout

2. **Create validation layer**
   - Implement `src/validation/worldedit-validator.js`
   - Implement `src/validation/quality-validator.js`
   - Add unit tests for validators

3. **Enhance schemas**
   - Update `src/config/schemas.js` with new operation types
   - Add `execution_plan` field to blueprint schema
   - Add `detail_blocks` field to design plan schema

4. **Testing**
   - Run existing builds to ensure no regression
   - Validate schema changes don't break LLM generation

### Phase 2: WorldEdit Core (Week 2)

**Goal:** Implement WorldEdit execution layer with fallback

1. **WorldEdit executor**
   - Implement `src/worldedit/executor.js`
   - Add capability detection
   - Implement rate limiting and spam protection

2. **WorldEdit operations**
   - Create `src/operations/we-fill.js`
   - Create `src/operations/we-walls.js`
   - Create `src/operations/we-pyramid.js`
   - Each includes fallback vanilla operation

3. **Builder refactor**
   - Update `src/stages/5-builder.js` with WorldEdit support
   - Add `executeWorldEditOperation()` method
   - Implement fallback mechanism

4. **Testing**
   - Test WorldEdit detection (with and without plugin)
   - Test command execution with rate limiting
   - Test fallback when WorldEdit unavailable
   - Test spam detection and backoff

### Phase 3: Detail Operations (Week 3)

**Goal:** Add architectural detail support for higher fidelity

1. **Detail operations**
   - Create `src/operations/stairs.js`
   - Create `src/operations/slab.js`
   - Create `src/operations/door.js`
   - Create `src/operations/fence-connect.js`

2. **Complex operations**
   - Create `src/operations/spiral-staircase.js`
   - Create `src/operations/balcony.js`
   - Create `src/operations/roof-hip.js`

3. **Update operation map**
   - Register all new operations in `5-builder.js`
   - Update blueprint schema with new operation types

4. **Testing**
   - Test each detail operation individually
   - Test complex operations decomposition
   - Verify orientation/rotation handling

### Phase 4: LLM Enhancements (Week 4)

**Goal:** Improve prompt quality for better LLM generation

1. **Enhanced design planner**
   - Update `src/llm/prompts/design-plan.js`
   - Add detail blocks guidance
   - Add architectural best practices

2. **WorldEdit blueprint generator**
   - Create `src/llm/prompts/blueprint-worldedit.js`
   - Add operation selection guidance (when to use WE vs vanilla)
   - Add optimization strategies

3. **Quality-aware repair**
   - Update `src/llm/gemini-client.js` repair method
   - Pass quality score to LLM for context
   - Add feature completion feedback

4. **Testing**
   - Test design plan generation with various prompts
   - Test blueprint generation with WorldEdit ops
   - Test repair with quality feedback
   - A/B test quality scores before/after

### Phase 5: Validation & Safety (Week 5)

**Goal:** Comprehensive validation before production

1. **Integrate validators**
   - Update `src/stages/4-validator.js` with new validators
   - Add quality scoring to validation flow
   - Add WorldEdit-specific checks

2. **Safety limits enforcement**
   - Test all limit enforcement points
   - Verify selection size limits
   - Verify command count limits
   - Test backoff mechanism

3. **Error handling**
   - Comprehensive error messages
   - Graceful degradation
   - Audit logging for all WorldEdit commands

4. **Testing**
   - Edge case testing (max limits)
   - Failure testing (invalid commands, missing permissions)
   - Load testing (multiple concurrent builds)

### Phase 6: End-to-End Testing & Tuning (Week 6)

**Goal:** Full system validation and optimization

1. **Integration testing**
   - Test complete flow: prompt → WorldEdit build
   - Test complete flow: prompt → vanilla fallback
   - Test mixed WorldEdit + vanilla builds

2. **Performance benchmarking**
   - Measure build speed: WorldEdit vs vanilla
   - Measure quality scores across test cases
   - Measure LLM token usage

3. **User acceptance testing**
   - Test with diverse prompts (simple house → complex castle)
   - Verify feature completeness
   - Collect quality metrics

4. **Documentation**
   - Update README with WorldEdit setup
   - Document new operations and examples
   - Create troubleshooting guide

### Rollout Decision Gates

**Each phase requires:**
- ✅ All unit tests passing
- ✅ Integration tests passing
- ✅ No regression in existing functionality
- ✅ Code review completed
- ✅ Documentation updated

**Production release requires:**
- ✅ All 6 phases complete
- ✅ Quality score average >85% on test suite
- ✅ Build speed improvement >50x for large builds
- ✅ Feature completeness >90%
- ✅ Zero critical bugs

---

## 6. TEST PLAN

### 6.1 Unit Tests

**`tests/unit/worldedit-executor.test.js`**
```javascript
describe('WorldEditExecutor', () => {
  test('detects WorldEdit availability', async () => {
    // Mock bot with WorldEdit
    // Verify detection returns true
  });

  test('enforces rate limiting', async () => {
    // Execute multiple commands
    // Verify delays between commands
  });

  test('validates command format', () => {
    // Test valid and invalid commands
    // Verify allowlist enforcement
  });

  test('enforces selection size limits', async () => {
    // Attempt oversized selection
    // Verify error thrown
  });

  test('handles spam detection', async () => {
    // Simulate spam warning
    // Verify backoff applied
  });
});
```

**`tests/unit/worldedit-validator.test.js`**
```javascript
describe('WorldEditValidator', () => {
  test('validates selection volume', () => {
    // Test within and exceeding limits
  });

  test('requires fallback for WorldEdit ops', () => {
    // Test blueprint with missing fallback
    // Verify error
  });

  test('counts WorldEdit commands', () => {
    // Blueprint with multiple WE ops
    // Verify correct count
  });
});
```

**`tests/unit/quality-validator.test.js`**
```javascript
describe('QualityValidator', () => {
  test('detects missing features', () => {
    // Design plan requests door
    // Blueprint has no door operation
    // Verify penalty applied
  });

  test('checks structural integrity', () => {
    // Blueprint with no foundation
    // Verify penalty
  });

  test('validates proportions', () => {
    // Blueprint dimensions don't match design
    // Verify penalty
  });

  test('calculates quality score', () => {
    // Perfect blueprint → score = 1.0
    // Missing feature → score < 1.0
  });
});
```

### 6.2 Integration Tests

**`tests/integration/worldedit-flow.test.js`**
```javascript
describe('WorldEdit Integration', () => {
  test('executes WorldEdit fill operation', async () => {
    // Create blueprint with we_fill
    // Execute with mocked WorldEdit bot
    // Verify correct commands sent
  });

  test('falls back to vanilla on WorldEdit failure', async () => {
    // WorldEdit command fails
    // Verify fallback operation executed
  });

  test('handles mixed WorldEdit + vanilla blueprint', async () => {
    // Blueprint with both op types
    // Verify both execution paths work
  });
});
```

**`tests/integration/full-pipeline.test.js`**
```javascript
describe('Full Pipeline with WorldEdit', () => {
  test('simple house with WorldEdit', async () => {
    const prompt = 'oak house 10x10';
    // Run all 5 stages
    // Verify WorldEdit used for walls/foundation
    // Verify vanilla used for door/windows
    // Verify quality score >0.8
  });

  test('complex build with details', async () => {
    const prompt = 'modern mansion with balcony and spiral staircase';
    // Run full pipeline
    // Verify all features present
    // Verify quality score >0.85
  });

  test('fallback when WorldEdit unavailable', async () => {
    const prompt = 'stone tower';
    // Mock WorldEdit unavailable
    // Verify build completes with vanilla ops
  });
});
```

### 6.3 Performance Tests

**`tests/performance/build-speed.test.js`**
```javascript
describe('Build Performance', () => {
  test('WorldEdit vs vanilla for large build', async () => {
    const largeBuild = {
      size: { width: 50, height: 30, depth: 50 },
      // ~75,000 blocks
    };

    // Execute with WorldEdit
    const weTime = await measureBuildTime(largeBuild, true);

    // Execute with vanilla
    const vanillaTime = await measureBuildTime(largeBuild, false);

    // Verify WorldEdit is >50x faster
    expect(weTime).toBeLessThan(vanillaTime / 50);
  });
});
```

### 6.4 Test Suite

**Test Cases Covering:**

1. **Simple Builds**
   - "oak house" → Expect: 4 walls, door, roof, quality >0.8
   - "stone tower" → Expect: cylindrical shape, quality >0.7
   - "flat roof building" → Expect: flat roof operation used

2. **Complex Builds**
   - "mansion with balcony and spiral staircase" → Expect: all features present, quality >0.85
   - "castle with towers and moat" → Expect: multiple towers, water fill, quality >0.8
   - "modern glass skyscraper" → Expect: glass windows, height >20, quality >0.8

3. **Edge Cases**
   - Max size build (100x100x100) → Expect: builds successfully or errors gracefully
   - Single block build → Expect: uses vanilla set operation
   - Invalid blocks in prompt → Expect: filtered out in stage 2

4. **Error Handling**
   - WorldEdit unavailable → Expect: fallback to vanilla
   - Selection too large → Expect: split into smaller selections or error
   - Command spam warning → Expect: backoff applied
   - Invalid operation → Expect: skip with warning

5. **Quality Validation**
   - "house with door" but blueprint has no door → Expect: repair triggered
   - Dimensions mismatch → Expect: quality penalty
   - No foundation → Expect: quality penalty

### 6.5 Acceptance Criteria

**For production release:**

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Build Speed (>1000 blocks) | >50x faster with WE | Performance tests |
| Quality Score (average) | >85% | Test suite average |
| Feature Completeness | >90% | QualityValidator stats |
| Fallback Success Rate | >95% | Integration tests |
| Zero Kicks/Bans | 100% | Manual testing |
| Regression Rate | <2% | Existing test suite |

---

## 7. CONFIGURATION EXAMPLES

### 7.1 Environment Variables

**`.env` additions:**
```bash
# Existing
GEMINI_API_KEY=your_key_here
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=B.O.B
MINECRAFT_VERSION=1.20.1

# NEW: WorldEdit feature flags
WORLDEDIT_ENABLED=true
WORLDEDIT_MAX_SELECTION_VOLUME=50000
WORLDEDIT_MAX_COMMANDS_PER_BUILD=100
WORLDEDIT_FALLBACK_ON_ERROR=true

# NEW: Quality settings
MIN_QUALITY_SCORE=0.7
REQUIRE_FEATURE_COMPLETION=true
```

### 7.2 Server Setup Requirements

**Minecraft Server Configuration:**

1. **Install WorldEdit plugin**
   ```bash
   # Download WorldEdit for your server type
   # Bukkit/Spigot/Paper: WorldEdit-bukkit-7.3.0.jar
   # Fabric: WorldEdit-fabric-7.3.0.jar

   # Place in plugins/ or mods/ directory
   # Restart server
   ```

2. **Grant bot permissions**
   ```yaml
   # permissions.yml or via LuckPerms/PermissionsEx
   B.O.B:
     permissions:
       - worldedit.selection.*
       - worldedit.region.set
       - worldedit.region.walls
       - worldedit.region.replace
       - worldedit.generation.pyramid
       - worldedit.generation.cylinder
       - worldedit.generation.sphere
       - minecraft.command.setblock
       - minecraft.command.tp
   ```

3. **Configure WorldEdit limits**
   ```yaml
   # config/worldedit/worldedit.yml
   limits:
     default:
       max-blocks-changed: 50000
       max-polygonal-points: -1
       max-radius: 50

   history:
     size: 15
     expiration: 10
   ```

---

## 8. RISK MITIGATION

### 8.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| WorldEdit plugin not installed | High | Capability detection + vanilla fallback |
| WorldEdit permissions denied | High | Permission check on init + fallback |
| Command spam kicks bot | High | Rate limiting + adaptive backoff |
| Selection size too large | Medium | Validation + auto-split large operations |
| LLM generates invalid WE commands | Medium | Command validation + repair loop |
| Build exceeds time limits | Medium | Progress tracking + chunked execution |

### 8.2 Quality Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Missing requested features | High | QualityValidator feature detection |
| Poor architectural proportions | Medium | Proportion checking in validation |
| Inefficient operation selection | Medium | LLM prompt guidance for optimization |
| LLM hallucinated blocks | Low | Allowlist enforcement in stage 2 |

### 8.3 Operational Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Increased LLM token costs | Medium | Token tracking + usage alerts |
| Server performance degradation | Medium | Rate limiting + max command limits |
| Increased build times (fallback) | Medium | User notification when using fallback |
| Debugging complexity | Low | Comprehensive logging + execution audit trail |

---

## 9. SUCCESS METRICS

### 9.1 Quantitative Metrics

**Performance:**
- Build speed: **Target >50x** faster for builds >1000 blocks (WorldEdit vs vanilla)
- Build time: **Target <30 seconds** for typical house (current: ~5 minutes)

**Quality:**
- Quality score: **Target >85%** average across test suite
- Feature completeness: **Target >90%** (requested features present)
- Structural integrity: **Target 100%** (foundation + walls + roof)

**Reliability:**
- Fallback success rate: **Target >95%**
- Build success rate: **Target >98%** (no crashes/timeouts)
- Zero kicks: **Target 100%** (no spam warnings)

### 9.2 Qualitative Metrics

**User Experience:**
- Natural language understanding improves (complex prompts work)
- Builds look more "professional" (details, proportions)
- Fewer "that's not what I asked for" issues

**Code Quality:**
- Maintainable architecture (clear separation of concerns)
- Comprehensive test coverage (>80%)
- Good documentation (setup guides, troubleshooting)

---

## 10. FUTURE ENHANCEMENTS

**Post-launch improvements (not in scope for initial rollout):**

1. **Multi-structure builds** - "village with 5 houses" generates multiple buildings
2. **Schematic import/export** - Save/load builds via WorldEdit schematics
3. **Terrain modification** - Flatten, terraform, or landscape before building
4. **Interior decoration** - Furniture, lighting, storage placement
5. **Redstone integration** - Functional doors, lighting systems, traps
6. **Collaborative building** - Multiple bots working in parallel
7. **Build templates** - Pre-defined architectural styles and patterns
8. **AI-driven iteration** - "Make it bigger", "Add another floor" commands

---

## APPENDIX A: OPERATION REFERENCE

### Vanilla Operations (Existing)

| Operation | Purpose | Parameters | Performance |
|-----------|---------|------------|-------------|
| `fill` | Solid rectangular fill | from, to, block | ~50 blocks/sec |
| `hollow_box` | Hollow structure | from, to, block | ~50 blocks/sec |
| `set` | Single block | pos, block | ~50 blocks/sec |
| `line` | Line of blocks | from, to, block | ~50 blocks/sec |
| `window_strip` | Spaced windows | from, to, block, spacing | ~50 blocks/sec |
| `roof_gable` | Triangle roof | from, to, block, peakHeight | ~50 blocks/sec |
| `roof_flat` | Flat roof | from, to, block | ~50 blocks/sec |

### Vanilla Operations (New - Detail)

| Operation | Purpose | Parameters | Use Case |
|-----------|---------|------------|----------|
| `stairs` | Oriented stairs | pos, block, facing, half | Stair systems |
| `slab` | Top/bottom slabs | pos, block, half | Floors, ceilings |
| `fence_connect` | Fence line | from, to, block | Railings, barriers |
| `door` | Door placement | pos, block, facing, half | Entrances |

### WorldEdit Operations (New)

| Operation | Purpose | WE Command | Max Volume | Fallback |
|-----------|---------|------------|------------|----------|
| `we_fill` | Large fill | `//set` | 50,000 | `fill` |
| `we_walls` | Hollow structure | `//walls` | 50,000 | `hollow_box` |
| `we_pyramid` | Pyramid/roof | `//pyramid` | 50,000 | `roof_gable` |
| `we_cylinder` | Tower/column | `//cyl` | 50,000 | Custom stack |
| `we_sphere` | Dome | `//sphere` | 50,000 | Custom stack |
| `we_replace` | Material swap | `//replace` | 50,000 | Iterate replace |

---

## APPENDIX B: EXAMPLE BLUEPRINTS

### Example 1: Simple House (Vanilla)

```json
{
  "size": { "width": 10, "height": 8, "depth": 10 },
  "palette": ["oak_planks", "oak_log", "glass_pane", "oak_door", "oak_stairs"],
  "execution_plan": {
    "worldedit_available": false,
    "estimated_blocks": 450,
    "operations_count": { "worldedit": 0, "vanilla": 8 }
  },
  "steps": [
    { "op": "fill", "block": "oak_planks", "from": {0,0,0}, "to": {10,1,10} },
    { "op": "hollow_box", "block": "oak_log", "from": {0,1,0}, "to": {10,6,10} },
    { "op": "fill", "block": "oak_planks", "from": {0,6,0}, "to": {10,6,10} },
    { "op": "window_strip", "block": "glass_pane", "from": {1,3,0}, "to": {9,3,0}, "spacing": 2 },
    { "op": "door", "block": "oak_door", "pos": {5,1,0}, "facing": "south" },
    { "op": "roof_gable", "block": "oak_stairs", "from": {0,6,0}, "to": {10,8,10}, "peakHeight": 2 }
  ]
}
```

### Example 2: Large Castle (WorldEdit)

```json
{
  "size": { "width": 50, "height": 40, "depth": 50 },
  "palette": ["stone_bricks", "cobblestone", "stone_brick_stairs", "glass_pane"],
  "execution_plan": {
    "worldedit_available": true,
    "estimated_blocks": 35000,
    "operations_count": { "worldedit": 12, "vanilla": 25 }
  },
  "steps": [
    {
      "op": "we_fill",
      "block": "cobblestone",
      "from": {0,0,0},
      "to": {50,2,50},
      "fallback": { "op": "fill", "from": {0,0,0}, "to": {50,2,50}, "block": "cobblestone" }
    },
    {
      "op": "we_walls",
      "block": "stone_bricks",
      "from": {0,2,0},
      "to": {50,20,50},
      "fallback": { "op": "hollow_box", "from": {0,2,0}, "to": {50,20,50}, "block": "stone_bricks" }
    },
    {
      "op": "we_cylinder",
      "block": "stone_bricks",
      "base": {5,2,5},
      "radius": 5,
      "height": 30,
      "fallback": { "op": "fill", "from": {0,2,0}, "to": {10,32,10}, "block": "stone_bricks" }
    },
    { "op": "door", "block": "oak_door", "pos": {25,3,0}, "facing": "south" }
    // ... more ops
  ]
}
```

---

## SUMMARY

This plan provides a comprehensive roadmap to:

1. **Improve build accuracy** through enhanced LLM prompts, quality validation, and detail operations
2. **Integrate WorldEdit** for 50-100x faster large builds with graceful fallback
3. **Maintain safety** through multi-layer validation, rate limiting, and spam protection
4. **Ensure reliability** with comprehensive testing and gradual rollout

The architecture preserves the existing 5-stage pipeline while adding:
- WorldEdit capability detection and execution
- Quality scoring and feature completeness validation
- Detail operations for architectural fidelity
- Adaptive fallback mechanisms

Implementation follows a 6-week phased rollout with clear decision gates and acceptance criteria.

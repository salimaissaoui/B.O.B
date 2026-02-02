# Builder v2 Specification

## Overview

Builder v2 is a complete refactoring of B.O.B's build pipeline, introducing strict layered contracts, deterministic compilation, and generalized "build anything" capability without hardcoding build types.

**Key Principles:**
1. **Strict Layering** - Each stage has versioned input/output contracts
2. **Determinism After LLM** - All post-LLM stages produce identical output for identical input
3. **JSON-Only LLM Output** - No prose, strict parsing with retry
4. **Component-Based Design** - Parametric, reusable building blocks
5. **Style Separation** - Aesthetics decoupled from structure
6. **Graceful Degradation** - Block substitution, fallbacks, resume

---

## Data Contracts

### BuildIntentV2 (Non-LLM Analyzer Output)

```typescript
interface BuildIntentV2 {
  version: "2.0";
  id: string;                    // UUID for tracking
  timestamp: string;             // ISO timestamp

  // User request
  prompt: {
    raw: string;                 // Original user prompt
    normalized: string;          // Cleaned/normalized
    language: string;            // Detected language (en, etc.)
  };

  // Detected intent (non-LLM extraction)
  intent: {
    category: "landmark" | "architecture" | "organic" | "statue" | "pixel_art" | "abstract";
    subcategory?: string;        // "tower", "house", "tree", etc.
    reference?: string;          // "eiffel tower", "pikachu", etc.
    scale: "tiny" | "small" | "medium" | "large" | "massive" | "colossal";
    complexity: "simple" | "moderate" | "complex" | "intricate";
  };

  // Constraints
  constraints: {
    dimensions?: {
      width?: number | { min: number; max: number };
      height?: number | { min: number; max: number };
      depth?: number | { min: number; max: number };
    };
    materials?: {
      required?: string[];       // Must include
      preferred?: string[];      // Suggestions
      forbidden?: string[];      // Exclude
    };
    features?: string[];         // "interior", "lighting", "furnished"
    style?: string;              // "medieval", "modern", "gothic"
  };

  // Context
  context: {
    worldEditAvailable: boolean;
    serverVersion: string;
    hasImageReference: boolean;
    imageAnalysis?: object;      // From reference stage
  };
}
```

**JSON Schema:** `src/builder_v2/schemas/build-intent-v2.schema.json`

### BuildSceneV2 (LLM Output)

```typescript
interface BuildSceneV2 {
  version: "2.0";
  intentId: string;              // Reference to BuildIntentV2.id

  // Scene description
  description: {
    title: string;               // Short name
    summary: string;             // 1-2 sentences
  };

  // Overall bounds
  bounds: {
    width: number;
    height: number;
    depth: number;
  };

  // Style tokens (resolved by StyleEngine)
  style: {
    palette: {
      primary: string;           // Semantic token: "stone_dark" or block name
      secondary: string;
      accent: string;
      trim?: string;
      glass?: string;
      light?: string;
    };
    theme: string;               // "medieval", "modern", "organic"
    gradient?: {
      direction: "up" | "down";
      intensity: "subtle" | "moderate" | "strong";
    };
  };

  // Scene graph of components
  components: ComponentNode[];

  // Interior directives (if applicable)
  interiors?: InteriorDirective[];

  // Detail passes to apply
  detailPasses?: string[];       // "edge_trim", "lighting", "landscaping"
}

interface ComponentNode {
  id: string;                    // Unique ID within scene
  type: string;                  // Component type: "lattice_tower", "room", "dome"

  // Transform (relative to parent or scene origin)
  transform: {
    position: { x: number; y: number; z: number };
    rotation?: 0 | 90 | 180 | 270;  // Y-axis rotation
    scale?: number;              // Uniform scale factor
  };

  // Component parameters
  params: Record<string, any>;   // Type-specific parameters

  // Nested children
  children?: ComponentNode[];

  // Material overrides
  materials?: Record<string, string>;
}

interface InteriorDirective {
  roomId: string;                // Reference to ComponentNode
  type: "bedroom" | "kitchen" | "workshop" | "library" | "throne" | "storage";
  style: string;                 // "cozy", "grand", "rustic"
  features: string[];            // "bed", "desk", "furnace"
}
```

**JSON Schema:** `src/builder_v2/schemas/build-scene-v2.schema.json`

### BuildPlanV2 (Deterministic Expansion)

```typescript
interface BuildPlanV2 {
  version: "2.0";
  sceneId: string;               // Reference to BuildSceneV2

  // Deterministic hash (same scene + seed = same hash)
  hash: string;                  // SHA-256 of normalized plan
  seed: number;                  // Random seed for determinism

  // Resolved bounds
  bounds: {
    width: number;
    height: number;
    depth: number;
  };

  // Resolved palette (all valid Minecraft blocks)
  palette: Record<string, string>;

  // Geometry primitives
  geometry: GeometryPrimitive[];

  // Statistics
  stats: {
    totalBlocks: number;
    uniqueBlocks: number;
    componentsExpanded: number;
    detailPassesApplied: number;
  };
}

interface GeometryPrimitive {
  id: string;
  type: "box" | "hollow_box" | "sphere" | "cylinder" | "pyramid" |
        "line" | "set" | "stairs" | "door" | "pixel_art";

  // Absolute coordinates (relative to build origin 0,0,0)
  from?: { x: number; y: number; z: number };
  to?: { x: number; y: number; z: number };
  pos?: { x: number; y: number; z: number };
  center?: { x: number; y: number; z: number };
  base?: { x: number; y: number; z: number };

  // Parameters
  block: string;                 // Resolved Minecraft block name
  radius?: number;
  height?: number;
  hollow?: boolean;
  facing?: string;

  // Metadata
  sourceComponent?: string;      // Which component generated this
  layer?: number;                // Build order layer
}
```

**JSON Schema:** `src/builder_v2/schemas/build-plan-v2.schema.json`

### PlacementPlanV2 (Compiled Execution Plan)

```typescript
interface PlacementPlanV2 {
  version: "2.0";
  planId: string;                // Reference to BuildPlanV2
  hash: string;                  // SHA-256 for verification

  // Execution strategy
  strategy: {
    preferWorldEdit: boolean;
    batchSize: number;           // Max blocks per batch
    checkpointInterval: number;  // Blocks between checkpoints
  };

  // WorldEdit batches
  worldEditBatches: WorldEditBatch[];

  // Vanilla placements (for non-WE or fallback)
  vanillaPlacements: VanillaPlacement[];

  // Checkpoints for resume
  checkpoints: Checkpoint[];

  // Statistics
  stats: {
    worldEditCommands: number;
    worldEditBlocks: number;
    vanillaBlocks: number;
    estimatedTime: number;       // Seconds (based on rate limits)
  };
}

interface WorldEditBatch {
  id: number;
  command: "set" | "walls" | "pyramid" | "cylinder" | "sphere" | "replace";
  from?: { x: number; y: number; z: number };
  to?: { x: number; y: number; z: number };
  center?: { x: number; y: number; z: number };
  base?: { x: number; y: number; z: number };
  block: string;
  params?: Record<string, any>;
  estimatedBlocks: number;
  checkpointAfter: boolean;
}

interface VanillaPlacement {
  x: number;
  y: number;
  z: number;
  block: string;
  batchId?: number;              // Grouping for optimization
}

interface Checkpoint {
  id: number;
  afterBatch?: number;
  afterVanillaIndex?: number;
  description: string;
}
```

**JSON Schema:** `src/builder_v2/schemas/placement-plan-v2.schema.json`

---

## Component Library

### Available Components

#### Structural Components

| Component | Parameters | Description |
|-----------|------------|-------------|
| `lattice_tower` | `height`, `baseWidth`, `taperRatio`, `legCount`, `platforms[]` | Eiffel-style lattice tower |
| `arch` | `width`, `height`, `thickness`, `style` | Various arch styles |
| `truss` | `length`, `height`, `style` | Structural trusses |
| `column` | `height`, `radius`, `style`, `capital` | Columns with capitals |
| `beam` | `from`, `to`, `thickness` | Horizontal beams |
| `platform` | `width`, `depth`, `thickness`, `railings` | Platforms with optional railings |
| `staircase` | `height`, `style`, `direction` | Regular/spiral stairs |

#### Room/Building Components

| Component | Parameters | Description |
|-----------|------------|-------------|
| `room` | `width`, `height`, `depth`, `openings[]` | Basic room box |
| `corridor` | `length`, `width`, `height`, `doors[]` | Connecting corridors |
| `floorplan` | `layout[][]`, `wallHeight` | Multi-room floorplan |
| `building_shell` | `width`, `depth`, `floors`, `roofStyle` | Complete building shell |

#### Roof Components

| Component | Parameters | Description |
|-----------|------------|-------------|
| `roof_gable` | `width`, `depth`, `pitch`, `overhang` | Gable roof |
| `roof_hip` | `width`, `depth`, `pitch` | Hip roof |
| `roof_dome` | `radius`, `height`, `style` | Dome/cupola |
| `roof_spire` | `baseRadius`, `height` | Pointed spire |
| `roof_flat` | `width`, `depth`, `parapet` | Flat roof with parapet |

#### Organic/Statue Components

| Component | Parameters | Description |
|-----------|------------|-------------|
| `sphere` | `radius`, `hollow` | Basic sphere |
| `ellipsoid` | `radiusX`, `radiusY`, `radiusZ` | Ellipsoid |
| `cylinder` | `radius`, `height`, `hollow` | Cylinder |
| `cone` | `baseRadius`, `height` | Cone |
| `blob` | `points[]`, `smoothing` | Organic blob from points |
| `statue_armature` | `segments[]`, `symmetry` | Humanoid armature |

#### Decoration Components

| Component | Parameters | Description |
|-----------|------------|-------------|
| `window_row` | `count`, `spacing`, `style` | Row of windows |
| `door_frame` | `style`, `arch` | Door with frame |
| `balcony` | `width`, `depth`, `railing` | Protruding balcony |
| `chimney` | `height`, `style` | Chimney with cap |
| `furniture_set` | `type`, `items[]` | Room furniture |
| `lighting_array` | `spacing`, `style` | Lantern/torch array |

---

## Style Engine

### Palette Resolution

The Style Engine resolves semantic tokens to valid Minecraft blocks:

```javascript
const SEMANTIC_PALETTES = {
  medieval: {
    stone_light: "stone_bricks",
    stone_dark: "cobblestone",
    stone_accent: "mossy_stone_bricks",
    wood_primary: "oak_planks",
    wood_log: "oak_log",
    metal: "iron_block",
    glass: "glass_pane",
    light: "lantern"
  },
  modern: {
    stone_light: "white_concrete",
    stone_dark: "gray_concrete",
    stone_accent: "black_concrete",
    wood_primary: "stripped_oak_log",
    metal: "iron_block",
    glass: "glass",
    light: "sea_lantern"
  },
  // ... more themes
};
```

### Gradient Rules

```javascript
const GRADIENT_RULES = {
  up: {
    subtle: { baseShift: -1, topShift: 1, steps: 3 },
    moderate: { baseShift: -2, topShift: 2, steps: 5 },
    strong: { baseShift: -3, topShift: 3, steps: 7 }
  }
};
```

### Trim Rules

```javascript
const TRIM_RULES = {
  corner_pillar: { block: "$accent", pattern: "vertical" },
  window_frame: { block: "$trim", width: 1 },
  base_course: { block: "$stone_dark", height: 1 },
  cornice: { block: "$accent", style: "stepped" }
};
```

---

## Detail Passes

### Pass Definitions

| Pass | Description | Bounded |
|------|-------------|---------|
| `edge_trim` | Add trim to corners and edges | Yes |
| `window_framing` | Frame windows with stairs/trapdoors | Yes |
| `roof_trimming` | Add fascia and soffit to roofs | Yes |
| `interior_furnish` | Place furniture in rooms | Yes |
| `lighting` | Add light sources at intervals | Yes |
| `landscaping` | Basic ground cover around build | Optional cap |

### Pass Implementation

Each pass:
1. Receives `BuildPlanV2` and configuration
2. Analyzes geometry to find applicable locations
3. Generates additional `GeometryPrimitive[]`
4. Returns modified plan with stable seed

---

## LLM Prompt Hardening

### System Prompt Structure

```
[ROLE]
You are a Minecraft architect AI. Output ONLY valid JSON.

[SCHEMA]
{condensed BuildSceneV2 schema}

[EXAMPLES]
{2-3 few-shot examples}

[BLOCK TOKENS]
Use semantic tokens: "stone_dark", "wood_primary" etc.
The style engine will resolve to valid Minecraft blocks.

[CONSTRAINTS]
- No markdown, no comments, no prose
- All coordinates must be >= 0
- Component types must be from the allowed list
- Array lengths must match dimensions
```

### Retry Strategy

```
Attempt 1: Standard prompt
  ↓ (parse error)
Attempt 2: Include error in prompt, demand fix
  ↓ (parse error)
Attempt 3: Simplified scene with deterministic expansion
  ↓ (still failing)
Return error with diagnostics
```

### Error Recovery

If LLM output is invalid:
1. Log raw output for debugging
2. Attempt JSON extraction (find `{...}` in response)
3. Attempt partial schema validation
4. Fall back to deterministic baseline

---

## Block Substitution

### Substitution Table

```javascript
const SUBSTITUTION_TABLE = {
  // Modern blocks → Classic fallbacks
  "polished_blackstone_bricks": ["stone_bricks", "cobblestone"],
  "deepslate_bricks": ["stone_bricks", "cobblestone"],
  "calcite": ["quartz_block", "white_concrete"],
  "tuff": ["andesite", "stone"],
  // Colored blocks
  "white_concrete": ["quartz_block", "white_wool"],
  "black_concrete": ["obsidian", "black_wool"],
  // Decorative
  "lantern": ["torch", "glowstone"],
  "soul_lantern": ["torch", "glowstone"],
  "chain": ["iron_bars", "air"]
};
```

### Resolution Algorithm

```javascript
function resolveBlock(blockName, serverVersion) {
  if (isValidBlock(blockName, serverVersion)) {
    return blockName;
  }

  const substitutes = SUBSTITUTION_TABLE[blockName];
  if (substitutes) {
    for (const sub of substitutes) {
      if (isValidBlock(sub, serverVersion)) {
        console.warn(`Substituted ${blockName} → ${sub}`);
        return sub;
      }
    }
  }

  throw new Error(`NO_VALID_SUBSTITUTE: ${blockName}`);
}
```

---

## Validation

### Schema Validators

All schemas have AJV validators with clear error codes:

| Code | Meaning |
|------|---------|
| `INVALID_VERSION` | Schema version mismatch |
| `MISSING_REQUIRED` | Required field missing |
| `INVALID_TYPE` | Type mismatch |
| `OUT_OF_BOUNDS` | Coordinate outside limits |
| `INVALID_COMPONENT` | Unknown component type |
| `INVALID_BLOCK` | Block not in registry |
| `CONSTRAINT_VIOLATION` | Safety limit exceeded |

### Deterministic Hashing

```javascript
function hashPlan(plan) {
  // Sort all arrays for consistency
  const normalized = deepSortKeys(plan);
  // Remove non-deterministic fields
  delete normalized.timestamp;
  // SHA-256 hash
  return crypto.createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');
}
```

---

## Feature Flag

### Configuration

```javascript
// Environment variable
BUILDER_V2_ENABLED=true

// Or config file
{
  "builderV2": {
    "enabled": true,
    "dryRunDefault": false,
    "fallbackToV1": true
  }
}
```

### Runtime Toggle

```
!builder v1    # Switch to legacy builder
!builder v2    # Switch to Builder v2
!builder status # Show current mode
```

### Dry Run Mode

```
!build --dry-run a detailed castle

Output:
  Intent: architecture/castle, scale: large
  Scene: 45x60x45, 12 components
  Plan: 1,247 primitives, 45,230 blocks
  Execution: 23 WE batches, ~2.5 min
  Hash: abc123...
```

---

## Directory Structure

```
src/builder_v2/
├── index.js                    # Main exports and feature flag
├── intent/
│   ├── analyzer.js             # BuildIntentV2 generator
│   └── extractors.js           # Prompt extraction utilities
├── llm/
│   ├── scene-generator.js      # BuildSceneV2 via LLM
│   ├── prompts.js              # Hardened prompt templates
│   └── retry.js                # Retry strategy
├── plan/
│   ├── compiler.js             # BuildPlanV2 compiler
│   ├── expanders.js            # Component expansion
│   └── detail-passes.js        # Detail pass implementations
├── compile/
│   ├── placement-compiler.js   # PlacementPlanV2 compiler
│   ├── batching.js             # WorldEdit batch optimization
│   └── ordering.js             # Build order optimization
├── execute/
│   ├── executor.js             # Unified executor
│   ├── worldedit-executor.js   # WorldEdit execution
│   └── vanilla-executor.js     # Vanilla execution
├── style/
│   ├── engine.js               # Style resolution
│   ├── palettes.js             # Theme palettes
│   └── gradients.js            # Gradient rules
├── components/
│   ├── index.js                # Component registry
│   ├── structural/             # Structural components
│   ├── rooms/                  # Room components
│   ├── roofs/                  # Roof components
│   ├── organic/                # Organic components
│   └── decoration/             # Decoration components
├── validate/
│   ├── validators.js           # Schema validators
│   └── substitution.js         # Block substitution
├── persist/
│   ├── state.js                # Build state persistence
│   └── checkpoints.js          # Checkpoint management
├── schemas/
│   ├── build-intent-v2.schema.json
│   ├── build-scene-v2.schema.json
│   ├── build-plan-v2.schema.json
│   └── placement-plan-v2.schema.json
└── utils/
    ├── hash.js                 # Deterministic hashing
    ├── seed.js                 # Seeded random
    └── coordinates.js          # Coordinate utilities
```

---

## Migration Path

1. **Phase 1:** Create v2 infrastructure behind feature flag
2. **Phase 2:** Implement core contracts and validators
3. **Phase 3:** Implement component library (subset)
4. **Phase 4:** Implement style engine
5. **Phase 5:** Implement LLM prompt hardening
6. **Phase 6:** Implement execution engine
7. **Phase 7:** Integration testing with demo prompts
8. **Phase 8:** Gradual rollout via feature flag

---

## Success Criteria

Builder v2 must pass:

1. **Determinism Test:** Same prompt + seed → identical PlacementPlanV2 hash
2. **Schema Tests:** All contracts validate with clear errors
3. **Substitution Test:** Invalid block → valid substitute deterministically
4. **Component Tests:** Each component generates valid geometry
5. **Integration Tests:**
   - "Build a detailed Eiffel Tower with plaza" → compiles
   - "Build a modern house with furnished interior" → compiles
   - "Build a 3D Pikachu statue" → compiles
6. **Resume Test:** Interrupted build resumes from checkpoint
7. **Undo Test:** Build can be undone via WE or vanilla

# Build Pipeline Audit - B.O.B

## Overview

This document provides a comprehensive audit of the current B.O.B (Build Orchestrating Bot) build pipeline architecture. All references point to actual file paths and symbols discovered during code review.

**Project:** B.O.B - AI-Powered Minecraft Building Assistant
**Language:** JavaScript (ES Modules)
**Runtime:** Node.js v18+
**Entry Point:** `src/index.js`
**Build Command:** N/A (interpreted JS)
**Test Command:** `npm test` (Jest)

---

## Current Pipeline Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   0-reference   │───▶│   1-analyzer    │───▶│   2-generator   │───▶│   4-validator   │
│ (optional img)  │    │  (non-LLM)      │    │   (LLM call)    │    │ (schema+repair) │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                                              │
                                                                              ▼
                                                                     ┌─────────────────┐
                                                                     │   5-builder     │
                                                                     │  (execution)    │
                                                                     └─────────────────┘
```

---

## Stage Details

### Stage 0: Reference (Optional)
**File:** `src/stages/0-reference.js`
**Type:** Non-LLM / LLM Vision
**Purpose:** Analyze image references for visual builds

**Key Functions:**
- `referenceStage(analysis, apiKey)` - Main entry point
- Detects image URLs in prompts via `extractImageSource()` in analyzer
- Uses Gemini Vision to analyze reference images

### Stage 1: Analyzer
**File:** `src/stages/1-analyzer.js`
**Type:** Non-LLM (deterministic)
**Purpose:** Lightweight prompt analysis for hints

**Key Functions:**
- `analyzePrompt(userPrompt)` - Main entry point (line 282)
- `detectIntentScale(prompt)` - Scale detection (line 14)
- `inferThemeForPalette(prompt, buildType)` - Theme inference (line 55)
- `enhancedBuildTypeDetection(prompt)` - Build type detection (line 122)
- `extractDimensions(prompt)` - Explicit dimension parsing (line 200)
- `extractMaterial(prompt)` - Material extraction (line 218)

**Output Format (Analysis Object):**
```javascript
{
  userPrompt,
  buildType,           // 'house', 'pixel_art', 'tree', etc.
  buildTypeInfo,       // { type, confidence, reason }
  theme,               // { name, materials }
  quality,             // { quality, modifiers, tips }
  intentScale,         // { scale, matchedKeyword, dimensions }
  themeInference,      // { theme, suggestedPaletteSize, lockPalette }
  character,           // Detected iconic character (Pikachu, etc.)
  imageSource,         // { url, hasImage }
  hints: {
    dimensions,
    materials,
    features,
    size,
    operations,
    explicitDimensions,
    explicitMaterial,
    qualityLevel,
    qualityTips
  },
  libraryBlueprint     // Currently disabled (null)
}
```

### Stage 2: Generator
**File:** `src/stages/2-generator.js`
**Type:** LLM (Gemini API)
**Purpose:** Generate complete blueprint via single LLM call

**Key Functions:**
- `generateBlueprint(analysis, apiKey, worldEditAvailable, reference)` - Main entry (line 65)
- `generatePlatformBlueprint(analysis)` - Deterministic platform (line 25)
- `extractPixelArtSubject(userPrompt)` - Pixel art subject extraction (line 14)

**LLM Prompt:** `src/llm/prompts/unified-blueprint.js`
- `unifiedBlueprintPrompt(analysis, worldEditAvailable, hasImage)` - Main prompt builder (line 326)
- `getBuildTypeGuidance(buildType, hints)` - Build-specific instructions (line 18)
- `getWorldEditGuidance(worldEditAvailable)` - WorldEdit operation reference (line 185)
- `getOperationReference()` - Full operation documentation (line 222)
- `getQualityGuidance(quality)` - Quality-specific instructions (line 276)

**Fast Paths (No LLM):**
1. Library blueprints (currently disabled)
2. Simple platforms with explicit dimensions
3. Procedural generators via `routeProceduralBuild(analysis)` in `src/generators/index.js`

**Retry Strategy:**
- Attempt 1: Streaming mode
- Attempt 2: Non-streaming fallback
- No structured retry-on-parse-failure currently implemented

### Stage 4: Validator
**File:** `src/stages/4-validator.js`
**Type:** Non-LLM + LLM (repair)
**Purpose:** Validate and repair blueprints

**Key Functions:**
- `validateBlueprint(blueprint, analysis, apiKey)` - Main entry (line 64)
- `validateRequiredFields(blueprint)` - Required fields check (line 435)
- `validateMinecraftBlocks(blueprint, version)` - Block validity (line 477)
- `validateOperationParams(blueprint)` - Operation parameter validation (line 347)
- `validateNoPlaceholderTokens(blueprint)` - Placeholder resolution check (line 408)
- `validateCoordinateBounds(blueprint, analysis)` - Bounds checking (line 576)
- `validateFeatures(blueprint, analysis)` - Feature completeness (line 659)
- `validateBuildTypeOperations(blueprint, analysis)` - Build-type guidance (line 539)
- `validateLimits(blueprint)` - Volume/step limits (line 725)

**External Validators:**
- `WorldEditValidator.validateWorldEditOps()` from `src/validation/worldedit-validator.js`
- `QualityValidator.scoreBlueprint()` from `src/validation/quality-validator.js`
- `validateGeometry()` from `src/validation/geometry-validator.js`
- `validateTreeQuality()` from `src/validation/organic-quality.js`
- `validateConnectivity()` from `src/validation/spatial-validator.js`

**Repair:**
- Uses `GeminiClient.repairBlueprint()` for LLM-based repair
- Max retries: `SAFETY_LIMITS.maxRetries` (default: 3)

### Stage 5: Builder (Executor)
**File:** `src/stages/5-builder.js`
**Type:** Execution engine
**Purpose:** Execute blueprints in Minecraft world

**Key Class:** `Builder`
- Constructor: (line 141-189)
- `initialize()` - WorldEdit detection (line 203)
- `executeBlueprint(blueprint, startPos)` - Main execution (line 620)
- `executeVanillaBlocks(blocks, startPos, history)` - Vanilla placement (line 448)
- `executeWorldEditDescriptor(descriptor, startPos)` - WorldEdit execution (line 1126)
- `placeBlockWithRetry(pos, blockType, maxRetries)` - Retry logic (line 584)
- `undo()` - Undo support (line 1604)
- `cancel()` - Cancel support (line 1664)
- `getProgress()` - Progress tracking (line 1678)

**Operation Map:** (line 86-136)
- Universal ops: `box`, `wall`, `outline`, `move`, `cursor_reset`
- Vanilla ops: `fill`, `hollow_box`, `set`, `line`, `window_strip`, etc.
- WorldEdit ops: `we_fill`, `we_walls`, `we_pyramid`, `we_cylinder`, `we_sphere`, `we_replace`
- Special ops: `pixel_art`, `three_d_layers`, `smart_wall`, `smart_floor`, `smart_roof`

---

## WorldEdit Integration

### Executor
**File:** `src/worldedit/executor.js`
**Class:** `WorldEditExecutor`

**Key Methods:**
- `detectWorldEdit()` - Plugin detection (line 172)
- `executeCommand(command, options)` - Rate-limited execution with ACK (line 247)
- `createSelection(from, to)` - Cuboid selection (line 759)
- `performSafeFill(from, to, block)` - Auto-slicing fill (line 787)
- `performSafeWalls(from, to, block)` - Safe walls (line 807)
- `createPyramid(block, height, hollow)` - Pyramid (line 849)
- `createCylinder(block, radius, height, hollow)` - Cylinder (line 857)
- `createSphere(block, radius, hollow)` - Sphere (line 866)
- `undoAll(count)` - Undo tracking (line 1128)

**ACK/Sync Logic:**
- `waitForResponse(matcher, timeoutMs)` - Response listener (line 139)
- `commandExpectsAck(command)` - ACK expectation check (line 466)
- `classifyError(response, command)` - Error classification (line 586)
- Message buffer for multi-line responses (line 87)

**Rate Limiting:**
- Base delay: `SAFETY_LIMITS.worldEdit.commandMinDelayMs` (400ms default)
- Backoff multiplier on spam detection
- Max commands per build: `SAFETY_LIMITS.worldEdit.maxCommandsPerBuild` (2000)

### Selection Slicing
**Method:** `sliceRegion(from, to)` (line 683)
- Recursively splits regions exceeding volume limits
- Max volume: `SAFETY_LIMITS.worldEdit.maxSelectionVolume` (500k)
- Max dimension: `SAFETY_LIMITS.worldEdit.maxSelectionDimension` (250)

---

## Schema Validation

### Schemas
**File:** `src/config/schemas.js`

**Schemas:**
- `designPlanSchema` - High-level design (line 7)
- `blueprintSchema` - Executable blueprint (line 44)

**Validators:**
- `validateDesignPlan` - AJV compiled validator
- `validateBlueprint` - AJV compiled validator
- `getValidationErrors(validator)` - Human-readable errors (line 230)

**Blueprint Required Fields:**
- `size`: `{ width, height, depth }`
- `palette`: Array or object of block names
- `steps`: Array of operations

---

## Vanilla Placement

### Execution Flow
1. `executeBlueprint()` calls `executeVanillaOperation()` or `executeVanillaBlocks()`
2. Blocks sorted by `optimizeBuildOrder()` (bottom-up, distance)
3. Optional batching via `batchBlocksToWorldEdit()` using greedy rectangles
4. Individual placement via `placeBlockWithRetry()`
5. Rate limited by `getPlacementDelayMs()`

### Block Placement
**Method:** `placeBlock(pos, blockType)` (line 1568)
- Priority: `/setblock` command if available
- Fallback: `bot.setBlock()` API
- Rate limiting for chat commands

---

## Undo/Cancel/Resume

### Undo
**Vanilla:** History array of `{ pos, previousBlock }` stored in `this.history`
**WorldEdit:** Tracked via `this.worldEditHistory`, uses `//undo` command
**Method:** `undo()` (line 1604)

### Cancel
**Method:** `cancel()` (line 1664)
- Sets `this.building = false`
- Execution loop checks flag and breaks

### Resume
**File:** `src/state/build-state.js`
**Class:** `BuildStateManager`

**Methods:**
- `startBuild(blueprint, startPos)` - Initialize state tracking
- `updateProgress(progress)` - Periodic updates
- `completeStep(stepIndex)` - Mark step complete
- `completeBuild()` / `failBuild(reason)` - Final status
- `prepareBuildResume(buildId)` - Resume incomplete build

**Persistence:**
- JSON files in `bob-state/` directory
- Auto-save every 10 blocks
- Max 10 state files retained

---

## Safety Systems

### Limits
**File:** `src/config/limits.js`
**Object:** `SAFETY_LIMITS`

**Key Limits:**
- `maxBlocks`: 5,000,000 (effectively unlimited)
- `maxWidth`: 2000
- `maxDepth`: 2000
- `maxHeight`: 256 (Minecraft limit)
- `maxSteps`: 2000
- `buildRateLimit`: 200 blocks/sec
- `maxRetries`: 3
- `minQualityScore`: 0.7

### WorldEdit Limits:
- `maxSelectionVolume`: 500,000
- `maxSelectionDimension`: 250
- `commandMinDelayMs`: 400
- `maxCommandsPerBuild`: 2000

### Loaded World Checks
**File:** `src/validation/world-validator.js`
- `validateBuildArea(bot, startPos, size)` - Chunk validation
- `clampToWorldBoundaries()` - Y-axis clamping
- `scanTerrainFootprint()` - Ground detection
- `WORLD_BOUNDARIES`: `{ MIN_Y: -64, MAX_Y: 320 }`

---

## Block Validity

### Block Validation
**File:** `src/config/blocks.js`
- `isValidBlock(blockName, version)` - Uses minecraft-data registry
- Block categories for semantic grouping
- Version-aware validation

### Version Resolution
**File:** `src/config/version-resolver.js`
- `resolveVersion(bot)` - Cache server version
- `getResolvedVersion()` - Get cached version

---

## Pixel Art Module (READ-ONLY)

**File:** `src/operations/pixel-art.js`
**Status:** IMMUTABLE - DO NOT MODIFY

**Function:** `pixelArt(step)`
- Input: `{ base, grid, legend, facing, frame, frameBlock }`
- Output: Array of `{ x, y, z, block }` placements
- Handles compressed grid format (strings) and legacy format (arrays)
- Supports all cardinal facing directions

---

## Key Dependencies

### External:
- `mineflayer` - Minecraft bot framework
- `mineflayer-pathfinder` - Pathfinding
- `minecraft-data` - Block/item registry
- `prismarine-registry` - Protocol registry
- `@google/generative-ai` - Gemini API
- `ajv` - JSON schema validation
- `sharp` - Image processing

### Internal Utilities:
- `src/utils/normalizer.js` - Blueprint normalization
- `src/utils/blueprint-optimizer.js` - Post-processing
- `src/utils/blueprint-sanitizer.js` - Pre-execution cleanup
- `src/utils/coordinate-parser.js` - CLI coordinate parsing
- `src/operations/universal/cursor.js` - Build cursor tracking
- `src/operations/universal/volume.js` - Universal volume operations

---

## Identified Gaps for Builder v2

1. **No Versioned Contracts** - Data structures not versioned
2. **Non-deterministic LLM Output** - Same prompt can produce different results
3. **Limited Retry Strategy** - No structured parse-failure handling
4. **Hardcoded Build Types** - Generator prompts are build-type specific
5. **No Component Library** - No reusable parametric components
6. **No Style Engine** - Palette/style not separated from structure
7. **No Block Substitution** - Invalid blocks fail instead of substituting
8. **No Dry Run Mode** - Must execute to test blueprint

---

## Test Coverage

**Test Framework:** Jest
**Test Directory:** `tests/`

**Existing Tests:**
- `tests/operations/fill.test.js` - Fill operation
- `tests/operations/pixel-art/` - Pixel art tests
- `tests/stages/analyzer-enhanced.test.js` - Analyzer tests
- `tests/validation/` - Validation tests
- `tests/worldedit/ack-patterns.test.js` - ACK pattern tests
- `tests/utils/normalizer.test.js` - Normalizer tests

**Test Commands:**
```bash
npm test                    # All tests
npm run test:core           # Core tests
npm run test:validation     # Validation tests
npm run test:worldedit      # WorldEdit tests
npm run test:pixel-art      # Pixel art tests
npm run test:coverage       # With coverage
```

---

## Conclusion

The current B.O.B architecture is functional but monolithic. Builder v2 will introduce:
- Strict layer separation with versioned contracts
- Deterministic compilation pipeline
- Component-based building
- Style engine for consistent aesthetics
- Hardened LLM prompts with retry logic
- Feature flag for gradual migration

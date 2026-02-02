# Builder v2 Migration Plan

## Overview

This document outlines the migration strategy from the current B.O.B build pipeline to Builder v2. The migration is designed to be incremental and non-breaking.

---

## Current State

- **Build Pipeline:** 4 stages (Analyzer → Generator → Validator → Builder)
- **LLM Output:** Loosely structured JSON with direct block names
- **Components:** None (monolithic blueprints)
- **Style:** Embedded in LLM prompt
- **Determinism:** Not guaranteed

## Target State

- **Build Pipeline:** 5 stages with versioned contracts
- **LLM Output:** Strict `BuildSceneV2` schema with semantic tokens
- **Components:** Parametric component library
- **Style:** Separate StyleEngine
- **Determinism:** Guaranteed via seeded compilation

---

## Phase 1: Infrastructure Setup

**Duration:** Initial setup
**Risk:** Low

### Tasks

1. Create `src/builder_v2/` directory structure
2. Create JSON Schema files for all contracts
3. Implement AJV validators with error codes
4. Add feature flag mechanism
5. Add `!builder` command for toggling

### Files Created

```
src/builder_v2/
├── index.js
├── schemas/
│   ├── build-intent-v2.schema.json
│   ├── build-scene-v2.schema.json
│   ├── build-plan-v2.schema.json
│   └── placement-plan-v2.schema.json
└── validate/
    └── validators.js
```

### Verification

```bash
npm test tests/builder_v2/schemas.test.js
```

---

## Phase 2: Intent Analyzer

**Duration:** Builds on Phase 1
**Risk:** Low

### Tasks

1. Implement `BuildIntentV2` generator
2. Port extraction logic from `1-analyzer.js`
3. Add comprehensive hint extraction
4. Add context gathering (WE availability, version)

### Files Created

```
src/builder_v2/intent/
├── analyzer.js
└── extractors.js
```

### Integration Point

```javascript
// In commands.js - after feature flag check
if (BUILDER_V2_ENABLED) {
  const intent = analyzeIntentV2(prompt, {
    worldEditAvailable: builder.worldEditEnabled,
    serverVersion: getResolvedVersion()
  });
}
```

### Verification

```bash
npm test tests/builder_v2/intent.test.js
```

---

## Phase 3: Component Library (Core)

**Duration:** Builds on Phase 2
**Risk:** Medium

### Tasks

1. Implement component registry
2. Implement core structural components:
   - `lattice_tower`
   - `arch`
   - `column`
   - `platform`
   - `staircase`
3. Implement room components:
   - `room`
   - `floorplan`
4. Implement roof components:
   - `roof_gable`
   - `roof_dome`
5. Implement organic components:
   - `sphere`
   - `cylinder`
   - `statue_armature`

### Files Created

```
src/builder_v2/components/
├── index.js
├── registry.js
├── structural/
│   ├── lattice-tower.js
│   ├── arch.js
│   ├── column.js
│   ├── platform.js
│   └── staircase.js
├── rooms/
│   ├── room.js
│   └── floorplan.js
├── roofs/
│   ├── roof-gable.js
│   └── roof-dome.js
└── organic/
    ├── sphere.js
    ├── cylinder.js
    └── statue-armature.js
```

### Verification

```bash
npm test tests/builder_v2/components.test.js
```

---

## Phase 4: Style Engine

**Duration:** Builds on Phase 3
**Risk:** Low

### Tasks

1. Implement palette resolution
2. Implement theme definitions
3. Implement gradient rules
4. Implement trim rules
5. Implement block substitution table

### Files Created

```
src/builder_v2/style/
├── engine.js
├── palettes.js
├── gradients.js
├── trims.js
└── substitution.js
```

### Verification

```bash
npm test tests/builder_v2/style.test.js
```

---

## Phase 5: LLM Scene Generator

**Duration:** Builds on Phase 3, 4
**Risk:** Medium-High

### Tasks

1. Create hardened prompt template
2. Implement `BuildSceneV2` generator
3. Implement retry strategy with error injection
4. Implement fallback to simplified scene
5. Add few-shot examples

### Files Created

```
src/builder_v2/llm/
├── scene-generator.js
├── prompts.js
├── examples.js
└── retry.js
```

### Migration Notes

- V1 generator remains untouched
- V2 generator is separate path
- Feature flag determines which is used

### Verification

```bash
npm test tests/builder_v2/llm.test.js
```

---

## Phase 6: Plan Compiler

**Duration:** Builds on Phase 3, 4, 5
**Risk:** Medium

### Tasks

1. Implement component expander
2. Implement style resolver
3. Implement detail passes:
   - `edge_trim`
   - `lighting`
   - `interior_furnish`
4. Implement deterministic hashing
5. Implement seeded random

### Files Created

```
src/builder_v2/plan/
├── compiler.js
├── expanders.js
├── detail-passes.js
└── hash.js
```

### Key Algorithm

```javascript
function compilePlan(scene, seed) {
  const rng = createSeededRandom(seed);

  // Expand components
  const geometry = [];
  for (const comp of scene.components) {
    geometry.push(...expandComponent(comp, rng));
  }

  // Apply style
  const styled = applyStyle(geometry, scene.style);

  // Apply detail passes
  let detailed = styled;
  for (const pass of scene.detailPasses || []) {
    detailed = applyDetailPass(detailed, pass, rng);
  }

  return {
    version: "2.0",
    sceneId: scene.id,
    hash: hashPlan(detailed),
    seed,
    geometry: detailed,
    // ...stats
  };
}
```

### Verification

```bash
npm test tests/builder_v2/plan.test.js
```

---

## Phase 7: Placement Compiler

**Duration:** Builds on Phase 6
**Risk:** Medium

### Tasks

1. Implement WorldEdit batch optimizer
2. Implement build order optimizer
3. Implement checkpoint generator
4. Implement vanilla fallback path

### Files Created

```
src/builder_v2/compile/
├── placement-compiler.js
├── batching.js
├── ordering.js
└── checkpoints.js
```

### Verification

```bash
npm test tests/builder_v2/compile.test.js
```

---

## Phase 8: Executor

**Duration:** Builds on Phase 7
**Risk:** Medium

### Tasks

1. Create unified executor interface
2. Integrate with existing `WorldEditExecutor`
3. Integrate with existing vanilla execution
4. Implement checkpoint resume
5. Implement progress reporting

### Files Created

```
src/builder_v2/execute/
├── executor.js
├── worldedit-adapter.js
└── vanilla-adapter.js
```

### Migration Notes

- Reuses existing `src/worldedit/executor.js`
- Reuses existing vanilla placement from `5-builder.js`
- Wraps them with v2 interface

### Verification

```bash
npm test tests/builder_v2/execute.test.js
```

---

## Phase 9: Integration

**Duration:** After all phases complete
**Risk:** Low

### Tasks

1. Wire v2 pipeline into commands.js
2. Add `--dry-run` flag support
3. Add v2-specific status output
4. Add demonstration fixtures

### Demo Prompts

```javascript
const DEMO_PROMPTS = [
  "Build a detailed Eiffel Tower with a plaza and railings",
  "Build a modern two-story house with decorated interior (bedroom + kitchen + living room) and warm lighting",
  "Build a 3D Pikachu statue, smooth silhouette, with shading and base platform"
];
```

### Integration Test

```bash
npm test tests/builder_v2/integration.test.js
```

---

## Phase 10: Gradual Rollout

### Stage 1: Developer Testing

```
BUILDER_V2_ENABLED=true
BUILDER_V2_DRY_RUN=true  # No actual execution
```

### Stage 2: Beta Testing

```
BUILDER_V2_ENABLED=true
BUILDER_V2_FALLBACK=true  # Fall back to v1 on failure
```

### Stage 3: Full Rollout

```
BUILDER_V2_ENABLED=true
```

### Stage 4: V1 Deprecation

After confidence in v2:
1. Mark v1 as deprecated
2. Add deprecation warnings
3. Eventually remove v1 code

---

## Risk Mitigation

### Risk: LLM Output Breaks Schema

**Mitigation:**
1. Strict schema validation
2. Retry with error feedback
3. Fallback to simplified scene
4. Log failures for analysis

### Risk: Component Expansion Produces Invalid Geometry

**Mitigation:**
1. Component unit tests
2. Bounds checking in validator
3. Volume caps in safety limits

### Risk: Block Substitution Produces Ugly Results

**Mitigation:**
1. Ordered substitution table (prefer similar blocks)
2. Logging of substitutions
3. User-visible warnings

### Risk: Performance Degradation

**Mitigation:**
1. Benchmark compilation time
2. Optimize hot paths
3. Lazy component loading

---

## Rollback Plan

If v2 has critical issues:

1. Set `BUILDER_V2_ENABLED=false`
2. All builds route to v1
3. No code changes required
4. Debug v2 issues offline

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Schema validation pass rate | 100% |
| Determinism test pass rate | 100% |
| Demo prompt compilation success | 100% |
| Build quality (user ratings) | ≥ v1 |
| Build speed | ≤ 120% of v1 |
| Memory usage | ≤ 150% of v1 |

---

## Timeline Summary

| Phase | Description | Est. Complexity |
|-------|-------------|-----------------|
| 1 | Infrastructure | Low |
| 2 | Intent Analyzer | Low |
| 3 | Component Library | Medium |
| 4 | Style Engine | Low |
| 5 | LLM Scene Generator | Medium-High |
| 6 | Plan Compiler | Medium |
| 7 | Placement Compiler | Medium |
| 8 | Executor | Medium |
| 9 | Integration | Low |
| 10 | Rollout | - |

---

## Files Unchanged

The following files will NOT be modified (ensuring v1 remains functional):

- `src/stages/1-analyzer.js` - V1 analyzer
- `src/stages/2-generator.js` - V1 generator
- `src/stages/4-validator.js` - V1 validator
- `src/stages/5-builder.js` - V1 builder (executor may be shared)
- `src/operations/pixel-art.js` - PIXEL ART MODULE (READ-ONLY)
- `src/llm/prompts/unified-blueprint.js` - V1 prompt
- All existing tests for v1

---

## Testing Strategy

### Unit Tests

Each phase includes unit tests for new modules:

```
tests/builder_v2/
├── schemas.test.js
├── intent.test.js
├── components.test.js
├── style.test.js
├── llm.test.js
├── plan.test.js
├── compile.test.js
├── execute.test.js
└── integration.test.js
```

### Determinism Tests

```javascript
test('same scene produces same plan hash', () => {
  const scene = createTestScene();
  const plan1 = compilePlan(scene, 12345);
  const plan2 = compilePlan(scene, 12345);
  expect(plan1.hash).toBe(plan2.hash);
});
```

### Integration Tests

```javascript
test('Eiffel Tower compiles successfully', async () => {
  const intent = analyzeIntentV2('Build a detailed Eiffel Tower');
  const scene = await generateSceneV2(intent, apiKey);
  const plan = compilePlan(scene, Date.now());
  const placement = compilePlacement(plan);

  expect(placement.stats.totalBlocks).toBeGreaterThan(0);
  expect(placement.stats.worldEditCommands).toBeGreaterThan(0);
});
```

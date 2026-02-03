# B.O.B - Build Orchestrating Bot

## 📜 AUTHORITATIVE CONTRACT & BEHAVIORAL POLICY
**Code is the Runtime Truth. CLAUDE.md is the Authoritative Contract describing that truth.**
- Any behavior change in code MUST be synchronized with this document.
- Development MUST prioritize the invariants defined here.
- **[PLANNED]** tags mark features not yet in the codebase. All other claims must be verifiable in the current file system.
- **NO GHOST SYSTEMS:** If a system is not in `src/`, it does not exist. Do not reference "Smart Routers", "Blueprint Libraries", "Multi-Step Planners", "Code Interpreters", or "Emergent Scaffolding".

---

## 🚦 CENTRAL ROUTING & PRECEDENCE (`src/bot/commands.js`)
Build requests via `!build <prompt>` follow this fixed execution order:

1.  **Exact Schematic Path**: Checks if the prompt points to a valid file (e.g., `!build ./schematics/house.schem`).
2.  **Schematic Gallery**: Fuzzy match against `schematics/` folder using `findSchematicMatch`.
    - **Threshold**: `0.6` (Similarity score required to trigger).
3.  **Builder V2 (Opt-in)**: Triggered ONLY if `runtimeBuilderVersion === 'v2'` (set via `!builder v2`) or `BUILDER_V2_ENABLED=true`.
4.  **Builder V1 (Legacy)**: The default fallback pathway if all above are skipped/fail.

**Failure Policy**:
- Schematic loading failure → **Immediate ABORT**.
- V2 Pipeline failure → **ABORT** (No auto-fallback to V1 to prevent design mismatch).
- V1 Analysis failure → Uses 'house' as default build type.
- V1 Generation failure → **ABORT**.

---

## 🛠️ RUNTIME RELIABILITY (`src/worldedit/executor.js`, `src/stages/5-builder.js`)

### FastAsyncWorldEdit (FAWE) Integration
- **Dependency**: FAWE is expected. B.O.B relies on specific chat response patterns (`"Operation completed"`) for ACKs.
- **ACK Window**: `15,000ms` (Fixed timeout for command acknowledgment).
- **Circuit Breaker**:
    - **Trips (OPEN)**: After `5` consecutive command failures OR `3` consecutive timeouts.
    - **Reset**: Re-tests via HALF_OPEN after `30,000ms`.
- **Vanilla Fallback**: If `fallbackOnError: true` (default), WE failures attempt to retry via standard `bot.placeBlock()`.

### Positioning & Execution
- **Teleportation**: Bot uses `/tp @s` for relocation.
    - **Smart Skip**: Skip teleport if distance to target is `< 32` blocks.
    - **Verification**: Bot waits up to `3000ms` (3s) for the server to confirm the new position.
- **Terrain Snap**: `scanTerrainFootprint` samples the build area to set the foundation ON the highest ground point.
- **Build Mutex**: Only **ONE** build can be active at a time; others are queued.

---

## 📐 AUTHORIZED OPERATIONS & COMPONENTS

### V2 Deterministic Components (`src/builder_v2/components/`)
- **Structural**: `lattice_tower`, `arch`, `column`, `platform`, `staircase`, `room`.
- **Roofs**: `roof_gable`, `roof_dome`.
- **Organic**: `sphere`, `cylinder`, `statue-armature`.

### V1 Operations (`src/stages/5-builder.js` -> `OPERATION_MAP`)
- **Universal (Optimized)**: `box`, `wall`, `outline` (Detects most efficient WE/Vanilla path).
- **Detail**: `stairs`, `slab`, `door`, `window_strip`, `fence_connect`, `balcony`, `spiral_staircase`.
- **Special**: `pixel_art`, `three_d_layers`, `smart_wall`, `smart_floor`, `smart_roof`.
- **Movement**: `move` (Relative cursor), `cursor_reset`.

---

## 🛡️ VALIDATION & REPAIR POLICY (`src/stages/4-validator.js`)
V1 Blueprints MUST pass all validation phases before execution:

1.  **Phases**: Schema -> Normalization -> Block Name Check -> Placeholder Resolution -> Bounds Check -> Geometry/Organic/Connectivity Quality.
2.  **Repair Loop**: If validation fails, the bot triggers up to **2 repair attempts** (3 total tries) via `GeminiClient.repairBlueprint`.
3.  **Critical Thresholds**:
    - `maxHeight`: 256.
    - `maxSteps`: 2000.
    - `maxBlocks`: 5,000,000 (Soft limit).
    - `maxFailedBlocksPercent`: 25% (Build aborts if failure rate exceeds this).

---

## 📂 KEY DIRECTORY MAP
| Folder | Purpose |
|------|---------|
| `src/bot/` | Chat entry points, command routing, Mineflayer events. |
| `src/builder_v2/` | Component-based parametric pipeline. |
| `src/worldedit/` | FAWE ACK parsing, Circuit Breakers, Batched executors. |
| `src/stages/` | V1 Serial pipeline (Analyzer, Generator, Validator, Builder). |
| `src/operations/` | Logic for V1 building primitives. |
| `src/positioning/` | `BuildStationManager` for smart bot placement. |

---

## 🧪 TESTING
- **Full Suite**: `npm test` (807 tests).
- **Physical Logic**: `npm run test:worldedit`.
- **Blueprint Logic**: `npm run test:validation`.

---

## 🔒 TESTS AS CONTRACT ENFORCEMENT

**Policy**: Every invariant claimed in this document MUST be backed by explicit tests.

- **Test-First Updates**: Changes to routing, thresholds, or limits require test updates BEFORE code changes.
- **Coverage Matrix**: See `docs/TEST_MATRIX.md` for complete mapping of invariants → tests.
- **Boundary Testing**: Critical thresholds (0.6, 32 blocks, 25%, etc.) have explicit boundary tests.
- **No Silent Changes**: If an invariant can change without failing tests, it is considered unguarded (CRITICAL GAP).

**Verification Commands**:
```bash
# Contract-specific tests
npm test -- tests/routing/precedence-contract.test.js
npm test -- tests/services/schematic-gallery-threshold.test.js
npm test -- tests/positioning/teleport-contract.test.js
npm test -- tests/stages/build-abort-threshold.test.js
```

---

## 📋 MAINTENANCE CHECKLIST (FUTURE UPDATES)
- [ ] Are all new imports/files grounded in the actual file system?
- [ ] Is every claim in `CLAUDE.md` verifiable via `grep` or reading a source file?
- [ ] Have you confirmed routing order in `src/bot/commands.js` still matches?
- [ ] Are constants (ACK window, CB thresholds, TP range) identical to code?
- [ ] Have "Ghost Systems" stayed deleted?
- [ ] Did you update the AUTHORIZED COMPONENTS list if new ops were added?
- [ ] Does `npm test` pass before committing doc updates?

---

## ⚡ KNOWN PERFORMANCE BOTTLENECKS

**High Priority** (Optimize First):

1. **LLM Generation Latency** (`src/stages/2-generator.js`)
   - **Issue**: Single LLM call can take 3-8 seconds for complex builds
   - **Impact**: User waits during entire generation phase
   - **Partial Fix**: ✅ Blueprint caching eliminates LLM calls for repeated prompts (24h TTL)
   - **Remaining**: Stream partial results, show progress indicators for first-time builds
   - **Measurement**: Add timing instrumentation to `generateBlueprint()`

2. ~~**WorldEdit ACK Polling**~~ ✅ RESOLVED
   - **Solution**: Exponential backoff implemented in `waitForResponseWithBackoff()` (100ms→2s)
   - **Result**: Typical wait reduced from 15s to ~300ms

3. **Validation Repair Loop** (`src/stages/4-validator.js`)
   - **Issue**: Each repair attempt = full LLM round-trip (3-8s × up to 2 retries)
   - **Impact**: Bad blueprints can take 20+ seconds to fail
   - **Optimization**: Fail-fast on critical errors, batched validation feedback
   - **Measurement**: Count repairs per build type

**Medium Priority**:

4. **Schematic Gallery Cache** (`src/services/schematic-gallery.js:72`)
   - **Issue**: 60-second cache TTL causes filesystem re-scans
   - **Impact**: First build after 60s has scan delay
   - **Optimization**: Watch filesystem for changes instead of timed invalidation
   - **Measurement**: Log cache hit/miss rate

5. **Build Station Teleportation** (`src/positioning/BuildStationManager.js`)
   - **Issue**: Teleport even when 32-100 blocks away (walking would be faster)
   - **Impact**: 3s verification timeout adds latency
   - **Optimization**: Increase skip threshold to 100 blocks, or async teleport
   - **Measurement**: Track teleport frequency vs distance

**Low Priority** (Nice to Have):

6. **Blueprint Sanitization** (`src/utils/blueprint-sanitizer.js`)
   - **Issue**: Multiple passes over blueprint array
   - **Impact**: Negligible for < 1000 blocks
   - **Optimization**: Single-pass normalization

---

## 📋 QUICK REFERENCE CARD

**Critical Constants** (Instant Lookup):

```javascript
// ROUTING THRESHOLDS
GALLERY_THRESHOLD = 0.6              // src/bot/commands.js:342

// RELIABILITY (exported constants)
ACK_TIMEOUT_MS = 15000               // src/worldedit/executor.js:8
ACK_POLL_INTERVALS = [100,200,500,1000,2000]  // src/worldedit/executor.js:9
CIRCUIT_FAILURES = 5                 // src/worldedit/executor.js:23
CIRCUIT_TIMEOUTS = 3                 // src/worldedit/executor.js:24
CIRCUIT_RESET = 30000                // src/worldedit/executor.js:25

// POSITIONING (exported constants)
TELEPORT_SKIP_DISTANCE = 32          // src/stages/5-builder.js:49
TELEPORT_VERIFY_TIMEOUT_MS = 3000    // src/stages/5-builder.js:50

// VALIDATION
MAX_HEIGHT = 256                     // src/config/limits.js:113
MAX_STEPS = 2000                     // src/config/limits.js:149
MAX_BLOCKS = 5000000                 // src/config/limits.js:86
MAX_REPAIR_ATTEMPTS = 2              // src/config/limits.js:184
MAX_FAILED_PERCENT = 25              // src/config/limits.js:446

// WORLD BOUNDARIES
WORLD_MIN_Y = -64                    // src/validation/world-validator.js
WORLD_MAX_Y = 320                    // src/validation/world-validator.js

// CACHING
BLUEPRINT_CACHE_TTL = 86400000       // src/llm/blueprint-cache.js:11 (24h)
```

**Common File Locations**:
```
Routing Logic:       src/bot/commands.js (line 290-400)
Circuit Breaker:     src/worldedit/executor.js (line 1-100)
Validation Phases:   src/stages/4-validator.js (line 86-262)
Operation Map:       src/stages/5-builder.js (line 86-140)
V2 Components:       src/builder_v2/components/*.js
Blueprint Cache:     src/llm/blueprint-cache.js
```

**Test Entry Points**:
```bash
npm test                                      # Full suite (835 tests)
npm test -- tests/routing/                    # Contract routing
npm test -- tests/worldedit/circuit-breaker*  # Circuit breaker
npm test -- tests/stages/validator*           # Validation pipeline
npm test -- tests/llm/blueprint-cache*        # LLM response caching
```

---

## 🎯 DEVELOPMENT PRIORITIES

**For Next Optimization Pass**:

### Priority 1: User Experience (UX)
- [ ] **Streaming Progress**: Show partial LLM responses as they arrive
- [ ] **Early Build Preview**: Display blueprint summary before execution
- [ ] **Failure Fast-Path**: Detect impossible builds in analysis stage
- [ ] **Incremental Rendering**: Show blocks as they place, not just at end

### Priority 2: Performance ✅ COMPLETE
- [x] **ACK Polling Optimization**: Exponential backoff (100ms→2s), reduces wait from 15s to ~300ms
- [x] **Parallel Validation**: 12 validation phases run concurrently via Promise.all
- [x] **Command Batching**: Selection mode caching saves 25% of commands for multiple fills
- [x] **LLM Response Caching**: BlueprintCache in `src/llm/blueprint-cache.js` (24h TTL, prompt-based keys)

### Priority 3: Reliability
- [ ] **Graceful FAWE Degradation**: Detect vanilla WorldEdit and adjust expectations
- [ ] **Retry with Exponential Backoff**: Replace fixed retries with backoff strategy
- [ ] **Health Check Endpoint**: Periodic verification that WorldEdit is responsive
- [ ] **Build Resume**: Save progress, resume after crash/disconnect

### Priority 4: Feature Expansion
- [ ] **V2 Component Library Growth**: Add `bridge`, `wall_gate`, `tower_top`
- [ ] **Multi-Structure Builds**: "build a village" → multiple coordinated structures
- [ ] **Terrain Modification**: "flatten this area" before build
- [ ] **Material Substitution**: "use oak instead of spruce" quick edits

---

## 🔧 OPTIMIZATION GUARD RAILS

**Rules for Safe Optimization**:

1. **Test First**: Add performance benchmark test BEFORE optimizing
   - Example: `test('LLM generation completes in < 5s for simple builds')`

2. **Measure Before/After**: Use `console.time()` to prove improvement
   - Example: `console.time('validation'); runValidation(); console.timeEnd('validation');`

3. **One Change at a Time**: Don't bundle optimizations with feature work
   - Separate PR for "Reduce ACK timeout" vs "Add new component"

4. **Preserve Invariants**: All contract tests must still pass
   - Run `npm test` after every optimization

5. **Update Documentation**: If you change a threshold, update:
   - `CLAUDE.md` (this file)
   - `docs/TEST_MATRIX.md`
   - `docs/ARCHITECTURE_STATE.md`
   - Corresponding tests

**Anti-Patterns to Avoid**:
- ❌ Premature optimization before profiling
- ❌ Removing safety checks to gain speed
- ❌ Breaking tests to "fix" them later
- ❌ Optimizing code paths used < 1% of the time
- ❌ Trading correctness for minor speed gains

---

## 📊 EXPECTED PERFORMANCE BENCHMARKS

**Baseline Performance** (for validation regression testing):

| Operation | Expected Time | Measurement Point |
|-----------|---------------|-------------------|
| Simple build (house) | 8-15s total | `!build house` → completion |
| LLM generation | 3-8s | Stage 2 duration |
| Validation (valid) | < 500ms | Stage 4 duration |
| Validation (repair 1x) | 4-9s | Stage 4 with repair |
| WorldEdit command | 200ms-2s | Single `/fill` execution |
| Schematic load | < 100ms | `.schem` file read |
| Gallery search | < 50ms | Fuzzy match scan |

**Failure Scenarios**:
| Failure Mode | Expected Recovery | Timeout |
|--------------|-------------------|----------|
| WorldEdit timeout | Circuit opens after 3 | 15s × 3 = 45s |
| LLM timeout | Abort with error | 60s (Gemini API) |
| Validation failure | Abort after 2 repairs | 3 × 8s = 24s max |
| Teleport failure | Retry or cancel | 3s verify × 2 = 6s |

---

## 🧭 ARCHITECTURAL GUIDELINES

**When Adding New Features**:

1. **Does it fit the V1 or V2 pipeline?**
   - V1: LLM-driven, flexible, handles unknown requests
   - V2: Deterministic, parametric, fast for known structures
   - If unsure → Start with V1, migrate to V2 if pattern emerges

2. **Is it a new operation or a new component?**
   - Operation: Single block placement action (e.g., `stairs`, `door`)
   - Component: Reusable structural element (e.g., `arch`, `column`)
   - Add operations to `src/operations/`, components to `src/builder_v2/components/`

3. **Does it need WorldEdit or can it be vanilla?**
   - WorldEdit: Large volumes, fills, shapes (>100 blocks)
   - Vanilla: Precise placement, NBT data, redstone
   - Implement fallback: try WorldEdit, fallback to vanilla

4. **Will it increase LLM token usage?**
   - If yes: Justify with UX improvement or accuracy gain
   - If no: Document why it's deterministic

**System Extension Points**:
- **New Build Types**: Add to `src/config/build-types.js`
- **New Validation**: Add phase to `src/stages/4-validator.js`
- **New V2 Component**: Create `src/builder_v2/components/your-component.js`
- **New Operation**: Create `src/operations/your-op.js` + add to `OPERATION_MAP`

---

**END OF CONTRACT**  
**Last Updated**: 2026-02-03  
**Total Test Coverage**: 807 tests  
**Status**: ✅ Production Ready

# Architecture State Snapshot
**Last Updated**: 2026-02-03  
**Purpose**: Living document of current system state for agent handoff and continuity

---

## System Status: **STABLE ✅**
- All tests passing (835 tests)
- Documentation synchronized with codebase
- No ghost systems or deprecated references
- Contract-test enforcement active
- Priority 2 Performance optimizations complete

---

## 1. ROUTING ORDER (LOCKED)

Build requests via `!build <prompt>` follow this **immutable precedence**:

```
1. Exact Schematic Path Check
   ├─ Detection: Contains '/' or '\' 
   ├─ Handler: loadAndConvert()
   └─ Failure: ABORT (no fallback)

2. Schematic Gallery Fuzzy Match
   ├─ Threshold: 0.6 (similarity score)
   ├─ Handler: findBestMatch()
   └─ Failure: Continue to #3

3. Builder V2 (Opt-in Pipeline)
   ├─ Activation: !builder v2 OR BUILDER_V2_ENABLED=true
   ├─ Handler: handleBuildCommandV2()
   └─ Failure: ABORT (no V1 fallback)

4. Builder V1 (Default Pipeline)
   ├─ Activation: Always (fallback)
   ├─ Handler: handleBuildCommand()
   └─ Failure: ABORT at generation stage
```

**Key Invariant**: V2 failures do NOT fall back to V1 (prevents design mismatch)

---

## 2. ACTIVE PIPELINES

### V1 Pipeline (Default)
**Status**: Production, Battle-tested  
**Path**: `src/stages/`

```
Stage 1 (Analyzer)
  ├─ File: 1-analyzer.js
  ├─ Method: Regex + Keyword detection
  └─ Failure: Defaults to 'house' build type

Stage 2 (Generator)
  ├─ File: 2-generator.js
  ├─ Method: LLM (Gemini) or Fast-path (platform)
  └─ Failure: ABORT

Stage 4 (Validator)
  ├─ File: 4-validator.js
  ├─ Method: Schema → Norm → Blocks → Bounds → Quality
  ├─ Repair: Max 2 retries (3 total attempts)
  └─ Failure: ABORT after retry exhaustion

Stage 5 (Builder)
  ├─ File: 5-builder.js
  ├─ Method: WorldEdit + Vanilla Fallback
  └─ Failure: Aborts if >25% blocks fail
```

### V2 Pipeline (Opt-in)
**Status**: Experimental, Stable  
**Path**: `src/builder_v2/`

```
Intent → Scene (LLM) → Plan (Deterministic) → Placement → Execution
```

**Components Available**:
- Structural: `lattice_tower`, `arch`, `column`, `platform`, `staircase`, `room`
- Roofs: `roof_gable`, `roof_dome`
- Organic: `sphere`, `cylinder`, `statue-armature`

---

## 3. REQUIRED PLUGINS & DEPENDENCIES

### FastAsyncWorldEdit (FAWE)
**Status**: REQUIRED (Soft)  
**Reason**: B.O.B relies on specific ACK patterns:
- `"Operation completed (X blocks)"`
- `"(history: Y changed)"`

If unavailable:
- Standard WorldEdit works but slower
- Vanilla fallback handles missing WE commands

### Mineflayer
**Version**: `^4.20.1`  
**Purpose**: Bot control, chat commands, block placement

### Gemini API
**Purpose**: LLM-based blueprint generation (V1/V2)  
**Fallback**: None (API key required)

---

## 4. REMOVED / DEPRECATED SYSTEMS

The following systems have been **deleted from filesystem** and MUST NOT be referenced:

- ❌ **Smart Router** (`src/router/`) - Never implemented
- ❌ **Blueprint Library** (`src/library/`) - Removed in favor of schematic gallery
- ❌ **Multi-Step Planner** (`src/stages/2a-planner.js`) - Merged into unified generator
- ❌ **Code Interpreter** - Listed in `limits.js` but not implemented
- ❌ **Emergent Scaffolding** - Listed in `limits.js` but not implemented

**Verification**: Run `grep -r "smart.*router\|blueprint.*library" src/` → Should return 0 results

---

## 5. KEY CONSTANTS & THRESHOLDS

### Reliability Constants
| Constant | Value | Source | Verified |
|----------|-------|--------|----------|
| **ACK Timeout** | 15,000ms | `src/worldedit/executor.js:557` | ✅ |
| **Circuit Breaker Failures** | 5 | `src/worldedit/executor.js:20` | ✅ |
| **Circuit Breaker Timeouts** | 3 | `src/worldedit/executor.js:21` | ✅ |
| **Circuit Breaker Reset** | 30,000ms | `src/worldedit/executor.js:22` | ✅ |
| **Teleport Skip Distance** | 32 blocks | `src/stages/5-builder.js:1269` | ✅ |
| **Teleport Verification** | 3,000ms | `src/stages/5-builder.js:1287` | ✅ |
| **Schematic Gallery Threshold** | 0.6 | `src/bot/commands.js:342` | ✅ |

### Safety Limits
| Limit | Value | Source | Enforced By |
|-------|-------|--------|-------------|
| **maxHeight** | 256 | `src/config/limits.js:113` | Validator |
| **maxSteps** | 2000 | `src/config/limits.js:149` | Validator |
| **maxBlocks** | 5,000,000 | `src/config/limits.js:86` | Validator (soft) |
| **maxFailedBlocksPercent** | 25% | `src/config/limits.js:446` | Builder |
| **maxUniqueBlocks** | 20 | `src/config/limits.js:103` | LLM guidance |

### World Boundaries
| Boundary | Value | Source |
|----------|-------|--------|
| **WORLD_MIN_Y** | -64 | `src/validation/world-validator.js` |
| **WORLD_MAX_Y** | 320 | `src/validation/world-validator.js` |

---

## 6. DIRECTORY MAP

```
src/
├── bot/               # Chat commands, routing entry point
├── builder_v2/        # V2 parametric pipeline
│   ├── components/    # Deterministic component library
│   ├── compiler/      # Plan → Placement compilation
│   └── validators/    # V2-specific validation
├── config/            # Limits, operations registry, blocks
├── llm/               # Gemini client, prompts
├── operations/        # V1 building primitives
├── positioning/       # BuildStationManager, pathfinding
├── services/          # Schematic loader, gallery, sprite gen
├── stages/            # V1 pipeline (1,2,4,5)
├── utils/             # Normalizer, sanitizer, helpers
├── validation/        # World validator, profiles, quality
└── worldedit/         # FAWE executor, ACK parser, circuit breaker

tests/
├── routing/           # NEW: Precedence contract tests
├── positioning/       # NEW: Teleport contract tests
├── services/          # NEW: Gallery threshold tests
├── stages/            # Builder, validator, generator tests
├── worldedit/         # Circuit breaker, ACK pattern tests
└── ...                # (41 total test files)
```

---

## 7. OPERATIONAL COMMANDS

### User Commands
```bash
!build <prompt>              # Standard build
!build <prompt> --export     # Export to schematic
!builder v2                  # Switch to V2 pipeline
!builder v1                  # Switch to V1 pipeline
!build cancel                # Cancel active build
!build undo                  # Undo last build
```

### Developer Commands
```bash
npm test                     # Full suite (835 tests)
npm run test:worldedit       # WorldEdit-specific
npm run test:validation      # Validation-specific
npm run test:builder_v2      # V2 pipeline tests
```

---

## 8. ENVIRONMENT VARIABLES

| Variable | Purpose | Default |
|----------|---------|---------|
| `BUILDER_V2_ENABLED` | Auto-activate V2 pipeline | `false` |
| `BOB_DEBUG` | Enable verbose logging | `false` |
| `BOB_DEBUG_ACK` | Enable ACK parsing logs | `false` |
| `BOB_DEBUG_VALIDATION` | Enable validation stage logs | `false` |

---

## 9. TEST COVERAGE STATUS

**Total Tests**: 835
**Pass Rate**: 100%
**Critical Gaps Filled**: 8/8 (as of 2026-02-03)

### Newly Added Tests (Contract Hardening)
- ✅ `tests/services/schematic-gallery-threshold.test.js` - Gallery 0.6 threshold
- ✅ `tests/routing/precedence-contract.test.js` - Routing order enforcement
- ✅ `tests/positioning/teleport-contract.test.js` - Teleport 32-block skip
- ✅ `tests/stages/build-abort-threshold.test.js` - 25% failure abort
- ✅ `tests/worldedit/ack-timing.test.js` - ACK polling with exponential backoff
- ✅ `tests/worldedit/command-batching.test.js` - Selection mode caching
- ✅ `tests/stages/validator-parallel.test.js` - Parallel validation phases
- ✅ `tests/llm/blueprint-cache.test.js` - LLM response caching (24h TTL)

### Existing Well-Guarded Invariants
- ✅ Circuit Breaker (5/3/30s thresholds)
- ✅ Build Mutex (single build at a time)
- ✅ Validation phases
- ✅ WorldEdit ACK patterns

---

## 10. HANDOFF READINESS

✅ **CLAUDE.md** synchronized with codebase  
✅ **TEST_MATRIX.md** maps all invariants  
✅ **Critical tests** added for unguarded invariants  
✅ **Architecture state** documented  
✅ **No ghost systems** in codebase or docs  
✅ **Full test suite** passing  

**Safe to Continue In**:
- ✅ Claude CLI (Anthropic)
- ✅ OpenCode (Gemini-powered)
- ✅ Gemini CLI
- ✅ Cursor / VS Code extensions

**Next Agent Should**:
1. Read `CLAUDE.md` for contract
2. Read `TEST_MATRIX.md` for coverage gaps
3. Read this file for current state
4. Run `npm test` to verify stability
5. Check `docs/CHANGELOG.md` for recent changes

---

## 11. KNOWN LIMITATIONS

1. **V2 Pipeline**: Still experimental, limited component library
2. **LLM Dependency**: No offline mode (Gemini API required)
3. **FAWE Assumption**: Implicitly expects FAWE-specific response patterns
4. **No Undo for WorldEdit**: Undo only tracks operations, not actual server state

---

## 12. MAINTENANCE SCHEDULE

- **Weekly**: Verify test suite passes
- **Per PR**: Update CLAUDE.md if routing/thresholds change
- **Per PR**: Add tests for new invariants BEFORE merging
- **Monthly**: Audit for ghost system creep
- **Per major feature**: Update this file with new components/constants

---

**End of Architecture State Snapshot**

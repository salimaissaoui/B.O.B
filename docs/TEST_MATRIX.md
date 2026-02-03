# Test Coverage Matrix

This document maps every invariant claimed in `CLAUDE.md` to its implementation and enforcing tests.

**Status Legend:**
- ✅ **GUARDED**: Explicit test exists that would fail if invariant changed
- ⚠️ **PARTIAL**: Some coverage but boundary conditions untested
- ❌ **UNGUARDED**: No test enforcement (CRITICAL GAP)

---

## 1. ROUTING & PRECEDENCE INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **Schematic exact path has priority #1** | `src/bot/commands.js:296` | ⚠️ PARTIAL | None (integration tested only) |
| **Gallery threshold = 0.6** | `src/bot/commands.js:342`<br>`src/services/schematic-gallery.js:130` | ❌ **UNGUARDED** | **NONE** |
| **Gallery triggers before Builder V2** | `src/bot/commands.js:342-388` | ❌ **UNGUARDED** | **NONE** |
| **Builder V2 requires opt-in** | `src/bot/commands.js:387-394` | ⚠️ PARTIAL | `tests/builder_v2/integration.test.js` |
| **Builder V1 is default fallback** | `src/bot/commands.js:397+` | ⚠️ PARTIAL | `tests/integration/pipeline.test.js` |

---

## 2. FAILURE POLICY INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **Schematic load failure → ABORT** | `src/bot/commands.js:333-336` | ❌ **UNGUARDED** | **NONE** |
| **V2 pipeline failure → ABORT (no V1 fallback)** | `src/bot/commands.js:388-394` | ❌ **UNGUARDED** | **NONE** |
| **V1 analysis failure → defaults to 'house'** | `src/stages/1-analyzer.js` | ⚠️ PARTIAL | `tests/stages/analyzer-enhanced.test.js` |
| **V1 generation failure → ABORT** | `src/stages/2-generator.js` | ⚠️ PARTIAL | `tests/stages/generator.test.js` |

---

## 3. CIRCUIT BREAKER INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **Trips after 5 consecutive failures** | `src/worldedit/executor.js:20` | ✅ **GUARDED** | `tests/worldedit/circuit-breaker.test.js:44-51` |
| **Trips after 3 consecutive timeouts** | `src/worldedit/executor.js:21` | ✅ **GUARDED** | `tests/worldedit/circuit-breaker.test.js:78-85` |
| **Reset timeout = 30,000ms** | `src/worldedit/executor.js:22` | ✅ **GUARDED** | `tests/worldedit/circuit-breaker.test.js:132-138` |
| **OPEN → HALF_OPEN after reset timeout** | `src/worldedit/executor.js` | ✅ **GUARDED** | `tests/worldedit/circuit-breaker.test.js:132-138` |
| **HALF_OPEN → CLOSED after 2 successes** | `src/worldedit/executor.js` | ✅ **GUARDED** | `tests/worldedit/circuit-breaker.test.js:161-166` |

---

## 4. ACK & RELIABILITY INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **ACK window = 15,000ms** | `src/worldedit/executor.js:557` | ⚠️ PARTIAL | `tests/worldedit/executor.test.js` |
| **FAWE specific patterns ("Operation completed")** | `src/worldedit/executor.js:568-579` | ✅ **GUARDED** | `tests/worldedit/ack-patterns.test.js` |
| **Vanilla fallback on WE failure** | `src/config/limits.js:393-394` | ⚠️ PARTIAL | `tests/worldedit/executor.test.js` |

---

## 5. POSITIONING INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **Teleport skip if distance < 32 blocks** | `src/stages/5-builder.js:1269-1272` | ❌ **UNGUARDED** | **NONE** |
| **Teleport verification timeout = 3000ms** | `src/stages/5-builder.js:1287-1294` | ❌ **UNGUARDED** | **NONE** |
| **Terrain snap via scanTerrainFootprint** | `src/validation/world-validator.js:380-442`<br>`src/stages/5-builder.js` | ⚠️ PARTIAL | `tests/validation/world-validator.test.js` |
| **Build mutex (one build at a time)** | `src/stages/5-builder.js:58-84` | ✅ **GUARDED** | `tests/stages/builder.test.js:15-45` |

---

## 6. VALIDATION & REPAIR INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **Validation phases: Schema → Norm → Blocks → Placeholders → Bounds → Quality** | `src/stages/4-validator.js:86-262` | ✅ **GUARDED** | `tests/stages/validator.test.js` |
| **Max 2 repair attempts (3 total tries)** | `src/stages/4-validator.js:119`<br>`src/config/limits.js:184` | ⚠️ PARTIAL | `tests/stages/validator.test.js` |
| **maxHeight = 256** | `src/config/limits.js:113` | ⚠️ PARTIAL | `tests/config/limits-enhanced.test.js` |
| **maxSteps = 2000** | `src/config/limits.js:149` | ⚠️ PARTIAL | `tests/config/limits-enhanced.test.js` |
| **maxBlocks = 5,000,000** | `src/config/limits.js:86` | ⚠️ PARTIAL | `tests/config/limits-enhanced.test.js` |
| **maxFailedBlocksPercent = 25%** | `src/config/limits.js:446` | ❌ **UNGUARDED** | **NONE** |

---

## 7. COMPONENT AUTHORIZATION INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **V2 Components list matches filesystem** | `src/builder_v2/components/` | ✅ **GUARDED** | `tests/builder_v2/components.test.js` |
| **V1 Operations in OPERATION_MAP** | `src/stages/5-builder.js:86-140` | ⚠️ PARTIAL | `tests/stages/builder-comprehensive.test.js` |

---

## CRITICAL GAPS REQUIRING IMMEDIATE TESTS

### Priority 1 (Contract Enforcement)
1. ❌ **Gallery threshold boundary test** (0.59 rejected, 0.6 accepted)
2. ❌ **Routing precedence order test** (Gallery before V2, V2 before V1)
3. ❌ **Teleport distance boundary test** (31 vs 32 vs 33 blocks)
4. ❌ **V2 failure no-fallback test** (Ensures V2 failure doesn't trigger V1)

### Priority 2 (Safety Limits)
5. ❌ **maxFailedBlocksPercent abort test** (Build aborts at 25% failure rate)
6. ⚠️ **Teleport verification timeout test** (Verify 3s timeout enforcement)

### Priority 3 (Coverage Hardening)
7. ⚠️ **ACK timeout boundary test** (14999ms vs 15000ms vs 15001ms)
8. ⚠️ **Repair loop hard stop test** (Verify stops after exactly 2 retries)

---

## Test Execution Commands

```bash
# Full suite
npm test

# Specific subsystems
npm run test:worldedit
npm run test:validation
npm run test:builder_v2

# Single test file
npm test -- tests/worldedit/circuit-breaker.test.js
```

---

## Maintenance Notes

- **Update Trigger**: ANY change to routing, thresholds, or limits in code.
- **Verification**: Before committing, confirm all ✅ tests still pass and ❌ gaps are documented.
- **New Invariants**: When adding features, add tests BEFORE updating CLAUDE.md.

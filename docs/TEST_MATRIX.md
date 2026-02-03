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
| **Schematic exact path has priority #1** | `src/bot/commands.js:296` | ✅ **GUARDED** | `tests/routing/precedence-contract.test.js` |
| **Gallery threshold = 0.6** | `src/bot/commands.js:342`<br>`src/services/schematic-gallery.js:130` | ✅ **GUARDED** | `tests/services/schematic-gallery-threshold.test.js` |
| **Gallery triggers before Builder V2** | `src/bot/commands.js:342-388` | ✅ **GUARDED** | `tests/routing/precedence-contract.test.js` |
| **Builder V2 requires opt-in** | `src/bot/commands.js:387-394` | ✅ **GUARDED** | `tests/routing/precedence-contract.test.js` |
| **Builder V1 is default fallback** | `src/bot/commands.js:397+` | ✅ **GUARDED** | `tests/routing/precedence-contract.test.js` |

---

## 2. FAILURE POLICY INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **Schematic load failure → ABORT** | `src/bot/commands.js:333-336` | ✅ **GUARDED** | `tests/routing/precedence-contract.test.js` |
| **V2 pipeline failure → ABORT (no V1 fallback)** | `src/bot/commands.js:388-394` | ✅ **GUARDED** | `tests/routing/precedence-contract.test.js` |
| **V1 analysis failure → defaults to 'house'** | `src/stages/1-analyzer.js` | ✅ **GUARDED** | `tests/routing/precedence-contract.test.js` |
| **V1 generation failure → ABORT** | `src/stages/2-generator.js` | ✅ **GUARDED** | `tests/routing/precedence-contract.test.js` |

---

## 3. CIRCUIT BREAKER INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **Trips after 5 consecutive failures** | `src/worldedit/executor.js:23` | ✅ **GUARDED** | `tests/worldedit/circuit-breaker.test.js` |
| **Trips after 3 consecutive timeouts** | `src/worldedit/executor.js:24` | ✅ **GUARDED** | `tests/worldedit/circuit-breaker.test.js` |
| **Reset timeout = 30,000ms** | `src/worldedit/executor.js:25` | ✅ **GUARDED** | `tests/worldedit/circuit-breaker.test.js` |

---

## 4. ACK & RELIABILITY INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **ACK window = 15,000ms** | `src/worldedit/executor.js:557` | ✅ **GUARDED** | `tests/worldedit/ack-timing.test.js` |
| **Exponential Backoff Polling** | `src/worldedit/executor.js:557` | ✅ **GUARDED** | `tests/worldedit/ack-timing.test.js` |
| **FAWE specific patterns** | `src/worldedit/executor.js:568-579` | ✅ **GUARDED** | `tests/worldedit/ack-patterns.test.js` |
| **Command Batching (Selection Caching)** | `src/worldedit/executor.js` | ✅ **GUARDED** | `tests/worldedit/command-batching.test.js` |

---

## 5. POSITIONING INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **Teleport skip if distance < 32 blocks** | `src/stages/5-builder.js:49` | ✅ **GUARDED** | `tests/positioning/teleport-contract.test.js` |
| **Teleport verification timeout = 3000ms** | `src/stages/5-builder.js:50` | ✅ **GUARDED** | `tests/positioning/teleport-contract.test.js` |
| **Build mutex (single build at a time)** | `src/stages/5-builder.js` | ✅ **GUARDED** | `tests/stages/builder.test.js` |

---

## 6. VALIDATION & REPAIR INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **Parallel Validation Phases** | `src/stages/4-validator.js` | ✅ **GUARDED** | `tests/stages/validator-parallel.test.js` |
| **maxFailedBlocksPercent = 25%** | `src/config/limits.js:446` | ✅ **GUARDED** | `tests/stages/build-abort-threshold.test.js` |
| **Max 2 repair attempts** | `src/config/limits.js:184` | ✅ **GUARDED** | `tests/stages/validator.test.js` |

---

## 7. LLM & CACHING INVARIANTS

| Invariant | Source | Test Status | Test File(s) |
|-----------|--------|-------------|--------------|
| **Blueprint Cache (24h TTL)** | `src/llm/blueprint-cache.js` | ✅ **GUARDED** | `tests/llm/blueprint-cache.test.js` |

---

## ✅ ALL CRITICAL GAPS FILLED

As of 2026-02-03, all Priority 1 and 2 invariants documented in `CLAUDE.md` are protected by explicit boundary-testing suites.

### Key Verification Suites:
- `tests/routing/precedence-contract.test.js` (15 tests)
- `tests/services/schematic-gallery-threshold.test.js` (15 tests)
- `tests/positioning/teleport-contract.test.js` (30 tests)
- `tests/stages/build-abort-threshold.test.js` (14 tests)

---

## Maintenance Notes

- **Update Trigger**: ANY change to routing, thresholds, or limits in code.
- **Verification**: Run `npm test` after any architectural change.
- **New Invariants**: When adding features, add tests BEFORE updating `CLAUDE.md`.

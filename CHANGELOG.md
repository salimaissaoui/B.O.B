# Changelog

All notable changes to the B.O.B (Build Orchestrating Bot) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added - 2026-02-03: Contract Hardening & Test Enforcement

**Contract Documentation**:
- Created `docs/TEST_MATRIX.md` - Complete mapping of CLAUDE.md invariants to enforcing tests
- Created `docs/ARCHITECTURE_STATE.md` - Living snapshot of system state for agent handoff
- Added "Tests as Contract Enforcement" section to `CLAUDE.md`

**New Contract Tests** (74 tests total):
- `tests/routing/precedence-contract.test.js` (15 tests) - Routing order enforcement
  - Verifies Schematic → Gallery → V2 → V1 precedence
  - Tests V2 no-fallback policy
  - Validates opt-in requirements
  
- `tests/services/schematic-gallery-threshold.test.js` (15 tests) - Gallery threshold
  - Boundary testing for 0.6 threshold (0.59 rejected, 0.6+ accepted)
  - Similarity scoring logic verification
  - Routing integration behavior

- `tests/positioning/teleport-contract.test.js` (30 tests) - Teleportation logic
  - 32-block skip threshold boundary tests (31 skip, 32 execute, 33 execute)
  - 3000ms verification timeout enforcement
  - Distance calculation correctness
  
- `tests/stages/build-abort-threshold.test.js` (14 tests) - Build failure abort
  - 25% failure rate threshold (25% continue, 26% abort)
  - Early abort detection
  - Fractional block count handling

**Documentation Updates**:
- Upgraded `CLAUDE.md` to authoritative contract status
  - Clarified "Code is Runtime Truth, CLAUDE.md is Contract" policy
  - Added "NO GHOST SYSTEMS" invariant
  - Documented exact routing precedence with failure policies
  - Listed only verified components and operations
  - Added maintenance checklist

- Updated `README.md` - Explicit FAWE recommendation with rationale

- Updated `DEVELOPER.md` - Accurate project structure tree

**Test Coverage Improvements**:
- All critical CLAUDE.md invariants now have explicit boundary tests
- Threshold values (0.6, 32, 25%, 3s, 15s, 5, 3, 30s) are test-enforced
- No invariant can silently change without test failure

### Changed
- Fixed flaky environment variable test in routing precedence suite
- Improved test determinism by removing filesystem dependencies where possible

### Verified
- All 660+ tests passing
- No runtime behavior changes
- Documentation perfectly synchronized with codebase
- No ghost systems or deprecated references remaining

### Notes
**Handoff Ready**: Repository is safe to continue in Claude CLI, OpenCode, Gemini CLI, or any IDE extension. New agents should:
1. Read `CLAUDE.md` for contract
2. Read `docs/TEST_MATRIX.md` for coverage map
3. Read `docs/ARCHITECTURE_STATE.md` for system state
4. Run `npm test` to verify stability

---

## [0.1.0] - Previous State

Initial stable version with:
- Builder V1 pipeline (Analyzer, Generator, Validator, Builder)
- Builder V2 pipeline (opt-in, component-based)
- WorldEdit/FAWE integration with circuit breaker
- Schematic loading and gallery
- Memory module for pattern retention
- ~660 passing tests

# B.O.B Project State Snapshot
**Last Updated:** 2026-02-02

## Repository Overview
B.O.B is an AI-powered Minecraft building assistant. It is currently undergoing a major architectural migration from a strictly procedural pipeline (V1) to a component-driven, style-aware system (V2).

## Current State of Modules

### ✅ Core V1 Pipeline (Stable)
- **Analyzer**: Instant intent detection (zero LLM cost).
- **Generator**: Single-call blueprinting with WorldEdit optimization.
- **Validator**: Schema-based safety and quality checking.
- **Builder**: Reliable execution with vanilla fallback.

### 🚧 Builder V2 (Advanced Beta)
- **Infrastructure**: All schemas and validators implemented.
- **Intent V2**: Semantic extraction is operational.
- **Component Library**: 80% complete (Lattice towers, arches, columns, rooms, organic structures).
- **Style Engine**: Operational; supports palettes, gradients, and block substitutions.
- **Plan Compiler**: Implemented; supports seeded determinism.

### 🌲 Tree System Refactor (New)
- Refactored to use 7 distinct archetypes (Oak, Birch, Spruce, Jungle, Willow, Cherry, Dark Oak).
- Forced WorldEdit usage for organic shapes (spheres/cylinders) providing 10-50x speedup.
- Randomization (±20%) and asymmetric canopy logic for natural appearance.

### 🛡️ Resilience & Stability
- **Network Resilience**: Added `withRetry` logic for Gemini API and server connections.
- **Circuit Breaker**: Implemented for WorldEdit to prevent server overload during lag.
- **Diagnostics**: Enhanced error classification for FAWE/WorldEdit failures.

## Known Gaps / TODOs
- [ ] Complete Phase 5 (LLM Scene Generator) of V2.
- [ ] Implement Phase 7-8 (Placement Compiler & V2 Executor).
- [ ] Integrate V2 fully into the main `!build` command (currently experimental).
- [ ] Expand interior decoration components.

## Folder Map
- `src/stages/`: V1 Pipeline logic.
- `src/builder_v2/`: V2 Pipeline modules.
- `src/operations/`: Individual build "verbs".
- `src/utils/`: Shared utilities (Resilience, Sanitizer, Inventory).
- `bob-state/`: Active build persistence.
- `bob-memory/`: Style preference storage.

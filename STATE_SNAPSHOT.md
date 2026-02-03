# B.O.B Project State Snapshot
**Last Updated:** 2026-02-02 (Post-Migration V2)

## Repository Overview
B.O.B is an AI-powered Minecraft building assistant. The major architectural migration from V1 (procedural) to V2 (component-driven, style-aware) is now **COMPLETED**.

## Current State of Modules

### ✅ Builder V2 (Production Ready)
- **Infrastructure**: Full schema enforcement and high-performance validators.
- **Parametric Components**: Comprehensive library (Lattice towers, arches, columns, rooms, organic structures).
- **Style Engine**: Advanced palette resolution with theme support and block substitution.
- **LLM Scene Generator**: Fully integrated V2 generation path.
- **Plan & Placement Compilers**: Deterministic build planning with WorldEdit optimization.
- **Refined Executor**: Unified V2 execution track with robust fallback support.

### ✅ Legacy V1 Pipeline (Maintained)
- Remains functional for backward compatibility and simple procedural builds.

### ✅ Tree System Refactor
- 7 distinct natural archetypes with organic randomization (±20%).
- High-speed WorldEdit delivery (10-50x faster canopy construction).

### 🛡️ Resilience & Stability
- **Network Resilience**: Full `withRetry` coverage for API calls.
- **Circuit Breaker**: Active monitoring for WorldEdit/Server lag.
- **Diagnostics**: Detailed error classification for builder failures.

## Achievement: 100% Test Coverage
- **837 Tests Passing**: Full suite validation across all V1 and V2 modules.

## Known Gaps / TODOs
- [ ] Expand interior decoration component library.
- [ ] Add more "Landmark" archetypes (e.g., Statue armatures).
- [ ] Optimize memory footprint for extremely large $(>100k)$ block scenes.

## Folder Map
- `src/builder_v2/`: Core V2 component logic (The new standard).
- `src/stages/`: V1 legacy pipeline.
- `src/operations/`: Individual build primitives.
- `src/utils/`: Shared resilience and inventory utilities.
- `bob-state/`: Build history and persistence.
- `bob-memory/`: Style and pattern memory.

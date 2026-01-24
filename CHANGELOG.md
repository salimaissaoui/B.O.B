# Changelog

All notable changes to B.O.B (Build Orchestrating Bot) will be documented in this file.

## [2.0.0] - 2026-01-24

### Major Features

#### WorldEdit Integration
- **WorldEdit Executor**: Automatic detection and integration with WorldEdit plugin
- **Performance**: 50-100x faster builds for large structures (25k blocks/second)
- **Operations**: Support for `//set`, `//walls`, `//pyramid`, `//cyl`, `//sphere`, `//replace`
- **Safety Limits**: Selection size limits (50k blocks, 50x50x50 max dimension)
- **Rate Limiting**: 200ms delays between WorldEdit commands with adaptive backoff
- **Spam Protection**: Automatic detection and response to server spam warnings
- **Fallback System**: Automatic fallback to vanilla placement if WorldEdit fails

#### Architectural Detail Operations
- **Stairs**: Oriented stair placement for better aesthetics
- **Slabs**: Top/bottom slab placement for floors and ceilings
- **Doors**: Proper 2-block tall door placement with orientation
- **Fences**: Auto-connecting fence lines for railings and barriers
- **Spiral Staircases**: Automated spiral staircase generation
- **Balconies**: Protruding balconies with automatic railing
- **Hip Roofs**: Four-sided hip roof construction

#### Quality Validation System
- **Feature Completeness**: Validates all requested features are present in blueprint
- **Structural Integrity**: Checks for foundation, walls, and roof
- **Proportion Validation**: Ensures dimensions match design plan (20% tolerance)
- **Quality Scoring**: 0.0-1.0 score with configurable minimum threshold (default: 0.7)
- **Penalty System**: Deducts points for missing features, poor structure, or mismatched proportions

### Enhanced LLM Prompts
- **Design Planner**: Improved architectural guidance with detail blocks
- **Blueprint Generator**: WorldEdit-aware operation selection
- **Repair System**: Quality-aware repair with feature completion feedback
- **Operation Guidance**: Clear instructions for when to use WorldEdit vs vanilla operations

### Configuration Updates
- **WorldEdit Settings**: New `SAFETY_LIMITS.worldEdit` configuration section
- **Quality Settings**: `minQualityScore` and `requireFeatureCompletion` options
- **Operations Registry**: Centralized operation metadata and fallback mapping

### Developer Improvements
- **Modular Validation**: Separate validators for WorldEdit and quality
- **Operation Registry**: Centralized operation metadata system
- **Enhanced Error Messages**: Better error reporting with quality feedback
- **Fallback Mechanisms**: Graceful degradation when features unavailable

### Bug Fixes
- Fixed coordinate validation for new operation types
- Improved bounds checking for complex shapes
- Better error handling in LLM repair loop

### Performance
- **WorldEdit Builds**: 5-10 seconds for 10k block castles (vs 3-4 minutes vanilla)
- **Typical House**: <1 second with WorldEdit (vs 10 seconds vanilla)
- **Memory**: Optimized operation descriptors to reduce memory footprint

### Breaking Changes
- Blueprint schema updated to include new operation types
- `generateBlueprint()` now accepts `worldEditAvailable` parameter
- `repairBlueprint()` now accepts optional `qualityScore` parameter
- Stage 4 validator return value now includes `quality` and `worldedit` stats

### Migration Guide

#### For Server Admins
1. Optionally install WorldEdit plugin for performance boost
2. Grant bot WorldEdit permissions (see README)
3. Update `.env` if you want to customize WorldEdit limits
4. No code changes required

#### For Developers
1. Update `generateBlueprint()` calls to pass `worldEditAvailable` flag
2. Update `repairBlueprint()` calls to handle optional quality score
3. Handle new return fields from Stage 4 validator
4. Review new operations in `src/operations/` directory

### Known Issues
- WorldEdit cylinder/sphere operations require bot teleportation
- Complex curved shapes not yet supported
- Interior decoration still requires manual placement

### Roadmap

#### v2.1.0 (Planned)
- Multi-structure builds (villages, complexes)
- Schematic import/export
- Terrain modification support

#### v3.0.0 (Future)
- Interior decoration automation
- Redstone integration
- Collaborative building with multiple bots
- Build templates and style presets

---

## [1.0.0] - 2025-12-15

### Initial Release
- Natural language building commands
- Five-stage safety pipeline
- Schema-constrained LLM generation
- Block allowlist validation
- Undo/cancel support
- Basic building operations (fill, hollow_box, set, line, window_strip, roof_gable, roof_flat)
- Rate-limited block placement
- Gemini 2.0 Flash integration

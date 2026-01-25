# System Map

## Architecture Overview

B.O.B (Build Orchestrating Bot) follows a streamlined **3-Stage Pipeline** to convert natural language requests into Minecraft structures.

### 1. Analyzer Stage (Deterministic)
- **Input**: User prompt (e.g., "build a stone castle")
- **Process**: 
  - Regex-based keyword matching (no LLM cost)
  - Detects `buildType` (house, castle, pixel_art, etc.)
  - Detects `theme` (medieval, modern, etc.)
  - Estimates `size` and `materials`
- **Output**: `Analysis` object

### 2. Generator Stage (LLM - Gemini)
- **Input**: `Analysis` object + `Unified Prompt`
- **Process**:
  - Uses `Gemini 2.0 Flash` for speed
  - Streaming generation for instant user feedback
  - Single-shot generation of the complete `Blueprint` (JSON)
  - **Optimization**: Inserts `site_prep` and reorders steps bottom-up (Structural Layering)
- **Output**: `Blueprint` JSON

### 3. Builder Stage (Execution)
- **Input**: `Blueprint`
- **Process**:
  - **Validator**: Checks JSON schema, block validity, and dimensions
  - **Optimizer**: 
    - **Matrix Decomposition**: Converts `pixel_art` into maximal rectangles
    - **Auto-Batching**: Merges consecutive blocks into WorldEdit regions
  - **Executor**:
    - **WorldEdit**: Uses `//set`, `//walls`, etc. for speed (500ms rate limited)
    - **Vanilla**: Fallback to `/setblock` if WorldEdit fails
    - **Safety**: Coordinates are relative to bot, bounded by max size
- **Output**: Physical blocks in the world

## Key Components

### `src/bot/`
- `connection.js`: Mineflayer bot setup
- `commands.js`: Chat command handling (!build, !cancel)

### `src/config/`
- `schemas.js`: JSON validation schemas
- `operations-registry.js`: Metadata for all build operations
- `limits.js`: Safety configurations (max blocks, delays)

### `src/stages/`
- `1-analyzer.js`: Regex parsing logic
- `2-generator.js`: LLM streaming logic
- `4-validator.js`: JSON schema & logic validation
- `5-builder.js`: Main execution engine (Batching logic resides here)

### `src/worldedit/`
- `executor.js`: Wrapper for WorldEdit commands via chat

## Data Flow
`User Prompt` -> `Analyzer` -> `Unified Prompt` -> `Gemini` -> `Blueprint JSON` -> `Optimizer` -> `Validator` -> `Builder` -> `Minecraft Server`

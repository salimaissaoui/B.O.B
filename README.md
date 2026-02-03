# B.O.B - Build Orchestrating Bot

AI-powered Minecraft building assistant that converts natural language into executable builds.

## Overview

B.O.B is a sophisticated building automation system for Minecraft that leverages large language models (LLMs) to interpret user intent and generate complex architectural structures. It features a dual-pipeline architecture designed for both flexible, creative generation and deterministic, high-quality parametric building.

## Features

- Natural language building command processing.
- Builder V2 (Production): Advanced component-driven parametric generation system.
- Tree Generation: 7 distinct archetypes with organic randomization logic.
- Intent-based scaling: Dynamic sizing from "mini" to "colossal" based on semantic hints.
- Network Resilience: Built-in retry logic and circuit breakers for LLM API stability.
- Creative freedom: Component-based building using WorldEdit primitives for organic shapes.
- Automated Pixel Art generation: Deterministic RGB-to-block mapping.
- Single-shot LLM generation with recursive safety validation.
- Schema-constrained generation: Eliminates hallucinated block types.
- FastAsyncWorldEdit (FAWE) integration: 50-100x speed increase for large-scale operations.
- Async command tracking: High-speed construction without blocking on server acknowledgments.
- Persistent build state: Support for session resumption and build listing.
- Architectural detail operations: Specialized logic for stairs, slabs, doors, and balconies.
- Quality validation: In-depth feature completeness and structural integrity checking.
- Automated fallback: Seamless transition from WorldEdit to vanilla placement.

## Architecture

B.O.B utilizes a modular pipeline architecture with two distinct tracks optimized for different build requirements.

### Builder V1: Serial Pipeline (Creative)
The V1 pipeline is designed for maximum flexibility, handling unique or abstract requests where no pre-defined components exist. It follows a four-stage process:
1.  **Analyzer**: An instant, non-LLM stage that extracts build type, theme, and intent through keyword analysis.
2.  **Generator**: A single LLM call that produces a full JSON blueprint. It uses specialized prompts to ensure the LLM thinks in terms of efficient block placement and WorldEdit operations.
3.  **Validator**: A rigorous phase that checks the blueprint against JSON schemas, coordinate boundaries (max height 256), and block registries. It can trigger an automatic representative repair loop if errors are detected.
4.  **Builder**: An execution engine that manages Mineflayer and WorldEdit commands, applying rate-limiting and failure recovery.

### Builder V2: Component pipeline (Deterministic)
The V2 pipeline (Production-grade) uses a higher-level abstraction for building:
-   **Semantic Extraction**: Deeper intent analysis to identify structural components.
-   **Parametric Components**: Instead of individual blocks, the system generates architectural nodes (lattice towers, arches, gable roofs) with variable parameters.
-   **Style Engine**: Decouples geometry from aesthetics, allowing consistent application of palettes and decorative trims across different structures.
-   **Seeded Compilation**: Ensures that the same prompt always produces identical geometry while allowing for controlled material variation.

### Infrastructure Layers
-   **Resilience Layer**: Handles API timeouts and transient network failures with exponential backoff.
-   **Circuit Breaker**: Protects the server and bot from command spam or WorldEdit failures by temporary pausing execution.
-   **Positioning Manager**: Manages bot navigation and teleportation logic to ensure optimal building range.

## Quick Start

### Prerequisites
- Node.js v18 or later
- Minecraft Server (1.20.1 recommended)
- Google Gemini API Key
- [FastAsyncWorldEdit (FAWE)](https://www.spigotmc.org/resources/fastasyncworldedit.13932/) (Recommended for high performance)

### Installation
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Configure environment: Copy `.env.example` to `.env` and provide your Gemini API key and server details.

Detailed setup guides are available in the [guides directory](docs/guides/):
- [Local Server Setup](docs/guides/LOCAL_SERVER_SETUP.md)
- [WorldEdit / FAWE Configuration](docs/guides/WORLDEDIT_SETUP.md)
- [Testing Guide](docs/guides/TESTING.md)

### Running B.O.B
Execute the following command to start the bot:
```bash
npm start
```
The bot will connect to the server and report its status. Ensure the "WorldEdit detected" message appears if you have the plugin installed.

## Usage Reference

### Primary Command
`!build <description>` - Starts a new build task (e.g., `!build a gothic stone castle`).

### Management Commands
- `!build status`: Current progress and diagnostics.
- `!build cancel`: Abort the current operation.
- `!build undo`: Rollback the last completed build.
- `!build list`: View recent build history.
- `!build help`: Display all available subcommands.

## Safety and Limits

B.O.B enforces strict operational boundaries to ensure server stability:
- **Maximum Height**: 256 blocks.
- **Max Operations**: 2,000 steps per blueprint.
- **Max Volume**: 5,000,000 blocks.
- **Abort Threshold**: 25% block placement failure rate.
- **Circuit Breaker**: Trips after 5 consecutive failures or 3 timeouts.

## Project Structure

- `src/bot/`: Core connection and command handling.
- `src/builder_v2/`: Advanced parametric components.
- `src/worldedit/`: FAWE integration and ACK parsing.
- `src/stages/`: V1 pipeline implementation.
- `src/operations/`: Building primitives and UI logic.
- `tests/`: Comprehensive test suite (800+ tests).

## License
MIT

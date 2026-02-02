# B.O.B - Build Orchestrating Bot

AI-powered Minecraft building assistant that safely converts natural language into executable builds.

## Features

- ✅ Natural language building commands
- ✅ **Builder v2 (Beta)** - Component-basedparametric generation system
- ✅ **Tree Generation Refactor** - 7 distinct archetypes with organic randomization
- ✅ **Intent-based scaling** - "massive tree" (80-120 blocks), "colossal castle" (150+ blocks)
- ✅ **Network Resilience** - Built-in retry logic and circuit breakers for API stability
- ✅ **Creative freedom** - Silhouette-first building with WorldEdit spheres/cylinders for organic shapes
- ✅ Automated Pixel Art generation (deterministic RGB-to-block mapping)
- ✅ Multi-stage LLM planning with safety validation
- ✅ Schema-constrained generation (no hallucinated blocks)
- ✅ WorldEdit integration for 50-100x faster large builds
- ✅ **Async WorldEdit tracking** for high-speed construction
- ✅ **Persistent build state** (Resume/List support)
- ✅ Architectural detail operations (stairs, slabs, doors, balconies)
- ✅ Quality validation with feature completeness checking
- ✅ Automatic fallback from WorldEdit to vanilla placement
- ✅ Enhanced WorldEdit diagnostics with error classification
- ✅ Comprehensive build statistics and progress tracking
- ✅ Undo/cancel support
- ✅ Live in-game construction

## Architecture

B.O.B uses a modular pipeline architecture with two distinct tracks:

### 1. Legacy Pipeline (V1)
A streamlined four-stage safety pipeline:
1.  **Analyzer** (no LLM) - Fast prompt analysis with build type and theme detection.
2.  **Generator** (single LLM call) - Complete blueprint generation with WorldEdit optimization.
3.  **Validator** - Schema validation and quality scoring.
4.  **Builder** - Execution with vanilla fallback and rate-limiting.

### 2. Builder v2 (Next Gen)
A sophisticated component-driven architecture:
-   **Semantic Intent** - Deep extraction of architectural hints.
-   **Parametric Components** - Generates reusable structural nodes (towers, arches, etc.).
-   **Style Engine** - Separates geometry from aesthetics (palettes, trims, gradients).
-   **Seeded Compilation** - Guaranteed determinism and reproducibility.
-   **Placement Optimization** - Advanced WorldEdit batching and ordering.

### Shared Infrastructure
-   **Network Resilience Layer** - `src/utils/network-resilience.js` provides retry/backoff for LLM API calls.
-   **State Persistence** - JSON-backed build tracking in `bob-state/`.
-   **Memory Module** - Local pattern storage for style consistency.

## Quick Start

### Prerequisites

- Node.js v18 or higher
- A Minecraft server (1.20.1 recommended)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- `sharp` library (for high-quality pixel art processing)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/salimaissaoui/B.O.B.git
   cd B.O.B
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   *Note: This will install `sharp`, which requires a compatible binary for your OS.*

3. Configure environment:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your details:
   ```env
   GEMINI_API_KEY=your_actual_api_key
   MINECRAFT_HOST=localhost
   MINECRAFT_PORT=25565
   MINECRAFT_USERNAME=BOB_Builder
   MINECRAFT_VERSION=1.20.1
   ```

### WorldEdit Setup (Optional but Recommended)

For significantly faster builds (50-100x speedup for large structures), install WorldEdit:

1. **Download WorldEdit** for your server type:
   - Bukkit/Spigot/Paper: [WorldEdit Bukkit](https://dev.bukkit.org/projects/worldedit)
   - Fabric: [WorldEdit Fabric](https://www.curseforge.com/minecraft/mc-mods/worldedit)

2. **Install the plugin/mod** in your server's `plugins/` or `mods/` directory

3. **Grant permissions** to the bot (via LuckPerms, PermissionsEx, or permissions.yml):
   ```yaml
   BOB_Builder:
     permissions:
       - worldedit.selection.*
       - worldedit.region.set
       - worldedit.region.walls
       - worldedit.generation.*
       - minecraft.command.setblock
   ```

4. **Restart your server**

B.O.B will automatically detect WorldEdit on startup and use it for large operations.

### Running B.O.B

Start the bot:
```bash
npm start
```

The bot will connect to your Minecraft server and be ready to accept commands. Look for the "WorldEdit detected" message to confirm WorldEdit integration.

## Usage

In Minecraft chat, use these commands:

```
!build modern oak house with balcony
```
Start building from a natural language description.

```
!build cancel
```
Cancel the current build operation.

```
!build undo
```
Undo the last completed build.

```
!build status
```
Check the progress of the current build (includes WorldEdit ops, fallbacks, and unconfirmed operations).

```
!build resume
```
Resume the most recently interrupted or saved build.

```
!build list
```
List recent saved builds and their statuses.

```
!build help
```
Show available commands.

## Examples

Here are some example build commands:

```
# Standard builds
!build small wooden cottage with a red roof
!build modern glass tower 20 blocks tall
!build stone bridge 10 blocks long
!build cozy hobbit hole with round door
!build medieval watchtower with balcony
!build pixel art charizard
!build a statue of a dragon

# Large-scale builds (with intent-based scaling)
!build massive ancient oak tree          # 80-120 blocks tall
!build colossal gothic castle            # 150+ blocks wide
!build towering wizard tower             # 100+ blocks tall
!build epic fantasy fortress             # Full-scale medieval complex
!build legendary world tree              # Enormous organic structure
```

## Operations Reference

B.O.B uses a variety of operations to build structures efficiently. Operations are automatically selected by the AI based on your build description.

### Basic Operations (Vanilla)

- **fill**: Solid rectangular fill
  - Use for: Floors, solid walls, foundations
  - Parameters: block, from {x,y,z}, to {x,y,z}

- **hollow_box**: Creates hollow rectangular structure (walls only)
  - Use for: Building frames, rooms
  - Parameters: block, from {x,y,z}, to {x,y,z}

- **set**: Places a single block
  - Use for: Individual block placement, details
  - Parameters: block, pos {x,y,z}

- **line**: Creates a line of blocks
  - Use for: Beams, edges, decorative lines
  - Parameters: block, from {x,y,z}, to {x,y,z}

- **window_strip**: Creates evenly-spaced windows
  - Use for: Window rows in walls
  - Parameters: block, from {x,y,z}, to {x,y,z}, spacing (default: 2)

### Roof Operations (Vanilla)

- **roof_gable**: Triangular gabled roof
  - Parameters: block, from {x,y,z}, to {x,y,z}, peakHeight

- **roof_hip**: Four-sided hip roof
  - Parameters: block, from {x,y,z}, to {x,y,z}, peakHeight

- **roof_flat**: Flat roof
  - Parameters: block, from {x,y,z}, to {x,y,z}

### Detail Operations (Vanilla)

- **stairs**: Places oriented stairs
  - Parameters: block (*_stairs), pos {x,y,z}, facing (north/south/east/west)

- **slab**: Places top or bottom slabs
  - Parameters: block (*_slab), pos {x,y,z}, half (top/bottom)

- **fence_connect**: Creates fence lines
  - Parameters: block (*_fence), from {x,y,z}, to {x,y,z}

- **door**: Places 2-block tall doors
  - Parameters: block (*_door), pos {x,y,z}, facing (north/south/east/west)

### Advanced Operations (Vanilla)

- **spiral_staircase**: Creates spiral staircase
  - Parameters: block (*_stairs), base {x,y,z}, height, radius (default: 2)

- **balcony**: Creates protruding balcony with optional railing
  - Parameters: block (floor), base {x,y,z}, width, depth, facing, railing (optional)

### WorldEdit Operations (Requires Plugin)

- **we_fill**: Large-scale fill (up to 500,000 blocks)
  - Parameters: block, from {x,y,z}, to {x,y,z}, fallback {...}
  - Limit: 250x250x250 max dimension per operation

- **we_walls**: Creates hollow structures efficiently
  - Parameters: block, from {x,y,z}, to {x,y,z}, fallback {...}
  - Limit: 250x250x250 max dimension per operation

- **we_pyramid**: Creates pyramids or pyramid roofs
  - Parameters: block, base {x,y,z}, height, hollow (true/false), fallback {...}
  - Limit: 250 block max height

- **we_cylinder**: Creates cylindrical towers and tree trunks
  - Parameters: block, base {x,y,z}, radius, height, hollow, fallback {...}
  - Limit: 125 block max radius (250 diameter)
  - Great for: Tree trunks (taper radius from base to top), towers, pillars

- **we_sphere**: Creates spherical shapes and leaf clusters
  - Parameters: block, center {x,y,z}, radius, hollow, fallback {...}
  - Limit: 125 block max radius (250 diameter)
  - Great for: Tree canopy clusters, domes, organic shapes

- **we_replace**: Replaces blocks in region
  - Parameters: from {x,y,z}, to {x,y,z}, fromBlock, toBlock
  - Limit: 250x250x250 max dimension per operation

## Safety Features

B.O.B includes multiple safety mechanisms while maximizing creative freedom:

- **Block Allowlist**: Only uses blocks explicitly mentioned in the design plan
- **JSON Schema Validation**: Ensures all outputs match expected structure
- **Coordinate Bounds Checking**: Prevents out-of-bounds placements for all coordinate types
- **Hard Height Limit**: 256 blocks (Minecraft world ceiling) - enforced as error
- **Soft Dimension Limits**: Width/depth over 300 blocks generates warnings (not errors)
- **Step Limits**: Maximum 2,000 operations per blueprint (prevents infinite loops)
- **Rate Limiting**: 50 blocks per second to prevent server lag
- **Undo Support**: Full build history with one-command rollback
- **WorldEdit Limits**: 500k blocks per selection, 200 commands per build
- **Error Classification**: Detailed error messages with suggested fixes for WorldEdit failures
- **Fallback Tracking**: Automatic fallback to vanilla with detailed logging
- **Build Metrics**: Full observability with dimensions, block counts, and WorldEdit usage

## Project Structure

```
B.O.B/
├── src/
│   ├── bot/
│   │   ├── connection.js      # Mineflayer bot setup
│   │   └── commands.js         # Chat command handlers
│   ├── config/
│   │   ├── blocks.js           # Minecraft block registry
│   │   ├── build-types.js      # Build type/theme detection
│   │   ├── limits.js           # Safety limits (WorldEdit + vanilla)
│   │   ├── operations-registry.js # Operation metadata
│   │   └── schemas.js          # JSON schemas & validators
│   ├── llm/
│   │   ├── gemini-client.js    # Gemini API wrapper
│   │   └── prompts/
│   │       ├── blueprint.js    # Blueprint generation prompts
│   │       └── unified-blueprint.js # Combined design+blueprint prompt
│   ├── operations/
│   │   ├── fill.js             # Fill operation (vanilla)
│   │   ├── hollow-box.js       # Hollow box operation (vanilla)
│   │   ├── set.js              # Single block placement
│   │   ├── line.js             # Line of blocks
│   │   ├── window-strip.js     # Window placement
│   │   ├── roof-gable.js       # Gabled roof
│   │   ├── roof-flat.js        # Flat roof
│   │   ├── roof-hip.js         # Hip roof (4-sided)
│   │   ├── stairs.js           # Stair placement
│   │   ├── slab.js             # Slab placement
│   │   ├── door.js             # Door placement
│   │   ├── fence-connect.js    # Fence lines
│   │   ├── spiral-staircase.js # Spiral staircases
│   │   ├── balcony.js          # Balconies
│   │   ├── pixel-art.js        # Pixel art generator
│   │   ├── we-fill.js          # WorldEdit fill
│   │   ├── we-walls.js         # WorldEdit walls
│   │   ├── we-pyramid.js       # WorldEdit pyramids
│   │   ├── we-cylinder.js      # WorldEdit cylinders
│   │   ├── we-sphere.js        # WorldEdit spheres
│   │   └── we-replace.js       # WorldEdit replace
│   ├── validation/
│   │   ├── worldedit-validator.js  # WorldEdit operation validation
│   │   └── quality-validator.js    # Build quality scoring
│   ├── worldedit/
│   │   └── executor.js         # WorldEdit command executor with diagnostics
│   ├── stages/
│   │   ├── 1-analyzer.js       # Stage 1: Prompt analysis (no LLM)
│   │   ├── 2-generator.js      # Stage 2: Blueprint generation (1 LLM call)
│   │   ├── 4-validator.js      # Stage 3a: Validation & repair
│   │   └── 5-builder.js        # Stage 3b: Execution with fallback
│   └── index.js                # Main entry point
├── tests/
│   ├── config/                 # Build type tests
│   ├── integration/            # Pipeline tests
│   ├── operations/             # Operation tests
│   ├── schemas/                # Schema tests
│   ├── stages/                 # Stage tests
│   └── worldedit/              # WorldEdit executor tests
├── .env.example                # Environment template
├── .gitignore
├── package.json
└── README.md
```

## Development

### Running Tests

```bash
npm test
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Required |
| `MINECRAFT_HOST` | Minecraft server hostname | `localhost` |
| `MINECRAFT_PORT` | Minecraft server port | `25565` |
| `MINECRAFT_USERNAME` | Bot username | `BOB_Builder` |
| `MINECRAFT_VERSION` | Minecraft version | `1.20.1` |

## How It Works

### The Three-Stage Pipeline

1. **Analyzer** (no LLM, instant): Analyzes your prompt to detect build type (house, castle, tower, pixel art, statue, etc.), theme (gothic, medieval, modern, etc.), and size. Generates recommended dimensions and materials without any LLM calls.

2. **Generator** (single LLM call): Creates a complete, executable blueprint in one LLM call. The prompt includes build type guidance, WorldEdit operation recommendations, and quality requirements. This single-call approach is faster and produces better results than multi-stage approaches.

3. **Validator + Executor**: 
   - Validates the blueprint against JSON schemas, coordinate bounds, and quality requirements
   - Checks WorldEdit operation limits (50k blocks, 50x50x50 dimensions)
   - Attempts automatic repair if errors are found (up to 3 retries)
   - Executes the blueprint with rate limiting, fallback support, and progress tracking

### Safety Mechanisms

- **Block Validation**: All blocks are validated against the Minecraft 1.20.1 registry
- **Structural Validation**: JSON schemas ensure all coordinates and operations are properly formatted
- **Bounds Checking**: All placements (from, to, pos, base, center) are verified to be within dimensions
- **Volume Limits**: Builds are capped at 30,000 blocks to prevent server overload
- **Automatic Repair**: The system attempts to fix common errors automatically (up to 3 retries)
- **WorldEdit Safety**: WorldEdit operations have separate limits (50k blocks, 50x50x50 max dimension)
- **Fallback System**: Automatic fallback to vanilla placement if WorldEdit fails
- **Quality Scoring**: Validates feature completeness and architectural integrity
- **Error Classification**: Detailed error messages with suggested fixes for WorldEdit failures
- **Unconfirmed Operation Tracking**: Monitors operations that didn't receive server acknowledgment

### WorldEdit Integration

When WorldEdit is available, B.O.B uses it intelligently:

- **Large Fills**: Uses `//set` for bulk placement (up to 50,000 blocks)
- **Hollow Structures**: Uses `//walls` for efficient wall creation
- **Complex Shapes**: Uses `//pyramid`, `//cyl`, `//sphere` for geometric structures
- **Automatic Fallback**: If WorldEdit fails, automatically switches to vanilla block placement
- **Async Command Tracking**: Sends multiple commands without blocking on server ACKs for maximum speed
- **Rate Limiting**: Enforces configurable delays between commands to prevent spam kicks
- **Adaptive Throttling**: Detects spam warnings and increases delays automatically

Performance comparison:
- **Vanilla placement**: ~50 blocks/second
- **WorldEdit operations**: ~25,000 blocks/second (500x faster)
- **Typical house (500 blocks)**: 10 seconds (vanilla) vs <1 second (WorldEdit)
- **Large castle (10,000 blocks)**: 3-4 minutes (vanilla) vs 5-10 seconds (WorldEdit)

## Capabilities & Limits

### Intent-Based Scaling
B.O.B supports natural language scale descriptors:
| Descriptor | Size Range | Example |
|------------|-----------|---------|
| tiny/mini | 5-15 blocks | "tiny bonsai tree" |
| small | 10-25 blocks | "small cottage" |
| medium | 20-50 blocks | "house" (default) |
| large | 40-80 blocks | "large castle" |
| massive | 60-120 blocks | "massive oak tree" |
| towering | 80-150 blocks | "towering wizard tower" |
| colossal | 100-200+ blocks | "colossal fortress" |

### Vanilla Mode (without WorldEdit)
- Maximum build size: 2000x256x2000 blocks (soft limit, warnings only)
- Maximum unique blocks: 30 per build
- Maximum total blocks: 5,000,000
- Maximum steps: 2,000 operations
- Build rate: ~50 blocks/second
- Chat command min delay: 500ms between commands
- Requires line-of-sight and proximity for block placement (Mineflayer limitation)

### WorldEdit Mode (recommended)
- Maximum build size: 2000x256x2000 blocks (soft limit)
- Maximum WorldEdit selection: 250x250x250 blocks per operation
- Maximum WorldEdit selection volume: 500,000 blocks per command
- Maximum WorldEdit commands: 200 per build
- WorldEdit command rate limit: 200ms minimum delay between commands
- Build rate: ~25,000 blocks/second for large operations
- Automatic fallback to vanilla if WorldEdit unavailable
- Adaptive throttling on spam detection (increases delays up to 4x)
- **Sphere/Cylinder support**: Perfect for organic builds (trees, towers)

### Hard Limits (Safety)
- Height: 256 blocks (Minecraft world ceiling)
- Invalid block names are rejected
- Step count enforced to prevent infinite loops

### General Notes
- Requires OP permissions or specific WorldEdit permissions
- **Organic shapes fully supported** with we_sphere and we_cylinder
- Interior decoration not automated (furniture, lighting, etc.)
- Quality validation requires 70% minimum score for feature completeness

## Troubleshooting

### Bot won't connect
- Verify your Minecraft server is running
- Check `MINECRAFT_HOST` and `MINECRAFT_PORT` in `.env`
- Ensure the Minecraft version matches your server

### API errors
- Verify your `GEMINI_API_KEY` is correct
- Check your API quota hasn't been exceeded
- Ensure you have internet connectivity

### Build failures
- The bot needs to be close enough to the build area
- Ensure the bot has the required blocks in inventory (for survival mode)
- Check server permissions allow the bot to place blocks

### WorldEdit Issues

#### WorldEdit not detected
**Symptoms**: Bot starts but doesn't use WorldEdit, or says "WorldEdit not available"

**Solutions**:
1. Verify WorldEdit/FAWE is installed in `plugins/` or `mods/` directory
2. Check plugin is loaded: run `/plugins` or `/version` in-game
3. Restart server after installing WorldEdit
4. Check server console for WorldEdit loading errors

#### Permission denied errors
**Symptoms**: "No permission" or "not permitted" errors during WorldEdit operations

**Solutions**:
1. Grant bot user WorldEdit permissions via LuckPerms, PermissionsEx, or permissions.yml:
   ```yaml
   BOB_Builder:
     permissions:
       - worldedit.selection.*
       - worldedit.selection.pos
       - worldedit.region.*
       - worldedit.region.set
       - worldedit.region.walls
       - worldedit.generation.*
       - worldedit.generation.pyramid
       - worldedit.generation.cylinder
       - worldedit.generation.sphere
       - minecraft.command.setblock
       - minecraft.command.tp
   ```
2. Verify bot is OP (if using vanilla permissions): `/op BOB_Builder`
3. Check server logs for permission denial details

#### Selection too large errors
**Symptoms**: "Selection too large" or "exceeds limit" messages

**Solutions**:
1. Increase WorldEdit limits in `config.yml` or `worldedit-config.yml`:
   ```yaml
   limits:
     max-blocks-changed:
       default: 50000
     max-radius: 50
     max-super-pickaxe-size: 5
   ```
2. B.O.B already enforces safe limits (50k blocks, 50x50x50 dimensions)
3. If using FAWE, check `config/FastAsyncWorldEdit/config.yml` for additional limits

#### Spam warnings / kicked for spam
**Symptoms**: Bot gets kicked or warned for command spam, WorldEdit commands fail

**Solutions**:
1. **Increase command delays** in `src/config/limits.js`:
   ```javascript
   worldEdit: {
     commandMinDelayMs: 300,  // Increase from 200ms
   }
   ```
2. **Enable anti-spam on server**: Install plugins like AntiSpam or configure built-in filters
3. **Monitor backoff multiplier**: B.O.B automatically increases delays when spam is detected
4. **Reduce WorldEdit commands per build** if server is sensitive:
   ```javascript
   maxCommandsPerBuild: 50,  // Reduce from 100
   ```

#### Unconfirmed operations
**Symptoms**: "No acknowledgment received" warnings in build logs

**Causes**:
- Chat message lag
- Anti-spam filters hiding responses
- WorldEdit executing successfully but response not captured

**Solutions**:
1. Check build still completed correctly (blocks placed)
2. Increase acknowledgment timeout in WorldEdit executor if needed
3. Verify chat isn't being filtered by anti-spam plugins
4. Consider using FAWE for better performance on large operations

#### Fallback operations triggered
**Symptoms**: Build completes but shows "Fallbacks used: X" in summary

**Causes**:
- WorldEdit permission issues
- Selection size limits exceeded
- WorldEdit plugin temporarily unavailable

**Check**:
1. Review build warnings for specific error types
2. Verify permissions are correctly configured
3. Check server logs for WorldEdit errors
4. Monitor build status with `!build status` during execution

### Anti-Spam Best Practices

To avoid spam-related issues when using B.O.B:

1. **Configure reasonable delays**: Don't set delays too low
2. **Use WorldEdit for large builds**: It's more efficient than vanilla placement
3. **Monitor build progress**: Use `!build status` to check for issues
4. **Whitelist the bot**: Configure anti-spam plugins to trust the bot user
5. **Review logs**: Check console for spam warnings and adjust accordingly

## Debug Mode

When troubleshooting issues, enable debug mode for detailed logging at each pipeline stage.

### Enabling Debug Mode

Set the environment variable before starting B.O.B:

```bash
# Windows (PowerShell)
$env:BOB_DEBUG="true"; npm start

# Windows (CMD)
set BOB_DEBUG=true && npm start

# Linux/Mac
BOB_DEBUG=true npm start
```

Or add to your `.env` file:
```
BOB_DEBUG=true
```

### Debug Output

With debug mode enabled, you'll see detailed information for:

1. **Build Type Detection**
   - Which build type was detected (pixel_art, house, tower, etc.)
   - Matched keywords and confidence level
   - Why a particular type was chosen

2. **Design Plan Generation**
   - User prompt received
   - Full design plan from LLM
   - Detected dimensions and features
   - Validation errors if any

3. **Blueprint Generation**
   - Build type and recommended operations
   - Allowlist and WorldEdit status
   - Operation breakdown (counts by type)
   - First few steps of the blueprint
   - Palette used

4. **Validation & Repair**
   - All validation errors found
   - Quality score and penalties
   - Repair attempts and results
   - Final validation status

### Example Debug Output

```
┌─────────────────────────────────────────────────────────
│ DEBUG: Design Plan Generation
├─────────────────────────────────────────────────────────
│ User Prompt: "build a pixelart charizard"
│ Detected Type: pixel_art (medium confidence)
│ Matched Keyword: charizard
│ Reason: Character/icon detected - defaulting to pixel art
└─────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────
│ DEBUG: Blueprint Generation
├─────────────────────────────────────────────────────────
│ Build Type: pixel_art (Pixel Art)
│ Dimensions: 32x32x1
│ Allowlist: orange_wool, red_wool, yellow_wool, black_wool, white_wool
│ WorldEdit: DISABLED
│ Features: pixel_art, facing_south
│ Recommended Ops: pixel_art
└─────────────────────────────────────────────────────────
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Acknowledgments

- Built with [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- Powered by [Google Gemini](https://deepmind.google/technologies/gemini/)
- JSON validation with [AJV](https://ajv.js.org/)

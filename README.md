# B.O.B - Build Orchestrating Bot

AI-powered Minecraft building assistant that safely converts natural language into executable builds.

## Features

- ✅ Natural language building commands
- ✅ Multi-stage LLM planning with safety validation
- ✅ Schema-constrained generation (no hallucinated blocks)
- ✅ WorldEdit integration for 50-100x faster large builds
- ✅ Architectural detail operations (stairs, slabs, doors, balconies)
- ✅ Quality validation with feature completeness checking
- ✅ Automatic fallback from WorldEdit to vanilla placement
- ✅ Undo/cancel support
- ✅ Live in-game construction

## Architecture

B.O.B uses a five-stage safety pipeline to ensure reliable and safe building:

1. **Design Plan** (LLM creative) - High-level architectural interpretation
2. **Allowlist Derivation** (safety filter) - Extract and validate block types
3. **Blueprint Generation** (LLM constrained) - Create executable instructions
4. **Validation & Repair** (schema enforcement) - Verify and fix errors
5. **Execution** (rate-limited building) - Build in Minecraft world

## Quick Start

### Prerequisites

- Node.js v18 or higher
- A Minecraft server (1.20.1 recommended)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

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
/build modern oak house with balcony
```
Start building from a natural language description.

```
/build cancel
```
Cancel the current build operation.

```
/build undo
```
Undo the last completed build.

```
/build status
```
Check the progress of the current build.

```
/build help
```
Show available commands.

## Examples

Here are some example build commands:

```
/build small wooden cottage with a red roof
/build modern glass tower 20 blocks tall
/build stone bridge 10 blocks long
/build cozy hobbit hole with round door
/build medieval watchtower with balcony
```

## Safety Features

B.O.B includes multiple safety mechanisms:

- **Block Allowlist**: Only uses blocks explicitly mentioned in the design plan
- **JSON Schema Validation**: Ensures all outputs match expected structure
- **Coordinate Bounds Checking**: Prevents out-of-bounds placements
- **Volume Limits**: Maximum 10,000 blocks per build
- **Rate Limiting**: 10 blocks per second to prevent server lag
- **Undo Support**: Full build history with one-command rollback

## Project Structure

```
B.O.B/
├── src/
│   ├── bot/
│   │   ├── connection.js      # Mineflayer bot setup
│   │   └── commands.js         # Chat command handlers
│   ├── config/
│   │   ├── blocks.js           # Minecraft block registry
│   │   ├── limits.js           # Safety limits
│   │   └── schemas.js          # JSON schemas & validators
│   ├── llm/
│   │   ├── gemini-client.js    # Gemini API wrapper
│   │   └── prompts/
│   │       ├── design-plan.js  # Design plan prompt
│   │       └── blueprint.js    # Blueprint prompts
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
│   │   └── executor.js         # WorldEdit command executor
│   ├── stages/
│   │   ├── 1-design-planner.js    # Stage 1: Design planning
│   │   ├── 2-allowlist-deriver.js # Stage 2: Block validation
│   │   ├── 3-blueprint-generator.js # Stage 3: Blueprint creation
│   │   ├── 4-validator.js         # Stage 4: Validation & repair
│   │   └── 5-builder.js           # Stage 5: Execution
│   └── index.js                # Main entry point
├── tests/
│   ├── schemas/
│   └── operations/
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

### The Five-Stage Pipeline

1. **Design Plan**: The LLM receives your natural language prompt and creates a high-level architectural plan with dimensions, style, materials, and features.

2. **Allowlist Derivation**: B.O.B extracts all block types from the design plan and validates them against the Minecraft block registry for the target version.

3. **Blueprint Generation**: The LLM converts the design plan into executable build instructions, constrained to use only the validated blocks.

4. **Validation & Repair**: The blueprint is validated against JSON schemas, coordinate bounds, and feature requirements. If errors are found, the LLM attempts to repair them automatically.

5. **Execution**: The validated blueprint is executed block-by-block in the Minecraft world with rate limiting and progress tracking.

### Safety Mechanisms

- **No Hallucination**: The block allowlist prevents the LLM from inventing non-existent blocks
- **Structural Validation**: JSON schemas ensure all coordinates and operations are properly formatted
- **Bounds Checking**: All placements are verified to be within the specified dimensions
- **Volume Limits**: Builds are capped at 10,000 blocks to prevent server overload
- **Automatic Repair**: The system attempts to fix common errors automatically
- **WorldEdit Safety**: WorldEdit operations have separate limits (50k blocks, 50x50x50 max dimension)
- **Fallback System**: Automatic fallback to vanilla placement if WorldEdit fails
- **Quality Scoring**: Validates feature completeness and architectural integrity

### WorldEdit Integration

When WorldEdit is available, B.O.B uses it intelligently:

- **Large Fills**: Uses `//set` for bulk placement (up to 50,000 blocks)
- **Hollow Structures**: Uses `//walls` for efficient wall creation
- **Complex Shapes**: Uses `//pyramid`, `//cyl`, `//sphere` for geometric structures
- **Automatic Fallback**: If WorldEdit fails, automatically switches to vanilla block placement
- **Rate Limiting**: Enforces 200ms delays between WorldEdit commands to prevent spam kicks
- **Adaptive Throttling**: Detects spam warnings and increases delays automatically

Performance comparison:
- **Vanilla placement**: ~50 blocks/second
- **WorldEdit operations**: ~25,000 blocks/second (500x faster)
- **Typical house (500 blocks)**: 10 seconds (vanilla) vs <1 second (WorldEdit)
- **Large castle (10,000 blocks)**: 3-4 minutes (vanilla) vs 5-10 seconds (WorldEdit)

## Limitations

### Vanilla Mode (without WorldEdit)
- Maximum build size: 100x256x100 blocks
- Maximum unique blocks: 15 per build
- Maximum total blocks: 10,000
- Build rate: ~50 blocks/second
- Requires line-of-sight and proximity for block placement (Mineflayer limitation)

### WorldEdit Mode (recommended)
- Maximum build size: 100x256x100 blocks (overall structure)
- Maximum WorldEdit selection: 50x50x50 blocks per operation
- Maximum WorldEdit selection volume: 50,000 blocks
- Maximum WorldEdit commands: 100 per build
- Build rate: ~25,000 blocks/second for large operations
- Automatic fallback to vanilla if WorldEdit unavailable

### General Limitations
- Requires OP permissions or specific WorldEdit permissions
- Complex organic shapes (curves, custom terrain) have limited support
- Interior decoration not automated (furniture, lighting, etc.)

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

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Acknowledgments

- Built with [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- Powered by [Google Gemini](https://deepmind.google/technologies/gemini/)
- JSON validation with [AJV](https://ajv.js.org/)

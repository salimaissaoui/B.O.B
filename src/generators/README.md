# Algorithmic Blueprint Generators

This directory contains deterministic blueprint generators that create Minecraft builds without requiring LLM API calls. This provides:

- **🚀 Speed**: Instant generation vs 2-10 second LLM calls
- **✅ Reliability**: No JSON parsing errors or API timeouts
- **💰 Cost**: No API token usage
- **🔄 Consistency**: Same input always produces same output

## Architecture

The hybrid generation system intelligently chooses between:

1. **Algorithmic Generation** (fast, deterministic)
   - Used for common build types with standard features
   - Generates blueprints using mathematical algorithms
   - No external dependencies

2. **LLM Generation** (flexible, creative)
   - Used for custom/complex builds
   - Leverages Gemini AI for creative designs
   - Fallback for unsupported algorithmic builds

## Supported Algorithmic Builds

### House Builder (`house-builder.js`)
Generates simple houses with:
- Walls, roof, windows, doors
- Optional: chimney, porch
- Dimensions: 5x5x5 to 30x20x30
- Themes: default, medieval, modern

**Example triggers:**
- "build a house"
- "make a small cottage"
- "create a wooden house with chimney"

### Castle Builder (`castle-builder.js`)
Generates medieval castles with:
- Outer walls with battlements
- Corner towers with spiral staircases
- Central keep
- Gatehouse with door
- Courtyard
- Dimensions: 15x10x15 to 100x256x100

**Example triggers:**
- "build a castle"
- "make a fortress"
- "create a medieval castle"

### Pixel Art Builder (`pixel-art-builder.js`)
Generates 2D pixel art patterns:
- **Patterns**: heart, smiley, creeper, sword, star, arrow, cross, checkerboard
- Dimensions: 3x3 to 64x64
- Automatic color selection from allowlist

**Example triggers:**
- "make pixel art of a heart"
- "create a creeper face"
- "build a smiley face pixel art"

## Adding New Generators

To add support for a new build type:

1. Create generator file (e.g., `tower-builder.js`)
2. Implement generation function:
   ```javascript
   export function generateTower(designPlan, allowlist, worldEditAvailable) {
     // Algorithm here
     return {
       size: { width, height, depth },
       palette: [...],
       steps: [...],
       buildType: 'tower',
       generationMethod: 'algorithmic'
     };
   }
   ```
3. Update `hybrid-generator.js`:
   - Import your generator
   - Add condition to `shouldUseAlgorithmic()`
   - Add case to `generateAlgorithmic()`
   - Document in `getSupportedAlgorithmicBuilds()`

## Performance Comparison

| Build Type | Algorithmic | LLM |
|------------|-------------|-----|
| Simple House | ~5ms | ~3-5s |
| Castle | ~10ms | ~5-8s |
| Pixel Art | ~2ms | ~2-4s |

## Testing

Run tests with:
```bash
npm test src/generators
```

## Future Enhancements

Potential algorithmic builders:
- [ ] Tower (cylindrical/square with stairs)
- [ ] Bridge (arched/flat with supports)
- [ ] Tree (natural organic shapes)
- [ ] Pyramid (stepped/smooth)
- [ ] Wall/fence (with gates)
- [ ] Farm (fields with crops)
- [ ] Ship (hull, deck, mast)

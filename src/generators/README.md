# Blueprint Generators

This directory contains both the **active LLM-based generator** and **archived algorithmic generators** for future use.

## Current Architecture (Active)

The main pipeline (`src/stages/2-generator.js`) uses:

1. **Unified LLM Generation** - Single Gemini API call generates complete blueprints
2. **Sprite Generation** - Dedicated pixel art generation via external sprite APIs
3. **Direct to Execution** - No hybrid selection logic

## Future/Archived Architecture (Inactive)

The files in this directory include an **enhanced hybrid system** that is NOT currently integrated but preserved for future offline/fallback modes:

### Enhanced Hybrid Generator (`enhanced-hybrid.js`)
Intelligent selection between:
1. **Template Generation** (instant, highest quality) - Uses proven blueprint templates
2. **Template + LLM Enhancement** (fast, customized) - Enhances templates with AI
3. **Algorithmic Generation** (instant, deterministic) - Mathematical generation
4. **Pure LLM Generation** (flexible, creative) - Full AI generation

### Benefits of Hybrid Approach
- **🚀 Speed**: Instant generation for common builds (no API calls)
- **✅ Reliability**: No JSON parsing errors or API timeouts
- **💰 Cost**: Zero API usage for template/algorithmic builds
- **🔄 Consistency**: Deterministic output for testing

## Archived Algorithmic Builds (Future Use)

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
3. Update `enhanced-hybrid.js`:
   - Import your generator
   - Add condition to `shouldUseAlgorithmic()`
   - Add case to `generateAlgorithmic()`
4. Integrate hybrid generator in pipeline:
   - Modify `src/stages/2-generator.js` to use `generateBlueprintEnhanced()`
   - Add configuration option for generation strategy priority

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

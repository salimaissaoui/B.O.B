# Testing the Improved Pipeline

This guide shows you how to test the pipeline improvements, specifically:
- ✅ Enhanced pixel art with 80+ block color palette
- ✅ Multi-axis batching optimizer (X, Y, Z)
- ✅ Improved LLM prompts for better builds

## Prerequisites

1. **Set up your Gemini API Key:**
   ```bash
   # Create or edit .env file
   echo "GEMINI_API_KEY=your_actual_api_key_here" > .env
   ```

2. **Install dependencies (if not already):**
   ```bash
   npm install
   ```

## Quick Tests (Without Minecraft)

These tests validate the pipeline without connecting to a Minecraft server:

### Test 1: Pixel Art Build
```bash
node quick-test.js "pixel art pikachu"
```

**What to look for:**
- ✓ Should generate a `pixel_art` operation
- ✓ Grid should have consistent row widths (all same length)
- ✓ Should use 10-20 different colors from expanded palette
- ✓ Blocks should include wool, concrete, terracotta, or special blocks

### Test 2: Big Beautiful Tree
```bash
node quick-test.js "big beautiful oak tree"
```

**What to look for:**
- ✓ Should use `box` operations for trunk and branches
- ✓ Should use `move` operations for cursor positioning
- ✓ Should have 15-30 operations total
- ✓ Trunk should be oak_log, canopy should be oak_leaves

### Test 3: Run Full Test Suite
```bash
node test-builds.js
```

This runs both tests above and provides a comprehensive report.

## Full Integration Tests (With Minecraft)

To test with an actual Minecraft server:

### 1. Start your Minecraft server
Make sure it's running on `localhost:25565` (or configure in `.env`)

### 2. Run the bot
```bash
npm start
```

### 3. In Minecraft chat, test builds:

**Pixel Art Test:**
```
!build pixel art pikachu
```

**Expected results:**
- Should complete in 10-30 seconds
- Colors should be vibrant and accurate
- Sprite should be perfectly aligned (not skewed)
- Should see 40-60 blocks placed
- No row width errors

**Tree Test:**
```
!build big beautiful oak tree
```

**Expected results:**
- Should complete in 15-45 seconds
- Tree should have organic, natural shape
- Should see WorldEdit batching optimization messages
- Should see Y-axis batching for trunk (vertical runs)
- 80-150 blocks placed total

## Debugging Failed Tests

### Issue: "Missing GEMINI_API_KEY"
**Solution:** Create `.env` file with your API key:
```bash
echo "GEMINI_API_KEY=your_key_here" > .env
```

### Issue: "Row width inconsistency"
**This should NOT happen anymore!** If you see this:
1. Check that you're using the updated `pixel-art.js`
2. Run: `git status` to verify changes were applied
3. Report the issue with the full error message

### Issue: "Validation failed: quality too low"
**Possible causes:**
- LLM didn't include all required features
- Try again (LLM responses vary slightly)
- Lower `minQualityScore` in `src/config/limits.js` (from 0.7 to 0.6)

### Issue: Rate limit errors from Gemini
**Solution:** Wait 60 seconds between tests, or upgrade your Gemini API tier

## Performance Benchmarks

Compare these against your actual results:

| Build Type | Operations | Time (WorldEdit) | Time (Vanilla) | Blocks |
|------------|-----------|------------------|----------------|--------|
| Small pixel art (16x16) | 1 | 2-5s | 5-10s | 200-256 |
| Medium pixel art (32x32) | 1 | 5-10s | 15-30s | 800-1024 |
| Large pixel art (64x64) | 1 | 10-20s | 60-120s | 3000-4096 |
| Small tree | 8-15 | 5-10s | 20-40s | 50-100 |
| Medium tree | 15-25 | 10-20s | 40-80s | 150-300 |
| Large tree | 25-40 | 15-30s | 60-120s | 300-600 |

## Improvements You Should See

### Before (Old Pipeline)
- ❌ Pixel art often skewed/lopsided
- ❌ Limited colors (32 blocks only)
- ❌ Only X-axis batching
- ❌ 100-200 WorldEdit commands for tall structures

### After (New Pipeline)
- ✅ Perfect pixel art alignment
- ✅ Rich colors (80+ blocks with LAB matching)
- ✅ X, Y, Z axis batching
- ✅ 30-60 WorldEdit commands for same structures (50-70% reduction)

## Advanced Testing

### Test Different Color Palettes
```javascript
// Edit quick-test.js, modify imageToPixelGrid call:
const result = await processImageUrl(imageUrl, 64, 64, {
    palette: 'full',  // Options: 'full', 'basic', 'wool'
    useLab: true      // Use LAB color space (recommended)
});
```

### Test Batching Optimizer
```bash
# Enable debug mode to see batching stats
DEBUG=true node quick-test.js "big tower"
```

Look for output like:
```
Batching Stats:
  Total blocks: 500
  Batched: 350 (70%)
  Commands: 25
  X-axis: 10, Y-axis: 12, Z-axis: 3
```

## Reporting Issues

If you encounter problems:

1. Run with debug mode:
   ```bash
   BOB_DEBUG=true node quick-test.js "your prompt"
   ```

2. Capture the full output

3. Include:
   - Node version: `node --version`
   - The exact prompt you used
   - Error message
   - Stack trace (if shown)

## Next Steps

Once tests pass:
- Try complex builds in Minecraft
- Experiment with different themes
- Test large structures (castles, cities)
- Try custom pixel art with your own images

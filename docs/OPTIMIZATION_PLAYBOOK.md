# 🚀 B.O.B Optimization Playbook

**Purpose**: Fast-track guide for the next agent implementing performance improvements.

---

## ⚡ QUICK START: Top 3 Wins

### 1️⃣ ACK Polling Optimization (Biggest Impact, Easiest Fix)
**Current**: Fixed 15s timeout for every WorldEdit command  
**Problem**: Wastes 10-14s when command completes in 1s  
**Solution**: Exponential backoff polling

```javascript
// BEFORE (src/worldedit/executor.js:557)
await this.waitForResponse(15000); // Always waits full 15s if no ACK

// AFTER (Proposed)
async function waitWithBackoff(maxTimeout = 15000) {
  const intervals = [100, 200, 500, 1000, 2000]; // Fast initial checks
  let elapsed = 0;
  
  for (const interval of intervals) {
    if (await checkForACK()) return true;
    await sleep(interval);
    elapsed += interval;
    if (elapsed >= maxTimeout) break;
  }
  
  // Then poll every 2s until maxTimeout
  while (elapsed < maxTimeout) {
    if (await checkForACK()) return true;
    await sleep(2000);
    elapsed += 2000;
  }
  return false; // Timeout
}
```

**Expected Gain**: 3-5x faster for typical builds (100 blocks)  
**Risk**: Low (just changes polling, not logic)  
**Test**: `tests/worldedit/executor.test.js` - verify ACKs still caught

---

### 2️⃣ LLM Response Streaming (Best UX Improvement)
**Current**: User sees nothing for 3-8 seconds during generation  
**Problem**: Feels unresponsive, users think bot is frozen  
**Solution**: Stream partial responses via `bot.chat()` increments

```javascript
// BEFORE (src/stages/2-generator.js)
const result = await geminiClient.send(prompt);
// ... 8 seconds of silence ...
return JSON.parse(result);

// AFTER (Proposed)
let chunkCount = 0;
const result = await geminiClient.sendStream(prompt, (chunk) => {
  chunkCount++;
  if (chunkCount % 10 === 0) {
    safeChat(bot, `  Generating... (${chunkCount} tokens)`);
  }
});
return JSON.parse(result);
```

**Expected Gain**: Perceived latency cut in half  
**Risk**: Medium (need to handle partial JSON)  
**Test**: Add `tests/stages/generator-streaming.test.js`

---

### 3️⃣ Validation Fail-Fast (Prevents Wasted Retries)
**Current**: Always tries 2 repair attempts even on hopeless errors  
**Problem**: 20+ seconds to fail on "impossible build"  
**Solution**: Detect critical errors early, skip repair

```javascript
// BEFORE (src/stages/4-validator.js)
if (!valid) {
  // Always repair, even if error is "maxHeight exceeded by 500 blocks"
  return await repairBlueprint();
}

// AFTER (Proposed)
if (!valid) {
  const isCriticalError = errors.some(e => 
    e.code === 'EXCEEDS_MAX_HEIGHT_BY_FACTOR' ||
    e.code === 'INVALID_BUILD_TYPE' ||
    e.code === 'EMPTY_BLUEPRINT'
  );
  
  if (isCriticalError) {
    throw new Error(`Critical validation error: ${errors[0].message}`);
  }
  
  return await repairBlueprint(); // Only for fixable errors
}
```

**Expected Gain**: 15-20s saved on invalid prompts  
**Risk**: Low (just skips futile retries)  
**Test**: Extend `tests/stages/validator.test.js`

---

## 📋 Implementation Checklist

For each optimization above:

### Phase 1: Baseline Measurement
```bash
# Add timing logs to current code
console.time('operation_name');
// ... existing code ...
console.timeEnd('operation_name');

# Run 10 test builds, record average time
npm run dev
!build simple house
# Note: Time to completion
```

### Phase 2: Implement Change
1. Create feature branch: `git checkout -b perf/ack-polling-backoff`
2. Write test FIRST (TDD):
   ```javascript
   test('ACK polling uses exponential backoff', async () => {
     const calls = [];
     const mockCheckACK = jest.fn(() => {
       calls.push(Date.now());
       return calls.length === 5; // ACK on 5th check
     });
     
     await waitWithBackoff(mockCheckACK);
     
     // Verify intervals: 100ms, 200ms, 500ms, 1000ms, 2000ms
     expect(calls[1] - calls[0]).toBeLessThan(150);
     expect(calls[2] - calls[1]).toBeLessThan(250);
   });
   ```

3. Implement optimization
4. Run `npm test` - ALL tests must pass
5. Add timing logs to new code

### Phase 3: Verify Improvement
```bash
# Run same 10 test builds
!build simple house
# Compare: Before vs After

# Expected results:
# BEFORE: ~12s total (8s LLM + 4s execution)
# AFTER:  ~9s total (8s LLM + 1s execution)
```

### Phase 4: Documentation Update
```bash
# Update these files:
- CLAUDE.md (if thresholds changed)
- docs/TEST_MATRIX.md (add new test)
- docs/ARCHITECTURE_STATE.md (update constants)
- CHANGELOG.md (document change)
```

### Phase 5: Commit & Verify
```bash
git add -A
git commit -m "perf: optimize ACK polling with exponential backoff

- Replaces fixed 15s wait with 100ms → 2s backoff
- Reduces average build time by 3s on typical builds
- All 736 tests passing

Closes #123"

npm test  # Final verification
```

---

## 🎯 Measurement Targets

**Success Criteria for Each Optimization**:

| Optimization | Metric | Before | Target | How to Measure |
|--------------|--------|--------|--------|----------------|
| ACK Backoff | Avg ACK wait | 14s | 1-3s | Log `ACK_ARRIVAL_TIME` |
| LLM Streaming | Perceived lag | 8s | 2s | User study (5 users) |
| Fail-Fast | Invalid build time | 24s | 5s | Count early aborts |
| Gallery Cache | Cache misses | 40% | <5% | Log `GALLERY_CACHE_HIT` |
| TP Threshold | Unnecessary TPs | 60% | <20% | Count TPs < 50 blocks |

---

## 🔬 Profiling Commands

**Before any optimization, profile first**:

```javascript
// Add to src/bot/commands.js (top of !build handler)
const buildStart = Date.now();
const stages = {
  parse: 0,
  analyze: 0,
  generate: 0,
  validate: 0,
  execute: 0
};

// Wrap each stage
const analyzeStart = Date.now();
const analysis = analyzePrompt(prompt);
stages.analyze = Date.now() - analyzeStart;

// At end of build
console.table({
  total: Date.now() - buildStart,
  ...stages
});

// Example output:
// ┌───────────┬────────┐
// │   (index) │ Values │
// ├───────────┼────────┤
// │   total   │  12456 │ ms
// │   parse   │    23  │
// │  analyze  │   145  │
// │ generate  │  7834  │ ← Bottleneck!
// │ validate  │   456  │
// │  execute  │  3998  │
// └───────────┴────────┘
```

---

## 🚨 Common Pitfalls

### ❌ DON'T: Optimize without measuring
```javascript
// BAD: "This looks slow, let me cache it"
const cache = new Map(); // Adds complexity for unmeasured gain
```

### ✅ DO: Profile, then optimize hot path
```javascript
// GOOD: Measure first
console.time('operation');
const result = operation();
console.timeEnd('operation');
// Output: operation: 0.234ms ← Not worth optimizing!
```

---

### ❌ DON'T: Break tests to make them pass
```javascript
// BAD: Test fails after optimization, so...
test.skip('old behavior test'); // ← RED FLAG
```

### ✅ DO: Update tests to match new behavior
```javascript
// GOOD: Update test expectations
test('new optimized behavior', () => {
  expect(newImplementation()).toBe(expectedResult);
});
```

---

### ❌ DON'T: Bundle optimizations with features
```javascript
// BAD: One giant PR
- Add new component
- Optimize ACK polling
- Refactor validator
- Fix 3 bugs
```

### ✅ DO: One optimization per PR
```javascript
// GOOD: Focused PR
- perf: optimize ACK polling with exponential backoff
  [single file changed, clear before/after benchmarks]
```

---

## 📊 Optimization Decision Matrix

**Should I optimize this?**

| Question | Answer | Action |
|----------|--------|--------|
| Does profiler show >10% time here? | **No** | ❌ Skip it |
| Does profiler show >10% time here? | **Yes** | Continue... |
| Can I reduce time by >30%? | **No** | ⚠️ Low ROI |
| Can I reduce time by >30%? | **Yes** | Continue... |
| Will tests still pass? | **No** | ❌ Too risky |
| Will tests still pass? | **Yes** | Continue... |
| Is code complexity increase <20%? | **No** | ⚠️ Reconsider |
| Is code complexity increase <20%? | **Yes** | ✅ **GO!** |

---

## 🎓 Optimization Resources

**Performance Testing**:
```bash
# Run build 10 times, get average
npm run benchmark -- "simple house" --iterations=10

# Compare two branches
npm run compare-perf -- main perf/ack-backoff

# Memory profiling
node --inspect src/index.js
# Chrome DevTools → Memory → Take Heap Snapshot
```

**Key Metrics to Track**:
1. **Time to First Block** (TTFB): User feedback latency
2. **Total Build Time**: End-to-end duration
3. **LLM Calls**: Token usage (cost)
4. **WorldEdit Commands**: Server load
5. **Memory Usage**: Heap size trend

---

**END OF PLAYBOOK**  
**Next Steps**: Pick optimization #1, follow checklist, profit! 🚀

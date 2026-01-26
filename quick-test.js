/**
 * Quick Test - Single Build Test
 * Usage: node quick-test.js "your prompt here"
 */

import dotenv from 'dotenv';
import { analyzePrompt } from './src/stages/1-analyzer.js';
import { generateBlueprint } from './src/stages/2-generator.js';

dotenv.config();

const prompt = process.argv[2] || 'pixel art pikachu';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY in .env file');
    process.exit(1);
}

console.log(`\n🧪 Testing: "${prompt}"\n`);

try {
    // Analyze
    console.log('1️⃣ Analyzing...');
    const analysis = analyzePrompt(prompt);
    console.log(`   Build Type: ${analysis.buildType}`);
    console.log(`   Dimensions: ${analysis.hints.dimensions.width}x${analysis.hints.dimensions.height}x${analysis.hints.dimensions.depth}`);

    // Generate
    console.log('\n2️⃣ Generating blueprint...');
    const blueprint = await generateBlueprint(analysis, GEMINI_API_KEY, true);

    console.log('\n✅ SUCCESS!');
    console.log(`   Steps: ${blueprint.steps.length}`);
    console.log(`   Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);

    // Show operations
    const ops = {};
    blueprint.steps.forEach(s => ops[s.op] = (ops[s.op] || 0) + 1);
    console.log('\n📋 Operations:');
    Object.entries(ops).forEach(([op, count]) => {
        console.log(`   ${op}: ${count}`);
    });

    // Pixel art specific checks
    if (analysis.buildType === 'pixel_art') {
        const paStep = blueprint.steps.find(s => s.op === 'pixel_art');
        if (paStep) {
            console.log('\n🎨 Pixel Art Details:');
            console.log(`   Grid: ${paStep.grid[0].length}x${paStep.grid.length}`);
            console.log(`   Colors: ${Object.keys(paStep.legend).length}`);

            // Check row consistency
            const widths = paStep.grid.map(r => r.length);
            const consistent = widths.every(w => w === widths[0]);
            console.log(`   Row consistency: ${consistent ? '✓ PASS' : '❌ FAIL'}`);

            if (!consistent) {
                console.log('   Row widths:', widths);
            }

            // Show preview
            console.log('\n   Preview (first 10 rows):');
            paStep.grid.slice(0, 10).forEach((row, i) => {
                console.log(`   ${String(i).padStart(2)}: ${row}`);
            });
        }
    }

    console.log('\n' + '✓'.repeat(50));
    console.log('Test completed successfully!');
    console.log('✓'.repeat(50) + '\n');

} catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (process.env.DEBUG) {
        console.error(error.stack);
    }
    process.exit(1);
}

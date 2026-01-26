/**
 * Test Build Script
 * Tests the improved pipeline with pixel art and tree builds
 */

import dotenv from 'dotenv';
import { analyzePrompt } from './src/stages/1-analyzer.js';
import { generateBlueprint } from './src/stages/2-generator.js';
import { validateBlueprint } from './src/stages/4-validator.js';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    console.error('Please add: GEMINI_API_KEY=your_key_here');
    process.exit(1);
}

/**
 * Test a single build
 */
async function testBuild(prompt, worldEditAvailable = true) {
    console.log('\n' + '='.repeat(80));
    console.log(`🧪 TESTING BUILD: "${prompt}"`);
    console.log('='.repeat(80));

    try {
        // Stage 1: Analyze
        console.log('\n📊 Stage 1: Analyzing prompt...');
        const analysis = analyzePrompt(prompt);
        console.log(`  ✓ Build Type: ${analysis.buildType}`);
        console.log(`  ✓ Theme: ${analysis.theme?.name || 'default'}`);
        console.log(`  ✓ Dimensions: ${analysis.hints.dimensions.width}x${analysis.hints.dimensions.height}x${analysis.hints.dimensions.depth}`);
        console.log(`  ✓ Materials: ${analysis.hints.materials.primary}, ${analysis.hints.materials.secondary}`);

        // Stage 2: Generate Blueprint
        console.log('\n🤖 Stage 2: Generating blueprint...');
        const blueprint = await generateBlueprint(analysis, GEMINI_API_KEY, worldEditAvailable);
        console.log(`  ✓ Blueprint generated`);
        console.log(`  ✓ Size: ${blueprint.size.width}x${blueprint.size.height}x${blueprint.size.depth}`);
        console.log(`  ✓ Steps: ${blueprint.steps.length}`);

        // Show operation breakdown
        const opCounts = {};
        for (const step of blueprint.steps) {
            opCounts[step.op] = (opCounts[step.op] || 0) + 1;
        }
        console.log('  ✓ Operations:');
        for (const [op, count] of Object.entries(opCounts).sort((a, b) => b[1] - a[1])) {
            console.log(`      ${op}: ${count}`);
        }

        // Check for pixel_art specifics
        if (analysis.buildType === 'pixel_art') {
            const pixelArtStep = blueprint.steps.find(s => s.op === 'pixel_art');
            if (pixelArtStep) {
                console.log(`  ✓ Pixel Art Grid:`);
                console.log(`      Dimensions: ${pixelArtStep.grid[0].length}x${pixelArtStep.grid.length}`);
                console.log(`      Legend entries: ${Object.keys(pixelArtStep.legend).length}`);

                // Validate all rows have same length
                const widths = pixelArtStep.grid.map(row => row.length);
                const allSame = widths.every(w => w === widths[0]);
                if (allSame) {
                    console.log(`      ✓ All rows have consistent width: ${widths[0]}`);
                } else {
                    console.log(`      ❌ Row width inconsistency detected!`);
                    widths.forEach((w, i) => {
                        if (w !== widths[0]) console.log(`         Row ${i}: ${w} (expected ${widths[0]})`);
                    });
                }

                // Show color palette
                const blocks = Object.values(pixelArtStep.legend).filter(b => b !== 'air');
                console.log(`      Blocks used: ${blocks.join(', ')}`);
            } else {
                console.log(`  ❌ ERROR: No pixel_art operation found for pixel_art build type!`);
            }
        }

        // Stage 3: Validate
        console.log('\n✅ Stage 3: Validating blueprint...');
        const validation = await validateBlueprint(blueprint, analysis, GEMINI_API_KEY);

        if (validation.valid) {
            console.log(`  ✓ Validation passed!`);
            console.log(`  ✓ Quality score: ${(validation.quality.score * 100).toFixed(1)}%`);
            if (validation.worldedit) {
                console.log(`  ✓ WorldEdit commands: ${validation.worldedit.worldEditCommands}`);
                console.log(`  ✓ WorldEdit blocks: ${validation.worldedit.worldEditBlocks}`);
            }
        } else {
            console.log(`  ❌ Validation failed!`);
            console.log(`  Errors:`);
            validation.errors.forEach(err => console.log(`    - ${err}`));
        }

        console.log('\n' + '✓'.repeat(80));
        console.log('BUILD TEST COMPLETED SUCCESSFULLY');
        console.log('✓'.repeat(80));

        return { success: true, blueprint, validation };

    } catch (error) {
        console.error('\n' + '❌'.repeat(80));
        console.error('BUILD TEST FAILED');
        console.error('❌'.repeat(80));
        console.error(`\nError: ${error.message}`);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        return { success: false, error };
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  B.O.B BUILD TEST SUITE                        ║');
    console.log('║           Testing Improved Pipeline Optimizations             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    const tests = [
        {
            name: 'Pixel Art Build',
            prompt: 'pixel art pikachu',
            description: 'Tests enhanced sprite processing with expanded color palette'
        },
        {
            name: 'Big Beautiful Tree',
            prompt: 'big beautiful oak tree',
            description: 'Tests multi-axis batching optimizer and cursor-relative building'
        }
    ];

    const results = [];

    for (const test of tests) {
        console.log('\n\n');
        console.log('┌────────────────────────────────────────────────────────────────┐');
        console.log(`│ TEST: ${test.name.padEnd(56)} │`);
        console.log(`│ ${test.description.padEnd(62)} │`);
        console.log('└────────────────────────────────────────────────────────────────┘');

        const result = await testBuild(test.prompt);
        results.push({ ...test, ...result });

        // Wait a bit between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    console.log('\n\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST SUMMARY                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\nTotal Tests: ${results.length}`);
    console.log(`✓ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('');

    results.forEach((result, i) => {
        const status = result.success ? '✓ PASS' : '❌ FAIL';
        console.log(`${i + 1}. ${status} - ${result.name}`);
        if (!result.success && result.error) {
            console.log(`   Error: ${result.error.message}`);
        }
    });

    console.log('\n' + '═'.repeat(80) + '\n');

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

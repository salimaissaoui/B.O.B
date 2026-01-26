/**
 * Build Simulation Script
 * 
 * Simulates the 3-stage pipeline (Analyzer -> Generator -> Validator)
 * for a specific user prompt without needing a Minecraft server.
 */

import dotenv from 'dotenv';
import { analyzePrompt } from '../src/stages/1-analyzer.js';
import { generateBlueprint } from '../src/stages/2-generator.js';
import { validateBlueprint } from '../src/stages/4-validator.js';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function simulate(prompt) {
    console.log(`\n=== SIMULATING: "${prompt}" ===`);

    try {
        // Stage 1: Analyze
        console.log('\n--- STAGE 1: ANALYZER ---');
        const analysis = analyzePrompt(prompt);
        console.log(`Build Type: ${analysis.buildType}`);
        console.log(`Theme: ${analysis.theme?.theme || 'default'}`);
        console.log(`Size: ${analysis.hints.size}`);
        console.log(`Dimensions: ${JSON.stringify(analysis.hints.dimensions)}`);

        if (!API_KEY) {
            console.error('\n✗ Error: GEMINI_API_KEY not found in .env');
            return;
        }

        // Stage 2: Generate
        console.log('\n--- STAGE 2: GENERATOR ---');
        const blueprint = await generateBlueprint(analysis, API_KEY, true);
        console.log(`✓ Blueprint generated (${blueprint.steps.length} steps)`);

        // Stage 3: Validate
        console.log('\n--- STAGE 3: VALIDATOR ---');
        const validationResult = await validateBlueprint(blueprint, analysis, API_KEY);

        if (validationResult.valid) {
            console.log('✓ Validation PASSED');
            console.log(`  Quality Score: ${(validationResult.quality.score * 100).toFixed(1)}%`);

            // Detailed step analysis
            const opCounts = {};
            blueprint.steps.forEach(s => opCounts[s.op] = (opCounts[s.op] || 0) + 1);
            console.log('\nOperations breakdown:');
            Object.entries(opCounts).forEach(([op, count]) => console.log(`  - ${op}: ${count}`));

            console.log('\nSample Steps:');
            blueprint.steps.slice(0, 5).forEach((s, i) => console.log(`  ${i + 1}. ${JSON.stringify(s)}`));
        } else {
            console.error('✗ Validation FAILED');
            validationResult.errors.forEach(e => console.error(`  - ${e}`));
        }

    } catch (error) {
        console.error(`\n\n┌─────────────────────────────────────────────────────────`);
        console.error(`│ ✗ SIMULATION CRASHED`);
        console.error(`├─────────────────────────────────────────────────────────`);
        console.error(`│ Error: ${error.message}`);
        console.error(`│ Stack: ${error.stack}`);
        console.error(`└─────────────────────────────────────────────────────────\n`);
    }
}

// Get prompt from CLI args or use default
const targetPrompt = process.argv.slice(2).join(' ') || 'build a big beautiful oak tree';
simulate(targetPrompt);

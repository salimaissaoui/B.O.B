/**
 * Generator Router
 * Routes build types to appropriate procedural generators
 * 
 * Only keeps generators for organic/complex shapes that LLM struggles with.
 * Simple structures (house, castle, tower) now use improved LLM generation.
 */

import { generateTreeBlueprint } from './tree-generator.js';
import { generateTreehouseBlueprint } from './treehouse-generator.js';

export function routeProceduralBuild(analysis) {
    const { buildType, userPrompt } = analysis;
    const prompt = (userPrompt || '').toLowerCase();

    // Treehouse: compound structure (tree + house on platform)
    if (prompt.includes('treehouse') || prompt.includes('tree house') || buildType === 'treehouse') {
        console.log(`🛠 Routing procedural build: treehouse`);
        return generateTreehouseBlueprint(analysis);
    }

    // Tree: organic shapes with spherical canopies
    if (buildType === 'tree' || buildType === 'organic') {
        console.log(`🛠 Routing procedural build: tree`);
        return generateTreeBlueprint(analysis);
    }

    // All other build types: use LLM with improved constraints
    return null;
}

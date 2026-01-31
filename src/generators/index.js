/**
 * Generator Router
 * Routes build types to appropriate procedural generators
 * 
 * Only keeps generators for organic/complex shapes that LLM struggles with.
 * SIMPLE STRUCTURES (house, castle, tower) and ORGANIC (tree, treehouse)
 * now use improved LLM generation with reference images.
 */

export function routeProceduralBuild(analysis) {
    // Currently all procedural paths are disabled in favor of LLM-first generation.
    // This maintains the interface for potential future specialized generators.

    // Pixel art is handled in Stage 2 before routing here.

    return null;
}

export const SAFETY_LIMITS = {
  maxBlocks: 30000,
  maxUniqueBlocks: 15,
  maxHeight: 256,
  maxWidth: 100,
  maxDepth: 100,
  maxSteps: 1000,
  buildRateLimit: 50,
  maxRetries: 3,
  llmTimeoutMs: 120000,
  llmMaxRetries: 5,
  llmRetryDelayMs: 1000,
  llmMaxOutputTokens: 8192,
  chatCommandMinDelayMs: 500,
  dayDuration: 600,  // seconds (30 in-game minutes)
  nightDuration: 90,

  // WorldEdit integration limits
  worldEdit: {
    enabled: true,                    // Feature flag
    maxSelectionVolume: 50000,        // Max blocks per //set command
    maxSelectionDimension: 50,        // Max single dimension (x/y/z)
    commandRateLimit: 5,              // WorldEdit commands per second
    commandMinDelayMs: 200,           // Min delay between WE commands
    maxCommandsPerBuild: 500,         // Total WE commands per build (each we_fill uses ~5 cmds)
    fallbackOnError: true,            // Auto-fallback to vanilla if WE fails
    requiredPermissions: [            // Expected permissions
      'worldedit.selection',
      'worldedit.region.set',
      'worldedit.region.walls'
    ]
  },

  // Quality validation thresholds
  minQualityScore: 0.7,               // Reject blueprints below this score
  requireFeatureCompletion: true,     // Ensure all requested features present
  
  // Build optimization settings
  allowPartialBuilds: false           // Continue build even if materials are missing
};

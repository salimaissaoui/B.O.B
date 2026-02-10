/**
 * Shared debug flag for BOB_DEBUG environment variable.
 */
export const DEBUG = process.env.BOB_DEBUG === 'true' || process.env.DEBUG === 'true';

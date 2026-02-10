// WorldEdit type constant used for matcher branching.
// Duplicated from executor.js to avoid circular imports.
const WORLDEDIT_TYPE_VANILLA = 'vanilla';

/**
 * Consolidated ACK/response parsing for WorldEdit commands.
 *
 * This module is the single source of truth for recognizing WorldEdit
 * responses. All matchers, classifiers, and parsers live here so that
 * new response patterns only need to be added in one place.
 */

// ─── Response Parsing ────────────────────────────────────────────────

/**
 * Parse block count from WorldEdit response message
 * @param {string} text - Response text
 * @returns {number|null} Block count or null if not found
 */
export function parseBlockCount(text) {
  if (!text) return null;

  // Pattern 1: "123 blocks changed/affected/set"
  const match1 = text.match(/(\d+)\s*(block|blocks)\s*(changed|affected|set|modified)/i);
  if (match1) return parseInt(match1[1], 10);

  // Pattern 2: "Operation completed (123 blocks)"
  const match2 = text.match(/operation completed\s*\(?\s*(\d+)\s*block/i);
  if (match2) return parseInt(match2[1], 10);

  // Pattern 3: "history: 123 changed"
  const match3 = text.match(/history[:\s#]*(\d+)\s*changed/i);
  if (match3) return parseInt(match3[1], 10);

  return null;
}

/**
 * Parse affected region bounds from WorldEdit response (if available)
 * Note: Most WorldEdit responses don't include bounds, but some do
 * @param {string} text - Response text
 * @param {Object} expectedBounds - Expected bounds from operation {from, to}
 * @returns {Object|null} Bounds {from, to} or null if not parseable
 */
export function parseAffectedRegion(text, expectedBounds = null) {
  if (!text) return null;

  // Pattern: "Set blocks from (x1, y1, z1) to (x2, y2, z2)"
  const boundsMatch = text.match(/from\s*\(?\s*(-?\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)\s*\)?\s*to\s*\(?\s*(-?\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)/i);
  if (boundsMatch) {
    return {
      from: {
        x: parseInt(boundsMatch[1], 10),
        y: parseInt(boundsMatch[2], 10),
        z: parseInt(boundsMatch[3], 10)
      },
      to: {
        x: parseInt(boundsMatch[4], 10),
        y: parseInt(boundsMatch[5], 10),
        z: parseInt(boundsMatch[6], 10)
      }
    };
  }

  // If we have expected bounds and operation succeeded, use those
  // This helps with cursor tracking even when exact bounds aren't in response
  if (expectedBounds) {
    return expectedBounds;
  }

  return null;
}

// ─── Success Pattern Constants ───────────────────────────────────────

/**
 * Patterns that indicate a successful WorldEdit response.
 * Shared by getAckMatcher, isAckMessage, and the inline executeCommand matcher.
 */

/** FAWE-specific success patterns */
function matchesFaweSuccess(lower) {
  // Pattern A: "Operation completed (123 blocks)."
  if (lower.includes('operation completed')) return true;
  // Pattern B: "0.5s elapsed (history: 123 changed; ...)"
  if (lower.includes('elapsed') && lower.includes('history') && lower.includes('changed')) return true;
  return false;
}

/** Standard WorldEdit success patterns (work for all types) */
function matchesStandardSuccess(text, lower) {
  if (/(\d+)\s*(block|blocks|positions?)\s*(changed|affected|set|modified)/i.test(text)) return true;
  if (/history\s*(:?)\s*#?\d+\s*changed/i.test(text)) return true;
  if (lower.includes('set to') && !lower.includes('selection type')) return true;
  return false;
}

/** Selection/clipboard response patterns */
function matchesSelectionResponse(lower) {
  return lower.includes('selection cleared') ||
    lower.includes('region cleared') ||
    lower.includes('pasted') ||
    lower.includes('clipboard') ||
    lower.includes('no blocks');
}

/** Undo/Redo response patterns */
function matchesUndoResponse(lower) {
  return lower.includes('undo successful') ||
    lower.includes('undid') ||
    lower.includes('redo successful');
}

// ─── Error Pattern Constants ─────────────────────────────────────────

/** Patterns that indicate an error response (fail fast) */
function matchesErrorResponse(lower) {
  return lower.includes('unknown command') ||
    lower.includes('unknown or incomplete command') ||
    lower.includes('see below for error') ||
    lower.includes('<--[here]') ||
    lower.includes('no permission') ||
    lower.includes('don\'t have permission') ||
    lower.includes('not permitted') ||
    lower.includes('selection too large') ||
    lower.includes('invalid value') ||
    lower.includes('does not match a valid block type') ||
    lower.includes('acceptable values are') ||
    lower.includes('maximum') ||
    lower.includes('error') ||
    lower.includes('cannot') ||
    lower.includes('failed');
}

// ─── Public Matcher Functions ────────────────────────────────────────

/**
 * Get ACK matcher function based on WorldEdit type.
 * Used for waitForResponseWithBackoff in executeCommand.
 * @param {string} worldEditType - One of WORLDEDIT_TYPE values
 * @returns {Function} Matcher function (text) => boolean
 */
export function getAckMatcher(worldEditType) {
  return (text) => {
    const lower = text.toLowerCase();

    // FAWE-specific patterns (skip for vanilla-only)
    if (worldEditType !== WORLDEDIT_TYPE_VANILLA) {
      if (matchesFaweSuccess(lower)) return true;
    }

    // Standard success patterns
    if (matchesStandardSuccess(text, lower)) return true;

    // Selection/clipboard responses
    if (matchesSelectionResponse(lower)) return true;

    // Selection mode confirmation
    if (/cuboid.*left click|left click.*cuboid/i.test(text)) return true;

    // Undo/Redo
    if (matchesUndoResponse(lower)) return true;

    // Error patterns (fail fast)
    return matchesErrorResponse(lower);
  };
}

/**
 * Check if a message looks like a WorldEdit ACK (success or error).
 * Used by the async ACK verifier.
 * @param {string} text - Chat message text
 * @returns {boolean}
 */
export function isAckMessage(text) {
  const lower = text.toLowerCase();
  return matchesFaweSuccess(lower) ||
    matchesStandardSuccess(text, lower) ||
    matchesSelectionResponse(lower) ||
    matchesUndoResponse(lower) ||
    matchesErrorResponse(lower);
}

// ─── Command Classification ─────────────────────────────────────────

/**
 * Regex patterns for commands that change blocks in the world.
 * Shared between commandExpectsAck and commandExpectsBlockChange.
 */
const BLOCK_CHANGING_PATTERNS = [
  /\/\/set\s/,
  /\/\/replace\s/,
  /\/\/walls\s/,
  /\/\/fill\s/,
  /\/\/stack\s/,
  /\/\/move\s/,
  /\/\/copy/,
  /\/\/paste/,
  /\/\/cut/,
  /\/\/pyramid\s/,
  /\/\/hpyramid\s/,
  /\/\/cyl\s/,
  /\/\/hcyl\s/,
  /\/\/sphere\s/,
  /\/\/hsphere\s/,
  /\/\/undo/,
  /\/\/redo/,
  /\/\/drain/,
  /\/\/fixwater/,
  /\/\/fixlava/,
  /\/\/snow/,
  /\/\/thaw/,
  /\/\/green/,
  /\/\/flora/,
  /\/\/forest/,
  /\/\/overlay\s/,
  /\/\/naturalize/,
  /\/\/smooth/,
  /\/\/deform/,
  /\/\/hollow/,
  /\/\/center\s/,
  /\/\/line\s/,
  /\/\/curve\s/,
  /\/\/regen/
];

/** State-changing commands that affect selection (ACK-worthy but not block-changing) */
const STATE_CHANGING_PATTERNS = [
  /\/\/pos1/,
  /\/\/pos2/,
  /\/\/hpos1/,
  /\/\/hpos2/,
  /\/\/sel\s/,
  /\/\/desel/,
  /\/(contract|expand|shift|outset|inset)\s/
];

/**
 * Check if a command expects acknowledgment from the server.
 * Includes both block-changing and state-changing commands.
 * @param {string} command - The command to check
 * @returns {boolean}
 */
export function commandExpectsAck(command) {
  const lower = command.toLowerCase();

  for (const pattern of BLOCK_CHANGING_PATTERNS) {
    if (pattern.test(lower)) return true;
  }

  for (const pattern of STATE_CHANGING_PATTERNS) {
    if (pattern.test(lower)) return true;
  }

  return false;
}

/**
 * Check if a command is expected to change blocks in the world.
 * Subset of commandExpectsAck — excludes state-only commands.
 * @param {string} command - The command to check
 * @returns {boolean}
 */
export function commandExpectsBlockChange(command) {
  const lower = command.toLowerCase();

  for (const pattern of BLOCK_CHANGING_PATTERNS) {
    if (pattern.test(lower)) return true;
  }

  return false;
}

// ─── Error Classification ────────────────────────────────────────────

/**
 * Classify an error response from WorldEdit.
 * @param {string} response - The error response text
 * @param {string} command - The command that caused the error
 * @returns {Object|null} Error classification { type, message, suggestedFix } or null if not an error
 */
export function classifyError(response, command) {
  const lower = response.toLowerCase();

  // Permission errors
  if (lower.includes('no permission') ||
    lower.includes("don't have permission") ||
    lower.includes('not permitted') ||
    lower.includes('you cannot')) {
    return {
      type: 'PERMISSION_DENIED',
      message: `Permission denied for command: ${command}`,
      suggestedFix: 'Check that the bot has WorldEdit permissions'
    };
  }

  // Command not recognized
  if (lower.includes('unknown command') ||
    lower.includes('unknown or incomplete command') ||
    lower.includes('see below for error') ||
    lower.includes('<--[here]')) {
    return {
      type: 'COMMAND_NOT_RECOGNIZED',
      message: `Command not recognized: ${command}`,
      suggestedFix: 'Check command syntax and WorldEdit version'
    };
  }

  // No selection
  if (lower.includes('no selection') ||
    lower.includes('make a selection') ||
    lower.includes('select a region') ||
    lower.includes('make a region selection') ||
    lower.includes('selection not defined') ||
    lower.includes('you haven\'t made a selection') ||
    lower.includes('selection was removed')) {
    return {
      type: 'NO_SELECTION',
      message: `No selection defined for command: ${command}`,
      suggestedFix: 'Create a selection with //pos1 and //pos2 first. If this happened during building, WorldEdit state may have been cleared by another plugin.'
    };
  }

  // Selection too large
  if (lower.includes('selection too large') ||
    lower.includes('too many blocks') ||
    lower.includes('maximum allowed') ||
    (lower.includes('maximum') && lower.includes('blocks'))) {
    return {
      type: 'SELECTION_TOO_LARGE',
      message: `Selection too large for command: ${command}`,
      suggestedFix: 'Reduce selection size or use chunked operations'
    };
  }

  // Invalid syntax / block type
  if (lower.includes('invalid value') ||
    lower.includes('does not match a valid block') ||
    lower.includes('acceptable values are') ||
    lower.includes('invalid block') ||
    lower.includes('unknown block')) {
    return {
      type: 'INVALID_SYNTAX',
      message: `Invalid syntax or block type in command: ${command}`,
      suggestedFix: 'Check block names and command syntax'
    };
  }

  // Internal error
  if (lower.includes('internal error') ||
    lower.includes('exception') ||
    lower.includes('error occurred') ||
    lower.includes('failed')) {
    return {
      type: 'INTERNAL_ERROR',
      message: `Internal error executing command: ${command}`,
      suggestedFix: 'Try again or check server logs. If using FAWE, ensure you are not in a restricted region.'
    };
  }

  // Not an error - return null
  return null;
}

// ─── Command Validation ──────────────────────────────────────────────

/**
 * Validate a WorldEdit command for safety.
 * @param {string} command - The command to validate
 * @throws {Error} If command is invalid or potentially dangerous
 */
export function validateCommand(command) {
  if (!command || typeof command !== 'string') {
    throw new Error('Invalid command: must be a non-empty string');
  }

  const trimmedCmd = command.trim();

  // Must start with // for WorldEdit commands
  if (!trimmedCmd.startsWith('//') && !trimmedCmd.startsWith('/')) {
    throw new Error(`Invalid WorldEdit command format: ${command}`);
  }

  // Block dangerous commands
  const dangerousPatterns = [
    /\/\/script/i,
    /\/\/cs\s/i,
    /\/\/craftscript/i,
    /\.js\s*$/i,
    /eval/i,
    /exec/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedCmd)) {
      throw new Error(`Potentially dangerous command blocked: ${command}`);
    }
  }
}

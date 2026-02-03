/**
 * Schematic Gallery Service
 * Scans local schematics folder and provides fuzzy search
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default schematics folder (relative to project root)
const SCHEMATICS_DIR = path.resolve(__dirname, '../../schematics');

// Cached index
let schematicIndex = null;
let lastScanTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Scan the schematics folder and build an index
 * @returns {Promise<Array>} Array of schematic info objects
 */
export async function scanSchematicsFolder(customDir = null) {
    const dir = customDir || SCHEMATICS_DIR;

    try {
        await fs.access(dir);
    } catch {
        console.log(`📁 Schematics folder not found: ${dir}`);
        return [];
    }

    const files = await fs.readdir(dir, { withFileTypes: true });
    const schematics = [];

    for (const file of files) {
        if (file.isFile()) {
            const ext = path.extname(file.name).toLowerCase();
            if (['.schem', '.schematic', '.nbt'].includes(ext)) {
                const name = path.basename(file.name, ext);
                const filePath = path.join(dir, file.name);
                const stats = await fs.stat(filePath);

                schematics.push({
                    name,
                    filename: file.name,
                    path: filePath,
                    ext,
                    size: stats.size,
                    // Generate searchable keywords from filename
                    keywords: name.toLowerCase()
                        .replace(/[-_]/g, ' ')
                        .split(/\s+/)
                        .filter(k => k.length > 1)
                });
            }
        }
    }

    console.log(`📁 Indexed ${schematics.length} schematics from ${dir}`);
    return schematics;
}

/**
 * Get cached schematic index (refreshes if stale)
 */
export async function getSchematicIndex() {
    const now = Date.now();

    if (schematicIndex && (now - lastScanTime) < CACHE_TTL) {
        return schematicIndex;
    }

    schematicIndex = await scanSchematicsFolder();
    lastScanTime = now;
    return schematicIndex;
}

/**
 * Calculate similarity score between query and schematic name
 * Higher is better (0-1 range)
 */
function calculateSimilarity(query, schematic) {
    const queryWords = query.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1);

    if (queryWords.length === 0) return 0;

    const schematicName = schematic.name.toLowerCase();
    const keywords = schematic.keywords;

    // Exact name match
    if (schematicName === query.toLowerCase().replace(/\s+/g, '_') ||
        schematicName === query.toLowerCase().replace(/\s+/g, '-') ||
        schematicName === query.toLowerCase().replace(/\s+/g, '')) {
        return 1.0;
    }

    // Count matching keywords
    let matches = 0;
    for (const word of queryWords) {
        // Direct keyword match
        if (keywords.includes(word)) {
            matches += 1;
            continue;
        }
        // Partial match (word contains or is contained)
        for (const keyword of keywords) {
            if (keyword.includes(word) || word.includes(keyword)) {
                matches += 0.5;
                break;
            }
        }
    }

    // Normalize by query word count
    return matches / queryWords.length;
}

/**
 * Find the best matching schematic for a query
 * @param {string} query - User's build request
 * @param {number} threshold - Minimum similarity score (0-1)
 * @returns {Promise<Object|null>} Best matching schematic or null
 */
export async function findBestMatch(query, threshold = 0.5) {
    const index = await getSchematicIndex();

    if (index.length === 0) {
        return null;
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const schematic of index) {
        const score = calculateSimilarity(query, schematic);
        if (score > bestScore && score >= threshold) {
            bestScore = score;
            bestMatch = { ...schematic, score };
        }
    }

    if (bestMatch) {
        console.log(`🔍 Schematic match: "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`);
    }

    return bestMatch;
}

/**
 * List all available schematics
 */
export async function listSchematics() {
    const index = await getSchematicIndex();
    return index.map(s => ({
        name: s.name,
        filename: s.filename,
        size: `${(s.size / 1024).toFixed(1)}KB`
    }));
}

/**
 * Force refresh the schematic index
 */
export function invalidateCache() {
    schematicIndex = null;
    lastScanTime = 0;
}

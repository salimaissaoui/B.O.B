/**
 * Export Module Index
 *
 * Central entry point for all export functionality.
 */

export { SchematicExporter } from './schematic-exporter.js';
export { FunctionExporter } from './function-exporter.js';

/**
 * Export a blueprint to the specified format
 *
 * @param {Object} blueprint - B.O.B blueprint
 * @param {string} format - Export format ('schem', 'mcfunction')
 * @param {string} filename - Output filename
 * @param {Object} options - Export options
 * @returns {Promise<string>} Path to exported file
 */
export async function exportBlueprint(blueprint, format, filename, options = {}) {
    switch (format.toLowerCase()) {
        case 'schem':
        case 'schematic': {
            const { SchematicExporter } = await import('./schematic-exporter.js');
            const exporter = new SchematicExporter(options);
            return exporter.export(blueprint, filename);
        }

        case 'mcfunction':
        case 'function': {
            const { FunctionExporter } = await import('./function-exporter.js');
            const exporter = new FunctionExporter(options);
            return exporter.export(blueprint, filename);
        }

        default:
            throw new Error(`Unsupported export format: ${format}. Supported: schem, mcfunction`);
    }
}

export default exportBlueprint;

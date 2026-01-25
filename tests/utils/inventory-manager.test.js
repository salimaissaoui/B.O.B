/**
 * Tests for Inventory Manager
 */

import { 
  scanInventory, 
  calculateMaterialRequirements, 
  validateMaterials,
  formatMaterialList,
  InventoryManager 
} from '../../src/utils/inventory-manager.js';

describe('Inventory Manager', () => {
  describe('scanInventory', () => {
    test('returns empty map for bot without inventory', () => {
      const bot = {};
      const result = scanInventory(bot);
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    test('scans bot inventory correctly', () => {
      const bot = {
        inventory: {
          items: () => [
            { name: 'stone', count: 64 },
            { name: 'dirt', count: 32 },
            { name: 'stone', count: 20 } // Duplicate to test aggregation
          ]
        }
      };
      const result = scanInventory(bot);
      expect(result.get('stone')).toBe(84); // 64 + 20
      expect(result.get('dirt')).toBe(32);
    });
  });

  describe('calculateMaterialRequirements', () => {
    test('returns empty map for empty blueprint', () => {
      const blueprint = { steps: [] };
      const result = calculateMaterialRequirements(blueprint);
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    test('calculates requirements from direct blocks', () => {
      const blueprint = {
        steps: [
          { op: 'set', block: 'stone' },
          { op: 'set', block: 'stone' },
          { op: 'set', block: 'dirt' }
        ]
      };
      const result = calculateMaterialRequirements(blueprint);
      expect(result.get('stone')).toBe(2);
      expect(result.get('dirt')).toBe(1);
    });

    test('calculates requirements from volume operations', () => {
      const blueprint = {
        steps: [
          { op: 'fill', block: 'stone', size: { width: 3, height: 3, depth: 3 } }
        ]
      };
      const result = calculateMaterialRequirements(blueprint);
      expect(result.get('stone')).toBe(27); // 3x3x3
    });

    test('resolves palette variables', () => {
      const blueprint = {
        palette: { wall: 'stone_bricks', floor: 'oak_planks' },
        steps: [
          { op: 'set', block: '$wall' },
          { op: 'set', block: '$floor' }
        ]
      };
      const result = calculateMaterialRequirements(blueprint);
      expect(result.get('stone_bricks')).toBe(1);
      expect(result.get('oak_planks')).toBe(1);
    });

    test('skips non-placement operations', () => {
      const blueprint = {
        steps: [
          { op: 'move', offset: { x: 1, y: 0, z: 0 } },
          { op: 'cursor_reset' },
          { op: 'site_prep' },
          { op: 'set', block: 'stone' }
        ]
      };
      const result = calculateMaterialRequirements(blueprint);
      expect(result.size).toBe(1);
      expect(result.get('stone')).toBe(1);
    });

    test('ignores air blocks', () => {
      const blueprint = {
        steps: [
          { op: 'set', block: 'air' },
          { op: 'set', block: 'stone' }
        ]
      };
      const result = calculateMaterialRequirements(blueprint);
      expect(result.size).toBe(1);
      expect(result.get('stone')).toBe(1);
      expect(result.has('air')).toBe(false);
    });
  });

  describe('validateMaterials', () => {
    test('validates when bot has no inventory system', () => {
      const bot = {};
      const blueprint = {
        steps: [{ op: 'set', block: 'stone' }]
      };
      const result = validateMaterials(bot, blueprint);
      expect(result.valid).toBe(true);
      expect(result.hasInventory).toBe(false);
    });

    test('validates when materials are available', () => {
      const bot = {
        inventory: {
          items: () => [
            { name: 'stone', count: 100 }
          ]
        }
      };
      const blueprint = {
        steps: [
          { op: 'set', block: 'stone' },
          { op: 'set', block: 'stone' }
        ]
      };
      const result = validateMaterials(bot, blueprint);
      expect(result.valid).toBe(true);
      expect(result.hasInventory).toBe(true);
      expect(result.missing.size).toBe(0);
    });

    test('detects missing materials', () => {
      const bot = {
        inventory: {
          items: () => [
            { name: 'stone', count: 1 }
          ]
        }
      };
      const blueprint = {
        steps: [
          { op: 'fill', block: 'stone', size: { width: 3, height: 3, depth: 3 } }
        ]
      };
      const result = validateMaterials(bot, blueprint);
      expect(result.valid).toBe(false);
      expect(result.hasInventory).toBe(true);
      expect(result.missing.get('stone')).toBeGreaterThan(0); // Need 27, have 1
      expect(result.requirements.get('stone')).toBe(27);
    });

    test('provides detailed summary', () => {
      const bot = {
        inventory: {
          items: () => [
            { name: 'stone', count: 10 },
            { name: 'dirt', count: 5 }
          ]
        }
      };
      const blueprint = {
        steps: [
          { op: 'set', block: 'stone' },
          { op: 'set', block: 'dirt' },
          { op: 'set', block: 'glass' }
        ]
      };
      const result = validateMaterials(bot, blueprint);
      expect(result.summary.totalRequired).toBe(3);
      expect(result.summary.uniqueBlockTypes).toBe(3);
      expect(result.summary.missingBlockTypes).toBe(1); // glass
    });
  });

  describe('formatMaterialList', () => {
    test('formats empty requirements', () => {
      const requirements = new Map();
      const result = formatMaterialList(requirements);
      expect(result).toBe('No materials required');
    });

    test('formats material list', () => {
      const requirements = new Map([
        ['stone', 64],
        ['dirt', 32]
      ]);
      const result = formatMaterialList(requirements);
      expect(result).toContain('stone: 64');
      expect(result).toContain('dirt: 32');
    });
  });

  describe('InventoryManager class', () => {
    test('provides convenient API for inventory operations', () => {
      const bot = {
        inventory: {
          items: () => [
            { name: 'stone', count: 50 }
          ]
        }
      };
      const manager = new InventoryManager(bot);
      
      expect(manager.getItemCount('stone')).toBe(50);
      expect(manager.getItemCount('dirt')).toBe(0);
      expect(manager.hasItem('stone', 10)).toBe(true);
      expect(manager.hasItem('stone', 100)).toBe(false);
    });

    test('validates blueprint materials', () => {
      const bot = {
        inventory: {
          items: () => [
            { name: 'stone', count: 100 }
          ]
        }
      };
      const manager = new InventoryManager(bot);
      const blueprint = {
        steps: [{ op: 'set', block: 'stone' }]
      };
      
      const result = manager.validateForBlueprint(blueprint);
      expect(result.valid).toBe(true);
    });
  });
});

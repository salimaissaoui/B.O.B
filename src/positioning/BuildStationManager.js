import { Vec3 } from 'vec3';
import pathfinderPkg from 'mineflayer-pathfinder';
const { goals } = pathfinderPkg;
import { sleep } from '../utils/sleep.js';
import { calculateDistance } from '../utils/pathfinding-helper.js';

/**
 * Build Station Manager
 *
 * Calculates optimal "vantage points" (stations) for building, reducing pathfinding
 * calls from 400+ per build to ~10-20.
 *
 * Algorithm:
 * 1. Before build: Calculate optimal stations covering all blocks
 * 2. Group blocks by which station can reach them (4.5 block radius)
 * 3. Move to station -> build all reachable blocks -> move to next station
 */

const DEFAULT_REACH = 4.5; // Minecraft block placement reach
const STATION_PADDING = 1; // Safety padding from build blocks

export class BuildStationManager {
  constructor(bot) {
    this.bot = bot;
    this.pathfinder = bot?.pathfinder || null;
    this.reach = DEFAULT_REACH;
    this.stations = [];
    this.currentStationIndex = -1;
  }

  /**
   * Check if pathfinder is available
   */
  isAvailable() {
    return this.pathfinder !== null;
  }

  /**
   * Calculate optimal build stations for a set of blocks
   * Uses greedy set-cover algorithm to minimize station count
   *
   * @param {Array} blocks - Array of blocks with world positions {x, y, z, block}
   * @param {Object} startPos - Build start position
   * @returns {Array} Array of stations with their assigned blocks
   */
  calculateBuildStations(blocks, startPos) {
    if (!blocks || blocks.length === 0) {
      return [];
    }

    const worldBlocks = blocks.map(b => ({
      ...b,
      worldX: startPos.x + b.x,
      worldY: startPos.y + b.y,
      worldZ: startPos.z + b.z
    }));

    const stations = [];
    const uncovered = new Set(worldBlocks.map((_, i) => i));
    const reach = this.reach;

    // Greedy set cover: find station that covers most uncovered blocks
    while (uncovered.size > 0) {
      let bestStation = null;
      let bestCoverage = [];

      // Try potential station positions
      // Sample positions: around each uncovered block
      for (const blockIndex of uncovered) {
        const block = worldBlocks[blockIndex];

        // Try multiple positions around this block
        const candidates = this.generateStationCandidates(block, worldBlocks, uncovered);

        for (const candidate of candidates) {
          const coverage = this.getBlocksCoveredByStation(candidate, worldBlocks, uncovered);

          if (coverage.length > bestCoverage.length) {
            bestStation = candidate;
            bestCoverage = coverage;
          }
        }
      }

      if (!bestStation || bestCoverage.length === 0) {
        // Fallback: use first uncovered block's position
        const firstUncovered = worldBlocks[[...uncovered][0]];
        bestStation = {
          x: firstUncovered.worldX,
          y: firstUncovered.worldY,
          z: firstUncovered.worldZ - 1
        };
        bestCoverage = [[...uncovered][0]];
      }

      // Add station and remove covered blocks
      stations.push({
        position: bestStation,
        blocks: bestCoverage.map(i => worldBlocks[i]),
        blockIndices: bestCoverage
      });

      for (const i of bestCoverage) {
        uncovered.delete(i);
      }
    }

    this.stations = stations;
    this.currentStationIndex = 0;

    console.log(`  [BuildStations] Calculated ${stations.length} stations for ${blocks.length} blocks`);
    return stations;
  }

  /**
   * Generate candidate station positions around a block
   */
  generateStationCandidates(block, allBlocks, uncovered) {
    const candidates = [];
    const reach = this.reach - STATION_PADDING;

    // Cardinal directions at ground level
    const offsets = [
      { x: -reach, y: 0, z: 0 },
      { x: reach, y: 0, z: 0 },
      { x: 0, y: 0, z: -reach },
      { x: 0, y: 0, z: reach },
      // Diagonals
      { x: -reach * 0.7, y: 0, z: -reach * 0.7 },
      { x: reach * 0.7, y: 0, z: -reach * 0.7 },
      { x: -reach * 0.7, y: 0, z: reach * 0.7 },
      { x: reach * 0.7, y: 0, z: reach * 0.7 },
    ];

    for (const offset of offsets) {
      const candidate = {
        x: Math.floor(block.worldX + offset.x),
        y: Math.floor(block.worldY + offset.y),
        z: Math.floor(block.worldZ + offset.z)
      };

      // Check if station position doesn't overlap with any pending blocks
      if (!this.stationOverlapsBlocks(candidate, allBlocks)) {
        candidates.push(candidate);
      }
    }

    // If all candidates overlap, offset the best one
    if (candidates.length === 0) {
      candidates.push({
        x: Math.floor(block.worldX - reach - 1),
        y: Math.floor(block.worldY),
        z: Math.floor(block.worldZ)
      });
    }

    return candidates;
  }

  /**
   * Check if a station position overlaps with pending build blocks
   * (Self-collision prevention)
   */
  stationOverlapsBlocks(station, blocks) {
    for (const block of blocks) {
      if (Math.floor(block.worldX) === station.x &&
          Math.floor(block.worldY) === station.y &&
          Math.floor(block.worldZ) === station.z) {
        return true;
      }
      // Also check one block below (where bot stands)
      if (Math.floor(block.worldX) === station.x &&
          Math.floor(block.worldY) === station.y - 1 &&
          Math.floor(block.worldZ) === station.z) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get indices of blocks covered by a station position
   */
  getBlocksCoveredByStation(station, blocks, uncovered) {
    const covered = [];
    const reach = this.reach;

    for (const i of uncovered) {
      const block = blocks[i];
      const dist = calculateDistance(station, {
        x: block.worldX,
        y: block.worldY,
        z: block.worldZ
      });

      if (dist <= reach) {
        covered.push(i);
      }
    }

    return covered;
  }


  /**
   * Move bot to a build station
   * @param {Object} station - Station with position and blocks
   * @returns {Promise<boolean>} True if reached station
   */
  async moveToStation(station) {
    if (!this.isAvailable()) {
      // Try teleport if pathfinder unavailable
      return this.teleportToStation(station);
    }

    const botPos = this.bot.entity.position;
    const targetPos = station.position;

    // Already close enough?
    if (calculateDistance(botPos, targetPos) < 1.5) {
      return true;
    }

    try {
      const goal = new goals.GoalNear(
        targetPos.x,
        targetPos.y,
        targetPos.z,
        1.5 // Get within 1.5 blocks of station
      );

      await this.pathfinder.goto(goal);
      return true;
    } catch (error) {
      console.warn(`  [BuildStations] Pathfinding to station failed: ${error.message}`);
      // Fallback to teleport
      return this.teleportToStation(station);
    }
  }

  /**
   * Teleport to station (fallback when pathfinding fails)
   */
  async teleportToStation(station) {
    if (!this.bot || !this.bot.chat) {
      return false;
    }

    const pos = station.position;
    this.bot.chat(`/tp @s ${pos.x} ${pos.y + 1} ${pos.z}`);

    // Wait for teleport
    await sleep(500);
    return true;
  }

  /**
   * Check if bot is within reach of a block position
   */
  isBlockInReach(blockPos) {
    if (!this.bot || !this.bot.entity) {
      return false;
    }

    const botPos = this.bot.entity.position;
    return calculateDistance(botPos, blockPos) <= this.reach;
  }

  /**
   * Get the next station in sequence
   */
  getNextStation() {
    if (this.currentStationIndex < this.stations.length - 1) {
      this.currentStationIndex++;
      return this.stations[this.currentStationIndex];
    }
    return null;
  }

  /**
   * Get current station
   */
  getCurrentStation() {
    if (this.currentStationIndex >= 0 && this.currentStationIndex < this.stations.length) {
      return this.stations[this.currentStationIndex];
    }
    return null;
  }

  /**
   * Reset station manager state
   */
  reset() {
    this.stations = [];
    this.currentStationIndex = -1;
  }

  /**
   * Get station statistics
   */
  getStats() {
    const totalBlocks = this.stations.reduce((sum, s) => sum + s.blocks.length, 0);
    const avgBlocksPerStation = this.stations.length > 0
      ? (totalBlocks / this.stations.length).toFixed(1)
      : 0;

    return {
      stationCount: this.stations.length,
      totalBlocks,
      avgBlocksPerStation,
      currentStation: this.currentStationIndex + 1,
      remainingStations: this.stations.length - this.currentStationIndex - 1
    };
  }

}

/**
 * Calculate optimal stations helper (standalone function)
 * @param {Array} blocks - Block positions relative to startPos
 * @param {Object} startPos - Build origin
 * @param {number} reach - Block placement reach (default: 4.5)
 * @returns {Array} Station assignments
 */
export function calculateOptimalStations(blocks, startPos, reach = DEFAULT_REACH) {
  const manager = new BuildStationManager(null);
  manager.reach = reach;
  return manager.calculateBuildStations(blocks, startPos);
}

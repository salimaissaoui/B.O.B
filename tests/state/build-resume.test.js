/**
 * Build Resume Tests
 *
 * Tests for build state persistence and resume capability.
 * Verifies:
 * - Build state is saved to disk
 * - Interrupted builds can be resumed
 * - Progress tracking works correctly
 *
 * CLAUDE.md Contract:
 * - Priority 3 Reliability: "Build Resume - Save progress, resume after crash/disconnect"
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { BuildStateManager } from '../../src/state/build-state.js';
import { existsSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Build Resume - Contract Tests', () => {
    let stateManager;
    let testDir;

    beforeEach(() => {
        // Create temp directory for test state files
        testDir = join(tmpdir(), `bob-test-state-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
        stateManager = new BuildStateManager(testDir);
    });

    afterEach(() => {
        // Clean up test directory
        try {
            rmSync(testDir, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    describe('Build state tracking', () => {
        const testBlueprint = {
            buildType: 'house',
            size: { width: 10, height: 8, depth: 10 },
            palette: ['stone', 'oak_planks'],
            steps: [
                { op: 'fill', block: 'stone' },
                { op: 'wall', block: 'oak_planks' },
                { op: 'roof', block: 'oak_planks' }
            ]
        };

        const testStartPos = { x: 100, y: 64, z: 100 };

        test('startBuild creates state with unique ID', () => {
            const buildId = stateManager.startBuild(testBlueprint, testStartPos);

            expect(buildId).toBeDefined();
            expect(typeof buildId).toBe('string');
            expect(buildId.length).toBeGreaterThan(0);
        });

        test('startBuild saves state to disk', () => {
            const buildId = stateManager.startBuild(testBlueprint, testStartPos);

            const filepath = join(testDir, `build-${buildId}.json`);
            expect(existsSync(filepath)).toBe(true);
        });

        test('state includes blueprint metadata', () => {
            stateManager.startBuild(testBlueprint, testStartPos);
            const summary = stateManager.getCurrentStateSummary();

            expect(summary.progress.step).toContain('/3'); // 3 steps
        });

        test('state includes start position', () => {
            const buildId = stateManager.startBuild(testBlueprint, testStartPos);
            const state = stateManager.loadState(buildId);

            expect(state.startPos).toEqual(testStartPos);
        });
    });

    describe('Progress tracking', () => {
        const testBlueprint = {
            buildType: 'tower',
            size: { width: 5, height: 20, depth: 5 },
            palette: ['stone'],
            steps: [{ op: 'fill' }, { op: 'fill' }, { op: 'fill' }]
        };

        test('updateProgress updates block count', () => {
            stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });

            stateManager.updateProgress({ blocksPlaced: 100 });

            const summary = stateManager.getCurrentStateSummary();
            expect(summary.progress.blocks).toBe(100);
        });

        test('completeStep tracks completed steps', () => {
            const buildId = stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });

            stateManager.completeStep(0);
            stateManager.completeStep(1);

            const state = stateManager.loadState(buildId);
            expect(state.progress.completedSteps).toContain(0);
            expect(state.progress.completedSteps).toContain(1);
            expect(state.progress.currentStep).toBe(2);
        });

        test('addWorldEditHistory tracks WE operations', () => {
            const buildId = stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });

            stateManager.addWorldEditHistory({ command: '//set stone', blocks: 100 });
            stateManager.saveState(); // Explicit save (history doesn't auto-save)

            const state = stateManager.loadState(buildId);
            expect(state.worldEditHistory.length).toBe(1);
            expect(state.progress.worldEditOps).toBe(1);
        });
    });

    describe('Build status transitions', () => {
        const testBlueprint = {
            buildType: 'castle',
            size: { width: 30, height: 20, depth: 30 },
            palette: ['stone_bricks'],
            steps: [{ op: 'fill' }]
        };

        test('initial status is in_progress', () => {
            const buildId = stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });
            const state = stateManager.loadState(buildId);

            expect(state.status).toBe('in_progress');
        });

        test('completeBuild sets status to completed', () => {
            const buildId = stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });

            stateManager.completeBuild();

            const state = stateManager.loadState(buildId);
            expect(state.status).toBe('completed');
            expect(state.completedAt).toBeDefined();
        });

        test('failBuild sets status to failed with reason', () => {
            const buildId = stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });

            stateManager.failBuild('Connection lost');

            const state = stateManager.loadState(buildId);
            expect(state.status).toBe('failed');
            expect(state.failureReason).toBe('Connection lost');
        });
    });

    describe('Build resume', () => {
        const testBlueprint = {
            buildType: 'bridge',
            size: { width: 50, height: 5, depth: 5 },
            palette: ['stone', 'cobblestone'],
            steps: [
                { op: 'fill', block: 'stone' },
                { op: 'fill', block: 'cobblestone' },
                { op: 'fill', block: 'stone' },
                { op: 'fill', block: 'cobblestone' }
            ]
        };

        test('getLastIncompleteBuild finds in_progress builds', () => {
            stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });
            stateManager.completeStep(0);
            stateManager.completeStep(1);

            // Simulate crash - don't call completeBuild()
            const incomplete = stateManager.getLastIncompleteBuild();

            expect(incomplete).not.toBeNull();
            expect(incomplete.status).toBe('in_progress');
        });

        test('getLastIncompleteBuild ignores completed builds', () => {
            stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });
            stateManager.completeBuild();

            const incomplete = stateManager.getLastIncompleteBuild();

            expect(incomplete).toBeNull();
        });

        test('prepareBuildResume returns resume data', () => {
            const buildId = stateManager.startBuild(testBlueprint, { x: 100, y: 64, z: 200 });
            stateManager.completeStep(0);
            stateManager.completeStep(1);
            stateManager.updateProgress({ blocksPlaced: 500 });

            // Simulate crash and recovery
            const newManager = new BuildStateManager(testDir);
            const resumeData = newManager.prepareBuildResume(buildId);

            expect(resumeData).not.toBeNull();
            expect(resumeData.buildId).toBe(buildId);
            expect(resumeData.resumeFromStep).toBe(2);
            expect(resumeData.completedSteps).toEqual([0, 1]);
            expect(resumeData.startPos).toEqual({ x: 100, y: 64, z: 200 });
        });

        test('prepareBuildResume without ID finds latest incomplete', () => {
            stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });
            stateManager.completeStep(0);

            const newManager = new BuildStateManager(testDir);
            const resumeData = newManager.prepareBuildResume();

            expect(resumeData).not.toBeNull();
            expect(resumeData.resumeFromStep).toBe(1);
        });

        test('prepareBuildResume returns null for completed builds', () => {
            const buildId = stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });
            stateManager.completeBuild();

            const resumeData = stateManager.prepareBuildResume(buildId);

            expect(resumeData).toBeNull();
        });
    });

    describe('State management', () => {
        const testBlueprint = {
            buildType: 'test',
            size: { width: 5, height: 5, depth: 5 },
            palette: ['stone'],
            steps: [{ op: 'fill' }]
        };

        test('listSavedBuilds returns all builds', () => {
            stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });
            stateManager.completeBuild();

            stateManager.startBuild(testBlueprint, { x: 10, y: 64, z: 0 });

            const builds = stateManager.listSavedBuilds();

            expect(builds.length).toBe(2);
        });

        test('deleteState removes build file', () => {
            const buildId = stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });
            const filepath = join(testDir, `build-${buildId}.json`);

            expect(existsSync(filepath)).toBe(true);

            stateManager.deleteState(buildId);

            expect(existsSync(filepath)).toBe(false);
        });

        test('reset clears current state', () => {
            stateManager.startBuild(testBlueprint, { x: 0, y: 64, z: 0 });

            expect(stateManager.currentBuildId).not.toBeNull();

            stateManager.reset();

            expect(stateManager.currentBuildId).toBeNull();
            expect(stateManager.currentState).toBeNull();
        });
    });
});

describe('Build Resume - Integration', () => {
    let stateManager;
    let testDir;

    beforeEach(() => {
        testDir = join(tmpdir(), `bob-test-state-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
        stateManager = new BuildStateManager(testDir);
    });

    afterEach(() => {
        try {
            rmSync(testDir, { recursive: true, force: true });
        } catch (e) {
            // Ignore
        }
    });

    test('full resume workflow', () => {
        const blueprint = {
            buildType: 'wall',
            size: { width: 20, height: 10, depth: 1 },
            palette: ['stone_bricks', 'chiseled_stone_bricks'],
            steps: [
                { op: 'fill', block: 'stone_bricks' },
                { op: 'fill', block: 'chiseled_stone_bricks' },
                { op: 'fill', block: 'stone_bricks' }
            ]
        };

        // 1. Start build
        const buildId = stateManager.startBuild(blueprint, { x: 50, y: 64, z: 50 });

        // 2. Make progress
        stateManager.updateProgress({ blocksPlaced: 50 });
        stateManager.completeStep(0);
        stateManager.addWorldEditHistory({ command: '//set stone_bricks', blocks: 200 });
        stateManager.updateProgress({ blocksPlaced: 250 });
        stateManager.completeStep(1);

        // 3. Simulate crash (no completeBuild called)

        // 4. New session - find and resume
        const newManager = new BuildStateManager(testDir);
        const resumeData = newManager.prepareBuildResume();

        expect(resumeData).not.toBeNull();
        expect(resumeData.buildId).toBe(buildId);
        expect(resumeData.resumeFromStep).toBe(2); // Resume at step 2
        expect(resumeData.completedSteps).toEqual([0, 1]);
        expect(resumeData.blocksPlacedSoFar).toBe(250);
        expect(resumeData.worldEditHistory.length).toBe(1);

        // 5. Continue from resume point
        newManager.updateProgress({ blocksPlaced: 450 });
        newManager.completeStep(2);
        newManager.completeBuild();

        // 6. Verify final state
        const finalState = newManager.loadState(buildId);
        expect(finalState.status).toBe('completed');
        expect(finalState.progress.completedSteps).toEqual([0, 1, 2]);
    });

    test('undo history persists across resume', () => {
        const blueprint = {
            buildType: 'test',
            size: { width: 5, height: 5, depth: 5 },
            palette: ['stone'],
            steps: [{ op: 'fill' }]
        };

        const buildId = stateManager.startBuild(blueprint, { x: 0, y: 64, z: 0 });

        // Add undo history
        stateManager.addToUndoHistory([
            { pos: { x: 1, y: 64, z: 1 }, previousBlock: 'air' },
            { pos: { x: 2, y: 64, z: 2 }, previousBlock: 'grass_block' }
        ]);
        stateManager.saveState(); // Explicit save (history doesn't auto-save)

        // Resume
        const newManager = new BuildStateManager(testDir);
        const resumeData = newManager.prepareBuildResume(buildId);

        expect(resumeData.undoHistory.length).toBe(2);
        expect(resumeData.undoHistory[0].previousBlock).toBe('air');
    });
});

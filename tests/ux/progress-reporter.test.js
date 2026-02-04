/**
 * Progress Reporter Tests
 *
 * Tests for UX progress reporting during builds.
 * Verifies:
 * - Streaming progress events
 * - Phase tracking
 * - Progress percentages
 *
 * CLAUDE.md Contract:
 * - Priority 1 UX: "Streaming Progress"
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
    ProgressReporter,
    BuildPhase,
    ProgressEvent
} from '../../src/ux/progress-reporter.js';

describe('ProgressReporter - Event Emission', () => {
    let reporter;
    let events;

    beforeEach(() => {
        reporter = new ProgressReporter();
        events = [];
        reporter.on('progress', (event) => events.push(event));
    });

    describe('Phase transitions', () => {
        test('emits event on phase start', () => {
            reporter.startPhase(BuildPhase.ANALYZING);

            expect(events.length).toBe(1);
            expect(events[0].phase).toBe(BuildPhase.ANALYZING);
            expect(events[0].type).toBe('phase_start');
        });

        test('emits event on phase complete', () => {
            reporter.startPhase(BuildPhase.ANALYZING);
            reporter.completePhase(BuildPhase.ANALYZING);

            expect(events.length).toBe(2);
            expect(events[1].type).toBe('phase_complete');
        });

        test('tracks phase duration', () => {
            reporter.startPhase(BuildPhase.ANALYZING);

            // Simulate some time passing
            const startTime = reporter.getPhaseStartTime(BuildPhase.ANALYZING);
            expect(startTime).toBeGreaterThan(0);

            reporter.completePhase(BuildPhase.ANALYZING);

            const duration = reporter.getPhaseDuration(BuildPhase.ANALYZING);
            expect(duration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Progress updates', () => {
        test('emits progress update with percentage', () => {
            reporter.startPhase(BuildPhase.BUILDING);
            reporter.updateProgress(50, 'Placing blocks...');

            const progressEvent = events.find(e => e.type === 'progress_update');
            expect(progressEvent).toBeDefined();
            expect(progressEvent.percent).toBe(50);
            expect(progressEvent.message).toBe('Placing blocks...');
        });

        test('clamps progress to 0-100 range', () => {
            reporter.startPhase(BuildPhase.BUILDING);

            reporter.updateProgress(-10, 'test');
            expect(events[events.length - 1].percent).toBe(0);

            reporter.updateProgress(150, 'test');
            expect(events[events.length - 1].percent).toBe(100);
        });

        test('tracks current progress', () => {
            reporter.startPhase(BuildPhase.BUILDING);
            reporter.updateProgress(75, 'test');

            expect(reporter.getCurrentProgress()).toBe(75);
        });
    });

    describe('Streaming text updates', () => {
        test('emits streaming text chunks', () => {
            reporter.startPhase(BuildPhase.GENERATING);
            reporter.streamText('Generating');
            reporter.streamText(' blueprint');
            reporter.streamText('...');

            const streamEvents = events.filter(e => e.type === 'stream_text');
            expect(streamEvents.length).toBe(3);
            expect(streamEvents[0].text).toBe('Generating');
        });

        test('accumulates streamed text', () => {
            reporter.startPhase(BuildPhase.GENERATING);
            reporter.streamText('Hello');
            reporter.streamText(' World');

            expect(reporter.getStreamedText()).toBe('Hello World');
        });

        test('clears streamed text on phase change', () => {
            reporter.startPhase(BuildPhase.GENERATING);
            reporter.streamText('Some text');
            reporter.completePhase(BuildPhase.GENERATING);
            reporter.startPhase(BuildPhase.VALIDATING);

            expect(reporter.getStreamedText()).toBe('');
        });
    });
});

describe('ProgressReporter - Build Phases', () => {
    test('BuildPhase enum has all required phases', () => {
        expect(BuildPhase.ANALYZING).toBeDefined();
        expect(BuildPhase.GENERATING).toBeDefined();
        expect(BuildPhase.VALIDATING).toBeDefined();
        expect(BuildPhase.BUILDING).toBeDefined();
        expect(BuildPhase.COMPLETE).toBeDefined();
        expect(BuildPhase.FAILED).toBeDefined();
    });

    test('phases have human-readable labels', () => {
        const reporter = new ProgressReporter();

        expect(reporter.getPhaseLabel(BuildPhase.ANALYZING)).toBe('Analyzing request');
        expect(reporter.getPhaseLabel(BuildPhase.GENERATING)).toBe('Generating blueprint');
        expect(reporter.getPhaseLabel(BuildPhase.VALIDATING)).toBe('Validating blueprint');
        expect(reporter.getPhaseLabel(BuildPhase.BUILDING)).toBe('Building structure');
    });
});

describe('ProgressReporter - Error Handling', () => {
    let reporter;
    let events;

    beforeEach(() => {
        reporter = new ProgressReporter();
        events = [];
        reporter.on('progress', (event) => events.push(event));
    });

    test('emits error event', () => {
        reporter.startPhase(BuildPhase.GENERATING);
        reporter.reportError('LLM timeout', 'TIMEOUT');

        const errorEvent = events.find(e => e.type === 'error');
        expect(errorEvent).toBeDefined();
        expect(errorEvent.message).toBe('LLM timeout');
        expect(errorEvent.code).toBe('TIMEOUT');
    });

    test('transitions to FAILED phase on error', () => {
        reporter.startPhase(BuildPhase.GENERATING);
        reporter.reportError('Error occurred');

        expect(reporter.getCurrentPhase()).toBe(BuildPhase.FAILED);
    });

    test('emits warning without phase change', () => {
        reporter.startPhase(BuildPhase.BUILDING);
        reporter.reportWarning('Block placement slow');

        const warningEvent = events.find(e => e.type === 'warning');
        expect(warningEvent).toBeDefined();
        expect(reporter.getCurrentPhase()).toBe(BuildPhase.BUILDING);
    });
});

describe('ProgressReporter - Listener Management', () => {
    test('supports multiple listeners', () => {
        const reporter = new ProgressReporter();
        const events1 = [];
        const events2 = [];

        reporter.on('progress', (e) => events1.push(e));
        reporter.on('progress', (e) => events2.push(e));

        reporter.startPhase(BuildPhase.ANALYZING);

        expect(events1.length).toBe(1);
        expect(events2.length).toBe(1);
    });

    test('removes listener with off()', () => {
        const reporter = new ProgressReporter();
        const events = [];
        const listener = (e) => events.push(e);

        reporter.on('progress', listener);
        reporter.startPhase(BuildPhase.ANALYZING);

        reporter.off('progress', listener);
        reporter.startPhase(BuildPhase.GENERATING);

        expect(events.length).toBe(1); // Only first event
    });

    test('once() listener fires only once', () => {
        const reporter = new ProgressReporter();
        const events = [];

        reporter.once('progress', (e) => events.push(e));

        reporter.startPhase(BuildPhase.ANALYZING);
        reporter.startPhase(BuildPhase.GENERATING);

        expect(events.length).toBe(1);
    });
});

describe('ProgressReporter - Summary', () => {
    test('generates build summary', () => {
        const reporter = new ProgressReporter();

        reporter.startPhase(BuildPhase.ANALYZING);
        reporter.completePhase(BuildPhase.ANALYZING);
        reporter.startPhase(BuildPhase.GENERATING);
        reporter.completePhase(BuildPhase.GENERATING);
        reporter.startPhase(BuildPhase.BUILDING);
        reporter.updateProgress(100, 'Done');
        reporter.completePhase(BuildPhase.BUILDING);

        const summary = reporter.getSummary();

        expect(summary.totalDuration).toBeGreaterThanOrEqual(0);
        expect(summary.phases).toHaveProperty(BuildPhase.ANALYZING);
        expect(summary.phases).toHaveProperty(BuildPhase.GENERATING);
        expect(summary.phases).toHaveProperty(BuildPhase.BUILDING);
        expect(summary.success).toBe(true);
    });

    test('summary indicates failure', () => {
        const reporter = new ProgressReporter();

        reporter.startPhase(BuildPhase.GENERATING);
        reporter.reportError('Failed');

        const summary = reporter.getSummary();
        expect(summary.success).toBe(false);
        expect(summary.error).toBe('Failed');
    });
});

describe('ProgressEvent structure', () => {
    test('event has required fields', () => {
        const reporter = new ProgressReporter();
        let capturedEvent = null;

        reporter.on('progress', (e) => { capturedEvent = e; });
        reporter.startPhase(BuildPhase.ANALYZING);

        expect(capturedEvent).toHaveProperty('type');
        expect(capturedEvent).toHaveProperty('phase');
        expect(capturedEvent).toHaveProperty('timestamp');
    });

    test('event timestamp is valid', () => {
        const reporter = new ProgressReporter();
        let capturedEvent = null;

        reporter.on('progress', (e) => { capturedEvent = e; });
        reporter.startPhase(BuildPhase.ANALYZING);

        expect(capturedEvent.timestamp).toBeGreaterThan(0);
        expect(capturedEvent.timestamp).toBeLessThanOrEqual(Date.now());
    });
});

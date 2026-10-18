import test from 'node:test';
import assert from 'node:assert/strict';
import { MeasurementTracker } from './capture-state.mjs';

test('separate heart and breathing updates can complete a real capture', () => {
  const tracker = new MeasurementTracker();
  tracker.ingest({cardio: {pulseRate: [{value: 72, stable: true, timestamp: 1}]}}, 30_000);
  tracker.ingest({breathing: {rate: [{value: 14, stable: true, timestamp: 2}]}}, 31_000);
  assert.equal(tracker.shouldStop(0, 31_000), true);
  assert.deepEqual(tracker.result(0, 31_000), {heart_rate: 72, breathing_rate: 14});
});

test('capture always stops at 60 seconds, even without any metrics', () => {
  const tracker = new MeasurementTracker();
  assert.equal(tracker.shouldStop(0, 59_999), false);
  assert.equal(tracker.shouldStop(0, 60_000), true);
  assert.equal(tracker.result(0, 60_000), null);
});

test('one stable metric can be reviewed at timeout; missing readings stay null', () => {
  const tracker = new MeasurementTracker();
  tracker.ingest({breathing: {rate: [{value: 14, stable: true, timestamp: 1}]}}, 58_000);
  assert.equal(tracker.shouldStop(0, 58_000), false);
  assert.deepEqual(tracker.result(0, 60_000), {heart_rate: null, breathing_rate: 14});
});

test('unstable, stale, and repeated old samples cannot unlock completion', () => {
  const tracker = new MeasurementTracker();
  const metrics = {cardio: {pulseRate: [{value: 72, stable: true, timestamp: 1}]}};
  tracker.ingest(metrics, 1_000);
  tracker.ingest(metrics, 30_000);
  tracker.ingest({breathing: {rate: [{value: 14, stable: false, timestamp: 2}]}}, 30_000);
  assert.equal(tracker.result(0, 30_000), null);
  assert.equal(tracker.result(0, 20_000), null);
});

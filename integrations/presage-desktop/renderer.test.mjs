// Synthetic SDK events exercise UI state only; they never run a real capture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { MeasurementTracker, MAX_CAPTURE_MS } from './capture-state.mjs';

function harness() {
  let now = 0;
  let tick;
  let instance;
  let signed;
  const track = {stopped: false, stop() {this.stopped = true;}};
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {disabled: false, checked: false, value: '', textContent: '', srcObject: null,
      events: {}, addEventListener(name, fn) {this.events[name] = fn;}});
    return nodes.get(id);
  };
  class SDK {
    constructor() {instance = this; this.events = {}; this.destroyed = false;}
    on(name, fn) {this.events[name] = fn;}
    start() {
      this.events.streamAvailable({getTracks: () => [track]});
      return new Promise(() => {}); // Deliberately never acknowledge startup.
    }
    destroy() {this.destroyed = true; track.stop();}
  }
  class Clock extends Date {static now() {return now;}}
  const source = readFileSync(new URL('./renderer.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInNewContext(source, {
    document: {getElementById: node}, Date: Clock, SmartSpectraSDK: SDK, breathingMetrics: [], cardioMetrics: [],
    decodeMetrics: value => value, MeasurementTracker, MAX_CAPTURE_MS,
    setInterval: fn => {tick = fn; return 1;}, clearInterval: () => {tick = null;},
    window: {addEventListener() {}, careflowCapture: {
      start: async () => ({apiKey: 'test-fixture'}),
      sign: async values => {signed = values; return {measurement_token: 'test-payload.test-signature'};},
    }},
  });
  node('camera-consent').checked = true;
  return {
    node, track,
    start: async () => {node('start').events.click(); await Promise.resolve(); await Promise.resolve();},
    advance: value => {now = value; tick?.();},
    metrics: value => instance.events.metrics(value),
    instance: () => instance,
    signed: () => signed,
  };
}

test('startup without an SDK acknowledgement still stops the camera at the deadline', async () => {
  const ui = harness();
  await ui.start();
  assert.equal(ui.node('stop').disabled, false);
  ui.advance(60000);
  assert.equal(ui.track.stopped, true);
  assert.equal(ui.instance().destroyed, true);
  assert.equal(ui.node('start').disabled, false);
  assert.equal(ui.node('stop').disabled, true);
  assert.match(ui.node('status').textContent, /No stable readings/);
});

test('Stop camera is available during startup and does not wait for SDK stop', async () => {
  const ui = harness();
  await ui.start();
  ui.node('stop').events.click();
  assert.equal(ui.track.stopped, true);
  assert.equal(ui.node('start').disabled, false);
  assert.equal(ui.node('finish').disabled, true);
});

test('separate SDK updates stop capture and unlock result preparation after consent', async () => {
  const ui = harness();
  await ui.start();
  ui.advance(30000);
  ui.metrics({cardio: {pulseRate: [{value: 72, timestamp: 1, stable: true}]}});
  ui.advance(31000);
  ui.metrics({breathing: {rate: [{value: 14, timestamp: 2, stable: true}]}});
  assert.equal(ui.track.stopped, true);
  assert.equal(ui.node('result-consent').disabled, false);
  assert.equal(ui.node('finish').disabled, true);
  ui.node('result-consent').checked = true;
  ui.node('result-consent').events.change();
  assert.equal(ui.node('finish').disabled, false);
  await ui.node('finish').events.click();
  assert.equal(ui.node('result').value, 'test-payload.test-signature');
  assert.equal(ui.signed().heart_rate, 72);
  assert.equal(ui.signed().breathing_rate, 14);
});

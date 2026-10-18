import { SmartSpectraSDK, breathingMetrics, cardioMetrics } from '@smartspectra/node-sdk/renderer';
import { decodeMetrics } from '@smartspectra/node-sdk/messages';
import { MeasurementTracker, MAX_CAPTURE_MS } from './capture-state.mjs';

const byId = id => document.getElementById(id);
let sdk = null;
let timer = null;
let startedAt = 0;
let tracker = new MeasurementTracker();
let snapshot = null;
let running = false;
let finishing = false;
let demoConnected = false;
let saved = false;
let generation = 0;

function updateResultControls() {
  byId('finish').disabled = !snapshot || !byId('result-consent').checked || finishing;
  byId('save').disabled = saved || !demoConnected || !byId('result').value || !byId('save-consent').checked;
}

function showMetrics(values) {
  byId('metrics').textContent = `Heart rate: ${values.heart_rate?.toFixed(1) ?? 'Not available'} bpm · Breathing rate: ${values.breathing_rate?.toFixed(1) ?? 'Not available'} breaths/min`;
}

function releaseCamera() {
  clearInterval(timer);
  timer = null;
  running = false;
  generation++;
  const active = sdk;
  sdk = null;
  // destroy() synchronously stops the SDK's cloned camera track and owned stream.
  // Waiting for stop()'s IPC acknowledgement could otherwise leave controls stuck.
  const stream = byId('preview').srcObject;
  if (stream) for (const track of stream.getTracks()) track.stop();
  try { active?.destroy(); } catch { /* Preview tracks have already been stopped. */ }
  byId('preview').srcObject = null;
  byId('start').disabled = false;
  byId('connect-demo').disabled = false;
  byId('stop').disabled = true;
}

function endCapture(message) {
  if (!running) return;
  const now = Date.now();
  const values = tracker.result(startedAt, now);
  snapshot = values ? { ...values, measured_at: new Date(now).toISOString() } : null;
  releaseCamera();
  byId('result-consent').disabled = !snapshot;
  if (snapshot) {
    showMetrics(snapshot);
    const partial = snapshot.heart_rate === null || snapshot.breathing_rate === null;
    byId('status').textContent = partial
      ? 'Camera is off. One stable reading is available; the other was unavailable. Review it and choose whether to use it.'
      : 'Camera is off. Measurement complete. Tick the transfer consent box, then select Use measured result.';
    byId('receipt-status').textContent = 'A measured result is ready. Tick the transfer consent box and click Use measured result to create its receipt.';
  } else {
    byId('status').textContent = message || 'Camera is off. No stable readings were received. Try better light and keep your face and upper chest visible.';
    byId('receipt-status').textContent = 'No receipt was created because the SDK did not return a stable reading. Please retry the measurement.';
  }
  updateResultControls();
}

function fail(message) {
  snapshot = null;
  releaseCamera();
  byId('result-consent').disabled = true;
  byId('status').textContent = `Camera is off. ${message}`;
  byId('receipt-status').textContent = `No signed result: ${message}`;
  updateResultControls();
}

function tick() {
  if (!running) return;
  const now = Date.now();
  const seconds = Math.floor((now - startedAt) / 1000);
  byId('progress').value = Math.min(seconds, MAX_CAPTURE_MS / 1000);
  showMetrics(tracker.values(now));
  if (tracker.shouldStop(startedAt, now)) {
    endCapture();
    return;
  }
  byId('status').textContent = `Camera is on. Measuring… ${seconds}s elapsed; it will stop by 60s. You can stop the camera at any time.`;
}

if (!window.careflowCapture) {
  for (const id of ['start', 'connect-demo', 'stop', 'finish', 'save']) byId(id).disabled = true;
  byId('status').textContent = 'Open this screen in the PhaseZero desktop app with npm start. A regular browser cannot run the native Presage SDK.';
}

byId('connect-demo').addEventListener('click', async () => {
  byId('connect-demo').disabled = true;
  try {
    const session = await window.careflowCapture.connectDemo();
    byId('capture-token').value = session.capture_token;
    demoConnected = true;
    byId('connection').textContent = 'Connected to Maya’s shared synthetic demo account. Capture token is valid for 5 minutes. Camera is still off.';
  } catch (error) {
    demoConnected = false;
    byId('connection').textContent = error.message || 'Could not connect the demo account.';
  } finally {
    byId('connect-demo').disabled = false;
    updateResultControls();
  }
});

byId('save-consent').addEventListener('change', updateResultControls);
byId('result-consent').addEventListener('change', updateResultControls);
byId('stop').addEventListener('click', () => endCapture('Camera stopped. A stable reading needs at least 30 seconds; you can retry when ready.'));

byId('save').addEventListener('click', async () => {
  if (saved || !demoConnected || !byId('save-consent').checked) return;
  byId('save').disabled = true;
  try {
    await window.careflowCapture.saveCheckin(byId('result').value, true);
    saved = true;
    byId('status').textContent = 'Check-in saved in PhaseZero. Camera is off.';
    byId('save-consent').disabled = true;
  } catch (error) { byId('status').textContent = error.message || 'Check-in could not be saved.'; }
  updateResultControls();
});

byId('start').addEventListener('click', async () => {
  if (running) return;
  if (!byId('camera-consent').checked) {
    byId('status').textContent = 'Please give camera consent before starting.';
    return;
  }
  const thisGeneration = ++generation;
  running = true;
  startedAt = Date.now();
  tracker = new MeasurementTracker();
  snapshot = null;
  finishing = false;
  saved = false;
  byId('start').disabled = true;
  byId('connect-demo').disabled = true;
  byId('stop').disabled = false;
  byId('result').value = '';
  byId('receipt-status').textContent = 'Waiting for the SDK to return a stable measurement.';
  for (const id of ['result-consent', 'save-consent']) {
    byId(id).checked = false;
    byId(id).disabled = true;
  }
  byId('hint').textContent = '';
  byId('progress').value = 0;
  updateResultControls();
  // Arm the deadline BEFORE SDK startup so a stalled start cannot leave capture open.
  timer = setInterval(tick, 250);
  try {
    const { apiKey } = await window.careflowCapture.start(byId('capture-token').value.trim());
    if (!running || generation !== thisGeneration) return;
    sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: [...breathingMetrics, ...cardioMetrics], sendTimeoutMs: 10000 });
    const active = sdk;
    active.on('streamAvailable', stream => {
      if (!running || generation !== thisGeneration) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      byId('preview').srcObject = stream;
    });
    active.on('validationStatus', (_code, _ts, hint) => {
      if (running && generation === thisGeneration && hint) byId('hint').textContent = hint;
    });
    active.on('error', (_code, message) => {
      if (running && generation === thisGeneration) fail(`Measurement failed: ${message}`);
    });
    active.on('metrics', buffer => {
      if (!running || generation !== thisGeneration) return;
      try { tracker.ingest(decodeMetrics(buffer), Date.now()); tick(); }
      catch { fail('The SDK returned an unreadable measurement. Please retry.'); }
    });
    await active.start();
  } catch (error) {
    if (running && generation === thisGeneration) fail(error.message || 'Camera measurement could not start.');
  }
});

byId('finish').addEventListener('click', async () => {
  if (!snapshot || !byId('result-consent').checked || finishing) return;
  finishing = true;
  byId('receipt-status').textContent = 'Creating your signed result…';
  updateResultControls();
  try {
    const result = await window.careflowCapture.sign(snapshot);
    if (typeof result?.measurement_token !== 'string' || !result.measurement_token.includes('.')) {
      throw new Error('The desktop signing service returned no receipt. Please retry.');
    }
    byId('result').value = result.measurement_token;
    byId('receipt-status').textContent = 'Signed result created. You can now give save consent and save the check-in.';
    byId('save-consent').disabled = !demoConnected;
    byId('status').textContent = demoConnected
      ? 'Camera is off. Your result is ready. Tick save consent, then select Save check-in to demo account.'
      : 'Camera is off. Paste the signed result into PhaseZero within 15 minutes, review it, and save with consent.';
  } catch (error) {
    finishing = false;
    byId('status').textContent = error.message || 'Could not prepare result. Please retry.';
    byId('receipt-status').textContent = `Could not create signed result: ${error.message || 'Unknown signing error'}`;
  }
  updateResultControls();
});

window.addEventListener('beforeunload', releaseCamera);

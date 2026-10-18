const { app, BrowserWindow, ipcMain, session, systemPreferences } = require('electron');
const { bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main');
const { SmartSpectraSDK } = require('@smartspectra/node-sdk');
const { verifyCaptureToken, signMeasurement } = require('./receipt.cjs');
const { BackendClient } = require('./backend-client.cjs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { existsSync } = require('node:fs');

const envPath = path.join(__dirname, '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

const page = pathToFileURL(path.join(__dirname, 'index.html')).href;
let captureSession = null;
const backend = new BackendClient(process.env.CAREFLOW_BACKEND_URL || 'http://127.0.0.1:8000', fetch, process.env.PRESAGE_RESULT_SECRET);

function assertLocal(event) {
  if (event.senderFrame?.url !== page) throw new Error('Untrusted caller');
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    const cameraOnly = details.mediaTypes?.every(type => type === 'video');
    callback(contents.getURL() === page && permission === 'media' && cameraOnly === true);
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission) => contents?.getURL() === page && permission === 'media');
  const window = new BrowserWindow({
    width: 800, height: 900, title: 'PhaseZero • Presage check-in',
    show: !process.argv.includes('--careflow-smoke-test'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  // The custom preload imports the official SDK bridge and uses Node's module loader.
  // contextIsolation and nodeIntegration:false keep Node APIs out of the renderer.
  bindSmartSpectraIpc(window);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  if (process.argv.includes('--careflow-smoke-test')) {
    const errors = [];
    window.webContents.on('console-message', (_event, _level, message) => {
      if (String(message).includes('Uncaught') || String(message).includes('Unable to load preload')) errors.push(message);
    });
    window.webContents.once('did-finish-load', async () => {
      try {
        const state = await window.webContents.executeJavaScript(`({
          captureBridge: typeof window.careflowCapture?.start === 'function',
          sdkBridge: typeof window.__smartspectraBridge?.attach === 'function',
          backendBridge: typeof window.careflowCapture?.connectDemo === 'function' && typeof window.careflowCapture?.saveCheckin === 'function',
          cameraOff: document.getElementById('preview').srcObject === null,
          status: document.getElementById('status').textContent,
          startEnabled: !document.getElementById('start').disabled
        })`);
        if (!state.captureBridge || !state.sdkBridge || !state.backendBridge || !state.cameraOff || !state.startEnabled || errors.length) {
          throw new Error(JSON.stringify({ state, errors }));
        }
        console.log(JSON.stringify({ desktop_smoke_test: 'passed', ...state }));
        app.exit(0);
      } catch (error) { console.error(error); app.exit(1); }
    });
    setTimeout(() => { console.error('Desktop smoke test timed out'); app.exit(1); }, 15000).unref();
  }

  ipcMain.handle('careflow:start-capture', async (event, token) => {
    assertLocal(event);
    captureSession = null;
    if (!process.env.PRESAGE_API_KEY) throw new Error('Configure PRESAGE_API_KEY in the desktop environment.');
    const verified = verifyCaptureToken(token, process.env.PRESAGE_RESULT_SECRET);
    if (process.platform === 'darwin' && !await systemPreferences.askForMediaAccess('camera')) {
      throw new Error('Camera access denied. Enable it in System Settings → Privacy & Security → Camera.');
    }
    captureSession = verified;
    return { apiKey: process.env.PRESAGE_API_KEY };
  });
  ipcMain.handle('careflow:connect-demo', async event => {
    assertLocal(event);
    return backend.connectDemo();
  });
  ipcMain.handle('careflow:save-checkin', async (event, token, consent) => {
    assertLocal(event);
    return backend.saveCheckin(token, consent);
  });
  ipcMain.handle('careflow:sign-result', (event, values) => {
    assertLocal(event);
    const current = captureSession;
    if (!current || Date.now() / 1000 > current.expires_at + 180) throw new Error('Start a new capture session.');
    const heart = values.heart_rate;
    const breath = values.breathing_rate;
    const measuredAt = Date.parse(values.measured_at);
    if (!Number.isFinite(measuredAt) || measuredAt > Date.now() + 30000 || measuredAt < Date.now() - 15 * 60000) {
      throw new Error('Measurement has expired. Start a new capture.');
    }
    if (heart == null && breath == null) throw new Error('No valid SDK measurements received.');
    if ((heart != null && (!Number.isFinite(heart) || heart <= 0 || heart > 350)) ||
        (breath != null && (!Number.isFinite(breath) || breath <= 0 || breath > 100))) throw new Error('Invalid SDK result.');
    const receipt = signMeasurement(current.user_id, values, SmartSpectraSDK.version, process.env.PRESAGE_RESULT_SECRET);
    // Keep the session on validation/transport errors so an existing real result can be retried.
    return receipt;
  });
  window.loadFile('index.html');
});

app.on('window-all-closed', () => app.quit());

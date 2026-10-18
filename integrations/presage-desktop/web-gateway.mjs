/** PhaseZero web demo gateway: one origin for the whole app, so it can sit behind a single HTTPS tunnel.
 *  - /presage/ws  runs the real Presage SDK (headless custom input) on camera frames streamed by the browser.
 *  - /api/*       proxies to the FastAPI backend; everything else proxies to the Next.js frontend.
 *  The Presage API key never leaves this process. The SDK is process-global, so one measurement runs at a time.
 *  NO simulated readings: results come only from the SDK's stable samples. */
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import jpeg from 'jpeg-js';
import { MeasurementTracker } from './capture-state.mjs';

const require = createRequire(import.meta.url);
const { SmartSpectraSDK, FrameTransform, PixelFormat, MetricType, decodeMetrics } =
  require('@smartspectra/node-sdk');

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

const PORT = Number(process.env.GATEWAY_PORT || 8030);
const BACKEND = new URL(process.env.CAREFLOW_BACKEND_URL || 'http://127.0.0.1:8010');
const FRONTEND = new URL(process.env.CAREFLOW_FRONTEND_URL || 'http://127.0.0.1:3000');
const IDLE_MS = 10_000;          // no frames for this long ends the measurement
const MAX_FRAME_BYTES = 1_500_000;
if (!process.env.PRESAGE_API_KEY) throw new Error('Configure PRESAGE_API_KEY in integrations/presage-desktop/.env');

function proxy(req, res) {
  const target = req.url.startsWith('/api/') ? BACKEND : FRONTEND;
  const upstream = http.request({
    hostname: target.hostname, port: target.port, method: req.method, path: req.url,
    headers: { ...req.headers, host: target.host,
      'x-forwarded-host': req.headers.host ?? '', 'x-forwarded-proto': req.headers['x-forwarded-proto'] ?? 'http' },
  }, up => { res.writeHead(up.statusCode ?? 502, up.headers); up.pipe(res); });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('PhaseZero is starting up. Refresh in a moment.');
  });
  req.pipe(upstream);
}

async function signedIn(cookie) {
  if (!cookie) return false;
  try {
    const r = await fetch(new URL('/api/auth/session', BACKEND), { headers: { cookie }, signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch { return false; }
}

let active = null; // the one running SDK session

async function measure(ws, req) {
  const send = msg => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg)); };
  if (!await signedIn(req.headers.cookie)) { send({ type: 'error', code: 'auth', message: 'Sign in to measure.' }); return ws.close(); }
  if (active) {
    send({ type: 'error', code: 'busy', message: 'Someone else is measuring right now. Try again in a minute.' });
    return ws.close();
  }
  const sdk = new SmartSpectraSDK({ apiKey: process.env.PRESAGE_API_KEY, // Only what we show. The full cardio bundle also pulls a blood-pressure model whose remote load fails.
    requestedMetrics: [MetricType.PULSE_RATE, MetricType.BREATHING_RATE] });
  active = sdk;
  const tracker = new MeasurementTracker();
  const startedAt = Date.now();
  let lastFrameAt = Date.now();
  let lastTs = -1;
  let epochOffsetUs = null; // browser clock -> wall-clock epoch µs, as Presage's own frame pump does
  let frames = 0;
  let done = false;

  async function finish(message) {
    if (done) return;
    done = true;
    clearInterval(tick);
    console.log(`[presage] session ended after ${Math.round((Date.now() - startedAt) / 1000)}s, ${frames} frames`);
    const result = tracker.result(startedAt, Date.now());
    send(result ? { type: 'result', result } : { type: 'error', code: 'no_reading',
      message: message || 'No stable reading. Try brighter, even light and keep your face still.' });
    ws.close();
    try { await sdk.stopAsync(); } catch { /* already stopped */ }
    try { await sdk.destroy(); } catch { /* already destroyed */ }
    if (active === sdk) active = null;
  }

  let metricCount = 0;
  sdk.on('metrics', buf => {
    if (++metricCount === 1) console.log(`[presage] first metrics after ${Math.round((Date.now() - startedAt) / 1000)}s`);
    try { tracker.ingest(decodeMetrics(buf), Date.now()); } catch { /* skip unreadable sample */ }
  });
  let lastHint = '';
  sdk.on('validationStatus', (_code, _ts, hint) => {
    if (hint && hint !== lastHint) { lastHint = hint; send({ type: 'hint', hint }); }
  });
  sdk.on('error', (code, message, retryable) => {
    console.error(`[presage] error code=${code} retryable=${retryable} frames=${frames} metrics=${metricCount}: ${message}`);
    finish(`Measurement failed: ${message}`);
  });
  const tick = setInterval(() => {
    const now = Date.now();
    send({ type: 'progress', seconds: Math.floor((now - startedAt) / 1000), ...tracker.values(now) });
    if (now - lastFrameAt > IDLE_MS) finish('The camera stopped sending video.');
    else if (tracker.shouldStop(startedAt, now)) finish();
  }, 500);

  ws.on('close', () => finish());
  ws.on('message', (data, isBinary) => {
    if (done) return;
    if (!isBinary) { if (String(data) === 'stop') finish('Stopped. A reading needs at least 30 seconds.'); return; }
    if (data.length < 9 || data.length > MAX_FRAME_BYTES) return;
    const clientTs = Number(data.readBigUInt64LE(0)); // capture time in µs (monotonic browser clock)
    epochOffsetUs ??= Date.now() * 1000 - clientTs;
    const ts = clientTs + epochOffsetUs;
    if (ts <= lastTs) return;
    try {
      const img = jpeg.decode(data.subarray(8), { useTArray: true, maxResolutionInMP: 2, formatAsRGBA: true });
      sdk.sendFrame(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength),
        img.width, img.height, img.width * 4, PixelFormat.kRGBA, ts);
      lastTs = ts;
      lastFrameAt = Date.now();
      if (++frames === 1) console.log(`[presage] first frame ${img.width}x${img.height}`);
    } catch { /* drop a bad frame */ }
  });

  try { sdk.useCustomInput(FrameTransform.kNone); sdk.start(); send({ type: 'ready' }); }
  catch (error) { finish(`Presage could not start: ${error.message}`); }
}

const server = http.createServer(proxy);
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });
wss.on('connection', (ws, req) => { measure(ws, req).catch(() => ws.close()); });

server.on('upgrade', (req, socket, head) => {
  if (new URL(req.url, 'http://gateway').pathname === '/presage/ws') {
    return wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  }
  // Anything else (e.g. Next.js dev reload) is passed straight through to the frontend.
  const upstream = net.connect(Number(FRONTEND.port), FRONTEND.hostname, () => {
    const headers = [];
    for (let i = 0; i < req.rawHeaders.length; i += 2) headers.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers.join('\r\n')}\r\n\r\n`);
    upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(PORT, () => console.log(`PhaseZero web gateway on http://localhost:${PORT} (API ${BACKEND.origin}, app ${FRONTEND.origin})`));

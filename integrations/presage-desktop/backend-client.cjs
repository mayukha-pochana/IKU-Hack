/** Connects the Presage desktop companion to the PhaseZero backend's demo account. No local user/auth database.
 *  Capture tokens and result receipts are issued and checked here, in the desktop main process, with
 *  PRESAGE_RESULT_SECRET; only measurements produced by the real SDK are ever saved. */
const { createHmac, timingSafeEqual, randomUUID } = require('node:crypto');

class BackendClient {
  constructor(baseUrl = 'http://127.0.0.1:8000', fetchImpl = fetch, secret = process.env.PRESAGE_RESULT_SECRET) {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
        parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('The demo backend must be a local HTTP server.');
    }
    this.baseUrl = parsed.origin;
    this.fetch = fetchImpl;
    this.secret = secret;
    this.cookie = '';
  }

  async request(path, payload) {
    let response;
    try {
      response = await this.fetch(this.baseUrl + path, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
        // The backend checks Origin on state-changing requests; this is the app's own local origin.
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000',
          ...(this.cookie ? { Cookie: this.cookie } : {}) },
        body: JSON.stringify(payload ?? {}),
      });
    } catch { throw new Error(`Cannot reach the PhaseZero backend at ${this.baseUrl}. Start it, then retry.`); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (path === '/api/auth/demo-login' && response.status === 403) {
        throw new Error('Demo login is disabled. Set DEMO_AUTH_ENABLED=true in backend/.env.');
      }
      throw new Error(data?.error?.message || `Backend request failed (${response.status}).`);
    }
    return { data, response };
  }

  async connectDemo() {
    const { response } = await this.request('/api/auth/demo-login');
    this.cookie = response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
    if (!this.cookie) throw new Error('The backend did not issue a demo session.');
    if (!this.secret || this.secret.length < 32) throw new Error('Configure PRESAGE_RESULT_SECRET (32+ characters).');
    // A short-lived local capture token, so a capture can only start after connecting.
    const payload = Buffer.from(JSON.stringify({
      purpose: 'presage_capture', user_id: randomUUID(), expires_at: Math.floor(Date.now() / 1000) + 300,
    })).toString('base64url');
    return { capture_token: `${payload}.${createHmac('sha256', this.secret).update(payload).digest('hex')}`,
      notice: "Signed in to Maya's synthetic demo account." };
  }

  async saveCheckin(token, consent) {
    if (!this.cookie) throw new Error('Connect the demo account before saving.');
    if (consent !== true || typeof token !== 'string' || token.length > 4096) throw new Error('Review the measurement and give save consent.');
    const [payload, signature] = token.split('.');
    const expected = createHmac('sha256', this.secret).update(payload || '').digest();
    if (!/^[a-f0-9]{64}$/.test(signature || '') || !timingSafeEqual(Buffer.from(signature, 'hex'), expected)) {
      throw new Error('This result was not produced by this companion. Measure again.');
    }
    const m = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return (await this.request('/api/health-checkins', {
      heart_rate: m.heart_rate ?? null, breathing_rate: m.breathing_rate ?? null,
      symptom_report: null, measurement_source: 'presage_sdk', consent_given: true,
    })).data;
  }
}

module.exports = { BackendClient };

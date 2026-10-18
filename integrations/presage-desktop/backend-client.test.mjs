import test from 'node:test';
import assert from 'node:assert/strict';
import clientModule from './backend-client.cjs';
import receiptModule from './receipt.cjs';

const { BackendClient } = clientModule;
const { verifyCaptureToken, signMeasurement } = receiptModule;
const SECRET = 'x'.repeat(40);

test('connects to the demo account, issues a capture token, and saves only a signed real result', async () => {
  const calls = [];
  const client = new BackendClient('http://127.0.0.1:8010', async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/api/auth/demo-login')) return new Response(JSON.stringify({ status: 'ok', demo_mode: true }),
      { headers: { 'Set-Cookie': 'careflow_session=test-session; HttpOnly; Path=/' } });
    assert.equal(options.headers.Cookie, 'careflow_session=test-session');
    assert.deepEqual(JSON.parse(options.body), { heart_rate: 72, breathing_rate: 14, symptom_report: null,
      measurement_source: 'presage_sdk', consent_given: true });
    return new Response(JSON.stringify({ id: 'checkin-fixture' }), { status: 201 });
  }, SECRET);
  const { capture_token } = await client.connectDemo();
  const session = verifyCaptureToken(capture_token, SECRET);
  const receipt = signMeasurement(session.user_id, { heart_rate: 72, breathing_rate: 14, measured_at: new Date().toISOString() },
    'test-sdk', SECRET);
  assert.equal((await client.saveCheckin(receipt.measurement_token, true)).id, 'checkin-fixture');
  assert.equal(calls.length, 2);
});

test('rejects unsigned results, missing consent, and saving before connecting', async () => {
  const client = new BackendClient('http://127.0.0.1:8010', async () => new Response('{}', {
    headers: { 'Set-Cookie': 'careflow_session=s; Path=/' } }), SECRET);
  await assert.rejects(client.saveCheckin('a.b', true), /Connect the demo account/);
  await client.connectDemo();
  await assert.rejects(client.saveCheckin('a.b', false), /consent/);
  await assert.rejects(client.saveCheckin(`${Buffer.from('{}').toString('base64url')}.${'0'.repeat(64)}`, true), /not produced/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import receipts from './receipt.cjs';

const secret = 'test-only-secret-'.repeat(3);
function capture(overrides = {}) {
  const payload = Buffer.from(JSON.stringify({ user_id: '11111111-1111-4111-8111-111111111111',
    expires_at: Math.floor(Date.now()/1000) + 300, purpose: 'presage_capture', ...overrides })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('hex')}`;
}
test('capture tokens are authenticated, patient bound, and expire', () => {
  assert.equal(receipts.verifyCaptureToken(capture(), secret).user_id, '11111111-1111-4111-8111-111111111111');
  assert.throws(() => receipts.verifyCaptureToken(capture() + 'x', secret));
  assert.throws(() => receipts.verifyCaptureToken(capture({expires_at: 1}), secret));
  assert.throws(() => receipts.verifyCaptureToken(capture({purpose: 'different'}), secret));
});
test('result receipt retains genuine values without filling missing fields', () => {
  const result = receipts.signMeasurement('patient', {heart_rate: 71.2}, 'test-fixture', secret);
  const [payload, signature] = result.measurement_token.split('.');
  assert.equal(createHmac('sha256', secret).update(payload).digest('hex'), signature);
  assert.equal(JSON.parse(Buffer.from(payload, 'base64url')).breathing_rate, null);
  assert.equal(result.measurement.heart_rate, 71.2);
});

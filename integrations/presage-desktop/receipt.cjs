const { createHmac, timingSafeEqual, randomUUID } = require('node:crypto');

function verifyCaptureToken(token, secret) {
  if (!secret || secret.length < 32) throw new Error('Configure PRESAGE_RESULT_SECRET (32+ characters).');
  const [payload, signature, extra] = token.split('.');
  if (!payload || !/^[a-f0-9]{64}$/.test(signature || '') || extra) throw new Error('Invalid capture token.');
  const expected = createHmac('sha256', secret).update(payload).digest();
  if (!timingSafeEqual(Buffer.from(signature, 'hex'), expected)) throw new Error('Invalid capture token.');
  const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (session.purpose !== 'presage_capture' || typeof session.expires_at !== 'number' ||
      session.expires_at < Date.now() / 1000 || session.expires_at > Date.now() / 1000 + 330 ||
      !/^[0-9a-f-]{36}$/.test(session.user_id || '')) throw new Error('Expired or invalid capture token.');
  return session;
}

function signMeasurement(userId, values, sdkVersion, secret) {
  const data = {
    user_id: userId,
    measurement_id: randomUUID(),
    measured_at: values.measured_at ?? new Date().toISOString(),
    heart_rate: values.heart_rate ?? null,
    breathing_rate: values.breathing_rate ?? null,
    sdk_version: sdkVersion,
    platform: `${process.platform}-${process.arch}`,
  };
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return { measurement: data, measurement_token: `${payload}.${createHmac('sha256', secret).update(payload).digest('hex')}` };
}

module.exports = { verifyCaptureToken, signMeasurement };

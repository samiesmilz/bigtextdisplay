import crypto from 'crypto';

const LICENSE_SECRET = process.env.LICENSE_SECRET || 'dev-secret-change-in-production';

export function signLicense(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', LICENSE_SECRET).update(body).digest('base64url');
  return `BTD-${body}.${sig}`;
}

export function verifyLicense(key) {
  if (!key || !key.startsWith('BTD-')) return null;
  const raw = key.slice(4);
  const [body, sig] = raw.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', LICENSE_SECRET).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createProLicense({ subscriptionId, email }) {
  const exp = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const license = signLicense({
    tier: 'pro',
    email: email || '',
    sub: subscriptionId,
    exp,
  });
  return { license, tier: 'pro', exp };
}
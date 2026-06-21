import { handleOptions, sendJson } from '../_lib/http.js';
import { verifyLicense } from '../_lib/license.js';

export default function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  const key = decodeURIComponent(String(req.query.key || ''));
  if (key === 'BTD-DEV-PRO' && process.env.VERCEL_ENV !== 'production') {
    return sendJson(res, 200, { valid: true, tier: 'pro', dev: true });
  }

  const payload = verifyLicense(key);
  if (payload) {
    return sendJson(res, 200, { valid: true, tier: payload.tier || 'pro', exp: payload.exp });
  }

  sendJson(res, 200, { valid: false });
}
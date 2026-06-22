import { handleOptions, sendJson } from '../_lib/http.js';
import { getSubscriberByToken } from '../_lib/subscribers.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  const token = String(req.query.token || '');
  if (!token) return sendJson(res, 400, { error: 'token required' });

  const sub = await getSubscriberByToken(token);
  if (!sub) return sendJson(res, 404, { error: 'Not found' });

  sendJson(res, 200, {
    firstName: sub.firstName || '',
    email: sub.email,
    displays: sub.displays || [],
    refCode: sub.refCode,
    shareCount: sub.shareCount || 0,
  });
}
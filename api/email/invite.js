import { handleOptions, readJsonBody, sendJson } from '../_lib/http.js';
import { sendInviteEmail } from '../_lib/resend.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON' });
  }

  const { to, fromName = '', shareUrl = '' } = body;
  if (!to || !shareUrl) return sendJson(res, 400, { error: 'to and shareUrl required' });

  try {
    await sendInviteEmail({ to, fromName, shareUrl });
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Send failed' });
  }
}
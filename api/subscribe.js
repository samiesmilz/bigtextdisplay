import { handleOptions, readJsonBody, sendJson } from './_lib/http.js';
import { upsertSubscriber, incrementRef } from './_lib/subscribers.js';
import { sendShareEmail, SITE } from './_lib/resend.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON' });
  }

  const { email, firstName = '', shareUrl = '', reminders = false, referredBy = '' } = body;
  if (!email) return sendJson(res, 400, { error: 'email required' });

  try {
    if (referredBy) await incrementRef(referredBy);
    const { subscriber, token } = await upsertSubscriber({
      email,
      firstName,
      shareUrl,
      reminders: Boolean(reminders),
      referredBy,
    });

    const magicUrl = `${SITE}/mine.html?token=${token}`;
    let emailed = false;
    if (shareUrl) {
      const result = await sendShareEmail({
        email: subscriber.email,
        firstName: subscriber.firstName,
        shareUrl,
        magicUrl,
      });
      emailed = result.ok;
    }

    sendJson(res, 200, {
      ok: true,
      emailed,
      magicUrl,
      refCode: subscriber.refCode,
    });
  } catch (err) {
    sendJson(res, 400, { error: err.message || 'Subscribe failed' });
  }
}
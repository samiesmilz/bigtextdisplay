import { listReminderSubscribers } from '../_lib/subscribers.js';
import { sendReminderEmail, SITE } from '../_lib/resend.js';

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const subs = await listReminderSubscribers();
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      const magicUrl = `${SITE}/mine.html?token=${sub.magicToken}`;
      const result = await sendReminderEmail({
        email: sub.email,
        firstName: sub.firstName,
        magicUrl,
      });
      if (result.ok) sent += 1;
    } catch {
      failed += 1;
    }
  }

  res.status(200).json({ ok: true, total: subs.length, sent, failed });
}
const FROM = process.env.RESEND_FROM_EMAIL || 'BigTextDisplay <onboarding@resend.dev>';
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://www.bigtextdisplay.com').replace(/\/$/, '');

async function send({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('RESEND_API_KEY missing — email not sent to', to);
    return { ok: false, skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return { ok: true };
}

function btn(url, label) {
  return `<a href="${url}" style="display:inline-block;background:#fafafa;color:#09090b;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">${label}</a>`;
}

export async function sendShareEmail({ email, firstName, shareUrl, magicUrl }) {
  const name = firstName || 'there';
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#18181b">
      <p>Hi ${name},</p>
      <p>Your BigTextDisplay link is ready. Open it on a projector, TV, or tablet — press <strong>H</strong> to hide controls.</p>
      ${btn(shareUrl, 'Open your display →')}
      <p style="color:#71717a;font-size:14px">Bookmark this email, or find all your recent displays anytime:</p>
      ${btn(magicUrl, 'My displays →')}
      <p style="color:#a1a1aa;font-size:12px;margin-top:32px">Made with <a href="${SITE}">bigtextdisplay.com</a></p>
    </div>`;
  return send({ to: email, subject: 'Your BigTextDisplay link', html });
}

export async function sendInviteEmail({ to, fromName, shareUrl }) {
  const who = fromName || 'Someone';
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#18181b">
      <p><strong>${who}</strong> shared a live display with you.</p>
      <p>Open the link on any screen — no account needed.</p>
      ${btn(shareUrl, 'View display →')}
      <p style="color:#71717a;font-size:14px">Want your own? <a href="${SITE}/home.html?utm_source=invite">Create one free at bigtextdisplay.com</a></p>
    </div>`;
  return send({ to, subject: `${who} shared a display with you`, html });
}

export async function sendReminderEmail({ email, firstName, magicUrl }) {
  const name = firstName || 'there';
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#18181b">
      <p>Hi ${name},</p>
      <p>Your next class, service, or event — big text and timers are one click away.</p>
      ${btn(magicUrl, 'Open my displays →')}
      <p style="color:#71717a;font-size:14px">Or start fresh: <a href="${SITE}">${SITE}</a></p>
    </div>`;
  return send({ to: email, subject: 'Your displays are ready — BigTextDisplay', html });
}

export { SITE };
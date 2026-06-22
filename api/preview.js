import { SITE } from './_lib/resend.js';

export default function handler(req, res) {
  const q = req.query || {};
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v != null && k !== 'present') params.set(k, String(v));
  }
  const appUrl = `${SITE}/${params.toString() ? `?${params}` : ''}`;
  const ogParams = new URLSearchParams(q);
  const ogImage = `${SITE}/api/og?${ogParams.toString()}`;
  const title = q.q ? `${String(q.q).slice(0, 60)} — BigTextDisplay` : 'BigTextDisplay';
  const desc = q.mode === 'timer'
    ? 'Countdown timer for any screen — bigtextdisplay.com'
    : 'Big text for any screen — free, no signup';

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:url" content="${esc(appUrl)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta http-equiv="refresh" content="0;url=${esc(appUrl)}">
<title>${esc(title)}</title>
</head><body><p><a href="${esc(appUrl)}">Open display →</a></p></body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
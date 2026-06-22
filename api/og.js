const THEMES = {
  midnight: { bg: '#09090b', fg: '#fafafa' },
  stage: { bg: '#000000', fg: '#facc15' },
  paper: { bg: '#fafafa', fg: '#18181b' },
  rose: { bg: '#1a0a12', fg: '#fce7f3' },
  ocean: { bg: '#020617', fg: '#e0f2fe' },
  signal: { bg: '#1c0505', fg: '#fecaca' },
};

export default function handler(req, res) {
  const q = req.query || {};
  const text = String(q.q || q.text || 'HELLO').slice(0, 80).replace(/[<>&"']/g, '');
  const theme = THEMES[q.theme] || THEMES.midnight;
  const bg = q.bg ? `#${String(q.bg).replace('#', '')}` : theme.bg;
  const fg = q.tc ? `#${String(q.tc).replace('#', '')}` : theme.fg;
  const mode = q.mode === 'timer' ? 'timer' : 'text';
  const label = mode === 'timer'
    ? (q.t ? `${String(Math.floor(+q.t / 60)).padStart(2, '0')}:${String(+q.t % 60).padStart(2, '0')}` : '05:00')
    : text;

  const fontSize = Math.max(48, Math.min(120, 900 / Math.max(label.length, 4)));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${bg}"/>
  <text x="600" y="300" text-anchor="middle" dominant-baseline="middle"
    font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="${fontSize}" fill="${fg}">${label}</text>
  <text x="600" y="560" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" fill="${fg}" opacity="0.45">bigtextdisplay.com</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  res.status(200).send(svg);
}
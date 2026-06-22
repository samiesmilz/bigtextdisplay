import { fetchMyDisplays } from './modules/growth';

const params = new URLSearchParams(location.search);
const token = params.get('token') || '';

async function init() {
  const list = document.getElementById('mine-list')!;
  const empty = document.getElementById('mine-empty')!;
  const err = document.getElementById('mine-error')!;
  const greeting = document.getElementById('mine-greeting')!;

  if (!token) {
    err.hidden = false;
    err.textContent = 'Missing link — use the email we sent you.';
    return;
  }

  try {
    const data = await fetchMyDisplays(token);
    if (data.firstName) greeting.textContent = `Hi ${data.firstName}, your displays`;

    const displays = data.displays || [];
    if (!displays.length) {
      empty.hidden = false;
      return;
    }

    displays.forEach((d) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = d.url;
      a.innerHTML = `<strong>${escapeHtml(d.label)}</strong><span>${escapeHtml(shortUrl(d.url))}</span>`;
      li.appendChild(a);
      list.appendChild(li);
    });
  } catch {
    err.hidden = false;
  }
}

function escapeHtml(s: string) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

init();
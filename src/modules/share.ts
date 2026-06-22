import type { AppSettings } from './types';

const REF_KEY = 'btd-ref';
const MY_REF_KEY = 'btd-my-ref';

export function getStoredRef(): string {
  return localStorage.getItem(REF_KEY) || '';
}

export function storeIncomingRef(ref: string) {
  if (ref) localStorage.setItem(REF_KEY, ref);
}

export function getMyRefCode(): string {
  return localStorage.getItem(MY_REF_KEY) || '';
}

export function storeMyRefCode(code: string) {
  if (code) localStorage.setItem(MY_REF_KEY, code);
}

export function settingsToParams(s: AppSettings, opts: { present?: boolean } = {}): URLSearchParams {
  const p = new URLSearchParams();
  p.set('mode', s.mode);
  if (s.text) p.set('q', s.text);
  if (s.theme) p.set('theme', s.theme);
  if (s.customColors) {
    p.set('tc', s.textColor.replace('#', ''));
    p.set('bg', s.bgColor.replace('#', ''));
  }
  if (s.textScale !== 100) p.set('scale', String(s.textScale));
  const totalSec = s.timerMinutes * 60 + s.timerSeconds;
  if (s.mode === 'timer' && totalSec > 0) p.set('t', String(totalSec));
  if (s.timerLabel) p.set('label', s.timerLabel);
  if (s.roomId) p.set('room', s.roomId);
  const myRef = getMyRefCode();
  if (myRef) p.set('ref', myRef);
  if (opts.present) p.set('present', '1');
  return p;
}

export function paramsToSettings(params: URLSearchParams, base: AppSettings): Partial<AppSettings> {
  const patch: Partial<AppSettings> = {};
  const mode = params.get('mode');
  if (mode === 'text' || mode === 'timer') patch.mode = mode;
  const q = params.get('q');
  if (q !== null) patch.text = q;
  const theme = params.get('theme');
  if (theme) patch.theme = theme as AppSettings['theme'];
  const tc = params.get('tc');
  const bg = params.get('bg');
  if (tc && bg) {
    patch.textColor = `#${tc}`;
    patch.bgColor = `#${bg}`;
    patch.customColors = true;
  }
  const scale = params.get('scale');
  if (scale) patch.textScale = +scale;
  const t = params.get('t');
  if (t) {
    const sec = +t;
    patch.timerMinutes = Math.floor(sec / 60);
    patch.timerSeconds = sec % 60;
  }
  const label = params.get('label');
  if (label) patch.timerLabel = label;
  const room = params.get('room');
  if (room) patch.roomId = room.toUpperCase();
  const license = params.get('license');
  if (license) patch.licenseKey = license;
  const ref = params.get('ref');
  if (ref) storeIncomingRef(ref);
  return patch;
}

export function buildShareUrl(s: AppSettings, opts: { present?: boolean } = {}): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.search = settingsToParams(s, opts).toString();
  return url.toString();
}

export function getOgImageUrl(s: AppSettings): string {
  const p = settingsToParams(s);
  return `${window.location.origin}/api/og?${p.toString()}`;
}

export function getSocialLinks(shareUrl: string, s: AppSettings) {
  const text = s.mode === 'timer'
    ? `Countdown timer on the big screen`
    : (s.text || 'Big text display').slice(0, 100);
  const encoded = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${text} — BigTextDisplay`);
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encoded}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encoded}`,
    reddit: `https://reddit.com/submit?url=${encoded}&title=${encodedText}`,
    email: `mailto:?subject=${encodeURIComponent('Display link')}&body=${encodedText}%0A%0A${encoded}`,
  };
}

export function copyShareLink(s: AppSettings, opts: { present?: boolean } = {}): Promise<void> {
  return navigator.clipboard.writeText(buildShareUrl(s, opts));
}

export function openSocial(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer,width=600,height=520');
}
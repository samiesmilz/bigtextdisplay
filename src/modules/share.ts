import type { AppSettings } from './types';

export function settingsToParams(s: AppSettings): URLSearchParams {
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
  return patch;
}

export function copyShareLink(s: AppSettings): Promise<void> {
  const url = new URL(window.location.origin + window.location.pathname);
  url.search = settingsToParams(s).toString();
  return navigator.clipboard.writeText(url.toString());
}
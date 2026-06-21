import type { SoundPack } from './types';

let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
}

function tone(freq: number, start: number, dur: number, vol = 0.25) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.frequency.value = freq;
  gain.gain.value = vol;
  const t = c.currentTime + start;
  osc.start(t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.stop(t + dur);
}

export function playFinishSound(pack: SoundPack) {
  try {
    switch (pack) {
      case 'bell':
        tone(660, 0, 0.6, 0.3);
        tone(880, 0.15, 0.5, 0.2);
        break;
      case 'horn':
        tone(220, 0, 0.35, 0.35);
        tone(185, 0.4, 0.35, 0.35);
        tone(220, 0.8, 0.35, 0.35);
        break;
      case 'chime':
        tone(523, 0, 0.4, 0.2);
        tone(659, 0.2, 0.4, 0.2);
        tone(784, 0.4, 0.5, 0.2);
        break;
      default:
        tone(880, 0, 0.45, 0.25);
        tone(1100, 0.55, 0.45, 0.25);
    }
  } catch { /* audio unavailable */ }
}
import './styles.css';
import './extras.css';
import type { AppSettings, ThemeName, SoundPack } from './modules/types';
import {
  settingsToParams, paramsToSettings, buildShareUrl, getSocialLinks,
  openSocial, getStoredRef, storeMyRefCode, getOgImageUrl,
} from './modules/share';
import { subscribeAndEmail, inviteByEmail } from './modules/growth';
import { playFinishSound } from './modules/audio';
import { checkPro, getStoredLicense, storeLicense, saveDisplay, applySavedDisplay } from './modules/pro';
import { createRoom, fetchRoom, pushRoom } from './modules/api';
import { qrDataUrl } from './modules/qr';

const STORAGE_KEY = 'btd-v3';
const RING_C = 339.292;
const THEMES: ThemeName[] = ['midnight', 'stage', 'paper', 'rose', 'blush', 'sepia', 'purple', 'green', 'ocean', 'signal'];
const THEME_COLORS: Record<ThemeName, { bg: string; fg: string }> = {
  midnight: { bg: '#09090b', fg: '#fafafa' },
  stage: { bg: '#000000', fg: '#facc15' },
  paper: { bg: '#fafafa', fg: '#18181b' },
  rose: { bg: '#1a0a12', fg: '#fce7f3' },
  blush: { bg: '#fff1f2', fg: '#9d174d' },
  sepia: { bg: '#292018', fg: '#f5e6d3' },
  purple: { bg: '#14061f', fg: '#ede9fe' },
  green: { bg: '#052e16', fg: '#ecfdf5' },
  ocean: { bg: '#020617', fg: '#e0f2fe' },
  signal: { bg: '#1c0505', fg: '#fecaca' },
};

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const $$ = <T extends HTMLElement = HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)];

let settings: AppSettings;
let wakeLock: WakeLockSentinel | null = null;
let roomPollId: ReturnType<typeof setInterval> | null = null;
let urlSyncTimer: ReturnType<typeof setTimeout> | undefined;

function defaults(): AppSettings {
  return {
    mode: 'text', theme: 'midnight', text: 'HELLO',
    textColor: '#fafafa', bgColor: '#09090b', customColors: false, textScale: 100,
    timerMinutes: 5, timerSeconds: 0, timerLabel: '', timerSound: true,
    soundPack: 'beep', roomId: '', logoDataUrl: '', savedDisplays: [],
    onboardingDone: false, licenseKey: '', pro: false,
  };
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch { /* */ }
  return defaults();
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* */ }
  scheduleUrlSync();
  updatePageMeta();
  if (settings.roomId && settings.pro) pushRoomState();
}

function scheduleUrlSync() {
  clearTimeout(urlSyncTimer);
  urlSyncTimer = setTimeout(() => {
    const p = settingsToParams(settings);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }, 400);
}

// ── Timer ──
const timer = (() => {
  let totalMs = 0, remainingMs = 0, running = false, endTime = 0, rafId = 0;
  const display = $('#timer-display');
  const ring = $('#timer-ring') as unknown as SVGCircleElement;

  const format = (ms: number) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const updateRing = () => {
    if (!ring || totalMs <= 0) { ring.style.strokeDashoffset = '0'; return; }
    ring.style.strokeDashoffset = String(RING_C * (1 - remainingMs / totalMs));
  };

  const render = () => {
    display.textContent = format(remainingMs);
    display.classList.toggle('warning', running && remainingMs <= 10000 && remainingMs > 0);
    display.classList.toggle('finished', !running && totalMs > 0 && remainingMs <= 0);
    updateRing();
    if (running) document.title = `${format(remainingMs)} — BigTextDisplay`;
  };

  const finish = () => {
    running = false; remainingMs = 0;
    cancelAnimationFrame(rafId);
    render();
    updateBtns();
    if (settings.timerSound) playFinishSound(settings.soundPack);
    document.title = "Done — BigTextDisplay";
    $('#times-up').classList.add('active');
    releaseWakeLock();
  };

  const tick = (now: number) => {
    if (!running) return;
    remainingMs = Math.max(0, endTime - now);
    render();
    if (remainingMs <= 0) { finish(); return; }
    rafId = requestAnimationFrame(tick);
  };

  const setDuration = (m: number, s: number) => {
    if (running) return;
    totalMs = (m * 60 + s) * 1000;
    remainingMs = totalMs;
    render();
    display.classList.remove('finished');
    $('#times-up').classList.remove('active');
    document.title = 'BigTextDisplay';
  };

  const start = async () => {
    if (running) return;
    if (remainingMs <= 0) setDuration(+($('#timer-min') as HTMLInputElement).value, +($('#timer-sec') as HTMLInputElement).value);
    if (remainingMs <= 0) return;
    running = true;
    endTime = performance.now() + remainingMs;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
    updateBtns();
    await requestWakeLock();
  };

  const pause = () => {
    if (!running) return;
    running = false;
    remainingMs = Math.max(0, endTime - performance.now());
    cancelAnimationFrame(rafId);
    render(); updateBtns();
    releaseWakeLock();
  };

  const reset = () => {
    running = false;
    cancelAnimationFrame(rafId);
    setDuration(+($('#timer-min') as HTMLInputElement).value, +($('#timer-sec') as HTMLInputElement).value);
    updateBtns();
    $('#times-up').classList.remove('active');
    releaseWakeLock();
  };

  const addMinute = () => {
    remainingMs += 60000;
    if (running) endTime = performance.now() + remainingMs;
    else totalMs = remainingMs;
    render();
    $('#times-up').classList.remove('active');
  };

  const updateBtns = () => {
    ($('#btn-start') as HTMLButtonElement).disabled = running;
    ($('#btn-pause') as HTMLButtonElement).disabled = !running;
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) remainingMs = Math.max(0, endTime - performance.now());
    else if (!document.hidden && running) {
      endTime = performance.now() + remainingMs;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    }
  });

  return { setDuration, start, pause, reset, addMinute, updateBtns, get running() { return running; } };
})();

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch { /* */ }
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

function applyTheme(name: ThemeName, opts: { keepCustom?: boolean } = {}) {
  if (!THEMES.includes(name)) name = 'midnight';
  settings.theme = name;
  if (!opts.keepCustom) settings.customColors = false;
  document.documentElement.setAttribute('data-theme', name);
  const colors = THEME_COLORS[name];
  $$<HTMLButtonElement>('.theme-swatch').forEach((sw) => {
    sw.setAttribute('aria-current', sw.dataset.theme === name ? 'true' : 'false');
  });
  if (!settings.customColors && colors) {
    ($('#text-color') as HTMLInputElement).value = colors.fg;
    ($('#bg-color') as HTMLInputElement).value = colors.bg;
    settings.textColor = colors.fg;
    settings.bgColor = colors.bg;
  }
  applyDisplayColors();
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = settings.customColors ? settings.bgColor : colors.bg;
  save();
}

function applyDisplayColors() {
  const canvas = $('#text-canvas');
  const text = $('#big-text');
  if (settings.customColors) {
    canvas.style.background = settings.bgColor;
    text.style.color = settings.textColor;
    $$<HTMLButtonElement>('.theme-swatch').forEach((s) => s.removeAttribute('aria-current'));
  } else {
    canvas.style.background = '';
    text.style.color = '';
    $$<HTMLButtonElement>('.theme-swatch').forEach((sw) => {
      sw.setAttribute('aria-current', sw.dataset.theme === settings.theme ? 'true' : 'false');
    });
  }
}

function measureFit(el: HTMLElement, maxW: number, maxH: number) {
  let lo = 12, hi = Math.max(lo, Math.floor(Math.min(maxW, maxH * 2))), best = lo;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    el.style.fontSize = mid + 'px';
    if (el.scrollWidth <= maxW && el.scrollHeight <= maxH) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return best;
}

function fitText() {
  const el = $('#big-text');
  const container = $('#text-canvas');
  if (settings.mode !== 'text') return;
  const scale = settings.textScale / 100;
  const maxW = container.clientWidth - 64;
  const maxH = container.clientHeight - 64;
  if (maxW <= 0 || maxH <= 0) return;
  el.style.transform = 'none';
  el.style.fontSize = Math.max(12, Math.round(measureFit(el, maxW, maxH) * scale)) + 'px';
}

function syncText(source: 'input' | 'display' | 'both') {
  const input = $('#text-input') as HTMLInputElement;
  const big = $('#big-text');
  if (source === 'input') { big.textContent = input.value; settings.text = input.value; }
  else if (source === 'display') { input.value = big.textContent || ''; settings.text = input.value; }
  else { const v = input.value; big.textContent = v; settings.text = v; }
  save(); fitText();
}

function switchMode(mode: 'text' | 'timer') {
  settings.mode = mode;
  const isText = mode === 'text';
  $('#tab-text').setAttribute('aria-selected', String(isText));
  $('#tab-timer').setAttribute('aria-selected', String(!isText));
  $('#panel-text').classList.toggle('active', isText);
  $('#panel-timer').classList.toggle('active', !isText);
  $('#panel-text').hidden = !isText;
  $('#panel-timer').hidden = isText;
  $('#context-text').hidden = !isText;
  $('#context-timer').hidden = isText;
  save();
  if (isText) fitText();
}

function setChromeHidden(hidden: boolean) {
  document.body.classList.toggle('presentation', hidden);
  document.body.classList.remove('chrome-peek', 'chrome-near');
  $('#chrome-hover-zone').setAttribute('aria-hidden', String(!hidden));
}

function updateProUI() {
  const pro = settings.pro;
  const wm = $('#watermark') as HTMLAnchorElement;
  wm.hidden = pro;
  if (!pro) wm.href = '/home.html?utm_source=watermark';
  $$('.pro-gated').forEach((el) => el.classList.toggle('pro-locked', !pro));
  const badge = $('#pro-badge');
  if (badge) badge.hidden = !pro;
  renderSavedSelect();
}

async function initPro() {
  const params = new URLSearchParams(location.search);
  const lic = params.get('license') || getStoredLicense();
  if (lic) {
    settings.licenseKey = lic;
    settings.pro = await checkPro(lic);
    if (settings.pro) storeLicense(lic);
  }
  updateProUI();
}

function renderSavedSelect() {
  const sel = $('#saved-select') as HTMLSelectElement;
  if (!sel) return;
  sel.innerHTML = '<option value="">Saved…</option>';
  if (!settings.pro) return;
  settings.savedDisplays.forEach((d) => {
    const o = document.createElement('option');
    o.value = d.id;
    o.textContent = d.name;
    sel.appendChild(o);
  });
}

async function pushRoomState() {
  if (!settings.roomId) return;
  try {
    await pushRoom(settings.roomId, { settings, ts: Date.now() });
  } catch { /* */ }
}

function startRoomPoll() {
  if (roomPollId) clearInterval(roomPollId);
  if (!settings.roomId) return;
  roomPollId = setInterval(async () => {
    try {
      const data = await fetchRoom(settings.roomId);
      if (!data?.state?.settings) return;
      const remote = data.state.settings as Partial<AppSettings>;
      Object.assign(settings, remote);
      applyRemoteState();
    } catch { /* */ }
  }, 1500);
}

function applyRemoteState() {
  ($('#text-input') as HTMLInputElement).value = settings.text;
  $('#big-text').textContent = settings.text;
  applyTheme(settings.theme, { keepCustom: settings.customColors });
  if (settings.customColors) applyDisplayColors();
  ($('#text-scale') as HTMLInputElement).value = String(settings.textScale);
  $('#scale-value').textContent = settings.textScale + '%';
  timer.setDuration(settings.timerMinutes, settings.timerSeconds);
  $('#timer-label').textContent = settings.timerLabel;
  ($('#timer-label-input') as HTMLInputElement).value = settings.timerLabel;
  fitText();
  updateLogo();
}

function updateLogo() {
  let img = document.querySelector<HTMLImageElement>('.display-logo');
  if (settings.logoDataUrl && settings.pro) {
    if (!img) {
      img = document.createElement('img');
      img.className = 'display-logo';
      $('#text-canvas').appendChild(img);
    }
    img.src = settings.logoDataUrl;
    img.hidden = false;
  } else if (img) img.hidden = true;
}

function showToast(msg: string) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function openModal(id: string) { $(`#${id}`).classList.add('open'); }
function closeModal(id: string) { $(`#${id}`).classList.remove('open'); }

function sharePresentMode(): boolean {
  return ($('#share-present') as HTMLInputElement).checked;
}

function refreshShareModal() {
  const url = buildShareUrl(settings, { present: sharePresentMode() });
  ($('#share-url-input') as HTMLInputElement).value = url;
}

function updatePageMeta() {
  const title = settings.mode === 'timer'
    ? `${String(settings.timerMinutes).padStart(2, '0')}:${String(settings.timerSeconds).padStart(2, '0')} — BigTextDisplay`
    : (settings.text ? `${settings.text.slice(0, 40)} — BigTextDisplay` : 'BigTextDisplay');
  document.title = title;
  const setMeta = (sel: string, val: string) => {
    const el = document.querySelector<HTMLMetaElement>(sel);
    if (el) el.content = val;
  };
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:image"]', getOgImageUrl(settings));
  setMeta('meta[name="twitter:image"]', getOgImageUrl(settings));
}

function maybeShowVisitorCta() {
  const params = new URLSearchParams(location.search);
  const isSharedView = params.has('q') || params.has('t') || params.has('ref');
  if (!isSharedView || settings.pro) return;
  const cta = $('#visitor-cta');
  setTimeout(() => { cta.hidden = false; }, 4000);
  setTimeout(() => { cta.hidden = true; }, 20000);
}

async function openShareModal() {
  refreshShareModal();
  openModal('share-modal');
}

async function handleShareEmail(e: Event) {
  e.preventDefault();
  const email = ($('#share-email') as HTMLInputElement).value.trim();
  const firstName = ($('#share-first-name') as HTMLInputElement).value.trim();
  const reminders = ($('#share-reminders') as HTMLInputElement).checked;
  const shareUrl = buildShareUrl(settings, { present: sharePresentMode() });
  const btn = $('#share-email-btn') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const result = await subscribeAndEmail({
      email,
      firstName,
      shareUrl,
      reminders,
      referredBy: getStoredRef(),
    });
    if (result.refCode) storeMyRefCode(result.refCode);
    showToast(result.emailed ? 'Check your inbox!' : 'Saved — add RESEND_API_KEY to send emails');
  } catch {
    showToast('Could not save — try again');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Email me this link';
  }
}

async function setupRoom() {
  if (!settings.pro) { location.href = '/upgrade.html'; return; }
  try {
    if (!settings.roomId) {
      const { id } = await createRoom();
      settings.roomId = id;
      save();
    }
    const remoteUrl = `${location.origin}/remote.html?room=${settings.roomId}`;
    $('#room-code').textContent = settings.roomId;
    ($('#room-url') as HTMLAnchorElement).href = remoteUrl;
    ($('#room-qr') as HTMLImageElement).src = await qrDataUrl(remoteUrl);
    openModal('room-modal');
    startRoomPoll();
  } catch {
    showToast('Room service unavailable — start API server');
  }
}

function bindEvents() {
  $('#tab-text').addEventListener('click', () => switchMode('text'));
  $('#tab-timer').addEventListener('click', () => switchMode('timer'));

  const stopBubble = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { setChromeHidden(false); return; }
    e.stopPropagation();
  };
  $('#text-input').addEventListener('input', () => syncText('input'));
  $('#text-input').addEventListener('keydown', stopBubble as EventListener);
  $('#big-text').addEventListener('input', () => syncText('display'));
  $('#big-text').addEventListener('keydown', stopBubble as EventListener);
  $('#big-text').addEventListener('blur', () => syncText('both'));

  $('#text-scale').addEventListener('input', () => {
    settings.textScale = +($('#text-scale') as HTMLInputElement).value;
    $('#scale-value').textContent = settings.textScale + '%';
    save(); fitText();
  });

  $('#text-color').addEventListener('input', () => {
    settings.textColor = ($('#text-color') as HTMLInputElement).value;
    settings.customColors = true;
    applyDisplayColors(); save();
  });
  $('#bg-color').addEventListener('input', () => {
    settings.bgColor = ($('#bg-color') as HTMLInputElement).value;
    settings.customColors = true;
    applyDisplayColors(); save();
  });

  $$<HTMLButtonElement>('.theme-swatch').forEach((sw) => {
    sw.addEventListener('click', () => applyTheme(sw.dataset.theme as ThemeName));
  });

  $('#btn-hide').addEventListener('click', () => {
    const hiding = !document.body.classList.contains('presentation');
    setChromeHidden(hiding);
    if (hiding && !settings.pro && !localStorage.getItem('btd-hide-nudge')) {
      localStorage.setItem('btd-hide-nudge', '1');
      setTimeout(() => {
        if (confirm('Presenting weekly? Save this display to your email for next time.')) openShareModal();
      }, 600);
    }
  });
  $('#chrome-reveal').addEventListener('click', () => setChromeHidden(false));
  $('#btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  $('#btn-share').addEventListener('click', () => openShareModal());
  $('#share-close').addEventListener('click', () => closeModal('share-modal'));
  $('#share-present').addEventListener('change', refreshShareModal);
  $('#share-copy-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(settings, { present: sharePresentMode() }));
      showToast('Link copied!');
    } catch { showToast('Copy failed'); }
  });
  $('#share-email-form').addEventListener('submit', handleShareEmail);
  $$<HTMLButtonElement>('.social-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const links = getSocialLinks(buildShareUrl(settings, { present: sharePresentMode() }), settings);
      const key = btn.dataset.social as keyof ReturnType<typeof getSocialLinks>;
      if (links[key]) openSocial(links[key]);
    });
  });
  $('#invite-send-btn').addEventListener('click', async () => {
    const to = ($('#invite-email') as HTMLInputElement).value.trim();
    if (!to) return;
    const fromName = ($('#share-first-name') as HTMLInputElement).value.trim();
    try {
      await inviteByEmail({
        to,
        fromName,
        shareUrl: buildShareUrl(settings, { present: sharePresentMode() }),
      });
      showToast('Invite sent!');
      ($('#invite-email') as HTMLInputElement).value = '';
    } catch {
      showToast('Invite failed — check Resend config');
    }
  });

  $('#btn-room').addEventListener('click', () => setupRoom());
  $('#room-close').addEventListener('click', () => closeModal('room-modal'));

  $('#btn-upgrade').addEventListener('click', () => { location.href = '/upgrade.html'; });

  $('#btn-start').addEventListener('click', () => timer.start());
  $('#btn-pause').addEventListener('click', () => timer.pause());
  $('#btn-reset').addEventListener('click', () => timer.reset());
  $('#btn-add1').addEventListener('click', () => timer.addMinute());

  $('#times-up-dismiss').addEventListener('click', () => $('#times-up').classList.remove('active'));
  $('#times-up-add1').addEventListener('click', () => { timer.addMinute(); $('#times-up').classList.remove('active'); });

  $('#btn-sound').addEventListener('click', () => {
    settings.timerSound = !settings.timerSound;
    $('#btn-sound').setAttribute('aria-pressed', String(settings.timerSound));
    save();
  });

  ($('#sound-pack') as HTMLSelectElement)?.addEventListener('change', (e) => {
    settings.soundPack = (e.target as HTMLSelectElement).value as SoundPack;
    save();
  });

  $('#btn-save-display')?.addEventListener('click', () => {
    if (!settings.pro) return;
    const name = prompt('Name this display:');
    if (!name) return;
    settings.savedDisplays = saveDisplay(settings, name);
    save(); renderSavedSelect(); showToast('Saved!');
  });

  ($('#saved-select') as HTMLSelectElement)?.addEventListener('change', (e) => {
    const id = (e.target as HTMLSelectElement).value;
    const found = settings.savedDisplays.find((d) => d.id === id);
    if (found) { Object.assign(settings, applySavedDisplay(found)); applyRemoteState(); save(); }
  });

  ($('#logo-input') as HTMLInputElement)?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !settings.pro) return;
    const reader = new FileReader();
    reader.onload = () => { settings.logoDataUrl = reader.result as string; save(); updateLogo(); };
    reader.readAsDataURL(file);
  });

  ($('#license-input') as HTMLInputElement)?.addEventListener('input', async (e) => {
    const key = (e.target as HTMLInputElement).value.trim();
    if (!key) return;
    settings.pro = await checkPro(key);
    settings.licenseKey = key;
    if (settings.pro) { storeLicense(key); updateProUI(); showToast('Pro activated!'); }
    else showToast('Invalid license');
  });

  $$<HTMLButtonElement>('.chip[data-seconds]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = +btn.dataset.seconds!;
      const m = Math.floor(sec / 60), s = sec % 60;
      ($('#timer-min') as HTMLInputElement).value = String(m);
      ($('#timer-sec') as HTMLInputElement).value = String(s);
      settings.timerMinutes = m; settings.timerSeconds = s;
      $$<HTMLButtonElement>('.chip[data-seconds]').forEach((b) => b.classList.toggle('active', b === btn));
      timer.setDuration(m, s); save();
    });
  });

  ['timer-min', 'timer-sec'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      settings.timerMinutes = +($('#timer-min') as HTMLInputElement).value;
      settings.timerSeconds = +($('#timer-sec') as HTMLInputElement).value;
      $$<HTMLButtonElement>('.chip[data-seconds]').forEach((b) => b.classList.remove('active'));
      timer.setDuration(settings.timerMinutes, settings.timerSeconds);
      save();
    });
  });

  $('#timer-label-input').addEventListener('input', () => {
    settings.timerLabel = ($('#timer-label-input') as HTMLInputElement).value;
    $('#timer-label').textContent = settings.timerLabel;
    save();
  });

  // Chrome peek
  let peekTimer: ReturnType<typeof setTimeout>;
  const showPeek = () => { if (document.body.classList.contains('presentation')) document.body.classList.add('chrome-peek'); };
  const hidePeek = () => {
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => {
      if (!$('#mission-bar').matches(':hover') && !$('#chrome-hover-zone').matches(':hover'))
        document.body.classList.remove('chrome-peek');
    }, 300);
  };
  $('#chrome-hover-zone').addEventListener('mouseenter', showPeek);
  $('#chrome-hover-zone').addEventListener('mouseleave', hidePeek);
  $('#mission-bar').addEventListener('mouseenter', showPeek);
  $('#mission-bar').addEventListener('mouseleave', hidePeek);
  document.addEventListener('mousemove', (e) => {
    if (!document.body.classList.contains('presentation')) { document.body.classList.remove('chrome-near'); return; }
    document.body.classList.toggle('chrome-near', e.clientY >= innerHeight - 52);
    if (e.clientY >= innerHeight - 52) showPeek();
  });

  $$('.canvas').forEach((c) => c.addEventListener('dblclick', (e) => {
    if ((e.target as Element).closest('.mission-bar, .chrome-hover-zone')) return;
    setChromeHidden(!document.body.classList.contains('presentation'));
  }));

  document.addEventListener('keydown', (e) => {
    if ((e.target as Element).matches('input, textarea, [contenteditable="true"]')) return;
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); document.documentElement.requestFullscreen?.(); }
    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); setChromeHidden(!document.body.classList.contains('presentation')); }
    if (e.key === 'Escape') setChromeHidden(false);
    if (e.key === ' ' && settings.mode === 'timer') {
      e.preventDefault();
      (document.getElementById('btn-start') as HTMLButtonElement).disabled ? timer.pause() : timer.start();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) setChromeHidden(true);
  });

  $('#onboarding-go').addEventListener('click', () => {
    settings.onboardingDone = true;
    save();
    $('#onboarding').classList.remove('open');
  });

  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitText, 80); });
}

async function init() {
  settings = load();
  const urlPatch = paramsToSettings(new URLSearchParams(location.search), settings);
  Object.assign(settings, urlPatch);

  ($('#text-input') as HTMLInputElement).value = settings.text;
  $('#big-text').textContent = settings.text;
  ($('#text-scale') as HTMLInputElement).value = String(settings.textScale);
  $('#scale-value').textContent = settings.textScale + '%';
  ($('#timer-min') as HTMLInputElement).value = String(settings.timerMinutes);
  ($('#timer-sec') as HTMLInputElement).value = String(settings.timerSeconds);
  ($('#timer-label-input') as HTMLInputElement).value = settings.timerLabel;
  $('#timer-label').textContent = settings.timerLabel;
  ($('#sound-pack') as HTMLSelectElement).value = settings.soundPack;
  $('#btn-sound').setAttribute('aria-pressed', String(settings.timerSound));

  applyTheme(settings.theme, { keepCustom: settings.customColors });
  if (settings.customColors) applyDisplayColors();
  timer.setDuration(settings.timerMinutes, settings.timerSeconds);
  timer.updateBtns();
  switchMode(settings.mode);

  await initPro();
  updateLogo();
  if (settings.roomId && settings.pro) startRoomPoll();
  if (!settings.onboardingDone) $('#onboarding').classList.add('open');

  if (new URLSearchParams(location.search).get('present') === '1') {
    setChromeHidden(true);
    setTimeout(() => document.documentElement.requestFullscreen?.().catch(() => {}), 400);
  }

  updatePageMeta();
  maybeShowVisitorCta();
  bindEvents();
  document.body.classList.add('app-ready');
  requestAnimationFrame(fitText);
}

init();
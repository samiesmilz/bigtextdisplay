import './styles.css';
import './upgrade.css';
import { pushRoom } from './modules/api';

function $$<T extends Element>(s: string) {
  return [...document.querySelectorAll<T>(s)];
}

const params = new URLSearchParams(location.search);
const roomId = (params.get('room') || '').toUpperCase();

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

if (!roomId) {
  document.body.innerHTML = '<p style="padding:24px;color:#fff">Missing room code. Open from the display app.</p>';
} else {
  $('#remote-room').textContent = roomId;

  $$<HTMLButtonElement>('.remote-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.remote-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      $('#tab-text').hidden = tab.dataset.tab !== 'text';
      $('#tab-timer').hidden = tab.dataset.tab !== 'timer';
    });
  });

  async function push(state: Record<string, unknown>) {
    try {
      await pushRoom(roomId, { settings: state, ts: Date.now() });
      flash('Sent ✓');
    } catch {
      flash('Failed — is API running?');
    }
  }

  function flash(msg: string) {
    const el = $('.remote-hint');
    const orig = el.textContent;
    el.textContent = msg;
    setTimeout(() => { el.textContent = orig; }, 1500);
  }

  $('#remote-send-text').addEventListener('click', () => {
    push({
      mode: 'text',
      text: ($('#remote-text') as HTMLTextAreaElement).value,
    });
  });

  $('#remote-timer-set').addEventListener('click', () => {
    push({
      mode: 'timer',
      timerMinutes: +($('#remote-min') as HTMLInputElement).value,
      timerSeconds: +($('#remote-sec') as HTMLInputElement).value,
      timerLabel: ($('#remote-label') as HTMLInputElement).value,
    });
  });

  $('#remote-mode-text').addEventListener('click', () => {
    push({ mode: 'text' });
  });
}
'use strict';

// Start-signal ping, countdown beeps and desktop notifications.
const Alerts = (() => {
  const MUTE_KEY = 'hvai.mute';
  let ctx = null;
  let muted = localStorage.getItem(MUTE_KEY) === '1';

  // Browsers only allow audio after a user gesture; call this from click handlers.
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  function tone(freq, at, dur, vol = 0.22, type = 'sine') {
    if (muted || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  const ping = () => { tone(880, 0, 0.18); tone(1320, 0.16, 0.18); tone(1760, 0.32, 0.45); };
  const tick = () => tone(660, 0, 0.09, 0.18, 'square');
  const go = () => { tone(1046, 0, 0.12, 0.25, 'square'); tone(1568, 0.1, 0.6, 0.25, 'square'); };
  const end = () => { tone(784, 0, 0.18); tone(523, 0.18, 0.4); };

  function toggleMute() {
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    return muted;
  }

  function permission() {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  }

  async function enableNotifications() {
    unlock();
    if (permission() === 'default') await Notification.requestPermission();
    return permission();
  }

  // Only when the page is not focused; in-page overlay + sound cover the focused case.
  function notify(title, body) {
    if (permission() !== 'granted' || document.hasFocus()) return;
    try {
      new Notification(title, { body, tag: 'human-vs-ai' });
    } catch { /* some mobile browsers only allow notifications via a service worker */ }
  }

  return { unlock, ping, tick, go, end, notify, toggleMute, isMuted: () => muted, permission, enableNotifications };
})();

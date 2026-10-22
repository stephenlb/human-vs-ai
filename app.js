'use strict';

/* =====================================================================
   Human vs AI — live code race over PubNub SSE.

   Roles
     host   (server)  controls rounds, runs the AI coder, judges submissions
     player           types an answer and hits FINISHED

   One PubNub channel carries everything:
     state   host   -> all   full game state, sent on every change + heartbeat
     update  player -> all   a player's complete text (every keystroke) / presence
     update  host   -> all   the same, for the AI ("ai" id), throttled
     finish  player -> host  final answer, resent until the host acknowledges it
   ===================================================================== */

/* ============================== config ============================== */

const PN = { origin: 'h2.pubnubapi.com', subscribeKey: 'demo', publishKey: 'demo' };
const ROOM = (new URLSearchParams(location.search).get('room') || 'arena')
  .toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32) || 'arena';
const CHANNEL = `human-vs-ai.${ROOM}`;

const AI_ID = 'ai';
const COUNTDOWN_MS = 5000;
const HEARTBEAT_MS = 2000;      // host state + AI text re-broadcast
const PRESENCE_MS = 3000;       // player text re-broadcast (late joiners, lost messages)
const PRESENCE_TTL_MS = 12000;  // a player unseen this long is considered gone
const HOST_TTL_MS = 7000;
const AI_PUBLISH_MS = 50;       // AI "keystroke" rate limit
const MAX_TEXT = 20000;         // PubNub messages are capped at 32 KiB
const SPEED_WEIGHT = 0.4;       // score = correctness * (1 - W + W * speed)

const DEFAULTS = {
  challengeId: CHALLENGES[0].id,
  minutes: 5,
  aiModel: 'claude-sonnet-5-5',
  judgeModel: 'claude-sonnet-5-5',
  effort: 'low',
};

/* ============================== helpers ============================= */

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = () => Math.random().toString(36).slice(2, 10);

function fmtTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function makeStore(storage) {
  return {
    get(key, fallback = null) {
      try {
        const raw = storage.getItem(`hvai.${key}`);
        return raw === null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set: (key, value) => storage.setItem(`hvai.${key}`, JSON.stringify(value)),
    remove: key => storage.removeItem(`hvai.${key}`),
  };
}
const persist = makeStore(localStorage);   // survives browser restarts: name, API key, host settings
const session = makeStore(sessionStorage); // per tab: role, player id, draft (so two tabs can be host + player)

function showBanner(message) {
  const banner = $('banner');
  banner.textContent = message;
  banner.hidden = false;
}

/* =============================== state ============================== */

const me = { id: session.get('pid') || (session.set('pid', `p${rand()}`), session.get('pid')), name: '', role: null };

let game = {
  phase: 'lobby',        // lobby | countdown | running | ended
  roundId: 0,            // ms timestamp; monotonically increases per round
  challengeId: null,
  startsAt: 0,           // host clock, ms
  endsAt: 0,
  timeLimitMs: 0,
  endedReason: null,     // 'time' | 'stopped'
  ai: { status: 'idle', model: '' },   // idle | thinking | writing | done | error
  results: {},           // id -> { name, status: queued|judging|scored|error|dnf, elapsedMs, score, ... }
};
let stateSeen = false;
let hostSeenAt = 0;
let clockOffset = 0;     // host clock minus local clock
let goUntil = 0;         // show the GO! overlay until this local time
let lastBeepSecond = null;

const players = new Map(); // id -> { id, name, isAI, roundId, seq, text, lastSeen, order }
let joinCounter = 0;

const local = { seq: 0, finished: false, finishTimer: null };   // this player's own run
const host = { key: '', settings: null, submissions: {}, seq: 0, aiText: '', aiCtl: null, aiTimer: null };

const editor = el('textarea', 'code');
editor.spellcheck = false;
editor.maxLength = 8000;
editor.wrap = 'off';
for (const [k, v] of Object.entries({ autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off' })) editor.setAttribute(k, v);

const serverNow = () => Date.now() + clockOffset;
const isActive = () => game.phase === 'countdown' || game.phase === 'running';
const isFinished = () => local.finished || Boolean(game.results[me.id]);
const canType = () => me.role === 'player' && game.phase === 'running' && !isFinished();

/* ============================ networking ============================ */

const send = message => PubNub.publish({ channel: CHANNEL, message });

// Start the stream at "now" so late joiners don't replay (up to 100) stale messages.
async function serverTimetoken() {
  try {
    const res = await fetch(`https://${PN.origin}/time/0`);
    return String((await res.json())[0]);
  } catch {
    return String(Date.now() * 10000);
  }
}

async function connect() {
  PubNub({ ...PN, userId: me.id });
  const timetoken = await serverTimetoken();
  PubNub.subscribe({ channel: CHANNEL, timetoken, messages: onMessage });
}

function onMessage(m) {
  if (!m || typeof m !== 'object') return;
  switch (m.type) {
    case 'state':  if (me.role === 'player') onState(m); break;
    case 'update': applyUpdate(m); break;
    case 'finish': if (me.role === 'host') hostOnFinish(m); break;
  }
}

function applyUpdate(u) {
  if (typeof u.id !== 'string' || typeof u.text !== 'string') return;
  if (!Number.isFinite(u.roundId) || !Number.isFinite(u.seq)) return;
  let p = players.get(u.id);
  if (!p) {
    p = { id: u.id, name: '', isAI: u.id === AI_ID, roundId: 0, seq: -1, text: '', lastSeen: 0, order: ++joinCounter };
    players.set(u.id, p);
  }
  p.lastSeen = Date.now();
  p.name = String(u.name || p.name || 'Anonymous').slice(0, 20);
  // Concurrent publishes can arrive out of order: newest round, then highest seq wins.
  if (u.roundId < p.roundId || (u.roundId === p.roundId && u.seq < p.seq)) return;
  p.roundId = u.roundId;
  p.seq = u.seq;
  p.text = u.text.slice(0, MAX_TEXT);
  requestRender();
}

function onState(s) {
  hostSeenAt = Date.now();
  clockOffset = s.now - Date.now();
  const prev = game;
  game = {
    phase: s.phase, roundId: s.roundId, challengeId: s.challengeId,
    startsAt: s.startsAt, endsAt: s.endsAt, timeLimitMs: s.timeLimitMs, endedReason: s.endedReason,
    ai: s.ai || { status: 'idle', model: '' }, results: s.results || {},
  };
  const first = !stateSeen;
  stateSeen = true;
  gameChanged(prev, game, first);
  if (first) publishMine(false); // announce ourselves with the right roundId
}

// Side effects of a state transition (shared by host and players).
function gameChanged(prev, next, first = false) {
  const newRound = prev.roundId !== next.roundId;
  if (newRound) onNewRound();
  if (!first) {
    if (next.phase === 'countdown' && (newRound || prev.phase !== 'countdown')) {
      Alerts.ping();
      Alerts.notify('🏁 Round starting!', `A new coding round starts in ${COUNTDOWN_MS / 1000} seconds. Get to your keyboard!`);
    }
    if (next.phase === 'running' && prev.phase === 'countdown' && !newRound) {
      goUntil = Date.now() + 1200;
      Alerts.go();
      Alerts.notify('🚦 GO!', 'The AI is already writing code. Hurry!');
    }
    if (next.phase === 'ended' && prev.phase === 'running') {
      Alerts.end();
      Alerts.notify('🏁 Round over', { time: "Time's up!", complete: 'Everyone has submitted — scores are being tallied.', stopped: 'The host stopped the round.' }[next.endedReason]);
    }
  }
  requestRender();
}

function onNewRound() {
  clearInterval(local.finishTimer);
  local.finished = false;
  lastBeepSecond = null;
  goUntil = 0;
  lastScoreSig = '';
  if (me.role === 'player') {
    const draft = session.get('draft');
    editor.value = draft && draft.roundId === game.roundId ? draft.text : '';
  }
}

/* ============================ player logic ========================== */

function publishMine(bump) {
  if (bump) local.seq = Math.max(local.seq + 1, Date.now());
  const update = { type: 'update', id: me.id, name: me.name, roundId: game.roundId, seq: local.seq, text: editor.value.slice(0, MAX_TEXT) };
  applyUpdate(update);
  send(update);
  return update;
}

editor.addEventListener('input', () => {
  if (!canType()) return;
  session.set('draft', { roundId: game.roundId, text: editor.value });
  publishMine(true);   // every keystroke publishes the complete text
  requestRender();
});

editor.addEventListener('keydown', e => {
  if (e.key !== 'Tab' || e.shiftKey || editor.readOnly) return;
  e.preventDefault();
  editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
  editor.dispatchEvent(new Event('input', { bubbles: true }));
});

function finish() {
  if (!canType() || !editor.value.trim()) return;
  local.finished = true;
  const roundId = game.roundId;
  const submit = bump => send({ ...publishMine(bump), type: 'finish' });
  submit(true);
  // Publishing is fire-and-forget: keep resending until the host's state shows our result.
  clearInterval(local.finishTimer);
  local.finishTimer = setInterval(() => {
    if (game.roundId !== roundId || game.results[me.id] || game.phase !== 'running') return clearInterval(local.finishTimer);
    submit(false);
  }, 3000);
  requestRender();
}

/* ============================= host logic =========================== */

function publishState() {
  send({ type: 'state', now: Date.now(), ...game });
}

function hostCommit(patch) {
  const prev = game;
  game = { ...game, ...patch };
  publishState();
  gameChanged(prev, game);
}

function setResult(id, patch) {
  hostCommit({ results: { ...game.results, [id]: { ...game.results[id], ...patch } } });
}

function setAI(patch) {
  hostCommit({ ai: { ...game.ai, ...patch } });
}

function hostStart() {
  if (isActive() || !host.key) return;
  const s = host.settings;
  abortAI();
  host.submissions = {};
  host.aiText = '';
  const startsAt = Date.now() + COUNTDOWN_MS;
  const timeLimitMs = s.minutes * 60000;
  hostCommit({
    phase: 'countdown', roundId: Math.max(Date.now(), game.roundId + 1), challengeId: s.challengeId,
    startsAt, endsAt: startsAt + timeLimitMs, timeLimitMs, endedReason: null,
    ai: { status: 'idle', model: s.aiModel }, results: {},
  });
}

// True once the AI and every online human have a result: the round can end without waiting for the clock.
// Offline players with text are picked up by hostAutoSubmit when the round ends.
function allSubmitted() {
  const now = Date.now();
  const humans = [...players.values()].filter(p => !p.isAI && now - p.lastSeen < PRESENCE_TTL_MS);
  const aiDone = Boolean(game.results[AI_ID]) || game.ai.status === 'error';
  return humans.length > 0 && aiDone && humans.every(p => game.results[p.id]);
}

function hostTick(now) {
  if (game.phase === 'countdown' && now >= game.startsAt) {
    hostCommit({ phase: 'running' });
    hostRunAI();
  } else if (game.phase === 'running' && now >= game.endsAt) {
    hostStop('time');
  } else if (game.phase === 'running' && allSubmitted()) {
    hostStop('complete');
  }
}

function hostStop(reason) {
  if (!isActive()) return;
  const wasRunning = game.phase === 'running';
  abortAI();
  if (host.aiText) publishAI(true);
  const aiLive = game.ai.status === 'thinking' || game.ai.status === 'writing';
  hostCommit({ phase: 'ended', endedReason: reason, ai: aiLive ? { ...game.ai, status: 'idle' } : game.ai });
  if (wasRunning) hostAutoSubmit();
}

// Anyone who did not hit FINISHED is submitted as-is with no speed bonus; empty entries get a DNF.
function hostAutoSubmit() {
  const results = { ...game.results };
  const queue = [];
  for (const p of participants()) {
    if (results[p.id]) continue;
    const text = p.roundId === game.roundId ? p.text : '';
    if (text.trim()) {
      host.submissions[p.id] = text;
      results[p.id] = { name: p.name, status: 'queued', elapsedMs: game.timeLimitMs };
      queue.push(p.id);
    } else {
      results[p.id] = { name: p.name, status: 'dnf', elapsedMs: game.timeLimitMs };
    }
  }
  hostCommit({ results });
  queue.forEach(hostJudge);
}

function hostOnFinish(m) {
  if (game.phase !== 'running' || m.roundId !== game.roundId) return;
  if (typeof m.id !== 'string' || m.id === AI_ID || game.results[m.id]) return;
  applyUpdate(m);
  const p = players.get(m.id);
  if (!p || !p.text.trim()) return;
  host.submissions[m.id] = p.text;
  setResult(m.id, { name: p.name, status: 'queued', elapsedMs: Date.now() - game.startsAt });
  hostJudge(m.id);
}

async function hostJudge(id) {
  const roundId = game.roundId;
  const challenge = challengeById(game.challengeId);
  const { elapsedMs } = game.results[id];
  setResult(id, { status: 'judging', error: undefined });
  try {
    const v = await AI.judge({ key: host.key, model: host.settings.judgeModel, challenge, code: host.submissions[id] });
    if (game.roundId !== roundId) return;
    const correctness = Math.round(100 * v.passed / v.total);
    const speed = clamp(1 - elapsedMs / game.timeLimitMs, 0, 1);
    const score = Math.round(correctness * (1 - SPEED_WEIGHT + SPEED_WEIGHT * speed));
    setResult(id, { status: 'scored', score, correctness, passed: v.passed, total: v.total, feedback: v.feedback });
  } catch (e) {
    if (game.roundId !== roundId) return;
    setResult(id, { status: 'error', error: String(e.message).slice(0, 160) });
  }
}

/* ---- the AI coder: streams from Anthropic, every text chunk is a "keystroke" ---- */

function publishAI(bump) {
  if (bump) host.seq = Math.max(host.seq + 1, Date.now());
  const update = { type: 'update', id: AI_ID, name: 'Claude', roundId: game.roundId, seq: host.seq, text: host.aiText.slice(0, MAX_TEXT) };
  applyUpdate(update);
  send(update);
}

function queueAIPublish() {
  if (host.aiTimer) return;
  host.aiTimer = setTimeout(() => {
    host.aiTimer = null;
    publishAI(true);
  }, AI_PUBLISH_MS);
}

function abortAI() {
  host.aiCtl?.abort();
  host.aiCtl = null;
  clearTimeout(host.aiTimer);
  host.aiTimer = null;
}

async function hostRunAI() {
  const roundId = game.roundId;
  const ctl = new AbortController();
  host.aiCtl = ctl;
  host.aiText = '';
  setAI({ status: 'thinking', error: undefined });
  let raw = '';
  try {
    await AI.writeCode({
      key: host.key, model: host.settings.aiModel, effort: host.settings.effort || undefined,
      challenge: challengeById(game.challengeId), signal: ctl.signal,
      onText(delta) {
        raw += delta;
        if (game.ai.status !== 'writing') setAI({ status: 'writing' });
        host.aiText = AI.cleanCode(raw);
        queueAIPublish();
      },
    });
    if (ctl.signal.aborted) return;
    clearTimeout(host.aiTimer);
    host.aiTimer = null;
    publishAI(true);
    host.submissions[AI_ID] = host.aiText;
    hostCommit({
      ai: { ...game.ai, status: 'done' },
      results: { ...game.results, [AI_ID]: { name: 'Claude', status: 'queued', elapsedMs: Date.now() - game.startsAt } },
    });
    hostJudge(AI_ID);
  } catch (e) {
    if (ctl.signal.aborted || game.roundId !== roundId) return;
    if (host.aiText) publishAI(true);
    setAI({ status: 'error', error: String(e.message).slice(0, 160) });
  }
}

/* =============================== render ============================= */

let renderQueued = false;
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}

function render() {
  renderHeader();
  renderChallenge();
  renderControls();
  renderPanes();
  renderScores();
}

function participants() {
  const now = Date.now();
  const ai = players.get(AI_ID) || { id: AI_ID, name: 'Claude', isAI: true, roundId: 0, seq: -1, text: '', lastSeen: 0, order: 0 };
  const humans = [...players.values()]
    .filter(p => !p.isAI && p.id !== me.id &&
      (now - p.lastSeen < PRESENCE_TTL_MS || (p.roundId === game.roundId && (p.text || game.results[p.id]))))
    .sort((a, b) => a.order - b.order);
  const self = me.role === 'player' ? [players.get(me.id)] : [];
  return [...self, ai, ...humans];
}

function statusOf(p) {
  const r = game.results[p.id];
  if (p.isAI && game.ai.status === 'error' && (!r || r.status === 'dnf')) return { label: 'AI error', cls: 'bad' };
  if (r) {
    switch (r.status) {
      case 'queued':  return { label: 'submitted', cls: 'wait' };
      case 'judging': return { label: 'judging…', cls: 'busy' };
      case 'scored':  return { label: `${r.score} pts`, cls: 'ok' };
      case 'error':   return { label: 'judge error', cls: 'bad' };
      default:        return { label: 'no submission', cls: '' };
    }
  }
  if (p.isAI) {
    switch (game.ai.status) {
      case 'thinking': return { label: 'thinking…', cls: 'busy' };
      case 'writing':  return { label: 'typing…', cls: 'live' };
      case 'error':    return { label: 'AI error', cls: 'bad' };
      default:         return { label: game.phase === 'ended' ? 'stopped' : 'ready', cls: '' };
    }
  }
  switch (game.phase) {
    case 'running':   return { label: 'coding…', cls: 'live' };
    case 'countdown': return { label: 'ready', cls: 'wait' };
    case 'ended':     return { label: 'no submission', cls: '' };
    default:          return { label: 'in lobby', cls: '' };
  }
}

/* ---- header ---- */

const PHASE_LABEL = { lobby: 'LOBBY', countdown: 'GET READY', running: 'LIVE', ended: 'ROUND OVER' };

function renderHeader() {
  const pill = $('phase-pill');
  setText(pill, PHASE_LABEL[game.phase]);
  pill.className = `pill ${game.phase}`;

  setText($('who'), me.role === 'host' ? 'HOST' : `PLAYER ${me.name}`);

  const now = Date.now();
  const humans = [...players.values()].filter(p => !p.isAI && now - p.lastSeen < PRESENCE_TTL_MS).length;
  setText($('online'), `👥 ${humans}`);

  const status = $('host-status');
  if (me.role === 'player') {
    const online = stateSeen && now - hostSeenAt < HOST_TTL_MS;
    setText(status, online ? '' : stateSeen ? '⚠ host offline' : 'connecting…');
    status.classList.toggle('off', stateSeen && !online);
  } else {
    setText(status, '');
  }

  setText($('btn-sound'), Alerts.isMuted() ? '🔇' : '🔊');
  $('btn-alerts').hidden = Alerts.permission() !== 'default';
}

function renderClock(now) {
  let clock = '--:--';
  let title = 'Human vs AI';
  let big = null;
  let sub = '';
  if (game.phase === 'countdown') {
    const secs = Math.max(0, Math.ceil((game.startsAt - now) / 1000));
    clock = `T-${secs}`;
    title = `⏳ ${secs}s · Human vs AI`;
    big = secs > 0 ? String(secs) : 'GO!';
    sub = secs > 0 ? 'Get ready…' : '';
    if (secs > 0 && secs <= 3 && secs !== lastBeepSecond) {
      lastBeepSecond = secs;
      Alerts.tick();
    }
  } else if (game.phase === 'running') {
    clock = fmtTime(game.endsAt - now);
    title = `▶ ${clock} · Human vs AI`;
    if (Date.now() < goUntil) { big = 'GO!'; sub = 'Code!'; }
  } else if (game.phase === 'ended') {
    clock = { time: 'TIME UP', complete: 'ALL IN', stopped: 'STOPPED' }[game.endedReason] || '--:--';
    title = '🏁 Round over · Human vs AI';
  }
  setText($('clock'), clock);
  if (document.title !== title) document.title = title;
  $('overlay').hidden = big === null;
  if (big !== null) {
    setText($('overlay-big'), big);
    $('overlay-big').classList.toggle('go', big === 'GO!');
    setText($('overlay-sub'), sub);
  }
}

/* ---- challenge card ---- */

let lastChallengeKey = '';

function shownChallenge() {
  const id = me.role === 'host' && !isActive() ? host.settings.challengeId : game.challengeId;
  return challengeById(id);
}

function renderChallenge() {
  const ch = shownChallenge();
  const revealed = me.role === 'host' || game.phase === 'running' || game.phase === 'ended';
  const key = `${ch?.id}|${revealed}`;
  if (key === lastChallengeKey) return;
  lastChallengeKey = key;

  const body = $('ch-body');
  const diff = $('ch-diff');
  if (!ch) {
    setText($('ch-title'), 'Challenge');
    diff.hidden = true;
    body.replaceChildren(el('div', 'locked', 'Waiting for the host…'));
    return;
  }
  if (!revealed) {
    setText($('ch-title'), 'Challenge');
    diff.hidden = true;
    body.replaceChildren(el('div', 'locked', '🔒 Revealed at GO — for you and the AI at the same moment.'));
    return;
  }
  setText($('ch-title'), ch.title);
  diff.hidden = false;
  setText(diff, ch.difficulty);
  diff.className = `chip ${ch.difficulty.toLowerCase()}`;

  const list = el('ul');
  for (const ex of ch.examples) {
    const li = el('li', '', ex.call);
    li.append(el('span', '', `  →  ${ex.expect}`));
    list.append(li);
  }
  body.replaceChildren(
    el('p', '', ch.summary),
    el('code', 'sig', ch.signature),
    el('h3', '', 'Examples'),
    list,
    el('p', 'hint', 'Plain JavaScript. The judge also runs hidden tests, so handle edge cases.'),
  );
}

/* ---- controls ---- */

function meStatusText() {
  if (!stateSeen) return 'Connecting to the game…';
  const r = game.results[me.id];
  if (r) {
    switch (r.status) {
      case 'queued':  return 'Submitted ✓ — waiting for the judge…';
      case 'judging': return 'Claude is judging your code…';
      case 'scored':  return `Score ${r.score} — ${r.passed}/${r.total} tests passed. ${r.feedback || ''}`;
      case 'error':   return `The judge hit an error (${r.error}). The host can retry it.`;
      default:        return 'No submission this round.';
    }
  }
  if (local.finished) return 'Sending your submission…';
  switch (game.phase) {
    case 'countdown': return 'Get ready! The editor unlocks at GO.';
    case 'running':   return 'Type your solution in the editor, then hit FINISHED.';
    case 'ended':     return 'Round over.';
    default:          return 'Waiting for the host to start a round…';
  }
}

function renderControls() {
  if (me.role === 'host') {
    const active = isActive();
    $('btn-start').disabled = active || !host.key;
    setText($('btn-start'), game.phase === 'ended' ? '▶ Next round' : '▶ Start round');
    $('btn-stop').disabled = !active;
    $('sel-challenge').disabled = active;
    $('inp-minutes').disabled = active;
    const note = $('host-note');
    const err = game.ai.status === 'error' ? `AI error: ${game.ai.error}` : '';
    setText(note, err || 'Keep this tab visible while a round is running.');
    note.classList.toggle('error', Boolean(err));
    return;
  }

  const typing = canType();
  editor.readOnly = !typing;
  const placeholder = {
    lobby: 'Waiting for the host to start a round…',
    countdown: 'Get ready… typing unlocks at GO!',
    running: typing ? 'Start coding!' : '',
    ended: '',
  }[game.phase];
  if (editor.placeholder !== placeholder) editor.placeholder = placeholder;

  setText($('me-status'), meStatusText());
  const btn = $('btn-finish');
  btn.disabled = !typing || !editor.value.trim();
  const submitted = local.finished || (game.results[me.id] && game.results[me.id].status !== 'dnf');
  setText(btn, submitted ? 'SUBMITTED ✓' : 'FINISHED ✅');
}

/* ---- panes: one live view per participant ---- */

const arena = $('arena');
const panes = new Map();

// The AI's code stays hidden until the round is over. The DOM only ever holds a same-shaped
// scramble (stable per position, so it doesn't flicker as the text grows); CSS blurs it on top.
const MASK = 'abcdefghijklmnopqrstuvwxyz';
function maskCode(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out += /\s/.test(ch) ? ch : MASK[(ch.charCodeAt(0) + i * 31) % MASK.length];
  }
  return out;
}

function buildPane(p) {
  const root = el('section', 'pane');
  const name = el('strong', 'pane-name');
  const tag = el('span', 'tag');
  const meta = el('span', 'meta');
  const chip = el('span', 'status');
  const head = el('header', 'pane-head');
  head.append(name, tag, el('span', 'spacer'), meta, chip);
  const body = p.id === me.id ? editor : el('pre', 'code');
  root.append(head, body, el('div', 'lock', '🔒 Hidden until the round is over'));
  return { root, name, tag, meta, chip, body, cls: '', chipCls: '', text: null, live: null };
}

function updatePane(pane, p) {
  const isMe = p.id === me.id;
  const r = game.results[p.id];
  const text = isMe ? editor.value : (p.roundId === game.roundId ? p.text : '');
  const st = statusOf(p);
  const concealed = p.isAI && isActive();

  const cls = `pane${isMe ? ' me hero' : ''}${p.isAI ? ' ai hero' : ''}${concealed ? ' concealed' : ''}`;
  if (pane.cls !== cls) { pane.root.className = cls; pane.cls = cls; }
  setText(pane.name, p.name);
  setText(pane.tag, isMe ? 'YOU' : p.isAI ? 'AI' : '');
  const meta = [p.isAI && game.ai.model, `${text.length} chars`, r?.elapsedMs != null && fmtTime(r.elapsedMs)].filter(Boolean).join(' · ');
  setText(pane.meta, meta);
  setText(pane.chip, st.label);
  const chipCls = `status ${st.cls}`;
  if (pane.chipCls !== chipCls) { pane.chip.className = chipCls; pane.chipCls = chipCls; }

  if (isMe) return;
  const shown = concealed ? maskCode(text) : text;
  const live = game.phase === 'running' && !r && (!p.isAI || game.ai.status === 'thinking' || game.ai.status === 'writing');
  if (pane.text !== shown || pane.live !== live) {
    pane.text = shown;
    pane.live = live;
    pane.body.textContent = shown;
    if (live) pane.body.append(el('span', 'caret'));
    pane.body.scrollTop = pane.body.scrollHeight;   // follow the typing
  }
}

function renderPanes() {
  const list = participants();
  const keep = new Set(list.map(p => p.id));
  for (const [id, pane] of panes) {
    if (!keep.has(id)) { pane.root.remove(); panes.delete(id); }
  }
  list.forEach((p, i) => {
    let pane = panes.get(p.id);
    if (!pane) { pane = buildPane(p); panes.set(p.id, pane); }
    // Only move nodes that are out of place so the focused editor is never re-attached.
    if (arena.children[i] !== pane.root) arena.insertBefore(pane.root, arena.children[i] || null);
    updatePane(pane, p);
  });
}

/* ---- scoreboard ---- */

let lastScoreSig = '';

function scoreRows() {
  const items = participants().map(p => ({ p, r: game.results[p.id] }));
  const group = ({ r }) => {
    if (r?.status === 'scored') return 0;
    if (r?.status === 'queued' || r?.status === 'judging') return 1;
    if (!r && game.phase === 'running') return 2;
    return 3;
  };
  items.sort((a, b) => group(a) - group(b) || (group(a) === 0 ? b.r.score - a.r.score || a.r.elapsedMs - b.r.elapsedMs : 0));
  let rank = 0;
  return items.map(({ p, r }) => {
    const scored = r?.status === 'scored';
    return {
      id: p.id,
      name: p.name,
      tag: p.id === me.id ? 'YOU' : p.isAI ? 'AI' : '',
      cls: p.id === me.id ? 'me' : p.isAI ? 'ai' : '',
      rank: scored ? String(++rank) : '–',
      pts: scored ? String(r.score) : '',
      sub: scored ? `${r.passed}/${r.total} tests · ${fmtTime(r.elapsedMs)}` : '',
      state: scored ? '' : r?.status === 'error' ? `Judge error: ${r.error}` : statusOf(p).label,
      bad: r?.status === 'error',
      feedback: scored && !(p.isAI && isActive()) ? r.feedback : '',   // the AI's feedback would hint at its code
      retry: me.role === 'host' && r?.status === 'error',
    };
  });
}

function buildScoreRow(row) {
  const li = el('li', `score-row ${row.cls}`);
  const name = el('div', 'name', row.name);
  if (row.tag) name.append(el('span', 'tag', row.tag));
  li.append(el('div', 'rank', row.rank), name);
  if (row.pts) {
    const pts = el('div', 'pts', row.pts);
    pts.append(el('small', '', row.sub));
    li.append(pts);
  } else {
    li.append(el('div'));
    li.append(el('div', `state${row.bad ? ' bad' : ''}`, row.state));
  }
  if (row.feedback) li.append(el('div', 'fb', row.feedback));
  if (row.retry) {
    const btn = el('button', 'btn small', 'Retry judging');
    btn.dataset.retry = row.id;
    li.append(btn);
  }
  return li;
}

function verdictOf() {
  if (game.phase !== 'ended') return null;
  const results = game.results;
  const ids = Object.keys(results);
  if (!ids.length) return { text: 'Round cancelled', cls: '' };
  if (ids.some(id => results[id].status === 'queued' || results[id].status === 'judging')) return { text: '⚖️ Judging…', cls: '' };
  const ai = results[AI_ID];
  const aiScored = ai?.status === 'scored';
  const best = ids
    .filter(id => id !== AI_ID && results[id].status === 'scored')
    .map(id => results[id])
    .sort((a, b) => b.score - a.score || a.elapsedMs - b.elapsedMs)[0];
  if (!best && !aiScored) return { text: 'No scores this round', cls: '' };
  if (!best) return { text: `🤖 AI wins — ${ai.score} pts, no human scored`, cls: 'ai' };
  if (!aiScored || best.score > ai.score) return { text: `🏆 Humans win! ${best.name}: ${best.score}${aiScored ? ` vs AI ${ai.score}` : ''}`, cls: 'humans' };
  if (best.score < ai.score) return { text: `🤖 AI wins! ${ai.score} vs ${best.name} ${best.score}`, cls: 'ai' };
  return { text: `🤝 Tie at ${ai.score}`, cls: '' };
}

function renderScores() {
  const rows = scoreRows();
  const verdict = verdictOf();
  const sig = JSON.stringify([rows, verdict]);
  if (sig === lastScoreSig) return;
  lastScoreSig = sig;
  $('score-list').replaceChildren(...rows.map(buildScoreRow));
  const box = $('verdict');
  box.hidden = !verdict;
  if (verdict) {
    setText(box, verdict.text);
    box.className = `verdict ${verdict.cls}`;
  }
}

/* ============================ boot & wiring ========================= */

function tick() {
  if (me.role === 'host') hostTick(Date.now());
  renderHeader();
  renderClock(serverNow());
}

function showApp() {
  $('landing').hidden = true;
  $('app').hidden = false;
  $('host-controls').hidden = me.role !== 'host';
  $('player-controls').hidden = me.role !== 'player';
}

async function startPlayer(name) {
  me.role = 'player';
  me.name = name;
  showApp();
  applyUpdate({ id: me.id, name, roundId: 0, seq: 0, text: '' });
  await connect();
  publishMine(false);
  setInterval(() => stateSeen && publishMine(false), PRESENCE_MS);
  setInterval(tick, 200);
  requestRender();
}

function fillModels(ids) {
  $('model-list').replaceChildren(...ids.map(id => Object.assign(el('option'), { value: id })));
}

async function startHost() {
  me.role = 'host';
  me.name = '';
  host.key = persist.get('key') || '';
  host.settings = { ...DEFAULTS, ...persist.get('host', {}) };
  if (!challengeById(host.settings.challengeId)) host.settings.challengeId = DEFAULTS.challengeId;
  showApp();
  setupHostControls();

  game = {
    phase: 'lobby', roundId: Date.now(), challengeId: host.settings.challengeId,
    startsAt: 0, endsAt: 0, timeLimitMs: host.settings.minutes * 60000, endedReason: null,
    ai: { status: 'idle', model: host.settings.aiModel }, results: {},
  };
  stateSeen = true;
  AI.listModels(host.key).then(fillModels).catch(() => { /* datalist suggestions are optional */ });
  await connect();
  publishState();
  setInterval(() => {
    publishState();
    if (host.aiText && game.phase !== 'lobby') publishAI(false);
  }, HEARTBEAT_MS);
  setInterval(tick, 200);
  requestRender();
}

function setupHostControls() {
  const s = host.settings;
  const save = () => persist.set('host', s);

  const select = $('sel-challenge');
  select.replaceChildren(...CHALLENGES.map(c => Object.assign(el('option'), { value: c.id, textContent: `${c.title} · ${c.difficulty}` })));
  select.value = s.challengeId;
  select.addEventListener('change', () => { s.challengeId = select.value; save(); requestRender(); });

  const minutes = $('inp-minutes');
  minutes.value = s.minutes;
  minutes.addEventListener('change', () => {
    s.minutes = clamp(Math.round(Number(minutes.value)) || DEFAULTS.minutes, 1, 30);
    minutes.value = s.minutes;
    save();
  });

  const bind = (id, prop) => {
    const input = $(id);
    input.value = s[prop];
    input.addEventListener('change', () => { s[prop] = input.value.trim() || (prop === 'effort' ? '' : DEFAULTS[prop]); input.value = s[prop]; save(); });
  };
  bind('inp-ai-model', 'aiModel');
  bind('inp-judge-model', 'judgeModel');
  bind('sel-effort', 'effort');

  const key = $('inp-key');
  key.value = host.key;
  key.addEventListener('change', () => {
    host.key = key.value.trim();
    persist.set('key', host.key);
    if (host.key) AI.listModels(host.key).then(fillModels).catch(() => { /* optional */ });
    requestRender();
  });

  const link = $('player-link');
  link.value = `${location.origin === 'null' ? 'file://' : location.origin}${location.pathname}${ROOM === 'arena' ? '' : `?room=${ROOM}`}`;
  $('btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link.value);
    } catch {
      link.select();
      document.execCommand('copy');
    }
    setText($('btn-copy'), 'Copied!');
    setTimeout(() => setText($('btn-copy'), 'Copy'), 1500);
  });

  $('btn-start').addEventListener('click', hostStart);
  $('btn-stop').addEventListener('click', () => hostStop('stopped'));
  $('score-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-retry]');
    const id = btn?.dataset.retry;
    if (id && game.results[id]?.status === 'error' && id in host.submissions) hostJudge(id);
  });
  window.addEventListener('beforeunload', e => {
    if (isActive()) { e.preventDefault(); e.returnValue = ''; }
  });
}

function showLanding() {
  $('landing').hidden = false;
  $('app').hidden = true;
  setText($('room-name'), ROOM);
  $('player-name').value = persist.get('name') || '';
  $('host-key').value = persist.get('key') || '';

  $('player-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('player-name').value.trim().slice(0, 20);
    if (!name) return;
    persist.set('name', name);   // prefill for next visit
    session.set('name', name);   // this tab's identity survives reloads even if another tab changed the prefill
    session.set('role', 'player');
    Alerts.enableNotifications();   // inside the click: unlocks audio and asks for notification permission
    startPlayer(name);
  });

  $('host-form').addEventListener('submit', async e => {
    e.preventDefault();
    const key = $('host-key').value.trim();
    const error = $('host-error');
    const submit = e.submitter;
    error.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Checking key…';
    try {
      await AI.listModels(key);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        error.textContent = 'Anthropic rejected that API key.';
        submit.disabled = false;
        submit.textContent = 'Start hosting';
        return;
      }
      // Network/CORS hiccup on the model list: the key may still be fine, so carry on.
    }
    persist.set('key', key);
    session.set('role', 'host');
    Alerts.enableNotifications();
    startHost();
  });
}

function wireChrome() {
  $('btn-finish').addEventListener('click', finish);
  $('btn-sound').addEventListener('click', () => { Alerts.unlock(); Alerts.toggleMute(); renderHeader(); });
  $('btn-alerts').addEventListener('click', () => Alerts.enableNotifications().then(renderHeader));
  $('btn-leave').addEventListener('click', () => {
    session.remove('role');
    location.reload();
  });
}

function boot() {
  if (typeof PubNub === 'undefined') {
    showBanner('pubnub-sse is missing. Run "npm install" so node_modules/pubnub-sse/pubnub.js exists.');
    return;
  }
  wireChrome();
  const role = session.get('role');
  const name = session.get('name');
  if (role === 'player' && name) startPlayer(name);
  else if (role === 'host' && persist.get('key')) startHost();
  else showLanding();
}

boot();

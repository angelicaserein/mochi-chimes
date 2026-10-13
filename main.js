(() => {
'use strict';
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
const heroCv = $('hero'), heroCtx = heroCv ? heroCv.getContext('2d') : null;
const INK = '#2a1f4d';

/* ================= layout ================= */
const HUD_H = 62;
let W = 0, H = 0, dpr = 1, K = 1, OX = 0, OY = 0, WW = 1000, WH = 620, HOST_TOP = 0;
let pattern = null;
let SAFE = { t: 0, r: 0, b: 0, l: 0 };
function readSafe() {
  const p = document.getElementById('safeProbe');
  if (!p) return;
  const cs = window.getComputedStyle(p), f = v => Math.max(0, parseFloat(v) || 0);
  SAFE = { t: f(cs.paddingTop), r: f(cs.paddingRight), b: f(cs.paddingBottom), l: f(cs.paddingLeft) };
  const previewHostBar = new URLSearchParams(window.location.search).get('preview') === 'xhs';
  HOST_TOP = window.innerWidth < window.innerHeight && (previewHostBar || !!window.xhs) ? 72 : 0;
  const s = document.documentElement.style;
  s.setProperty('--sat', SAFE.t + 'px'); s.setProperty('--sar', SAFE.r + 'px');
  s.setProperty('--sab', SAFE.b + 'px'); s.setProperty('--sal', SAFE.l + 'px');
  s.setProperty('--host-top', HOST_TOP + 'px');
}
function pickWorld() {
  if (window.innerWidth >= window.innerHeight * 0.95) { WW = 1000; WH = 620; } else { WW = 460; WH = 900; }
}
function layout() {
  readSafe();
  pickWorld();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const topInset = SAFE.t + HOST_TOP;
  K = Math.min((W - 16 - SAFE.l - SAFE.r) / WW, (H - HUD_H - topInset - SAFE.b - 8) / WH);
  OX = SAFE.l + (W - SAFE.l - SAFE.r - WW * K) / 2;
  OY = topInset + HUD_H + ((H - topInset - SAFE.b - HUD_H) - WH * K) / 2;
  try {
    const pc = document.createElement('canvas'); pc.width = pc.height = 160;
    const p = pc.getContext('2d');
    p.fillStyle = '#2d2264'; p.fillRect(0, 0, 160, 160);
    p.fillStyle = '#34286f'; p.fillRect(0, 0, 80, 80); p.fillRect(80, 80, 80, 80);
    pattern = ctx.createPattern(pc, 'repeat');
  } catch (e) { pattern = null; }
}
window.addEventListener('resize', layout);

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ================= audio ================= */
const PENT = [0, 2, 4, 7, 9];
const BPM = 118, STEP = 60 / BPM / 4;
let AC = null, OUT = null, muted = false, T0 = 0, musicTimer = null, nextStepT = 0, stepI = 0;
let musicMode = 'off';   // off | wave | shop
let noiseBuf = null, qCount = 0;
const slotUse = {};

function noteFreq(n) {
  const i = Math.max(0, n - 1);
  const oct = Math.min(3, Math.floor(i / 5));
  return 261.63 * Math.pow(2, (PENT[i % 5] + 12 * oct) / 12);
}
function initAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      OUT = AC.createDynamicsCompressor(); OUT.connect(AC.destination);
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume();
  if (AC && !T0) T0 = AC.currentTime + 0.05;
  startMusic();
}
function toneAt(t, f, d, type, v, slide) {
  if (!AC || muted) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(OUT);
  o.start(t); o.stop(t + d + 0.03);
}
function tone(f, d = 0.12, type = 'sine', v = 0.14, slide = 0, delay = 0) {
  if (!AC) return;
  toneAt(AC.currentTime + delay, f, d, type, v, slide);
}
function noiseAt(t, d, v, hp) {
  if (!AC || muted) return;
  if (!noiseBuf) {
    noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.25), AC.sampleRate);
    const a = noiseBuf.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
  }
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = AC.createGain();
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f); f.connect(g); g.connect(OUT);
  s.start(t); s.stop(t + d + 0.02);
}
const ROOTS = [65.41, 55.0, 87.31, 98.0];   // C A F G (bass)
function playStep(i, t) {
  if (muted || musicMode === 'off') return;
  const s = i % 16, bar = Math.floor(i / 16) % 4, root = ROOTS[bar];
  const vol = musicMode === 'wave' ? 1 : 0.55;
  if (s % 4 === 0) toneAt(t, 150, 0.14, 'sine', 0.15 * vol, -100);
  if (s === 4 || s === 12) noiseAt(t, 0.09, 0.05 * vol, 1800);
  if (s % 2 === 0 && s % 4 !== 0) noiseAt(t, 0.03, 0.022 * vol, 6000);
  if (s === 0 || s === 6 || s === 8 || s === 14) toneAt(t, root, 0.2, 'triangle', 0.1 * vol, 0);
  if (musicMode === 'wave' && (s === 3 || s === 11)) {
    toneAt(t, 523.25 * Math.pow(2, PENT[(bar * 2 + (s > 8 ? 1 : 0)) % 5] / 12), 0.12, 'sine', 0.03, 0);
  }
}
function schedule() {
  if (!AC) return;
  if (nextStepT < AC.currentTime - 0.1) {       // tab was throttled: resync
    const k = Math.ceil((AC.currentTime - T0) / STEP);
    stepI = k; nextStepT = T0 + k * STEP;
  }
  while (nextStepT < AC.currentTime + 0.2) { playStep(stepI, nextStepT); nextStepT += STEP; stepI++; }
}
function startMusic() {
  if (!AC || musicTimer) return;
  const k = Math.ceil((AC.currentTime - T0) / STEP);
  stepI = k; nextStepT = T0 + k * STEP;
  musicTimer = setInterval(schedule, 40);
}
// sound effects land on the next 16th note so the battle stays in rhythm
function qPlay(kind, cap, fn) {
  if (!AC || muted) return;
  const now = AC.currentTime;
  let k = Math.ceil((now - T0) / STEP - 0.02);
  let t = T0 + k * STEP;
  if (t < now) { k++; t += STEP; }
  const key = k + kind;
  if ((slotUse[key] || 0) >= cap) return;
  slotUse[key] = (slotUse[key] || 0) + 1;
  if (++qCount % 300 === 0) for (const kk in slotUse) if (parseInt(kk, 10) < k - 6) delete slotUse[kk];
  fn(t, k);
}
// one voice per weapon
const SHOT = {
  pulse(t) {                                  // laser "pew"
    toneAt(t, 1250, 0.09, 'square', 0.03, -900);
    toneAt(t, 640, 0.07, 'triangle', 0.05, -300);
  },
  shotgun(t) {                                // low thump + noisy blast
    toneAt(t, 125, 0.22, 'sine', 0.2, -80);
    noiseAt(t, 0.17, 0.12, 700);
    noiseAt(t + 0.035, 0.22, 0.05, 250);
  },
  chime(t, k) {                               // bell
    const f = noteFreq(8 + (k % 5));
    toneAt(t, f, 0.3, 'sine', 0.07, 0); toneAt(t, f * 2, 0.2, 'sine', 0.03, 0); toneAt(t, f * 3.01, 0.12, 'sine', 0.018, 0);
  },
  boomer(t) {                                 // airy whistle gliding up
    toneAt(t, 420, 0.3, 'sine', 0.04, 300); toneAt(t, 429, 0.3, 'sine', 0.03, 300);
    noiseAt(t, 0.18, 0.018, 3000);
  }
};
const sfx = {
  shot(type) {
    const fn = SHOT[type];
    if (fn) qPlay('shot' + type, 1, fn);
  },
  bounce(n) {
    qPlay('bounce', 2, t => {
      const f = noteFreq(Math.min(15, 4 + 2 * n));
      toneAt(t, f, 0.12, 'sine', 0.08, 0); toneAt(t, f * 2, 0.07, 'triangle', 0.025, 0);
    });
  },
  bonk() { qPlay('bonk', 2, t => { toneAt(t, 210, 0.11, 'sine', 0.11, -120); noiseAt(t, 0.04, 0.05, 1500); }); },
  whistleBack() { qPlay('wb', 1, t => { toneAt(t, 720, 0.26, 'sine', 0.035, -460); toneAt(t, 730, 0.26, 'sine', 0.025, -460); }); },
  catchB() { qPlay('cb', 1, t => toneAt(t, 600, 0.07, 'triangle', 0.06, 220)); },
  kill(n) {
    qPlay('kill', 2, t => {
      const f = noteFreq(n);
      toneAt(t, f, 0.14, 'triangle', 0.13, 160);
      toneAt(t, f * 2, 0.1, 'sine', 0.045, 0);
    });
  },
  gem(n) { qPlay('gem', 1, t => toneAt(t, noteFreq(10 + (n % 5)) * 2, 0.05, 'sine', 0.028, 0)); },
  boom() { tone(130, 0.2, 'sine', 0.1, -70); },
  hurt() { tone(150, 0.2, 'sawtooth', 0.08, -60); },
  bonus() { [660, 880, 1100].forEach((f, i) => tone(f, 0.12, 'sine', 0.1, 0, i * 0.06)); },
  hyper() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, 0, i * 0.06)); },
  clear() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, 0, i * 0.08)); },
  fail()  { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.09, 0, i * 0.18)); },
  warn()  { tone(300, 0.1, 'square', 0.04, 200); }
};
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

/* ================= data ================= */
const WAVES = 8, WAVE_DUR = 25;
const WDEF = {
  pulse:   { name: '脉冲爆弹', tag: '弹射', mech: '子弹可在墙壁间弹跳，每次弹跳伤害提高 25%。',
             lv: ['每发子弹可弹跳 2 次', '可弹跳 3 次，并穿透 1 个敌人'],
             cd: 0.36, dmg: 9, spd: 600, col: '#7be8ff', price: 12 },
  shotgun: { name: '彩纸霰弹枪', tag: '保龄球', mech: '击中的敌人会像保龄球一样飞出，撞倒其他敌人。',
             lv: ['被击飞的敌人撞击后会炸成彩纸', '击飞力度翻倍'],
             cd: 0.85, dmg: 6, pellets: 5, spread: 0.55, spd: 520, range: 0.42, col: '#ffe27a', price: 16 },
  chime:   { name: '钟声炸弹', tag: '连锁', mech: '爆炸击败敌人后会引发新的爆炸，连锁不断增强！',
             lv: ['爆炸范围更大、威力更强', '返场：连锁中的首次击败会引发双重爆炸'],
             cd: 1.15, dmg: 16, spd: 430, R: 64, col: '#ff8fc7', price: 22 },
  boomer:  { name: '回旋镖', tag: '磁力', mech: '飞出时会把敌人吸到一起，回程时也能造成伤害。',
             lv: ['牵引力更强，范围更广', '飞到最远处悬停，并大幅增强牵引力'],
             cd: 1.0, dmg: 11, spd: 380, range: 240, col: '#8ff0a4', price: 18 }
};
const DMGM = [1, 1.55, 2.3], CDM = [1, 0.9, 0.8], RM = [1, 1.15, 1.3];
const ET = {
  blob:    { hp: 12, spd: 64,  r: 13, dmg: 5, val: 1, col: '#ff9ccf' },
  zippy:   { hp: 7,  spd: 125, r: 10, dmg: 4, val: 1, col: '#7be8ff' },
  chunk:   { hp: 55, spd: 44,  r: 21, dmg: 9, val: 3, col: '#8ff0a4' },
  spitter: { hp: 20, spd: 52,  r: 13, dmg: 6, val: 2, col: '#ffe27a' },
  king:    { hp: 2200, spd: 46, r: 56, dmg: 12, val: 30, col: '#c9a0ff' }
};
const UPS = [
  { id: 'dmg',   name: '甜蜜火力', desc: '伤害提高 12%',            cost: 10, icon: 'star',   apply: () => { stats.dmg *= 1.12; } },
  { id: 'rate',  name: '疾速爪爪', desc: '射速提高 12%',            cost: 10, icon: 'bolt',   apply: () => { stats.rate *= 1.12; } },
  { id: 'hp',    name: '暖心守护', desc: '最大生命值提高 20',        cost: 9,  icon: 'heart',  apply: () => { stats.maxHp += 20; P.hp += 20; } },
  { id: 'spd',   name: '蓬松靴子', desc: '移动速度提高 8%',          cost: 8,  icon: 'boot',   apply: () => { stats.speed *= 1.08; } },
  { id: 'blast', name: '爆炸升级', desc: '爆炸范围扩大 20%',         cost: 11, icon: 'ring',   req: 'chime', apply: () => { stats.blast *= 1.2; } },
  { id: 'chain', name: '回声',     desc: '连锁爆炸的伤害和范围提高', cost: 12, icon: 'echo',   req: 'chime', apply: () => { stats.chain += 1; } },
  { id: 'regen', name: '茶歇时光', desc: '每秒恢复 0.8 点生命值',    cost: 10, icon: 'cup',    apply: () => { stats.regen += 0.8; } },
  { id: 'heal',  name: '能量点心', desc: '恢复 40 点生命值',         cost: 6,  icon: 'plus',   apply: () => { P.hp = Math.min(stats.maxHp, P.hp + 40); } },
  { id: 'bank',  name: '弹墙一击', desc: '脉冲爆弹：额外弹跳 1 次', cost: 11, icon: 'bounce', req: 'pulse',   apply: () => { stats.bounce += 1; } },
  { id: 'heavy', name: '重击手',   desc: '彩纸霰弹枪：击飞力度提高 40%', cost: 11, icon: 'bowl', req: 'shotgun', apply: () => { stats.launch *= 1.4; } },
  { id: 'grav',  name: '引力增强', desc: '回旋镖：牵引力提高 40%',  cost: 11, icon: 'swirl',  req: 'boomer',  apply: () => { stats.pull *= 1.4; } },
  { id: 'mag',   name: '磁力增强', desc: '拾取范围扩大 50%',        cost: 7,  icon: 'magnet', apply: () => { stats.magnet *= 1.5; } }
];

/* ================= state ================= */
// phase: menu | pick | wave | clearing | shop | end
let phase = 'menu', paused = false, tShift = 0;
let wave = 0, waveT = 0, waveDur = WAVE_DUR, spawnAcc = 0, swarmDone = false, clearT = 0, finalWin = false, collectAll = false;
let mats = 0, kills = 0, chainN = 0, chainT = 0, chainBest = 0, streak = 0, streakT = 0, gemStreak = 0;
let shake = 0, hitstop = 0, banner = null, rerolls = 0, shopItems = [], bestScore = 0, runScore = 0;
let enemies = [], bullets = [], ebullets = [], blasts = [], pending = [], gems = [], parts = [], markers = [];
const P = { x: 0, y: 0, r: 13, hp: 100, inv: 0, aim: -Math.PI / 2, hurtT: 0, walk: 0, mv: 0 };
let stats, weapons = [], demos = [], pbState = null, pops = [], rings = [], gemBump = 0;
const DBG = { bounce: 0, launch: 0, bowl: 0, slam: 0, pull: 0, encore: 0 };
const I = { keys: {}, mwx: 500, mwy: 200, aimSrc: 'mouse', mv: null, av: null, mvId: null, avId: null, touch: false, bot: null, botAim: null };
const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const BEST_KEY = 'mochichimes_best', STORAGE_MIN_CLIENT_VERSION = 9460;
function readBuildVersion(lo) { const env = lo && lo.miniToolEnv; return Number(env && env.buildVersion) || 0; }
async function getBuildVersion() {
  const xhs = window.xhs, sync = readBuildVersion(xhs && xhs.launchOptions);
  if (sync) return sync;
  const mt = xhs && xhs.miniTool;
  if (!mt || typeof mt.getLaunchOptions !== 'function') return 0;
  try { return readBuildVersion(await mt.getLaunchOptions()); } catch (e) { return 0; }
}
async function storageTool() {
  const mt = window.xhs && window.xhs.miniTool;
  if (!mt || typeof mt.setStorage !== 'function' || typeof mt.getStorage !== 'function') return null;
  const v = await getBuildVersion();
  return Math.floor(v / 1000) >= STORAGE_MIN_CLIENT_VERSION ? mt : null;
}
async function loadBest() {
  const mt = await storageTool();
  if (!mt) return;
  try {
    const r = await mt.getStorage({ key: BEST_KEY });
    const d = r && r.data ? JSON.parse(r.data) : null;
    if (d && d.score > bestScore) {
      bestScore = d.score;
      if (phase === 'menu') $('bestLine').textContent = '最高分：' + bestScore;
    }
  } catch (e) {}
}
function saveBest() {
  const data = JSON.stringify({ score: bestScore });
  try { localStorage.setItem(BEST_KEY, data); } catch (e) {}
  storageTool().then(mt => { if (mt) return mt.setStorage({ key: BEST_KEY, data }); }).catch(() => {});
}
try { bestScore = JSON.parse(localStorage.getItem(BEST_KEY) || '{}').score || 0; } catch (e) {}
loadBest();

function resetStats() { stats = { dmg: 1, rate: 1, speed: 1, blast: 1, chain: 0, regen: 0.4, magnet: 1, maxHp: 100, bounce: 0, launch: 1, pull: 1 }; }
resetStats();

/* ================= drawing helpers ================= */
function rrC(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function circ(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); }
function ell(c, x, y, rx, ry, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.283); c.fill(); }
function starPath(c, r1, r2, n) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1;
    c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
}
function drawIcon(c, kind, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s / 16, s / 16);
  c.lineCap = 'round'; c.lineJoin = 'round';
  switch (kind) {
    case 'pulse':
      c.fillStyle = '#7be8ff'; rrC(c, -13, -6, 20, 12, 5); c.fill();
      c.fillStyle = '#fff'; rrC(c, 5, -3.5, 9, 7, 3); c.fill();
      circ(c, -6, 0, 2.2, '#2a1f4d'); break;
    case 'shotgun':
      c.fillStyle = '#ffe27a'; rrC(c, -13, -7, 22, 14, 6); c.fill();
      circ(c, 12, -4, 2.4, '#fff'); circ(c, 13, 0, 2.4, '#fff'); circ(c, 12, 4, 2.4, '#fff');
      circ(c, -5, 0, 2.2, '#2a1f4d'); break;
    case 'chime':
      circ(c, -1, 2, 9, '#ff8fc7'); circ(c, -4, -1, 2.6, 'rgba(255,255,255,.75)');
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(3, -5); c.quadraticCurveTo(7, -9, 10, -7); c.stroke();
      c.save(); c.translate(11, -9); c.fillStyle = '#ffe27a'; starPath(c, 4, 1.8, 4); c.fill(); c.restore(); break;
    case 'boomer':
      c.strokeStyle = '#8ff0a4'; c.lineWidth = 6; c.beginPath(); c.arc(-2, 2, 9, -Math.PI * 0.95, -Math.PI * 0.05); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.beginPath(); c.arc(-2, 2, 9, -Math.PI * 0.8, -Math.PI * 0.3); c.stroke(); break;
    case 'star': c.fillStyle = '#ffe27a'; starPath(c, 12, 5.2, 5); c.fill(); break;
    case 'bolt':
      c.fillStyle = '#7be8ff'; c.beginPath(); c.moveTo(3, -13); c.lineTo(-8, 2); c.lineTo(-1, 2); c.lineTo(-4, 13); c.lineTo(8, -3); c.lineTo(1, -3); c.closePath(); c.fill(); break;
    case 'heart':
      c.fillStyle = '#ff7aa8'; c.beginPath(); c.moveTo(0, 11); c.bezierCurveTo(-17, -2, -8, -14, 0, -5); c.bezierCurveTo(8, -14, 17, -2, 0, 11); c.fill(); break;
    case 'boot':
      c.fillStyle = '#ffb36b'; rrC(c, -8, -11, 10, 16, 4); c.fill(); rrC(c, -8, 1, 20, 9, 4); c.fill();
      c.fillStyle = '#fff'; rrC(c, -8, 7, 20, 3, 1.5); c.fill(); break;
    case 'ring':
      c.strokeStyle = '#ff8fc7'; c.lineWidth = 3.5; c.beginPath(); c.arc(0, 0, 10, 0, 6.283); c.stroke(); circ(c, 0, 0, 3.4, '#fff'); break;
    case 'echo':
      c.strokeStyle = '#c9a0ff'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 4, 0, 6.283); c.stroke();
      c.beginPath(); c.arc(0, 0, 9, -1, 1); c.stroke(); c.beginPath(); c.arc(0, 0, 9, Math.PI - 1, Math.PI + 1); c.stroke(); break;
    case 'plus':
      c.fillStyle = '#8ff0a4'; rrC(c, -4, -11, 8, 22, 3); c.fill(); rrC(c, -11, -4, 22, 8, 3); c.fill(); break;
    case 'cup':
      c.fillStyle = '#fff'; rrC(c, -9, -5, 16, 14, 5); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 2.6; c.beginPath(); c.arc(8, 2, 4, -1.4, 1.4); c.stroke();
      c.fillStyle = '#ffb36b'; rrC(c, -7, -3, 12, 4, 2); c.fill(); break;
    case 'magnet':
      c.strokeStyle = '#ff7a7a'; c.lineWidth = 5; c.beginPath(); c.moveTo(-8, 8); c.lineTo(-8, -1); c.arc(0, -1, 8, Math.PI, 0); c.lineTo(8, 8); c.stroke();
      c.fillStyle = '#fff'; rrC(c, -11, 6, 6, 5, 2); c.fill(); rrC(c, 5, 6, 6, 5, 2); c.fill(); break;
    case 'bounce':
      c.strokeStyle = '#7be8ff'; c.lineWidth = 3.6; c.beginPath(); c.moveTo(-12, 8); c.lineTo(-4, -8); c.lineTo(4, 8); c.lineTo(11, -4); c.stroke();
      circ(c, 11, -4, 3.2, '#fff'); break;
    case 'bowl':
      circ(c, -2, 1, 9, '#ffb36b'); circ(c, -5, -2, 1.7, '#2a1f4d'); circ(c, 0, -3, 1.7, '#2a1f4d'); circ(c, -3, 3, 1.7, '#2a1f4d');
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(9, -5); c.lineTo(14, -5); c.moveTo(10, 2); c.lineTo(15, 2); c.stroke(); break;
    case 'swirl':
      c.strokeStyle = '#8ff0a4'; c.lineWidth = 3; c.beginPath();
      for (let a = 0; a < 12; a += 0.35) { const r = 1 + a * 0.8; c[a ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
      c.stroke(); break;
    case 'gem':
      c.fillStyle = '#ffe27a'; starPath(c, 12, 5, 4); c.fill(); break;
  }
  c.restore();
}

/* ================= input ================= */
function setMouse(e) {
  const r = cv.getBoundingClientRect();
  I.mwx = (e.clientX - r.left - OX) / K; I.mwy = (e.clientY - r.top - OY) / K;
}
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (paused) return;
  initAudio();
  if (e.pointerType === 'mouse') { I.aimSrc = 'mouse'; setMouse(e); return; }
  I.touch = true;
  const x = e.clientX, y = e.clientY;
  if (x < W / 2 && I.mvId === null) { I.mvId = e.pointerId; I.mv = { ox: x, oy: y, cx: x, cy: y }; }
  else if (x >= W / 2 && I.avId === null) { I.avId = e.pointerId; I.av = { ox: x, oy: y, cx: x, cy: y }; I.aimSrc = 'touch'; }
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { I.aimSrc = 'mouse'; setMouse(e); return; }
  if (e.pointerId === I.mvId && I.mv) { I.mv.cx = e.clientX; I.mv.cy = e.clientY; }
  if (e.pointerId === I.avId && I.av) { I.av.cx = e.clientX; I.av.cy = e.clientY; }
});
function releasePtr(e) {
  if (e.pointerId === I.mvId) { I.mvId = null; I.mv = null; }
  if (e.pointerId === I.avId) { I.avId = null; I.av = null; }
}
cv.addEventListener('pointerup', releasePtr);
cv.addEventListener('pointercancel', releasePtr);
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  I.keys[k] = true;
  if (k.startsWith('arrow')) { I.aimSrc = 'keys'; e.preventDefault(); }
  if (k === ' ') e.preventDefault();
  if ((k === 'escape' || k === 'p') && (phase === 'wave')) togglePause();
  initAudio();
});
window.addEventListener('keyup', e => { I.keys[e.key.toLowerCase()] = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && phase === 'wave' && !paused) togglePause(); });

function moveVec() {
  if (I.bot) return I.bot;
  let x = 0, y = 0;
  const ks = I.keys;
  x = (ks.d ? 1 : 0) - (ks.a ? 1 : 0); y = (ks.s ? 1 : 0) - (ks.w ? 1 : 0);
  if (I.mv) {
    const dx = I.mv.cx - I.mv.ox, dy = I.mv.cy - I.mv.oy, d = Math.hypot(dx, dy);
    if (d > 8) { const m = Math.min(1, d / 50); x = dx / d * m; y = dy / d * m; }
  }
  const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  return [x, y];
}
function updateAim() {
  if (I.botAim !== null) { P.aim = I.botAim; return; }
  if (I.aimSrc === 'touch' && I.av) {
    const dx = I.av.cx - I.av.ox, dy = I.av.cy - I.av.oy;
    if (Math.hypot(dx, dy) > 8) P.aim = Math.atan2(dy, dx);
  } else if (I.aimSrc === 'keys') {
    const ks = I.keys, dx = (ks.arrowright ? 1 : 0) - (ks.arrowleft ? 1 : 0), dy = (ks.arrowdown ? 1 : 0) - (ks.arrowup ? 1 : 0);
    if (dx || dy) P.aim = Math.atan2(dy, dx);
  } else if (I.aimSrc === 'mouse') {
    P.aim = Math.atan2(I.mwy - P.y, I.mwx - P.x);
  }
}

/* ================= flow ================= */
function show(id, on) { $(id).classList.toggle('show', on); }
function hideAll() { ['menu', 'pick', 'shop', 'end', 'pause'].forEach(i => show(i, false)); }

function showMenu() {
  phase = 'menu'; musicMode = 'off'; hideAll(); show('menu', true);
  $('bestLine').textContent = bestScore ? '最高分：' + bestScore : '';
}
function startRun() {
  initAudio();
  pickWorld(); layout();
  resetStats(); weapons = [];
  mats = 0; kills = 0; chainBest = 0; runScore = 0; wave = 0;
  P.hp = stats.maxHp; P.x = WW / 2; P.y = WH / 2; P.inv = 0;
  enemies = []; bullets = []; ebullets = []; blasts = []; pending = []; gems = []; parts = []; markers = [];
  phase = 'pick'; musicMode = 'shop'; hideAll(); show('pick', true);
  const box = $('pickCards'); box.innerHTML = ''; demos = [];
  Object.keys(WDEF).forEach(t => {
    const b = weaponCard(t, {});
    b.addEventListener('click', () => pickStarter(t));
    box.appendChild(b);
  });
}
function weaponCard(t, o) {
  const d = WDEF[t], b = document.createElement('button');
  b.className = 'card wide' + (o.cls || '');
  b.style.setProperty('--c', d.col);
  b.innerHTML = '<canvas class="demo" width="280" height="128"></canvas><h3>' + d.name + '</h3><div class="mtag">' + d.tag + '</div>' +
    '<p class="mech">' + (o.text || d.mech) + '</p>' + (o.cost !== undefined ? '<div class="cost">◆ ' + o.cost + '</div>' : '');
  const cvd = b.querySelector('canvas');
  demos.push({ c: cvd.getContext('2d'), el: cvd, type: t });
  return b;
}
function pickStarter(t) {
  initAudio();
  weapons = [{ type: t, lvl: 1, cd: 0 }];
  startWave(1);
}

const spawnRate = w => 1.12 * (1.35 + 0.22 * w + 0.075 * w * w);
function pickType(w) {
  const r = Math.random();
  if (w === 1) return 'blob';
  if (w === 2) return r < 0.7 ? 'blob' : 'zippy';
  if (w === 3) return r < 0.5 ? 'blob' : r < 0.8 ? 'zippy' : 'chunk';
  return r < 0.38 ? 'blob' : r < 0.6 ? 'zippy' : r < 0.78 ? 'chunk' : 'spitter';
}
function makeEnemy(type, x, y) {
  const d = ET[type], hs = type === 'king' ? 1 : 1 + 0.27 * (wave - 1);
  return { type, x, y, r: d.r, hp: d.hp * hs, mhp: d.hp * hs, spd: d.spd * (type === 'king' ? 1 : 1 + 0.02 * (wave - 1)),
    dmg: d.dmg * (1 + 0.09 * (wave - 1)), val: d.val, col: d.col, kx: 0, ky: 0, flash: 0, dead: false,
    lau: false, ldmg: 0, ld: 0, burst: false, hits: null,
    ph: Math.random() * 6, bcd: 0, t: 0, fireT: rnd(1, 2.4), st: 'walk', stT: 2, aimx: 0, aimy: 1, dash: false, step: 0 };
}

function startWave(n) {
  wave = n; waveT = 0; waveDur = n === WAVES ? Infinity : WAVE_DUR; spawnAcc = 0; swarmDone = false; collectAll = false; finalWin = false;
  enemies = []; bullets = []; ebullets = []; blasts = []; pending = []; gems = []; markers = []; parts = [];
  chainN = 0; chainT = 0; streak = 0; streakT = 0; pops = []; rings = [];
  P.x = WW / 2; P.y = WH / 2; P.inv = 0.8;
  if (n > 1) P.hp = Math.min(stats.maxHp, P.hp + 25);
  weapons.forEach(w => { w.cd = 0.3; });
  if (n === WAVES) markers.push({ x: WW / 2, y: WH * 0.2, type: 'king', t: 1.4 });
  banner = { text: n === WAVES ? '首领来袭' : '第 ' + n + ' 波', color: '#fff', t: 1.2 };
  phase = 'wave'; musicMode = 'wave'; hideAll();
}
function poofAll() {
  for (const e of enemies) if (!e.dead) { dropGem(e.x, e.y, e.val); confetti(e.x, e.y, e.col, 8, 160); }
  enemies = []; ebullets = []; bullets = []; markers = []; pending = []; blasts = [];
  collectAll = true;
}
function endWave() {
  phase = 'clearing'; clearT = 1.5; poofAll();
  banner = { text: '本波完成！', color: '#ffe27a', t: 1.3 };
  sfx.clear();
}
function winRun() {
  finalWin = true; phase = 'clearing'; clearT = 2.2; poofAll();
  banner = { text: '胜利！', color: '#ffe27a', t: 2 };
  sfx.clear(); sfx.hyper(); buzz(80);
}
function die() {
  if (phase === 'end') return;
  phase = 'end'; musicMode = 'off'; sfx.fail();
  showEnd(false);
}
function showEnd(win) {
  const score = kills * 10 + chainBest * 25 + (win ? 1500 : 0) + (wave - 1) * 100;
  runScore = score;
  if (score > bestScore) bestScore = score;
  saveBest();
  $('endTitle').textContent = win ? '太棒了！' : '哎呀！';
  $('endSub').textContent = win ? '果冻之王被击败了！真是一场精彩的交响乐！' : '你在第 ' + wave + ' 波倒下了。每局体验都不同，换把武器再试试吧！';
  $('eWave').textContent = wave; $('eKills').textContent = kills; $('eChain').textContent = chainBest;
  $('eScore').textContent = score; $('eBest').textContent = bestScore;
  hideAll(); show('end', true);
}

/* ================= shop ================= */
function canOffer(t) { return weapons.some(w => w.type === t && w.lvl < 3) || weapons.length < 6; }
function weaponItem(t) {
  const d = WDEF[t], own = weapons.find(w => w.type === t && w.lvl < 3);
  const base = d.price * (1 + 0.3 * (wave - 1));
  if (own) {
    return { id: 'w' + t, kind: 'weapon', icon: t, wt: t, name: d.name, desc: '升级',
      text: '<b>' + own.lvl + ' 级 → ' + (own.lvl + 1) + ' 级</b><br>' + d.lv[own.lvl - 1] + '<br><span style="opacity:.7">伤害更高，射速更快</span>',
      cost: Math.round(base * (0.9 + 0.7 * own.lvl)), apply: () => { own.lvl++; } };
  }
  return { id: 'w' + t, kind: 'weapon', icon: t, wt: t, name: d.name, desc: '新武器', text: d.mech, cost: Math.round(base),
    apply: () => { weapons.push({ type: t, lvl: 1, cd: 0.3 }); } };
}
function upItem(u) {
  return { id: u.id, kind: 'up', icon: u.icon, name: u.name, desc: u.desc, cost: Math.round(u.cost * (1 + 0.24 * (wave - 1))), apply: u.apply };
}
function rollShop() {
  const items = [], used = new Set();
  let guard = 0;
  while (items.length < 3 && guard++ < 60) {
    let it;
    if (Math.random() < 0.45) {
      const types = Object.keys(WDEF).filter(canOffer);
      if (!types.length) continue;
      it = weaponItem(pick(types));
    } else it = upItem(pick(UPS.filter(u => !u.req || weapons.some(w => w.type === u.req))));
    if (used.has(it.id)) continue;
    used.add(it.id); items.push(it);
  }
  return items;
}
function openShop() {
  phase = 'shop'; musicMode = 'shop'; rerolls = 0;
  shopItems = rollShop();
  hideAll(); show('shop', true);
  renderShop();
}
function renderShop() {
  $('shopTitle').textContent = '第 ' + wave + ' 波完成！';
  $('shopGems').textContent = '◆ ' + mats;
  const box = $('shopCards'); box.innerHTML = '';
  demos = [];
  shopItems.forEach((it, i) => {
    const cls = (it.sold ? ' sold' : '') + (!it.sold && mats < it.cost ? ' off' : '');
    let b;
    if (it.wt) b = weaponCard(it.wt, { cls, text: it.text, cost: it.cost });
    else {
      b = document.createElement('button');
      b.className = 'card' + cls;
      b.innerHTML = '<canvas width="64" height="64"></canvas><h3>' + it.name + '</h3><p>' + it.desc + '</p><div class="cost">◆ ' + it.cost + '</div>';
      drawIcon(b.querySelector('canvas').getContext('2d'), it.icon, 32, 32, 26);
    }
    b.addEventListener('click', () => buy(i));
    box.appendChild(b);
  });
  const rc = 3 + 2 * rerolls + (wave - 1);
  $('rerollBtn').textContent = '刷新（◆ ' + rc + '）';
  $('rerollBtn').disabled = mats < rc;
  const allSold = shopItems.every(it => it.sold), sh = $('soldHint');
  sh.style.display = allSold ? 'block' : 'none';
  sh.textContent = allSold ? (mats >= rc ? '商品已售罄！点击“刷新”获取新商品 ↓' : '商品已售罄，◆ 不足，无法刷新') : '';
  $('rerollBtn').classList.toggle('hot', allSold && mats >= rc);
  const own = $('owned'); own.innerHTML = '';
  weapons.forEach(w => {
    const d = document.createElement('div'); d.className = 'own';
    d.innerHTML = '<canvas width="56" height="56"></canvas><b>' + w.lvl + '</b>';
    drawIcon(d.querySelector('canvas').getContext('2d'), w.type, 28, 28, 22);
    own.appendChild(d);
  });
  $('shopStats').textContent = '生命值 ' + Math.ceil(P.hp) + '/' + stats.maxHp + '  ·  伤害 ×' + stats.dmg.toFixed(2) + '  ·  射速 ×' + stats.rate.toFixed(2);
  $('goBtn').textContent = wave + 1 === WAVES ? '迎战首领！' : '开始第 ' + (wave + 1) + ' 波';
}
function buy(i) {
  const it = shopItems[i];
  if (!it || it.sold || mats < it.cost) return;
  mats -= it.cost; it.sold = true; it.apply(); sfx.bonus();
  renderShop();
}
function reroll() {
  const rc = 3 + 2 * rerolls + (wave - 1);
  if (mats < rc) return;
  mats -= rc; rerolls++; shopItems = rollShop(); sfx.warn(); renderShop();
}

/* ================= combat ================= */
function confetti(x, y, col, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = rnd(sp * 0.3, sp);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.35, 0.75), max: 0.75, col, r: rnd(2, 4.4), rot: rnd(0, 6) });
  }
}
function dropGem(x, y, val) { gems.push({ x, y, vx: rnd(-70, 70), vy: rnd(-70, 70), val, t: 0, dead: false }); }

function hurt(d) {
  if (P.inv > 0 || phase !== 'wave') return;
  P.hp -= d; P.inv = 0.45; P.hurtT = 0.25; shake = Math.max(shake, 5);
  sfx.hurt(); buzz(20);
  confetti(P.x, P.y, '#ff7a7a', 8, 150);
  if (P.hp <= 0) { P.hp = 0; die(); }
}

function damageEnemy(e, dmg, info) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 0.1;
  if (dmg >= 1) {
    const pr = e.popRef;
    if (pr && pr.t < 0.15) { pr.val += dmg; pr.txt = String(Math.round(pr.val)); pr.t = 0.04; pr.sz = clamp(12 + pr.val * 0.4, 13, 30); }
    else if (pops.length < 45) {
      const q = { x: e.x + rnd(-8, 8), y: e.y - e.r - 2, val: dmg, txt: String(Math.round(dmg)), t: 0, life: 0.7, col: info && info.blast ? '#ffe27a' : '#ffffff', sz: clamp(12 + dmg * 0.4, 13, 30) };
      pops.push(q); e.popRef = q;
    }
  }
  if (info && info.kx !== undefined && e.type !== 'king') { e.kx += info.kx; e.ky += info.ky; }
  if (e.hp <= 0) killEnemy(e, info);
}
function killEnemy(e, info) {
  e.dead = true; kills++;
  streak++; streakT = 0.7;
  let n = streak;
  if (info && info.blast) {
    chainN++; chainT = 0.9; if (chainN > chainBest) chainBest = chainN;
    if (chainN === 5) banner = { text: '漂亮！', color: '#8ff0a4', t: 0.8 };
    if (chainN === 10) { banner = { text: '超长连锁！', color: '#ffffff', t: 1.1 }; sfx.hyper(); buzz(40); hitstop = 0.5; shake = Math.max(shake, 6); }
    if (chainN === 20) { banner = { text: '传奇连锁！', color: '#ffe27a', t: 1.3 }; sfx.bonus(); buzz(60); hitstop = 0.6; shake = Math.max(shake, 10); }
    if (info.depth < 12) {
      const pc = { t: 0.07, x: e.x, y: e.y, R: info.R * (0.78 + 0.03 * stats.chain), dmg: info.dmg * (0.9 + 0.05 * stats.chain), depth: info.depth + 1 };
      pending.push(pc);
      if (info.enc && info.enc.n > 0) { info.enc.n--; DBG.encore++; pending.push(Object.assign({}, pc, { t: 0.2 })); }
    }
    n = Math.max(n, chainN);
  }
  const bonus = chainN >= 4 ? Math.floor(chainN / 4) : 0;
  dropGem(e.x, e.y, e.val + bonus);
  if (rings.length < 40) rings.push({ x: e.x, y: e.y, t: 0, R: e.r * (e.type === 'king' ? 3 : 1.7), col: e.col });
  confetti(e.x, e.y, e.col, e.type === 'king' ? 40 : 7, e.type === 'king' ? 300 : 170);
  sfx.kill(n);
  if (e.type === 'king') winRun();
}
function explode(x, y, R, dmg, depth, enc) {
  blasts.push({ x, y, R, t: 0, depth });
  shake = Math.max(shake, depth === 0 ? 3 : 1.4);
  if (depth === 0) sfx.boom();
  const encR = enc ? { n: 1 } : null;
  for (const e of enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - x, e.y - y) <= R + e.r * 0.6) {
      const d = Math.hypot(e.x - x, e.y - y) || 1;
      damageEnemy(e, dmg, { blast: true, depth, R, dmg, enc: encR, kx: (e.x - x) / d * 90, ky: (e.y - y) / d * 90 });
    }
  }
}

// bowling: send an enemy flying
function launchEnemy(e, dx, dy, spd, ldmg, depth, burst, from) {
  if (e.dead || e.type === 'king') return;
  const l = Math.hypot(dx, dy) || 1;
  e.kx = dx / l * spd; e.ky = dy / l * spd; e.lau = true; e.ldmg = ldmg; e.ld = depth; e.burst = !!burst;
  e.hits = from ? [from] : null;
  DBG.launch++;
}
function bowlBurst(x, y, dmg) {
  confetti(x, y, '#ffe27a', 12, 200);
  for (const o of enemies) if (!o.dead && Math.hypot(o.x - x, o.y - y) < 44 + o.r * 0.5) damageEnemy(o, dmg * 0.4, {});
}
function wallSlam(e) {
  DBG.slam++; sfx.bonk(); shake = Math.max(shake, 3);
  confetti(e.x, e.y, '#ffe27a', 5, 140);
  damageEnemy(e, e.ldmg * 0.8, {});
  if (e.burst && !e.dead) bowlBurst(e.x, e.y, e.ldmg);
}

function fireWeapon(w, i, n) {
  const d = WDEF[w.type], L = w.lvl - 1, dm = stats.dmg * DMGM[L];
  const off = (i - (n - 1) / 2) * 0.55;
  const mx = P.x + Math.cos(P.aim + off) * (P.r + 8), my = P.y + Math.sin(P.aim + off) * (P.r + 8);
  const a = P.aim;
  switch (w.type) {
    case 'pulse':
      bullets.push({ k: 'pulse', x: mx, y: my, vx: Math.cos(a) * d.spd, vy: Math.sin(a) * d.spd, r: 5, dmg: d.dmg * dm, life: 8,
        pierce: L >= 2 ? 1 : 0, bn: [1, 2, 3][L] + stats.bounce, nb: 0, last: null, col: d.col });
      break;
    case 'shotgun': {
      const cnt = d.pellets + L;
      for (let j = 0; j < cnt; j++) {
        const aa = a + (j - (cnt - 1) / 2) * (d.spread / (cnt - 1)) + rnd(-0.05, 0.05), sp = d.spd * rnd(0.9, 1.1);
        bullets.push({ k: 'pellet', x: mx, y: my, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, r: 4, dmg: d.dmg * dm, life: d.range, pierce: 0,
          lch: L >= 2 ? 2 : 1, burst: L >= 1, Lv: L, col: d.col });
      }
      break;
    }
    case 'chime':
      bullets.push({ k: 'chime', x: mx, y: my, vx: Math.cos(a) * d.spd, vy: Math.sin(a) * d.spd, r: 7, dmg: d.dmg * dm, R: d.R * RM[L] * stats.blast, life: 0.75, enc: L >= 2, col: d.col });
      break;
    case 'boomer':
      bullets.push({ k: 'boomer', x: mx, y: my, dir: a, spd: d.spd, out: true, dist: 0, range: d.range * (1 + 0.08 * L), r: 10, dmg: d.dmg * dm, life: 5, col: d.col, rot: 0,
        L, hov: 0, hovDone: false });
      break;
  }
  confetti(mx, my, d.col, 2, 130);
  sfx.shot(w.type);
}

function bossAI(e, dt, tx, ty) {
  e.stT -= dt;
  const enr = e.hp < e.mhp * 0.5, fast = enr ? 0.75 : 1;
  let vx = 0, vy = 0;
  if (e.st === 'walk') {
    vx = tx * e.spd; vy = ty * e.spd;
    if (e.stT <= 0) {
      e.step++;
      e.st = ['ring', 'charge', 'summon'][e.step % 3];
      e.stT = e.st === 'ring' ? 0.7 : e.st === 'charge' ? 0.9 : 0.8;
      e.dash = false; e.aimx = tx; e.aimy = ty; sfx.warn();
    }
  } else if (e.st === 'ring') {
    if (e.stT <= 0) {
      const cnt = enr ? 22 : 14, off = Math.random() * 6.283;
      for (let i = 0; i < cnt; i++) {
        const a = off + i * 6.283 / cnt;
        ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 7, dmg: 8, life: 6 });
      }
      shake = Math.max(shake, 4);
      e.st = 'walk'; e.stT = 2 * fast;
    }
  } else if (e.st === 'charge') {
    if (!e.dash) {
      e.aimx = tx; e.aimy = ty;
      if (e.stT <= 0) { e.dash = true; e.stT = 0.55; }
    } else {
      vx = e.aimx * 380; vy = e.aimy * 380;
      if (e.stT <= 0) { e.dash = false; e.st = 'walk'; e.stT = 2 * fast; }
    }
  } else if (e.st === 'summon') {
    if (e.stT <= 0) {
      const cnt = enr ? 5 : 3;
      for (let i = 0; i < cnt; i++) enemies.push(makeEnemy('blob', clamp(e.x + rnd(-80, 80), 20, WW - 20), clamp(e.y + rnd(-80, 80), 20, WH - 20)));
      e.st = 'walk'; e.stT = 2.2 * fast;
    }
  }
  return [vx, vy];
}

function stepWorld(dt) {
  waveT += dt;
  const active = phase === 'wave';

  // timers
  if (streakT > 0) { streakT -= dt; if (streakT <= 0) streak = 0; }
  if (chainT > 0) { chainT -= dt; if (chainT <= 0) chainN = 0; }
  P.inv = Math.max(0, P.inv - dt); P.hurtT = Math.max(0, P.hurtT - dt);

  // player
  const [mx, my] = moveVec();
  const sp = 190 * stats.speed;
  P.x = clamp(P.x + mx * sp * dt, P.r, WW - P.r); P.y = clamp(P.y + my * sp * dt, P.r, WH - P.r);
  { const mag = Math.min(1, Math.hypot(mx, my)); P.mv += (mag - P.mv) * Math.min(1, dt * 12); P.walk += dt * 13 * mag; }
  updateAim();
  if (active && P.hp > 0) P.hp = Math.min(stats.maxHp, P.hp + stats.regen * dt);

  // spawning
  if (active) {
    const rate = wave === WAVES ? 0.9 : spawnRate(wave);
    spawnAcc += dt * rate;
    while (spawnAcc >= 1) {
      spawnAcc -= 1;
      let x, y, tries = 0;
      do { x = rnd(30, WW - 30); y = rnd(30, WH - 30); tries++; } while (tries < 12 && Math.hypot(x - P.x, y - P.y) < 200);
      markers.push({ x, y, type: pickType(wave), t: 0.8 });
    }
    if (!swarmDone && (wave === 3 || wave === 6) && waveT > 10) {
      swarmDone = true;
      const side = Math.random() < 0.5 ? 40 : WW - 40;
      for (let i = 0; i < 9; i++) markers.push({ x: side, y: WH * (0.12 + 0.76 * i / 8), type: 'zippy', t: 0.9 });
      banner = { text: '敌潮来袭！', color: '#7be8ff', t: 1 };
    }
  }
  for (let i = markers.length - 1; i >= 0; i--) {
    const m = markers[i]; m.t -= dt;
    if (m.t <= 0) {
      const e = makeEnemy(m.type, m.x, m.y);
      enemies.push(e); confetti(m.x, m.y, e.col, 6, 120);
      if (m.type === 'king') { sfx.hyper(); shake = 8; banner = { text: '果冻之王', color: '#c9a0ff', t: 1.4 }; }
      markers.splice(i, 1);
    }
  }

  // weapons
  if (active) {
    const n = weapons.length;
    weapons.forEach((w, i) => {
      w.cd -= dt * stats.rate;
      if (w.cd <= 0) { fireWeapon(w, i, n); w.cd += WDEF[w.type].cd * CDM[w.lvl - 1]; if (w.cd < 0) w.cd = 0.05; }
    });
  }

  // enemies
  for (const e of enemies) {
    if (e.dead) continue;
    e.t += dt; e.flash = Math.max(0, e.flash - dt); e.bcd = Math.max(0, e.bcd - dt);
    let tx = P.x - e.x, ty = P.y - e.y; const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
    let vx = 0, vy = 0;
    if (e.type === 'zippy') {
      const sw = Math.sin(e.t * 6 + e.ph) * 0.6, ca = Math.cos(sw), sa = Math.sin(sw);
      vx = (tx * ca - ty * sa) * e.spd; vy = (tx * sa + ty * ca) * e.spd;
    } else if (e.type === 'spitter') {
      const want = d > 230 ? 1 : d < 170 ? -1 : 0, side = Math.sin(e.ph) > 0 ? 1 : -1;
      vx = tx * e.spd * want - ty * e.spd * 0.35 * side; vy = ty * e.spd * want + tx * e.spd * 0.35 * side;
      e.fireT -= dt;
      if (e.fireT <= 0 && active) { e.fireT = 2.4; ebullets.push({ x: e.x, y: e.y, vx: tx * 170, vy: ty * 170, r: 6, dmg: e.dmg, life: 4 }); }
    } else if (e.type === 'king') {
      [vx, vy] = bossAI(e, dt, tx, ty);
    } else { vx = tx * e.spd; vy = ty * e.spd; }
    if (e.lau || e.pul > 0) { vx = 0; vy = 0; }
    if (e.pul > 0) e.pul -= dt;
    const nx = e.x + (vx + e.kx) * dt, ny = e.y + (vy + e.ky) * dt;
    if (e.lau) {
      let slam = false;
      if (nx < e.r || nx > WW - e.r) { e.kx = -e.kx * 0.5; slam = true; }
      if (ny < e.r || ny > WH - e.r) { e.ky = -e.ky * 0.5; slam = true; }
      if (slam && Math.hypot(e.kx, e.ky) > 40) wallSlam(e);
    }
    e.x = clamp(nx, e.r, WW - e.r); e.y = clamp(ny, e.r, WH - e.r);
    const kd = Math.pow(e.lau ? 0.3 : 0.02, dt); e.kx *= kd; e.ky *= kd;
    if (e.lau && Math.hypot(e.kx, e.ky) < 140) e.lau = false;
    if (e.dead) continue;
    if (active && d < e.r + P.r * 0.8) hurt(e.dmg);
  }
  // soft separation
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (a.dead || a.type === 'king' || a.lau || a.pul > 0) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; if (b.dead || b.type === 'king' || b.lau || b.pul > 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y, min = (a.r + b.r) * 0.85;
      if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
      const dd = Math.hypot(dx, dy) || 0.01;
      if (dd < min) { const p = (min - dd) * 0.5, nx = dx / dd, ny = dy / dd; a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; }
    }
  }

  // bowling: launched enemies knock into others
  for (const a of enemies) {
    if (a.dead || !a.lau) continue;
    for (const b of enemies) {
      if (b === a || b.dead) continue;
      if (a.hits && a.hits.includes(b)) continue;
      const dd = Math.hypot(a.x - b.x, a.y - b.y);
      if (dd > (a.r + b.r) * 0.95) continue;
      (a.hits || (a.hits = [])).push(b);
      const sp = Math.hypot(a.kx, a.ky) || 1, nl = a.ld + 1, mxp = (a.x + b.x) / 2, myp = (a.y + b.y) / 2;
      DBG.bowl++; sfx.bonk(); shake = Math.max(shake, 2);
      confetti(mxp, myp, '#ffe27a', 4, 120);
      damageEnemy(b, a.ldmg, {});
      if (a.burst) bowlBurst(mxp, myp, a.ldmg);
      if (!b.dead && nl <= 5) launchEnemy(b, (b.x - a.x) / (dd || 1) + a.kx / sp, (b.y - a.y) / (dd || 1) + a.ky / sp, sp * 0.9, a.ldmg * 0.85, nl, a.burst, a);
      a.kx *= 0.6; a.ky *= 0.6;
      if (a.dead) break;
    }
  }

  // player bullets
  for (const b of bullets) {
    if (b.dead) continue;
    if (b.k === 'boomer') {
      b.rot += dt * 14;
      const pullR = 150 * (1 + 0.15 * b.L) * stats.pull, pullS = 260 * (1 + 0.3 * b.L) * stats.pull;
      if (b.out) {
        let mult = 1;
        if (b.hov > 0) { b.hov -= dt; mult = 1.6; if (b.hov <= 0) { b.out = false; sfx.whistleBack(); } }
        else {
          b.x += Math.cos(b.dir) * b.spd * dt; b.y += Math.sin(b.dir) * b.spd * dt; b.dist += b.spd * dt;
          if (b.dist >= b.range) {
            if (b.L >= 2 && !b.hovDone) { b.hovDone = true; b.hov = 0.6; }
            else { b.out = false; sfx.whistleBack(); }
          }
        }
        for (const e of enemies) {
          if (e.dead || e.type === 'king') continue;
          const dx = b.x - e.x, dy = b.y - e.y, dd = Math.hypot(dx, dy);
          if (dd < pullR && dd > 0.5) {
            const s = pullS * mult * (0.4 + 0.6 * (1 - dd / pullR)), step = Math.min(s * dt, dd * 0.6);
            e.x += dx / dd * step; e.y += dy / dd * step; e.pul = 0.1; DBG.pull++;
          }
        }
      } else {
        const dx = P.x - b.x, dy = P.y - b.y, dd = Math.hypot(dx, dy) || 1;
        b.x += dx / dd * b.spd * 1.3 * dt; b.y += dy / dd * b.spd * 1.3 * dt;
        if (dd < 18) { b.dead = true; sfx.catchB(); }
      }
      b.life -= dt; if (b.life <= 0) b.dead = true;
      for (const e of enemies) {
        if (e.dead || e.bcd > 0) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < b.r + e.r) { e.bcd = 0.28; damageEnemy(e, b.dmg, {}); }
      }
      continue;
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.k === 'pulse' && b.bn > 0) {
      let bc = false;
      if (b.x < b.r || b.x > WW - b.r) { b.vx = -b.vx; b.x = clamp(b.x, b.r, WW - b.r); bc = true; }
      if (b.y < b.r || b.y > WH - b.r) { b.vy = -b.vy; b.y = clamp(b.y, b.r, WH - b.r); bc = true; }
      if (bc) { b.bn--; b.nb++; sfx.bounce(b.nb); DBG.bounce++; confetti(b.x, b.y, b.col, 4, 110); }
    }
    if (b.k === 'pulse' && b.bn <= 0 && (b.x < b.r || b.x > WW - b.r || b.y < b.r || b.y > WH - b.r)) { b.dead = true; continue; }
    let hit = false;
    for (const e of enemies) {
      if (e.dead || e === b.last) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < b.r + e.r) {
        if (b.k === 'chime') { explode(b.x, b.y, b.R, b.dmg, 0, b.enc); b.dead = true; hit = true; break; }
        const l = Math.hypot(b.vx, b.vy) || 1, dm = b.dmg * (1 + 0.25 * (b.nb || 0));
        if (b.k === 'pellet') {
          damageEnemy(e, dm, {});
          if (!e.dead) launchEnemy(e, b.vx / l, b.vy / l, [290, 320, 380][b.Lv] * stats.launch, b.dmg * b.lch * 1.5, 0, b.burst, null);
        } else damageEnemy(e, dm, { kx: b.vx / l * 60, ky: b.vy / l * 60 });
        b.last = e;
        if (b.pierce > 0) b.pierce--; else { b.dead = true; hit = true; break; }
      }
    }
    if (hit) continue;
    const out = b.x < -20 || b.x > WW + 20 || b.y < -20 || b.y > WH + 20;
    if (b.life <= 0 || out) {
      b.dead = true;
      if (b.k === 'chime') explode(clamp(b.x, 10, WW - 10), clamp(b.y, 10, WH - 10), b.R, b.dmg, 0, b.enc);
    }
  }
  // enemy bullets
  for (const b of ebullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > WW + 20 || b.y < -20 || b.y > WH + 20) { b.dead = true; continue; }
    if (active && Math.hypot(P.x - b.x, P.y - b.y) < b.r + P.r * 0.75) { b.dead = true; hurt(b.dmg); }
  }
  // chain blasts waiting to fire
  const due = [];
  for (let i = pending.length - 1; i >= 0; i--) {
    pending[i].t -= dt;
    if (pending[i].t <= 0) { due.push(pending[i]); pending.splice(i, 1); }
  }
  for (const p of due) explode(p.x, p.y, p.R, p.dmg, p.depth);
  for (const b of blasts) b.t += dt;
  // gems
  for (const g of gems) {
    g.t += dt; g.x += g.vx * dt; g.y += g.vy * dt;
    const kd = Math.pow(0.001, dt); g.vx *= kd; g.vy *= kd;
    const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1;
    const mr = collectAll ? 99999 : 80 * stats.magnet;
    if (d < mr && g.t > 0.25) { const s = collectAll ? 750 : 260 + (mr - d) * 3; g.x += dx / d * s * dt; g.y += dy / d * s * dt; }
    if (d < P.r + 9 && g.t > 0.1) { g.dead = true; mats += g.val; gemStreak++; gemBump = 1; sfx.gem(gemStreak); }
  }

  // cleanup
  enemies = enemies.filter(e => !e.dead);
  bullets = bullets.filter(b => !b.dead);
  ebullets = ebullets.filter(b => !b.dead);
  blasts = blasts.filter(b => b.t < 0.5);
  gems = gems.filter(g => !g.dead);

  // wave progression
  if (phase === 'wave' && waveT >= waveDur) endWave();
}

function update(raw) {
  tShift += raw;
  if (shake > 0) shake = Math.max(0, shake - raw * 24);
  if (banner && banner.t > 0) banner.t -= raw;
  if (hitstop > 0) hitstop -= raw;
  for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += raw; if (pops[i].t >= pops[i].life) pops.splice(i, 1); }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += raw; if (rings[i].t >= 0.3) rings.splice(i, 1); }
  gemBump = Math.max(0, gemBump - raw * 4);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= raw; p.x += p.vx * raw; p.y += p.vy * raw; p.vx *= 0.95; p.vy *= 0.95; p.rot += raw * 8;
    if (p.life <= 0) parts.splice(i, 1);
  }
  if (phase === 'wave' || phase === 'clearing') {
    stepWorld(raw * (hitstop > 0 ? 0.35 : 1));
    if (phase === 'clearing') {
      clearT -= raw;
      if (clearT <= 0) { if (finalWin) { phase = 'end'; musicMode = 'off'; showEnd(true); } else openShop(); }
    }
  }
}

/* ================= drawing ================= */
const MONC = { blob: ['#ff93cb', '#ff5fa8'], zippy: ['#9aeeff', '#4cc4f0'], chunk: ['#a6f7b2', '#4fd070'], spitter: ['#ffee9a', '#ffc83d'], king: ['#dcbaff', '#a070f0'] };
const easeBack = a => { const k = a - 1; return 1 + 2.70158 * k * k * k + 1.70158 * k * k; };
function otext(c, txt, x, y, fill, lw) {
  c.lineJoin = 'round'; c.lineWidth = lw || 4; c.strokeStyle = INK; c.strokeText(txt, x, y); c.fillStyle = fill; c.fillText(txt, x, y);
}
function drawMonster(c, type, x, y, r, t, ph, lx, ly, flash) {
  const pal = MONC[type] || MONC.blob, lw = Math.max(2, r * 0.17), dk = pal[1];
  c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round';
  const bob = Math.sin(t * 8 + ph);
  const bp = () => { if (type === 'chunk') rrC(c, -r, -r * 0.95, r * 2, r * 1.9, r * 0.6); else { c.beginPath(); c.ellipse(0, 0, r, r * 0.95, 0, 0, 6.283); } };
  c.lineWidth = lw * 0.8; c.strokeStyle = INK;
  if (type === 'zippy') {
    const f = Math.sin(t * 30) * 0.5;
    for (const s of [-1, 1]) {
      c.save(); c.translate(s * r * 0.85, -r * 0.45); c.rotate(s * (0.5 - f)); c.fillStyle = '#e8fbff';
      c.beginPath(); c.ellipse(0, 0, r * 0.75, r * 0.38, 0, 0, 6.283); c.fill(); c.stroke(); c.restore();
    }
  } else {
    c.fillStyle = dk;
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * 0.45, r * 0.9 + bob * s * r * 0.05, r * 0.28, r * 0.17, 0, 0, 6.283); c.fill(); c.stroke(); }
  }
  if (type === 'chunk') {
    c.fillStyle = '#3fae5c';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * 0.62, -r * 0.82); c.lineTo(s * r * 0.5, -r * 1.3); c.lineTo(s * r * 0.2, -r * 0.92); c.closePath(); c.fill(); c.stroke(); }
  }
  const g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
  bp(); c.fillStyle = g; c.fill(); c.lineWidth = lw; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.58, r * 0.26, r * 0.13, -0.5, 0, 6.283); c.fill();
  if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(0.75, flash * 8) + ')'; bp(); c.fill(); }
  // face
  const ex = r * (type === 'zippy' ? 0.32 : 0.36), ey = -r * 0.08;
  const rx = r * (type === 'zippy' ? 0.22 : 0.24), ry = r * (type === 'chunk' ? 0.24 : type === 'spitter' ? 0.3 : 0.29);
  if (type !== 'chunk' && type !== 'king') {
    c.fillStyle = 'rgba(255,70,130,0.3)';
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * 0.66, r * 0.3, r * 0.14, r * 0.09, 0, 0, 6.283); c.fill(); }
  }
  c.lineWidth = lw * 0.55;
  for (const s of [-1, 1]) {
    const sx = s * ex;
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(sx, ey, rx, ry, 0, 0, 6.283); c.fill(); c.stroke();
    const px = sx + lx * rx * 0.38, py = ey + ly * ry * 0.38;
    circ(c, px, py, r * 0.15, INK); circ(c, px - r * 0.04, py - r * 0.05, r * 0.06, '#fff');
    if (type === 'chunk') {
      c.fillStyle = pal[0]; c.beginPath(); c.ellipse(sx, ey, rx * 1.04, ry * 1.04, 0, Math.PI, 6.283); c.closePath(); c.fill(); c.stroke();
    } else if (type !== 'zippy') {
      c.lineWidth = lw * 0.85; c.beginPath(); c.moveTo(sx + s * rx * 0.9, ey - ry * 1.2); c.lineTo(sx - s * rx * 0.9, ey - ry * 0.78); c.stroke(); c.lineWidth = lw * 0.55;
    }
  }
  c.lineWidth = lw * 0.6;
  if (type === 'blob') {
    c.beginPath(); c.moveTo(-r * 0.24, r * 0.3); c.quadraticCurveTo(0, r * 0.64, r * 0.24, r * 0.3); c.closePath(); c.fillStyle = '#5a1f45'; c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-r * 0.17, r * 0.32); c.lineTo(-r * 0.08, r * 0.45); c.lineTo(-r * 0.02, r * 0.33); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(r * 0.17, r * 0.32); c.lineTo(r * 0.08, r * 0.45); c.lineTo(r * 0.02, r * 0.33); c.closePath(); c.fill();
  } else if (type === 'zippy') {
    c.beginPath(); c.ellipse(0, r * 0.42, r * 0.09, r * 0.12, 0, 0, 6.283); c.fillStyle = INK; c.fill();
  } else if (type === 'chunk') {
    c.beginPath(); c.moveTo(-r * 0.32, r * 0.55); c.quadraticCurveTo(0, r * 0.28, r * 0.32, r * 0.55); c.lineWidth = lw * 0.8; c.stroke();
  } else if (type === 'spitter') {
    c.beginPath(); c.ellipse(0, r * 0.42, r * 0.22, r * 0.26, 0, 0, 6.283); c.fillStyle = '#5a1f45'; c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, r * 0.54, r * 0.12, r * 0.08, 0, 0, 6.283); c.fillStyle = '#ff7a9a'; c.fill();
  } else if (type === 'king') {
    c.beginPath(); c.moveTo(-r * 0.42, r * 0.26); c.quadraticCurveTo(0, r * 0.8, r * 0.42, r * 0.26); c.closePath(); c.fillStyle = '#4a1a5a'; c.fill(); c.stroke();
    c.fillStyle = '#fff';
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * r * 0.2 - r * 0.09, r * 0.29); c.lineTo(i * r * 0.2, r * 0.45); c.lineTo(i * r * 0.2 + r * 0.09, r * 0.29); c.closePath(); c.fill(); }
    c.fillStyle = '#ffd24d'; c.lineWidth = lw * 0.8;
    c.beginPath(); c.moveTo(-r * 0.58, -r * 0.72); c.lineTo(-r * 0.66, -r * 1.42); c.lineTo(-r * 0.3, -r * 1.05); c.lineTo(0, -r * 1.55);
    c.lineTo(r * 0.3, -r * 1.05); c.lineTo(r * 0.66, -r * 1.42); c.lineTo(r * 0.58, -r * 0.72); c.closePath(); c.fill(); c.stroke();
    circ(c, -r * 0.66, -r * 1.42, r * 0.09, '#ff5a7a'); circ(c, 0, -r * 1.55, r * 0.1, '#7be8ff'); circ(c, r * 0.66, -r * 1.42, r * 0.09, '#ff5a7a');
  }
  c.restore();
}

function drawEnemy(e) {
  const r = e.r, ap = Math.min(1, e.t / 0.25), sc = ap < 1 ? Math.max(0.05, easeBack(ap)) : 1;
  ell(ctx, e.x, e.y + r * 0.9, r * 0.95 * sc, r * 0.3 * sc, 'rgba(0,0,0,0.25)');
  if (e.lau) {
    ctx.strokeStyle = 'rgba(255,226,122,0.55)'; ctx.lineWidth = r * 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - e.kx * 0.07, e.y - e.ky * 0.07); ctx.stroke();
  }
  ctx.save(); ctx.translate(e.x, e.y);
  const sq = Math.sin(e.t * 8 + e.ph) * 0.05 + e.flash * 1.1;
  ctx.scale((1 + sq) * sc, (1 - sq) * sc);
  const a = Math.atan2(P.y - e.y, P.x - e.x);
  drawMonster(ctx, e.type, 0, 0, r, e.t, e.ph, Math.cos(a), Math.sin(a), e.flash);
  ctx.restore();
  if ((e.type === 'chunk' || e.type === 'king') && e.hp < e.mhp) {
    const w = r * 1.6, bx = e.x - w / 2, by = e.y - r - (e.type === 'king' ? 34 : 14);
    ctx.fillStyle = INK; rrC(ctx, bx - 2, by - 2, w + 4, 9, 4.5); ctx.fill();
    ctx.fillStyle = '#ff7aa8'; rrC(ctx, bx, by, Math.max(3, w * e.hp / e.mhp), 5, 2.5); ctx.fill();
  }
  if (e.type === 'king' && e.st === 'charge' && !e.dash) {
    ctx.strokeStyle = 'rgba(255,90,90,0.55)'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.aimx * 420, e.y + e.aimy * 420); ctx.stroke();
  }
}

function drawPlayerBody(c, x, y, r, aim, tt, hurtT, walk, mv) {
  walk = walk || 0; mv = mv || 0;
  const lw = Math.max(2, r * 0.16);
  const hop = Math.abs(Math.sin(walk)) * r * 0.24 * mv;           // little hops while walking
  c.save(); c.translate(x, y - hop); c.lineJoin = 'round'; c.lineCap = 'round';
  c.rotate(Math.sin(walk) * 0.1 * mv);                            // waddle side to side
  const sq = Math.sin(tt * 9) * 0.04 * (1 - mv);
  const st = hop / r * 0.35;
  c.scale(1 + sq - st * 0.6, 1 - sq + st);
  c.lineWidth = lw * 0.8; c.strokeStyle = INK; c.fillStyle = '#ffd9b0';
  for (const s of [-1, 1]) {                                      // feet step alternately
    const ph = Math.sin(walk + (s > 0 ? 0 : Math.PI)) * mv;
    c.beginPath(); c.ellipse(s * r * 0.45, r * 0.9 - Math.max(0, ph) * r * 0.2, r * 0.28, r * 0.17, 0, 0, 6.283); c.fill(); c.stroke();
  }
  const aw = Math.sin(walk * 2 - 1) * r * 0.16 * mv;              // antenna bounces
  c.beginPath(); c.moveTo(0, -r * 0.9); c.lineTo(r * 0.12 + aw * 0.6, -r * 1.3); c.lineWidth = lw * 0.7; c.stroke();
  circ(c, r * 0.12 + aw, -r * 1.35, r * 0.2, '#ffe27a'); c.lineWidth = lw * 0.7; c.stroke();
  const g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#fffaf2'); g.addColorStop(1, '#ffdfba');
  c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fillStyle = g; c.fill(); c.lineWidth = lw; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.58, r * 0.24, r * 0.12, -0.5, 0, 6.283); c.fill();
  ell(c, -r * 0.64, r * 0.3, r * 0.17, r * 0.11, 'rgba(255,120,160,0.6)'); ell(c, r * 0.64, r * 0.3, r * 0.17, r * 0.11, 'rgba(255,120,160,0.6)');
  const ex = Math.cos(aim) * r * 0.13, ey = Math.sin(aim) * r * 0.1;   // eyes look toward the aim
  for (const s of [-1, 1]) {
    ell(c, s * r * 0.33 + ex, -r * 0.06 + ey, r * 0.17, r * 0.23, INK);
    circ(c, s * r * 0.33 + ex + Math.cos(aim) * r * 0.04 - r * 0.04, -r * 0.06 + ey + Math.sin(aim) * r * 0.04 - r * 0.08, r * 0.07, '#fff');
  }
  c.strokeStyle = INK; c.lineWidth = lw * 0.7; c.beginPath(); c.arc(0, r * 0.24, r * 0.15, 0.2, Math.PI - 0.2); c.stroke();
  if (hurtT > 0) circ(c, 0, 0, r, 'rgba(255,90,90,0.38)');
  c.restore();
}

function drawPlayer() {
  const r = P.r;
  const hopS = Math.abs(Math.sin(P.walk)) * P.mv;
  ell(ctx, P.x, P.y + r * 0.95, r * 0.95 * (1 - hopS * 0.12), r * 0.34 * (1 - hopS * 0.12), 'rgba(0,0,0,' + (0.25 - hopS * 0.06).toFixed(3) + ')');
  const n = weapons.length;
  weapons.forEach((w, i) => {
    const off = (i - (n - 1) / 2) * 0.55, a = P.aim + off;
    const gx = P.x + Math.cos(a) * (r + 5), gy = P.y + Math.sin(a) * (r + 5);
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(P.aim);
    ctx.fillStyle = INK; rrC(ctx, -7, -6, 19, 12, 5); ctx.fill();
    ctx.fillStyle = WDEF[w.type].col; rrC(ctx, -5, -4, 14, 8, 3.5); ctx.fill();
    ctx.fillStyle = '#fff'; rrC(ctx, 5, -2, 5, 4, 2); ctx.fill();
    ctx.restore();
  });
  ctx.save();
  if (P.inv > 0 && Math.floor(tShift * 16) % 2 === 0 && P.hurtT > 0) ctx.globalAlpha = 0.5;
  drawPlayerBody(ctx, P.x, P.y, r, P.aim, tShift, P.hurtT, P.walk, P.mv);
  ctx.restore();
}

function drawBullet(b) {
  if (b.k === 'pulse' || b.k === 'pellet') {
    const g = b.nb || 0, col = g ? '#ffe27a' : b.col;
    if (b.k === 'pulse') {
      ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = b.r * 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035); ctx.stroke(); ctx.globalAlpha = 1;
    }
    circ(ctx, b.x, b.y, b.r + 3 + g * 0.8, INK); circ(ctx, b.x, b.y, b.r + 1 + g * 0.8, col); circ(ctx, b.x - 1, b.y - 1, (b.r + g * 0.8) * 0.5, '#fff');
  } else if (b.k === 'chime') {
    circ(ctx, b.x, b.y, b.r + 3.5, INK); circ(ctx, b.x, b.y, b.r + 1, '#ff8fc7'); circ(ctx, b.x - 2.5, b.y - 2.5, 2.6, 'rgba(255,255,255,0.85)');
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x + 3, b.y - b.r); ctx.lineTo(b.x + 7, b.y - b.r - 6); ctx.stroke();
    ctx.save(); ctx.translate(b.x + 8, b.y - b.r - 8); ctx.rotate(tShift * 12); ctx.fillStyle = '#ffe27a'; starPath(ctx, 5, 2.2, 4); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 6 + Math.sin(tShift * 20) * 1.5, 0, 6.283); ctx.stroke();
  } else if (b.k === 'boomer') {
    if (b.out) {
      ctx.strokeStyle = 'rgba(143,240,164,0.28)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -tShift * 40;
      ctx.beginPath(); ctx.arc(b.x, b.y, 150 * (1 + 0.15 * b.L) * stats.pull, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, b.r, -2.4, 0.6); ctx.stroke();
    ctx.strokeStyle = b.col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, b.r, -2.4, 0.6); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, b.r, -2.0, 0.2); ctx.stroke();
    ctx.restore();
  }
}

function drawWorld() {
  ctx.save();
  ctx.translate(OX, OY); ctx.scale(K, K);
  if (shake > 0) ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
  ctx.fillStyle = '#2d2264'; rrC(ctx, 0, 0, WW, WH, 26); ctx.fill();
  if (pattern) { ctx.fillStyle = pattern; rrC(ctx, 0, 0, WW, WH, 26); ctx.fill(); }
  const vg = ctx.createRadialGradient(WW / 2, WH / 2, WH * 0.35, WW / 2, WH / 2, WW * 0.62);
  vg.addColorStop(0, 'rgba(10,5,40,0)'); vg.addColorStop(1, 'rgba(10,5,40,0.45)');
  ctx.fillStyle = vg; rrC(ctx, 0, 0, WW, WH, 26); ctx.fill();
  ctx.lineWidth = 14; ctx.strokeStyle = '#171036'; rrC(ctx, 0, 0, WW, WH, 26); ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = '#6a52d8'; rrC(ctx, 0, 0, WW, WH, 26); ctx.stroke();

  for (const m of markers) {
    const k = 1 - Math.max(0, m.t) / 0.9, rr2 = (m.type === 'king' ? 40 : 15) * (1.4 - 0.4 * k);
    ctx.globalAlpha = 0.55 + 0.4 * Math.sin(tShift * 18);
    ctx.strokeStyle = '#ff9ccf'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(m.x, m.y, rr2, 0, 6.283); ctx.stroke();
    ctx.fillStyle = '#ff9ccf'; ctx.font = '800 ' + Math.round(rr2) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', m.x, m.y + 1);
    ctx.globalAlpha = 1;
  }
  for (const g of gems) {
    ctx.save(); ctx.translate(g.x, g.y + Math.sin(tShift * 6 + g.t * 3) * 1.5); ctx.rotate(Math.sin(tShift * 5 + g.t) * 0.25);
    const s = g.val > 1 ? 1.35 : 1;
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = INK; starPath(ctx, 8.5 * s, 3.6 * s, 4); ctx.stroke();
    ctx.fillStyle = '#ffe27a'; ctx.fill();
    circ(ctx, -1.5 * s, -1.5 * s, 1.8 * s, '#fff'); ctx.restore();
  }
  for (const r of rings) {
    const u = r.t / 0.3;
    ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5 * (1 - u) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, 6 + r.R * u, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = r.col; ctx.lineWidth = 2.5 * (1 - u); ctx.beginPath(); ctx.arc(r.x, r.y, 4 + r.R * u * 0.8, 0, 6.283); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const e of enemies) drawEnemy(e);
  for (const b of ebullets) { circ(ctx, b.x, b.y, b.r + 3, INK); circ(ctx, b.x, b.y, b.r + 1, '#ff6b9a'); circ(ctx, b.x - 1.5, b.y - 1.5, b.r * 0.45, '#ffd1e3'); }
  for (const b of bullets) drawBullet(b);
  if (phase === 'wave' || phase === 'clearing') drawPlayer();
  for (const b of blasts) {
    const g = Math.min(1, b.t / 0.22), r = b.R * (1 - Math.pow(1 - g, 3)), a = Math.max(0, 1 - b.t / 0.5);
    ctx.globalAlpha = 0.22 * a; circ(ctx, b.x, b.y, r, '#ff8fc7');
    ctx.globalAlpha = 0.7 * a; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0.1, r), 0, 6.283); ctx.stroke();
    ctx.globalAlpha = 0.95 * a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0.1, r), 0, 6.283); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const q of pops) {
    const u = q.t / q.life, sc = q.t < 0.12 ? easeBack(q.t / 0.12) : 1;
    ctx.save(); ctx.globalAlpha = u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1;
    ctx.translate(q.x, q.y - 30 * u); ctx.scale(sc, sc);
    ctx.font = '900 ' + Math.round(q.sz) + 'px system-ui, sans-serif';
    otext(ctx, q.txt, 0, 0, q.col, 4.5);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawStick(s, label) {
  if (!s) return;
  const dx = s.cx - s.ox, dy = s.cy - s.oy, d = Math.hypot(dx, dy), m = Math.min(d, 50);
  ctx.globalAlpha = 0.25; circ(ctx, s.ox, s.oy, 54, '#fff');
  ctx.globalAlpha = 0.5; circ(ctx, s.ox + (d ? dx / d * m : 0), s.oy + (d ? dy / d * m : 0), 24, '#fff');
  ctx.globalAlpha = 1;
}

function drawHUD() {
  const W0 = W, H0 = H;
  W = W0 - SAFE.l - SAFE.r; H = H0 - SAFE.t - HOST_TOP - SAFE.b;
  ctx.save(); ctx.translate(SAFE.l, SAFE.t + HOST_TOP);
  const pad = 12, bw = Math.min(190, W * 0.4), bx = pad + 28;
  // hp
  ctx.fillStyle = INK; rrC(ctx, bx - 3, 7, bw + 6, 26, 13); ctx.fill();
  ctx.fillStyle = '#3d2f80'; rrC(ctx, bx, 10, bw, 20, 10); ctx.fill();
  const f = Math.max(0, P.hp / stats.maxHp), fw = Math.max(f > 0 ? 20 : 0, bw * f);
  if (fw > 0) {
    const hg = ctx.createLinearGradient(0, 10, 0, 30); hg.addColorStop(0, f > 0.3 ? '#ff9cc0' : '#ff8a8a'); hg.addColorStop(1, f > 0.3 ? '#ff5f95' : '#ff4a4a');
    ctx.fillStyle = hg; rrC(ctx, bx, 10, fw, 20, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; rrC(ctx, bx + 5, 12, Math.max(4, fw - 10), 5, 2.5); ctx.fill();
  }
  ctx.save(); ctx.translate(pad + 12, 20); ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-13, -2, -6, -10, 0, -4); ctx.bezierCurveTo(6, -10, 13, -2, 0, 8); ctx.stroke(); ctx.restore();
  drawIcon(ctx, 'heart', pad + 12, 20, 9);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 12px system-ui, sans-serif';
  otext(ctx, Math.ceil(P.hp) + '/' + stats.maxHp, bx + bw / 2, 20.5, '#fff', 3.5);
  // gems
  ctx.save(); const gs = 1 + gemBump * 0.35; ctx.translate(W - 100, 21); ctx.scale(gs, gs);
  ctx.textAlign = 'right'; ctx.font = '900 19px system-ui, sans-serif';
  otext(ctx, String(mats), 0, 0, '#ffe27a', 4.5);
  const gw = ctx.measureText(String(mats)).width;
  ctx.lineJoin = 'round'; ctx.save(); ctx.translate(-gw - 15, 0); starPath(ctx, 10, 4.2, 4); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = '#ffe27a'; ctx.fill(); ctx.restore();
  ctx.restore();
  // wave + timer
  ctx.textAlign = 'left'; ctx.font = '900 14px system-ui, sans-serif';
  otext(ctx, wave === WAVES ? '首领' : '第 ' + wave + ' 波', pad, 51, '#fff', 4);
  if (waveDur !== Infinity) {
    const x0 = pad + 94, w0 = W - x0 - pad, fr = clamp(waveT / waveDur, 0, 1);
    ctx.fillStyle = INK; rrC(ctx, x0 - 2, 44, w0 + 4, 14, 7); ctx.fill();
    ctx.fillStyle = '#3d2f80'; rrC(ctx, x0, 46, w0, 10, 5); ctx.fill();
    const tg = ctx.createLinearGradient(0, 46, 0, 56); tg.addColorStop(0, '#b4ffc4'); tg.addColorStop(1, '#5fe08a');
    ctx.fillStyle = tg; rrC(ctx, x0, 46, Math.max(10, w0 * fr), 10, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rrC(ctx, x0 + 3, 47.5, Math.max(4, w0 * fr - 6), 3, 1.5); ctx.fill();
  }
  // boss bar
  const king = enemies.find(e => e.type === 'king');
  if (king) {
    const bw2 = Math.min(360, W * 0.7), x0 = (W - bw2) / 2;
    ctx.fillStyle = INK; rrC(ctx, x0 - 3, HUD_H + 1, bw2 + 6, 16, 8); ctx.fill();
    ctx.fillStyle = '#3d2f80'; rrC(ctx, x0, HUD_H + 4, bw2, 10, 5); ctx.fill();
    ctx.fillStyle = '#c9a0ff'; rrC(ctx, x0, HUD_H + 4, Math.max(8, bw2 * king.hp / king.mhp), 10, 5); ctx.fill();
  }
  // chain
  if (chainN >= 2) {
    const s = 1 + Math.min(chainN, 20) * 0.025;
    ctx.save(); ctx.translate(W / 2, HUD_H + (king ? 40 : 28)); ctx.scale(s, s);
    ctx.globalAlpha = Math.min(1, chainT / 0.3);
    ctx.font = '900 28px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.strokeText('连锁 ×' + chainN, 0, 0);
    ctx.lineWidth = 5; ctx.strokeStyle = '#ff8fc7'; ctx.strokeText('连锁 ×' + chainN, 0, 0);
    ctx.fillStyle = '#fff'; ctx.fillText('连锁 ×' + chainN, 0, 0);
    ctx.restore();
  }
  if (wave === 1 && waveT < 7 && phase === 'wave') {
    ctx.globalAlpha = 0.9 + Math.sin(tShift * 4) * 0.1;
    ctx.font = '800 ' + Math.round(clamp(W / 26, 12, 16)) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (I.touch) {
      otext(ctx, '左侧摇杆：移动  ·  右侧摇杆：瞄准', W / 2, H - 34, '#fff', 4);
      otext(ctx, '武器会自动射击', W / 2, H - 14, '#fff', 4);
    } else otext(ctx, 'WASD：移动  ·  鼠标：瞄准  ·  武器自动射击', W / 2, H - 22, '#fff', 4);
    ctx.globalAlpha = 1;
  }
  ctx.restore(); W = W0; H = H0;
  drawStick(I.mv); drawStick(I.av);
}
function drawBanner() {
  if (!banner || banner.t <= 0) return;
  if (banner.m === undefined) banner.m = banner.t;
  const age = banner.m - banner.t, k = Math.min(1, banner.t / 0.4);
  const sc = age < 0.25 ? Math.max(0.05, easeBack(age / 0.25)) : 1;
  ctx.save(); ctx.globalAlpha = k;
  ctx.translate(W / 2, H * 0.42); ctx.scale(sc * 1.05, sc * 1.05); ctx.rotate(Math.sin(age * 5) * 0.025);
  ctx.font = '900 ' + Math.min(56, W / 9 + 14) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = INK; ctx.strokeText(banner.text, 0, 4);
  ctx.lineWidth = 14; ctx.strokeText(banner.text, 0, 0);
  ctx.fillStyle = banner.color; ctx.fillText(banner.text, 0, 0);
  ctx.restore();
}
function mblob(c, x, y, r) { drawMonster(c, 'blob', x, y, r, tShift, x * 0.1, -1, 0, 0); }
function mplayer(c, x, y) { drawPlayerBody(c, x, y, 11, 0, tShift, 0); }
function dlabel(c, txt, x, y) {
  c.save(); c.font = '900 14px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = 4; c.strokeStyle = 'rgba(42,31,77,.9)'; c.strokeText(txt, x, y); c.fillStyle = '#fff'; c.fillText(txt, x, y); c.restore();
}
function dring(c, x, y, R, u, col) {            // expanding blast ring, u 0..1
  const g = Math.min(1, u * 2.5), r = R * (1 - Math.pow(1 - g, 3)), a = Math.max(0, 1 - u);
  c.save(); c.globalAlpha *= 0.25 * a; circ(c, x, y, r, col);
  c.globalAlpha = c.globalAlpha / (0.25 * a || 1) * 0.95 * a; c.strokeStyle = '#fff'; c.lineWidth = 3;
  c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, 6.283); c.stroke(); c.restore();
}
const DT = 3.2;
function drawDemo(c, type, time) {
  const t = time % DT;
  c.clearRect(0, 0, 280, 128);
  c.save();
  c.globalAlpha = Math.max(0, Math.min(1, t / 0.15, (DT - t) / 0.35));
  c.strokeStyle = '#4b3a96'; c.lineWidth = 4; rrC(c, 6, 12, 268, 104, 12); c.stroke();
  mplayer(c, 28, 64);
  if (type === 'chime') {
    const ev = [{ x: 150, y: 64, t: 0.5, R: 32 }, { x: 186, y: 42, t: 0.68, R: 27 }, { x: 188, y: 88, t: 0.68, R: 27 },
      { x: 226, y: 64, t: 0.86, R: 27 }, { x: 238, y: 30, t: 1.04, R: 25 }, { x: 244, y: 98, t: 1.04, R: 25 }];
    if (t < 0.5) { const u = t / 0.5; circ(c, 42 + 108 * u, 64, 6, '#ff8fc7'); circ(c, 40 + 108 * u, 62, 2, 'rgba(255,255,255,.8)'); }
    let n = 0;
    for (const e of ev) {
      if (t < e.t) mblob(c, e.x, e.y, 10, '#ff9ccf');
      else { n++; if (t < e.t + 0.4) dring(c, e.x, e.y, e.R, (t - e.t) / 0.4, '#ff8fc7'); }
    }
    if (n >= 2) dlabel(c, '连锁 ×' + n, 206, 26);
  } else if (type === 'pulse') {
    const pts = [[34, 98], [118, 14], [204, 98]], segs = [], DUR = 1.4;
    let tot = 0;
    for (let i = 0; i < 2; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(l); tot += l; }
    const s = Math.min(tot, t / DUR * tot);
    c.save(); c.setLineDash([4, 6]); c.strokeStyle = 'rgba(123,232,255,.3)'; c.lineWidth = 2; c.beginPath();
    pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1])); c.stroke(); c.restore();
    let rem = s, px = pts[2][0], py = pts[2][1];
    for (let i = 0; i < 2; i++) {
      if (rem <= segs[i]) { const u = rem / segs[i]; px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u; py = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u; break; }
      rem -= segs[i];
    }
    const nb = s >= segs[0] ? 1 : 0, bt = segs[0] / tot * DUR;
    if (t >= bt && t < bt + 0.3) dring(c, pts[1][0], pts[1][1], 16, (t - bt) / 0.3, '#7be8ff');
    if (t < DUR + 0.02) { mblob(c, 208, 98, 10, '#ff9ccf'); circ(c, px, py, 5 + nb, nb ? '#ffe27a' : '#7be8ff'); circ(c, px, py, 3 + nb * 0.5, '#fff'); }
    else if (t < DUR + 0.4) dring(c, 208, 98, 24, (t - DUR) / 0.4, '#7be8ff');
    dlabel(c, 'DMG x' + (1 + 0.25 * nb).toFixed(2), 220, 28);
  } else if (type === 'shotgun') {
    const balls = [
      { x0: 110, y0: 64, x1: 165, y1: 62, t0: 0.35, d: 0.22 },
      { x0: 172, y0: 50, x1: 226, y1: 38, t0: 0.57, d: 0.22 },
      { x0: 172, y0: 80, x1: 222, y1: 84, t0: 0.57, d: 0.22 },
      { x0: 234, y0: 64, x1: 256, y1: 64, t0: 0.8, d: 0.15 },
      { x0: 240, y0: 28, x1: 256, y1: 24, t0: 0.8, d: 0.15 }];
    if (t < 0.35) { const u = t / 0.35; for (let j = 0; j < 5; j++) circ(c, 42 + 66 * u, 64 + (j - 2) * 7 * u, 2.6, '#ffe27a'); }
    let n = 0;
    for (const b of balls) {
      let x = b.x0, y = b.y0, moving = false;
      if (t >= b.t0) {
        n++;
        const u = Math.min(1, (t - b.t0) / b.d), e = 1 - (1 - u) * (1 - u);
        x = b.x0 + (b.x1 - b.x0) * e; y = b.y0 + (b.y1 - b.y0) * e; moving = u < 1;
        if (t < b.t0 + 0.3) dring(c, b.x0, b.y0, 14, (t - b.t0) / 0.3, '#ffe27a');
      }
      if (moving) { c.strokeStyle = 'rgba(255,226,122,.5)'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x - (b.x1 - b.x0) * 0.25, y - (b.y1 - b.y0) * 0.25); c.stroke(); }
      mblob(c, x, y, 10, '#ff9ccf');
    }
    if (t >= 0.95 && t < 1.25) dring(c, 270, 64, 12, (t - 0.95) / 0.3, '#ffe27a');
    if (n >= 2) dlabel(c, 'LAUNCHED x' + n, 170, 108);
  } else if (type === 'boomer') {
    const es = [[110, 26, 196, 56], [130, 102, 196, 72], [158, 40, 214, 56], [165, 92, 214, 72], [200, 30, 205, 64]];
    let bx;
    if (t < 1.0) bx = 40 + 165 * (1 - Math.pow(1 - t, 2));
    else if (t < 1.3) bx = 205;
    else { const u = Math.min(1, (t - 1.3) / 0.7); bx = 205 - 165 * u * u; }
    const pu = Math.max(0, Math.min(1, (t - 0.25) / 0.85)), sm = pu * pu * (3 - 2 * pu);
    if (t < 1.3) {
      c.save(); c.setLineDash([5, 7]); c.lineDashOffset = -t * 30; c.strokeStyle = 'rgba(143,240,164,.35)'; c.lineWidth = 2;
      c.beginPath(); c.arc(bx, 64, 62, 0, 6.283); c.stroke(); c.restore();
    }
    if (t < 1.45) for (const e of es) mblob(c, e[0] + (e[2] - e[0]) * sm, e[1] + (e[3] - e[1]) * sm, 10, '#ff9ccf');
    else if (t < 1.85) dring(c, 205, 64, 48, (t - 1.45) / 0.4, '#ff8fc7');
    if (bx > 0 && t < 2.05) {
      c.save(); c.translate(bx, 64); c.rotate(t * 14); c.strokeStyle = '#8ff0a4'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.arc(0, 0, 10, -2.4, 0.6); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 10, -2.0, 0.2); c.stroke(); c.restore();
    }
    if (t > 0.45 && t < 1.45) dlabel(c, 'PULLED IN', 150, 112);
    else if (t >= 1.45 && t < 2.4) dlabel(c, 'then BOOM!', 150, 112);
  }
  c.restore();
}
function drawHero() {
  if (!heroCtx) return;
  const c = heroCtx, t = tShift;
  c.clearRect(0, 0, 480, 150);
  const L = [['blob', 62, 104, 27], ['zippy', 148, 84, 21], ['player', 240, 100, 36], ['chunk', 336, 100, 32], ['spitter', 424, 104, 27]];
  L.forEach((o, i) => {
    const bob = Math.abs(Math.sin(t * 3 + i * 1.3)) * 12, y = o[2] - bob * (o[0] === 'zippy' ? 0.6 : 1);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(o[1], 136, o[3] * (1 - bob * 0.015), o[3] * 0.25, 0, 0, 6.283); c.fill();
    if (o[0] === 'player') drawPlayerBody(c, o[1], y, o[3], 0.2, t, 0);
    else drawMonster(c, o[0], o[1], y, o[3], t, i, o[1] < 240 ? 1 : -1, 0, 0);
  });
}
function draw() {
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1f66'); bg.addColorStop(1, '#150f38');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (phase === 'menu') drawHero();
  drawWorld();
  if (phase === 'wave' || phase === 'clearing') { drawHUD(); drawBanner(); }
  if (phase === 'pick' || phase === 'shop') for (const d of demos) if (d.el.isConnected) drawDemo(d.c, d.type, tShift);
  const pb = (phase === 'wave' || phase === 'clearing') ? '' : 'none';
  if (pb !== pbState) { pbState = pb; $('pauseBtn').style.display = pb; }
}

/* ================= wiring ================= */
function togglePause() {
  paused = !paused; show('pause', paused);
  if (!paused) initAudio();
}
$('startBtn').addEventListener('click', startRun);
$('againBtn').addEventListener('click', startRun);
$('goBtn').addEventListener('click', () => { initAudio(); startWave(wave + 1); });
$('rerollBtn').addEventListener('click', reroll);
$('pauseBtn').addEventListener('click', () => { if (phase === 'wave') togglePause(); });
$('resumeBtn').addEventListener('click', togglePause);
$('quitBtn').addEventListener('click', () => { paused = false; show('pause', false); showMenu(); });
$('mute').addEventListener('click', () => {
  initAudio(); muted = !muted; $('mute').textContent = muted ? '🔇' : '🔊';
});

pickWorld(); layout();
P.x = WW / 2; P.y = WH / 2;
showMenu();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();

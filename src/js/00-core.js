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


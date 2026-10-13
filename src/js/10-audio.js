/* ================= audio ================= */
const PENT = [0, 2, 4, 7, 9];
const BPM = 118, STEP = 60 / BPM / 4;
let AC = null, OUT = null, muted = false, T0 = 0, musicTimer = null, nextStepT = 0, stepI = 0;
let musicMode = 'off';   // off | wave | shop
// the single entry point for music; other files must not assign musicMode directly
function setMusicState(mode, intensity = 0) {
  musicMode = mode;
}
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


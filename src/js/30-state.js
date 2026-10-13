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


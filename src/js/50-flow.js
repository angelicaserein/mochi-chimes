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
  b.innerHTML = '<div class="shop-visual"><canvas class="demo" width="280" height="128"></canvas></div><h3>' + d.name + '</h3><div class="mtag">' + d.tag + '</div>' +
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
      b.className = 'card shop-item' + cls;
      b.innerHTML = '<div class="shop-visual"><canvas width="64" height="64"></canvas></div><h3>' + it.name + '</h3><p>' + it.desc + '</p><div class="cost">◆ ' + it.cost + '</div>';
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


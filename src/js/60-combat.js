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
      if (clearT <= 0) { if (finalWin) { phase = 'end'; setMusicState('off'); showEnd(true); } else openShop(); }
    }
  }
}


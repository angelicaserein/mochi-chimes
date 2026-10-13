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


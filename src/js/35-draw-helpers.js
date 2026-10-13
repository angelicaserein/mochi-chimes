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


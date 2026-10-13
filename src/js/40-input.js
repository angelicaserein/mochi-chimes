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


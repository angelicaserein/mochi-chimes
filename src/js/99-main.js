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

import './style.css';
import { Game, FLAG_LOWER_SECONDS } from './game';
import { createWorld } from './world';

const soundIcon = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 8q5 4 0 8M18 5q8 7 0 14"/></svg>';
const muteIcon = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4Z M16 9l6 6m0-6-6 6"/></svg>';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<main class="shell">
  <section class="game-frame" aria-label="Exalted Brothers platform game">
    <h1 class="game-title">Exalted Brothers</h1>
    <canvas id="game" tabindex="0" aria-label="Game. Arrow keys or A and D to move, Space to jump, Escape to pause."></canvas>
    <div class="hud"><div class="hud-left"><div class="hud-item"><span class="coin-symbol">I</span><div class="hud-text"><span class="small-label">Coins</span><span class="hud-value" id="coins">00 <span style="opacity:1;font-size:16px">/ 10</span></span></div></div><div class="hud-item"><div class="hud-text"><span class="small-label">Time</span><span class="hud-value" id="time">00:00</span></div></div></div><div class="hud-actions"><button class="icon-button" id="help" aria-label="How to play">?</button><button class="icon-button" id="sound" aria-label="Enable sound" aria-pressed="false">${muteIcon}</button><button class="icon-button" id="pause" aria-label="Pause game"><svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg></button></div></div>
    <span class="level-tag">WORLD 01 &nbsp; / &nbsp; THE SUNNY SIDE</span>
    <div class="toast" id="toast" role="status"></div>
    <div class="touch-controls"><div class="touch-group"><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button></div><button data-control="jump" aria-label="Jump">↑</button></div>
    <div class="overlay" id="overlay"><div class="start-card"><div class="card-kicker">YOUR LITTLE ESCAPE</div><h2>Adventure awaits.</h2><p>Collect the coins. Mind the gaps.<br>There’s a flag with your name on it.</p><button class="primary" id="start" disabled>Loading the world… <span>↗</span></button><small>Arrow keys to move · Space to jump</small></div></div>
  </section>
  <span id="announcement" class="sr-only" role="status" aria-live="polite"></span>
</main>`;

const game = new Game();
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const input = { left: false, right: false, jump: false };
const pressed = new Set<string>();
const touch = new Set<string>();
let loaded = false, muted = true, audio: AudioContext | undefined, toastTimer = 0;
let pendingWin = false;
const timeText = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
function syncInput() {
  input.left = pressed.has('ArrowLeft') || pressed.has('KeyA') || touch.has('left');
  input.right = pressed.has('ArrowRight') || pressed.has('KeyD') || touch.has('right');
  input.jump = pressed.has('Space') || pressed.has('ArrowUp') || pressed.has('KeyW') || touch.has('jump');
}
function clearInput() { pressed.clear(); touch.clear(); syncInput(); }
function tone(frequency: number, duration = .09, delay = 0) {
  if (muted || !audio) return;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  const when = audio.currentTime + delay;
  oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(.035, when); gain.gain.exponentialRampToValueAtTime(.001, when + duration);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(when); oscillator.stop(when + duration);
}
function showToast(message: string) {
  const el = document.querySelector<HTMLDivElement>('#toast')!;
  el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('visible'), 1800);
  document.querySelector('#announcement')!.textContent = message;
}
function start() { if (!loaded) return; game.start(); overlay.hidden = true; clearInput(); canvas.focus(); }
function restart() { if (!loaded) return; pendingWin = false; game.restart(); clearInput(); overlay.hidden = true; canvas.focus(); }
function pause() {
  if (!loaded || game.status === 'ready' || game.status === 'won') return;
  if (game.status === 'paused') { start(); return; }
  game.status = 'paused'; clearInput(); overlay.hidden = false;
  overlay.innerHTML = `<div class="start-card"><div class="card-kicker">TAKE A BREATHER</div><h2>Little intermission.</h2><p>Your adventure will be right here.</p><button class="primary" id="resume">Keep going <span>→</span></button><small>Or press Escape to resume</small></div>`;
  document.querySelector('#resume')!.addEventListener('click', start);
  (document.querySelector('#resume') as HTMLButtonElement).focus();
}
function win() {
  pendingWin = false;
  clearInput(); overlay.hidden = false;
  overlay.innerHTML = `<div class="start-card"><div class="card-kicker">A LITTLE VICTORY</div><h2>You made it!</h2><p>${game.score} of 10 coins · ${timeText(game.elapsed)}<br>${game.score === 10 ? 'Every last coin. Beautifully done.' : 'The sunny side looks good on you.'}</p><button class="primary" id="replay">One more adventure <span>↗</span></button><small>${game.deaths ? `${game.deaths} ${game.deaths === 1 ? 'retry' : 'retries'} · ` : ''}Thanks for playing Exalted Brothers.</small></div>`;
  document.querySelector('#replay')!.addEventListener('click', restart);
  (document.querySelector('#replay') as HTMLButtonElement).focus();
  document.querySelector('#announcement')!.textContent = `Level complete. ${game.score} of ten coins. Time ${timeText(game.elapsed)}.`;
}
document.querySelector('#start')!.addEventListener('click', start);
document.querySelector('#pause')!.addEventListener('click', pause);
document.querySelector('#sound')!.addEventListener('click', async () => {
  muted = !muted;
  if (!muted) { audio ??= new AudioContext(); await audio.resume(); tone(660); }
  const button = document.querySelector<HTMLButtonElement>('#sound')!;
  button.innerHTML = muted ? muteIcon : soundIcon;
  button.setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound'); button.setAttribute('aria-pressed', String(!muted));
});
document.querySelector('#help')!.addEventListener('click', (event) => {
  event.preventDefault();
  if (!loaded) return;
  if (game.status === 'playing') { game.status = 'paused'; clearInput(); }
  overlay.hidden = false;
  overlay.innerHTML = `<div class="start-card"><div class="card-kicker">FIELD NOTES</div><h2>A hop, skip & a jump.</h2><div class="help-copy"><p>Move with ← → or A / D. Jump with Space, ↑ or W. Hold jump for extra height.</p><p>Collect ten coins, jump over the gaps, and bounce on the beetle. Reach the orange flag to finish.</p><p>R restarts. Escape pauses. On touchscreens, use the on-screen buttons.</p></div><button class="primary close-help" id="close-help">Let's play <span>→</span></button></div>`;
  document.querySelector('#close-help')!.addEventListener('click', () => { if (game.status === 'won') win(); else start(); });
  (document.querySelector('#close-help') as HTMLButtonElement).focus();
});
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW'].includes(e.code) && e.target === canvas) { e.preventDefault(); pressed.add(e.code); syncInput(); }
  if (e.repeat) return;
  if (e.code === 'Escape') pause();
  if (e.code === 'KeyR' && e.target === canvas) restart();
});
window.addEventListener('keyup', (e) => { pressed.delete(e.code); syncInput(); });
window.addEventListener('blur', () => { clearInput(); if (game.status === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (game.status === 'playing') pause(); } });
document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach(button => {
  const control = button.dataset.control!;
  button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); touch.add(control); syncInput(); });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, () => { touch.delete(control); syncInput(); });
});

let accumulator = 0;
createWorld(canvas, game, (delta) => {
  accumulator += Math.min(delta, .1);
  while (accumulator >= 1 / 120) {
    game.step(1 / 120, input); accumulator -= 1 / 120;
    for (const event of game.events) {
      if (event === 'jump') tone(330, .13);
      if (event === 'coin') { tone(880); tone(1320, .13, .07); }
      if (event === 'stomp') tone(180, .13);
      if (event === 'death') { tone(150, .2); showToast('A fresh start. You’ve got this.'); }
      if (event === 'win') { [523,659,784,1047].forEach((n, i) => tone(n, .2, i * .12)); clearInput(); pendingWin = true; }
    }
  }
  if (pendingWin && game.finishTime >= FLAG_LOWER_SECONDS + .2) win();
  document.querySelector('#coins')!.innerHTML = `${String(game.score).padStart(2, '0')} <span style="opacity:1;font-size:16px">/ 10</span>`;
  document.querySelector('#time')!.textContent = timeText(game.elapsed);
}).then(() => {
  loaded = true;
  const startButton = document.querySelector<HTMLButtonElement>('#start')!;
  startButton.disabled = false; startButton.innerHTML = `Let's play <span>↗</span>`;
}).catch(error => {
  console.error(error);
  overlay.hidden = false;
  overlay.innerHTML = `<div class="start-card"><div class="card-kicker">A QUICK PIT STOP</div><h2>A little more GPU, please.</h2><p>This demo needs WebGPU.<br>Try an updated Chrome or Edge browser<br>with hardware acceleration enabled.</p><button class="primary" id="retry">Try again <span>↗</span></button></div>`;
  document.querySelector('#retry')!.addEventListener('click', () => location.reload());
});

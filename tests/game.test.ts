import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, coinLocations, FLAG_LOWER_SECONDS } from '../src/game.ts';
const idle = { left: false, right: false, jump: false };
const right = { ...idle, right: true };
function advance(g: Game, seconds: number, input = idle) {
  for (let i = 0; i < seconds * 120; i++) g.step(1 / 120, input);
}
test('ready and paused states freeze simulation', () => {
  const g = new Game(); advance(g, 1, right); assert.equal(g.x, 1.5);
  g.start(); g.status = 'paused'; advance(g, 1, right); assert.equal(g.elapsed, 0);
});
test('holding jump reaches higher than tapping', () => {
  const high = new Game(), low = new Game(); high.start(); low.start();
  high.step(1 / 120, { ...idle, jump: true }); low.step(1 / 120, { ...idle, jump: true });
  advance(high, .25, { ...idle, jump: true }); advance(low, .25);
  assert.ok(high.y > low.y + .2);
});
test('a full jump clears a course gap', () => {
  const g = new Game(); g.start(); g.x = 11; g.vx = 4.8;
  advance(g, .73, { ...right, jump: true });
  assert.equal(g.deaths, 0); assert.ok(g.x > 14.2); assert.ok(g.y >= 0);
  advance(g, .2, right); assert.equal(g.grounded, true);
});
test('coin collection is unique and restart resets it', () => {
  const g = new Game(); g.start(); g.x = coinLocations[0][0]; g.step(1 / 120, idle);
  assert.equal(g.score, 1); advance(g, .2); assert.equal(g.score, 1);
  g.restart(); assert.equal(g.score, 0); assert.equal(g.elapsed, 0);
});
test('falling resets the run immediately', () => {
  const g = new Game(); g.start(); g.x = 13; g.y = -4.9; g.vy = -10;
  advance(g, .1); assert.equal(g.deaths, 1); assert.equal(g.x, 1.5); assert.equal(g.y, 0);
});
test('beetle side collision kills, landing on it bounces', () => {
  const hit = new Game(); hit.start(); hit.x = hit.enemyX; hit.step(1 / 120, idle);
  assert.equal(hit.deaths, 1);
  const stomp = new Game(); stomp.start(); stomp.x = stomp.enemyX; stomp.y = .72; stomp.vy = -3;
  advance(stomp, .05); assert.equal(stomp.enemyAlive, false); assert.equal(stomp.deaths, 0); assert.ok(stomp.vy > 0);
});
test('the full course can be completed and all ten coins collected', () => {
  const g = new Game(); g.start();
  // Traverse with jumps at each raised platform, gap, and the beetle.
  const jumps = [5.9, 10.7, 19.8, 26.7, 34.8, 38.5, 41.8, 48.8];
  let jumpIndex = 0, hold = 0;
  for (let i = 0; i < 120 * 30 && g.status === 'playing'; i++) {
    if (jumpIndex < jumps.length && g.x >= jumps[jumpIndex] && g.grounded) { hold = .37; jumpIndex++; }
    hold -= 1 / 120;
    g.step(1 / 120, { ...right, jump: hold > 0 });
  }
  assert.equal(g.deaths, 0); assert.equal(g.status, 'won'); assert.equal(g.score, 10);
});
test('finish animation advances while the score timer stays frozen and replay resets it', () => {
  const g = new Game(); g.start(); g.x = 59; g.step(1 / 120, idle);
  assert.equal(g.status, 'won');
  const finalTime = g.elapsed;
  advance(g, FLAG_LOWER_SECONDS + .25);
  assert.ok(g.finishTime >= FLAG_LOWER_SECONDS); assert.equal(g.elapsed, finalTime);
  g.restart(); assert.equal(g.finishTime, 0); assert.equal(g.status, 'playing');
});
test('squash animation pauses with gameplay and resets when the enemy respawns', () => {
  const g = new Game(); g.start(); g.x = g.enemyX; g.y = .72; g.vy = -3;
  advance(g, .05); assert.equal(g.enemyAlive, false);
  advance(g, .2); assert.ok(g.enemySquashTime >= .2);
  g.status = 'paused'; const squashTime = g.enemySquashTime;
  advance(g, 1); assert.equal(g.enemySquashTime, squashTime);
  g.die(); assert.equal(g.enemyAlive, true); assert.equal(g.enemySquashTime, 0);
});

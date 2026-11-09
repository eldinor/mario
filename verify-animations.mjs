import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-webgpu'] });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  // Exercise the real renderer and collision logic in an isolated browser scene.
  await page.route('**/src/main.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    import '/src/style.css?import';
    import { Game } from '/src/game.ts';
    import { createWorld } from '/src/world.ts';
    document.querySelector('#app').innerHTML = '<canvas style="width:100vw;height:100vh"></canvas>';
    const game = new Game(); game.start(); game.x = game.enemyX; game.y = .72; game.vy = -3;
    let mode = 'stomp';
    window.animationQA = { game, finish() { game.restart(); game.x = 59; mode = 'finish'; }, reset() { game.restart(); mode = 'reset'; } };
    createWorld(document.querySelector('canvas'), game, dt => {
      if (mode === 'stomp' && game.enemySquashTime >= .25) return;
      game.step(Math.min(dt, 1/60), { left: false, right: false, jump: false });
    }).then(() => window.animationQA.ready = true).catch(error => console.error(error));
  ` }));
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(() => window.animationQA?.ready && window.animationQA.game.enemySquashTime >= .25, null, { timeout: 10000 }).catch(async error => { console.log(await page.evaluate(() => ({ qa: window.animationQA, scripts: [...document.scripts].map(s => s.src) }))); throw error; });
  assert.equal(await page.evaluate(() => window.animationQA.game.enemyAlive), false);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'qa-squash.png' });
  await page.evaluate(() => window.animationQA.finish());
  await page.waitForFunction(() => window.animationQA.game.finishTime > .03);
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'qa-flag-lowering.png' });
  await page.waitForFunction(() => window.animationQA.game.finishTime >= 1.3);
  await page.screenshot({ path: 'qa-flag-down.png' });
  await page.evaluate(() => window.animationQA.reset());
  assert.deepEqual(await page.evaluate(() => ({ finishTime: window.animationQA.game.finishTime, alive: window.animationQA.game.enemyAlive, squash: window.animationQA.game.enemySquashTime })), { finishTime: 0, alive: true, squash: 0 });
  assert.deepEqual(errors, []);
  console.log('PASS: stomp squash, flag lowering, and replay reset rendered in WebGPU.');
} finally { await browser.close(); }

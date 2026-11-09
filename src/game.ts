export type Platform = { left: number; right: number; top: number; bottom: number };
export const platforms: Platform[] = [
  ...[[-3, 12], [14.2, 28], [30.4, 43], [45.4, 64]].map(([left, right]) => ({ left, right, top: 0, bottom: -3 })),
  { left: 7, right: 9.4, top: 1.35, bottom: .8 },
  { left: 21, right: 24, top: 1.5, bottom: .95 },
  { left: 36, right: 38.6, top: 1.25, bottom: .7 },
  { left: 50, right: 52.6, top: 1.5, bottom: .95 },
];
export const coinLocations = [[5, 1], [8, 2.35], [11, 1], [18, 1], [22, 2.5], [26, 1], [33, 1], [37, 2.25], [48, 1], [51.3, 2.5]];
export const PLAYER_HALF = .31;
export const PLAYER_HEIGHT = 1.18;
export const FLAG_LOWER_SECONDS = 1.2;
export type Input = { left: boolean; right: boolean; jump: boolean };
export class Game {
  x = 1.5; y = 0; vx = 0; vy = 0; facing = 1; grounded = true;
  status: 'ready' | 'playing' | 'paused' | 'won' = 'ready';
  coins = coinLocations.map(() => false);
  enemyX = 40; enemyAlive = true; enemyDirection = -1;
  enemySquashTime = 0; finishTime = 0;
  elapsed = 0; deaths = 0; coyote = .1; jumpBuffer = 0; previousJump = false;
  events: ('jump' | 'coin' | 'stomp' | 'death' | 'win')[] = [];
  get score() { return this.coins.filter(Boolean).length; }
  start() { this.status = 'playing'; }
  restart() {
    this.x = 1.5; this.y = 0; this.vx = 0; this.vy = 0; this.facing = 1; this.grounded = true;
    this.coins.fill(false); this.enemyX = 40; this.enemyAlive = true; this.enemyDirection = -1;
    this.enemySquashTime = 0; this.finishTime = 0;
    this.elapsed = 0; this.deaths = 0; this.coyote = .1; this.jumpBuffer = 0; this.previousJump = false;
    this.events = []; this.start();
  }
  die() {
    this.events.push('death'); this.deaths++;
    this.x = 1.5; this.y = 0; this.vx = 0; this.vy = 0; this.grounded = true; this.coyote = .1;
    this.jumpBuffer = 0; this.coins.fill(false); this.enemyAlive = true; this.enemyX = 40; this.enemyDirection = -1;
    this.enemySquashTime = 0; this.finishTime = 0;
  }
  step(dt: number, input: Input) {
    this.events = [];
    if (this.status === 'won') { this.finishTime += dt; return; }
    if (this.status !== 'playing') return;
    if (!this.enemyAlive) this.enemySquashTime += dt;
    this.elapsed += dt;
    if (input.jump && !this.previousJump) this.jumpBuffer = .12;
    this.previousJump = input.jump;
    this.jumpBuffer -= dt;
    this.coyote = this.grounded ? .1 : this.coyote - dt;
    const direction = Number(input.right) - Number(input.left);
    const target = direction * 4.8;
    const acceleration = this.grounded ? 32 : 22;
    this.vx += Math.max(-acceleration * dt, Math.min(acceleration * dt, target - this.vx));
    if (direction) this.facing = direction;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = 8.8; this.grounded = false; this.coyote = 0; this.jumpBuffer = 0; this.events.push('jump');
    }
    const previousY = this.y;
    this.vy -= (this.vy > 0 && !input.jump ? 34 : 23) * dt;
    this.x = Math.max(-1.8, this.x + this.vx * dt);
    for (const p of platforms) {
      if (this.y + PLAYER_HEIGHT > p.bottom + .01 && this.y < p.top - .01 && this.x + PLAYER_HALF > p.left && this.x - PLAYER_HALF < p.right) {
        if (this.vx > 0) this.x = p.left - PLAYER_HALF;
        if (this.vx < 0) this.x = p.right + PLAYER_HALF;
        this.vx = 0;
      }
    }
    this.y += this.vy * dt; this.grounded = false;
    for (const p of platforms) {
      if (this.x + PLAYER_HALF > p.left && this.x - PLAYER_HALF < p.right) {
        if (this.vy <= 0 && previousY >= p.top - .01 && this.y <= p.top) {
          this.y = p.top; this.vy = 0; this.grounded = true;
        } else if (this.vy > 0 && previousY + PLAYER_HEIGHT <= p.bottom && this.y + PLAYER_HEIGHT >= p.bottom) {
          this.y = p.bottom - PLAYER_HEIGHT; this.vy = 0;
        }
      }
    }
    coinLocations.forEach(([x, y], i) => {
      if (!this.coins[i] && Math.abs(this.x - x) < .65 && Math.abs(this.y + .65 - y) < .9) {
        this.coins[i] = true; this.events.push('coin');
      }
    });
    if (this.enemyAlive) {
      this.enemyX += this.enemyDirection * .85 * dt;
      if (this.enemyX < 39.4) { this.enemyX = 39.4; this.enemyDirection = 1; }
      if (this.enemyX > 42) { this.enemyX = 42; this.enemyDirection = -1; }
      if (Math.abs(this.x - this.enemyX) < .66 && this.y < .7 && this.y + PLAYER_HEIGHT > .05) {
        if (this.vy < 0 && previousY >= .53) {
          this.enemyAlive = false; this.y = .68; this.vy = input.jump ? 8.8 : 6;
          this.grounded = false; this.events.push('stomp');
        } else { this.die(); return; }
      }
    }
    if (this.y < -5) { this.die(); return; }
    if (this.x >= 59 && this.grounded) { this.status = 'won'; this.vx = 0; this.finishTime = 0; this.events.push('win'); }
  }
}

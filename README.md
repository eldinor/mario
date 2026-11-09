# Exalted Brothers

A tiny, original 2.5D platforming tribute. One sunny course, ten coins, three gaps, one beetle, and a finish flag. All 3D assets are built from primitives; no models or game assets are downloaded at runtime.

## Run

Requires Node.js 22.12+ and a browser with WebGPU and hardware acceleration enabled.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. Use arrow keys or A/D to move, Space/Up/W to jump, R to restart, and Escape to pause. Hold jump for a higher arc. Touch controls appear on touchscreens. Sound is optional and starts muted.

Collect coins and reach the orange flag. Falling or touching the beetle from the side immediately resets coins and position; the timer keeps running. Landing on the beetle defeats it and gives a bounce. Replay starts a fresh timer.

## Stack

- Babylon Lite 1.39.0 (latest published version verified at setup)
- Vite 8.3.7
- TypeScript 7.0.2
- Static site, no backend or environment secrets

## Checks

```sh
npm test
npm run build
node verify-browser.mjs
node verify-animations.mjs
```

The browser checks expect Vite at `http://127.0.0.1:5173` and installed Chrome. They check actual WebGPU rendering, keyboard input, coin collection, pause/resume, restart, sound, help, full-screen desktop and mobile layouts, touch controls, enemy squashing, flag lowering, and replay resets. Gameplay tests cover the full course and all ten coins at a fixed 120 Hz simulation step.

`src/game.ts` owns deterministic gameplay; `src/world.ts` builds and animates the Babylon Lite scene; `src/main.ts` owns UI and input. Google Fonts is optional: system fonts remain available offline. Babylon Lite is WebGPU-only; unsupported devices get a clear retry screen.

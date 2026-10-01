# Mountain Chicken

A static Phaser 3 / TypeScript / Vite browser game, being built in the phases defined in [the master specification](MOUNTAIN_CHICKEN_GAME_MASTER_SPEC.md).

## Current state: Phase 1

- Responsive 1280 × 720 game canvas, fitted to the window with letterboxing.
- BootScene → MenuScene → ForestScene lifecycle.
- Temporary code-drawn title atmosphere, subtle animated particles, start button and fade.
- Blank forest development scene with a spawn marker; return by button or Escape.
- Accessible HTML interface with keyboard focus and local system fonts.
- Arcade physics configuration ready for Phase 2.

The spawn marker is a development placeholder. Frog movement, final art, science content and story systems are intentionally reserved for later phases.

## Run locally

Install Node.js 22.12 or newer with npm, then open a terminal in this folder:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).
On Windows, use `npm.cmd` if PowerShell blocks the npm script shim.

## Production

```sh
npm run build
npm run preview
```

Build runs strict TypeScript checking before emitting `dist/`. Preview serves that output locally. Copy the entire `dist/` directory to a static host, including Firebase Hosting; the game has no Firebase runtime dependency. There is no backend or account system.

For offline presentation, keep the built directory and a local HTTP server on the presentation device. Install dependencies before losing internet, then `npm run preview` works without internet. Opening `dist/index.html` directly with `file://` is not a supported launch method. An uncached hosted page is not automatically available offline.

All current visuals are generated locally in code. Phaser is bundled; there are no remote fonts, media, CDNs or gameplay requests.

## Architecture

```text
src/
  main.ts                 Phaser setup and hot-reload cleanup
  style.css               Responsive shell and presentation interface
  scenes/
    BootScene.ts          Initial scene routing
    MenuScene.ts          Title atmosphere and scene transition
    ForestScene.ts        Blank starting scene
  ui/ScreenOverlay.ts     HTML overlay lifecycle
  entities/               Reserved for player and prey
  systems/                Reserved for survival, objectives and checkpoints
  data/                   Reserved for verified species and story data
public/assets/            Reserved local asset categories
```

Folders reserved for later phases contain `.gitkeep` files, not speculative implementations. No unverified biology has been added.

## Verification

Phase 1 verification includes dependency installation, strict TypeScript checking, a production build, local development-server startup, and browser checks of title → forest → title. Phaser's bundled engine exceeds Vite's default 500 kB chunk-warning threshold; this is a warning rather than a failed build. Performance on an actual school Chromebook remains to be tested during presentation QA.

## Exact Phase 2 plan

1. Add `src/entities/Frog.ts` with a clearly temporary local sprite and directional idle/hop animation.
2. Implement normalized WASD/arrow movement so diagonal input is no faster.
3. Add a responsive hop rhythm and a Space quick hop with a short cooldown.
4. Add Arcade physics boundaries and a few development collision blocks.
5. Expand the blank test area beyond the viewport and add a gently eased camera follow.
6. Verify movement, hopping, collisions and resizing; rerun TypeScript and the production build. Tune input feel before starting Phase 3 world construction.

Stop at Phase 1 until Phase 2 is approved, as required by the specification.

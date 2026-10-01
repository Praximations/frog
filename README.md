# Mountain Chicken

A Phaser 3 / TypeScript / Vite game with a playable pixel forest and an optional main-device/controller mode.

## Test it now

From the Frog folder, with Node.js 22.12+ installed:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173 and choose **PLAY SOLO**.

- WASD or arrow keys: move.
- Space while moving: quick hop.
- E near a board or insect: interact.
- Escape or the pause button: pause/resume.

Inspect the field board above your starting point. Follow the gold marker to catch three insects, then cross the wooden bridge and inspect the stream lookout. The direction hint points toward the current goal.

The pause menu can resume, restart the forest, or return to the title. Information cards stop gameplay until you continue. Energy is a simplified game value, not a biological measurement.

## Main device + play screen

```sh
npm run host
```

This builds the game and starts a small Node server on port 3000. Keep that terminal open.

1. On the main computer, open http://localhost:3000 and choose **MAIN DEVICE**. A real six-digit room code appears.
2. On the second device, open a **same-network address printed by the terminal**, for example `http://192.168.x.x:3000`. Both devices must be on a network that allows them to reach the hosting computer.
3. Choose **JOIN GAME**, enter the code, and connect.
4. On the main computer, choose **START FOREST**.
5. Play using the second device's touch controls or keyboard while watching the main screen.

The main browser runs the game. The controller sends inputs and receives the current objective and pause/card state. It can move, hop, interact, continue field notes, and pause/resume. One controller can occupy a room at a time. Main-device keyboard control also remains available.

Use two browser tabs to test pairing on one computer: main screen at `http://localhost:3000`, controller at `http://localhost:3000/#join`. Keep the main screen visible in a separate window so the browser does not throttle it in a background tab.

If a controller disconnects, its movement stops and a replacement can rejoin with the same code. Closing/reloading the main device ends that room; create a new code. If the server connection is lost, the main browser can continue locally with its keyboard.

**Codes only work when both screens use the same running host server.** The dev server at port 5173 and the static preview server are for solo play. If you select MAIN DEVICE there, the interface explains how to start the connection server.

On Windows, use `npm.cmd` if PowerShell blocks the npm script shim. If another device cannot reach the printed address, check that you used the network address rather than localhost, and that the network/firewall permits access to the hosting computer. No firewall settings are changed by this project.

## Build and offline use

```sh
npm run build
npm run preview
```

The build type-checks the project and produces `dist/`. Serve the entire directory through a local HTTP server. With dependencies already installed, solo play and `npm run preview` work without internet; direct `file://` launch is not supported.

The current art is generated locally from small reusable pixel textures. There are no remote images, fonts, media, or gameplay APIs in solo mode. Code pairing only uses the local connection server and can operate on a reachable local network without internet.

## Hosting

`dist/` is still a static solo-game build and can be deployed to Firebase Hosting or another static host. Pairing additionally needs `server/index.mjs` on a Node-compatible host with WebSocket support. Deploying only `dist/` to Firebase Hosting does not provide public online room codes. No public deployment has been configured yet.

The optional relay was added in response to the later request for a main-device code and separate play screen. It extends the original single-device specification; the original brief remains preserved in `MOUNTAIN_CHICKEN_GAME_MASTER_SPEC.md`.

## Current playable content

- A redesigned title screen with solo, main-device, and join choices.
- A connected 2400 x 1600 forest with winding trails, a stream/bridge, layered trees, rocks, ferns, leaf litter, insects, ambient frogs, and drifting particles.
- A shaded, illustrated frog with normalized directional movement, hop rhythm, quick hops, collision boundaries, and eased camera follow.
- Three short objectives, an energy display, interaction prompts, field-note cards, and a pause/restart menu.
- Main-device lobby, six-digit codes, join validation, controller status, and a responsive touch/keyboard play screen.

This is a **playable forest preview**, not the completed 12-20 minute conservation story. Decline events, conservation activities, researched presentation content, the six-degree trail, audio, and full rubric coverage remain future work. Visuals are stylized; the frog sprite is not an identification diagram. Feeding provenance is recorded in `SOURCES.md`.

## Architecture

```text
src/
  main.ts                      Phaser setup and hot-reload cleanup
  scenes/
    BootScene.ts               Initial/deep-link routing
    MenuScene.ts               Title and mode choices
    ForestScene.ts             Gameplay, objectives, interactions, pause
    HostScene.ts               Main-device lobby
    ControllerScene.ts         Code entry and remote controls
  entities/Frog.ts             Movement, visual hops, collision body
  world/ForestWorld.ts         Local pixel textures and environment
  systems/SessionClient.ts     Browser WebSocket session lifecycle
  ui/ScreenOverlay.ts          Accessible HTML overlay lifecycle
  ui/session.css               Lobby/controller layouts
server/
  index.mjs                    Optional static host and pairing relay
  session.test.mjs             Connection and static-serving tests
```

## Checks

```sh
npm run check
npm run build
npm run test:connection
```

Connection tests cover code creation, incorrect codes, occupied rooms, input relay, authoritative host state, disconnect reset, replacement controllers, host shutdown, static serving, and traversal rejection. Browser verification covers main/controller pairing through the network address, remote movement, field-board interaction, field-note continuation, and pause/resume.

Phaser's bundle triggers Vite's 500 kB size warning; builds succeed. Chromebook performance and two separate physical-device testing remain part of future presentation QA.

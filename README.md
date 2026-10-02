# Mountain Chicken — a class game about a giant, disappearing frog

A pixel-art game for a ~10 minute endangered-species presentation. **One person hosts it on the projector** and plays as a mountain chicken frog (*Leptodactylus fallax*) through five short chapters. The class joins on their phones, Kahoot-style, with a game PIN: they answer a quiz after each chapter, send live reactions, drop crickets for the frog to eat, and one classmate can even drive the frog.

Every rubric requirement appears in the game as a numbered **Field Journal** card (1–10). The finale shows all ten together, so you can point at them.

## Run it in class

Requires Node.js 22.12+.

```sh
npm install
npm run host
```

Leave that terminal open. On the projector laptop, open **http://localhost:3000**, press **PLAY**, then **START** when everyone's in.

- The lobby shows a **join address, a big game PIN and a QR code**. Classmates scan the QR (or type the address and PIN) and pick a nickname. Their names pop onto the screen.
- Phones have to be on the **same Wi-Fi** as the laptop. Many school networks block devices from reaching each other. If phones can't connect, turn on a phone hotspot and connect the laptop and phones to it, or just play in presenter mode (below).
- Click a name in the lobby to **make that player the frog pilot**: their phone becomes a controller. Click again to remove a player.

### Presenter mode (no phones)

If there's no class server (for example `npm run dev`, a static host, or school Wi-Fi blocks phones), the game still runs fully. The class shouts quiz answers and you click the one they pick, or press 1–4.

## The 10-minute run sheet

| # | Chapter | What happens | Journal cards (rubric) | ~Time |
|---|---------|--------------|------------------------|-------|
| — | Lobby | PIN + QR, players join, the expedition map gives an overview | — | 1 min |
| 1 | **Meet the Frog** (morning rainforest) | Explore and find 3 discoveries: the field sign, your reflection in a pond, the sea lookout. Golden flies are snacks. | 1 Name · 2 Status · 3 Habitat · 4 Physical description · 5 Picture | 1.5 min |
| 2 | **The Hunt** (dusk) | Flick your tongue (SPACE) at crickets, snails and land crabs to fill your belly. Combos, then a snake appears. Phones drop named crickets: +150 points if the frog eats yours. | 6 Niche | 1 min |
| 3 | **Night of Danger** (2002 →) | Chytrid arrives and the other frogs vanish (the counter crashes). Then a stealth run past the threats: hunters with flashlights (hide in bushes or get a **jump-scare**), chytrid pools, cleared forest with a feral pig, then a hurricane and volcano zone with lava cracks. Reach the burrow. | 7 Reasons it is listed | 2 min |
| 4 | **The Rescue** (Montserrat) | Meet the researchers, find 4 lost frogs that follow you in a line, and lead them through the gate into the solar-heated chytrid-free pools. | 8 Importance · 9 Support | 1.5 min |
| 5 | **Six Degrees** (twilight) | Hop 7 glowing stones from YOU to the frog. Each stone reveals one link in the chain. "Everything is connected." | 10 Six degrees of separation | 1 min |
| — | Finale | Closing line, Kahoot-style podium, all 10 journal cards, sources | all 10 | 1 min |

A quick quiz follows each chapter (20 seconds plus reveal and scoreboard, about 30 s each), then the expedition map shows progress and the top players. Turn quizzes off in the lobby or pause menu if you're short on time.

## Rubric coverage

| Rubric item (2 pts each) | Where it's shown |
|---|---|
| Name (common and scientific) | Card 1 — chapter 1 field sign |
| Status | Card 2 — IUCN Red List scale with Critically Endangered highlighted |
| Habitat (name and description) | Card 3 — map of Dominica and Montserrat, lost islands, forest and climate description |
| Physical description | Card 4 — labelled diagram, size, colours, male and female differences |
| Illustration / picture | Card 5 — field-guide plate (original pixel illustration), plus bonus breeding facts |
| Niche | Card 6 — food-web diagram (secondary or tertiary consumer, top predator), after you hunt |
| Major reasons it is listed | Card 7 — population-crash chart and six threats, after you survive them |
| Importance | Card 8 — predator role, fallaxin antibiotic research, Dominica's coat of arms, science |
| Support being given | Card 9 — Mountain Chicken Recovery Programme timeline, 2004–2025 |
| Six degrees of separation | Card 10 — pet frog → pet shop → global frog trade → chytrid → islands → frog skin → mountain chicken |
| Creativity | The whole game: playable chapters, jump-scare, class quiz, phone controls, podium |
| Extra credit ideas | Bonus facts on card 5 (foam-nest burrows, the mum feeds tadpoles up to 25,000 eggs) and a second, climate-change chain on card 10 |

Press **J** at any time (or the Journal button) to reopen any unlocked card for questions. Every card lists its sources; the full list is in [SOURCES.md](SOURCES.md) and on the finale's *Sources & credits* screen.

**Add a real photo:** put a photo at `public/assets/images/mountain-chicken.jpg` (credit it in SOURCES.md) and it appears on card 5 next to the illustration.

## Controls

| | Keyboard | Phone pilot |
|---|---|---|
| Move | Arrow keys / WASD | D-pad |
| Action (read, talk, tongue) | SPACE / E / Enter | ACTION |
| Continue a card | Enter / Space / E / → | ACTION |
| Field Journal | J | — |
| Pause / presenter menu | Esc | PAUSE |
| Quiz (presenter mode) | 1–4 to choose, Enter to continue | — |

Other phones get: quiz answer buttons (red triangle, blue diamond, yellow circle, green square), reactions (🐸 ❤️ 😱 👏 🔥 🦗) that float up the projector, and **DROP A CRICKET** during the hunt. Phones never download the game engine (about 50 KB), and a phone that locks or drops rejoins with its score.

## Presenter safety net

The pause menu (Esc) has: Resume, Restart chapter, **Skip chapter** (it still shows that chapter's journal cards), Field Journal, **Sound / Jump-scares / Class quizzes** toggles, and *Presenter: jump to…* any chapter, quiz or the finale. Jumping ahead also unlocks the earlier cards, so the journal stays complete. Losing all three hearts just returns you to the last checkpoint.

**About the jump-scare:** getting caught by a hunter's flashlight in chapter 3 flashes a pixel hunter's face with a loud sting for about a second, then explains the hunting threat. It's on by default. Switch **Jump-scares** off in the lobby or pause menu for a gentle "CAUGHT!" instead. It uses one quick zoom, not strobing, and respects the system's reduced-motion setting.

**Frog numbers:** the "FROGS ALIVE" counter is a game simulation (100 → about 15 when chytrid hits → back up as you rescue frogs). Real figures are only quoted on the journal cards, for example 21 wild frogs found on Dominica in 2023.

## Development

```sh
npm run dev        # solo development at http://127.0.0.1:5173 (this computer only)
npm run dev:class  # dev server that phones on the same Wi-Fi can join
npm run build      # type-check + production build into dist/
npm run preview    # serve the build (class mode works on this computer)
npm test           # class-server tests + content/rubric/scoring tests
```

`dist/` also works on a static host (such as Firebase Hosting) or straight from a laptop, in presenter mode. Phone joining needs `server/index.mjs` (or any Node host with WebSockets) serving the build. Everything is local: fonts, art (drawn in code) and sound (synthesized with Web Audio), so the game works without internet once installed.

Console helper for rehearsals: `mcGame.jump(n)` jumps to step *n* (0 = chapter 1, 1 = quiz 1, …, 10 = finale).

### Architecture

```text
src/
  main.ts                 Phones (#join) load phone/PhoneApp; the projector loads game.ts (Phaser)
  game.ts                 Phaser setup and scene list
  data/                   journal.ts (10 rubric cards), quiz.ts, chapters.ts, sources.ts
  scenes/
    MenuScene, LobbyScene     Title; Kahoot-style lobby (PIN, QR, players, expedition overview)
    ChapterScene              Shared HUD, hearts, cards, pause/presenter menu, checkpoints
    Meet/Hunt/Danger/Rescue/ConnectScene   The five chapters
    QuizScene, OverviewScene, FinaleScene  Quiz + scoreboard, expedition map, podium
  phone/PhoneApp.ts       The classmate phone screens (join, answer, react, pilot)
  systems/                ClassHost/ClassPlayer (networking), scoring, run (progress), flow,
                          Sound (Web Audio synth), Settings
  entities/               Frog, critters (ambient frogs, prey)
  world/                  pixels.ts (all pixel art), Art.ts (Phaser textures), Terrain.ts (level painter)
  ui/                     Field Journal cards and visuals, effects (jump-scare, toasts, QR), CSS
server/
  relay.mjs               PIN rooms: host + up to 60 players, validation and rate limits
  index.mjs               Serves dist/ plus the relay (npm run host)
```

The original brief is kept in `MOUNTAIN_CHICKEN_GAME_MASTER_SPEC.md`. This version goes beyond it on purpose: the phone join, quizzes and jump-scare were requested later, to make it a class game for a 10-minute presentation.

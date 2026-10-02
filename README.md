# Mountain Chicken — a class pond party about a giant, disappearing frog

A pixel-art party game for a ~10 minute endangered-species presentation. **One person hosts it on the projector.** Every classmate joins on their phone and becomes their own mountain chicken frog (*Leptodactylus fallax*) in a shared pond. The phone is just a **joystick**: drag to move, and your frog eats or grabs things by touching them.

The class splits into **Team Dominica vs Team Montserrat**, the frog's two home islands, and competes over three short rounds. Between rounds, quick learning breaks show the **Field Journal** cards: one card for each of the 10 information requirements.

## Run it in class

Requires Node.js 22.12+.

```sh
npm install
npm run host
```

Leave that terminal open. On the projector laptop, open **http://localhost:3000** and press **PLAY**.

- The pond shows a **join address, a code and a QR code**. Classmates scan it (or type the address and code) and pick a frog name. Their frog hops into the pond right away and they can move around to warm up.
- Teams are balanced automatically. Click a name on a team card to move that player to the other team or remove them.
- Press **START** (or Enter) when everyone is in.
- Phones must be on the **same Wi-Fi** as the laptop. Many school networks block this. If phones can't connect, put the laptop and phones on a phone hotspot.

### No phones?

Two people can play on the laptop: **ARROWS** and **WASD** each control a frog (just start moving to join). Computer "Wild Frogs" join any team with fewer than two players, so it's always a match. This also works on `npm run dev`, a static host or an offline copy.

## The 10-minute run sheet

| | Part | What happens | Field Journal cards | ~Time |
|---|---|---|---|---|
| | Lobby | Code and QR, frogs hop in as people join | — | 1 min |
| 1 | Learning break | *Meet the mountain chicken* | 1 Name · 2 Status · 3 Habitat | 1 min |
| 2 | **Round 1: Feeding Frenzy** | Everyone hunts at once: cricket 1, land crab 3, golden cricket 5 | — | 1 min |
| 3 | Learning break | *The frog you just played* | 4 Physical description · 5 Picture · 6 Niche | 1.5 min |
| 4 | **Round 2: Night of Danger** | Grab glowing bugs in the dark. Hunters sweep flashlights: get caught and you lose 3 points and get a **jump-scare** on your phone (the first catch also gets one on the projector). Hide in bushes; green chytrid pools slow you down. | — | 1 min |
| 5 | Learning break | *Why it is disappearing* | 7 Reasons it is listed | 1 min |
| 6 | **Round 3: Rescue Relay** | Carry lost frogs, one at a time, into your team's solar-heated pool (+5). The feral pig knocks them loose. | — | 1 min |
| 7 | Learning break | *Saving the mountain chicken* | 8 Importance · 9 Support · 10 Six degrees | 1.5 min |
| | Final results | Winning team, top-3 podium, all 10 journal cards, sources | all 10 | 1 min |

After each round, a results card shows which team won the round and the top three frogs. Facts pop up during the rounds too (for example, hunting statistics during the night round).

## Rubric coverage

| Rubric item (2 pts each) | Card | Shown in |
|---|---|---|
| Name (common and scientific) | 1 | Learning break 1 |
| Status | 2 | Learning break 1 (IUCN Red List scale) |
| Habitat (name and description) | 3 | Learning break 1 (island map and climate) |
| Physical description | 4 | Learning break 2 (labelled diagram) |
| Illustration / picture | 5 | Learning break 2 (field-guide plate) |
| Niche | 6 | Learning break 2, right after the feeding round (food web) |
| Major reasons it is listed | 7 | Learning break 3, right after the night round (population-crash chart, six threats) |
| Importance | 8 | Learning break 4 |
| Support being given | 9 | Learning break 4 (recovery programme timeline) |
| Six degrees of separation | 10 | Learning break 4 (pet frog → … → mountain chicken) |
| Creativity | — | The whole game: phone joysticks, teams, three rounds, jump-scare |
| Extra credit ideas | 5, 10 | Bonus breeding facts on card 5; a second, climate-change chain on card 10 |

Press **J** (outside a round) to open the Field Journal and reopen any card. Every card lists its sources; the full list is in [SOURCES.md](SOURCES.md) and on the final *Sources & credits* screen.

**Add a real photo:** put one at `public/assets/images/mountain-chicken.jpg` (credit it in SOURCES.md) and it appears on card 5.

## Controls

| Who | How |
|---|---|
| Classmates | Phone joystick: drag to move. Touching does everything else (eat, grab, deliver). |
| Laptop players | ARROWS, or WASD |
| Presenter | **Enter / Space** to go on (start, start round, next) · cards: Enter / Space / → · **Esc** presenter menu · **J** Field Journal |

During learning breaks and results, phones show the topic and six reaction buttons (🐸 ❤️ 😱 👏 🔥 🦗) that float up the projector. Phones download a tiny page (about 50 KB, no game engine). A phone that locks or drops rejoins with the same frog and points.

## Presenter safety net

**Esc** opens the presenter menu: Resume, **End round now**, **Skip ahead**, Field Journal, Back to lobby (keeps players, resets scores), **Sound** and **Jump-scare** toggles, Quit to title.

**About the jump-scare:** in the night round, a caught player's phone flashes a pixel hunter's face with a sting sound and a buzz. The first catch of the round also shows it full-screen on the projector, with the real hunting fact. Switch **Jump-scares** off in the lobby or menu for a gentle "CAUGHT!" instead. It's one quick zoom, not strobing, and respects the system's reduced-motion setting.

Points are just for the game. Real numbers only appear on the journal cards, for example 21 wild frogs found on Dominica in 2023.

## Development

```sh
npm run dev        # solo development at http://127.0.0.1:5173 (keyboard players and computer frogs)
npm run dev:class  # dev server that phones on the same Wi-Fi can join
npm run build      # type-check + production build into dist/
npm run preview    # serve the build (phones can join from this computer)
npm test           # class-server tests + content, rubric and team-logic tests
```

`dist/` also works on a static host (such as Firebase Hosting) or offline, with laptop players and computer frogs. Phone joining needs `server/index.mjs` (or any Node host with WebSockets) serving the build. Everything is local: fonts, art (drawn in code) and sound (synthesized with Web Audio).

### Architecture

```text
src/
  main.ts                 Phones (#join) load phone/PhoneApp; the projector loads game.ts (Phaser)
  data/                   journal.ts (the 10 rubric cards), rounds.ts (rounds + run order), sources.ts
  scenes/
    MenuScene             Title
    PondScene             Lobby, learning breaks, round intros/countdown, rounds, results (one shared pond)
    FinaleScene           Winning team, podium, completed journal, sources
  rounds/                 FeastRound, NightRound, RescueRound (each: start, update, botTarget, end)
  entities/               PartyFrog (a player's frog), Critters (prey, decorative frogs)
  phone/PhoneApp.ts       Join screen and joystick
  systems/                ClassHost / ClassPlayer (networking), match (teams, totals, ranking), Sound, Settings
  world/                  pixels.ts (all pixel art), Art.ts (Phaser textures), Terrain.ts (ground painter)
  ui/                     Field Journal cards and visuals, effects (jump-scare, toasts, QR), CSS
server/
  relay.mjs               Join rooms: host + up to 60 players, joystick relay, validation, rate limits
  index.mjs               Serves dist/ plus the relay (npm run host)
```

The original brief is kept in `MOUNTAIN_CHICKEN_GAME_MASTER_SPEC.md`. This version deliberately goes beyond it: it became a group game played on phones because that's what the class presentation needed.

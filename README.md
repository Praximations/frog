# Mountain Chicken — a class frog party about a giant, disappearing frog

A pixel-art party game for a ~10 minute endangered-species presentation. **One person hosts it on the projector.** Every classmate joins on their phone and becomes their own mountain chicken frog (*Leptodactylus fallax*). The phone is just a **joystick**.

**How to play (that's all of it):**

1. Move your frog with your phone.
2. Get close to bugs to eat them.
3. Don't get caught by humans or traps!

It's **Team Dominica vs Team Montserrat**, the frog's two home islands. Most points wins.

## Run it in class

There are two ways. **Firebase is easier in class**: it's a normal website, so phones can join over any Wi-Fi or mobile data.

### Option A: online with Firebase (project `frog-94c78`)

One-time setup (about 5 minutes, free, no credit card):

1. Go to [console.firebase.google.com](https://console.firebase.google.com), open the **Frog** project, then **Build → Realtime Database → Create Database**. Pick **United States (us-central1)** and **Start in locked mode**. (The game uploads its own database rules when you deploy.)
2. On your computer (needs [Node.js 22.12+](https://nodejs.org)), in this folder:

   ```sh
   npm install
   npm run firebase:login
   ```

   This opens a browser so you can sign in with the Google account that owns the project.

To put the game online (and again after any change):

```sh
npm run deploy
```

Then open **https://frog-94c78.web.app** on the projector and press **PLAY**. Classmates scan the QR code or go to the same address and type the code.

- The free Spark plan is enough (up to 100 phones at once).
- If you skipped step 1, the game still works with keyboards, and the lobby says the database isn't set up.

### Option B: from your laptop with `npm run host`

```sh
npm install
npm run host
```

Leave that terminal open. On the projector laptop, open **http://localhost:3000** and press **PLAY**. Phones must be on the **same Wi-Fi** as the laptop. Many school networks block this; a phone hotspot usually works.

### No phones?

Two people can play on the laptop with **ARROWS** and **WASD**, and computer "Wild Frogs" fill any team with fewer than two players. This works everywhere, even offline.

## The 10-minute run sheet

Press **Enter** (or click the big button) to move on at every step.

| Part | What happens | ~Time |
|---|---|---|
| Intro | "This is a MOUNTAIN CHICKEN." A chicken wanders in… and a giant frog leaps in and eats it. Reveal: the mountain chicken is a **frog**, *Leptodactylus fallax*, **Critically Endangered**. | 15 s |
| Lobby | Join address, code and QR code. Frogs drop into the pond as people join. Teams balance automatically (click a name to move or remove someone). | 1–2 min |
| How to play | The three rules, big. Starts by itself after 12 seconds. | 15 s |
| **The game** | 2½ minutes. It gets darker as it goes. Hunters with flashlights walk in and catch frogs (−3 points); later they set cage traps. Surprises: bug swarms, a 10-point golden cricket, and double points at the end. | 2.5 min |
| Results | Winning team, top-3 podium. | 30 s |
| The real story | The 10 fact cards, one per rubric item (short: a title, one line, up to four points). | 4 min |
| Thank you | Tips to help, all 10 cards to reopen for questions, and sources. | 30 s |

## Jump-scares

- **Getting caught:** the caught player's phone flashes a hunter's face with a sting sound and a buzz. The **first** catch of the game also shows it full-screen on the projector, with a real hunting fact.
- **The secret scare:** once per game, at a random moment, **2–3 random phones** (1 in a group of three or fewer) suddenly show "Connection lost… hold your phone still". A few seconds later a screaming face fills the screen with a loud shriek and a long buzz. Then it tells them they got the secret scare and to keep it quiet. Nobody else knows it's coming.

Switch **Jump-scares** off in the presenter menu (**Esc**) for a gentle "CAUGHT!" and no secret scare. The scares are one quick zoom, not strobing. Tell everyone to turn their phone sound up for the full effect (the buzz only works on Android phones).

## Rubric coverage

| Rubric item (2 pts each) | Where |
|---|---|
| Name (common and scientific) | Intro reveal and card 1 |
| Status | Intro stamp and card 2 (IUCN Red List scale) |
| Habitat (name and description) | Card 3 (island map) |
| Physical description | Card 4 |
| Illustration / picture | Card 5 (field-guide plate), plus the pixel frog everywhere |
| Niche | Card 6 (food chain); in the game you're a predator eating bugs |
| Major reasons it is listed | Card 7 (population-crash chart); in the game, hunters and traps |
| Importance | Card 8 (Dominica's coat of arms) |
| Support being given | Card 9 (recovery timeline) |
| Six degrees of separation | Card 10 (you → pet frog → … → mountain chicken) |
| Creativity | The intro gag, phone joysticks, teams, hunters, traps, the secret scare |
| Extra credit ideas | Bonus facts on card 5; a second, climate chain on card 10 |

The title screen's **FACT CARDS** button opens the cards any time (so you can present them before the game instead). Every card lists its sources; the full list is in [SOURCES.md](SOURCES.md) and on the *Sources* screen at the end.

**Add a real photo:** put one at `public/assets/images/mountain-chicken.jpg` (credit it in SOURCES.md) and it appears on card 5.

## Presenter controls

| Key | Does |
|---|---|
| Enter / Space | Next (skip the intro, start, go, next card) |
| ← | Previous card |
| Esc | Presenter menu: Resume, End game now, Back to lobby, Fact cards, Sound and Jump-scare switches, Quit to title |
| J | Fact cards (in the lobby) |

Phones download a small page (about 50 KB, plus about 50 KB more on Firebase; no game engine). A phone that locks or drops rejoins with the same frog and points. During the cards, phones show reaction buttons (🐸 ❤️ 😱 👏 🔥 🦗) that float up the projector.

## Development

```sh
npm run dev        # solo development at http://127.0.0.1:5173 (keyboard players and computer frogs)
npm run dev:class  # dev server that phones on the same Wi-Fi can join
npm run build      # type-check + production build into dist/
npm run preview    # serve the build (phones can join from this computer)
npm test           # class-server tests + content, rubric and team-logic tests
npm run deploy     # build and upload to Firebase Hosting (plus the database rules)
```

Phones and the projector talk through one of two links with the same messages: the class server (`server/relay.mjs`, used by `npm run host` and `npm run dev`) or, on Firebase Hosting, the Firebase Realtime Database (`src/systems/firebaseRelay.ts`, downloaded only there). On any other static host the game runs with keyboards and computer frogs. To try the Firebase link locally, start the database emulator (`npm run firebase:emulators`) and build with `VITE_FIREBASE_DATABASE_URL="http://127.0.0.1:9000/?ns=frog-94c78-default-rtdb"`. Everything else is local: fonts, art (drawn in code) and sound (synthesized with Web Audio).

### Architecture

```text
src/
  main.ts                 Phones (#join) load phone/PhoneApp; the projector loads game.ts (Phaser)
  data/                   journal.ts (the 10 fact cards), game.ts (rules, timeline of events), sources.ts
  scenes/
    MenuScene             Title
    IntroScene            The chicken gag and the name/status reveal
    PondScene             Lobby, "How to play", countdown and the game (one shared pond)
    FinaleScene           Winning team and podium, the fact cards, thank-you and sources
  play/PondGame.ts        The game itself: bugs and licking, hunters, traps, events, computer frogs
  entities/               PartyFrog (a player's frog and its animation), Critters (bugs, decorative frogs)
  phone/PhoneApp.ts       Join screen, joystick, caught scare and the secret scare
  systems/                ClassHost / ClassPlayer (networking), link + firebaseRelay (class server or Firebase),
                          match (teams, totals, ranking), Sound, Settings
  world/                  pixels.ts (all pixel art), Art.ts (Phaser textures), Terrain.ts (ground painter)
  ui/                     Fact cards and visuals, effects (jump-scare, banners, QR), rules, CSS
server/
  relay.mjs               Join rooms: host + up to 60 players, joystick relay, validation, rate limits
  shared.mjs              Nickname and reaction rules shared with the Firebase link
  index.mjs               Serves dist/ plus the relay (npm run host)
firebase.json, .firebaserc  Firebase Hosting (serves dist/) for project frog-94c78
database.rules.json         Realtime Database rules for the Firebase link
```

The original brief is kept in `MOUNTAIN_CHICKEN_GAME_MASTER_SPEC.md`. This version deliberately goes beyond it: it became a group game played on phones because that's what the class presentation needed.

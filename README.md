# Mountain Chicken — a class game about a giant, disappearing frog

A pixel-art party game for a ~10 minute endangered-species presentation, played like Kahoot: **one person hosts** on the big screen, and **everyone else joins with a code** on their phone or laptop. Each player is their own mountain chicken frog (*Leptodactylus fallax*) in a shared pond, with their own colour.

**How to play:**

1. Move your frog with your phone (drag the circle) or the arrow keys.
2. Get close to bugs to eat them. Grab boosts!
3. Answer the quiz questions when they pop up.
4. Whatever you do… don't go in the dark cave.

Three short rounds, each with a different danger. Most points wins.

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

Then open **https://frog-94c78.web.app** on the projector and click **HOST A GAME**. Everyone else goes to the same address (or scans the QR code), types the code and their name, and presses **JOIN**.

- The free Spark plan is enough (up to 100 phones at once).
- If you skipped step 1, nobody can join yet, and the lobby says the database isn't set up.

### Option B: from your laptop with `npm run host`

```sh
npm install
npm run host
```

Leave that terminal open. On the projector laptop, open **http://localhost:3000** and click **HOST A GAME**. Players open the address shown in the lobby and must be on the **same Wi-Fi** as the laptop. Many school networks block this; a phone hotspot usually works.

### Trying it alone

Open the game twice: **HOST A GAME** in one browser tab, and join with the code from another tab (or your phone). Players on laptops use the arrow keys or WASD, F for "find my frog" and 1–4 for quiz answers. Computer "Wild Frogs" join when fewer than 3 people are playing.

## The 10-minute run sheet

The host presses **Enter** or the big green button to move on. Most screens also move on by themselves.

| Part | What happens | ~Time |
|---|---|---|
| Home page | Everyone opens the website. The host clicks **HOST A GAME**; everyone else types the code and their name. | |
| Intro | "This is a MOUNTAIN CHICKEN." A chicken wanders in… and a giant frog eats it. Reveal: it's a **frog**, *Leptodactylus fallax*, **Critically Endangered**. | 15 s |
| Lobby | Code and QR code on the big screen. Frogs drop into the pond as people join; each player gets a colour (their phone says "You are the RED frog"). | 1–2 min |
| How to play | The four rules. | 15 s |
| **Round 1: Bug Feast** | Eat bugs; wild pigs charge across the pond (−2). | 1 min + 2 quiz questions |
| Did you know? | Fact card: what it eats and its job in the food web | 30 s |
| **Round 2: Hunter Night** | It's dark. Hunters with flashlights and cage traps catch frogs (−3, plus a jump-scare). | 1 min + 2 quiz questions |
| Did you know? | Fact card: why it's disappearing | 30 s |
| **Round 3: Fungus Outbreak** | Green clouds of chytrid fungus make frogs sick (slow, can't eat, lose points) until they hop into a warm pool. | 1 min + 2 quiz questions |
| Did you know? | Fact card: who's helping | 30 s |
| Results | Winner, top-3 podium and the next places. | 30 s |
| The real story | The other 7 fact cards (one per rubric item). | 3 min |

**Quiz questions** pop up at a random moment in the middle of each round, like Kahoot: the question and four coloured answers on the big screen, the four buttons on every phone, 15 seconds. Right answers score 10 points plus up to 5 for speed. The answer is followed by a short fact (for example what the frog eats). There are 19 questions covering every rubric topic, and each game picks different ones.

**Boosts** appear around the pond: ⚡ Speed, 👅 Long tongue, ✖2 Double points and 🍃 Leaf cloak (hunters, pigs and fungus can't get you). Each lasts 8 seconds.

**Can't find your frog?** Your phone's top bar is your frog's colour, and the **FIND MY FROG** button makes your frog jump and its ring flash on the big screen.

## Jump-scares

- **The dark cave:** there's a cave in the corner of the pond with a "DON'T GO IN!" sign. Hop in and your phone goes dark ("It's very dark in here…"), then a screaming face fills the screen with a loud shriek and a long buzz. Only the player who went in gets it, so it's a dare. Each player can trigger it once every 45 seconds.
- **Getting caught** by a hunter or trap (round 2) flashes a hunter's face on that player's phone. The **first** catch of the game also shows it full-screen on the big screen, with a real hunting fact.

Switch **Jump-scares** off in the host menu (**Esc**) for a gentle "CAUGHT!" and no cave scare. Tell everyone to turn their phone sound up (the buzz only works on Android phones).

## Rubric coverage

| Rubric item (2 pts each) | Fact card | Also in |
|---|---|---|
| Name (common and scientific) | 1 | Intro reveal; quiz |
| Status | 2 (IUCN Red List scale) | Intro stamp; quiz |
| Habitat (name and description) | 3 (island map) | Quiz |
| Physical description | 4 | Quiz |
| Illustration / picture | 5 (field-guide plate) | The pixel frog everywhere |
| Niche | 6 (food chain), after round 1 | Eating bugs; quiz (what it eats) |
| Major reasons it is listed | 7 (population crash), after round 2 | Pigs, hunters, traps, fungus; quiz |
| Importance | 8 (coat of arms) | Quiz |
| Support being given | 9 (recovery timeline), after round 3 | Warm pools in round 3; quiz |
| Six degrees of separation | 10 (you → pet frog → … → mountain chicken) | Quiz |
| Creativity | | The intro gag, phones as controllers, three rounds, boosts, Kahoot quiz, the cave |
| Extra credit ideas | 5, 10 | Bonus facts on card 5; a second, climate chain on card 10 |

The home page's **Fact cards** link opens all ten any time (so you can present them separately too). Every card lists its sources; the full list is in [SOURCES.md](SOURCES.md) and on the *Sources* screen at the end.

**Add a real photo:** put one at `public/assets/images/mountain-chicken.jpg` (credit it in SOURCES.md) and it appears on card 5.

## Host controls

The host's screen is an overview of the whole pond; the host doesn't play.

| Key | Does |
|---|---|
| Enter / Space | Next (skip the intro, start, start a round, back to the game after a quiz, next card) |
| ← | Previous card |
| Esc | Host menu: Resume, End this round, Skip to the end, Back to lobby, Fact cards, Sound and Jump-scare switches |

In the lobby, click a player's name to remove them. If fewer than 3 people join, computer "Wild Frogs" fill in. Players download a small page (about 50 KB, plus about 50 KB more on Firebase; no game engine). A phone that locks or drops rejoins with the same frog and points. Between rounds, phones show reaction buttons (🐸 ❤️ 😱 👏 🔥 🦗) that float up the big screen.

## Development

```sh
npm run dev        # development at http://127.0.0.1:5173 (open #host in one tab, join from others)
npm run dev:class  # dev server that phones on the same Wi-Fi can join
npm run build      # type-check + production build into dist/
npm run preview    # serve the build (phones can join from this computer)
npm test           # class-server tests + content, rubric and team-logic tests
npm run deploy     # build and upload to Firebase Hosting (plus the database rules)
```

Phones and the projector talk through one of two links with the same messages: the class server (`server/relay.mjs`, used by `npm run host` and `npm run dev`) or, on Firebase Hosting, the Firebase Realtime Database (`src/systems/firebaseRelay.ts`, downloaded only there). On any other static host, players can't join (the host sees computer frogs only). To try the Firebase link locally, start the database emulator (`npm run firebase:emulators`) and build with `VITE_FIREBASE_DATABASE_URL="http://127.0.0.1:9000/?ns=frog-94c78-default-rtdb"`. Everything else is local: fonts, art (drawn in code) and sound (synthesized with Web Audio).

### Architecture

```text
src/
  main.ts                 Home page / player screen (phone/PhoneApp, no game engine); #host loads game.ts (Phaser)
  data/                   journal.ts (10 fact cards), game.ts (rounds, boosts, rules), quiz.ts (19 questions), sources.ts
  scenes/
    IntroScene            The chicken gag and the name/status reveal
    PondScene             The host's overview: lobby, how to play, rounds, quiz, results, fact cards
    FinaleScene           Podium, the remaining fact cards, thank-you and sources
  play/                   PondGame (a round: bugs, boosts, pigs, hunters and traps, fungus, computer frogs), layout (map)
  entities/               PartyFrog (a player's frog and its animation), Critters (bugs, decorative frogs)
  phone/PhoneApp.ts       Home page (join or host) and the player's screen: joystick, quiz buttons, find me, scares
  systems/                ClassHost / ClassPlayer (networking), link + firebaseRelay (class server or Firebase),
                          match (colours, ranking, quiz points), Sound, Settings
  world/                  pixels.ts (all pixel art), Art.ts (Phaser textures), Terrain.ts (ground painter)
  ui/                     Fact cards and visuals, effects (jump-scare, banners, QR), rules, CSS
server/
  relay.mjs               Join rooms: host + up to 60 players; joysticks, answers, reactions; validation, rate limits
  shared.mjs              Nickname, reaction and answer rules shared with the Firebase link
  index.mjs               Serves dist/ plus the relay (npm run host)
firebase.json, .firebaserc  Firebase Hosting (serves dist/) for project frog-94c78
database.rules.json         Realtime Database rules for the Firebase link
```

The original brief is kept in `MOUNTAIN_CHICKEN_GAME_MASTER_SPEC.md`. This version deliberately goes beyond it: it became a group game played on phones because that's what the class presentation needed.

# Mountain Chicken — a class game about a giant, disappearing frog

A pixel-art party game for a ~10 minute endangered-species presentation, played like Kahoot: **one person hosts** on the big screen, and **everyone else joins with a code** on their phone or laptop. Each player designs their own mountain chicken frog (*Leptodactylus fallax*, also called the giant ditch frog): a skin, a hat and a colour. Then they explore a big rainforest map on their own screen, with the camera following their frog, collecting insects. In round 2, some players turn into the humans hunting everyone else. The big screen shows the whole map with everyone on it.

**How to play** (what the game tells players):

1. Explore the forest: drag on your screen (or arrow keys).
2. Hop close to bugs to eat them. Grab boosts!
3. Answer the quiz questions when they pop up.

Three short rounds, each with a different danger. Most points wins. (There's also a secret: see [Jump-scares](#jump-scares).)

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

Open the game twice: **HOST A GAME** in one browser tab, and join with the code from another tab (or your phone). Players on laptops use the arrow keys or WASD (or drag with the mouse), and 1–4 for quiz answers. Computer "Wild Frogs" only join when fewer than 3 people are playing (checked again at the start of every round), and computer hunters only come out in round 2 when there's just one player.

## The 10-minute run sheet

The host presses **Enter** or the big green button to move on. Most screens also move on by themselves.

| Part | What happens | ~Time |
|---|---|---|
| Home page | Everyone opens the website. The host clicks **HOST A GAME**; everyone else types the code and their name and designs their frog (skin, hat, colour). | |
| Intro | "This is a MOUNTAIN CHICKEN." A chicken wanders in… and a giant frog eats it. Reveal: it's a **frog**, *Leptodactylus fallax*, **Critically Endangered**. | 15 s |
| Lobby | Code and QR code on the big screen. Frogs drop onto the map as people join, and players can already explore. | 1–2 min |
| How to play | The three rules. | 15 s |
| **Round 1: Bug Feast** | Eat bugs; wild pigs burst out of the undergrowth and charge (−2). | 1 min + 2 quiz questions |
| Did you know? | Fact card: what it eats and its job in the food web | 30 s |
| **Round 2: Hide From Humans** | About one player in six becomes a **human** with a flashlight; everyone else is a frog. It's night and every phone only sees what's close. The humans count to five at their camp while the frogs hide in bushes, hollow logs, tall grass or the cave. Humans catch frogs by touching them (+5); caught frogs go in the cage until another frog touches it to free them (+3 each). At the end, frogs still in the cage go **in the cooking pot** (a cartoon on the big screen, with the real hunting fact); every frog that escaped gets +10. | 1¼ min + 2 quiz questions |
| Did you know? | Fact card: why it's disappearing | 30 s |
| **Round 3: Fungus Outbreak** | Green clouds of chytrid fungus make frogs sick (slow, can't eat, lose points) until they hop into a warm spring. | 1 min + 2 quiz questions |
| Did you know? | Fact card: who's helping | 30 s |
| Results | Winner, top-3 podium and the next places. | 30 s |
| The real story | The other 7 fact cards (one per rubric item). | 3 min |

**Quiz questions** pop up at a random moment in the middle of each round, like Kahoot: the question and four coloured answers on the big screen, the four buttons on every phone, 15 seconds. Right answers score 10 points plus up to 5 for speed. The answer is followed by a short fact (for example what the frog eats). There are 19 questions covering every rubric topic, and each game picks different ones.

**Boosts** appear around the map: ⚡ Speed, 👅 Long tongue, ✖2 Double points and 🍃 Leaf cloak (hunters, pigs and fungus can't get you). Each lasts 8 seconds.

**The map** is a big patch of Dominican rainforest, about seven phone screens wide: a lake with a stream and a river (cross them on plank bridges or stepping stones), two ponds, tree thickets and boulders to hop around, four warm springs, a research station, the hunters' camp (tents, a cage and a cooking pot), a volcano peeking over the trees and 44 hiding places (big bushes, hollow logs and tall grass). Each player's screen follows their own frog (with a white arrow over it) and has a little map in the corner. When a pig charges in from off-screen, a **PIG!** warning flashes at the edge of your screen.

**Random events:** once per round, one of these happens at a random moment: 🌧️ a **rain shower** (bugs come out), ⭐ a **giant golden cricket** (10 points, with an arrow pointing to it), 🌋 a **volcano rumble** (the ground shakes and ash falls; everyone slows down) or 🌀 a **hurricane gust** (the wind pushes everyone sideways). Each is a real thing that happens to the frog's islands.

**Hide From Humans, in more detail:** frogs in a hiding place vanish from the big screen and from the humans' phones; a human only sees a hiding frog when standing right next to it or shining a flashlight on it, and hears "rustling" when one is close. Frogs see each other (faintly when hidden) and feel their phone's heartbeat speed up as a human gets near. Lightning flashes now and then. If there's only one player, computer hunters do the hunting instead.

## Jump-scares

- **The cave:** on the north edge of the map, at the end of a path lined with glowing mushrooms, there's a mossy cave with crystals and a pair of eyes that blink now and then. A boulder blocks it in round 1; it rolls away for rounds 2 and 3. It's a hiding place (humans are too scared to go in, so nobody can catch you there), and the round 2 card mentions it. But something lives inside: the first time each player goes in, their phone goes dark ("It's very dark in here…"), then a screaming face fills the screen with a loud shriek and a long buzz. Only that player gets it; the big screen just shows an "AAAAAH!" by the cave. After that, you can hide in there for about seven seconds before something growls you back out.
- **Getting caught** in round 2 flashes a hunter's face on that player's phone. The **first** catch of the game also shows it full-screen on the big screen, with a real hunting fact.

Switch **Jump-scares** off in the host menu (**Esc**) for a gentle "CAUGHT!" and no cave scare. Tell everyone to turn their phone sound up (the buzz only works on Android phones).

## Rubric coverage

| Rubric item (2 pts each) | Fact card | Also in |
|---|---|---|
| Name (common and scientific) | 1 (also called the giant ditch frog) | Intro reveal; quiz |
| Status | 2 (IUCN Red List scale) | Intro stamp; quiz |
| Habitat (name and description) | 3 (island map) | Quiz |
| Physical description | 4 | Quiz |
| Illustration / picture | 5 (field-guide plate) | The pixel frog everywhere |
| Niche | 6 (food chain), after round 1 | Eating bugs; quiz (what it eats) |
| Major reasons it is listed | 7 (population crash), after round 2 | Pigs (round 1), hunting (round 2 and the cooking pot), fungus (round 3), volcano and hurricane events; quiz |
| Importance | 8 (coat of arms) | Quiz |
| Support being given | 9 (recovery timeline), after round 3 | Warm springs in round 3; quiz |
| Six degrees of separation | 10 (you → pet frog → … → mountain chicken) | Quiz |
| Creativity | | The intro gag, custom frogs, each player's own view of a big map, Hide From Humans with the cooking pot, random events, boosts, Kahoot quiz, the cave |
| Extra credit ideas | 5, 10 | Bonus facts on card 5; a second, climate chain on card 10 |

The home page's **Fact cards** link opens all ten any time (so you can present them separately too). Every card lists its sources; the full list is in [SOURCES.md](SOURCES.md) and on the *Sources* screen at the end.

**Add a real photo:** put one at `public/assets/images/mountain-chicken.jpg` (credit it in SOURCES.md) and it appears on card 5.

## Host controls

The host's screen is an overview of the whole map; the host doesn't play.

| Key | Does |
|---|---|
| Enter / Space | Next (skip the intro, start, start a round, back to the game after a quiz, next card) |
| ← | Previous card |
| Esc | Host menu: Resume, End this round, Skip to the end, Back to lobby, Fact cards, Sound and Jump-scare switches |

In the lobby, click a player's name to remove them. If fewer than 3 people join, computer "Wild Frogs" fill in. The home page is small (about 80 KB, plus about 50 KB more on Firebase); the game view (about 350 KB, the Phaser engine) downloads while players type their name. A phone that locks or drops rejoins with the same frog and points. Between rounds, phones show reaction buttons (🐸 ❤️ 😱 👏 🔥 🦗) that float up the big screen.

## Development

```sh
npm run dev        # development at http://127.0.0.1:5173 (open #host in one tab, join from others)
npm run dev:class  # dev server that phones on the same Wi-Fi can join
npm run build      # type-check + production build into dist/
npm run preview    # serve the build (phones can join from this computer)
npm test           # class-server tests + content, rubric and team-logic tests
npm run deploy     # build and upload to Firebase Hosting (plus the database rules)
```

Phones and the projector talk through one of two links with the same messages: the class server (`server/relay.mjs`, used by `npm run host` and `npm run dev`) or, on Firebase Hosting, the Firebase Realtime Database (`src/systems/firebaseRelay.ts`, downloaded only there). The projector runs the game: each phone moves its own frog and sends its position about ten times a second; the projector checks it (frogs can't swim or hop through trees) and sends everyone a small snapshot of the map (frogs, bugs, dangers, scores) several times a second. A 30-player game on Firebase uses roughly 300–500 MB of the free plan's 10 GB monthly download allowance. On any other static host, players can't join (the host sees computer frogs only). To try the Firebase link locally, start the database emulator (`npm run firebase:emulators`) and build with `VITE_FIREBASE_DATABASE_URL="http://127.0.0.1:9000/?ns=frog-94c78-default-rtdb"`. Everything else is local: fonts, art (drawn in code) and sound (synthesized with Web Audio).

### Architecture

```text
src/
  main.ts                 Home page / player screen (phone/PhoneApp); #host loads game.ts (Phaser)
  data/                   journal.ts (10 fact cards), game.ts (rounds, boosts, rules), quiz.ts (19 questions),
                          looks.ts (frog skins, hats, colours), sources.ts
  scenes/
    IntroScene            The chicken gag and the name/status reveal
    PondScene             The host's overview of the whole map: lobby, how to play, rounds, quiz, results, fact cards
    FinaleScene           Podium (with everyone's custom frogs), the remaining fact cards, thank-you and sources
  play/                   PondGame (a round: bugs, boosts, events, pigs, Hide From Humans, fungus, computer frogs),
                          PlayerScene + playerGame (a player's own view, following their frog), controls
  entities/               PartyFrog (a player's frog: skin, hat, animation), Critters (bugs, decorative frogs)
  phone/PhoneApp.ts       Home page (pick your frog, join or host) and the player's screen: the game view with a
                          floating joystick, quiz buttons, scares
  systems/                ClassHost / ClassPlayer (networking), world.ts (the snapshot format), link + firebaseRelay
                          (class server or Firebase), match (colours, ranking, quiz points), Sound, Settings
  world/                  map.ts (the map: layout, collisions, the cave; no Phaser), mapView.ts (draws it),
                          pixels.ts (all pixel art), Art.ts (Phaser textures), Terrain.ts (ground painter)
  ui/                     Fact cards and visuals, effects (jump-scare, banners, QR), rules, frog pictures, CSS
server/
  relay.mjs               Join rooms: host + up to 60 players; positions, snapshots, answers, reactions;
                          validation, rate limits
  shared.mjs              Nickname, look, position, reaction and answer rules shared with the Firebase link
  index.mjs               Serves dist/ plus the relay (npm run host)
firebase.json, .firebaserc  Firebase Hosting (serves dist/) for project frog-94c78
database.rules.json         Realtime Database rules for the Firebase link
```

The original brief is kept in `MOUNTAIN_CHICKEN_GAME_MASTER_SPEC.md`. This version deliberately goes beyond it: it became a group game played on phones because that's what the class presentation needed.

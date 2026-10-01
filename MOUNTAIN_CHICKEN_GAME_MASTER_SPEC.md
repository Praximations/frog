# MOUNTAIN CHICKEN
## Interactive Endangered Species Game — Master Product & Development Specification

---

# 1. PROJECT GOAL

Build a polished 2D pixel-art browser game about the Mountain Chicken Frog.

This is being created for an Endangered Species school project, but the final result should feel like a small, high-quality indie game rather than a school website, slideshow, quiz, or educational app.

The player should literally SPAWN AS A MOUNTAIN CHICKEN FROG.

The game should allow the player and audience to experience:

- what the frog is
- where it lives
- how it survives
- what it eats
- its ecological role
- what threatens it
- why its population declined
- why the species matters
- what humans are doing to save it
- how humans are indirectly connected to it

The game should tell this story primarily through:

GAMEPLAY → EVENT → INFORMATION → GAMEPLAY

instead of:

READ → READ → READ → QUIZ

The final result must be:

- visually impressive
- simple to understand
- fun to play
- easy to present
- clearly directed
- reliable on a school Chromebook
- educational without feeling like an educational game
- polished rather than huge

The design philosophy is:

> DO FEWER THINGS EXTREMELY WELL.

---

# 2. PRESENTATION FORMAT

This game will be presented live in class.

It should borrow one useful idea from Kahoot:

ONE COMPUTER HOSTS THE ENTIRE EXPERIENCE.

The presenter controls the game from one laptop/Chromebook and the class watches on a projector.

There is:

- no multiplayer
- no join code
- no student phones
- no audience accounts
- no live networking
- no quiz-answer system

The Kahoot similarity is only:

- one central host screen
- strong visual presentation
- large readable text
- clear progression
- simple interaction
- easy pacing for a classroom

The game should feel like a PRESENTATION AND GAME AT THE SAME TIME.

---

# 3. TARGET LENGTH

Normal playthrough:

approximately 12–20 minutes.

The game should not artificially stretch itself.

Do not add repetitive missions just to increase playtime.

A faster presenter should be able to finish in around 10–12 minutes.

A player who explores and explains the information should be able to spend closer to 15–20+ minutes.

The presenter controls the pacing by deciding when to continue past information panels.

---

# 4. CORE EXPERIENCE

The player starts the game.

Opening screen:

MOUNTAIN CHICKEN

An Interactive Conservation Story

[ START ]

Use a beautiful animated pixel-art rainforest scene behind the title.

Possible subtle effects:

- moving leaves
- rainfall
- water
- insects
- atmospheric particles
- distant frog movement
- ambient forest audio

Do not overcrowd the menu.

When START is selected:

1. fade to black
2. load rainforest ambience
3. fade into the world
4. camera settles behind/above the frog
5. player is standing in front of a wooden research board

The player is now controlling the Mountain Chicken Frog.

---

# 5. TECHNOLOGY STACK

Build with:

- Phaser 3
- TypeScript
- Vite
- HTML
- CSS

Do NOT require:

- React
- a backend
- Supabase
- a database
- login
- authentication
- accounts
- cloud saves
- multiplayer
- server-side code

The game must ultimately be a STATIC WEB APPLICATION.

All essential assets must be local.

The game must continue functioning without internet access after being built.

---

# 6. DEVELOPMENT ENVIRONMENT

Primary development:

Cursor or VS Code

Project structure should work normally with:

npm install
npm run dev
npm run build

The final Vite production output should be:

/dist

That directory should contain everything needed to run/deploy the finished game.

---

# 7. HOSTING

Primary hosting target:

Firebase Hosting

Expected deployment domains may include:

PROJECT-ID.web.app

and:

PROJECT-ID.firebaseapp.com

Do not make Firebase part of the game architecture.

Firebase is ONLY the static hosting destination.

The same /dist build should also work as an offline presentation backup.

The game must not require Firebase APIs during gameplay.

---

# 8. OFFLINE-FIRST REQUIREMENT

Presentation reliability is extremely important.

The final game must not depend on:

- remote images
- remote fonts
- remote audio
- APIs
- databases
- web requests
- CDNs during gameplay

Package locally:

- sprites
- tiles
- textures
- fonts
- images
- UI graphics
- audio
- maps
- data

If classroom internet disappears, the game should still be playable from a local production build.

---

# 9. PRIMARY DEVICE

Main target:

school Chromebook / laptop

Landscape display.

Assume average integrated graphics.

The game should remain smooth on relatively weak hardware.

Target smooth performance without excessive effects.

Use:

- reasonable texture sizes
- compressed audio
- limited particles
- controlled sprite counts
- efficient collisions
- efficient tilemaps

Do not build something that requires a gaming PC.

---

# 10. ART DIRECTION

Use modern polished pixel art.

Do NOT make it look like:

- a Game Boy game
- an Atari game
- a generic pixel template
- a cheap Flash game
- a school website
- a quiz
- a PowerPoint
- a children's learning app

Aim for:

- detailed tropical vegetation
- rich rainforest atmosphere
- readable characters
- smooth animation
- beautiful water
- rain
- small environmental movement
- insects
- rocks
- logs
- foliage
- subtle lighting
- atmospheric particles
- natural color variation
- clean UI

The art should be stylized enough to build efficiently while still feeling premium.

Pixel density should allow recognizable environmental detail.

Avoid making sprites so tiny that the projector cannot show them clearly.

---

# 11. CAMERA

Use a top-down or slightly angled top-down perspective.

The camera follows the frog smoothly.

Do not make camera movement nauseating.

Allow slight camera easing.

The world should feel larger than the visible screen.

Important presentation scenes may temporarily adjust the camera to frame an area.

Avoid complicated cinematic camera systems.

---

# 12. PLAYER CHARACTER

The player controls a Mountain Chicken Frog.

Movement should feel frog-like but responsive.

Do not simply slide the sprite across the floor.

Use a subtle hop rhythm.

Controls:

WASD / Arrow Keys
    Move

SPACE
    Hop / quick movement action if useful

E
    Interact

ESC
    Pause

Potential interactions:

- inspect boards
- approach food
- enter hiding locations
- trigger discoveries
- interact with conservation areas

Do not create complicated button combinations.

---

# 13. CORE GAMEPLAY

Keep the gameplay mechanics SIMPLE.

The main mechanics should be:

1. MOVE
2. HOP
3. EXPLORE
4. FIND FOOD
5. EAT / HUNT
6. FIND SAFETY
7. INTERACT
8. RESPOND TO EVENTS

Do not add:

- crafting
- giant inventories
- skill trees
- equipment systems
- combat systems
- complicated upgrades
- dozens of collectibles

The interesting part of the game should come from:

THE WORLD CHANGING AROUND THE PLAYER.

---

# 14. HUD

Keep the normal HUD minimal.

Possible layout:

HEALTH

ENERGY

FROGS ALIVE: XX

CURRENT OBJECTIVE

Do not cover large portions of the game screen.

The population number is primarily a GAME SIMULATION value.

Never imply simulated game numbers are exact historical population figures unless the underlying number has been specifically verified.

---

# 15. OBJECTIVE SYSTEM

The player should almost always know what to do next.

Use one simple current objective.

Examples:

EXPLORE THE FOREST

FIND FOOD

FOLLOW THE STREAM

FIND THE OTHER FROGS

ESCAPE THE DANGER ZONE

REACH THE RESEARCH AREA

FIND THE CONSERVATION SITE

FOLLOW THE FINAL TRAIL

Do not use a giant quest log.

If the player becomes lost:

- subtle path lighting
- moving insects
- trails
- signs
- environmental framing
- gentle objective indicator

should point the player in the right direction.

Freedom should exist, but confusion should not.

---

# 16. MAP DESIGN

Build ONE connected handcrafted environment.

Do not build a huge open world.

Suggested structure:

STARTING CLEARING
      |
      v
HEALTHY RAINFOREST
   /       \
STREAM    FEEDING AREA
   \       /
    FOREST TRAIL
         |
         v
   DECLINE REGION
         |
         v
 SURVIVOR REGION
         |
         v
CONSERVATION AREA
         |
         v
SIX-DEGREES TRAIL
         |
         v
       ENDING

The world should feel larger than it really is through:

- winding paths
- vegetation
- water
- visual barriers
- different terrain
- environmental transitions
- hidden corners
- changing weather
- lighting
- sound design

---

# 17. GAME CHAPTERS

Internally organize the game into five major chapters.

Do not necessarily display giant chapter-selection menus.

---

## CHAPTER 1 — MEET THE FROG

The player spawns in a healthy rainforest.

Directly ahead is a wooden research board.

The board introduces:

- common name
- scientific name
- conservation status
- habitat
- physical appearance
- species image/illustration

The player approaches.

Prompt:

E — INSPECT

When selected:

1. freeze gameplay
2. keep the current scene visible
3. gently dim the background
4. expand the board into a clean presentation card
5. display information clearly
6. presenter explains the information
7. presenter presses CONTINUE
8. return seamlessly to gameplay

This should establish the project without dumping an enormous paragraph onto the player.

---

## CHAPTER 2 — LIFE IN THE FOREST

The player explores the healthy habitat.

Introduce:

- movement
- food
- hunting
- shelter
- other frogs
- environmental sounds
- water
- insects

Create a simple energy mechanic.

The frog needs food.

The player finds/catches appropriate prey.

After the first successful feeding sequence:

trigger:

ECOSYSTEM DISCOVERY

Pause briefly and explain:

- what the frog eats
- its niche
- its role in the food web/ecosystem

Then return directly to gameplay.

The player should experience the ecological role BEFORE reading about it.

---

## CHAPTER 3 — THE DECLINE

After the player understands normal frog life, begin changing the environment.

Do not immediately show a huge warning screen.

Use atmosphere first.

Examples:

- fewer frog sounds
- fewer visible frogs
- music becomes quieter/darker
- some environmental areas become unhealthy
- population number begins changing
- weather changes
- player discovers signs something is wrong

Then trigger the primary threat event.

The threat MUST be scientifically verified before being presented as fact.

If chytridiomycosis is used, ensure all final claims are verified.

Possible gameplay representation:

- danger area
- sick/absent frogs
- contaminated region
- player must avoid or move through a dangerous zone
- population counter falls

Then trigger an information checkpoint explaining:

WHY THE SPECIES IS ENDANGERED

Additional verified threats can be introduced afterward.

Do not invent threats because they sound dramatic.

---

## CHAPTER 4 — SAVING THE SPECIES

The player eventually reaches an area connected to conservation work.

Possible visual features:

- conservation station
- protected habitat
- researchers
- frog enclosures
- monitoring equipment
- restoration zone

Only include specific representations that are scientifically reasonable.

Here the player learns:

- why the species is important
- what conservationists are doing
- what support is currently being given to the species

Change the emotional direction.

Previous objective:

SURVIVE

New objective:

HELP THE POPULATION SURVIVE

Possible gameplay:

- reach protected habitat
- guide/find surviving frogs
- activate safe areas
- locate resources
- complete one or two simple conservation-related actions

Keep it short.

Do not turn this into a management simulator.

---

## CHAPTER 5 — EVERYTHING IS CONNECTED

The final area is a visually distinct trail.

The player moves/hops through a sequence representing the required:

SIX DEGREES OF SEPARATION.

The assignment requires a logical connection between the student/human world and the endangered species.

Create a trail with six connected stages.

Each stage can be:

- stepping stone
- board
- environmental object
- small platform
- visual symbol

Structure:

YOU
 |
 v
CONNECTION 1
 |
 v
CONNECTION 2
 |
 v
CONNECTION 3
 |
 v
CONNECTION 4
 |
 v
CONNECTION 5
 |
 v
MOUNTAIN CHICKEN FROG

Do NOT invent the actual six-degree chain.

The final chain must be based on a logical, researched relationship.

At the final point:

EVERYTHING IS CONNECTED

Then transition into the ending.

---

# 18. ENDING

The ending should feel earned.

Possible flow:

- forest ambience returns
- camera pulls slightly outward
- show surviving frogs
- population stabilizes or improves within the fictional simulation
- short conclusion panel appears

Example tone:

THE FUTURE OF A SPECIES CAN DEPEND ON WHAT HAPPENS NEXT.

Do not be overly dramatic or cheesy.

Then show:

MOUNTAIN CHICKEN

Leptodactylus fallax

followed by a short conservation message.

Include:

REPLAY

option.

---

# 19. RUBRIC REQUIREMENTS

The game MUST explicitly include every required project category.

Create a checklist in development and do not mark the game complete until every item has a defined location in gameplay.

Required content:

[ ] COMMON NAME

[ ] SCIENTIFIC NAME

[ ] CONSERVATION STATUS

[ ] HABITAT LOCATION

[ ] HABITAT DESCRIPTION

[ ] PHYSICAL DESCRIPTION

[ ] ILLUSTRATION / PICTURE

[ ] NICHE

[ ] MAJOR REASONS FOR ENDANGERMENT

[ ] IMPORTANCE OF THE SPECIES

[ ] SUPPORT / CONSERVATION BEING GIVEN

[ ] SIX DEGREES OF SEPARATION

[ ] CREATIVITY / PRESENTATION QUALITY

No rubric requirement may exist only in developer notes.

Every required item must actually appear in the playable/presentation experience.

---

# 20. CENTRAL SPECIES DATA

Do not hard-code scientific information randomly throughout game scenes.

Create:

src/data/species.ts

Example structure:

export const species = {
  commonName: "",
  scientificName: "",
  conservationStatus: "",

  habitat: {
    locations: [],
    description: ""
  },

  physicalDescription: "",

  illustration: "",

  niche: {
    trophicRole: "",
    diet: [],
    ecosystemRole: ""
  },

  threats: [],

  importance: {
    ecological: "",
    other: ""
  },

  conservation: [],

  sixDegrees: [],

  sources: []
};

Unknown information should be:

"[VERIFIED CONTENT NEEDED]"

NEVER invent scientific facts to fill an empty field.

The final educational content will be researched separately.

---

# 21. RUBRIC CONTENT MAPPING

Also create:

src/data/rubric.ts

It should map each rubric requirement to the exact part of the game that presents it.

Example:

{
  commonName: "opening-board",
  scientificName: "opening-board",
  conservationStatus: "opening-board",
  habitat: "opening-board-and-forest",
  physicalDescription: "species-profile",
  illustration: "species-profile",
  niche: "feeding-discovery",
  endangerment: "decline-event",
  importance: "conservation-section",
  support: "conservation-section",
  sixDegrees: "final-trail"
}

This should make it impossible to accidentally forget part of the assignment.

---

# 22. INFORMATION PANEL SYSTEM

Build ONE reusable information/presentation system.

Possible class:

InfoPanel

Every important presentation pause should use the same system.

Features:

- freeze gameplay
- dim background
- keep game world visible
- animate card smoothly
- title
- subtitle if needed
- short content
- optional image
- optional small diagram
- CONTINUE button

Text must be readable on a classroom projector.

Avoid long paragraphs.

Prefer:

TITLE

1–3 short chunks of information

one image or visual if useful

CONTINUE

Information panels should look like premium field-research cards.

Do not make them look like PowerPoint slides.

---

# 23. PRESENTATION CHECKPOINTS

Use checkpoint IDs.

Suggested:

checkpoint_spawn

checkpoint_species

checkpoint_habitat

checkpoint_niche

checkpoint_decline

checkpoint_importance

checkpoint_conservation

checkpoint_six_degrees

checkpoint_ending

Checkpoint architecture should allow the presenter to recover quickly if something goes wrong.

---

# 24. PRESENTER MODE

The game must be safe to present live.

Pause menu:

RESUME

RESTART CHECKPOINT

SKIP TO NEXT PRESENTATION CHECKPOINT

RESTART GAME

A hidden or subtle presenter section may include:

PREVIOUS CHECKPOINT

NEXT CHECKPOINT

Do not clutter the normal gameplay HUD with presentation controls.

Presenter controls exist as emergency tools.

---

# 25. FAILURE

The player can experience danger.

However:

DO NOT make classroom presentation failure frustrating.

If the player's health reaches zero:

- short failure animation
- restart current checkpoint
- do not erase the entire playthrough

The game should be challenging enough to create tension but easy enough that the presenter is unlikely to get stuck.

---

# 26. POPULATION SYSTEM

Create a simple PopulationSystem.

Example:

population = 42;

Events can modify it.

Important:

These values are part of the GAME SIMULATION.

Do not claim simulated values are exact real-world counts.

Possible UI:

FROGS ALIVE
42

event occurs:

42
↓
37

Animate population changes clearly.

The decline should emotionally communicate the scale of the problem.

Later conservation events may stabilize or increase the simulated population.

---

# 27. EVENT SYSTEM

Create:

src/data/events.ts

and:

EventSystem.ts

Events should be data-driven when reasonable.

Conceptual structure:

{
  id: "",
  chapter: "",
  trigger: "",
  title: "",
  effects: {
    health: 0,
    energy: 0,
    population: 0
  },
  presentationCheckpoint: null
}

Possible events:

- first feeding
- habitat discovery
- weather event
- population decline
- disease discovery
- reduced food
- conservation discovery
- recovery event

Do not add random events that distract from the story.

Each major event should have a reason for existing.

---

# 28. SURVIVAL SYSTEM

Keep survival simple.

Possible values:

health
energy

Energy decreases slowly.

Eating restores energy.

Danger events may affect health.

Do not create:

- thirst
- temperature
- complex diseases
- stamina
- hunger
- hydration
- sleep

all at once.

Two primary survival values are enough.

---

# 29. FOOD / HUNTING

Food should be interactive but simple.

The frog should be able to approach/chase appropriate prey.

Do not make hunting overly difficult.

The purpose is:

- make movement fun
- demonstrate the frog's niche
- create natural gameplay

Use small prey movement patterns.

Keep collision reliable.

---

# 30. OTHER FROGS

Populate parts of the environment with other frogs.

They help establish:

- population
- ecosystem
- decline

Do not give every frog AI.

Simple behaviors are enough:

- idle
- short hop
- hide
- move randomly within small areas

As the decline chapter begins:

reduce:

- frog sounds
- frog encounters
- visible frogs

This creates environmental storytelling.

---

# 31. ENVIRONMENTAL STORYTELLING

Whenever possible, SHOW information before explaining it.

Examples:

Instead of immediately saying:

"THE POPULATION IS DECLINING"

first:

- remove frog calls
- reduce frog NPCs
- change ambience

Then explain why.

Instead of immediately explaining diet:

let the player hunt.

Then explain the niche.

Instead of immediately explaining habitat:

let the player explore it.

Then provide the habitat information.

Core rule:

EXPERIENCE → EXPLANATION

---

# 32. AUDIO

Support:

- rainforest ambience
- rain
- water
- insects
- frog calls
- movement
- UI
- subtle music

Audio should improve the atmosphere but never be required.

Include:

MUTE

and:

VOLUME

in settings/pause.

If audio fails, the entire experience must still function.

---

# 33. QUALITY BAR

Prioritize:

1. responsive movement
2. beautiful environment
3. clear objectives
4. smooth transitions
5. readable presentation UI
6. atmospheric audio
7. believable events
8. reliability

before adding additional mechanics.

A short polished game is better than a huge unfinished one.

---

# 34. DO NOT OVERBUILD

Do NOT add:

- procedural world generation
- multiplayer
- networking
- accounts
- leaderboards
- complex combat
- huge NPC systems
- crafting
- skill trees
- giant inventory
- dialogue trees
- hundreds of items
- open-world quests
- unnecessary cutscenes

This is a focused classroom experience.

---

# 35. PROJECT STRUCTURE

Use approximately:

mountain-chicken/
│
├── MOUNTAIN_CHICKEN_GAME_MASTER_SPEC.md
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
│
├── public/
│   └── assets/
│       ├── frog/
│       ├── environment/
│       ├── insects/
│       ├── frogs/
│       ├── conservation/
│       ├── ui/
│       ├── audio/
│       ├── images/
│       └── fonts/
│
└── src/
    ├── main.ts
    │
    ├── scenes/
    │   ├── BootScene.ts
    │   ├── PreloadScene.ts
    │   ├── MenuScene.ts
    │   ├── ForestScene.ts
    │   └── EndingScene.ts
    │
    ├── entities/
    │   ├── Frog.ts
    │   ├── Insect.ts
    │   └── FrogNPC.ts
    │
    ├── systems/
    │   ├── SurvivalSystem.ts
    │   ├── EventSystem.ts
    │   ├── PopulationSystem.ts
    │   ├── InteractionSystem.ts
    │   ├── ObjectiveSystem.ts
    │   ├── CheckpointSystem.ts
    │   └── ChapterSystem.ts
    │
    ├── ui/
    │   ├── HUD.ts
    │   ├── InfoPanel.ts
    │   ├── PauseMenu.ts
    │   ├── PresenterMenu.ts
    │   └── ObjectiveDisplay.ts
    │
    └── data/
        ├── species.ts
        ├── rubric.ts
        ├── events.ts
        └── chapters.ts

Do not create layers of abstractions that are unnecessary for a project of this size.

---

# 36. DEVELOPMENT PHASES

Do not attempt to build everything at once.

---

## PHASE 1 — FOUNDATION

Create:

- Vite project
- Phaser
- TypeScript
- game configuration
- responsive canvas
- menu scene
- blank playable forest scene
- production build support

Confirm:

npm run dev

works.

Confirm:

npm run build

works.

Stop after Phase 1 and report progress.

---

## PHASE 2 — FROG

Build:

- player frog
- movement
- hopping
- animation
- collisions
- camera follow

Make movement feel excellent before continuing.

---

## PHASE 3 — WORLD

Build:

- starting clearing
- forest
- stream
- rocks
- logs
- vegetation
- boundaries
- collision map

Do not build the entire final world immediately.

Start with the opening region.

---

## PHASE 4 — INTERACTION

Build:

- E interaction system
- wooden opening board
- InfoPanel
- pause/resume behavior
- Continue behavior

Verify presentation flow.

---

## PHASE 5 — SURVIVAL

Build:

- health
- energy
- HUD
- insects
- food interaction
- feeding
- niche discovery

---

## PHASE 6 — OBJECTIVES AND CHECKPOINTS

Build:

- ObjectiveSystem
- CheckpointSystem
- PresenterMenu
- restart checkpoint
- skip checkpoint

---

## PHASE 7 — EVENTS

Build:

- EventSystem
- PopulationSystem
- world-state changes
- frog population visualization
- decline sequence

---

## PHASE 8 — CONSERVATION

Build:

- conservation region
- conservation presentation checkpoint
- simple recovery gameplay
- importance information

---

## PHASE 9 — SIX DEGREES

Build:

- ending trail
- six connected stages
- final information
- conclusion
- ending sequence

---

## PHASE 10 — ART POLISH

Improve:

- sprites
- environment
- animation
- water
- rain
- particles
- UI
- lighting
- transitions

---

## PHASE 11 — AUDIO

Add:

- ambience
- sound effects
- music
- mute controls

---

## PHASE 12 — PRESENTATION QA

Test:

- 1366x768 Chromebook display
- keyboard controls
- projector readability
- every rubric requirement
- every checkpoint
- every recovery option
- production build
- offline build
- Firebase build

Run the entire game from beginning to ending multiple times.

---

# 37. SCIENTIFIC CONTENT RULE

NEVER invent biological facts.

If a fact has not been provided or verified:

write:

[VERIFIED CONTENT NEEDED]

Do not silently substitute general frog facts.

Do not assume facts about Mountain Chicken Frogs based on other frog species.

Scientific accuracy is more important than filling every field immediately.

---

# 38. TEXT STYLE

Information shown to the audience should be:

- clear
- concise
- natural
- scientifically accurate
- readable from a projector

Avoid:

- huge paragraphs
- textbook language
- childish language
- AI-sounding filler
- exaggerated dramatic writing

The presenter should be able to talk around the information instead of reading every word.

---

# 39. USER EXPERIENCE RULE

At any moment, the player should understand at least one of these:

WHERE AM I GOING?

WHAT AM I DOING?

WHAT JUST HAPPENED?

WHY DOES IT MATTER?

If none are clear, improve the design.

---

# 40. FINAL EXPERIENCE

The final game should feel approximately like:

START

↓

"I am this frog."

↓

"This is where I live."

↓

"This is how I survive."

↓

"This is my role in the ecosystem."

↓

"Something is changing."

↓

"My species is disappearing."

↓

"This is why."

↓

"People are trying to help."

↓

"This is why saving the species matters."

↓

"I am connected to this species too."

↓

ENDING

The player should come away understanding the Mountain Chicken Frog without feeling like they just completed a worksheet.

---

# 41. ABSOLUTE PRIORITIES

In order:

1. COMPLETE RUBRIC COVERAGE
2. PLAYABLE GAME
3. CLEAR DIRECTION
4. PRESENTATION RELIABILITY
5. HIGH VISUAL QUALITY
6. SIMPLE FUN GAMEPLAY
7. SCIENTIFIC ACCURACY
8. ATMOSPHERE
9. OPTIONAL POLISH

Do not sacrifice the first seven priorities for unnecessary features.

---

# 42. FIRST INSTRUCTION TO THE CODING AGENT

Read this entire specification before editing anything.

If a repository already exists:

inspect it first.

Do not rewrite working systems unnecessarily.

Then implement ONLY:

PHASE 1 — FOUNDATION.

Set up:

- Phaser 3
- TypeScript
- Vite
- correct folder architecture
- responsive game canvas
- MenuScene
- ForestScene
- successful development run
- successful production build

Do not yet create:

- the complete world
- scientific content
- final sprites
- conservation mechanics
- event sequences
- six-degree sequence

At the end:

report:

1. files created
2. files modified
3. architecture created
4. how to run locally
5. how to build production
6. any problems found
7. exact plan for Phase 2

Then STOP.

Wait for approval before proceeding to Phase 2.
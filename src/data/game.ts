import type { RubricKey } from './journal.ts';

/**
 * The game: three short rounds in the same forest. Each round has its own danger (one of the real
 * threats), one random event, a couple of quiz questions that pop up in the middle, and a fact
 * card afterwards. Round 2 is different: some players become the humans hunting the others.
 */
export type RoundId = 'feast' | 'night' | 'fungus';

export interface RoundInfo {
  id: RoundId;
  number: number;
  title: string;
  /** One line on the round card and phones. */
  goal: string;
  /** What's different this round. */
  twist: string;
  seconds: number;
  /** 0 = daytime, 1 = full night. */
  darkness: number;
  pigs: boolean;
  /** Seconds into the round when each hunter walks in (after the third, only with more players). */
  hunters: number[];
  traps: boolean;
  fungus: boolean;
  /** Hide From Humans: some players are humans who catch the frogs; caught frogs go in the cage. */
  hide: boolean;
  /** Quiz questions that pop up during the round. */
  questions: number;
  /** The fact card shown after the round. */
  info: RubricKey;
}

export const ROUNDS: RoundInfo[] = [
  {
    id: 'feast', number: 1, title: 'Bug Feast', seconds: 60,
    goal: 'Eat as many bugs as you can!',
    twist: 'Watch out for wild pigs charging across!',
    darkness: 0, pigs: true, hunters: [], traps: false, fungus: false, hide: false, questions: 2, info: 'niche',
  },
  {
    id: 'night', number: 2, title: 'Hide From Humans', seconds: 75,
    goal: 'Frogs: hide! Humans: catch the frogs!',
    twist: 'Caught frogs go in the cage. Free your friends… or they go in the pot!',
    // Computer hunters only come out when there aren't enough players to be the humans.
    darkness: .85, pigs: false, hunters: [2, 20, 40], traps: false, fungus: false, hide: true, questions: 2, info: 'threats',
  },
  {
    id: 'fungus', number: 3, title: 'Fungus Outbreak', seconds: 60,
    goal: 'Dodge the green fungus. Warm springs cure you!',
    twist: 'Sick frogs are slow, can\'t eat and lose points.',
    darkness: .2, pigs: false, hunters: [], traps: false, fungus: true, hide: false, questions: 2, info: 'support',
  },
];

export type BoostKind = 'speed' | 'tongue' | 'double' | 'shield';

export const BOOSTS: Record<BoostKind, { label: string; text: string; icon: string; seconds: number }> = {
  speed: { label: 'SPEED', text: 'Hop faster!', icon: 'boost-speed', seconds: 8 },
  tongue: { label: 'LONG TONGUE', text: 'Grab bugs from further away!', icon: 'boost-tongue', seconds: 8 },
  double: { label: 'DOUBLE POINTS', text: 'Every bug counts twice!', icon: 'boost-double', seconds: 8 },
  shield: { label: 'LEAF CLOAK', text: 'Hunters, pigs and fungus can\'t get you!', icon: 'boost-shield', seconds: 8 },
};

/** One random event per round. Each is a real thing that happens to the frog's forest. */
export type EventKind = 'rain' | 'golden' | 'quake' | 'wind';
export const EVENTS: Record<EventKind, { title: string; text: string; seconds: number }> = {
  rain: { title: 'RAIN SHOWER!', text: 'Bugs come out in the rain. Eat up!', seconds: 12 },
  golden: { title: 'GIANT GOLDEN CRICKET!', text: 'Catch it for 10 points!', seconds: 15 },
  quake: { title: 'VOLCANO RUMBLE!', text: 'The ground shakes: everyone slows down.', seconds: 7 },
  wind: { title: 'HURRICANE GUST!', text: 'Hold on! The wind pushes everyone.', seconds: 6 },
};

export const GAME = {
  /** The rules on the "How to play" card. (The cave is a secret: it's not in here.) */
  rules: [
    { icon: 'stick', text: 'Explore the forest: drag on your screen (or arrow keys)' },
    { icon: 'cricket', text: 'Hop close to bugs to eat them. Grab boosts!' },
    { icon: 'quiz', text: 'Answer the quiz questions when they pop up' },
  ],
  caughtPenalty: 3,
  pigPenalty: 2,
  /** Hide From Humans: one human for about every six players. */
  playersPerHuman: 6,
  catchPoints: 5,
  freePoints: 3,
  surviveBonus: 10,
  quizSeconds: 15,
  revealSeconds: 9,
};

/** When the round's random event happens: not right at the start or end, and away from the quiz questions. */
export function eventTime(round: RoundInfo, quiz: number[], random = Math.random): number {
  for (let tries = 0; tries < 30; tries++) {
    const at = Math.round(12 + random() * (round.seconds - 27));
    if (quiz.every(time => Math.abs(time - at) >= 8)) return at;
  }
  return Math.round(round.seconds / 2) + 4;
}

/** How many players become humans in Hide From Humans (none when there are too few players). */
export function humansFor(players: number): number {
  if (players < 2) return 0;
  return Math.max(1, Math.min(Math.floor(players / 2), Math.round(players / GAME.playersPerHuman)));
}

/** When the quiz questions pop up in a round: spread out, but not at a predictable second. */
export function questionTimes(round: RoundInfo, random = Math.random): number[] {
  const gap = round.seconds / (round.questions + 1);
  return Array.from({ length: round.questions }, (_, i) => Math.round(gap * (i + 1) + (random() - .5) * gap * .5));
}

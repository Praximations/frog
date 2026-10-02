import type { RubricKey } from './journal.ts';

/**
 * The game: three short rounds in the same pond. Each round has its own danger (one of the real
 * threats), a couple of quiz questions that pop up in the middle, and a fact card afterwards.
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
  /** Seconds into the round when each hunter walks in. */
  hunters: number[];
  traps: boolean;
  fungus: boolean;
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
    darkness: 0, pigs: true, hunters: [], traps: false, fungus: false, questions: 2, info: 'niche',
  },
  {
    id: 'night', number: 2, title: 'Hunter Night', seconds: 60,
    goal: 'Eat bugs in the dark. Stay out of the flashlights!',
    twist: 'Hunters and cage traps catch frogs: −3 points.',
    darkness: .75, pigs: false, hunters: [2, 16, 34], traps: true, fungus: false, questions: 2, info: 'threats',
  },
  {
    id: 'fungus', number: 3, title: 'Fungus Outbreak', seconds: 60,
    goal: 'Dodge the green fungus. Warm pools cure you!',
    twist: 'Sick frogs are slow, can\'t eat and lose points.',
    darkness: .2, pigs: false, hunters: [], traps: false, fungus: true, questions: 2, info: 'support',
  },
];

export type BoostKind = 'speed' | 'tongue' | 'double' | 'shield';

export const BOOSTS: Record<BoostKind, { label: string; text: string; icon: string; seconds: number }> = {
  speed: { label: 'SPEED', text: 'Hop faster!', icon: 'boost-speed', seconds: 8 },
  tongue: { label: 'LONG TONGUE', text: 'Grab bugs from further away!', icon: 'boost-tongue', seconds: 8 },
  double: { label: 'DOUBLE POINTS', text: 'Every bug counts twice!', icon: 'boost-double', seconds: 8 },
  shield: { label: 'LEAF CLOAK', text: 'Hunters, pigs and fungus can\'t get you!', icon: 'boost-shield', seconds: 8 },
};

export const GAME = {
  /** The rules on the "How to play" card. */
  rules: [
    { icon: 'stick', text: 'Move your frog with your phone (or arrow keys)' },
    { icon: 'cricket', text: 'Get close to bugs to eat them. Grab boosts!' },
    { icon: 'quiz', text: 'Answer the quiz questions when they pop up' },
    { icon: 'cave', text: 'Whatever you do… don\'t go in the dark cave' },
  ],
  caughtPenalty: 3,
  pigPenalty: 2,
  quizSeconds: 15,
  revealSeconds: 9,
  /** Each player can only get the cave scare this often (seconds). */
  caveCooldown: 45,
};

/** When the quiz questions pop up in a round: spread out, but not at a predictable second. */
export function questionTimes(round: RoundInfo, random = Math.random): number[] {
  const gap = round.seconds / (round.questions + 1);
  return Array.from({ length: round.questions }, (_, i) => Math.round(gap * (i + 1) + (random() - .5) * gap * .5));
}

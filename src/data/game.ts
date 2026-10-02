/**
 * The one game mode: everyone's frog eats bugs in the pond while humans hunt frogs. No levels:
 * it just gets darker and busier, with a few surprise events, until time runs out.
 */
export type EventKind = 'hunter' | 'swarm' | 'traps' | 'golden' | 'double';

export interface GameEvent {
  at: number;
  kind: EventKind;
  title: string;
  subtitle?: string;
  /** Only happens when at least this many frogs are playing. */
  minFrogs?: number;
}

export const GAME = {
  seconds: 150,
  /** The three rules on the "How to play" screen. */
  rules: [
    { icon: 'stick', text: 'Move your frog with your phone' },
    { icon: 'cricket', text: 'Get close to bugs to eat them' },
    { icon: 'hunter', text: 'Don\'t get caught by humans or traps!' },
  ],
  /** Points lost when a hunter or trap catches you. */
  caughtPenalty: 3,
  events: [
    { at: 8, kind: 'hunter', title: 'HUMANS ARE COMING!', subtitle: 'Stay out of their flashlights' },
    { at: 30, kind: 'swarm', title: 'BUG SWARM!' },
    { at: 42, kind: 'traps', title: 'TRAPS!', subtitle: 'Hunters are setting cages' },
    { at: 55, kind: 'hunter', title: 'ANOTHER HUNTER!' },
    { at: 75, kind: 'golden', title: 'GOLDEN CRICKET!', subtitle: 'Worth 10 points' },
    { at: 92, kind: 'hunter', title: 'MORE HUMANS!', minFrogs: 7 },
    { at: 105, kind: 'swarm', title: 'BUG SWARM!' },
    { at: 125, kind: 'double', title: 'DOUBLE POINTS!', subtitle: 'Last 25 seconds' },
  ] as GameEvent[],
  /** The secret phone scare happens once, somewhere in this window (seconds). */
  secretScare: { from: 50, to: 115 },
};

/** How many phones get the secret scare: 1 for a tiny group, 2 for a small one, otherwise 3. */
export const secretScareCount = (phones: number): number => phones <= 0 ? 0 : phones <= 3 ? 1 : phones <= 8 ? 2 : 3;

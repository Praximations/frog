/**
 * What the projector tells every phone about the map, several times a second. Short arrays keep
 * it small (it goes to every player). The projector runs the game; each phone draws this, plus its
 * own frog, which it moves itself.
 */

/** Frog flags. */
export const FLAG = {
  captured: 1, hidden: 2, frozen: 4, sick: 8, speed: 16, tongue: 32, double: 64, shield: 128, bot: 256, away: 512, safe: 1024, landing: 2048,
} as const;

export const FACINGS = ['down', 'up', 'left', 'right'] as const;
export type Facing = (typeof FACINGS)[number];

/** id, x, y, facing × 2 + moving, flags, seq (bumped when the projector moves the frog itself), score */
export type FrogRow = [string, number, number, number, number, number, number];
/** id, kind (index into PREY_KINDS), x, y */
export type BugRow = [number, number, number, number];
/** frog id, bug id: a tongue snapped out and ate that bug */
export type LickRow = [string, number];
/** x, y, flashlight angle in degrees, walking (0/1) */
export type HunterRow = [number, number, number, number];
/** x, y, direction (1 right, -1 left), charging (0 = still warning) */
export type PigRow = [number, number, number, number];
/** x, y, radius */
export type CloudRow = [number, number, number];
/** id, kind (index into BOOST_KINDS), x, y */
export type PickupRow = [number, number, number, number];
/** id, x, y, shut (0/1) */
export type TrapRow = [number, number, number, number];
/** id, name, look */
export type RosterRow = [string, string, string];

export interface WorldSnapshot {
  /** Counts up with every snapshot. */
  n: number;
  f: FrogRow[];
  b: BugRow[];
  l?: LickRow[];
  h?: HunterRow[];
  p?: PigRow[];
  c?: CloudRow[];
  u?: PickupRow[];
  k?: TrapRow[];
  /** Names and looks of every frog: sent now and then, and whenever someone joins. */
  r?: RosterRow[];
  /** Seconds left in the round. */
  t?: number;
}

export const PREY_KINDS = ['cricket', 'beetle', 'millipede', 'snail', 'crab', 'golden', 'mega'] as const;
export const BOOST_KINDS = ['speed', 'tongue', 'double', 'shield'] as const;

/** How fast frogs hop (world pixels per second), before boosts. */
export const FROG_SPEED = 300;
export function frogPace(flags: number, bot = false): number {
  return FROG_SPEED * (bot ? .72 : 1) * (flags & FLAG.speed ? 1.5 : 1) * (flags & FLAG.sick ? .55 : 1);
}

/** Pure scoring helpers (no Phaser), shared by the projector and phones and unit tested. */

/**
 * Every player gets their own colour so they can spot their frog: the ring under it, its name tag,
 * and the colour bar on their phone. Picked to stand out on grass and dirt, day or night.
 */
export const COLORS = [
  { name: 'Red', hex: '#ff4d4d' }, { name: 'Blue', hex: '#4d8bff' }, { name: 'Yellow', hex: '#ffe14d' },
  { name: 'Purple', hex: '#a35cff' }, { name: 'Orange', hex: '#ff9a2e' }, { name: 'Cyan', hex: '#3de0ff' },
  { name: 'Pink', hex: '#ff6ad5' }, { name: 'White', hex: '#ffffff' }, { name: 'Lime', hex: '#b6f24d' },
  { name: 'Navy', hex: '#2a3f9a' }, { name: 'Coral', hex: '#ff8a76' }, { name: 'Teal', hex: '#14a39a' },
  { name: 'Gold', hex: '#d4a017' }, { name: 'Lavender', hex: '#c9a7ff' }, { name: 'Magenta', hex: '#e0218a' },
  { name: 'Sky', hex: '#8fd3ff' }, { name: 'Black', hex: '#2a2a2a' }, { name: 'Mint', hex: '#7dffc8' },
  { name: 'Maroon', hex: '#8b1e3f' }, { name: 'Silver', hex: '#b8c2cc' },
];
export type PlayerColor = (typeof COLORS)[number];

/** The least-used colour, so the first 20 players all get different ones. */
export function pickColor(used: Iterable<number>): number {
  const counts = COLORS.map(() => 0);
  for (const index of used) if (counts[index] !== undefined) counts[index]++;
  return counts.indexOf(Math.min(...counts));
}

/** Dark text on light colours, white text on dark ones. */
export function textOn(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  const luminance = (0.299 * (value >> 16) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255;
  return luminance > .6 ? '#1d1712' : '#ffffff';
}

export interface Scored { id: string; name: string; score: number; bot?: boolean }
export interface Ranked { id: string; name: string; score: number; rank: number }

/** Highest score first; equal scores share a rank; computer frogs never take a place from a person. */
export function ranking(members: Iterable<Scored>): Ranked[] {
  const sorted = [...members].filter(member => !member.bot).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let rank = 0, previous = Number.NaN;
  return sorted.map((member, index) => {
    if (member.score !== previous) { rank = index + 1; previous = member.score; }
    return { id: member.id, name: member.name, score: member.score, rank };
  });
}

/** Computer frogs join only when fewer than `minimum` people are playing, so it never feels empty. */
export const botsNeeded = (humans: number, minimum = 3): number => Math.max(0, minimum - humans);

/** Losing points never goes below zero. */
export const addPoints = (score: number, points: number): number => Math.max(0, score + points);

/** Quiz points: 10 for a right answer plus up to 5 for answering fast. */
export function quizPoints(correct: boolean, secondsLeft: number, seconds: number): number {
  if (!correct) return 0;
  return 10 + Math.round(5 * Math.max(0, Math.min(1, secondsLeft / seconds)));
}

/** Pure team-game helpers (no Phaser), shared by the projector and phones and unit tested. */
export type Team = 0 | 1;

export const TEAMS = [
  { id: 0 as Team, name: 'Team Dominica', short: 'Dominica', color: '#4f9a3a', light: '#c8f07a', hex: 0x4f9a3a },
  { id: 1 as Team, name: 'Team Montserrat', short: 'Montserrat', color: '#e0802a', light: '#ffd08a', hex: 0xe0802a },
];

export interface Scored { id: string; name: string; team: Team; score: number; bot?: boolean }

/** New players join the smaller team (ties go to Dominica). */
export function pickTeam(members: Iterable<{ team: Team }>): Team {
  const counts = teamSizes(members);
  return counts[1] < counts[0] ? 1 : 0;
}

export function teamSizes(members: Iterable<{ team: Team }>): [number, number] {
  const counts: [number, number] = [0, 0];
  for (const member of members) counts[member.team]++;
  return counts;
}

export function teamTotals(members: Iterable<{ team: Team; score: number }>): [number, number] {
  const totals: [number, number] = [0, 0];
  for (const member of members) totals[member.team] += member.score;
  return totals;
}

/** 0 or 1 for the winning team, -1 for a draw. */
export function winner(totals: [number, number]): Team | -1 {
  return totals[0] === totals[1] ? -1 : totals[0] > totals[1] ? 0 : 1;
}

export interface Ranked { id: string; name: string; team: Team; score: number; rank: number }

/** Highest score first; equal scores share a rank; bots never take a podium spot from a person. */
export function ranking(members: Iterable<Scored>): Ranked[] {
  const sorted = [...members].filter(member => !member.bot).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let rank = 0, previous = Number.NaN;
  return sorted.map((member, index) => {
    if (member.score !== previous) { rank = index + 1; previous = member.score; }
    return { id: member.id, name: member.name, team: member.team, score: member.score, rank };
  });
}

/** How many computer frogs each team needs so neither side is ever empty (min frogs per team). */
export function botsNeeded(humans: [number, number], minimum = 2): [number, number] {
  return [Math.max(0, minimum - humans[0]), Math.max(0, minimum - humans[1])];
}

/** Losing points never goes below zero. */
export const addPoints = (score: number, points: number): number => Math.max(0, score + points);

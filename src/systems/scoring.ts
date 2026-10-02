/** Kahoot-style scoring: correct answers earn up to 1000, faster is better, streaks add a bonus. */
export interface PlayerScore {
  id: string;
  name: string;
  score: number;
  streak: number;
  online: boolean;
  correct: number;
  bugs: number;
}

export function quizPoints(correct: boolean, elapsedMs: number, limitMs: number, streak: number): number {
  if (!correct) return 0;
  const fraction = Math.max(0, Math.min(1, elapsedMs / Math.max(1, limitMs)));
  const base = Math.round(1000 * (1 - fraction / 2));
  const bonus = Math.min(Math.max(0, streak - 1), 5) * 100;
  return base + bonus;
}

export const BUG_POINTS = 150;

export interface Ranked { id: string; name: string; score: number; rank: number }

/** Highest score first; equal scores share a rank; names break ties alphabetically. */
export function leaderboard(players: Iterable<PlayerScore>): Ranked[] {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let rank = 0, previous = Number.NaN;
  return sorted.map((player, index) => {
    if (player.score !== previous) { rank = index + 1; previous = player.score; }
    return { id: player.id, name: player.name, score: player.score, rank };
  });
}

import type Phaser from 'phaser';
import type { PartyFrog } from '../entities/PartyFrog';
import type { Team } from '../systems/match';

/** What a round can ask of the pond. */
export interface RoundContext {
  scene: Phaser.Scene;
  bounds: Phaser.Geom.Rectangle;
  /** Frogs that can currently play. */
  frogs(): PartyFrog[];
  award(frog: PartyFrog, points: number, x: number, y: number): void;
  caught(frog: PartyFrog): void;
  toast(tag: string, text: string, kind?: string): void;
  home(team: Team): { x: number; y: number };
}

export interface RoundMode {
  start(): void;
  update(now: number, delta: number): void;
  /** Where a computer frog should head next. */
  botTarget(frog: PartyFrog, now: number): { x: number; y: number } | null;
  end(): void;
}

export const nearest = <T>(items: T[], x: number, y: number, at: (item: T) => { x: number; y: number }): T | undefined => {
  let best: T | undefined, bestDistance = Infinity;
  for (const item of items) {
    const point = at(item);
    const d = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (d < bestDistance) { best = item; bestDistance = d; }
  }
  return best;
};

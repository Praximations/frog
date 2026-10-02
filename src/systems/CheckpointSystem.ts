export interface GameSnapshot {
  stage: number;
  eaten: number;
  energy: number;
  position: { x: number; y: number };
  caught: number[];
}

export const CHECKPOINTS = [
  { id: 'checkpoint_spawn', name: 'Clearing', x: 560, y: 880 },
  { id: 'checkpoint_species', name: 'Find food', x: 560, y: 820 },
  { id: 'checkpoint_niche', name: 'Stream', x: 865, y: 600 },
  { id: 'checkpoint_habitat', name: 'Field station', x: 1720, y: 775 },
  { id: 'checkpoint_conservation', name: 'Explore', x: 1810, y: 1230 },
] as const;

/** In-memory recovery; snapshots never expose the active mutable game objects. */
export class CheckpointSystem {
  private active = 0;
  private saved = new Map<number, GameSnapshot>();

  capture(snapshot: GameSnapshot): void {
    if (!Number.isInteger(snapshot.stage) || snapshot.stage < 0 || snapshot.stage >= CHECKPOINTS.length) throw new Error('Invalid checkpoint');
    this.active = snapshot.stage; this.saved.set(snapshot.stage, structuredClone(snapshot));
  }
  restore(): GameSnapshot {
    return structuredClone(this.saved.get(this.active) || this.preset(this.active));
  }
  move(direction: -1 | 1): GameSnapshot {
    this.active = Math.max(0, Math.min(CHECKPOINTS.length - 1, this.active + direction));
    return this.restore();
  }
  get name(): string { return CHECKPOINTS[this.active].name; }
  private preset(stage: number): GameSnapshot {
    const checkpoint = CHECKPOINTS[stage];
    return { stage, eaten: stage >= 2 ? 3 : 0, energy: 100, position: { x: checkpoint.x, y: checkpoint.y }, caught: stage >= 2 ? [0, 1, 2] : [] };
  }
}

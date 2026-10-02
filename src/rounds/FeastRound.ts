import Phaser from 'phaser';
import { Prey, PREY, type PreyKind } from '../entities/Critters';
import { nearest, type RoundContext, type RoundMode } from './types';
import type { PartyFrog } from '../entities/PartyFrog';

const KINDS: [PreyKind, number][] = [['cricket', .5], ['beetle', .14], ['snail', .1], ['millipede', .06], ['crab', .13], ['golden', .07]];

/** Round 1: everyone hunts at once. Touch a bug to eat it. */
export class FeastRound implements RoundMode {
  private bugs: Prey[] = [];
  private spawnIn = 0;

  constructor(private readonly ctx: RoundContext) {}

  private get max(): number { return Phaser.Math.Clamp(Math.round(8 + this.ctx.frogs().length * 1.4), 8, 44); }

  start(): void { for (let i = 0; i < this.max; i++) this.spawn(); }

  private spawn(): void {
    let roll = Math.random(), kind: PreyKind = 'cricket';
    for (const [option, weight] of KINDS) { if (roll < weight) { kind = option; break; } roll -= weight; }
    const area = this.ctx.bounds;
    const prey = new Prey(this.ctx.scene, kind, Phaser.Math.Between(area.left + 20, area.right - 20), Phaser.Math.Between(area.top + 10, area.bottom - 10), area);
    prey.sprite.setScale(0);
    this.ctx.scene.tweens.add({ targets: prey.sprite, scale: 4, duration: 240, ease: 'Back.easeOut' });
    this.bugs.push(prey);
  }

  update(_now: number, delta: number): void {
    const frogs = this.ctx.frogs();
    for (const bug of this.bugs) {
      const chaser = nearest(frogs, bug.sprite.x, bug.sprite.y, frog => frog);
      bug.update(delta, chaser);
      if (!bug.alive) continue;
      for (const frog of frogs) {
        if (frog.frozenUntil > this.ctx.scene.time.now) continue;
        if (Math.abs(frog.x - bug.sprite.x) < 40 && Math.abs(frog.y - 6 - bug.sprite.y) < 34) {
          bug.eat(frog.x, frog.y - 10);
          this.ctx.award(frog, PREY[bug.kind].points, bug.sprite.x, bug.sprite.y);
          break;
        }
      }
    }
    this.bugs = this.bugs.filter(bug => bug.alive);
    this.spawnIn -= delta;
    if (this.spawnIn <= 0 && this.bugs.length < this.max) { this.spawn(); this.spawnIn = 260; }
  }

  botTarget(frog: PartyFrog): { x: number; y: number } | null {
    const bug = nearest(this.bugs, frog.x, frog.y, item => item.sprite);
    return bug ? { x: bug.sprite.x, y: bug.sprite.y } : null;
  }

  end(): void { for (const bug of this.bugs) bug.destroy(); this.bugs = []; }
}

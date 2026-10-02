import Phaser from 'phaser';
import { nearest, type RoundContext, type RoundMode } from './types';
import type { PartyFrog } from '../entities/PartyFrog';
import { TEAMS, type Team } from '../systems/match';
import { sound } from '../systems/Sound';

export const POOLS: Record<Team, { x: number; y: number }> = { 0: { x: 190, y: 420 }, 1: { x: 1090, y: 420 } };

/** Round 3: carry lost frogs, one at a time, into your team's warm rescue pool. */
export class RescueRound implements RoundMode {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private lost: Phaser.GameObjects.Image[] = [];
  private pig!: { sprite: Phaser.GameObjects.Image; vx: number; vy: number; restUntil: number };
  private spawnIn = 0;
  private warned = false;

  constructor(private readonly ctx: RoundContext) {}

  private get max(): number { return Phaser.Math.Clamp(Math.round(5 + this.ctx.frogs().length * .6), 5, 20); }

  start(): void {
    const { scene } = this.ctx;
    for (const team of [0, 1] as Team[]) {
      const { x, y } = POOLS[team];
      this.objects.push(scene.add.image(x, y + 50, 'pool').setOrigin(.5, .9).setScale(4).setDepth(2));
      this.objects.push(scene.add.particles(x, y - 10, 'steam', { lifespan: 2000, speedY: { min: -40, max: -20 }, scale: { start: 3, end: 6 }, alpha: { start: .5, end: 0 }, frequency: 200, x: { min: -70, max: 70 } }).setDepth(3000));
      this.objects.push(scene.add.text(x, y - 92, `${TEAMS[team].short.toUpperCase()} POOL`, { fontFamily: 'PressStart', fontSize: '15px', color: '#fffbea', backgroundColor: TEAMS[team].color, padding: { x: 8, y: 6 } }).setOrigin(.5).setDepth(3900));
      this.objects.push(scene.add.image(x + (team ? -125 : 125), y + 40, 'solar').setOrigin(.5, .9).setScale(3.4).setDepth(y + 40));
    }
    const sprite = scene.add.image(640, 420, 'pig').setOrigin(.5, .9).setScale(4).setDepth(420);
    this.objects.push(sprite);
    this.pig = { sprite, vx: 60, vy: 30, restUntil: 0 };
    for (let i = 0; i < this.max; i++) this.spawn();
  }

  private spawn(x?: number, y?: number): void {
    const px = x ?? Phaser.Math.Between(390, 890), py = y ?? Phaser.Math.Between(this.ctx.bounds.top + 10, this.ctx.bounds.bottom - 10);
    const image = this.ctx.scene.add.image(px, py, 'frog-down-0').setScale(2.2).setTint(0xbfe8b0).setDepth(py);
    image.setData('bob', Math.random() * 6);
    this.lost.push(image);
  }

  update(now: number, delta: number): void {
    const frogs = this.ctx.frogs();
    for (const image of this.lost) {
      const bob = (image.getData('bob') as number) + delta / 200;
      image.setData('bob', bob).setTexture(Math.sin(bob) > .6 ? 'frog-down-2' : 'frog-down-0');
    }
    for (const frog of frogs) {
      if (now < frog.frozenUntil) continue;
      if (!frog.carrying) {
        const found = this.lost.find(image => Math.abs(image.x - frog.x) < 40 && Math.abs(image.y - frog.y) < 34);
        if (found) {
          this.lost = this.lost.filter(image => image !== found);
          frog.carrying = found.setScale(2).clearTint().setTint(0xeaf4d8);
          sound.play('join');
        }
      } else {
        const pool = POOLS[frog.team];
        if (Phaser.Math.Distance.Between(frog.x, frog.y, pool.x, pool.y) < 105) {
          const rescued = frog.carrying;
          frog.carrying = null;
          this.ctx.award(frog, 5, pool.x, pool.y - 40);
          sound.play('splash');
          this.ctx.scene.tweens.add({ targets: rescued, x: pool.x + Phaser.Math.Between(-50, 50), y: pool.y + Phaser.Math.Between(-10, 20), scale: 1.6, duration: 500, ease: 'Sine.easeOut', onComplete: () => this.ctx.scene.tweens.add({ targets: rescued, alpha: 0, duration: 900, delay: 400, onComplete: () => rescued.destroy() }) });
        }
      }
    }
    this.updatePig(now, delta, frogs);
    this.spawnIn -= delta;
    if (this.spawnIn <= 0 && this.lost.length < this.max) { this.spawn(); this.spawnIn = 500; }
  }

  private updatePig(now: number, delta: number, frogs: PartyFrog[]): void {
    const pig = this.pig;
    if (now > pig.restUntil) {
      const target = nearest(frogs.filter(frog => frog.carrying), pig.sprite.x, pig.sprite.y, frog => frog);
      if (target && Phaser.Math.Distance.Between(target.x, target.y, pig.sprite.x, pig.sprite.y) < 260) {
        const angle = Math.atan2(target.y - pig.sprite.y, target.x - pig.sprite.x);
        pig.vx = Math.cos(angle) * 150; pig.vy = Math.sin(angle) * 150;
      } else if (Math.random() < .015) { const a = Math.random() * Math.PI * 2; pig.vx = Math.cos(a) * 70; pig.vy = Math.sin(a) * 50; }
    }
    const x = Phaser.Math.Clamp(pig.sprite.x + pig.vx * delta / 1000, 330, 950);
    const y = Phaser.Math.Clamp(pig.sprite.y + pig.vy * delta / 1000, this.ctx.bounds.top + 20, this.ctx.bounds.bottom);
    if (x <= 330 || x >= 950) pig.vx *= -1;
    if (y <= this.ctx.bounds.top + 20 || y >= this.ctx.bounds.bottom) pig.vy *= -1;
    pig.sprite.setPosition(x, y).setDepth(y).setFlipX(pig.vx < 0).setTexture(Math.floor(now / 160) % 2 ? 'pig-1' : 'pig');
    for (const frog of frogs) {
      if (!frog.carrying || now < frog.frozenUntil || Math.abs(frog.x - x) > 50 || Math.abs(frog.y - y) > 36) continue;
      const dropped = frog.carrying;
      frog.carrying = null;
      dropped.destroy();
      this.spawn(frog.x + Phaser.Math.Between(-30, 30), frog.y + 20);
      frog.frozenUntil = now + 800;
      frog.teleport(frog.x + Math.sign(frog.x - x || 1) * 50, frog.y);
      sound.play('hurt');
      if (!this.warned) { this.warned = true; this.ctx.toast('Feral pig!', 'Invasive feral pigs really do eat mountain chickens.', 'threat'); }
      pig.restUntil = now + 1500; pig.vx = 0; pig.vy = 0;
    }
  }

  botTarget(frog: PartyFrog): { x: number; y: number } | null {
    if (frog.carrying) return POOLS[frog.team];
    const target = nearest(this.lost, frog.x, frog.y, image => image);
    return target ? { x: target.x, y: target.y } : null;
  }

  end(): void {
    for (const object of this.objects) object.destroy();
    for (const image of this.lost) image.destroy();
    for (const frog of this.ctx.frogs()) { frog.carrying?.destroy(); frog.carrying = null; }
    this.objects = []; this.lost = [];
  }
}

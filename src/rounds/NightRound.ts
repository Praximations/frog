import Phaser from 'phaser';
import { nearest, type RoundContext, type RoundMode } from './types';
import type { PartyFrog } from '../entities/PartyFrog';
import { sound } from '../systems/Sound';

interface Hunter { sprite: Phaser.GameObjects.Image; beam: Phaser.GameObjects.Image; lamp: Phaser.GameObjects.Image; from: Phaser.Math.Vector2; to: Phaser.Math.Vector2; t: number; speed: number; facing: number; sweep: number }
interface Glow { image: Phaser.GameObjects.Image; halo: Phaser.GameObjects.Image; x: number; y: number; points: number; phase: number }

const BEAM_RANGE = 250;
const BEAM_HALF_ANGLE = .27;

/** Round 2: collect glowing bugs at night while hunters sweep flashlights. Getting caught = jump-scare. */
export class NightRound implements RoundMode {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private hunters: Hunter[] = [];
  private glows: Glow[] = [];
  private bushes: { x: number; y: number }[] = [];
  private pools: { x: number; y: number }[] = [];
  private lastSpore = new Map<string, number>();
  private spawnIn = 0;

  constructor(private readonly ctx: RoundContext) {}

  private get max(): number { return Phaser.Math.Clamp(Math.round(10 + this.ctx.frogs().length * .9), 10, 34); }

  start(): void {
    const { scene } = this.ctx;
    this.objects.push(scene.add.rectangle(640, 360, 1280, 720, 0x061226, .52).setDepth(-50));
    this.objects.push(scene.add.particles(0, 0, 'firefly', { x: { min: 0, max: 1280 }, y: { min: 140, max: 720 }, lifespan: 3600, speed: { min: 4, max: 14 }, scale: { start: 2.5, end: 0 }, alpha: { start: .9, end: 0 }, frequency: 220, blendMode: 'ADD' }).setDepth(3200));
    for (const [x, y] of [[300, 420], [640, 300], [980, 420], [640, 590]]) {
      this.objects.push(scene.add.image(x, y + 26, 'bush').setOrigin(.5, .9).setScale(4.4).setDepth(y + 40).setTint(0x8aa0b8));
      this.bushes.push({ x, y });
    }
    for (const [x, y] of [[470, 520], [810, 520], [640, 440]]) {
      this.objects.push(scene.add.image(x, y + 26, 'spore-pool').setOrigin(.5, .9).setScale(4).setDepth(1));
      const glow = scene.add.image(x, y, 'glow').setScale(5).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD).setTint(0x7ad04a).setAlpha(.5);
      scene.tweens.add({ targets: glow, alpha: .2, duration: 900, yoyo: true, repeat: -1 });
      this.objects.push(glow, scene.add.particles(x, y, 'spore', { lifespan: 1600, speedY: { min: -40, max: -15 }, scale: { start: 3, end: 0 }, frequency: 260, blendMode: 'ADD', x: { min: -40, max: 40 } }).setDepth(3150));
      this.pools.push({ x, y });
    }
    const routes: [number, number, number, number, number][] = [[200, 240, 1080, 240, Math.PI / 2], [1080, 630, 200, 630, -Math.PI / 2]];
    if (this.ctx.frogs().length > 10) routes.push([640, 220, 640, 640, 0]);
    routes.forEach(([x0, y0, x1, y1, facing], i) => {
      const sprite = scene.add.image(x0, y0, 'hunter').setOrigin(.5, .9).setScale(4).setDepth(y0);
      const beam = scene.add.image(x0, y0, 'beam').setOrigin(0, .5).setScale(4, 5).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD);
      const lamp = scene.add.image(x0, y0, 'glow').setScale(3).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0);
      this.objects.push(sprite, beam, lamp);
      this.hunters.push({ sprite, beam, lamp, from: new Phaser.Math.Vector2(x0, y0), to: new Phaser.Math.Vector2(x1, y1), t: i * 1.7, speed: 95, facing, sweep: i * 2 });
    });
    for (let i = 0; i < this.max; i++) this.spawn();
  }

  private spawn(): void {
    const { scene, bounds } = this.ctx;
    const golden = Math.random() < .12;
    const x = Phaser.Math.Between(bounds.left + 20, bounds.right - 20), y = Phaser.Math.Between(bounds.top + 10, bounds.bottom - 10);
    const image = scene.add.image(x, y, golden ? 'goldfly' : 'firefly').setScale(golden ? 4 : 5).setDepth(3150);
    const halo = scene.add.image(x, y, 'glow').setScale(golden ? 2.6 : 2).setDepth(3140).setBlendMode(Phaser.BlendModes.ADD).setTint(golden ? 0xffd84a : 0xc8f07a).setAlpha(.7);
    this.glows.push({ image, halo, x, y, points: golden ? 3 : 1, phase: Math.random() * 6 });
  }

  private inBeam(hunter: Hunter, x: number, y: number): boolean {
    const dx = x - hunter.beam.x, dy = y - hunter.beam.y;
    if (dx * dx + dy * dy > BEAM_RANGE * BEAM_RANGE) return false;
    return Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - hunter.beam.rotation)) < BEAM_HALF_ANGLE;
  }

  update(now: number, delta: number): void {
    for (const hunter of this.hunters) {
      hunter.t += delta / 1000;
      const length = Phaser.Math.Distance.BetweenPoints(hunter.from, hunter.to);
      const travelled = (hunter.t * hunter.speed) % (length * 2);
      const progress = (travelled < length ? travelled : length * 2 - travelled) / length;
      const x = Phaser.Math.Linear(hunter.from.x, hunter.to.x, progress), y = Phaser.Math.Linear(hunter.from.y, hunter.to.y, progress);
      const heading = travelled < length ? Math.sign(hunter.to.x - hunter.from.x) : Math.sign(hunter.from.x - hunter.to.x);
      hunter.sprite.setPosition(x, y).setDepth(y).setFlipX(heading < 0).setTexture(Math.floor(hunter.t * 4) % 2 ? 'hunter-1' : 'hunter');
      const angle = hunter.facing === 0 ? (Math.floor(hunter.t / 3) % 2 ? Math.PI : 0) + Math.sin(hunter.t * 1.5) * .6 : hunter.facing + Math.sin(hunter.t * 1.2 + hunter.sweep) * 1.05;
      hunter.beam.setPosition(x + 18, y - 40).setRotation(angle);
      hunter.lamp.setPosition(x, y - 92);
    }
    const frogs = this.ctx.frogs();
    for (const frog of frogs) {
      frog.hidden = this.bushes.some(bush => Math.abs(frog.x - bush.x) < 56 && Math.abs(frog.y - bush.y) < 40);
      if (frog.hidden || now < frog.safeUntil || now < frog.frozenUntil) continue;
      if (this.hunters.some(hunter => this.inBeam(hunter, frog.x, frog.y - 10))) { this.ctx.caught(frog); continue; }
      for (const pool of this.pools) {
        if (((frog.x - pool.x) / 62) ** 2 + ((frog.y - pool.y) / 28) ** 2 < 1 && now - (this.lastSpore.get(frog.id) ?? -9999) > 1600) {
          this.lastSpore.set(frog.id, now);
          frog.slowUntil = now + 3000;
          this.ctx.award(frog, -1, frog.x, frog.y - 20);
          sound.play('spore');
        }
      }
    }
    for (const glow of this.glows) {
      glow.phase += delta / 500;
      const gx = glow.x + Math.sin(glow.phase) * 14, gy = glow.y + Math.cos(glow.phase * 1.3) * 10;
      glow.image.setPosition(gx, gy); glow.halo.setPosition(gx, gy);
      const frog = frogs.find(item => now >= item.frozenUntil && Math.abs(item.x - gx) < 38 && Math.abs(item.y - 10 - gy) < 34);
      if (frog) {
        this.ctx.award(frog, glow.points, gx, gy);
        glow.image.destroy(); glow.halo.destroy(); glow.points = 0;
      }
    }
    this.glows = this.glows.filter(glow => glow.points > 0);
    this.spawnIn -= delta;
    if (this.spawnIn <= 0 && this.glows.length < this.max) { this.spawn(); this.spawnIn = 300; }
  }

  botTarget(frog: PartyFrog): { x: number; y: number } | null {
    // Step out of a beam that is about to sweep over us.
    for (const hunter of this.hunters) {
      const dx = frog.x - hunter.beam.x, dy = frog.y - hunter.beam.y;
      if (dx * dx + dy * dy < (BEAM_RANGE + 60) ** 2 && Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - hunter.beam.rotation)) < BEAM_HALF_ANGLE + .35) {
        const away = Math.atan2(dy, dx) + Math.PI / 2;
        return { x: frog.x + Math.cos(away) * 140, y: frog.y + Math.sin(away) * 140 };
      }
    }
    const glow = nearest(this.glows, frog.x, frog.y, item => item);
    return glow ? { x: glow.x, y: glow.y } : null;
  }

  end(): void {
    for (const object of this.objects) object.destroy();
    for (const glow of this.glows) { glow.image.destroy(); glow.halo.destroy(); }
    this.objects = []; this.glows = []; this.hunters = [];
    for (const frog of this.ctx.frogs()) { frog.hidden = false; frog.slowUntil = 0; }
  }
}

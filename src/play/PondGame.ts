import Phaser from 'phaser';
import { Prey, PREY, type PreyKind } from '../entities/Critters';
import type { PartyFrog } from '../entities/PartyFrog';
import { BOOSTS, type BoostKind, type RoundInfo } from '../data/game';
import { BOUNDS, CAVE, POOLS, distance, openSpot } from './layout';
import { sound } from '../systems/Sound';

/** What a round needs from the pond scene. */
export interface GameContext {
  scene: Phaser.Scene;
  /** Frogs that are playing (online). */
  frogs(): PartyFrog[];
  award(frog: PartyFrog, points: number, x: number, y: number): void;
  /** A hunter (grabber = where its sack is) or a trap (grabber = null) caught a frog. */
  caught(frog: PartyFrog, by: 'hunter' | 'trap', grabber: { x: number; y: number } | null): void;
  /** A charging pig bowled a frog over, sending it flying in direction `dir`. */
  knocked(frog: PartyFrog, dir: 1 | -1): void;
  boost(frog: PartyFrog, kind: BoostKind): void;
  sick(frog: PartyFrog, sick: boolean): void;
  announce(title: string, subtitle?: string, kind?: string): void;
  setDarkness(level: number): void;
}

interface Hunter {
  sprite: Phaser.GameObjects.Image; beam: Phaser.GameObjects.Image; lamp: Phaser.GameObjects.Image;
  x: number; y: number; target: { x: number; y: number }; speed: number; t: number; phase: number;
  heading: number; angle: number; pauseUntil: number; nextTrap: number; entering: boolean;
}
interface Trap { sprite: Phaser.GameObjects.Image; x: number; y: number; until: number; sprung: boolean }
interface Pickup { kind: BoostKind; icon: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; x: number; y: number; until: number }
interface Pig { sprite: Phaser.GameObjects.Image; warning: Phaser.GameObjects.Text; y: number; dir: 1 | -1; x: number; chargeAt: number; hit: Set<string> }
interface Cloud { glow: Phaser.GameObjects.Image; spores: Phaser.GameObjects.Particles.ParticleEmitter; x: number; y: number; vx: number; vy: number; r: number }

const KINDS: [PreyKind, number][] = [['cricket', .5], ['beetle', .15], ['snail', .07], ['millipede', .07], ['crab', .14], ['golden', .07]];
const LICK_RANGE = 92;
const BEAM_RANGE = 240;
const BEAM_HALF = .27;
const GRAB_RANGE = 36;
const PICKUP_RANGE = 44;
const PIG_SPEED = 560;

export const nearest = <T>(items: T[], x: number, y: number, at: (item: T) => { x: number; y: number }): T | undefined => {
  let best: T | undefined, bestDistance = Infinity;
  for (const item of items) {
    const point = at(item);
    const d = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (d < bestDistance) { best = item; bestDistance = d; }
  }
  return best;
};

/**
 * One round. Always: bugs to lick up and boosts to grab. Plus the round's own danger: charging
 * feral pigs, hunters with flashlights and cage traps, or drifting clouds of chytrid fungus with
 * warm pools that cure it.
 */
export class PondGame {
  /** Seconds played this round. */
  elapsed = 0;
  private bugs: Prey[] = [];
  private hunters: Hunter[] = [];
  private traps: Trap[] = [];
  private pickups: Pickup[] = [];
  private pigs: Pig[] = [];
  private clouds: Cloud[] = [];
  private objects: Phaser.GameObjects.GameObject[] = [];
  private hunterIndex = 0;
  private spawnIn = 0;
  private pickupIn = 4;
  private pigIn = 5;
  private cloudIn = 0;
  private sickTick = new Map<string, number>();
  private botBugs = new Map<string, Prey>();
  private tongues!: Phaser.GameObjects.Graphics;

  constructor(private readonly ctx: GameContext, readonly round: RoundInfo) {}

  private get max(): number { return Phaser.Math.Clamp(Math.round(14 + this.ctx.frogs().length * 1.1), 16, 48); }

  start(): void {
    const { scene } = this.ctx;
    this.tongues = scene.add.graphics().setDepth(3600);
    this.objects.push(this.tongues);
    if (this.round.darkness > .3) {
      this.objects.push(scene.add.particles(0, 0, 'firefly', { x: { min: 0, max: BOUNDS.right + 70 }, y: { min: 180, max: BOUNDS.bottom + 60 }, lifespan: 3600, speed: { min: 4, max: 14 }, scale: { start: 2.5, end: 0 }, alpha: { start: .9, end: 0 }, frequency: 200, blendMode: 'ADD' }).setDepth(3200));
    }
    if (this.round.fungus) {
      for (const pool of POOLS) {
        this.objects.push(scene.add.image(pool.x, pool.y + 50, 'pool').setOrigin(.5, .9).setScale(4).setDepth(2));
        this.objects.push(scene.add.particles(pool.x, pool.y - 10, 'steam', { lifespan: 2000, speedY: { min: -40, max: -20 }, scale: { start: 3, end: 6 }, alpha: { start: .5, end: 0 }, frequency: 180, x: { min: -80, max: 80 } }).setDepth(3000));
        this.objects.push(scene.add.text(pool.x, pool.y - 72, 'WARM POOL 31 °C', { fontFamily: 'PressStart', fontSize: '15px', color: '#fff6dc', backgroundColor: '#c93a2a', padding: { x: 6, y: 4 } }).setOrigin(.5).setDepth(3900));
      }
    }
    for (let i = 0; i < this.max; i++) this.spawnBug();
    this.ctx.setDarkness(this.round.darkness);
  }

  // ---------------------------------------------------------------- bugs and boosts

  private spawnBug(): void {
    let roll = Math.random(), kind: PreyKind = 'cricket';
    for (const [option, weight] of KINDS) { if (roll < weight) { kind = option; break; } roll -= weight; }
    const spot = openSpot(this.dangers());
    const prey = new Prey(this.ctx.scene, kind, spot.x, spot.y, BOUNDS);
    const size = prey.sprite.scale;
    prey.sprite.setScale(0);
    this.ctx.scene.tweens.add({ targets: prey.sprite, scale: size, duration: 260, ease: 'Back.easeOut' });
    prey.setGlow(this.round.darkness);
    this.bugs.push(prey);
  }

  private lick(frog: PartyFrog, now: number): void {
    const range = LICK_RANGE * (frog.boosted('tongue', now) ? 1.9 : 1);
    const bug = nearest(this.bugs.filter(item => item.alive), frog.x, frog.y - 6, item => item.sprite);
    if (!bug || Phaser.Math.Distance.Between(frog.x, frog.y - 6, bug.sprite.x, bug.sprite.y) > range) return;
    frog.lick(bug.sprite.x, bug.sprite.y, now);
    const mouth = frog.mouth();
    bug.eat(mouth.x, mouth.y, 60);
    frog.nextLick = now + 260;
    this.ctx.award(frog, PREY[bug.kind].points * (frog.boosted('double', now) ? 2 : 1), bug.sprite.x, bug.sprite.y);
  }

  private spawnPickup(now: number): void {
    const kinds = Object.keys(BOOSTS) as BoostKind[];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const spot = openSpot([...this.dangers(), ...this.pickups.map(item => ({ x: item.x, y: item.y, r: 200 }))]);
    const { scene } = this.ctx;
    const glow = scene.add.image(spot.x, spot.y, 'glow').setScale(3.4).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0).setAlpha(.8);
    const icon = scene.add.image(spot.x, spot.y, BOOSTS[kind].icon).setScale(0).setDepth(spot.y + 5);
    scene.tweens.add({ targets: icon, scale: 3.6, duration: 300, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: icon, y: spot.y - 10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 300 });
    this.pickups.push({ kind, icon, glow, x: spot.x, y: spot.y, until: now + 15000 });
    sound.play('chime');
  }

  private removePickup(pickup: Pickup): void { pickup.icon.destroy(); pickup.glow.destroy(); }

  // ---------------------------------------------------------------- pigs (round 1)

  private sendPig(): void {
    const { scene } = this.ctx;
    const dir: 1 | -1 = Math.random() < .5 ? 1 : -1;
    const y = Phaser.Math.Between(BOUNDS.top + 30, BOUNDS.bottom - 10);
    const x = dir > 0 ? BOUNDS.left - 120 : BOUNDS.right + 120;
    const warning = scene.add.text(dir > 0 ? BOUNDS.left + 10 : BOUNDS.right - 10, y - 30, '! PIG !', { fontFamily: 'PressStart', fontSize: '22px', color: '#ff5a3a', backgroundColor: '#1d1712', padding: { x: 8, y: 6 } }).setOrigin(dir > 0 ? 0 : 1, .5).setDepth(4500);
    scene.tweens.add({ targets: warning, alpha: .3, duration: 180, yoyo: true, repeat: 3 });
    const sprite = scene.add.image(x, y, 'pig').setOrigin(.5, .9).setScale(4.4).setDepth(y).setFlipX(dir < 0);
    this.pigs.push({ sprite, warning, y, dir, x, chargeAt: this.elapsed + 1.4, hit: new Set() });
    sound.play('rumble');
  }

  private updatePigs(now: number, dt: number): void {
    for (const pig of this.pigs) {
      if (this.elapsed < pig.chargeAt) continue;
      if (pig.warning.active) { pig.warning.destroy(); sound.play('spotted'); }
      pig.x += pig.dir * PIG_SPEED * dt / 1000;
      pig.sprite.setPosition(pig.x, pig.y + Math.abs(Math.sin(pig.x / 30)) * -6).setTexture(Math.floor(pig.x / 40) % 2 ? 'pig-1' : 'pig');
      for (const frog of this.ctx.frogs()) {
        if (pig.hit.has(frog.id) || !frog.canAct(now) || now < frog.safeUntil || frog.boosted('shield', now)) continue;
        if (Math.abs(frog.x - pig.x) < 58 && Math.abs(frog.y - pig.y) < 42) { pig.hit.add(frog.id); this.ctx.knocked(frog, pig.dir); }
      }
    }
    for (const pig of this.pigs) if (pig.x < BOUNDS.left - 200 || pig.x > BOUNDS.right + 200) { pig.sprite.destroy(); pig.warning.destroy(); }
    this.pigs = this.pigs.filter(pig => pig.sprite.active);
  }

  // ---------------------------------------------------------------- hunters and traps (round 2)

  private addHunter(): void {
    const { scene } = this.ctx;
    const fromLeft = this.hunters.length % 2 === 0;
    const x = fromLeft ? BOUNDS.left - 140 : BOUNDS.right + 140, y = Phaser.Math.Between(BOUNDS.top + 40, BOUNDS.bottom - 20);
    const sprite = scene.add.image(x, y, 'hunter').setOrigin(.5, .9).setScale(4.6).setDepth(y);
    const beam = scene.add.image(x, y, 'beam').setOrigin(0, .5).setScale(3.8, 4.6).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD);
    const lamp = scene.add.image(x, y, 'glow').setScale(3).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0);
    const heading = fromLeft ? 0 : Math.PI;
    this.hunters.push({ sprite, beam, lamp, x, y, target: { x: fromLeft ? BOUNDS.left + 180 : BOUNDS.right - 180, y }, speed: 86 + this.hunters.length * 6, t: 0, phase: Math.random() * 6, heading, angle: heading, pauseUntil: 0, nextTrap: Infinity, entering: true });
    sound.play('spotted');
  }

  private pickTarget(hunter: Hunter): void {
    const frogs = this.ctx.frogs();
    const busy = frogs.length && Math.random() < .45 ? frogs[Math.floor(Math.random() * frogs.length)] : null;
    const x = busy ? busy.x + Phaser.Math.Between(-160, 160) : Phaser.Math.Between(BOUNDS.left + 60, BOUNDS.right - 60);
    const y = busy ? busy.y + Phaser.Math.Between(-80, 80) : Phaser.Math.Between(BOUNDS.top + 30, BOUNDS.bottom - 10);
    hunter.target = { x: Phaser.Math.Clamp(x, BOUNDS.left + 40, BOUNDS.right - 40), y: Phaser.Math.Clamp(y, BOUNDS.top + 20, BOUNDS.bottom) };
  }

  private updateHunter(hunter: Hunter, now: number, dt: number): void {
    hunter.t += dt / 1000;
    let look: number;
    if (now < hunter.pauseUntil) {
      look = hunter.heading + Math.sin(hunter.t * 2.4 + hunter.phase) * 1.4;
    } else {
      const dx = hunter.target.x - hunter.x, dy = hunter.target.y - hunter.y, gap = Math.hypot(dx, dy);
      if (gap < 8) {
        hunter.entering = false;
        hunter.pauseUntil = now + 600 + Math.random() * 1100;
        this.pickTarget(hunter);
        look = hunter.heading;
      } else {
        const step = Math.min(gap, hunter.speed * dt / 1000);
        hunter.x += dx / gap * step; hunter.y += dy / gap * step;
        hunter.heading = Math.atan2(dy, dx);
        look = hunter.heading + Math.sin(hunter.t * 1.5 + hunter.phase) * .75;
      }
    }
    hunter.angle = Phaser.Math.Angle.RotateTo(hunter.angle, look, 3.2 * dt / 1000);
    const left = Math.cos(hunter.angle) < 0;
    const walking = now >= hunter.pauseUntil;
    hunter.sprite.setPosition(hunter.x, hunter.y).setDepth(hunter.y).setFlipX(left).setTexture(walking && Math.floor(hunter.t * 4) % 2 ? 'hunter-1' : 'hunter');
    hunter.beam.setPosition(hunter.x + (left ? -20 : 20), hunter.y - 44).setRotation(hunter.angle);
    hunter.lamp.setPosition(hunter.x, hunter.y - 100);
    if (this.round.traps && this.elapsed > 20 && now >= hunter.nextTrap && !hunter.entering) {
      hunter.nextTrap = now + 9000 + Math.random() * 5000;
      this.dropTrap(hunter, now);
    } else if (hunter.nextTrap === Infinity && !hunter.entering) hunter.nextTrap = now + 2000 + Math.random() * 6000;
  }

  private inBeam(hunter: Hunter, x: number, y: number): boolean {
    const dx = x - hunter.beam.x, dy = y - hunter.beam.y;
    if (dx * dx + dy * dy > BEAM_RANGE * BEAM_RANGE) return false;
    return Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - hunter.beam.rotation)) < BEAM_HALF;
  }

  private dropTrap(hunter: Hunter, now: number): void {
    const { scene } = this.ctx;
    if (this.traps.filter(trap => !trap.sprung).length >= 2 + this.hunters.length) return;
    const x = Phaser.Math.Clamp(hunter.x + (Math.random() - .5) * 60, BOUNDS.left + 140, BOUNDS.right - 140), y = Phaser.Math.Clamp(hunter.y + 10, BOUNDS.top + 20, BOUNDS.bottom);
    if (this.traps.some(trap => Math.hypot(trap.x - x, trap.y - y) < 120)) return;
    if (this.ctx.frogs().some(frog => Math.hypot(frog.x - x, frog.y - y) < 70)) return; // never drop one right on a frog
    const sprite = scene.add.image(hunter.x, hunter.y - 60, 'trap').setOrigin(.5, .9).setScale(3.4).setDepth(y);
    scene.tweens.add({ targets: sprite, x, y: y + 20, duration: 380, ease: 'Bounce.easeOut' });
    this.traps.push({ sprite, x, y, until: now + 30000, sprung: false });
    sound.play('trap', 0);
  }

  private updateHunters(now: number, dt: number, active: PartyFrog[]): void {
    const due = this.round.hunters[this.hunterIndex];
    if (due !== undefined && this.elapsed >= due) {
      this.hunterIndex++;
      if (this.hunterIndex < 3 || this.ctx.frogs().length >= 8) {
        this.addHunter();
        this.ctx.announce(this.hunters.length === 1 ? 'HUNTERS ARE COMING!' : 'ANOTHER HUNTER!', this.hunters.length === 1 ? 'Stay out of the flashlights' : undefined, 'is-threat');
      }
    }
    for (const hunter of this.hunters) this.updateHunter(hunter, now, dt);
    for (const frog of active) {
      if (now < frog.safeUntil || frog.boosted('shield', now)) continue;
      const hunter = this.hunters.find(item => this.inBeam(item, frog.x, frog.y - 10) || Math.hypot(item.x - frog.x, item.y - 10 - frog.y) < GRAB_RANGE);
      if (hunter) {
        hunter.pauseUntil = now + 1200;
        this.ctx.caught(frog, 'hunter', { x: hunter.x + (hunter.sprite.flipX ? 26 : -26), y: hunter.y - 40 });
        continue;
      }
      const trap = this.traps.find(item => !item.sprung && Math.abs(item.x - frog.x) < 34 && Math.abs(item.y - (frog.y + 8)) < 30);
      if (trap) {
        trap.sprung = true; trap.until = now + 2600;
        trap.sprite.setTexture('trap-shut').setPosition(frog.x, frog.y + 26).setDepth(frog.y + 2);
        this.ctx.scene.tweens.add({ targets: trap.sprite, scaleY: { from: 2.6, to: 3.4 }, duration: 160, ease: 'Bounce.easeOut' });
        sound.play('trap', 1);
        this.ctx.caught(frog, 'trap', null);
      }
    }
    for (const trap of this.traps) {
      if (now < trap.until || !trap.sprite.active) continue;
      this.ctx.scene.tweens.add({ targets: trap.sprite, alpha: 0, duration: 400, onComplete: () => trap.sprite.destroy() });
      trap.sprite.setActive(false);
    }
    this.traps = this.traps.filter(trap => trap.sprite.active);
  }

  // ---------------------------------------------------------------- chytrid fungus (round 3)

  private addCloud(): void {
    const { scene } = this.ctx;
    const spot = openSpot([...POOLS.map(pool => ({ ...pool, r: 260 })), ...this.ctx.frogs().map(frog => ({ x: frog.x, y: frog.y, r: 140 }))]);
    const angle = Math.random() * Math.PI * 2, speed = 45 + Math.random() * 30;
    const r = 78;
    const glow = scene.add.image(spot.x, spot.y, 'glow').setScale(r / 10).setDepth(3050).setTint(0x3f9a2a).setAlpha(0);
    scene.tweens.add({ targets: glow, alpha: .85, duration: 800 });
    const spores = scene.add.particles(spot.x, spot.y, 'spore', { lifespan: 1400, speed: { min: 10, max: 40 }, scale: { start: 3.4, end: 0 }, frequency: 60, blendMode: 'ADD', emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, r * .8), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData }).setDepth(3060);
    this.clouds.push({ glow, spores, x: spot.x, y: spot.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r });
    sound.play('wrong');
  }

  private updateFungus(now: number, dt: number, active: PartyFrog[]): void {
    const wanted = Math.min(2 + Math.floor(this.elapsed / 12), 3 + Math.floor(this.ctx.frogs().length / 10));
    this.cloudIn -= dt;
    if (this.clouds.length < wanted && this.cloudIn <= 0) {
      this.addCloud(); this.cloudIn = 2000;
      if (this.clouds.length === 1) this.ctx.announce('CHYTRID FUNGUS!', 'Don\'t touch the green clouds', 'is-threat');
    }
    for (const cloud of this.clouds) {
      cloud.x += cloud.vx * dt / 1000; cloud.y += cloud.vy * dt / 1000;
      if (cloud.x < BOUNDS.left + 40 || cloud.x > BOUNDS.right - 40) cloud.vx *= -1;
      if (cloud.y < BOUNDS.top + 20 || cloud.y > BOUNDS.bottom - 10) cloud.vy *= -1;
      cloud.x = Phaser.Math.Clamp(cloud.x, BOUNDS.left + 40, BOUNDS.right - 40); cloud.y = Phaser.Math.Clamp(cloud.y, BOUNDS.top + 20, BOUNDS.bottom - 10);
      // Warm pools push the fungus away.
      for (const pool of POOLS) if (distance(cloud, pool) < 220) { const away = Math.atan2(cloud.y - pool.y, cloud.x - pool.x); cloud.vx = Math.cos(away) * 60; cloud.vy = Math.sin(away) * 60; }
      cloud.glow.setPosition(cloud.x, cloud.y); cloud.spores.setPosition(cloud.x, cloud.y);
    }
    for (const frog of this.ctx.frogs()) {
      const inPool = POOLS.some(pool => Math.abs(frog.x - pool.x) < 110 && Math.abs(frog.y - pool.y) < 50);
      if (frog.sick && inPool) {
        frog.sick = false; frog.immuneUntil = now + 4000;
        this.ctx.sick(frog, false);
        continue;
      }
      if (!frog.sick && active.includes(frog) && now >= frog.immuneUntil && !frog.boosted('shield', now) && this.clouds.some(cloud => distance(cloud, frog) < cloud.r * .8)) {
        frog.sick = true;
        this.sickTick.set(frog.id, now + 3000);
        this.ctx.sick(frog, true);
      }
      if (frog.sick && now >= (this.sickTick.get(frog.id) ?? Infinity)) {
        this.sickTick.set(frog.id, now + 3000);
        this.ctx.award(frog, -1, frog.x, frog.y - 40);
      }
    }
  }

  // ---------------------------------------------------------------- loop

  /** Places to keep bugs and boosts away from. */
  private dangers(): { x: number; y: number; r: number }[] {
    return [...this.clouds.map(cloud => ({ x: cloud.x, y: cloud.y, r: cloud.r + 40 })), ...this.traps.map(trap => ({ x: trap.x, y: trap.y, r: 70 }))];
  }

  update(now: number, dt: number): void {
    this.elapsed += dt / 1000;
    const frogs = this.ctx.frogs();
    const active = frogs.filter(frog => frog.canAct(now));

    for (const bug of this.bugs) bug.update(dt, nearest(active, bug.sprite.x, bug.sprite.y, frog => frog));
    for (const frog of active) if (!frog.sick && now >= frog.nextLick) this.lick(frog, now);
    this.bugs = this.bugs.filter(bug => bug.alive);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.bugs.length < this.max) { this.spawnBug(); this.spawnIn = 260; }

    this.pickupIn -= dt / 1000;
    if (this.pickupIn <= 0 && this.pickups.length < 2 + Math.floor(frogs.length / 10)) { this.spawnPickup(now); this.pickupIn = 6 + Math.random() * 3; }
    for (const pickup of this.pickups) {
      const frog = active.find(item => distance(item, pickup) < PICKUP_RANGE);
      if (frog) { this.ctx.boost(frog, pickup.kind); pickup.until = 0; }
      if (now >= pickup.until) this.removePickup(pickup);
    }
    this.pickups = this.pickups.filter(pickup => pickup.icon.active);

    if (this.round.pigs) {
      this.pigIn -= dt / 1000;
      if (this.pigIn <= 0) { this.sendPig(); this.pigIn = 7 + Math.random() * 4; }
      this.updatePigs(now, dt);
    }
    if (this.round.hunters.length) this.updateHunters(now, dt, active);
    if (this.round.fungus) this.updateFungus(now, dt, active);

    this.tongues.clear();
    for (const frog of frogs) frog.drawTongue(this.tongues, now);
  }

  /** Where a computer frog should head next. */
  botTarget(frog: PartyFrog, now: number): { x: number; y: number } | null {
    if (frog.sick) return nearest(POOLS, frog.x, frog.y, pool => pool) ?? null;
    for (const hunter of this.hunters) {
      const dx = frog.x - hunter.beam.x, dy = frog.y - hunter.beam.y;
      const close = Math.hypot(frog.x - hunter.x, frog.y - hunter.y) < 120;
      if (close || (dx * dx + dy * dy < (BEAM_RANGE + 70) ** 2 && Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - hunter.beam.rotation)) < BEAM_HALF + .4)) {
        const away = Math.atan2(dy, dx) + (Math.random() < .5 ? 1 : -1) * Math.PI / 2;
        return { x: frog.x + Math.cos(away) * 150, y: frog.y + Math.sin(away) * 150 };
      }
    }
    for (const pig of this.pigs) if (Math.abs(frog.y - pig.y) < 80) return { x: frog.x, y: frog.y + (frog.y > pig.y ? 140 : -140) };
    for (const cloud of this.clouds) if (distance(cloud, frog) < cloud.r + 70) { const away = Math.atan2(frog.y - cloud.y, frog.x - cloud.x); return { x: frog.x + Math.cos(away) * 160, y: frog.y + Math.sin(away) * 160 }; }
    const pickup = nearest(this.pickups, frog.x, frog.y, item => item);
    if (pickup && distance(pickup, frog) < 260) return pickup;
    // Each computer frog picks its own bug, away from traps, clouds and the cave.
    const taken = new Set([...this.botBugs].filter(([id, bug]) => id !== frog.id && bug.alive).map(([, bug]) => bug));
    const avoid = [...this.dangers(), { ...CAVE, r: 160 }];
    const safe = this.bugs.filter(bug => bug.alive && !taken.has(bug) && avoid.every(item => distance(item, bug.sprite) > item.r));
    const bug = nearest(safe, frog.x, frog.y, item => item.sprite);
    if (bug) this.botBugs.set(frog.id, bug); else this.botBugs.delete(frog.id);
    void now;
    return bug ? { x: bug.sprite.x, y: bug.sprite.y } : null;
  }

  end(): void {
    for (const bug of this.bugs) bug.destroy();
    for (const hunter of this.hunters) { hunter.sprite.destroy(); hunter.beam.destroy(); hunter.lamp.destroy(); }
    for (const trap of this.traps) trap.sprite.destroy();
    for (const pickup of this.pickups) this.removePickup(pickup);
    for (const pig of this.pigs) { pig.sprite.destroy(); pig.warning.destroy(); }
    for (const cloud of this.clouds) { cloud.glow.destroy(); cloud.spores.destroy(); }
    for (const object of this.objects) object.destroy();
    for (const frog of this.ctx.frogs()) { if (frog.sick) this.ctx.sick(frog, false); frog.sick = false; frog.boosts.clear(); }
    this.bugs = []; this.hunters = []; this.traps = []; this.pickups = []; this.pigs = []; this.clouds = []; this.objects = [];
  }
}

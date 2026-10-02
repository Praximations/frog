import Phaser from 'phaser';
import { Prey, PREY, type PreyKind } from '../entities/Critters';
import type { PartyFrog } from '../entities/PartyFrog';
import { BOOSTS, type BoostKind, type RoundInfo } from '../data/game';
import { MAP, POOLS, clearLine, forestDepth, inHideout, inWater, randomSpot, walkable, type Point } from '../world/map';
import { BOOST_KINDS, PREY_KINDS, type BugRow, type CloudRow, type HunterRow, type LickRow, type PickupRow, type PigRow, type TrapRow } from '../systems/world';
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
  x: number; y: number; target: Point; speed: number; t: number; phase: number;
  heading: number; angle: number; pauseUntil: number; nextTrap: number; entering: boolean; walking: boolean;
}
interface Trap { id: number; sprite: Phaser.GameObjects.Image; x: number; y: number; until: number; sprung: boolean }
interface Pickup { id: number; kind: BoostKind; icon: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; x: number; y: number; until: number }
interface Pig { sprite: Phaser.GameObjects.Image; warning: Phaser.GameObjects.Text; x: number; y: number; dir: 1 | -1; endX: number; chargeAt: number; hit: Set<string> }
interface Cloud { glow: Phaser.GameObjects.Image; spores: Phaser.GameObjects.Particles.ParticleEmitter; x: number; y: number; vx: number; vy: number; r: number }

const KINDS: [PreyKind, number][] = [['cricket', .5], ['beetle', .15], ['snail', .07], ['millipede', .07], ['crab', .14], ['golden', .07]];
export const LICK_RANGE = 92;
const BEAM_RANGE = 240;
const BEAM_HALF = .27;
const GRAB_RANGE = 36;
const PICKUP_RANGE = 44;
const PIG_SPEED = 560;
const PIG_RUN = 760;
/** Where bugs may crawl: open ground, not the cave trail. */
const bugGround = (x: number, y: number): boolean => walkable(x, y, 8) && !inHideout(x, y, -20);
const dry = (x: number, y: number): boolean => !inWater(x, y, 24) && x > 40 && x < MAP.width - 40 && y > 40 && y < MAP.height - 40;
const gap = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

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
 * One round, played out across the whole map. Always: bugs to lick up and boosts to grab. Plus the
 * round's own danger: charging feral pigs, hunters with flashlights and cage traps, or drifting
 * clouds of chytrid fungus with warm springs that cure it. The projector runs it; snapshot()
 * describes it for the phones.
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
  private licks: LickRow[] = [];
  private nextId = 1;
  private hunterIndex = 0;
  private spawnIn = 0;
  private pickupIn = 3;
  private pigIn = 4;
  private cloudIn = 0;
  private sickTick = new Map<string, number>();
  private botBugs = new Map<string, Prey>();
  private tongues!: Phaser.GameObjects.Graphics;

  constructor(private readonly ctx: GameContext, readonly round: RoundInfo) {}

  private get max(): number { return Phaser.Math.Clamp(Math.round(30 + this.ctx.frogs().length * 1.3), 34, 84); }

  start(): void {
    const { scene } = this.ctx;
    this.tongues = scene.add.graphics().setDepth(3600);
    this.objects.push(this.tongues);
    if (this.round.darkness > .3) {
      this.objects.push(scene.add.particles(0, 0, 'firefly', { x: { min: 0, max: MAP.width }, y: { min: 0, max: MAP.height }, lifespan: 3600, speed: { min: 4, max: 14 }, scale: { start: 2.5, end: 0 }, alpha: { start: .9, end: 0 }, frequency: 90, blendMode: 'ADD' }).setDepth(3200));
    }
    if (this.round.fungus) {
      for (const pool of POOLS) {
        this.objects.push(scene.add.particles(pool.x, pool.y - 10, 'steam', { lifespan: 2000, speedY: { min: -40, max: -20 }, scale: { start: 3, end: 6 }, alpha: { start: .5, end: 0 }, frequency: 180, x: { min: -80, max: 80 } }).setDepth(3000));
        const label = scene.add.text(pool.x, pool.y - 80, 'WARM SPRING', { fontFamily: 'PressStart', fontSize: '26px', color: '#fff6dc', backgroundColor: '#c93a2a', padding: { x: 8, y: 6 } }).setOrigin(.5).setDepth(3900);
        label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
        this.objects.push(label);
      }
    }
    for (let i = 0; i < this.max; i++) this.spawnBug(false);
    this.ctx.setDarkness(this.round.darkness);
  }

  // ---------------------------------------------------------------- bugs and boosts

  private spawnBug(pop = true): void {
    let roll = Math.random(), kind: PreyKind = 'cricket';
    for (const [option, weight] of KINDS) { if (roll < weight) { kind = option; break; } roll -= weight; }
    const spot = randomSpot(this.dangers());
    const prey = new Prey(this.ctx.scene, kind, spot.x, spot.y, bugGround, this.nextId++);
    if (pop) {
      const size = prey.sprite.scale;
      prey.sprite.setScale(0);
      this.ctx.scene.tweens.add({ targets: prey.sprite, scale: size, duration: 260, ease: 'Back.easeOut' });
    }
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
    this.licks.push([frog.id, bug.id]);
    frog.nextLick = now + 260;
    this.ctx.award(frog, PREY[bug.kind].points * (frog.boosted('double', now) ? 2 : 1), bug.sprite.x, bug.sprite.y);
  }

  private spawnPickup(now: number): void {
    const kind = BOOST_KINDS[Math.floor(Math.random() * BOOST_KINDS.length)];
    const spot = randomSpot([...this.dangers(), ...this.pickups.map(item => ({ x: item.x, y: item.y, r: 400 }))]);
    const { scene } = this.ctx;
    const glow = scene.add.image(spot.x, spot.y, 'glow').setScale(3.4).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0).setAlpha(.8);
    const icon = scene.add.image(spot.x, spot.y, BOOSTS[kind].icon).setScale(0).setDepth(spot.y + 5);
    scene.tweens.add({ targets: icon, scale: 3.6, duration: 300, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: icon, y: spot.y - 10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 300 });
    this.pickups.push({ id: this.nextId++, kind, icon, glow, x: spot.x, y: spot.y, until: now + 20000 });
  }

  private removePickup(pickup: Pickup): void { pickup.icon.destroy(); pickup.glow.destroy(); }

  // ---------------------------------------------------------------- pigs (round 1)

  /** A feral pig bursts out of the undergrowth and charges straight through a frog's spot. */
  private sendPig(): void {
    const { scene } = this.ctx;
    const frogs = this.ctx.frogs();
    for (let tries = 0; tries < 8; tries++) {
      const frog = frogs.length && tries < 5 ? frogs[Math.floor(Math.random() * frogs.length)] : null;
      const aim = frog ? { x: frog.x, y: frog.y } : randomSpot();
      const dir: 1 | -1 = Math.random() < .5 ? 1 : -1;
      const start = { x: aim.x - dir * PIG_RUN, y: aim.y }, end = { x: aim.x + dir * PIG_RUN * .8, y: aim.y };
      if (!clearLine(start, end, dry)) continue;
      const warning = scene.add.text(start.x + dir * 40, start.y - 70, '! PIG !', { fontFamily: 'PressStart', fontSize: '26px', color: '#ff5a3a', backgroundColor: '#1d1712', padding: { x: 8, y: 6 } }).setOrigin(.5).setDepth(4500);
      warning.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      scene.tweens.add({ targets: warning, alpha: .3, duration: 180, yoyo: true, repeat: 3 });
      const sprite = scene.add.image(start.x, start.y, 'pig').setOrigin(.5, .9).setScale(4.4).setDepth(start.y).setFlipX(dir < 0).setAlpha(0);
      scene.tweens.add({ targets: sprite, alpha: 1, duration: 600 });
      this.pigs.push({ sprite, warning, x: start.x, y: start.y, dir, endX: end.x, chargeAt: this.elapsed + 1.5, hit: new Set() });
      sound.play('rumble');
      return;
    }
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
    // Past its run: it fades back into the forest and is no longer a danger.
    for (const pig of this.pigs) {
      if ((pig.x - pig.endX) * pig.dir <= 0) continue;
      const { sprite } = pig;
      this.ctx.scene.tweens.add({ targets: sprite, alpha: 0, duration: 300, onComplete: () => sprite.destroy() });
    }
    this.pigs = this.pigs.filter(pig => (pig.x - pig.endX) * pig.dir <= 0);
  }

  // ---------------------------------------------------------------- hunters and traps (round 2)

  private addHunter(): void {
    const { scene } = this.ctx;
    // Hunters step out of the forest on the left or right.
    const fromLeft = this.hunters.length % 2 === 0;
    let x = 0, y = 700;
    for (let tries = 0; tries < 20; tries++) {
      y = 300 + Math.random() * 840;
      x = fromLeft ? 120 : MAP.width - 120;
      while (forestDepth(x, y) > 40 && x > 0 && x < MAP.width) x += fromLeft ? 20 : -20;
      x += fromLeft ? -80 : 80;
      if (!inWater(x, y, 30)) break;
    }
    const sprite = scene.add.image(x, y, 'hunter').setOrigin(.5, .9).setScale(4.6).setDepth(y);
    const beam = scene.add.image(x, y, 'beam').setOrigin(0, .5).setScale(3.8, 4.6).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD);
    const lamp = scene.add.image(x, y, 'glow').setScale(3).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0);
    const heading = fromLeft ? 0 : Math.PI;
    const hunter: Hunter = { sprite, beam, lamp, x, y, target: { x: x + (fromLeft ? 260 : -260), y }, speed: 92 + this.hunters.length * 5, t: 0, phase: Math.random() * 6, heading, angle: heading, pauseUntil: 0, nextTrap: Infinity, entering: true, walking: true };
    if (!clearLine(hunter, hunter.target, dry)) this.pickTarget(hunter);
    this.hunters.push(hunter);
    sound.play('spotted');
  }

  /** Somewhere to walk to: often towards a frog, never across water. */
  private pickTarget(hunter: Hunter): void {
    const frogs = this.ctx.frogs();
    for (let tries = 0; tries < 12; tries++) {
      const busy = frogs.length && Math.random() < .5 ? frogs[Math.floor(Math.random() * frogs.length)] : null;
      const target = busy ? { x: busy.x + Phaser.Math.Between(-200, 200), y: busy.y + Phaser.Math.Between(-120, 120) } : randomSpot([], Math.random, 10);
      if (gap(target, hunter) > 900) continue;
      if (dry(target.x, target.y) && forestDepth(target.x, target.y) < 0 && clearLine(hunter, target, dry)) { hunter.target = target; return; }
    }
    hunter.target = randomSpot();
    if (!clearLine(hunter, hunter.target, dry)) hunter.target = { x: hunter.x, y: hunter.y };
  }

  private updateHunter(hunter: Hunter, now: number, dt: number): void {
    hunter.t += dt / 1000;
    let look: number;
    if (now < hunter.pauseUntil) {
      look = hunter.heading + Math.sin(hunter.t * 2.4 + hunter.phase) * 1.4;
    } else {
      const dx = hunter.target.x - hunter.x, dy = hunter.target.y - hunter.y, left = Math.hypot(dx, dy);
      if (left < 8) {
        hunter.entering = false;
        hunter.pauseUntil = now + 600 + Math.random() * 1100;
        this.pickTarget(hunter);
        look = hunter.heading;
      } else {
        const step = Math.min(left, hunter.speed * dt / 1000);
        hunter.x += dx / left * step; hunter.y += dy / left * step;
        hunter.heading = Math.atan2(dy, dx);
        look = hunter.heading + Math.sin(hunter.t * 1.5 + hunter.phase) * .75;
      }
    }
    hunter.angle = Phaser.Math.Angle.RotateTo(hunter.angle, look, 3.2 * dt / 1000);
    const facingLeft = Math.cos(hunter.angle) < 0;
    hunter.walking = now >= hunter.pauseUntil;
    hunter.sprite.setPosition(hunter.x, hunter.y).setDepth(hunter.y).setFlipX(facingLeft).setTexture(hunter.walking && Math.floor(hunter.t * 4) % 2 ? 'hunter-1' : 'hunter');
    hunter.beam.setPosition(hunter.x + (facingLeft ? -20 : 20), hunter.y - 44).setRotation(hunter.angle);
    hunter.lamp.setPosition(hunter.x, hunter.y - 100);
    if (this.round.traps && this.elapsed > 14 && now >= hunter.nextTrap && !hunter.entering) {
      hunter.nextTrap = now + 8000 + Math.random() * 5000;
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
    if (this.traps.filter(trap => !trap.sprung).length >= 3 + this.hunters.length) return;
    const x = Math.round(hunter.x + (Math.random() - .5) * 60), y = Math.round(hunter.y + 10);
    if (!walkable(x, y, 24) || inHideout(x, y, -40)) return;
    if (this.traps.some(trap => Math.hypot(trap.x - x, trap.y - y) < 120)) return;
    if (this.ctx.frogs().some(frog => Math.hypot(frog.x - x, frog.y - y) < 70)) return; // never drop one right on a frog
    const sprite = scene.add.image(hunter.x, hunter.y - 60, 'trap').setOrigin(.5, .9).setScale(3.4).setDepth(y);
    scene.tweens.add({ targets: sprite, x, y: y + 20, duration: 380, ease: 'Bounce.easeOut' });
    this.traps.push({ id: this.nextId++, sprite, x, y, until: now + 30000, sprung: false });
    sound.play('trap', 0);
  }

  private updateHunters(now: number, dt: number, active: PartyFrog[]): void {
    const due = this.round.hunters[this.hunterIndex];
    if (due !== undefined && this.elapsed >= due) {
      this.hunterIndex++;
      // Three hunters, plus one more for every four players beyond that.
      if (this.hunterIndex <= 3 || this.ctx.frogs().length >= this.hunterIndex * 4) {
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
        trap.x = Math.round(frog.x); trap.y = Math.round(frog.y + 6);
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
    const spot = randomSpot([...POOLS.map(pool => ({ ...pool, r: 300 })), ...this.ctx.frogs().map(frog => ({ x: frog.x, y: frog.y, r: 180 }))]);
    const angle = Math.random() * Math.PI * 2, speed = 50 + Math.random() * 35;
    const r = 84;
    const glow = scene.add.image(spot.x, spot.y, 'glow').setScale(r / 10).setDepth(3050).setTint(0x3f9a2a).setAlpha(0);
    scene.tweens.add({ targets: glow, alpha: .85, duration: 800 });
    const spores = scene.add.particles(spot.x, spot.y, 'spore', { lifespan: 1400, speed: { min: 10, max: 40 }, scale: { start: 3.4, end: 0 }, frequency: 70, blendMode: 'ADD', emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, r * .8), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData }).setDepth(3060);
    this.clouds.push({ glow, spores, x: spot.x, y: spot.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r });
    sound.play('wrong');
  }

  private updateFungus(now: number, dt: number, active: PartyFrog[]): void {
    const wanted = Math.min(3 + Math.floor(this.elapsed / 10), 4 + Math.floor(this.ctx.frogs().length / 6), 9);
    this.cloudIn -= dt;
    if (this.clouds.length < wanted && this.cloudIn <= 0) {
      this.addCloud(); this.cloudIn = 1600;
      if (this.clouds.length === 1) this.ctx.announce('CHYTRID FUNGUS!', 'Don\'t touch the green clouds', 'is-threat');
    }
    for (const cloud of this.clouds) {
      cloud.x += cloud.vx * dt / 1000; cloud.y += cloud.vy * dt / 1000;
      if (cloud.x < 220 || cloud.x > MAP.width - 220) cloud.vx = Math.abs(cloud.vx) * (cloud.x < 220 ? 1 : -1);
      if (cloud.y < 240 || cloud.y > MAP.height - 180) cloud.vy = Math.abs(cloud.vy) * (cloud.y < 240 ? 1 : -1);
      // Warm springs push the fungus away.
      for (const pool of POOLS) if (gap(cloud, pool) < 240) { const away = Math.atan2(cloud.y - pool.y, cloud.x - pool.x); cloud.vx = Math.cos(away) * 60; cloud.vy = Math.sin(away) * 60; }
      cloud.glow.setPosition(cloud.x, cloud.y); cloud.spores.setPosition(cloud.x, cloud.y);
    }
    for (const frog of this.ctx.frogs()) {
      const inPool = POOLS.some(pool => Math.abs(frog.x - pool.x) < 110 && Math.abs(frog.y - pool.y) < 56);
      if (frog.sick && inPool) {
        frog.sick = false; frog.immuneUntil = now + 4000;
        this.ctx.sick(frog, false);
        continue;
      }
      if (!frog.sick && active.includes(frog) && now >= frog.immuneUntil && !frog.boosted('shield', now) && this.clouds.some(cloud => gap(cloud, frog) < cloud.r * .8)) {
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
  private dangers(): (Point & { r: number })[] {
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
    if (this.spawnIn <= 0 && this.bugs.length < this.max) { this.spawnBug(); this.spawnIn = 200; }

    this.pickupIn -= dt / 1000;
    if (this.pickupIn <= 0 && this.pickups.length < 4 + Math.floor(frogs.length / 6)) { this.spawnPickup(now); this.pickupIn = 3 + Math.random() * 3; }
    for (const pickup of this.pickups) {
      const frog = active.find(item => gap(item, pickup) < PICKUP_RANGE);
      if (frog) { this.ctx.boost(frog, pickup.kind); pickup.until = 0; }
      if (now >= pickup.until) this.removePickup(pickup);
    }
    this.pickups = this.pickups.filter(pickup => pickup.icon.active);

    if (this.round.pigs) {
      this.pigIn -= dt / 1000;
      if (this.pigIn <= 0) {
        const count = 1 + Math.floor(frogs.length / 10);
        for (let i = 0; i < count; i++) this.sendPig();
        this.pigIn = 5 + Math.random() * 3;
      }
      this.updatePigs(now, dt);
    }
    if (this.round.hunters.length) this.updateHunters(now, dt, active);
    if (this.round.fungus) this.updateFungus(now, dt, active);

    this.tongues.clear();
    for (const frog of frogs) frog.drawTongue(this.tongues, now);
  }

  /** Everything the phones need to draw this round (see WorldSnapshot). Licks are only sent once. */
  snapshot(): { b: BugRow[]; l: LickRow[]; h: HunterRow[]; p: PigRow[]; c: CloudRow[]; u: PickupRow[]; k: TrapRow[] } {
    const round = Math.round;
    const shot = {
      b: this.bugs.filter(bug => bug.alive).map(bug => [bug.id, PREY_KINDS.indexOf(bug.kind), round(bug.sprite.x), round(bug.sprite.y)] as BugRow),
      l: this.licks,
      h: this.hunters.map(hunter => [round(hunter.x), round(hunter.y), round(Phaser.Math.RadToDeg(hunter.angle)), hunter.walking ? 1 : 0] as HunterRow),
      p: this.pigs.map(pig => [round(pig.x), round(pig.y), pig.dir, this.elapsed >= pig.chargeAt ? 1 : 0] as PigRow),
      c: this.clouds.map(cloud => [round(cloud.x), round(cloud.y), cloud.r] as CloudRow),
      u: this.pickups.map(pickup => [pickup.id, BOOST_KINDS.indexOf(pickup.kind), pickup.x, pickup.y] as PickupRow),
      k: this.traps.map(trap => [trap.id, round(trap.x), round(trap.y), trap.sprung ? 1 : 0] as TrapRow),
    };
    this.licks = [];
    return shot;
  }

  /** Where a computer frog should head next (somewhere it can hop to in a straight line). */
  botTarget(frog: PartyFrog): Point | null {
    const reach = (point: Point) => clearLine(frog, point, (x, y) => walkable(x, y, 12));
    if (frog.sick) {
      const pool = [...POOLS].sort((a, b) => gap(a, frog) - gap(b, frog)).find(reach);
      if (pool) return pool;
    }
    for (const hunter of this.hunters) {
      const dx = frog.x - hunter.beam.x, dy = frog.y - hunter.beam.y;
      const close = gap(frog, hunter) < 120;
      if (close || (dx * dx + dy * dy < (BEAM_RANGE + 70) ** 2 && Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - hunter.beam.rotation)) < BEAM_HALF + .4)) {
        const away = Math.atan2(dy, dx) + (Math.random() < .5 ? 1 : -1) * Math.PI / 2;
        return { x: frog.x + Math.cos(away) * 150, y: frog.y + Math.sin(away) * 150 };
      }
    }
    for (const pig of this.pigs) if (Math.abs(frog.y - pig.y) < 80 && Math.abs(frog.x - pig.x) < 800) return { x: frog.x, y: frog.y + (frog.y > pig.y ? 140 : -140) };
    for (const cloud of this.clouds) if (gap(cloud, frog) < cloud.r + 70) { const away = Math.atan2(frog.y - cloud.y, frog.x - cloud.x); return { x: frog.x + Math.cos(away) * 160, y: frog.y + Math.sin(away) * 160 }; }
    const pickup = nearest(this.pickups, frog.x, frog.y, item => item);
    if (pickup && gap(pickup, frog) < 300 && reach(pickup)) return pickup;
    // Each computer frog picks its own bug, away from traps and clouds, that it can hop straight to.
    const taken = new Set([...this.botBugs].filter(([id, bug]) => id !== frog.id && bug.alive).map(([, bug]) => bug));
    const avoid = this.dangers();
    const safe = this.bugs.filter(bug => bug.alive && !taken.has(bug) && avoid.every(item => gap(item, bug.sprite) > item.r));
    safe.sort((a, b) => gap(a.sprite, frog) - gap(b.sprite, frog));
    const bug = safe.slice(0, 6).find(item => reach(item.sprite));
    if (bug) this.botBugs.set(frog.id, bug); else this.botBugs.delete(frog.id);
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
    this.bugs = []; this.hunters = []; this.traps = []; this.pickups = []; this.pigs = []; this.clouds = []; this.objects = []; this.licks = [];
  }
}

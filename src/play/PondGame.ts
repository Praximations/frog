import Phaser from 'phaser';
import { Prey, PREY, type PreyKind } from '../entities/Critters';
import type { PartyFrog } from '../entities/PartyFrog';
import type { Team } from '../systems/match';
import { GAME, type GameEvent } from '../data/game';
import { sound } from '../systems/Sound';

/** What the game needs from the pond scene. */
export interface GameContext {
  scene: Phaser.Scene;
  bounds: Phaser.Geom.Rectangle;
  /** Frogs that are playing (online). */
  frogs(): PartyFrog[];
  award(frog: PartyFrog, points: number, x: number, y: number): void;
  /** A hunter (grabber = where its sack is) or a trap (grabber = null) caught a frog. */
  caught(frog: PartyFrog, by: 'hunter' | 'trap', grabber: { x: number; y: number } | null): void;
  announce(title: string, subtitle?: string, kind?: string): void;
  home(team: Team): { x: number; y: number };
  setDarkness(level: number): void;
}

interface Hunter {
  sprite: Phaser.GameObjects.Image; beam: Phaser.GameObjects.Image; lamp: Phaser.GameObjects.Image;
  x: number; y: number; target: { x: number; y: number }; speed: number; t: number; phase: number;
  heading: number; angle: number; pauseUntil: number; nextTrap: number; entering: boolean;
}
interface Trap { sprite: Phaser.GameObjects.Image; x: number; y: number; until: number; sprung: boolean }

const KINDS: [PreyKind, number][] = [['cricket', .52], ['beetle', .15], ['snail', .07], ['millipede', .07], ['crab', .13], ['golden', .06]];
const LICK_RANGE = 92;
const BEAM_RANGE = 230;
const BEAM_HALF = .27;
const GRAB_RANGE = 36;

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
 * The one game mode. Frogs lick up bugs; humans with flashlights wander in and catch frogs; later
 * they set cage traps. It gets darker and busier over time, with a few announced surprises.
 */
export class PondGame {
  /** Seconds played. */
  elapsed = 0;
  double = false;
  private bugs: Prey[] = [];
  private hunters: Hunter[] = [];
  private traps: Trap[] = [];
  private trapping = false;
  private botBugs = new Map<string, Prey>();
  private eventIndex = 0;
  private spawnIn = 0;
  private darkness = -1;
  private tongues!: Phaser.GameObjects.Graphics;
  private fireflies!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly ctx: GameContext) {}

  private get max(): number { return Phaser.Math.Clamp(Math.round(10 + this.ctx.frogs().length * 1.2), 12, 40); }

  start(): void {
    const { scene } = this.ctx;
    this.tongues = scene.add.graphics().setDepth(3600);
    this.fireflies = scene.add.particles(0, 0, 'firefly', { x: { min: 0, max: 1280 }, y: { min: 160, max: 720 }, lifespan: 3600, speed: { min: 4, max: 14 }, scale: { start: 2.5, end: 0 }, alpha: { start: .9, end: 0 }, frequency: 240, blendMode: 'ADD', emitting: false }).setDepth(3200);
    for (let i = 0; i < this.max; i++) this.spawn();
    this.setDarkness(0);
  }

  // ---------------------------------------------------------------- bugs

  private spawn(kind?: PreyKind, at?: { x: number; y: number }): void {
    if (!kind) {
      let roll = Math.random(); kind = 'cricket';
      for (const [option, weight] of KINDS) { if (roll < weight) { kind = option; break; } roll -= weight; }
    }
    const area = this.ctx.bounds;
    const x = at?.x ?? Phaser.Math.Between(area.left + 20, area.right - 20), y = at?.y ?? Phaser.Math.Between(area.top + 10, area.bottom - 10);
    const prey = new Prey(this.ctx.scene, kind, x, y, area);
    const size = prey.sprite.scale;
    prey.sprite.setScale(0);
    this.ctx.scene.tweens.add({ targets: prey.sprite, scale: size, duration: 260, ease: 'Back.easeOut' });
    prey.setGlow(Math.max(0, this.darkness));
    this.bugs.push(prey);
  }

  private lick(frog: PartyFrog, now: number): void {
    const bug = nearest(this.bugs.filter(item => item.alive), frog.x, frog.y - 6, item => item.sprite);
    if (!bug || Phaser.Math.Distance.Between(frog.x, frog.y - 6, bug.sprite.x, bug.sprite.y) > LICK_RANGE) return;
    frog.lick(bug.sprite.x, bug.sprite.y, now);
    const mouth = frog.mouth();
    bug.eat(mouth.x, mouth.y, 60);
    frog.nextLick = now + 260;
    this.ctx.award(frog, PREY[bug.kind].points * (this.double ? 2 : 1), bug.sprite.x, bug.sprite.y);
  }

  // ---------------------------------------------------------------- humans

  private addHunter(): void {
    const { scene, bounds } = this.ctx;
    const fromLeft = this.hunters.length % 2 === 0;
    const x = fromLeft ? bounds.left - 140 : bounds.right + 140, y = Phaser.Math.Between(bounds.top + 40, bounds.bottom - 20);
    const sprite = scene.add.image(x, y, 'hunter').setOrigin(.5, .9).setScale(4.6).setDepth(y);
    const beam = scene.add.image(x, y, 'beam').setOrigin(0, .5).setScale(3.6, 4.6).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD);
    const lamp = scene.add.image(x, y, 'glow').setScale(3).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0);
    const heading = fromLeft ? 0 : Math.PI;
    this.hunters.push({ sprite, beam, lamp, x, y, target: { x: fromLeft ? bounds.left + 160 : bounds.right - 160, y }, speed: 82 + this.hunters.length * 6, t: 0, phase: Math.random() * 6, heading, angle: heading, pauseUntil: 0, nextTrap: Infinity, entering: true });
    sound.play('spotted');
  }

  private pickTarget(hunter: Hunter): void {
    const { bounds } = this.ctx;
    // Wander, but tend towards wherever the most frogs are.
    const frogs = this.ctx.frogs();
    const busy = frogs.length && Math.random() < .45 ? frogs[Math.floor(Math.random() * frogs.length)] : null;
    const x = busy ? busy.x + Phaser.Math.Between(-160, 160) : Phaser.Math.Between(bounds.left + 60, bounds.right - 60);
    const y = busy ? busy.y + Phaser.Math.Between(-80, 80) : Phaser.Math.Between(bounds.top + 30, bounds.bottom - 10);
    hunter.target = { x: Phaser.Math.Clamp(x, bounds.left + 40, bounds.right - 40), y: Phaser.Math.Clamp(y, bounds.top + 20, bounds.bottom) };
  }

  private updateHunter(hunter: Hunter, now: number, dt: number): void {
    hunter.t += dt / 1000;
    let look: number;
    if (now < hunter.pauseUntil) {
      look = hunter.heading + Math.sin(hunter.t * 2.4 + hunter.phase) * 1.4;
    } else {
      const dx = hunter.target.x - hunter.x, dy = hunter.target.y - hunter.y, distance = Math.hypot(dx, dy);
      if (distance < 8) {
        hunter.entering = false;
        hunter.pauseUntil = now + 600 + Math.random() * 1100;
        this.pickTarget(hunter);
        look = hunter.heading;
      } else {
        const step = Math.min(distance, hunter.speed * dt / 1000);
        hunter.x += dx / distance * step; hunter.y += dy / distance * step;
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
    if (this.trapping && now >= hunter.nextTrap && !hunter.entering) {
      hunter.nextTrap = now + 9000 + Math.random() * 5000;
      this.dropTrap(hunter, now);
    }
  }

  private inBeam(hunter: Hunter, x: number, y: number): boolean {
    const dx = x - hunter.beam.x, dy = y - hunter.beam.y;
    if (dx * dx + dy * dy > BEAM_RANGE * BEAM_RANGE) return false;
    return Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - hunter.beam.rotation)) < BEAM_HALF;
  }

  private dropTrap(hunter: Hunter, now: number): void {
    const { bounds, scene } = this.ctx;
    const live = this.traps.filter(trap => !trap.sprung);
    if (live.length >= 2 + this.hunters.length) return;
    const x = Phaser.Math.Clamp(hunter.x + (Math.random() - .5) * 60, bounds.left + 140, bounds.right - 140), y = Phaser.Math.Clamp(hunter.y + 10, bounds.top + 20, bounds.bottom);
    if (this.traps.some(trap => Math.hypot(trap.x - x, trap.y - y) < 120)) return;
    if (this.ctx.frogs().some(frog => Math.hypot(frog.x - x, frog.y - y) < 70)) return; // never drop one right on a frog
    const sprite = scene.add.image(hunter.x, hunter.y - 60, 'trap').setOrigin(.5, .9).setScale(3.4).setDepth(y);
    scene.tweens.add({ targets: sprite, x, y: y + 20, duration: 380, ease: 'Bounce.easeOut' });
    this.traps.push({ sprite, x, y, until: now + 30000, sprung: false });
    sound.play('trap', 0);
  }

  // ---------------------------------------------------------------- events

  private run(event: GameEvent, now: number): void {
    const frogs = this.ctx.frogs();
    if (event.minFrogs && frogs.length < event.minFrogs) return;
    if (event.kind === 'hunter') this.addHunter();
    else if (event.kind === 'swarm') {
      const count = Math.min(70 - this.bugs.length, 12 + frogs.length);
      for (let i = 0; i < count; i++) this.ctx.scene.time.delayedCall(i * 40, () => this.spawn());
      sound.play('unlock');
    } else if (event.kind === 'traps') {
      this.trapping = true;
      this.hunters.forEach((hunter, i) => { hunter.nextTrap = now + 800 + i * 3500; });
    } else if (event.kind === 'golden') {
      const { bounds } = this.ctx;
      this.spawn('mega', { x: bounds.centerX + Phaser.Math.Between(-200, 200), y: bounds.centerY });
      sound.play('chime');
    } else if (event.kind === 'double') {
      this.double = true;
      sound.play('correct');
    }
    this.ctx.announce(event.title, event.subtitle, event.kind === 'hunter' || event.kind === 'traps' ? 'is-threat' : 'is-win');
  }

  private setDarkness(level: number): void {
    if (Math.abs(level - this.darkness) < .02) return;
    this.darkness = level;
    this.ctx.setDarkness(level);
    if (level > .3 && !this.fireflies.emitting) this.fireflies.start();
    for (const bug of this.bugs) bug.setGlow(level);
  }

  // ---------------------------------------------------------------- loop

  update(now: number, dt: number): void {
    this.elapsed += dt / 1000;
    for (let event = GAME.events[this.eventIndex]; event && this.elapsed >= event.at; event = GAME.events[this.eventIndex]) {
      this.eventIndex++;
      this.run(event, now);
    }
    this.setDarkness(Phaser.Math.Clamp((this.elapsed - 4) / 60, 0, 1));

    const frogs = this.ctx.frogs();
    const active = frogs.filter(frog => frog.canAct(now));
    for (const bug of this.bugs) bug.update(dt, nearest(active, bug.sprite.x, bug.sprite.y, frog => frog));
    for (const frog of active) if (now >= frog.nextLick) this.lick(frog, now);
    this.bugs = this.bugs.filter(bug => bug.alive);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.bugs.length < this.max) { this.spawn(); this.spawnIn = 280; }

    for (const hunter of this.hunters) this.updateHunter(hunter, now, dt);
    for (const frog of active) {
      if (now < frog.safeUntil) continue;
      const hunter = this.hunters.find(item => this.inBeam(item, frog.x, frog.y - 10) || Math.hypot(item.x - frog.x, item.y - 10 - frog.y) < GRAB_RANGE);
      if (hunter) {
        hunter.pauseUntil = now + 1200;
        const left = hunter.sprite.flipX;
        this.ctx.caught(frog, 'hunter', { x: hunter.x + (left ? 26 : -26), y: hunter.y - 40 });
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

    this.tongues.clear();
    for (const frog of frogs) frog.drawTongue(this.tongues, now);
  }

  /** Where a computer frog should head next. */
  botTarget(frog: PartyFrog): { x: number; y: number } | null {
    for (const hunter of this.hunters) {
      const dx = frog.x - hunter.beam.x, dy = frog.y - hunter.beam.y;
      const close = Math.hypot(frog.x - hunter.x, frog.y - hunter.y) < 120;
      if (close || (dx * dx + dy * dy < (BEAM_RANGE + 70) ** 2 && Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - hunter.beam.rotation)) < BEAM_HALF + .4)) {
        const away = Math.atan2(dy, dx) + (Math.random() < .5 ? 1 : -1) * Math.PI / 2;
        return { x: frog.x + Math.cos(away) * 150, y: frog.y + Math.sin(away) * 150 };
      }
    }
    // Each computer frog picks its own bug, away from traps, so they don't all pile onto one.
    const taken = new Set([...this.botBugs].filter(([id, bug]) => id !== frog.id && bug.alive).map(([, bug]) => bug));
    const safe = this.bugs.filter(bug => bug.alive && !taken.has(bug) && this.traps.every(trap => trap.sprung || Math.hypot(trap.x - bug.sprite.x, trap.y - bug.sprite.y) > 80));
    const bug = nearest(safe, frog.x, frog.y, item => item.sprite);
    if (bug) this.botBugs.set(frog.id, bug); else this.botBugs.delete(frog.id);
    return bug ? { x: bug.sprite.x, y: bug.sprite.y } : null;
  }

  end(): void {
    for (const bug of this.bugs) bug.destroy();
    for (const hunter of this.hunters) { hunter.sprite.destroy(); hunter.beam.destroy(); hunter.lamp.destroy(); }
    for (const trap of this.traps) trap.sprite.destroy();
    this.tongues?.destroy(); this.fireflies?.destroy();
    this.bugs = []; this.hunters = []; this.traps = [];
  }
}

import Phaser from 'phaser';
import { ChapterScene, type WorldInfo } from './ChapterScene';
import { buildLevel, PALETTES, type Prop } from '../world/Terrain';
import { AmbientFrogs } from '../entities/Critters';
import { sound } from '../systems/Sound';
import { run } from '../systems/run';
import { jumpscare } from '../ui/effects';
import { reducedMotion } from '../systems/Settings';

interface Hunter { sprite: Phaser.GameObjects.Image; beam: Phaser.GameObjects.Image; lamp: Phaser.GameObjects.Image; x: number; y0: number; y1: number; t: number; speed: number; facing: number; phase: number }
interface Hazard { x: number; y: number; rx: number; ry: number; kind: 'spore' | 'lava' }

const ZONES = [
  { x: 0, checkpoint: { x: 180, y: 450 } },
  { x: 640, checkpoint: { x: 560, y: 450 }, tag: 'Threat · Hunting', text: '"Crapaud" was Dominica\'s national dish: an estimated 8,000–36,000 frogs were taken each year until hunting was banned in 2004. Stay out of the light — hide in bushes!' },
  { x: 1270, checkpoint: { x: 1280, y: 450 }, tag: 'Threat · Chytrid fungus', text: 'The fungus infects frog skin. On Dominica about 85% of mountain chickens died within 18 months. Avoid the glowing pools!' },
  { x: 1780, checkpoint: { x: 1790, y: 450 }, tag: 'Threat · Habitat loss & invasive animals', text: 'Forest is cleared by people, and invasive feral pigs, opossums, dogs and cats eat the frogs. Watch out for the pig!' },
  { x: 2170, checkpoint: { x: 2180, y: 450 }, tag: 'Threat · Hurricanes & volcanoes', text: 'Category 5 Hurricane Maria hit Dominica in 2017. On Montserrat, the Soufrière Hills volcano has destroyed habitat since 1995.' },
];

/** Chapter 3: the decline. A night-time gauntlet through every real threat, with a jump-scare if hunters catch you. */
export class DangerScene extends ChapterScene {
  protected readonly chapterNumber = 3;
  protected readonly music = 'night' as const;
  private hunters: Hunter[] = [];
  private hazards: Hazard[] = [];
  private bushes: { x: number; y: number }[] = [];
  private pig!: { sprite: Phaser.GameObjects.Image; vx: number; vy: number; state: 'roam' | 'charge' | 'rest'; until: number };
  private darkness!: Phaser.GameObjects.Image;
  private zone = 0;
  private started = false;
  private gustUntil = 0;
  private nextGust = 0;
  private gustDirection = 1;
  private hidden = false;
  private catches = 0;
  private reached = false;
  private ambient?: AmbientFrogs;

  constructor() { super('DangerScene'); }

  protected buildWorld(): WorldInfo {
    this.hunters = []; this.hazards = []; this.bushes = []; this.zone = 0; this.started = false; this.gustUntil = 0; this.nextGust = 0; this.hidden = false; this.catches = 0; this.reached = false;
    run.setPopulation(100);
    const spec = {
      key: 'terrain-danger', width: 640, height: 220, palette: PALETTES.night, pathWidth: 11,
      paths: [[[0, 112], [80, 110], [160, 104], [240, 114], [320, 108], [400, 112], [470, 110], [540, 106], [640, 112]]] as [number, number][][],
      rivers: [{ points: [[372, 0], [378, 60], [370, 120], [380, 220]] as [number, number][], width: 10 }],
      cleared: [[492, 110, 48, 60]] as [number, number, number, number][],
      ash: [548, 640] as [number, number],
      clearings: [[45, 112, 30, 22]] as [number, number, number, number][],
    };
    const props: Prop[] = [];
    for (let x = 60; x < 2140; x += 120) {
      if (x > 1420 && x < 1600) continue;
      const jitter = (x * 37) % 40;
      props.push({ key: 'tree-dark', x: x + jitter, y: 200 + (x % 3) * 18, solid: [38, 26] });
      if (!(x > 1780 && x < 2140)) props.push({ key: 'tree-dark', x: x + 50 - jitter, y: 760 + (x % 4) * 12, solid: [38, 26] });
    }
    for (const [x, y] of [[1830, 320], [1900, 610], [2010, 300], [2080, 560], [1960, 470]]) props.push({ key: 'stump', x, y, solid: [50, 24] });
    for (const [x, y] of [[2240, 220], [2300, 760], [2520, 250]]) props.push({ key: 'rock', x, y, solid: [42, 22], tint: 0x8a8480 });
    props.push({ key: 'volcano', x: 2390, y: 250, scale: 4 });
    props.push({ key: 'burrow', x: 2470, y: 470 });
    this.blocks = buildLevel(this, spec, props);
    // The stream: walls with a log bridge.
    this.blocks.add(this.add.zone(1500, 200, 110, 400));
    this.blocks.add(this.add.zone(1500, 720, 110, 360));
    this.add.image(1500, 455, 'log').setScale(4).setDepth(5).setAngle(0);
    // Bushes to hide in during the hunter zone.
    for (const [x, y] of [[790, 450], [960, 380], [1060, 520], [1210, 450]]) {
      this.add.image(x, y + 20, 'bush').setOrigin(.5, .9).setScale(4).setDepth(y + 30);
      this.bushes.push({ x, y });
    }
    // Hazards with glows that show through the darkness.
    for (const [x, y] of [[1330, 360], [1330, 560], [1405, 455], [1610, 370], [1650, 540], [1720, 440]]) this.addHazard(x, y, 'spore');
    for (const [x, y] of [[2240, 380], [2300, 540], [2370, 440], [2260, 640], [2410, 330]]) this.addHazard(x, y, 'lava');
    // Hunters patrol up and down, sweeping flashlights across the trail.
    this.addHunter(870, 230, 680, 85, 0);
    this.addHunter(1150, 680, 230, 100, 1.7);
    // Feral pig.
    const pig = this.add.image(1960, 380, 'pig').setScale(4).setOrigin(.5, .9).setDepth(380);
    this.pig = { sprite: pig, vx: 40, vy: 20, state: 'roam', until: 0 };
    // Atmosphere.
    this.ambient = new AmbientFrogs(this, [[300, 360], [420, 540], [520, 330], [250, 600], [560, 560]], 1);
    this.darkness = this.add.image(0, 0, 'darkness').setScale(6.4).setDepth(3000);
    this.add.particles(0, 0, 'firefly', { x: { min: 0, max: 1300 }, y: { min: 150, max: 800 }, lifespan: 3600, speed: { min: 4, max: 14 }, scale: { start: 2.5, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 450, blendMode: 'ADD' }).setDepth(3200);
    this.add.particles(0, 0, 'ash', { x: { min: 2150, max: 2560 }, y: -20, lifespan: 5000, speedY: { min: 40, max: 90 }, speedX: { min: -30, max: 10 }, scale: 3, frequency: 60, alpha: { start: .9, end: .2 } }).setDepth(3300);
    this.add.particles(2390, 140, 'ash', { lifespan: 3000, speedY: { min: -60, max: -20 }, speedX: { min: -20, max: 20 }, scale: { start: 4, end: 9 }, alpha: { start: .6, end: 0 }, frequency: 120, tint: 0x5a5550 }).setDepth(3300);
    return { width: 2560, height: 880, spawn: ZONES[0].checkpoint, bounds: [40, 210, 2480, 560] };
  }

  private addHazard(x: number, y: number, kind: 'spore' | 'lava'): void {
    const sprite = this.add.image(x, y + 30, kind === 'spore' ? 'spore-pool' : 'lava').setOrigin(.5, .9).setScale(4).setDepth(2);
    const glow = this.add.image(x, y, 'glow').setScale(kind === 'spore' ? 5 : 4.5).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD).setTint(kind === 'spore' ? 0x7ad04a : 0xff7a2a).setAlpha(.55);
    this.tweens.add({ targets: [glow], alpha: .25, duration: 900 + (x % 400), yoyo: true, repeat: -1 });
    if (kind === 'spore') {
      this.add.particles(x, y, 'spore', { lifespan: 1800, speedY: { min: -40, max: -15 }, speedX: { min: -15, max: 15 }, scale: { start: 3, end: 0 }, frequency: 220, blendMode: 'ADD', x: { min: -40, max: 40 } }).setDepth(3150);
    }
    void sprite;
    this.hazards.push({ x, y, rx: kind === 'spore' ? 54 : 62, ry: kind === 'spore' ? 26 : 18, kind });
  }

  private addHunter(x: number, y0: number, y1: number, speed: number, phase: number): void {
    const sprite = this.add.image(x, y0, 'hunter').setOrigin(.5, .9).setScale(4).setDepth(y0);
    const beam = this.add.image(x, y0, 'beam').setOrigin(0, .5).setScale(4.8, 5.2).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD);
    const lamp = this.add.image(x, y0, 'glow').setScale(3).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0);
    this.hunters.push({ sprite, beam, lamp, x, y0, y1, t: phase, speed, facing: Math.PI, phase });
  }

  protected objective() {
    if (!this.started) return { step: '2002', text: 'Something is wrong…', target: null };
    if (this.reached) return { step: 'Safe', text: 'You made it.', target: null };
    return { step: ['The forest', 'Hunters', 'The stream', 'Cleared land', 'The storm'][this.zone], text: 'Reach the safe burrow', target: { x: 2470, y: 470 } };
  }

  protected onStart(): void {
    // The chytrid cutscene: other frogs fall silent and the population crashes.
    this.freezeCutscene();
    sound.play('spore');
    const spores = this.add.particles(0, 0, 'spore', { x: { min: 0, max: 700 }, y: { min: 250, max: 700 }, lifespan: 2400, speed: { min: 10, max: 40 }, scale: { start: 3, end: 0 }, frequency: 25, blendMode: 'ADD' }).setDepth(3150);
    this.toast('2002 · Chytrid arrives', 'A deadly fungus reaches Dominica. Watch the other frogs…', 'threat', 7000);
    this.time.delayedCall(900, () => {
      this.ambient?.sicken(320);
      sound.play('crash');
      this.setPopulation(15, 2400);
    });
    this.time.delayedCall(3600, () => {
      spores.stop();
      void this.banner('85% GONE', 'in about 18 months on Dominica', 1700, 'is-threat').then(() => {
        this.started = true;
        this.unfreezeCutscene();
        this.refreshObjective(true);
        this.toast('Survive', 'Travel east to the safe burrow. Threats lie ahead.', 'tip', 5000);
      });
    });
  }

  private freezeCutscene(): void { this.frozen = true; this.frog.stop(); }
  private unfreezeCutscene(): void { this.frozen = false; }

  protected tick(time: number, delta: number): void {
    this.ambient?.update(delta);
    this.darkness.setPosition(this.frog.x, this.frog.y - 20);
    if (!this.started || this.reached) return;
    // Zones and checkpoints.
    const zone = ZONES.reduce((found, item, i) => this.frog.x >= item.x ? i : found, 0);
    if (zone > this.zone) {
      this.zone = zone;
      this.setCheckpoint(ZONES[zone].checkpoint.x, ZONES[zone].checkpoint.y);
      const info = ZONES[zone];
      if (info.tag) { this.toast(info.tag, info.text!, 'threat', 8000); sound.play('spotted'); }
    }
    // Hiding.
    this.hidden = this.bushes.some(bush => Math.abs(this.frog.x - bush.x) < 48 && Math.abs(this.frog.y - bush.y) < 36);
    this.frog.setHidden(this.hidden);
    this.updateHunters(delta);
    if (this.frozen) return;
    // Hazards.
    for (const hazard of this.hazards) {
      if (((this.frog.x - hazard.x) / hazard.rx) ** 2 + ((this.frog.y - hazard.y) / hazard.ry) ** 2 < 1 && this.damage()) {
        if (hazard.kind === 'spore') { sound.play('spore'); this.cameras.main.flash(250, 120, 220, 80); this.toast('Infected!', 'Chytrid spreads through water and wet ground.', 'threat', 3500); }
        else { this.cameras.main.flash(200, 255, 120, 40); this.toast('Too hot!', 'Lava and ash destroyed frog habitat on Montserrat.', 'threat', 3500); }
        if (this.frozen) return;
      }
    }
    this.updatePig(delta);
    this.updateStorm(time, delta);
    if (Phaser.Math.Distance.Between(this.frog.x, this.frog.y, 2470, 470) < 70) this.reachBurrow();
  }

  private updateHunters(delta: number): void {
    for (const hunter of this.hunters) {
      hunter.t += delta / 1000;
      const span = Math.abs(hunter.y1 - hunter.y0);
      const cycle = (hunter.t * hunter.speed) % (span * 2);
      const progress = cycle < span ? cycle : span * 2 - cycle;
      const y = hunter.y0 + Math.sign(hunter.y1 - hunter.y0) * progress;
      hunter.sprite.setPosition(hunter.x, y).setDepth(y).setTexture(Math.floor(hunter.t * 4) % 2 ? 'hunter-1' : 'hunter');
      const angle = hunter.facing + Math.sin(hunter.t * 1.4 + hunter.phase) * .55;
      const ox = hunter.x + 22, oy = y - 40;
      hunter.beam.setPosition(ox, oy).setRotation(angle);
      hunter.lamp.setPosition(hunter.x, y - 92);
      if (this.frozen || this.hidden || this.invulnerable) continue;
      const dx = this.frog.x - ox, dy = this.frog.y - 10 - oy;
      const distance = Math.hypot(dx, dy);
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle));
      if (distance < 290 && off < .27) this.caught(hunter);
    }
  }

  private caught(hunter: Hunter): void {
    this.frozen = true; this.frog.stop();
    this.catches++;
    sound.play('spotted');
    const alert = this.add.text(hunter.sprite.x, hunter.sprite.y - 130, '!', { fontFamily: 'PressStart', fontSize: '42px', color: '#ff4a3a', stroke: '#000', strokeThickness: 6 }).setOrigin(.5).setDepth(5000);
    this.tweens.add({ targets: alert, scale: 1.4, duration: 150, yoyo: true });
    this.frog.visual.setTintFill(0xfff6c0);
    if (!reducedMotion()) this.cameras.main.zoomTo(1.25, 350);
    this.time.delayedCall(600, () => {
      alert.destroy();
      jumpscare(this.fx, this.catches === 1 ? 'Hunting took thousands of mountain chickens every year.' : 'Caught again! Hide in the bushes while the beam passes.', () => {
        this.cameras.main.zoomTo(1, 10);
        this.frog.visual.clearTint();
        if (run.population > 3) this.setPopulation(run.population - 1, 600);
        for (const other of this.hunters) other.speed *= .85; // gets a little easier after each catch
        this.hearts = Math.max(0, this.hearts - 1);
        this.updateHearts();
        if (this.hearts <= 0) { this.frozen = false; this.faint(); }
        else { this.frozen = false; this.respawn(false); }
      });
    });
  }

  private updatePig(delta: number): void {
    const pig = this.pig;
    const now = this.time.now;
    const dx = this.frog.x - pig.sprite.x, dy = this.frog.y - pig.sprite.y;
    const distance = Math.hypot(dx, dy);
    if (pig.state === 'roam') {
      if (distance < 260 && this.frog.x > 1760) { pig.state = 'charge'; pig.until = now + 1300; pig.vx = dx / distance * 210; pig.vy = dy / distance * 210; sound.play('hurt'); }
      else if (Math.random() < .01) { const a = Math.random() * Math.PI * 2; pig.vx = Math.cos(a) * 50; pig.vy = Math.sin(a) * 40; }
    } else if (pig.state === 'charge' && now > pig.until) { pig.state = 'rest'; pig.until = now + 1600; pig.vx = 0; pig.vy = 0; }
    else if (pig.state === 'rest' && now > pig.until) pig.state = 'roam';
    const x = Phaser.Math.Clamp(pig.sprite.x + pig.vx * delta / 1000, 1800, 2140);
    const y = Phaser.Math.Clamp(pig.sprite.y + pig.vy * delta / 1000, 260, 680);
    if (x === 1800 || x === 2140) pig.vx *= -1;
    if (y === 260 || y === 680) pig.vy *= -1;
    pig.sprite.setPosition(x, y).setDepth(y).setFlipX(pig.vx < 0).setTexture(Math.floor(this.elapsed / (pig.state === 'charge' ? 90 : 220)) % 2 ? 'pig-1' : 'pig');
    if (distance < 56 && this.damage()) {
      this.toast('Invasive predator', 'Feral pigs, brought by people, eat frogs.', 'threat', 3500);
      this.frog.collider.setPosition(this.frog.x + Math.sign(dx || 1) * 60, this.frog.y);
      pig.state = 'rest'; pig.until = this.time.now + 1800; pig.vx = 0; pig.vy = 0;
    }
  }

  private updateStorm(time: number, _delta: number): void {
    if (this.frog.x < 2150) { this.frog.push.set(0, 0); return; }
    if (time > this.nextGust) {
      this.gustDirection = Math.random() < .5 ? -1 : 1;
      this.gustUntil = time + 1500; this.nextGust = time + 3600;
      sound.play('wind');
      this.cameras.main.shake(300, .003);
    }
    const strength = time < this.gustUntil ? 150 : 0;
    this.frog.push.set(-40 * (strength ? 1 : 0), this.gustDirection * strength);
  }

  private reachBurrow(): void {
    if (this.reached) return;
    this.reached = true;
    this.frog.push.set(0, 0);
    this.freeze('cutscene');
    this.tweens.add({ targets: this.frog.visual, scale: 2.5, alpha: .2, duration: 600 });
    sound.play('splash');
    this.setPopulation(3, 1800);
    this.time.delayedCall(800, () => {
      void this.banner('YOU SURVIVED', 'In 2023, scientists found only 21 wild frogs on Dominica.', 2600, 'is-win').then(() => {
        this.unfreeze();
        this.unlockCards(['threats'], () => this.complete());
      });
    });
  }
}

import Phaser from 'phaser';
import { ChapterScene, type WorldInfo } from './ChapterScene';
import { buildLevel, PALETTES, scatter, type Prop } from '../world/Terrain';
import { sound } from '../systems/Sound';
import { run, POPULATION_AT } from '../systems/run';

interface Lost { sprite: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; x: number; y: number; following: boolean; saved: boolean; shiver: number }

/** Chapter 4: help the conservation team — lead lost frogs to the warm, chytrid-free pools. */
export class RescueScene extends ChapterScene {
  protected readonly chapterNumber = 4;
  protected readonly music = 'rescue' as const;
  private lost: Lost[] = [];
  private trail: { x: number; y: number }[] = [];
  private saved = 0;
  private talked = false;
  private briefed = false;
  private readonly gate = { x: 1180, y: 560 };
  private readonly boss = { x: 1300, y: 560 };

  constructor() { super('RescueScene'); }

  protected buildWorld(): WorldInfo {
    this.lost = []; this.trail = []; this.saved = 0; this.talked = false; this.briefed = false;
    run.setPopulation(POPULATION_AT[4]);
    const spec = {
      key: 'terrain-rescue', width: 420, height: 260, palette: PALETTES.rescue,
      paths: [[[40, 150], [120, 140], [200, 150], [290, 150]], [[200, 150], [180, 90], [130, 60]], [[200, 150], [170, 210], [110, 225]]] as [number, number][][],
      clearings: [[340, 150, 60, 52], [40, 150, 26, 20]] as [number, number, number, number][],
    };
    const fenceProps: Prop[] = [];
    for (let x = 1120; x <= 1600; x += 64) { fenceProps.push({ key: 'fence', x, y: 400, solid: [64, 20] }); if (x !== 1120) fenceProps.push({ key: 'fence', x, y: 820, solid: [64, 20] }); }
    for (let y = 464; y <= 820; y += 64) { if (y !== 592) fenceProps.push({ key: 'fence', x: 1120, y, solid: [20, 64] }); fenceProps.push({ key: 'fence', x: 1610, y, solid: [20, 64] }); }
    const props: Prop[] = [
      ...scatter(['tree', 'tree', 'bush', 'palm'], 30, [20, 60, 1660, 1020], [[180, 600, 120], [1360, 610, 330], [520, 250, 100], [440, 880, 100], [880, 650, 110], [1010, 900, 100], [600, 600, 80]], 31, [38, 26], spec.paths),
      ...scatter(['fern', 'flower'], 22, [40, 80, 1100, 1000], [[180, 600, 90]], 51),
      ...fenceProps,
      { key: 'pool', x: 1300, y: 720, solid: [180, 70] }, { key: 'pool', x: 1490, y: 560, solid: [180, 70] },
      { key: 'solar', x: 1500, y: 760, solid: [80, 30] }, { key: 'solar', x: 1560, y: 460 },
      { key: 'thermo', x: 1210, y: 700 }, { key: 'lab', x: 1360, y: 362 },
      { key: 'researcher-2', x: this.boss.x, y: this.boss.y, solid: [28, 18] }, { key: 'researcher', x: 1440, y: 700, solid: [28, 18] },
    ];
    this.blocks = buildLevel(this, spec, props);
    for (const pool of [{ x: 1300, y: 690 }, { x: 1490, y: 530 }]) {
      this.add.particles(pool.x, pool.y - 20, 'steam', { lifespan: 2200, speedY: { min: -40, max: -20 }, speedX: { min: -10, max: 10 }, scale: { start: 3, end: 6 }, alpha: { start: .5, end: 0 }, frequency: 240, x: { min: -60, max: 60 } }).setDepth(2000);
    }
    const spots: [number, number][] = [[520, 250], [440, 880], [880, 650], [1010, 900]];
    for (const [x, y] of spots) {
      const shadow = this.add.image(x, y + 10, 'frog-shadow').setScale(2.2).setAlpha(.4).setDepth(y - 1);
      const sprite = this.add.image(x, y, 'frog-down-0').setScale(2.8).setDepth(y).setTint(0xc8d8b8);
      this.lost.push({ sprite, shadow, x, y, following: false, saved: false, shiver: Math.random() * 1000 });
      const help = this.add.text(x, y - 60, '?', { fontFamily: 'PressStart', fontSize: '22px', color: '#fff4b8', stroke: '#4a3a2a', strokeThickness: 5 }).setOrigin(.5).setDepth(4000);
      this.tweens.add({ targets: help, y: y - 72, duration: 500, yoyo: true, repeat: -1 });
      sprite.setData('help', help);
    }
    this.interactables.push({ x: this.boss.x, y: this.boss.y + 30, radius: 110, label: 'Talk to the researcher', action: () => this.talk() });
    this.interactables.push({ x: 1210, y: 720, radius: 80, label: 'Read the thermometer', action: () => this.toast('31 °C', 'Solar-powered pools stay above 30 °C — too hot for chytrid fungus to survive.', 'good', 6000) });
    this.add.particles(0, 0, 'leaf', { x: { min: 0, max: 1700 }, y: -10, lifespan: 9000, speedY: { min: 40, max: 70 }, speedX: { min: -20, max: 30 }, rotate: { min: 0, max: 360 }, scale: 3, frequency: 900 }).setDepth(3500);
    return { width: 1680, height: 1040, spawn: { x: 180, y: 600 }, bounds: [40, 80, 1600, 900] };
  }

  protected objective() {
    if (!this.briefed) return { step: 'Montserrat', text: 'Meet the conservation team', target: { x: this.boss.x, y: this.boss.y } };
    const following = this.lost.filter(frog => frog.following).length;
    if (this.saved < this.lost.length) {
      if (following && (following + this.saved === this.lost.length || !this.lost.some(frog => !frog.following && !frog.saved))) return { step: `Rescued ${this.saved}/${this.lost.length}`, text: 'Lead the frogs to the gate', target: this.gate };
      const next = this.nearestLost();
      return { step: `Rescued ${this.saved}/${this.lost.length}`, text: following ? `Find more frogs (${following} following)` : 'Find the lost frogs', target: next ? { x: next.x, y: next.y } : this.gate };
    }
    if (!this.talked) return { step: 'All safe!', text: 'Report back to the researcher', target: { x: this.boss.x, y: this.boss.y } };
    return { step: 'Done', text: 'Great work!', target: null };
  }

  private nearestLost(): Lost | undefined {
    return this.lost.filter(frog => !frog.following && !frog.saved).sort((a, b) => Phaser.Math.Distance.Between(this.frog.x, this.frog.y, a.x, a.y) - Phaser.Math.Distance.Between(this.frog.x, this.frog.y, b.x, b.y))[0];
  }

  protected onStart(): void {
    this.toast('Montserrat', 'Conservationists built a predator-proof enclosure with warm pools. Go and meet them!', 'good', 6000);
  }

  private talk(): void {
    if (!this.briefed) {
      this.briefed = true;
      sound.play('chime');
      this.toast('Researcher', '"Four frogs got lost outside the fence. Lead them through the gate to the warm pools!"', 'good', 7000);
      this.refreshObjective(true);
      return;
    }
    if (this.saved < this.lost.length) { this.toast('Researcher', `"${this.lost.length - this.saved} still out there. They will follow you!"`, '', 3500); return; }
    if (this.talked) return;
    this.talked = true;
    this.unlockCards(['support', 'importance'], () => this.complete('RESCUE COMPLETE'));
  }

  protected tick(_time: number, delta: number): void {
    if (Phaser.Math.Distance.Between(this.trail[0]?.x ?? 0, this.trail[0]?.y ?? 0, this.frog.x, this.frog.y) > 8) {
      this.trail.unshift({ x: this.frog.x, y: this.frog.y });
      if (this.trail.length > 120) this.trail.pop();
    }
    let order = 0;
    for (const frog of this.lost) {
      if (frog.saved) continue;
      frog.shiver += delta;
      if (!frog.following) {
        frog.sprite.setPosition(frog.x + (Math.floor(frog.shiver / 70) % 2 ? 1 : -1), frog.y);
        if (this.briefed && Phaser.Math.Distance.Between(this.frog.x, this.frog.y, frog.x, frog.y) < 70) {
          frog.following = true;
          (frog.sprite.getData('help') as Phaser.GameObjects.Text).destroy();
          sound.play('join');
          const label = this.add.text(frog.x, frog.y - 60, 'Follow me!', { fontFamily: 'Pixelify', fontSize: '22px', color: '#fff4b8', stroke: '#3a4a2a', strokeThickness: 5 }).setOrigin(.5).setDepth(5000);
          this.tweens.add({ targets: label, y: label.y - 40, alpha: 0, duration: 1200, onComplete: () => label.destroy() });
          if (this.lost.filter(item => item.following || item.saved).length === 1) this.toast('Found one!', 'Lost frogs hop along behind you. Lead them through the gate.', 'good', 4000);
        } else if (!this.briefed && Phaser.Math.Distance.Between(this.frog.x, this.frog.y, frog.x, frog.y) < 70) {
          this.toast('Hmm', 'This frog looks lost. Talk to the researchers first.', '', 2500);
          frog.shiver = -2000;
        }
        continue;
      }
      order++;
      const point = this.trailPoint(order * 56);
      const dx = point.x - frog.x, dy = point.y - frog.y;
      frog.x += dx * Math.min(1, delta / 120); frog.y += dy * Math.min(1, delta / 120);
      const facing = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
      const moving = Math.hypot(dx, dy) > 4;
      const lift = moving ? Math.round(Math.abs(Math.sin(this.elapsed / 120 + order)) * 2) * 3 : 0;
      frog.sprite.setPosition(frog.x, frog.y - lift).setDepth(frog.y).setTexture(`frog-${facing}-${lift > 3 ? 2 : 0}`);
      frog.shadow.setPosition(frog.x, frog.y + 10).setDepth(frog.y - 1);
      if (frog.x > this.gate.x - 10 && Math.abs(frog.y - this.gate.y) < 140) this.rescue(frog);
    }
  }

  /** The point `distance` pixels behind the frog along the path it walked. */
  private trailPoint(distance: number): { x: number; y: number } {
    let previous = { x: this.frog.x, y: this.frog.y }, left = distance;
    for (const point of this.trail) {
      const step = Phaser.Math.Distance.Between(previous.x, previous.y, point.x, point.y);
      if (step >= left) { const t = left / (step || 1); return { x: previous.x + (point.x - previous.x) * t, y: previous.y + (point.y - previous.y) * t }; }
      left -= step; previous = point;
    }
    return previous;
  }

  private rescue(frog: Lost): void {
    frog.saved = true; frog.following = false;
    this.saved++;
    sound.play('rescue');
    const pool = this.saved % 2 ? { x: 1300, y: 690 } : { x: 1490, y: 530 };
    frog.sprite.clearTint();
    this.tweens.add({ targets: [frog.sprite], x: pool.x + Phaser.Math.Between(-40, 40), y: pool.y + Phaser.Math.Between(-10, 10), duration: 900, ease: 'Sine.easeInOut', onComplete: () => sound.play('splash') });
    this.tweens.add({ targets: frog.shadow, alpha: 0, duration: 300 });
    this.setPopulation(run.population + 5, 900);
    const text = this.add.text(this.gate.x + 40, this.gate.y - 80, 'SAFE! +5', { fontFamily: 'PressStart', fontSize: '18px', color: '#c8f07a', stroke: '#2a4a22', strokeThickness: 5 }).setOrigin(.5).setDepth(5000);
    this.tweens.add({ targets: text, y: text.y - 50, alpha: 0, duration: 1300, onComplete: () => text.destroy() });
    if (this.saved === 1) this.toast('Swab check', 'Researchers swab frogs to study chytrid and look for frogs that resist it.', 'good', 4500);
    if (this.saved === this.lost.length) this.toast('All rescued!', 'Report back to the researcher.', 'good', 5000);
  }
}

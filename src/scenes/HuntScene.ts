import Phaser from 'phaser';
import { ChapterScene, type WorldInfo } from './ChapterScene';
import { buildLevel, PALETTES, scatter, type Prop } from '../world/Terrain';
import { Prey, PREY, type PreyKind } from '../entities/Critters';
import { classHost } from '../systems/ClassHost';
import { sound } from '../systems/Sound';
import { run } from '../systems/run';

/** Chapter 2: hunt to fill your belly — then learn the niche you just played. */
export class HuntScene extends ChapterScene {
  protected readonly chapterNumber = 2;
  protected readonly music = 'dusk' as const;
  private prey: Prey[] = [];
  private belly = 0;
  private combo = 0;
  private comboUntil = 0;
  private tongueReady = 0;
  private spawnIn = 0;
  private snakeShown = false;
  private full = false;
  private tongue!: Phaser.GameObjects.Graphics;
  private arena = new Phaser.Geom.Rectangle(170, 190, 1020, 560);
  private classBugs = 0;
  private firstCatch = true;

  constructor() { super('HuntScene'); }

  protected bugsEnabled(): boolean { return !this.full; }

  protected buildWorld(): WorldInfo {
    this.prey = []; this.belly = 0; this.combo = 0; this.comboUntil = 0; this.tongueReady = 0; this.spawnIn = 0; this.snakeShown = false; this.full = false; this.classBugs = 0; this.firstCatch = true;
    run.setPopulation(100);
    const spec = {
      key: 'terrain-hunt', width: 340, height: 220, palette: PALETTES.dusk,
      paths: [[[0, 120], [60, 112], [100, 110]]] as [number, number][][],
      clearings: [[170, 118, 135, 76]] as [number, number, number, number][],
      rivers: [{ points: [[300, 0], [312, 60], [326, 120], [318, 220]] as [number, number][], width: 9 }],
    };
    const edge: [number, number, number][] = [[680, 470, 470]];
    const props: Prop[] = [
      ...scatter(['tree-dusk', 'tree-dusk', 'bush'], 24, [20, 40, 1200, 860], edge, 9, [38, 26]),
      ...scatter(['fern', 'fern', 'flower'], 14, [120, 160, 1240, 820], [[680, 470, 300]], 22),
      { key: 'log', x: 470, y: 360, solid: [140, 24] }, { key: 'log', x: 900, y: 640, solid: [140, 24], flip: true },
      { key: 'rock', x: 860, y: 330, solid: [42, 22] }, { key: 'rock', x: 380, y: 640, solid: [42, 22] }, { key: 'stump', x: 1010, y: 450, solid: [50, 22] },
    ];
    this.blocks = buildLevel(this, spec, props);
    this.blocks.add(this.add.zone(1290, 440, 90, 880));
    this.tongue = this.add.graphics().setDepth(4900);
    this.add.particles(0, 0, 'rain', { x: { min: 0, max: 1500 }, y: -20, lifespan: 1400, speedY: { min: 520, max: 640 }, speedX: -70, scale: 3, frequency: 40, alpha: { start: .55, end: .2 } }).setDepth(4600);
    this.add.particles(0, 0, 'firefly', { x: { min: 100, max: 1250 }, y: { min: 150, max: 800 }, lifespan: 3200, speed: { min: 4, max: 16 }, scale: { start: 2.5, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 380, blendMode: 'ADD' }).setDepth(4700);
    for (let i = 0; i < 7; i++) this.spawn();
    const offBug = classHost.onBug(({ id, name }) => this.dropBug(id, name));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offBug);
    return { width: 1360, height: 880, spawn: { x: 680, y: 470 }, bounds: [40, 80, 1220, 760] };
  }

  protected objective() {
    if (this.full) return { step: 'Belly full', text: 'Dinner done!', target: null };
    const snake = this.prey.find(item => item.alive && item.kind === 'snake');
    return { step: 'Hunt', text: snake ? 'Catch the snake!' : 'Fill your belly', target: snake ? { x: snake.sprite.x, y: snake.sprite.y } : null };
  }

  protected onStart(): void {
    this.updateMeter();
    this.publishPhone();
    this.toast('How to hunt', 'Get close and press SPACE to flick your tongue. Chain catches for a combo!', 'tip', 6500);
    if (classHost.hasClass) this.time.delayedCall(1200, () => this.toast('Class', 'Tap "DROP A CRICKET" on your phone — points if the frog eats yours!', 'good', 6500));
  }

  private spawn(kind?: PreyKind, owner?: { id: string; name: string }): Prey {
    const roll = Math.random();
    const chosen: PreyKind = kind ?? (roll < .45 ? 'cricket' : roll < .6 ? 'beetle' : roll < .72 ? 'millipede' : roll < .84 ? 'snail' : 'crab');
    let x = 0, y = 0;
    for (let tries = 0; tries < 12; tries++) {
      x = Phaser.Math.Between(this.arena.left, this.arena.right); y = Phaser.Math.Between(this.arena.top, this.arena.bottom);
      if (!this.frog || Phaser.Math.Distance.Between(x, y, this.frog.x, this.frog.y) > 220) break;
    }
    const prey = new Prey(this, chosen, x, y, this.arena, owner);
    prey.sprite.setScale(0); this.tweens.add({ targets: prey.sprite, scale: 4, duration: 260, ease: 'Back.easeOut' });
    this.prey.push(prey);
    return prey;
  }

  private dropBug(id: string, name: string): void {
    if (this.full || this.finished || this.classBugs >= 14) return;
    this.classBugs++;
    const prey = this.spawn('cricket', { id, name });
    const landY = prey.sprite.y;
    prey.sprite.setY(landY - 300); prey.sprite.setScale(4);
    this.tweens.add({ targets: prey.sprite, y: landY, duration: 520, ease: 'Bounce.easeOut' });
    sound.play('join');
  }

  protected onAction(): void {
    if (this.full || this.time.now < this.tongueReady) return;
    this.tongueReady = this.time.now + 260;
    const dir = this.frog.direction;
    const mouth = { x: this.frog.x + dir.x * 16, y: this.frog.y - 14 + dir.y * 8 };
    let best: Prey | undefined, bestScore = Infinity;
    for (const item of this.prey) {
      if (!item.alive) continue;
      const dx = item.sprite.x - mouth.x, dy = item.sprite.y - mouth.y;
      const d = Math.hypot(dx, dy);
      const facing = (dx * dir.x + dy * dir.y) / (d || 1);
      if (d < 95 || (d < 190 && facing > .35)) { const score = d - facing * 40; if (score < bestScore) { best = item; bestScore = score; } }
    }
    sound.play('tongue');
    const end = best ? { x: best.sprite.x, y: best.sprite.y } : { x: mouth.x + dir.x * 130, y: mouth.y + dir.y * 130 };
    const shot = { t: 0 };
    this.tweens.add({
      targets: shot, t: 1, duration: 90, yoyo: true, hold: 30,
      onUpdate: () => this.drawTongue(mouth, end, shot.t),
      onYoyo: () => { if (best?.alive) { best.eat(mouth.x, mouth.y); this.ate(best); } },
      onComplete: () => this.tongue.clear(),
    });
  }

  private drawTongue(from: { x: number; y: number }, to: { x: number; y: number }, t: number): void {
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
    this.tongue.clear().lineStyle(10, 0x5a2a2a).lineBetween(from.x, from.y, x, y).lineStyle(6, 0xe07a8a).lineBetween(from.x, from.y, x, y).fillStyle(0xf09aa8).fillCircle(x, y, 7);
  }

  private ate(prey: Prey): void {
    const info = PREY[prey.kind];
    this.combo = this.time.now < this.comboUntil ? this.combo + 1 : 1;
    this.comboUntil = this.time.now + 2600;
    const gain = Math.round(info.food * (1 + Math.min(this.combo - 1, 4) * .25));
    this.belly = Math.min(100, this.belly + gain);
    sound.play('gulp'); this.time.delayedCall(80, () => sound.play('catch', this.combo));
    let text = `+${gain}`;
    if (this.combo > 1) text += `  ×${this.combo}!`;
    this.popup(text, this.combo > 1 ? '#ffd36a' : '#fff2b3');
    if (prey.owner) {
      classHost.awardBug(prey.owner.id);
      this.classBugs--;
      this.time.delayedCall(250, () => this.popup(`+150 for ${prey.owner!.name}!`, '#c8f07a', -40));
    }
    if (this.firstCatch) { this.firstCatch = false; this.toast('Crunch!', `${info.label}s are on the menu. Mountain chickens mostly eat crickets and grasshoppers.`, '', 5000); }
    if (prey.kind === 'snake') this.toast('Top predator', 'Eating a snake makes you a tertiary consumer!', 'good', 5500);
    if (prey.kind === 'crab') this.toast('Land crab', 'Crabs are part of the wild diet too.', '', 4000);
    this.updateMeter();
    if (this.belly >= 55 && !this.snakeShown) {
      this.snakeShown = true;
      const snake = this.spawn('snake');
      this.toast('Look!', 'A small snake — mountain chickens sometimes eat snakes.', 'good', 5000);
      snake.sprite.setDepth(snake.sprite.y);
    }
    if (this.belly >= 100) this.fill();
  }

  private popup(text: string, color: string, offset = 0): void {
    const pop = this.add.text(this.frog.x, this.frog.y - 80 + offset, text, { fontFamily: 'PressStart', fontSize: '16px', color, stroke: '#3a2a1a', strokeThickness: 5 }).setOrigin(.5).setDepth(5000);
    this.tweens.add({ targets: pop, y: pop.y - 46, alpha: 0, duration: 1100, ease: 'Quad.easeOut', onComplete: () => pop.destroy() });
  }

  private updateMeter(): void {
    const comboText = this.combo > 1 && this.time.now < this.comboUntil ? `<span class="combo">COMBO ×${this.combo}</span>` : '';
    this.showMeter(`<span>Belly</span><div class="meter-bar"><i style="--v:${this.belly}%"></i></div><b>${this.belly}%</b>${comboText}`);
  }

  private fill(): void {
    this.full = true;
    this.publishPhone();
    for (const item of this.prey) if (item.alive && !item.owner) this.tweens.add({ targets: item.sprite, alpha: 0, duration: 400 });
    void this.banner('FULL BELLY!', 'You are a predator', 1500, 'is-win').then(() => this.unlockCards(['niche'], () => this.complete()));
  }

  protected tick(_time: number, delta: number): void {
    const near = { x: this.frog.x, y: this.frog.y };
    for (const item of this.prey) item.update(delta, near);
    this.prey = this.prey.filter(item => item.alive);
    if (!this.full) {
      this.spawnIn -= delta;
      const natural = this.prey.filter(item => !item.owner).length;
      if (this.spawnIn <= 0 && natural < 9) { this.spawn(); this.spawnIn = 1100; }
    }
    if (this.combo > 1 && this.time.now > this.comboUntil) { this.combo = 0; this.updateMeter(); }
  }
}

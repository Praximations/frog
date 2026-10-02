import Phaser from 'phaser';
import { ChapterScene, type WorldInfo } from './ChapterScene';
import { buildLevel, PALETTES, type Prop } from '../world/Terrain';
import { SIX_DEGREES } from '../data/journal';
import { sound } from '../systems/Sound';
import { artUrl } from '../world/Art';
import { esc } from '../ui/html';
import { reducedMotion } from '../systems/Settings';

/** Chapter 5: hop the glowing stones from YOU to the frog — six degrees of separation. */
export class ConnectScene extends ChapterScene {
  protected readonly chapterNumber = 5;
  protected readonly music = 'trail' as const;
  private stones: { x: number; y: number; image: Phaser.GameObjects.Image; icon: Phaser.GameObjects.Image }[] = [];
  private reached = -1;
  private links!: Phaser.GameObjects.Graphics;
  private done = false;

  constructor() { super('ConnectScene'); }

  protected buildWorld(): WorldInfo {
    this.stones = []; this.reached = -1; this.done = false;
    const spec = {
      key: 'terrain-connect', width: 560, height: 180, palette: PALETTES.twilight,
      paths: [[[0, 95], [40, 95]], [[520, 95], [560, 95]]] as [number, number][][],
      ponds: [[280, 92, 232, 70]] as [number, number, number, number][],
      clearings: [[24, 95, 30, 30], [540, 95, 30, 30]] as [number, number, number, number][],
    };
    const props: Prop[] = [];
    for (let x = 30; x < 2240; x += 110) {
      props.push({ key: 'tree-dark', x: x + (x * 13) % 30, y: 90 + (x % 3) * 10, tint: 0x8a8ad0 });
      props.push({ key: 'tree-dark', x: x + 40 - (x * 7) % 30, y: 720, tint: 0x8a8ad0 });
    }
    props.push({ key: 'rock', x: 2165, y: 430, scale: 9, tint: 0xb8b0e0 });
    this.blocks = buildLevel(this, spec, props);
    this.links = this.add.graphics().setDepth(1);
    const count = SIX_DEGREES.length;
    for (let i = 0; i < count; i++) {
      const x = 170 + i * ((2040 - 170) / (count - 1));
      const y = 380 + Math.sin(i * 1.3) * 90;
      const image = this.add.image(x, y + 26, 'stone').setOrigin(.5, .9).setScale(4.4).setDepth(2);
      this.tweens.add({ targets: image, y: y + 30, duration: 1400 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const icon = this.add.image(x, y - 120, `icon-${SIX_DEGREES[i].icon}`).setScale(4).setDepth(4000).setAlpha(.35);
      this.tweens.add({ targets: icon, y: y - 132, duration: 900 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.stones.push({ x, y, image, icon });
    }
    // You at the start, the frog at the end.
    this.add.image(this.stones[0].x - 70, this.stones[0].y + 10, 'kid').setOrigin(.5, .9).setScale(4).setDepth(this.stones[0].y + 10);
    const hero = this.add.image(2160, 330, 'portrait').setScale(2.6).setDepth(500);
    this.tweens.add({ targets: hero, y: 322, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.particles(0, 0, 'firefly', { x: { min: 0, max: 2240 }, y: { min: 120, max: 700 }, lifespan: 4200, speed: { min: 4, max: 14 }, scale: { start: 2.8, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 120, blendMode: 'ADD', tint: [0xc8f07a, 0x9ae0ff, 0xffe0a0] }).setDepth(3200);
    return { width: 2240, height: 720, spawn: { x: 90, y: 380 }, bounds: [40, 230, 2060, 300] };
  }

  protected objective() {
    if (this.done) return { step: 'Six degrees', text: 'Everything is connected', target: null };
    const next = this.stones[this.reached + 1];
    return { step: `Connections ${Math.max(0, this.reached)}/6`, text: this.reached < 0 ? 'Step onto the first stone: YOU' : 'Hop to the next glowing stone', target: next ? { x: next.x, y: next.y } : null };
  }

  protected onStart(): void {
    this.toast('Six degrees', 'Every stone is one step between you and the mountain chicken. Hop them in order!', 'tip', 6000);
    this.highlightNext();
  }

  private highlightNext(): void {
    const next = this.stones[this.reached + 1];
    if (!next) return;
    next.image.setTexture('stone-lit');
    this.tweens.add({ targets: next.icon, alpha: .9, duration: 300 });
  }

  protected tick(): void {
    if (this.done) return;
    const next = this.stones[this.reached + 1];
    if (next && Phaser.Math.Distance.Between(this.frog.x, this.frog.y, next.x, next.y) < 62) this.step();
  }

  private step(): void {
    this.reached++;
    const i = this.reached;
    const stone = this.stones[i];
    sound.play(i === this.stones.length - 1 ? 'unlock' : 'chime');
    stone.icon.setAlpha(1).setScale(5);
    this.tweens.add({ targets: stone.icon, scale: 4, duration: 400, ease: 'Back.easeOut' });
    this.drawLinks();
    this.showLink(i);
    if (i === this.stones.length - 1) { this.finishTrail(); return; }
    this.highlightNext();
    this.setCheckpoint(stone.x, stone.y);
  }

  private drawLinks(): void {
    this.links.clear();
    for (let i = 1; i <= this.reached; i++) {
      const a = this.stones[i - 1], b = this.stones[i];
      this.links.lineStyle(14, 0x2a8a7a, .5).lineBetween(a.x, a.y, b.x, b.y).lineStyle(6, 0x9afff0, .95).lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  private showLink(i: number): void {
    const link = SIX_DEGREES[i];
    let panel = this.root.querySelector<HTMLElement>('.link-panel');
    if (!panel) { panel = document.createElement('div'); panel.className = 'link-panel'; this.root.append(panel); }
    panel.innerHTML = `<img class="pixel" src="${artUrl(`icon-${link.icon}`, 5)}" alt=""><div><span class="micro">${link.step === 'YOU' ? 'Start' : link.step === 'FROG' ? 'Destination' : `Connection ${link.step} of 5`}</span><b>${esc(link.title)}</b><p>${esc(link.text)}</p></div>`;
    panel.classList.remove('is-new'); void panel.offsetWidth; panel.classList.add('is-new');
  }

  private finishTrail(): void {
    this.done = true;
    this.freeze('cutscene');
    const camera = this.cameras.main;
    camera.stopFollow();
    camera.removeBounds();
    this.root.querySelector('.link-panel')?.remove();
    if (!reducedMotion()) { camera.pan(1105, 360, 1200, 'Sine.easeInOut'); camera.zoomTo(.56, 1200, 'Sine.easeInOut'); }
    this.time.delayedCall(1300, () => {
      sound.play('victory');
      void this.banner('EVERYTHING IS CONNECTED', 'Our choices reach species we may never see', 2600, 'is-win').then(() => {
        this.root.querySelector('.link-panel')?.remove();
        camera.setZoom(1); camera.setBounds(0, 0, this.world.width, this.world.height); camera.startFollow(this.frog.collider, true, .08, .08, 0, 40);
        this.unfreeze();
        this.unlockCards(['sixDegrees'], () => this.complete('TRAIL COMPLETE'));
      });
    });
  }
}

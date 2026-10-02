import Phaser from 'phaser';
import { ChapterScene, type WorldInfo } from './ChapterScene';
import { buildLevel, PALETTES, scatter, SCALE, type Prop } from '../world/Terrain';
import { sound } from '../systems/Sound';
import { run } from '../systems/run';
import { AmbientFrogs } from '../entities/Critters';

/** Chapter 1: wake up in a healthy rainforest and discover who, what and where you are. */
export class MeetScene extends ChapterScene {
  protected readonly chapterNumber = 1;
  protected readonly music = 'forest' as const;
  private found = new Set<string>();
  private flies: { sprite: Phaser.GameObjects.Image; x: number; y: number; alive: boolean }[] = [];
  private ambient?: AmbientFrogs;
  private spots = {
    sign: { x: 520, y: 430, label: 'Read the field sign' },
    pond: { x: 1050, y: 345, label: 'Look at your reflection' },
    lookout: { x: 1330, y: 770, label: 'Look out over the island' },
  };

  constructor() { super('MeetScene'); }

  protected buildWorld(): WorldInfo {
    this.found = new Set(); this.flies = [];
    run.setPopulation(100);
    const spec = {
      key: 'terrain-meet', width: 400, height: 260, palette: PALETTES.day,
      paths: [[[75, 140], [110, 122], [130, 108]], [[110, 122], [170, 100], [230, 88], [262, 82]], [[110, 122], [150, 160], [220, 188], [300, 196], [332, 192]]] as [number, number][][],
      clearings: [[75, 140, 26, 20], [130, 110, 16, 9], [334, 192, 14, 10]] as [number, number, number, number][],
      ponds: [[292, 58, 34, 19]] as [number, number, number, number][],
      sea: { edge: 'right' as const, at: 362 },
    };
    const keepOut: [number, number, number][] = [[300, 560, 160], [520, 430, 120], [1160, 240, 200], [1050, 345, 90], [1330, 770, 120], [440, 480, 70], [700, 400, 70], [900, 350, 70], [600, 640, 80], [880, 760, 80], [1200, 790, 80]];
    const props: Prop[] = [
      ...scatter(['tree', 'tree', 'bush'], 26, [60, 80, 1380, 1000], keepOut, 3, [38, 26], spec.paths),
      ...scatter(['fern', 'flower', 'fern'], 26, [60, 120, 1400, 1000], keepOut.map(([x, y, r]) => [x, y, r * .6] as [number, number, number]), 17, undefined, spec.paths, 50),
      { key: 'board', x: this.spots.sign.x, y: this.spots.sign.y - 30, solid: [85, 24] },
      { key: 'board', x: 1360, y: 735, solid: [85, 24] },
      { key: 'palm', x: 1405, y: 560, solid: [30, 20] }, { key: 'palm', x: 1420, y: 980, solid: [30, 20] }, { key: 'palm', x: 1390, y: 300, solid: [30, 20] },
      { key: 'rock', x: 980, y: 330, solid: [42, 22] }, { key: 'rock', x: 1290, y: 380, solid: [42, 22] }, { key: 'log', x: 760, y: 560, solid: [140, 26] },
      { key: 'rock', x: 230, y: 700, solid: [42, 22] }, { key: 'log', x: 420, y: 880, solid: [140, 26] },
    ];
    this.blocks = buildLevel(this, spec, props);
    // Water: the pond and the sea are not walkable.
    const wall = (x: number, y: number, w: number, h: number) => this.blocks.add(this.add.zone(x, y, w, h));
    wall(1168, 232, 250, 130); wall(1168 + 6, 232, 290, 70);
    wall(1500 + 50, 520, 120, 1040);
    for (let i = 0; i < 10; i++) {
      const x = 640 + (i % 5) * 150 + (i * 37) % 60, y = 470 + Math.floor(i / 5) * 290 + (i * 53) % 70;
      const sprite = this.add.image(x, y, 'goldfly').setScale(SCALE).setDepth(y + 40);
      this.flies.push({ sprite, x, y, alive: true });
    }
    this.ambient = new AmbientFrogs(this, [[700, 600], [900, 800], [430, 330], [1150, 560], [260, 860], [820, 230]], 1);
    for (const [key, spot] of Object.entries(this.spots)) {
      this.interactables.push({ x: spot.x, y: spot.y, radius: 105, label: spot.label, action: () => this.discover(key) });
    }
    // Drifting butterflies and leaves.
    for (let i = 0; i < 8; i++) {
      const butterfly = this.add.image(300 + i * 150, 250 + (i % 3) * 230, 'flower').setScale(1.6).setDepth(3000).setTint(i % 2 ? 0xffe4a4 : 0xf7c3c1);
      this.tweens.add({ targets: butterfly, x: butterfly.x + 60, y: butterfly.y - 30, scaleX: .8, duration: 1700 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.particles(0, 0, 'leaf', { x: { min: 0, max: 1600 }, y: -10, lifespan: 9000, speedY: { min: 40, max: 70 }, speedX: { min: -20, max: 30 }, rotate: { min: 0, max: 360 }, scale: 3, frequency: 700, alpha: { start: .9, end: .3 } }).setDepth(3500);
    return { width: 1600, height: 1040, spawn: { x: 300, y: 570 }, bounds: [40, 70, 1480, 940] };
  }

  protected objective() {
    const order = ['sign', 'pond', 'lookout'] as const;
    const next = order.find(key => !this.found.has(key));
    if (!next) return { step: 'Rainforest', text: 'All discoveries made!', target: null };
    const names = { sign: 'Read the field sign', pond: 'Find the pond', lookout: 'Reach the sea lookout' };
    return { step: `Discoveries ${this.found.size}/3`, text: names[next], target: this.spots[next] };
  }

  protected onStart(): void {
    this.toast('Tip', 'Walk with the arrow keys. Press SPACE near the glowing marker.', 'tip', 6000);
  }

  private discover(key: string): void {
    const first = !this.found.has(key);
    this.found.add(key);
    const cards = key === 'sign' ? ['name', 'status'] as const : key === 'pond' ? ['physical', 'picture'] as const : ['habitat'] as const;
    this.unlockCards([...cards], () => {
      if (first) sound.play('unlock');
      this.refreshObjective(true);
      if (this.found.size === 3) this.time.delayedCall(500, () => this.complete());
    });
  }

  protected onAction(): void {
    sound.play('whoop');
    const text = this.add.text(this.frog.x, this.frog.y - 70, 'WHOOP!', { fontFamily: 'PressStart', fontSize: '18px', color: '#fff4b8', stroke: '#4a3a2a', strokeThickness: 5 }).setOrigin(.5).setDepth(5000);
    this.tweens.add({ targets: text, y: text.y - 40, alpha: 0, duration: 900, onComplete: () => text.destroy() });
  }

  protected tick(_time: number, delta: number): void {
    this.ambient?.update(delta);
    for (const [i, fly] of this.flies.entries()) {
      if (!fly.alive) continue;
      const t = this.elapsed / 600 + i;
      fly.sprite.setPosition(fly.x + Math.sin(t) * 26, fly.y + Math.cos(t * 1.3) * 18 - 30).setTexture(Math.floor(this.elapsed / 90 + i) % 2 ? 'goldfly-1' : 'goldfly');
      if (Phaser.Math.Distance.Between(this.frog.x, this.frog.y - 20, fly.sprite.x, fly.sprite.y) < 52) {
        fly.alive = false;
        sound.play('gulp');
        this.tweens.add({ targets: fly.sprite, x: this.frog.x, y: this.frog.y - 10, scale: 0, duration: 140, onComplete: () => fly.sprite.destroy() });
        const pop = this.add.text(this.frog.x, this.frog.y - 70, 'Yum!', { fontFamily: 'Pixelify', fontSize: '26px', color: '#fff2b3', stroke: '#5b683d', strokeThickness: 4 }).setOrigin(.5).setDepth(5000);
        this.tweens.add({ targets: pop, y: pop.y - 36, alpha: 0, duration: 800, onComplete: () => pop.destroy() });
      }
    }
  }
}

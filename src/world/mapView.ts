import Phaser from 'phaser';
import { ensureArt } from './Art';
import { paintTerrain, PALETTES, SCALE } from './Terrain';
import { CAVE, DECOR, GLOWS, LAKE, MAP, PATHS, POND, POOLS, STREAM, VOLCANO, forestDepth, inHideout, type Point } from './map';

const DAY = Phaser.Display.Color.ValueToColor(0xffffff);
const NIGHT = Phaser.Display.Color.ValueToColor(0x56668a);
const CELL = 160;

interface Tall { image: Phaser.GameObjects.Image; left: number; right: number; top: number; base: number; faded: boolean }

/**
 * Draws the shared map (src/world/map.ts) into a scene: the painted ground, the forest, the lake,
 * the springs and the hidden cave. Used by the projector's overview and by every player's screen.
 * Trees and huts go see-through when a frog is behind them, so nobody gets lost behind a canopy.
 */
export class MapView {
  private decor: Phaser.GameObjects.Image[] = [];
  private shades: number[] = [];
  private tall: Tall[] = [];
  private grid = new Map<number, Tall[]>();
  private darkness: Phaser.GameObjects.Rectangle;
  private level = 0;

  constructor(private readonly scene: Phaser.Scene) {
    ensureArt(scene);
    if (!scene.textures.exists('map-ground')) scene.textures.addCanvas('map-ground', paintGround());
    scene.add.image(0, 0, 'map-ground').setOrigin(0).setScale(SCALE).setDepth(-100);
    this.darkness = scene.add.rectangle(MAP.width / 2, MAP.height / 2, MAP.width, MAP.height, 0x061226, 0).setDepth(-50);

    for (const item of DECOR) {
      const image = scene.add.image(item.x, item.y, item.key).setOrigin(.5, .9).setScale(item.scale).setDepth(item.depth ?? item.y).setFlipX(!!item.flip);
      this.decor.push(image);
      this.shades.push(item.shade ?? 0);
      if (item.tall) this.addTall(image);
    }
    this.setDarkness(0, false);

    // Life: sparkles on the water, steam off the warm springs and the volcano.
    for (let i = 0; i < 14; i++) {
      const water = i < 11 ? LAKE : POND;
      const angle = Math.random() * Math.PI * 2, d = Math.random() * .8;
      const sparkle = scene.add.image(water.x + Math.cos(angle) * water.rx * d, water.y + Math.sin(angle) * water.ry * d, 'sparkle').setScale(3).setDepth(-35).setAlpha(0);
      scene.tweens.add({ targets: sparkle, alpha: .9, duration: 500, yoyo: true, repeat: -1, repeatDelay: 1200 + Math.random() * 2600, delay: Math.random() * 3000 });
    }
    for (const pool of POOLS) {
      this.decor.push(scene.add.image(pool.x, pool.y + 50, 'pool').setOrigin(.5, .9).setScale(4).setDepth(-20));
      this.shades.push(0);
      scene.add.particles(pool.x, pool.y - 6, 'steam', { lifespan: 2200, speedY: { min: -30, max: -14 }, scale: { start: 2.4, end: 5 }, alpha: { start: .35, end: 0 }, frequency: 420, x: { min: -60, max: 60 } }).setDepth(3000);
    }
    scene.add.particles(VOLCANO.x, VOLCANO.y - 156, 'steam', { lifespan: 4200, speedY: { min: -26, max: -12 }, speedX: { min: 4, max: 14 }, scale: { start: 3, end: 9 }, alpha: { start: .4, end: 0 }, frequency: 500, tint: 0xb8b0a8 }).setDepth(VOLCANO.y - 39);

    // The cave: a faint glow from its mushrooms and crystals, fireflies, and eyes that blink now and then.
    for (const glow of GLOWS) scene.add.image(glow.x, glow.y, 'glow').setScale(2.6).setTint(0x3ad0c0).setAlpha(.32).setBlendMode(Phaser.BlendModes.ADD).setDepth(4300);
    const crystals = scene.add.image(CAVE.x, CAVE.y - 6, 'glow').setScale(3.4).setTint(0x8a6aff).setAlpha(.2).setBlendMode(Phaser.BlendModes.ADD).setDepth(CAVE.y + 19);
    scene.tweens.add({ targets: crystals, alpha: .38, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const eyes = scene.add.image(CAVE.x, CAVE.y - 10, 'cave-eyes').setScale(4).setDepth(CAVE.y + 19).setAlpha(0);
    scene.tweens.add({ targets: eyes, alpha: 1, duration: 500, hold: 900, yoyo: true, repeat: -1, repeatDelay: 7000, delay: 4000 });
    scene.add.particles(0, 0, 'firefly', { x: { min: CAVE.x - 150, max: CAVE.x + 60 }, y: { min: CAVE.y - 120, max: CAVE.y + 80 }, lifespan: 3000, speed: { min: 3, max: 12 }, scale: { start: 2.2, end: 0 }, alpha: { start: .9, end: 0 }, frequency: 700, blendMode: 'ADD' }).setDepth(4300);
  }

  /** 0 = daytime, 1 = full night. Only the ground and scenery darken, so frogs stay easy to see. */
  setDarkness(level: number, animate = true): void {
    this.level = level;
    if (animate) this.scene.tweens.add({ targets: this.darkness, fillAlpha: .06 + level * .5, duration: 1200 });
    else this.darkness.setFillStyle(0x061226, .06 + level * .5);
    this.decor.forEach((image, i) => {
      const amount = Math.min(1, level + this.shades[i] * .3);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(DAY, NIGHT, 100, Math.round(amount * 100));
      image.setTint(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
    });
  }

  get night(): number { return this.level; }

  /** Phones: only draw the scenery near the screen (call a few times a second). */
  cull(view: Phaser.Geom.Rectangle, margin = 260): void {
    const left = view.x - margin, right = view.right + margin, top = view.y - margin, bottom = view.bottom + margin * 1.6;
    for (const image of this.decor) image.setVisible(image.x > left && image.x < right && image.y > top && image.y < bottom);
  }

  /** Fades the trees in front of these frogs (call a few times a second). */
  reveal(frogs: Iterable<Point>): void {
    const hit = new Set<Tall>();
    for (const frog of frogs) {
      for (const item of this.grid.get(cellKey(frog.x, frog.y)) ?? []) {
        if (frog.x > item.left && frog.x < item.right && frog.y > item.top && frog.y < item.base) hit.add(item);
      }
    }
    for (const item of this.tall) {
      const faded = hit.has(item);
      if (faded === item.faded) continue;
      item.faded = faded;
      this.scene.tweens.add({ targets: item.image, alpha: faded ? .42 : 1, duration: 220 });
    }
  }

  /** A frog between the top of this picture and its base is behind it. */
  private addTall(image: Phaser.GameObjects.Image): void {
    const width = image.displayWidth * .46, height = image.displayHeight;
    const item: Tall = { image, left: image.x - width, right: image.x + width, top: image.y - height * .9, base: image.y - 6, faded: false };
    this.tall.push(item);
    for (let x = Math.floor(item.left / CELL); x <= Math.floor(item.right / CELL); x++) {
      for (let y = Math.floor(item.top / CELL); y <= Math.floor(item.base / CELL); y++) {
        const key = x * 1000 + y;
        const list = this.grid.get(key) ?? [];
        list.push(item);
        this.grid.set(key, list);
      }
    }
  }
}

const cellKey = (x: number, y: number): number => Math.floor(x / CELL) * 1000 + Math.floor(y / CELL);

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The ground: grass in the open, dark leaf litter under the forest, moss around the cave. */
function paintGround(): HTMLCanvasElement {
  const litter = ['#4a6a3a', '#3f5e33', '#55744a', '#5a5232', '#36502e'].map(rgb);
  const deep = ['#33482b', '#2c4026', '#3a4f2e', '#463f28'].map(rgb);
  const moss = ['#3f6a46', '#4a7a50', '#35603e', '#5a8a5a'].map(rgb);
  const edge = ['#7a9a52', '#6c8c4a'].map(rgb);
  const k = 1 / SCALE;
  return paintTerrain({
    key: 'map-ground', width: MAP.width * k, height: MAP.height * k, palette: PALETTES.day, pathWidth: 4,
    paths: PATHS.map(path => path.map(([x, y]) => [x * k, y * k] as [number, number])),
    rivers: [{ points: STREAM.points.map(([x, y]) => [x * k, y * k] as [number, number]), width: STREAM.width * k }],
    ponds: [LAKE, POND].map(water => [water.x * k, water.y * k, water.rx * k, water.ry * k] as [number, number, number, number]),
    floor: (x, y, n) => {
      const wx = x * SCALE + 2, wy = y * SCALE + 2;
      if (inHideout(wx, wy, -6)) return moss[n % moss.length];
      const depth = forestDepth(wx, wy);
      if (depth < -10) return null;
      if (depth < 14) return edge[n % 2];
      return depth > 160 && n < 70 ? deep[n % deep.length] : litter[n % litter.length];
    },
  });
}

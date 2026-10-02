import Phaser from 'phaser';
import { ensureArt } from './Art';
import { hash } from './pixels';

/** Every terrain pixel becomes a 4×4 block in the world. */
export const SCALE = 4;
type Point = [number, number];

export interface Palette {
  grass: string[];
  path: string[];
  verge: string[];
  water: string[];
  bank: string[];
  shine: string;
}

export const PALETTES: Record<string, Palette> = {
  day: { grass: ['#8fa85d', '#a6bb70', '#9ab465', '#799751', '#bad084'], path: ['#dec38b', '#f0d7a0', '#c1a46b'], verge: ['#c2bd77', '#96ac60'], water: ['#5b7eab', '#7fa5c7', '#466993'], bank: ['#947b57', '#6a573e', '#b89b6c'], shine: '#8eb1d1' },
  dusk: { grass: ['#6f7a4a', '#7f8a52', '#76844c', '#5f6a40', '#8e985c'], path: ['#b49a72', '#c6ab80', '#9a8260'], verge: ['#968f5e', '#76804a'], water: ['#4a5a82', '#6a7aa0', '#3a4a6e'], bank: ['#7a6448', '#574634', '#957d58'], shine: '#8a9ac0' },
  night: { grass: ['#2d4a3c', '#355444', '#30503f', '#264034', '#3d5c4a'], path: ['#5a5a4c', '#6a6a58', '#4c4c40'], verge: ['#4a5a44', '#3a4c3c'], water: ['#1f3a5a', '#2f4f72', '#18304c'], bank: ['#4a4034', '#3a3228', '#5a4e3e'], shine: '#5a7aa0' },
  rescue: { grass: ['#94b062', '#a9c274', '#9fbc69', '#7f9d55', '#bdd488'], path: ['#d8c49a', '#ead6ac', '#bea67a'], verge: ['#c4c07c', '#98b064'], water: ['#4a9ac0', '#7ac0e0', '#3a7aa0'], bank: ['#968060', '#6c5a44', '#baa070'], shine: '#a8e0f0' },
  twilight: { grass: ['#3a3f6a', '#454a78', '#3f4470', '#32365e', '#50568a'], path: ['#7a6a9a', '#8a7aaa', '#6a5a88'], verge: ['#5a5a8a', '#4a4c7a'], water: ['#24305a', '#34427a', '#1c264a'], bank: ['#4a4068', '#3a3254', '#5a4e7a'], shine: '#8a9ae0' },
};

export interface TerrainSpec {
  key: string;
  width: number;
  height: number;
  palette: Palette;
  paths: Point[][];
  pathWidth?: number;
  clearings?: [number, number, number, number][];
  rivers?: { points: Point[]; width: number }[];
  ponds?: [number, number, number, number][];
  sea?: { edge: 'bottom' | 'right'; at: number };
  ash?: [number, number];
  cleared?: [number, number, number, number][];
  /** Replaces the grass colour of a pixel (for example, the forest floor), or returns null to keep it. */
  floor?: (x: number, y: number, n: number) => [number, number, number] | null;
}

function distanceToSegment(x: number, y: number, a: Point, b: Point): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
function distanceToPolyline(x: number, y: number, points: Point[]): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) best = Math.min(best, distanceToSegment(x, y, points[i - 1], points[i]));
  return best;
}
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Paints a whole level floor into one canvas with direct pixel writes (fast on Chromebooks). */
export function paintTerrain(spec: TerrainSpec): HTMLCanvasElement {
  const { width, height, palette } = spec;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(width, height);
  const p = {
    grass: palette.grass.map(rgb), path: palette.path.map(rgb), verge: palette.verge.map(rgb), water: palette.water.map(rgb), bank: palette.bank.map(rgb), shine: rgb(palette.shine),
  };
  const ash = rgb('#6a6560'), ashLight = rgb('#8a847c'), soil = rgb('#7a6448'), soilDark = rgb('#5e4c36'), sand = rgb('#e2cf9a'), foam = rgb('#dff0f0');
  const pathWidth = spec.pathWidth ?? 12;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = hash(x, y);
      let color = spec.floor?.(x, y, n) ?? p.grass[n % p.grass.length];
      let road = Infinity;
      for (const path of spec.paths) road = Math.min(road, distanceToPolyline(x, y, path));
      const clear = spec.clearings?.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1);
      if (road < pathWidth || clear) color = n > 94 ? p.path[1] : n < 7 ? p.path[2] : p.path[0];
      else if (road < pathWidth + 3) color = p.verge[n < 30 ? 0 : 1];
      if (spec.cleared?.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1)) color = n < 40 ? soilDark : soil;
      if (spec.ash && x > spec.ash[0] && x < spec.ash[1]) {
        const edge = Math.min(x - spec.ash[0], spec.ash[1] - x);
        if (edge > 6 || n < edge * 14) color = n < 30 ? ashLight : ash;
      }
      for (const river of spec.rivers || []) {
        const d = distanceToPolyline(x, y, river.points);
        if (d < river.width) color = n > 89 ? p.water[1] : n < 10 ? p.water[2] : p.water[0];
        else if (d < river.width + 8) color = (x + Math.floor(y / 5)) % 5 === 0 ? p.bank[2] : n < 22 ? p.bank[1] : p.bank[0];
        else if (d < river.width + 10) color = p.verge[n < 40 ? 1 : 0];
      }
      for (const [cx, cy, rx, ry] of spec.ponds || []) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d < 1) color = n > 90 ? p.water[1] : n < 8 ? p.water[2] : p.water[0];
        else if (d < 1.25) color = n < 30 ? p.bank[1] : p.bank[0];
      }
      if (spec.sea) {
        const wave = Math.round(Math.sin((spec.sea.edge === 'bottom' ? x : y) / 9) * 3);
        const depth = spec.sea.edge === 'bottom' ? y - spec.sea.at - wave : x - spec.sea.at - wave;
        if (depth > 6) color = n > 88 ? p.water[1] : depth > 30 ? p.water[2] : p.water[0];
        else if (depth > 3) color = foam;
        else if (depth > -10) color = n < 20 ? p.path[2] : sand;
      }
      const i = (y * width + x) * 4;
      image.data[i] = color[0]; image.data[i + 1] = color[1]; image.data[i + 2] = color[2]; image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  // Ripples on water.
  ctx.fillStyle = palette.shine;
  for (const river of spec.rivers || []) {
    for (let i = 1; i < river.points.length; i++) {
      const [ax, ay] = river.points[i - 1], [bx, by] = river.points[i];
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 6);
      for (let s = 0; s < steps; s++) if (hash(s, i) < 45) ctx.fillRect(Math.round(ax + (bx - ax) * s / steps + (hash(i, s) % 9) - 4), Math.round(ay + (by - ay) * s / steps), 4, 1);
    }
  }
  return canvas;
}

export interface Prop { key: string; x: number; y: number; solid?: [number, number]; tint?: number; scale?: number; flip?: boolean }

/** Places the painted floor plus decorations, returning invisible collision blocks. */
export function buildLevel(scene: Phaser.Scene, spec: TerrainSpec, props: Prop[], collisions = true): Phaser.Physics.Arcade.StaticGroup {
  ensureArt(scene);
  if (!scene.textures.exists(spec.key)) scene.textures.addCanvas(spec.key, paintTerrain(spec));
  scene.add.image(0, 0, spec.key).setOrigin(0).setScale(SCALE).setDepth(-100);
  const blocks = scene.physics.add.staticGroup();
  for (const prop of props) {
    const image = scene.add.image(prop.x, prop.y, prop.key).setOrigin(.5, .9).setScale(prop.scale ?? SCALE).setDepth(prop.y);
    if (prop.tint) image.setTint(prop.tint);
    if (prop.flip) image.setFlipX(true);
    if (collisions && prop.solid) {
      const zone = scene.add.zone(prop.x, prop.y - prop.solid[1] / 2, prop.solid[0], prop.solid[1]);
      blocks.add(zone);
    }
  }
  return blocks;
}

/** A solid invisible wall, e.g. along water. */
export function wall(scene: Phaser.Scene, blocks: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, w: number, h: number): void {
  blocks.add(scene.add.zone(x, y, w, h));
}

/** Simple deterministic scatter of decorations, avoiding listed keep-out circles. */
export function scatter(keys: string[], count: number, area: [number, number, number, number], avoid: [number, number, number][], seed: number, solid?: [number, number], paths: Point[][] = [], clearance = 90): Prop[] {
  const props: Prop[] = [];
  let i = 0, tries = 0;
  while (props.length < count && tries++ < count * 30) {
    const x = area[0] + (hash(seed + i * 7, i * 13 + seed) / 100) * (area[2] - area[0]) + (hash(i, seed) % 20);
    const y = area[1] + (hash(i * 11 + seed, seed * 5 + i) / 100) * (area[3] - area[1]) + (hash(seed, i * 3) % 20);
    i++;
    if (avoid.some(([ax, ay, r]) => Math.hypot(x - ax, y - ay) < r)) continue;
    if (paths.some(path => distanceToPolyline(x / SCALE, y / SCALE, path) * SCALE < clearance)) continue;
    if (props.some(prop => Math.hypot(prop.x - x, prop.y - y) < 60)) continue;
    props.push({ key: keys[i % keys.length], x: Math.round(x), y: Math.round(y), solid });
  }
  return props;
}

/**
 * The pond clearing. The intro uses the screen-sized one (1280×720); the game uses a bigger one
 * (1707×960) that the camera shows zoomed out, so about 30 frogs fit.
 */
export function pondTerrain(scene: Phaser.Scene, big = false): Phaser.GameObjects.Image {
  const key = big ? 'pond-big' : 'pond-day';
  const k = big ? 4 / 3 : 1;
  const point = ([x, y]: Point): Point => [Math.round(x * k), Math.round(y * k)];
  if (!scene.textures.exists(key)) {
    scene.textures.addCanvas(key, paintTerrain({
      key, width: Math.round(320 * k), height: Math.round(180 * k), palette: PALETTES.day, pathWidth: 6,
      paths: [[[0, 118], [50, 110], [110, 120], [170, 108], [230, 118], [320, 110]], [[160, 40], [150, 80], [170, 108], [158, 150], [166, 180]]].map(path => (path as Point[]).map(point)),
      clearings: [[160 * k, 105 * k, 92 * k * (big ? 1.25 : 1), 46 * k * (big ? 1.25 : 1)]],
      ponds: [[300 * k, 36 * k, 22, 9]],
    }));
  }
  return scene.add.image(0, 0, key).setOrigin(0).setScale(SCALE).setDepth(-100);
}

/** Trees around the edge of the pond clearing. */
export function pondDecor(scene: Phaser.Scene, big = false): Phaser.GameObjects.Image[] {
  const k = big ? 4 / 3 : 1;
  const width = 1280 * k, height = 720 * k;
  const decor: Phaser.GameObjects.Image[] = [];
  const place = (key: string, x: number, y: number, scale = 4) => { decor.push(scene.add.image(x, y, key).setOrigin(.5, .9).setScale(scale).setDepth(y)); };
  for (let x = -20; x < width + 40; x += 105) place(x % 2 ? 'tree' : 'palm', x + (x * 7) % 30, 150 + (x % 3) * 8);
  for (let x = 10; x < width + 40; x += 120) place(x % 3 ? 'tree' : 'bush', x, height + 165);
  for (let y = 260; y < height - 20; y += 125) { place('tree', 14, y); place('tree', width - 12, y + 40); }
  const flowers: [number, number][] = big ? [[330, 330], [1370, 800], [500, 860], [1200, 320], [750, 290], [960, 880], [260, 600], [1450, 560]] : [[250, 250], [1030, 600], [380, 650], [900, 240], [560, 210], [720, 660]];
  for (const [x, y] of flowers) place(x % 2 ? 'flower' : 'fern', x, y);
  return decor;
}

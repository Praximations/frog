import { WORLD_SIZE } from '../../server/shared.mjs';

/**
 * The map: a patch of Dominican rainforest around a lake, 2560 × 1440 world pixels. The projector
 * shows all of it; each phone shows the part around its own frog. Plain data and maths (no Phaser),
 * the same on every device, so the projector and the phones agree on where frogs can hop.
 *
 * Open forest floor in the middle, thick forest all around. A lake with a stream running north
 * (one plank bridge, one set of stepping stones), a small pond, tree groves and boulders to hop
 * around, warm springs by the research station, and a volcano peeking over the trees. Tucked away
 * in the south-east corner, down a narrow trail through the trees, is a cave.
 */
export interface Point { x: number; y: number }
interface Ellipse { x: number; y: number; rx: number; ry: number }
type Line = [number, number][];

export const MAP = { width: WORLD_SIZE.width, height: WORLD_SIZE.height };
/** How far a frog's middle stays from walls and water. */
export const FROG_RADIUS = 14;

/** The open forest floor: a rounded rectangle with a wavy edge. */
const AREA = { left: 170, top: 210, right: 2390, bottom: 1290, radius: 250 };

export const LAKE: Ellipse = { x: 1150, y: 770, rx: 300, ry: 160 };
export const POND: Ellipse = { x: 2060, y: 430, rx: 112, ry: 58 };
export const STREAM = { points: [[1196, 640], [1236, 520], [1196, 400], [1252, 290], [1222, 170], [1244, 40], [1236, -60]] as Line, width: 24 };
/** Where frogs can cross the stream. */
export const CROSSINGS = [
  { kind: 'bridge', x: 1196, y: 400, w: 160, h: 44 },
  { kind: 'stones', x: 1246, y: 268, w: 132, h: 34 },
] as const;

/** Sun-warmed springs (31 °C): too warm for the chytrid fungus, so sick frogs get better there. */
export const POOLS: Point[] = [{ x: 560, y: 1120 }, { x: 1760, y: 330 }, { x: 1960, y: 1060 }];
export const STATION = { x: 380, y: 1060 };
export const VOLCANO = { x: 600, y: 214 };

/** Dirt paths (decoration). The south path fades out just before the cave trail. */
export const PATHS: Line[] = [
  [[300, 1130], [470, 1090], [700, 1010], [900, 985], [1150, 995], [1450, 1000], [1750, 1010], [2000, 985], [2160, 1030]],
  [[260, 420], [600, 385], [900, 405], [1196, 400], [1500, 420], [1800, 455], [1950, 440]],
  [[700, 1010], [760, 800], [820, 600], [900, 405]],
  [[1750, 1010], [1700, 800], [1650, 600], [1600, 436]],
];

/** Thickets: tree clusters you have to hop around. */
export const GROVES: Ellipse[] = [
  { x: 520, y: 600, rx: 120, ry: 66 }, { x: 1680, y: 1170, rx: 112, ry: 56 }, { x: 1940, y: 720, rx: 92, ry: 54 }, { x: 900, y: 1170, rx: 86, ry: 48 },
];
export const TREES: [number, number][] = [
  [330, 760], [430, 900], [960, 290], [1500, 280], [1580, 640], [2220, 600], [2290, 300], [2280, 860],
  [1450, 1190], [1150, 1230], [320, 300], [640, 1240], [1980, 1240], [1380, 560], [2100, 1160],
];
export const ROCKS: [number, number, boolean][] = [
  [760, 700, true], [1500, 560, true], [1630, 900, true], [2160, 1240, false], [400, 520, false], [1010, 1080, true],
  [2020, 880, true], [1360, 330, false], [2290, 460, true], [290, 960, false], [1290, 1080, false], [620, 820, false],
];
const HUT = { x: STATION.x, y: STATION.y, r: 62 };

/** The cave (its mouth), the clearing in front of it and the trail that leads there. */
export const CAVE = { x: 2470, y: 1294, radius: 38 };
export const CAVE_EXIT: Point = { x: 2400, y: 1344 };
const HIDEOUT: Ellipse = { x: 2440, y: 1330, rx: 90, ry: 58 };
export const CAVE_TRAIL: Line = [[2230, 1110], [2290, 1180], [2335, 1245], [2400, 1310]];
const TRAIL_WIDTH = 40;

/** A spot that's always open, south of the lake. */
export const SPAWN: Point = { x: 1150, y: 1080 };

// ---------------------------------------------------------------- geometry

export function distanceToLine(x: number, y: number, points: Line): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

const inEllipse = (e: Ellipse, x: number, y: number, margin = 0): boolean => ((x - e.x) / (e.rx + margin)) ** 2 + ((y - e.y) / (e.ry + margin)) ** 2 < 1;

/** Signed distance to the open area's rounded rectangle (negative inside). */
function areaDistance(x: number, y: number): number {
  const cx = (AREA.left + AREA.right) / 2, cy = (AREA.top + AREA.bottom) / 2;
  const qx = Math.abs(x - cx) - ((AREA.right - AREA.left) / 2 - AREA.radius);
  const qy = Math.abs(y - cy) - ((AREA.bottom - AREA.top) / 2 - AREA.radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - AREA.radius;
}

/** The forest edge wobbles in and out a little. */
const wobble = (x: number, y: number): number => 16 * Math.sin(x * .011 + 1.3) + 12 * Math.sin(y * .019 + .4) + 8 * Math.sin((x + y) * .031);

/** How deep into the forest a point is (negative = out in the open). */
export const forestDepth = (x: number, y: number): number => areaDistance(x, y) - wobble(x, y);

/** The cave clearing and its trail. */
export const inHideout = (x: number, y: number, margin = 0): boolean => inEllipse(HIDEOUT, x, y, -margin) || distanceToLine(x, y, CAVE_TRAIL) < TRAIL_WIDTH - margin;

const onCrossing = (x: number, y: number): boolean => CROSSINGS.some(c => Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2);

/** Water: the lake, the pond and the stream (except where you can cross it). */
export function inWater(x: number, y: number, margin = 0): boolean {
  if (inEllipse(LAKE, x, y, margin) || inEllipse(POND, x, y, margin)) return true;
  return distanceToLine(x, y, STREAM.points) < STREAM.width + margin && !onCrossing(x, y);
}

/** Trunks, boulders, thickets and the research hut. */
export function inSolid(x: number, y: number, margin = 0): boolean {
  for (const [tx, ty] of TREES) if (Math.hypot(x - tx, y - ty) < 20 + margin) return true;
  for (const [rx, ry, big] of ROCKS) if (Math.hypot(x - rx, (y - ry) * 1.3) < (big ? 34 : 18) + margin) return true;
  for (const grove of GROVES) if (inEllipse(grove, x, y, margin)) return true;
  return Math.hypot(x - HUT.x, y - HUT.y) < HUT.r + margin;
}

/** Can a frog stand here? */
export function walkable(x: number, y: number, margin = FROG_RADIUS): boolean {
  if (x < margin || y < margin || x > MAP.width - margin || y > MAP.height - margin) return false;
  if (forestDepth(x, y) + margin > 0 && !inHideout(x, y, margin)) return false;
  return !inWater(x, y, margin * .5) && !inSolid(x, y, margin);
}

/** Moves a frog, sliding along walls and shores instead of stopping dead. */
export function step(x: number, y: number, dx: number, dy: number, margin = FROG_RADIUS): Point {
  if (!dx && !dy) return { x, y };
  if (walkable(x + dx, y + dy, margin)) return { x: x + dx, y: y + dy };
  if (dx && walkable(x + dx, y, margin)) return { x: x + dx, y };
  if (dy && walkable(x, y + dy, margin)) return { x, y: y + dy };
  return { x, y };
}

/** Whether the straight line from a to b passes the test everywhere (checked every 16 px). */
export function clearLine(a: Point, b: Point, test: (x: number, y: number) => boolean = walkable): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 16);
  for (let i = 1; i <= steps; i++) if (!test(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false;
  return true;
}

/** A random open spot out in the forest (never in the cave clearing), away from the given places. */
export function randomSpot(avoid: (Point & { r: number })[] = [], random = Math.random, margin = 30): Point {
  for (let tries = 0; tries < 80; tries++) {
    const spot = { x: Math.round(AREA.left + random() * (AREA.right - AREA.left)), y: Math.round(AREA.top + random() * (AREA.bottom - AREA.top)) };
    if (!walkable(spot.x, spot.y, margin) || inHideout(spot.x, spot.y, -60)) continue;
    if (avoid.every(item => Math.hypot(spot.x - item.x, spot.y - item.y) > item.r)) return spot;
  }
  return { ...SPAWN };
}

// ---------------------------------------------------------------- scenery

export interface Decor {
  key: string;
  x: number;
  y: number;
  scale: number;
  flip?: boolean;
  /** Drawn at this depth instead of its y. */
  depth?: number;
  /** Big enough to hide a frog behind it: it turns see-through when one is there. */
  tall?: boolean;
  /** Darker, deeper in the forest. */
  shade?: number;
}

/** A small seeded random generator, so every device builds the same forest. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDecor(): Decor[] {
  const random = seeded(1729);
  const decor: Decor[] = [];
  const caveArt = { left: 2320, right: 2600, top: 1080, bottom: 1300 };
  const volcanoArt = { left: VOLCANO.x - 170, right: VOLCANO.x + 170, top: 0, bottom: VOLCANO.y + 10 };
  const within = (box: { left: number; right: number; top: number; bottom: number }, x: number, y: number) => x > box.left && x < box.right && y > box.top && y < box.bottom;

  // The forest all around.
  for (let row = 0, gy = -30; gy < MAP.height + 230; gy += 74, row++) {
    for (let gx = -50 + (row % 2) * 44; gx < MAP.width + 60; gx += 88) {
      const x = Math.round(gx + (random() - .5) * 50), y = Math.round(gy + (random() - .5) * 40);
      const depth = forestDepth(x, y);
      const roll = random();
      if (depth < 26 || inHideout(x, y, -70) || within(caveArt, x, y) || within(volcanoArt, x, y)) continue;
      // Tall trees only where their crowns stay over the forest, so they don't hide the open ground.
      const crownOverForest = forestDepth(x, y - 170) > 0 && forestDepth(x, y - 90) > 0;
      const key = !crownOverForest || (depth < 90 && roll < .3) ? 'bush' : roll < .62 ? 'tree' : roll < .8 ? 'palm' : 'tree';
      decor.push({ key, x, y, scale: key === 'bush' ? 4 : 3.6 + random() * .8, flip: random() < .5, tall: key !== 'bush', shade: Math.min(1, depth / 400) });
    }
  }
  // Thickets.
  for (const grove of GROVES) {
    const count = Math.round(grove.rx / 22);
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 + random();
      const d = Math.sqrt(random()) * .7;
      decor.push({ key: random() < .7 ? 'tree' : 'palm', x: Math.round(grove.x + Math.cos(angle) * grove.rx * d), y: Math.round(grove.y + Math.sin(angle) * grove.ry * d), scale: 3.4 + random() * .6, flip: random() < .5, tall: true });
    }
    for (let i = 0; i < 6; i++) {
      const angle = random() * Math.PI * 2;
      decor.push({ key: random() < .6 ? 'bush' : 'fern', x: Math.round(grove.x + Math.cos(angle) * grove.rx), y: Math.round(grove.y + Math.sin(angle) * grove.ry), scale: 4 });
    }
  }
  for (const [x, y] of TREES) decor.push({ key: random() < .75 ? 'tree' : 'palm', x, y: y + 6, scale: 3.6, flip: random() < .5, tall: true });
  for (const [x, y, big] of ROCKS) decor.push({ key: big ? 'rock' : 'rock-small', x, y: y + 10, scale: 4, flip: random() < .5 });

  // The lake and the stream.
  for (let i = 0; i < 16; i++) {
    const angle = random() * Math.PI * 2, d = .2 + random() * .7;
    decor.push({ key: random() < .25 ? 'lily-flower' : 'lilypad', x: Math.round(LAKE.x + Math.cos(angle) * LAKE.rx * d), y: Math.round(LAKE.y + Math.sin(angle) * LAKE.ry * d), scale: 4, flip: random() < .5, depth: -40 });
  }
  for (let i = 0; i < 4; i++) decor.push({ key: 'lilypad', x: Math.round(POND.x - 60 + i * 38), y: Math.round(POND.y - 10 + (i % 2) * 22), scale: 4, depth: -40 });
  for (let i = 0; i < 22; i++) {
    const angle = random() * Math.PI * 2;
    const water = i < 16 ? LAKE : POND;
    decor.push({ key: 'reeds', x: Math.round(water.x + Math.cos(angle) * (water.rx + 10)), y: Math.round(water.y + Math.sin(angle) * (water.ry + 8)), scale: 4, flip: random() < .5 });
  }
  for (const crossing of CROSSINGS) decor.push({ key: crossing.kind, x: crossing.x, y: crossing.y + (crossing.kind === 'bridge' ? 26 : 18), scale: 4, depth: -30 });

  // The research station and the volcano.
  decor.push({ key: 'hut', x: STATION.x, y: STATION.y + 40, scale: 4, tall: true });
  decor.push({ key: 'solar', x: STATION.x + 120, y: STATION.y - 10, scale: 4 });
  decor.push({ key: 'researcher-2', x: STATION.x + 96, y: STATION.y + 70, scale: 4 });
  decor.push({ key: 'volcano', x: VOLCANO.x, y: VOLCANO.y, scale: 5, depth: VOLCANO.y - 40 });

  // Flowers, ferns, mushrooms and logs scattered about.
  const small = ['flower', 'fern', 'flower', 'fern', 'bush', 'shrooms', 'stump', 'log'];
  for (let i = 0, tries = 0; i < 90 && tries < 2000; tries++) {
    const x = Math.round(AREA.left + random() * (AREA.right - AREA.left)), y = Math.round(AREA.top + random() * (AREA.bottom - AREA.top));
    if (!walkable(x, y, 30) || inHideout(x, y, -60) || PATHS.some(path => distanceToLine(x, y, path) < 34) || POOLS.some(pool => Math.hypot(x - pool.x, y - pool.y) < 140)) continue;
    decor.push({ key: small[i % small.length], x, y, scale: 4, flip: random() < .5 });
    i++;
  }

  // The cave, deep in its corner. Glowing mushrooms dot the trail, if anyone notices them.
  decor.push({ key: 'cave', x: CAVE.x, y: CAVE.y + 18, scale: 4 });
  for (const [x, y] of [[2268, 1150], [2318, 1214], [2372, 1268], [2392, 1370], [2520, 1340], [2350, 1300]]) decor.push({ key: 'glow-shrooms', x, y, scale: 4 });
  for (const [x, y] of [[2300, 1120], [2370, 1200], [2250, 1210], [2340, 1370]]) decor.push({ key: random() < .5 ? 'fern' : 'bush', x, y, scale: 4, flip: random() < .5 });
  return decor;
}

export const DECOR: Decor[] = buildDecor();
/** Where the glowing mushrooms are (for their glow). */
export const GLOWS: Point[] = DECOR.filter(item => item.key === 'glow-shrooms').map(item => ({ x: item.x, y: item.y - 10 }));

import { WORLD_SIZE } from '../../server/shared.mjs';

/**
 * The map: a big patch of Dominican rainforest around a lake, 3840 × 2160 world pixels. The
 * projector shows all of it; each phone shows the part around its own frog. Plain data and maths
 * (no Phaser), the same on every device, so the projector and the phones agree on where frogs can
 * hop and hide.
 *
 * Open forest floor in the middle, thick forest all around. A lake with a stream running north
 * and a river running south-west (each with a bridge and stepping stones), two ponds, thickets
 * and boulders to hop around, warm springs, a research station, a hunters' camp with a cage and a
 * cooking pot, a volcano peeking over the trees, and lots of places to hide: big bushes, hollow
 * logs and tall grass. Up on the north edge, at the end of a path lined with glowing mushrooms,
 * is a cave (blocked by a boulder in the first round).
 */
export interface Point { x: number; y: number }
interface Ellipse { x: number; y: number; rx: number; ry: number }
type Line = [number, number][];

export const MAP = { width: WORLD_SIZE.width, height: WORLD_SIZE.height };
/** How far a frog's middle stays from walls and water. */
export const FROG_RADIUS = 14;

/** The open forest floor: a rounded rectangle with a wavy edge. */
const AREA = { left: 200, top: 250, right: 3640, bottom: 1940, radius: 340 };

export const LAKE: Ellipse = { x: 1500, y: 1180, rx: 380, ry: 200 };
export const POND: Ellipse = { x: 3050, y: 620, rx: 130, ry: 66 };
export const POND_SOUTH: Ellipse = { x: 2720, y: 1760, rx: 96, ry: 50 };
const WATERS = [LAKE, POND, POND_SOUTH];
/** A stream from the lake up into the forest, and a river from the lake down to the south-west. */
export const STREAMS = [
  { points: [[1540, 1000], [1600, 860], [1530, 720], [1610, 580], [1560, 430], [1630, 290], [1590, 140], [1620, -60]] as Line, width: 26 },
  { points: [[1180, 1290], [1050, 1430], [980, 1600], [860, 1780], [800, 1960], [760, 2240]] as Line, width: 26 },
];
/** Where frogs can cross the water. */
export const CROSSINGS = [
  { kind: 'bridge', x: 1530, y: 720, w: 170, h: 44 },
  { kind: 'stones', x: 1563, y: 430, w: 140, h: 34 },
  { kind: 'bridge', x: 980, y: 1600, w: 170, h: 44 },
  { kind: 'stones', x: 827, y: 1880, w: 140, h: 34 },
] as const;

/** Sun-warmed springs (31 °C): too warm for the chytrid fungus, so sick frogs get better there. */
export const POOLS: Point[] = [{ x: 640, y: 1700 }, { x: 2450, y: 470 }, { x: 3200, y: 1500 }, { x: 950, y: 560 }];
export const STATION = { x: 430, y: 1560 };
export const VOLCANO = { x: 900, y: 262 };

/** The hunters' camp: tents, a campfire with a cooking pot, and the cage for caught frogs. */
export const CAMP = { x: 2450, y: 1110, rx: 270, ry: 170 };
export const CAGE = { x: 2410, y: 1080, radius: 58 };
export const POT = { x: 2620, y: 1160 };
const TENTS: Point[] = [{ x: 2250, y: 990 }, { x: 2640, y: 980 }];
/** Touch the cage (come this close) to free everyone inside. */
export const CAGE_REACH = 128;

/** Dirt paths (decoration). */
export const PATHS: Line[] = [
  [[520, 1560], [760, 1520], [980, 1600], [1200, 1560], [1500, 1470], [1850, 1440], [2200, 1300], [2450, 1250], [2750, 1290], [2980, 1330], [3200, 1500], [3450, 1600]],
  [[300, 640], [700, 600], [950, 560], [1250, 690], [1530, 720], [1900, 700], [2250, 560], [2450, 470], [2700, 470], [2880, 460], [2935, 330], [2950, 240]],
  [[700, 600], [650, 900], [700, 1200], [760, 1520]],
  [[2450, 1250], [2380, 920], [2300, 700], [2250, 560]],
  [[2450, 1250], [2580, 1500], [2650, 1680]],
];

/** Thickets: tree clusters you have to hop around. */
export const GROVES: Ellipse[] = [
  { x: 1100, y: 400, rx: 120, ry: 64 }, { x: 2000, y: 980, rx: 116, ry: 62 }, { x: 3300, y: 900, rx: 130, ry: 70 }, { x: 2000, y: 1700, rx: 120, ry: 60 },
  { x: 1400, y: 1760, rx: 110, ry: 56 }, { x: 3330, y: 1830, rx: 110, ry: 56 }, { x: 480, y: 1060, rx: 110, ry: 60 }, { x: 2740, y: 760, rx: 110, ry: 60 },
];
const HUT = { x: STATION.x, y: STATION.y, r: 62 };

/** The cave (its mouth), the clearing in front of it and the short trail that leads there. */
export const CAVE = { x: 2950, y: 196, radius: 40 };
export const CAVE_EXIT: Point = { x: 2950, y: 330 };
const HIDEOUT: Ellipse = { x: 2950, y: 250, rx: 124, ry: 72 };
const CAVE_TRAIL: Line = [[2880, 470], [2935, 330], [2950, 240]];
const TRAIL_WIDTH = 46;

/** A spot that's always open, south of the lake. */
export const SPAWN: Point = { x: 1500, y: 1530 };

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

/** Inside the cave's mouth (only possible once the boulder has rolled away). */
export const inCave = (x: number, y: number): boolean => Math.hypot(x - CAVE.x, y - CAVE.y) < CAVE.radius;

let caveOpen = false;
/** The boulder blocks the cave in the first round; it rolls away for the last two. */
export function setCaveOpen(open: boolean): void { caveOpen = open; }
export const isCaveOpen = (): boolean => caveOpen;

const onCrossing = (x: number, y: number): boolean => CROSSINGS.some(c => Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2);

/** Water: the lake, the ponds, the stream and the river (except where you can cross). */
export function inWater(x: number, y: number, margin = 0): boolean {
  for (const water of WATERS) if (inEllipse(water, x, y, margin)) return true;
  return STREAMS.some(stream => distanceToLine(x, y, stream.points) < stream.width + margin) && !onCrossing(x, y);
}

// ---------------------------------------------------------------- generated layout

/** Single trees and boulders: placed once, the same on every device. */
export const TREES: [number, number][] = [];
export const ROCKS: [number, number, boolean][] = [];

export type HideKind = 'bush' | 'log' | 'grass';
export interface Hide extends Ellipse { kind: HideKind }
/** Hiding places: a frog inside one can't be seen from far away. */
export const HIDES: Hide[] = [];
const HIDE_SIZE: Record<HideKind, [number, number]> = { bush: [56, 36], log: [58, 24], grass: [78, 42] };

/** Trunks, boulders, thickets, tents, the cage, the pot and the research hut. */
export function inSolid(x: number, y: number, margin = 0): boolean {
  for (const [tx, ty] of TREES) if (Math.hypot(x - tx, y - ty) < 20 + margin) return true;
  for (const [rx, ry, big] of ROCKS) if (Math.hypot(x - rx, (y - ry) * 1.3) < (big ? 34 : 18) + margin) return true;
  for (const grove of GROVES) if (inEllipse(grove, x, y, margin)) return true;
  for (const tent of TENTS) if (Math.hypot(x - tent.x, (y - tent.y) * 1.3) < 58 + margin) return true;
  if (Math.hypot(x - CAGE.x, (y - CAGE.y) * 1.2) < CAGE.radius + margin) return true;
  if (Math.hypot(x - POT.x, (y - POT.y) * 1.3) < 38 + margin) return true;
  return Math.hypot(x - HUT.x, y - HUT.y) < HUT.r + margin;
}

/** Can a frog stand here? */
export function walkable(x: number, y: number, margin = FROG_RADIUS): boolean {
  if (x < margin || y < margin || x > MAP.width - margin || y > MAP.height - margin) return false;
  if (forestDepth(x, y) + margin > 0 && !inHideout(x, y, margin)) return false;
  if (!caveOpen && Math.hypot(x - CAVE.x, (y - CAVE.y) * 1.2) < 58 + margin) return false; // the boulder
  return !inWater(x, y, margin * .5) && !inSolid(x, y, margin);
}

/** Moves a frog, sliding along walls and shores instead of stopping dead. */
export function step(x: number, y: number, dx: number, dy: number, margin = FROG_RADIUS, allowed: (x: number, y: number) => boolean = () => true): Point {
  if (!dx && !dy) return { x, y };
  const ok = (px: number, py: number) => walkable(px, py, margin) && allowed(px, py);
  if (ok(x + dx, y + dy)) return { x: x + dx, y: y + dy };
  if (dx && ok(x + dx, y)) return { x: x + dx, y };
  if (dy && ok(x, y + dy)) return { x, y: y + dy };
  return { x, y };
}

/** Whether the straight line from a to b passes the test everywhere (checked every 16 px). */
export function clearLine(a: Point, b: Point, test: (x: number, y: number) => boolean = walkable): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 16);
  for (let i = 1; i <= steps; i++) if (!test(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false;
  return true;
}

/** The hiding place at this spot, if any. */
export function hideAt(x: number, y: number): Hide | undefined {
  return HIDES.find(hide => inEllipse(hide, x, y));
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

/** Where the n-th caught frog sits inside the cage. */
export function cageSlot(n: number): Point {
  const column = n % 4, row = Math.floor(n / 4) % 3;
  return { x: CAGE.x - 33 + column * 22, y: CAGE.y - 4 + row * 14 };
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

/** Places trees, boulders and hiding places in the open, clear of paths, water and each other. */
function layout(): void {
  const random = seeded(4242);
  const placed: (Point & { r: number })[] = [];
  const clear = (x: number, y: number, r: number) =>
    forestDepth(x, y) < -r - 30 && !inHideout(x, y, -r - 40) && !inWater(x, y, r + 30) && !inSolid(x, y, r + 40)
    && !inEllipse(CAMP, x, y, r) && !PATHS.some(path => distanceToLine(x, y, path) < r + 24)
    && !POOLS.some(pool => Math.hypot(x - pool.x, y - pool.y) < r + 130)
    && !CROSSINGS.some(c => Math.hypot(x - c.x, y - c.y) < r + 110)
    && Math.hypot(x - SPAWN.x, y - SPAWN.y) > r + 80
    && placed.every(item => Math.hypot(x - item.x, y - item.y) > item.r + r + 70);
  const place = (count: number, r: number, add: (x: number, y: number) => void) => {
    for (let i = 0, tries = 0; i < count && tries < count * 200; tries++) {
      const x = Math.round(AREA.left + random() * (AREA.right - AREA.left)), y = Math.round(AREA.top + random() * (AREA.bottom - AREA.top));
      if (!clear(x, y, r)) continue;
      placed.push({ x, y, r });
      add(x, y); i++;
    }
  };
  const hide = (kind: HideKind) => (x: number, y: number) => HIDES.push({ kind, x, y, rx: HIDE_SIZE[kind][0], ry: HIDE_SIZE[kind][1] });
  place(26, 60, hide('bush'));
  place(10, 60, hide('log'));
  place(12, 78, hide('grass'));
  place(34, 26, (x, y) => TREES.push([x, y]));
  place(24, 34, (x, y) => ROCKS.push([x, y, random() < .55]));
}
layout();

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

function buildDecor(): Decor[] {
  const random = seeded(1729);
  const decor: Decor[] = [];
  const caveArt = { left: CAVE.x - 170, right: CAVE.x + 170, top: 0, bottom: CAVE.y + 70 };
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

  // Hiding places: drawn in front of a frog that's inside.
  for (const hide of HIDES) {
    if (hide.kind === 'bush') decor.push({ key: 'hide-bush', x: hide.x, y: hide.y + 30, scale: 4, flip: random() < .5 });
    else if (hide.kind === 'log') decor.push({ key: 'hollow-log', x: hide.x, y: hide.y + 24, scale: 4, flip: random() < .5 });
    else decor.push({ key: 'tall-grass', x: hide.x, y: hide.y + 34, scale: 4, flip: random() < .5 });
  }

  // The lake, the ponds and the water crossings.
  for (let i = 0; i < 20; i++) {
    const angle = random() * Math.PI * 2, d = .2 + random() * .7;
    decor.push({ key: random() < .25 ? 'lily-flower' : 'lilypad', x: Math.round(LAKE.x + Math.cos(angle) * LAKE.rx * d), y: Math.round(LAKE.y + Math.sin(angle) * LAKE.ry * d), scale: 4, flip: random() < .5, depth: -40 });
  }
  for (const pond of [POND, POND_SOUTH]) for (let i = 0; i < 3; i++) decor.push({ key: 'lilypad', x: Math.round(pond.x - 50 + i * 40), y: Math.round(pond.y - 8 + (i % 2) * 20), scale: 4, depth: -40 });
  for (let i = 0; i < 28; i++) {
    const angle = random() * Math.PI * 2;
    const water = i < 18 ? LAKE : i < 24 ? POND : POND_SOUTH;
    decor.push({ key: 'reeds', x: Math.round(water.x + Math.cos(angle) * (water.rx + 10)), y: Math.round(water.y + Math.sin(angle) * (water.ry + 8)), scale: 4, flip: random() < .5 });
  }
  for (const crossing of CROSSINGS) decor.push({ key: crossing.kind, x: crossing.x, y: crossing.y + (crossing.kind === 'bridge' ? 26 : 18), scale: 4, depth: -30 });

  // The research station, the hunters' camp and the volcano.
  decor.push({ key: 'hut', x: STATION.x, y: STATION.y + 40, scale: 4, tall: true });
  decor.push({ key: 'solar', x: STATION.x + 120, y: STATION.y - 10, scale: 4 });
  decor.push({ key: 'researcher-2', x: STATION.x + 96, y: STATION.y + 70, scale: 4 });
  for (const tent of TENTS) decor.push({ key: 'tent', x: tent.x, y: tent.y + 40, scale: 4, flip: tent.x > CAMP.x, tall: true });
  decor.push({ key: 'jail', x: CAGE.x, y: CAGE.y + 46, scale: 4 });
  decor.push({ key: 'campfire', x: POT.x, y: POT.y + 34, scale: 4 });
  decor.push({ key: 'pot', x: POT.x, y: POT.y + 22, scale: 4 });
  for (const [x, y] of [[2300, 1220], [2530, 1240], [2690, 1100]]) decor.push({ key: 'log', x, y, scale: 4, flip: x > CAMP.x });
  decor.push({ key: 'volcano', x: VOLCANO.x, y: VOLCANO.y, scale: 5, depth: VOLCANO.y - 40 });

  // Flowers, ferns, mushrooms and logs scattered about.
  const small = ['flower', 'fern', 'flower', 'fern', 'bush', 'shrooms', 'stump', 'log'];
  for (let i = 0, tries = 0; i < 170 && tries < 4000; tries++) {
    const x = Math.round(AREA.left + random() * (AREA.right - AREA.left)), y = Math.round(AREA.top + random() * (AREA.bottom - AREA.top));
    if (!walkable(x, y, 30) || inHideout(x, y, -60) || inEllipse(CAMP, x, y) || hideAt(x, y) || PATHS.some(path => distanceToLine(x, y, path) < 34) || POOLS.some(pool => Math.hypot(x - pool.x, y - pool.y) < 140)) continue;
    decor.push({ key: small[i % small.length], x, y, scale: 4, flip: random() < .5 });
    i++;
  }

  // The cave, with glowing mushrooms lining the path up to it.
  decor.push({ key: 'cave', x: CAVE.x, y: CAVE.y + 18, scale: 4 });
  for (const [x, y] of [[2840, 480], [2905, 420], [2880, 330], [3000, 330], [2990, 420], [2830, 270], [3070, 280], [2955, 520]]) decor.push({ key: 'glow-shrooms', x, y, scale: 4 });
  for (const [x, y] of [[2810, 360], [3090, 360]]) decor.push({ key: 'fern', x, y, scale: 4, flip: x > CAVE.x });
  return decor;
}

export const DECOR: Decor[] = buildDecor();
/** Where the glowing mushrooms are (for their glow). */
export const GLOWS: Point[] = DECOR.filter(item => item.key === 'glow-shrooms').map(item => ({ x: item.x, y: item.y - 10 }));

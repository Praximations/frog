import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP, SPAWN, POOLS, CAVE, CAVE_EXIT, CAGE, CAGE_REACH, CROSSINGS, LAKE, DECOR, HIDES, walkable, step, inWater, inHideout, inCave, hideAt, randomSpot, clearLine, setCaveOpen } from '../src/world/map.ts';

/** Every open cell (24 px) a frog can reach from the spawn point, hopping in 8 directions. */
function reachable() {
  const size = 24, cols = Math.ceil(MAP.width / size), rows = Math.ceil(MAP.height / size);
  const seen = new Uint8Array(cols * rows);
  const start = [Math.floor(SPAWN.x / size), Math.floor(SPAWN.y / size)];
  const queue = [start]; seen[start[1] * cols + start[0]] = 1;
  while (queue.length) {
    const [cx, cy] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx]) continue;
      const x = nx * size + size / 2, y = ny * size + size / 2;
      // Moving between cells must stay walkable (checked halfway too).
      if (!walkable(x, y) || !walkable(x - dx * size / 2, y - dy * size / 2)) continue;
      seen[ny * cols + nx] = 1; queue.push([nx, ny]);
    }
  }
  return (x, y) => {
    // Any open cell within 30 px counts.
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const cx = Math.floor(x / size) + ox, cy = Math.floor(y / size) + oy;
      if (cx >= 0 && cy >= 0 && cx < cols && cy < rows && seen[cy * cols + cx]) return true;
    }
    return false;
  };
}

test('the map is one connected forest: every spring, hiding place, both banks, the cage and the cave can be reached', () => {
  setCaveOpen(true);
  assert.ok(walkable(SPAWN.x, SPAWN.y), 'the spawn point is open');
  const canReach = reachable();
  for (const pool of POOLS) assert.ok(canReach(pool.x, pool.y), `the warm spring at ${pool.x},${pool.y}`);
  assert.ok(canReach(CAVE.x, CAVE.y) && walkable(CAVE.x, CAVE.y) && inCave(CAVE.x, CAVE.y), 'the cave mouth');
  assert.ok(HIDES.length >= 40, `${HIDES.length} hiding places`);
  for (const hide of HIDES) assert.ok(canReach(hide.x, hide.y) && hideAt(hide.x, hide.y) === hide, `${hide.kind} at ${hide.x},${hide.y}`);
  // Free frogs can get close enough to the cage to open it.
  let sides = 0;
  for (let a = 0; a < 16; a++) { const x = CAGE.x + Math.cos(a / 16 * Math.PI * 2) * (CAGE_REACH - 20), y = CAGE.y + Math.sin(a / 16 * Math.PI * 2) * (CAGE_REACH - 20); if (walkable(x, y) && canReach(x, y)) sides++; }
  assert.ok(sides >= 8, `the cage can be reached from ${sides} sides`);
  assert.ok(canReach(CAVE_EXIT.x, CAVE_EXIT.y), 'the cave clearing');
  for (const crossing of CROSSINGS) {
    assert.ok(walkable(crossing.x, crossing.y), `the middle of the ${crossing.kind}`);
    assert.ok(canReach(crossing.x - 90, crossing.y) && canReach(crossing.x + 90, crossing.y), `both sides of the ${crossing.kind}`);
  }
  // Lots of random spots: all of them reachable, none in the water or the cave clearing.
  let random = 1;
  const next = () => (random = (random * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 300; i++) {
    const spot = randomSpot([], next);
    assert.ok(walkable(spot.x, spot.y) && !inHideout(spot.x, spot.y) && canReach(spot.x, spot.y), `${spot.x},${spot.y}`);
  }
});

test('frogs slide along shores and can\'t swim', () => {
  assert.ok(inWater(LAKE.x, LAKE.y) && !walkable(LAKE.x, LAKE.y));
  // Hopping straight into the lake from the south only slides sideways (or stops), never into the water.
  let frog = { x: LAKE.x + 40, y: LAKE.y + LAKE.ry + 40 };
  for (let i = 0; i < 60; i++) frog = step(frog.x, frog.y, 3, -6);
  assert.ok(walkable(frog.x, frog.y) && !inWater(frog.x, frog.y));
  assert.ok(frog.x > LAKE.x + 40, 'it slid along the shore');
  assert.ok(!clearLine({ x: LAKE.x, y: LAKE.y + 300 }, { x: LAKE.x, y: LAKE.y - 300 }));
});

test('the cave sits at the forest edge, blocked by a boulder until it opens', () => {
  setCaveOpen(false);
  assert.ok(!walkable(CAVE.x, CAVE.y), 'the boulder blocks the mouth in round 1');
  assert.ok(walkable(CAVE_EXIT.x, CAVE_EXIT.y), 'the clearing in front is open');
  setCaveOpen(true);
  assert.ok(inHideout(CAVE.x, CAVE.y) && walkable(CAVE.x, CAVE.y));
  assert.ok(Math.hypot(CAVE.x - SPAWN.x, CAVE.y - SPAWN.y) > 1000);
  assert.ok(MAP.width >= 3840 && MAP.height >= 2160, 'a big map');
  assert.ok(DECOR.some(item => item.key === 'cave'));
  assert.ok(!DECOR.some(item => item.key === 'sign'), 'no warning sign');
  // Scenery stays on the map.
  for (const item of DECOR) assert.ok(item.x > -120 && item.x < MAP.width + 120 && item.y > -120 && item.y < MAP.height + 260, `${item.key} at ${item.x},${item.y}`);
});

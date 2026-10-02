import Phaser from 'phaser';

export const WORLD = { width: 2400, height: 1600 };
export const LANDMARKS = {
  board: { x: 560, y: 735 },
  feeding: { x: 860, y: 510 },
  lookout: { x: 1720, y: 680 },
  station: { x: 1820, y: 1160 },
};
const SCALE = 4;
type Context = CanvasRenderingContext2D;

function texture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Context) => void): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, w, h)!;
  canvas.context.imageSmoothingEnabled = false;
  draw(canvas.context); canvas.refresh();
}
function rect(ctx: Context, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function oval(ctx: Context, color: string, cx: number, cy: number, rx: number, ry: number): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - y * y / (ry * ry))));
    ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}
function hash(x: number, y: number): number { return ((x * 374761393 ^ y * 668265263) >>> 0) % 101; }
function distanceToLine(x: number, y: number, a: number[], b: number[]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
const TRAIL = [[140, 278], [140, 216], [144, 184], [190, 163], [253, 166], [336, 167], [430, 173], [465, 211], [478, 280]];
const FOOD_TRAIL = [[190, 163], [207, 149], [215, 128]];

function drawTerrain(ctx: Context): void {
  const grass = ['#8fa85d', '#a6bb70', '#9ab465', '#799751', '#bad084'];
  for (let y = 0; y < 400; y++) {
    for (let x = 0; x < 600; x++) {
      const n = hash(x, y);
      let distance = 1000;
      for (const path of [TRAIL, FOOD_TRAIL]) {
        for (let i = 1; i < path.length; i++) distance = Math.min(distance, distanceToLine(x, y, path[i - 1], path[i]));
      }
      const clear = Math.hypot((x - 140) * .9, y - 220) < 30 || Math.hypot(x - 215, (y - 128) * 1.15) < 31 || (x > 436 && x < 524 && y > 264 && y < 316);
      let color = grass[n % 5];
      if (distance < 13 || clear) color = n > 94 ? '#f0d7a0' : n < 7 ? '#c1a46b' : '#dec38b';
      else if (distance < 16) color = n < 30 ? '#c2bd77' : '#96ac60';
      const center = 300 + Math.round(Math.sin(y / 45) * 4);
      const bank = Math.abs(x - center);
      if (bank < 25) color = n > 89 ? '#7fa5c7' : n < 10 ? '#466993' : '#5b7eab';
      else if (bank < 36) color = (x + Math.floor(y / 5)) % 5 === 0 ? '#b89b6c' : n < 22 ? '#6a573e' : '#947b57';
      else if (bank < 39) color = n < 40 ? '#567440' : '#bdd07a';
      rect(ctx, color, x, y, 1, 1);
    }
  }
  // Grass blades and ripples use whole pixels, with no smoothed path edges.
  for (let y = 5; y < 398; y += 4) {
    const center = 300 + Math.round(Math.sin(y / 45) * 4);
    for (let x = center - 19; x < center + 21; x += 9) {
      if (hash(x, y) < 55) {
        rect(ctx, '#8eb1d1', x, y, 5, 1); rect(ctx, '#759bc2', x + 2, y + 1, 4, 1);
      }
    }
    // Exposed roots running down the small river cliffs.
    for (const side of [-1, 1]) {
      const x = center + side * 30;
      rect(ctx, '#66563e', x, y, 1, 4); rect(ctx, '#c0a276', x + side * 2, y, 1, 3);
    }
  }
  // Broad bridge: small plank seams, posts, moss and rope rails.
  rect(ctx, '#514b3b', 262, 155, 77, 31);
  for (let x = 265; x < 339; x += 5) {
    rect(ctx, '#a99160', x, 156, 4, 29); rect(ctx, '#ceb27a', x, 157, 3, 27);
    rect(ctx, '#86764d', x + 2, 166, 1, 10);
    rect(ctx, '#726647', x, 160, 1, 1); rect(ctx, '#726647', x, 180, 1, 1);
  }
  for (const y of [153, 185]) {
    rect(ctx, '#665539', 262, y, 79, 3); rect(ctx, '#d9be84', 262, y, 79, 1);
    for (const x of [263, 283, 318, 337]) { rect(ctx, '#574b35', x, y - 4, 3, 8); rect(ctx, '#ddc08a', x, y - 4, 3, 2); }
  }
  // Little lookout deck and stepping stones at the field station.
  rect(ctx, '#726047', 413, 160, 40, 27);
  for (let y = 161; y < 186; y += 4) rect(ctx, '#c4a774', 414, y, 38, 3);
  for (let i = 0; i < 5; i++) { rect(ctx, '#a69e7e', 469, 269 + i * 9, 12, 5); rect(ctx, '#dbd1ad', 470, 269 + i * 9, 10, 2); }
}

function drawTree(ctx: Context): void {
  oval(ctx, '#577242', 25, 57, 18, 5);
  rect(ctx, '#645036', 21, 28, 9, 29); rect(ctx, '#aa8352', 23, 28, 3, 28);
  rect(ctx, '#d1ab6a', 24, 33, 1, 22); rect(ctx, '#685239', 18, 54, 16, 3);
  const clusters = [[15, 27, 13, 13], [33, 28, 13, 12], [24, 15, 17, 13], [24, 32, 17, 12]];
  for (const [x, y, rx, ry] of clusters) {
    oval(ctx, '#345d37', x, y, rx, ry); oval(ctx, '#4c7e3e', x, y - 2, rx - 1, ry - 2);
    oval(ctx, '#659549', x - 2, y - 4, rx - 3, ry - 4);
    for (let py = y - ry + 3; py < y + ry - 3; py += 3) {
      for (let px = x - rx + 3; px < x + rx - 3; px += 3) {
        if ((px - x) ** 2 / rx ** 2 + (py - y) ** 2 / ry ** 2 > .65) continue;
        const n = hash(px, py);
        rect(ctx, n < 45 ? '#82ac57' : '#547f40', px, py, 2, 1);
        if (n > 80) rect(ctx, '#a1c66b', px, py - 1, 1, 1);
      }
    }
  }
}

function drawFrog(ctx: Context, facing: string, frame: number): void {
  const hop = frame === 2, crouch = frame === 1;
  if (facing === 'right') { ctx.translate(24, 0); ctx.scale(-1, 1); }
  const side = facing === 'left' || facing === 'right';
  const back = facing === 'up';
  const y = crouch ? 1 : 0;
  rect(ctx, '#604634', 3, hop ? 17 : 15, 5, hop ? 4 : 5);
  rect(ctx, '#604634', 16, hop ? 17 : 15, 5, hop ? 4 : 5);
  rect(ctx, '#ad7950', 4, hop ? 16 : 15, 4, 4); rect(ctx, '#ad7950', 16, hop ? 16 : 15, 4, 4);
  rect(ctx, '#ecd09a', 2, 20, 6, 1); rect(ctx, '#ecd09a', 16, 20, 6, 1);
  oval(ctx, '#5a4233', 12, 14 + y, 7, crouch ? 5 : 6);
  oval(ctx, '#bb8858', 12, 13 + y, 6, crouch ? 4 : 5);
  oval(ctx, '#e3bc7e', 12, 15 + y, 4, 3);
  oval(ctx, '#5a4233', side ? 10 : 12, 9 + y, 8, 5);
  oval(ctx, '#d4a56a', side ? 10 : 12, 8 + y, 7, 4);
  rect(ctx, '#f0ce90', 8, 6 + y, 7, 2);
  for (const x of side ? [5, 12] : [6, 14]) {
    rect(ctx, '#6d4e35', x, 3 + y, 5, 6);
    rect(ctx, '#e9c791', x + 1, 3 + y, 4, 5);
    if (!back) {
      rect(ctx, '#fff6d8', x + 1, 4 + y, 3, 3);
      if (frame === 3) rect(ctx, '#493c31', x + 1, 6 + y, 3, 1);
      else { rect(ctx, '#363b30', x + 2, 4 + y, 2, 3); rect(ctx, '#fff9e8', x + 2, 4 + y, 1, 1); }
    }
  }
  if (!back) {
    rect(ctx, '#956244', side ? 5 : 9, 11 + y, side ? 5 : 6, 1);
    rect(ctx, '#e6a184', side ? 3 : 5, 10 + y, 2, 1); rect(ctx, '#e6a184', side ? 14 : 17, 10 + y, 2, 1);
  }
  rect(ctx, '#876243', 9, 14 + y, 1, 1); rect(ctx, '#876243', 14, 15 + y, 1, 1);
  rect(ctx, '#cf9c64', 4, 13 + y, 2, 3); rect(ctx, '#cf9c64', 18, 13 + y, 2, 3);
}

/** Original pixel art. The reference guides density and readability, not asset reuse. */
export function ensureForestArt(scene: Phaser.Scene): void {
  texture(scene, 'terrain', 600, 400, drawTerrain);
  texture(scene, 'tree', 50, 64, drawTree);
  texture(scene, 'fern', 20, 22, ctx => {
    rect(ctx, '#597744', 3, 18, 15, 2);
    for (let i = 0; i < 6; i++) {
      rect(ctx, '#3f713c', 9 - i, 17 - i * 2, i + 2, 2); rect(ctx, '#3f713c', 10, 17 - i * 2, i + 2, 2);
      rect(ctx, '#92b76b', 7 - i, 16 - i * 2, 3, 1); rect(ctx, '#7da75c', 12 + i, 16 - i * 2, 3, 1);
    }
    rect(ctx, '#c1d58c', 9, 5, 1, 14);
  });
  texture(scene, 'rock', 20, 15, ctx => {
    oval(ctx, '#617c4e', 10, 12, 9, 2); oval(ctx, '#6b7769', 10, 8, 8, 5);
    oval(ctx, '#a9ae96', 9, 6, 7, 4); rect(ctx, '#d5d7b5', 6, 3, 6, 1);
    rect(ctx, '#858f78', 12, 7, 5, 4); rect(ctx, '#86a452', 3, 10, 6, 2);
  });
  texture(scene, 'flower', 10, 14, ctx => {
    rect(ctx, '#5a803d', 4, 5, 1, 7); rect(ctx, '#719648', 2, 9, 5, 2);
    for (const [x, y] of [[2, 2], [5, 2], [1, 4], [6, 4], [3, 6]]) rect(ctx, '#fff0ba', x, y, 3, 2);
    rect(ctx, '#eabb51', 4, 4, 2, 2);
  });
  texture(scene, 'board', 30, 33, ctx => {
    rect(ctx, '#65814b', 3, 28, 25, 3); rect(ctx, '#735238', 6, 14, 3, 15); rect(ctx, '#735238', 21, 14, 3, 15);
    rect(ctx, '#654831', 2, 3, 27, 16); rect(ctx, '#c69963', 3, 4, 25, 13);
    rect(ctx, '#ffe7b3', 5, 6, 21, 9); rect(ctx, '#8ba663', 7, 8, 6, 5);
    rect(ctx, '#967746', 16, 8, 7, 1); rect(ctx, '#967746', 16, 11, 5, 1);
    rect(ctx, '#f0c68d', 1, 2, 29, 2);
  });
  texture(scene, 'log', 45, 19, ctx => {
    oval(ctx, '#5c7847', 24, 15, 21, 3); rect(ctx, '#705239', 4, 5, 36, 10);
    rect(ctx, '#a77b4d', 5, 4, 34, 8); rect(ctx, '#d0a567', 7, 4, 30, 2);
    rect(ctx, '#614c36', 12, 9, 19, 1); rect(ctx, '#614c36', 20, 6, 12, 1);
    oval(ctx, '#d5b77d', 4, 10, 4, 6); oval(ctx, '#8c6c44', 4, 10, 2, 4);
    rect(ctx, '#87a458', 18, 3, 11, 2);
  });
  texture(scene, 'hut', 82, 78, ctx => {
    rect(ctx, '#66824b', 6, 70, 72, 5);
    rect(ctx, '#725541', 10, 27, 63, 42); rect(ctx, '#e1c599', 12, 30, 59, 36);
    for (let y = 33; y < 66; y += 6) rect(ctx, '#c4a276', 12, y, 59, 1);
    rect(ctx, '#755a40', 14, 28, 3, 40); rect(ctx, '#755a40', 66, 28, 3, 40);
    // Stepped roof contour, tiles, and a sunlit ridge.
    for (let y = 0; y < 23; y++) {
      const left = 21 - Math.floor(y / 2);
      rect(ctx, '#74483b', left, 6 + y, 82 - left * 2, 1);
      rect(ctx, y % 5 === 0 ? '#efaa73' : y % 5 === 4 ? '#ad6047' : '#ce7c52', left + 2, 6 + y, 78 - left * 2, 1);
    }
    rect(ctx, '#794c35', 7, 28, 69, 4); rect(ctx, '#e9a16a', 7, 28, 69, 1);
    for (const x of [20, 53]) {
      rect(ctx, '#69523d', x, 39, 11, 15); rect(ctx, '#8bb8b0', x + 2, 41, 7, 11);
      rect(ctx, '#dbede0', x + 2, 41, 7, 2); rect(ctx, '#6c8e89', x + 5, 41, 1, 11); rect(ctx, '#f2d5a4', x - 1, 53, 13, 2);
    }
    rect(ctx, '#5c4d3e', 36, 43, 13, 25); rect(ctx, '#a68b5b', 38, 45, 9, 21);
    rect(ctx, '#e9c373', 44, 55, 1, 2); rect(ctx, '#bfab80', 31, 68, 23, 3); rect(ctx, '#e7d2a0', 29, 71, 27, 3);
    rect(ctx, '#799054', 32, 34, 20, 6); rect(ctx, '#ead8a0', 36, 36, 12, 1);
  });
  texture(scene, 'researcher', 18, 26, ctx => {
    rect(ctx, '#576e43', 3, 24, 13, 1); rect(ctx, '#4c524b', 5, 19, 3, 5); rect(ctx, '#4c524b', 11, 19, 3, 5);
    rect(ctx, '#775c43', 5, 24, 4, 1); rect(ctx, '#775c43', 11, 24, 4, 1);
    rect(ctx, '#468875', 4, 11, 11, 9); rect(ctx, '#93b9a0', 7, 11, 5, 8);
    rect(ctx, '#c2986f', 3, 12, 2, 6); rect(ctx, '#c2986f', 14, 12, 2, 6);
    rect(ctx, '#73533d', 5, 3, 9, 7); rect(ctx, '#dbac7d', 6, 5, 7, 6);
    rect(ctx, '#374e43', 7, 7, 1, 1); rect(ctx, '#374e43', 11, 7, 1, 1);
    rect(ctx, '#96805b', 4, 2, 11, 3); rect(ctx, '#d8c995', 5, 1, 9, 3); rect(ctx, '#e9dbae', 2, 4, 15, 2);
  });
  for (const facing of ['down', 'up', 'left', 'right']) {
    for (let frame = 0; frame < 4; frame++) texture(scene, `frog-${facing}-${frame}`, 24, 24, ctx => drawFrog(ctx, facing, frame));
  }
  texture(scene, 'frog', 24, 24, ctx => drawFrog(ctx, 'down', 0));
  texture(scene, 'frog-shadow', 20, 8, ctx => oval(ctx, '#415b3a', 10, 4, 9, 3));
  texture(scene, 'insect', 12, 12, ctx => {
    rect(ctx, '#52673d', 2, 7, 8, 1); rect(ctx, '#52673d', 1, 8, 2, 2); rect(ctx, '#52673d', 9, 8, 2, 2);
    oval(ctx, '#759547', 6, 6, 4, 2); rect(ctx, '#b6c872', 4, 4, 5, 2);
    rect(ctx, '#304637', 8, 4, 1, 1); rect(ctx, '#6e8545', 9, 1, 1, 3); rect(ctx, '#6e8545', 10, 2, 1, 2);
  });
}

// Placed around the trails, rather than random obstacles in the walking route.
const TREES = [[170, 510], [300, 290], [470, 270], [650, 330], [900, 245], [1050, 220], [1450, 240], [1640, 300], [1890, 310], [2130, 330], [2200, 530], [2200, 780], [2140, 1010], [2260, 1250], [2160, 1480], [1950, 1460], [1720, 1430], [1520, 1250], [1490, 1000], [1460, 455], [290, 900], [310, 1170], [520, 1320], [720, 1250], [920, 1060], [975, 870], [175, 1420], [1010, 1450], [470, 100], [770, 80], [1780, 90], [2110, 80]];
const FERNS = [[410, 650], [460, 610], [710, 790], [740, 750], [950, 480], [965, 600], [765, 1090], [1650, 800], [1610, 840], [1870, 900], [1900, 870], [2040, 1330], [1980, 1320], [1550, 560], [730, 410], [840, 350], [190, 740], [320, 630], [790, 870], [1590, 1020]];

export function buildForest(scene: Phaser.Scene, collisions = true): Phaser.Physics.Arcade.StaticGroup {
  ensureForestArt(scene);
  scene.add.image(0, 0, 'terrain').setOrigin(0).setScale(SCALE).setDepth(-100);
  const obstacles = scene.physics.add.staticGroup();
  const block = (x: number, y: number, w: number, h: number) => { if (collisions) obstacles.add(scene.add.zone(x, y, w, h)); };
  for (const [i, [x, y]] of TREES.entries()) {
    const tree = scene.add.image(x, y, 'tree').setOrigin(.5, .9).setScale(SCALE).setDepth(y);
    if (i % 4 === 0) tree.setTint(0xe2eed2);
    block(x, y - 8, 38, 28);
  }
  for (const [x, y] of FERNS) scene.add.image(x, y, 'fern').setOrigin(.5, .9).setScale(SCALE).setDepth(y);
  for (const [x, y] of [[380, 775], [790, 980], [1030, 520], [1510, 640], [1630, 1200], [2020, 860], [620, 490]]) {
    scene.add.image(x, y, 'rock').setOrigin(.5, .9).setScale(SCALE).setDepth(y); block(x, y - 4, 42, 25);
  }
  for (const [i, [x, y]] of [[690, 940], [960, 410], [1560, 520], [1990, 1260], [470, 950]].entries()) {
    for (let n = 0; n < 8; n++) {
      const flower = scene.add.image(x + n % 4 * 24, y + Math.floor(n / 4) * 22, 'flower').setOrigin(.5, 1).setScale(SCALE).setDepth(y + n);
      if (i % 2) flower.setTint(0xffc4bd);
    }
  }
  for (const point of [LANDMARKS.board, LANDMARKS.lookout]) {
    scene.add.image(point.x, point.y, 'board').setOrigin(.5, .88).setScale(SCALE).setDepth(point.y);
    block(point.x, point.y - 20, 85, 25);
  }
  for (const [x, y] of [[785, 1060], [1560, 410]]) {
    scene.add.image(x, y, 'log').setOrigin(.5, .9).setScale(SCALE).setDepth(y); block(x, y - 12, 145, 30);
  }
  scene.add.image(1930, 1100, 'hut').setOrigin(.5, .9).setScale(SCALE).setDepth(1100);
  block(1930, 1020, 280, 100);
  scene.add.image(LANDMARKS.station.x, LANDMARKS.station.y, 'researcher').setOrigin(.5, .92).setScale(SCALE).setDepth(LANDMARKS.station.y);
  block(LANDMARKS.station.x, LANDMARKS.station.y - 7, 28, 20);
  block(1200, 300, 245, 600); block(1200, 1165, 245, 870);
  for (let i = 0; i < 18; i++) {
    const y = 75 + i * 82; if (y > 595 && y < 750) continue;
    const x = 1200 + Math.round(Math.sin(y / 180) * 16);
    const ripple = scene.add.rectangle(x, y, 24, 4, 0xb7d3df, .6).setDepth(-90);
    scene.tweens.add({ targets: ripple, y: y + 16, alpha: .15, duration: 1100 + i * 70, yoyo: true, repeat: -1 });
  }
  for (let i = 0; i < 9; i++) {
    const butterfly = scene.add.image(600 + i * 160, 300 + i % 3 * 260, 'flower').setScale(1.5).setDepth(2500).setTint(i % 2 ? 0xffe4a4 : 0xf7c3c1);
    scene.tweens.add({ targets: butterfly, x: butterfly.x + 48, y: butterfly.y - 24, scaleX: .9, duration: 1800 + i * 180, yoyo: true, repeat: -1 });
  }
  return obstacles;
}

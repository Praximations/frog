/**
 * Original code-drawn pixel art. Each entry draws into a small canvas; Phaser scales it ×4 with
 * nearest-neighbour filtering. The same drawings feed the HTML cards via artUrl().
 */
type Context = CanvasRenderingContext2D;
export type Draw = (ctx: Context) => void;

export function rect(ctx: Context, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
export function oval(ctx: Context, color: string, cx: number, cy: number, rx: number, ry: number): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - y * y / (ry * ry))));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}
export function hash(x: number, y: number): number { return ((x * 374761393 ^ y * 668265263) >>> 0) % 101; }
function line(ctx: Context, color: string, x0: number, y0: number, x1: number, y1: number): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) rect(ctx, color, x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, 1, 1);
}
function speckle(ctx: Context, colors: string[], x: number, y: number, w: number, h: number, density: number, seed = 0): void {
  for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
    const n = hash(px + seed, py + seed * 3);
    if (n < density) rect(ctx, colors[n % colors.length], px, py, 1, 1);
  }
}

// ---------------------------------------------------------------- environment

function drawTree(ctx: Context, palette = ['#345d37', '#4c7e3e', '#659549', '#82ac57', '#547f40', '#a1c66b']): void {
  oval(ctx, '#3f5a33', 25, 57, 18, 5);
  rect(ctx, '#5b4532', 21, 28, 9, 29); rect(ctx, '#9a744a', 23, 28, 3, 28);
  rect(ctx, '#c49c62', 24, 33, 1, 22); rect(ctx, '#5f4a35', 18, 54, 16, 3);
  const clusters = [[15, 27, 13, 13], [33, 28, 13, 12], [24, 15, 17, 13], [24, 32, 17, 12]];
  for (const [x, y, rx, ry] of clusters) {
    oval(ctx, palette[0], x, y, rx, ry); oval(ctx, palette[1], x, y - 2, rx - 1, ry - 2);
    oval(ctx, palette[2], x - 2, y - 4, rx - 3, ry - 4);
    for (let py = y - ry + 3; py < y + ry - 3; py += 3) {
      for (let px = x - rx + 3; px < x + rx - 3; px += 3) {
        if ((px - x) ** 2 / rx ** 2 + (py - y) ** 2 / ry ** 2 > .65) continue;
        const n = hash(px, py);
        rect(ctx, n < 45 ? palette[3] : palette[4], px, py, 2, 1);
        if (n > 80) rect(ctx, palette[5], px, py - 1, 1, 1);
      }
    }
  }
}

function drawPalm(ctx: Context): void {
  oval(ctx, '#3f5a33', 22, 58, 14, 4);
  for (let y = 22; y < 58; y++) { const x = 20 + Math.round(Math.sin(y / 9) * 2); rect(ctx, y % 4 ? '#8a6a42' : '#6b5134', x, y, 5, 1); rect(ctx, '#b48d58', x + 1, y, 1, 1); }
  const fronds = [[-16, 6], [-12, -4], [-2, -10], [10, -6], [16, 4], [6, 10], [-8, 10]];
  for (const [dx, dy] of fronds) {
    for (let i = 0; i < 12; i++) {
      const x = 22 + dx * i / 12, y = 21 + dy * i / 12 + (i * i) / 40;
      rect(ctx, '#2f6a3a', x, y, 3, 2); rect(ctx, '#5fa04a', x, y, 2, 1);
    }
  }
  oval(ctx, '#7a5a32', 22, 22, 3, 2);
}

function drawBush(ctx: Context): void {
  oval(ctx, '#2c4a2e', 16, 16, 15, 9); oval(ctx, '#3f6a3a', 15, 13, 13, 8); oval(ctx, '#5a8a45', 12, 10, 8, 5);
  speckle(ctx, ['#7aa652', '#2f5530', '#94bf62'], 3, 5, 26, 18, 18, 5);
  rect(ctx, '#2a3f28', 4, 22, 24, 2);
}

function drawFern(ctx: Context): void {
  rect(ctx, '#597744', 3, 18, 15, 2);
  for (let i = 0; i < 6; i++) {
    rect(ctx, '#3f713c', 9 - i, 17 - i * 2, i + 2, 2); rect(ctx, '#3f713c', 10, 17 - i * 2, i + 2, 2);
    rect(ctx, '#92b76b', 7 - i, 16 - i * 2, 3, 1); rect(ctx, '#7da75c', 12 + i, 16 - i * 2, 3, 1);
  }
  rect(ctx, '#c1d58c', 9, 5, 1, 14);
}


function drawFlower(ctx: Context): void {
  rect(ctx, '#5a803d', 4, 5, 1, 7); rect(ctx, '#719648', 2, 9, 5, 2);
  for (const [x, y] of [[2, 2], [5, 2], [1, 4], [6, 4], [3, 6]]) rect(ctx, '#fff0ba', x, y, 3, 2);
  rect(ctx, '#eabb51', 4, 4, 2, 2);
}


function drawStump(ctx: Context): void {
  oval(ctx, '#4f4a3a', 10, 12, 10, 3);
  rect(ctx, '#6b4f36', 3, 4, 14, 9); rect(ctx, '#8a6644', 4, 5, 3, 7);
  oval(ctx, '#d9b77d', 10, 4, 7, 3); oval(ctx, '#b48d58', 10, 4, 4, 2); rect(ctx, '#8a6644', 9, 4, 2, 1);
  rect(ctx, '#e8d4a0', 0, 13, 3, 1); rect(ctx, '#e8d4a0', 17, 12, 3, 1);
}


function drawPerson(ctx: Context, shirt: string, shirtLight: string, hat: string, frame = 0, extra?: (ctx: Context) => void): void {
  rect(ctx, '#3d4a35', 3, 24, 13, 1);
  const step = frame === 1 ? 1 : 0;
  rect(ctx, '#4c524b', 5, 19, 3, 5 - step); rect(ctx, '#4c524b', 11, 19, 3, 4 + step);
  rect(ctx, '#5b4433', 5, 24 - step, 4, 1); rect(ctx, '#5b4433', 11, 23 + step, 4, 1);
  rect(ctx, shirt, 4, 11, 11, 9); rect(ctx, shirtLight, 7, 11, 5, 8);
  rect(ctx, '#b98d64', 3, 12, 2, 6); rect(ctx, '#b98d64', 14, 12, 2, 6);
  rect(ctx, '#6a4b36', 5, 3, 9, 7); rect(ctx, '#c9996c', 6, 5, 7, 6);
  rect(ctx, '#2f2a26', 7, 7, 1, 1); rect(ctx, '#2f2a26', 11, 7, 1, 1);
  rect(ctx, hat, 4, 2, 11, 3); rect(ctx, hat, 5, 1, 9, 3); rect(ctx, hat, 2, 4, 15, 2);
  extra?.(ctx);
}

function drawHunter(ctx: Context, frame: number): void {
  drawPerson(ctx, '#7a3a2e', '#a35242', '#3a3026', frame, c => {
    rect(c, '#fff6b0', 9, 2, 2, 2); // headlamp
    rect(c, '#2e2b28', 14, 15, 4, 3); rect(c, '#fff6b0', 17, 15, 1, 3); // flashlight in hand
    rect(c, '#5a4a32', 0, 13, 4, 7); rect(c, '#7a6646', 1, 14, 2, 4); // sack
    for (let y = 12; y < 20; y += 3) rect(c, '#5a2a22', 4, y, 11, 1); // plaid
  });
}

function drawPig(ctx: Context, frame: number): void {
  oval(ctx, '#3d4a35', 11, 14, 10, 2);
  const lift = frame ? 1 : 0;
  for (const x of [5, 9, 13, 16]) rect(ctx, '#3b2f2a', x, 10 + ((x + frame) % 2 ? lift : 0), 2, 4 - ((x + frame) % 2 ? lift : 0));
  oval(ctx, '#5a4840', 11, 7, 9, 5); oval(ctx, '#7a625a', 11, 6, 8, 3);
  speckle(ctx, ['#3b2f2a', '#8a726a'], 3, 2, 16, 8, 20, 9);
  rect(ctx, '#3b2f2a', 4, 2, 13, 1);
  rect(ctx, '#7a625a', 17, 5, 4, 4); rect(ctx, '#c99a8f', 20, 6, 2, 3); rect(ctx, '#5a3a35', 21, 7, 1, 1);
  rect(ctx, '#f0e6c8', 19, 9, 1, 2); rect(ctx, '#1b1512', 17, 5, 1, 1); rect(ctx, '#5a4840', 15, 2, 2, 2);
  rect(ctx, '#3b2f2a', 1, 5, 2, 1);
}


function drawVolcano(ctx: Context): void {
  for (let y = 6; y < 40; y++) {
    const half = Math.round(6 + (y - 6) * 0.85);
    rect(ctx, '#46403b', 30 - half, y, half * 2, 1);
    rect(ctx, '#6a625a', 30 - half + 2, y, Math.max(2, half - 2), 1);
    if (y % 5 === 0) rect(ctx, '#2f2a26', 30 - half / 2, y, 2, 1);
  }
  oval(ctx, '#2a2422', 30, 6, 7, 2); oval(ctx, '#d4501f', 30, 6, 5, 1); rect(ctx, '#ffd36a', 28, 6, 4, 1);
  for (let y = 8; y < 26; y++) if (y % 3) rect(ctx, y < 16 ? '#ff7a2a' : '#c04020', 31 + Math.round(Math.sin(y / 3) * 2), y, 1, 1);
  speckle(ctx, ['#8a8178', '#3a3430'], 6, 20, 48, 20, 12, 3);
}


function drawPool(ctx: Context): void {
  oval(ctx, '#7f7a6c', 26, 16, 26, 14); oval(ctx, '#c9c3b0', 26, 15, 25, 13); oval(ctx, '#9a958a', 26, 16, 22, 11);
  oval(ctx, '#2f7aa0', 26, 16, 20, 9); oval(ctx, '#4aa0c8', 25, 15, 18, 7);
  rect(ctx, '#9ad8f0', 14, 12, 8, 1); rect(ctx, '#9ad8f0', 30, 18, 6, 1); rect(ctx, '#c8f0ff', 18, 11, 3, 1);
  rect(ctx, '#e04a3a', 44, 9, 2, 3); rect(ctx, '#5a5a5a', 45, 5, 1, 5);
}

function drawSolar(ctx: Context): void {
  rect(ctx, '#5a5a5a', 4, 14, 2, 5); rect(ctx, '#5a5a5a', 16, 14, 2, 5);
  rect(ctx, '#c9c3b0', 0, 2, 22, 13); rect(ctx, '#24406a', 1, 3, 20, 11);
  for (let x = 1; x < 21; x += 5) rect(ctx, '#6a8ac0', x, 3, 1, 11);
  for (let y = 3; y < 14; y += 4) rect(ctx, '#6a8ac0', 1, y, 20, 1);
  rect(ctx, '#a8c8f0', 2, 4, 3, 1);
}


// ---------------------------------------------------------------- frogs and prey

const FROG = { dark: '#3b281c', leg: '#6e4a31', legLight: '#8f6142', band: '#3a2619', body: '#7b5034', bodyLight: '#9c6c46', top: '#b9875a', mark: '#4f3324', cream: '#ecd2a0', rust: '#b4562f', iris: '#d39a45', pupil: '#1d140e' };
type FrogPalette = typeof FROG;

/** Frog skins players can pick (same order as SKINS in src/data/looks.ts). The first is the real frog. */
export const SKIN_PALETTES: FrogPalette[] = [
  FROG,
  { dark: '#5a3a10', leg: '#c8902a', legLight: '#e8b040', band: '#8a5a10', body: '#e0a020', bodyLight: '#f8c848', top: '#ffe080', mark: '#a06a10', cream: '#fff4c0', rust: '#e86a20', iris: '#7a3a10', pupil: '#1d140e' },
  { dark: '#14142a', leg: '#2e2e5a', legLight: '#46468a', band: '#1a1a3a', body: '#34346a', bodyLight: '#4a4a94', top: '#7070c8', mark: '#22224a', cream: '#c8d0ff', rust: '#8a4ad0', iris: '#ffd84a', pupil: '#0a0a14' },
  { dark: '#3a0e14', leg: '#8a2430', legLight: '#b03440', band: '#5a141c', body: '#a82a36', bodyLight: '#d04450', top: '#f07a7a', mark: '#6a1820', cream: '#ffd8c8', rust: '#ffb030', iris: '#ffe070', pupil: '#1d0a0a' },
  { dark: '#14382a', leg: '#2e8a5a', legLight: '#46b07a', band: '#1a5a3a', body: '#3aa06a', bodyLight: '#5ac88a', top: '#9af0b8', mark: '#1f6a42', cream: '#e8ffe0', rust: '#e8c040', iris: '#e04a3a', pupil: '#0a1a10' },
  { dark: '#5a6070', leg: '#c8ccd8', legLight: '#e4e8f0', band: '#9aa0b0', body: '#dfe3ec', bodyLight: '#f4f6fa', top: '#ffffff', mark: '#a8aebc', cream: '#ffffff', rust: '#ff9ab0', iris: '#5ab0ff', pupil: '#1d2030' },
];
const SKIN_IDS = ['classic', 'golden', 'midnight', 'ruby', 'mint', 'snow'];

function drawFrog(ctx: Context, facing: string, frame: number, FROG: FrogPalette = SKIN_PALETTES[0]): void {
  const hop = frame === 2, crouch = frame === 1;
  if (facing === 'right') { ctx.translate(24, 0); ctx.scale(-1, 1); }
  const side = facing === 'left' || facing === 'right';
  const back = facing === 'up';
  const y = crouch ? 1 : 0;
  // Hind legs with dark bands and a rusty groin flash.
  for (const x of [3, 16]) {
    rect(ctx, FROG.dark, x, hop ? 17 : 15, 5, hop ? 4 : 5);
    rect(ctx, FROG.leg, x + (x === 3 ? 1 : 0), hop ? 16 : 15, 4, 4);
    rect(ctx, FROG.band, x + 1, hop ? 17 : 16, 1, 3); rect(ctx, FROG.band, x + 3, hop ? 17 : 16, 1, 3);
    rect(ctx, FROG.leg, x - 1, 20, 6, 1);
  }
  rect(ctx, FROG.rust, 6, 15 + y, 2, 2); rect(ctx, FROG.rust, 16, 15 + y, 2, 2);
  oval(ctx, FROG.dark, 12, 14 + y, 7, crouch ? 5 : 6);
  oval(ctx, FROG.body, 12, 13 + y, 6, crouch ? 4 : 5);
  oval(ctx, FROG.bodyLight, 12, 12 + y, 4, 3);
  // Dark flank markings.
  rect(ctx, FROG.mark, 6, 13 + y, 2, 2); rect(ctx, FROG.mark, 16, 12 + y, 2, 3); rect(ctx, FROG.mark, 10, 16 + y, 3, 1);
  // Head.
  oval(ctx, FROG.dark, side ? 10 : 12, 9 + y, 8, 5);
  oval(ctx, FROG.body, side ? 10 : 12, 8 + y, 7, 4);
  rect(ctx, FROG.top, 8, 6 + y, 7, 2);
  if (!back) rect(ctx, FROG.cream, side ? 3 : 6, 11 + y, side ? 8 : 12, 1); // pale lip line
  for (const x of side ? [5, 12] : [6, 14]) {
    rect(ctx, FROG.dark, x, 3 + y, 5, 6);
    rect(ctx, FROG.bodyLight, x + 1, 3 + y, 4, 5);
    if (!back) {
      rect(ctx, FROG.iris, x + 1, 4 + y, 3, 3);
      if (frame === 3) rect(ctx, FROG.mark, x + 1, 4 + y, 3, 3);
      else { rect(ctx, FROG.pupil, x + 2, 5 + y, 2, 1); rect(ctx, '#fff6d8', x + 1, 4 + y, 1, 1); rect(ctx, '#f0c070', x + 3, 4 + y, 1, 1); }
    }
  }
  if (!back) rect(ctx, FROG.mark, side ? 4 : 7, 10 + y, side ? 6 : 10, 1);
  if (frame === 4 && !back) { // mouth wide open, tongue out
    rect(ctx, '#4a1414', side ? 3 : 7, 10 + y, side ? 7 : 10, 3); rect(ctx, '#e86a8a', side ? 3 : 9, 11 + y, side ? 4 : 6, 2); rect(ctx, '#ffa0b8', side ? 3 : 11, 11 + y, 2, 1);
  }
  rect(ctx, FROG.mark, 3, 8 + y, 2, 2); rect(ctx, FROG.mark, 19, 8 + y, 2, 2); // mask behind the eyes
  rect(ctx, FROG.legLight, 4, 13 + y, 2, 3); rect(ctx, FROG.legLight, 18, 13 + y, 2, 3);
}

function drawCricket(ctx: Context, frame: number): void {
  const kick = frame === 1;
  rect(ctx, '#2e2418', 2, 8, 9, 1);
  line(ctx, '#4a3620', 4, 6, kick ? 0 : 1, kick ? 2 : 5); line(ctx, '#4a3620', kick ? 0 : 1, kick ? 2 : 5, kick ? 1 : 0, 8);
  oval(ctx, '#5c4226', 6, 5, 4, 2); rect(ctx, '#8f6a3e', 4, 4, 5, 1);
  rect(ctx, '#3b2a18', 10, 4, 2, 3); rect(ctx, '#fff2c0', 11, 4, 1, 1);
  line(ctx, '#3b2a18', 11, 3, 13, 0); line(ctx, '#3b2a18', 12, 4, 14, 1);
  rect(ctx, '#3b2a18', 6, 7, 1, 2); rect(ctx, '#3b2a18', 8, 7, 1, 2);
}
function drawBeetle(ctx: Context): void {
  oval(ctx, '#1a2418', 5, 5, 4, 4); oval(ctx, '#2e4a2a', 5, 5, 3, 3); rect(ctx, '#6f9f4a', 3, 3, 2, 1); rect(ctx, '#1a2418', 5, 2, 1, 6);
  rect(ctx, '#1a2418', 4, 0, 3, 2); for (const y of [3, 5, 7]) { rect(ctx, '#1a2418', 0, y, 1, 1); rect(ctx, '#1a2418', 9, y, 1, 1); }
}
function drawMillipede(ctx: Context): void {
  for (let i = 0; i < 7; i++) { rect(ctx, i % 2 ? '#8a3e2a' : '#6a2e22', 1 + i * 2, 1, 2, 3); rect(ctx, '#2e1a14', 1 + i * 2, 4, 1, 1); rect(ctx, '#c86a4a', 1 + i * 2, 1, 1, 1); }
  rect(ctx, '#3a1e16', 15, 1, 1, 3); rect(ctx, '#3a1e16', 0, 0, 1, 1);
}
function drawSnail(ctx: Context): void {
  rect(ctx, '#c8b8a0', 0, 6, 10, 2); rect(ctx, '#c8b8a0', 8, 3, 2, 3); rect(ctx, '#3a3020', 9, 2, 1, 1);
  oval(ctx, '#8a5e30', 4, 4, 4, 3); oval(ctx, '#e0b070', 4, 4, 3, 2); rect(ctx, '#8a5e30', 4, 4, 1, 1); rect(ctx, '#b8874a', 3, 3, 1, 1);
}
function drawCrab(ctx: Context): void {
  for (const x of [1, 3, 10, 12]) rect(ctx, '#5a1f30', x, 7, 1, 3);
  oval(ctx, '#7a2a40', 7, 6, 5, 3); oval(ctx, '#b8466a', 7, 5, 4, 2); rect(ctx, '#e07a9a', 5, 4, 3, 1);
  rect(ctx, '#b8466a', 0, 3, 3, 3); rect(ctx, '#b8466a', 11, 3, 3, 3); rect(ctx, '#e8a0b0', 0, 3, 1, 1); rect(ctx, '#e8a0b0', 13, 3, 1, 1);
  rect(ctx, '#2a1218', 5, 1, 1, 2); rect(ctx, '#2a1218', 8, 1, 1, 2);
}

function thick(ctx: Context, color: string, x0: number, y0: number, x1: number, y1: number, r: number): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) oval(ctx, color, x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, r, r);
}

/** A big side-view field-guide portrait (for cards and the title). Faces left. */
function drawPortrait(ctx: Context): void {
  oval(ctx, '#00000030', 38, 48, 31, 3);
  // Hind leg: banded thigh folded against the body, shank and long toes on the ground.
  oval(ctx, FROG.dark, 51, 36, 15, 10); oval(ctx, FROG.leg, 51, 35, 13, 8); oval(ctx, FROG.legLight, 50, 31, 9, 3);
  for (const x of [43, 48, 53, 58]) for (let y = 28; y < 43; y++) if (((x - 51) / 13) ** 2 + ((y - 35) / 8) ** 2 < 1) rect(ctx, FROG.band, x, y, 2, 1);
  thick(ctx, FROG.dark, 36, 45, 63, 43, 3); thick(ctx, FROG.leg, 37, 44, 62, 42, 2);
  for (const x of [41, 48, 55]) rect(ctx, FROG.band, x, 42, 2, 4);
  for (let i = 0; i < 4; i++) { thick(ctx, FROG.dark, 37 - i, 46, 24 + i * 3, 47, 1); }
  // Body.
  oval(ctx, FROG.dark, 36, 30, 21, 14); oval(ctx, FROG.body, 36, 29, 20, 13);
  oval(ctx, FROG.bodyLight, 35, 24, 16, 6); oval(ctx, FROG.top, 33, 19, 10, 2);
  oval(ctx, '#6a4430', 38, 37, 17, 5); // shaded underside
  rect(ctx, FROG.cream, 22, 41, 22, 2); // pale belly edge
  oval(ctx, FROG.rust, 49, 38, 5, 3); oval(ctx, '#d0703a', 48, 37, 2, 1); // rusty groin
  for (const [x, y, w, h] of [[30, 27, 4, 2], [40, 25, 3, 2], [45, 31, 4, 2], [34, 33, 3, 2], [26, 31, 2, 2], [50, 27, 2, 2]]) oval(ctx, FROG.mark, x, y, w, h);
  line(ctx, '#c9965e', 22, 19, 54, 22); // dorsolateral fold
  // Head.
  oval(ctx, FROG.dark, 16, 28, 13, 9); oval(ctx, FROG.body, 16, 27, 12, 8); oval(ctx, FROG.bodyLight, 15, 23, 8, 3);
  oval(ctx, FROG.body, 6, 30, 5, 4); oval(ctx, FROG.dark, 3, 31, 2, 2); rect(ctx, FROG.dark, 2, 29, 1, 1); // snout and nostril
  oval(ctx, '#d9b888', 14, 34, 8, 1); // throat
  thick(ctx, FROG.mark, 7, 27, 12, 24, 1); thick(ctx, FROG.mark, 20, 23, 28, 27, 1); // dark mask through the eye
  oval(ctx, '#5e3d2a', 25, 26, 3, 3); oval(ctx, '#7a5236', 25, 26, 2, 2); // eardrum
  rect(ctx, FROG.cream, 3, 31, 21, 1); rect(ctx, FROG.dark, 2, 32, 22, 1); // pale lip, mouth line
  // Eye, bulging above the head line.
  oval(ctx, FROG.dark, 16, 21, 5, 4); oval(ctx, FROG.iris, 16, 21, 4, 3); oval(ctx, '#e8b860', 15, 20, 2, 1);
  rect(ctx, FROG.pupil, 14, 21, 5, 1); rect(ctx, FROG.pupil, 15, 22, 3, 1); rect(ctx, '#fff6d8', 14, 19, 2, 1);
  rect(ctx, FROG.dark, 12, 17, 8, 1); rect(ctx, FROG.body, 13, 16, 6, 1); // brow
  // Front leg: muscular forearm, hand flat on the ground, dark thumb spur.
  thick(ctx, FROG.dark, 24, 34, 21, 41, 3); thick(ctx, FROG.leg, 24, 34, 21, 41, 2);
  thick(ctx, FROG.dark, 21, 41, 17, 45, 3); thick(ctx, FROG.legLight, 21, 40, 18, 44, 2);
  for (const x of [11, 14, 17, 20]) rect(ctx, FROG.leg, x, 46, 3, 2);
  rect(ctx, '#1d140e', 15, 44, 2, 2);
  speckle(ctx, ['#5a3a26', '#a8784e'], 18, 18, 38, 18, 7, 4);
}

/** Jump-scare: a hunter's face lit by a headlamp, filling the screen. */
function drawScare(ctx: Context): void {
  rect(ctx, '#050707', 0, 0, 80, 45);
  for (let x = 0; x < 80; x += 2) { const h = 6 + hash(x, 3) % 9; rect(ctx, '#0c1a10', x, 45 - h, 2, h); rect(ctx, '#0c1a10', x, 0, 2, 3 + hash(x, 9) % 5); }
  oval(ctx, '#1a1410', 40, 30, 25, 20); // shoulders
  oval(ctx, '#2a1d16', 40, 27, 18, 21);
  oval(ctx, '#4a3326', 40, 28, 16, 18); oval(ctx, '#6a4a36', 40, 33, 12, 12); oval(ctx, '#8a6248', 40, 37, 8, 6); // lit from below
  rect(ctx, '#140f0c', 14, 8, 52, 3); rect(ctx, '#1d1712', 24, 0, 32, 9); rect(ctx, '#2c241c', 25, 6, 30, 2); // hat
  oval(ctx, '#fff3b0', 40, 7, 6, 4); oval(ctx, '#ffffff', 40, 7, 4, 2); // headlamp
  for (const [x, y] of [[30, 4], [50, 4], [33, 1], [47, 1], [26, 9], [54, 9]]) rect(ctx, '#fff3b099', x, y, 2, 1);
  for (const x of [31, 49]) {
    oval(ctx, '#0a0605', x, 22, 6, 4); oval(ctx, '#e8e0d0', x, 22, 5, 3); oval(ctx, '#c84a3a', x + (x < 40 ? 1 : -1), 22, 2, 2);
    rect(ctx, '#0a0605', x + (x < 40 ? 0 : -1), 21, 2, 2); rect(ctx, '#ffffff', x - 2, 20, 1, 1);
    line(ctx, '#1a100c', x - 6, x < 40 ? 16 : 19, x + 5, x < 40 ? 19 : 16); // angled brows
  }
  oval(ctx, '#1a0e0a', 40, 36, 12, 4); // grin
  for (let x = 30; x < 51; x += 3) rect(ctx, x % 2 ? '#e8dcb8' : '#cfc49a', x, 34 + (hash(x, 1) % 2), 2, 3);
  rect(ctx, '#3a1a14', 32, 39, 16, 1);
  // A hand reaching in from the corner.
  oval(ctx, '#5a3e2e', 12, 40, 12, 9); oval(ctx, '#7a5640', 13, 38, 9, 6);
  for (const [x, len] of [[5, 10], [10, 13], [15, 13], [20, 11]]) { rect(ctx, '#5a3e2e', x, 32 - len, 4, len); rect(ctx, '#8a6248', x + 1, 32 - len, 2, len - 2); rect(ctx, '#c8a888', x + 1, 32 - len, 2, 1); }
  rect(ctx, '#5a3e2e', 22, 34, 8, 4);
}

/** The frog portrait with its mouth wide open (tongue out) or gulping (throat bulging, chicken feet poking out). */
function drawPortraitMouth(ctx: Context, state: 'open' | 'full'): void {
  drawPortrait(ctx);
  if (state === 'open') {
    for (let x = 2; x < 24; x++) { const depth = Math.max(1, Math.round((24 - x) / 4)); rect(ctx, '#4a1414', x, 32, 1, depth + 1); }
    rect(ctx, '#7a2424', 3, 33, 12, 2); rect(ctx, '#e86a8a', 3, 34, 9, 2); rect(ctx, '#ffa0b8', 4, 34, 4, 1);
    rect(ctx, FROG.cream, 2, 31, 22, 1);
  } else {
    oval(ctx, FROG.dark, 15, 37, 11, 6); oval(ctx, '#d9b888', 15, 37, 10, 5); oval(ctx, '#f0d8a8', 13, 36, 6, 2);
    for (const [x, top] of [[6, 23], [11, 25]]) { // two chicken feet sticking out of the mouth
      rect(ctx, '#c07818', x, top + 2, 3, 32 - top - 2); rect(ctx, '#e8a030', x, top + 2, 2, 32 - top - 2);
      rect(ctx, '#e8a030', x - 2, top, 2, 2); rect(ctx, '#e8a030', x, top - 1, 2, 3); rect(ctx, '#e8a030', x + 2, top, 2, 2);
    }
  }
}

/** A plump farm chicken, facing right. 0 stand, 1 step, 2 peck, 3 startled. */
function drawChicken(ctx: Context, frame: number): void {
  const peck = frame === 2, startled = frame === 3;
  oval(ctx, '#00000033', 11, 21, 8, 1);
  const legs = frame === 1 ? [[9, 0], [13, 1]] : [[9, 1], [13, 0]];
  for (const [x, lift] of legs) { rect(ctx, '#d88a20', x, 16, 1, 5 - lift); rect(ctx, '#d88a20', x - 1, 20 - lift, 3, 1); }
  oval(ctx, '#6a5a4a', 4, 9, 3, 5); oval(ctx, '#ffffff', 4, 8, 2, 4); rect(ctx, '#d8d0c0', 3, 6, 1, 4); // tail
  oval(ctx, '#6a5a4a', 11, 12, 8, 6); oval(ctx, '#ffffff', 11, 11, 7, 5); oval(ctx, '#e4ddd0', 11, 14, 6, 2);
  if (startled) { oval(ctx, '#6a5a4a', 8, 7, 4, 3); oval(ctx, '#f4f0e8', 8, 7, 3, 2); } else { oval(ctx, '#d8d0c0', 10, 12, 4, 2); rect(ctx, '#bfb6a6', 8, 13, 5, 1); } // wing
  const hx = peck ? 18 : 16, hy = peck ? 12 : startled ? 3 : 5;
  oval(ctx, '#6a5a4a', hx, hy, 4, 4); oval(ctx, '#ffffff', hx, hy, 3, 3);
  rect(ctx, '#d8302a', hx - 2, hy - 5, 2, 2); rect(ctx, '#d8302a', hx, hy - 6, 2, 3); rect(ctx, '#e84a3a', hx + 2, hy - 5, 1, 2); // comb
  rect(ctx, '#f0b030', hx + 3, hy, 3, 1); rect(ctx, '#c8881a', hx + 3, hy + 1, 2, 1); // beak
  rect(ctx, '#d8302a', hx + 2, hy + 2, 1, 2); // wattle
  rect(ctx, '#1d140e', hx + 1, hy - 1, 1, startled ? 2 : 1);
  if (startled) rect(ctx, '#ffffff', hx + 1, hy - 2, 1, 1);
}

function drawFeather(ctx: Context): void {
  rect(ctx, '#ffffff', 1, 0, 4, 2); rect(ctx, '#ffffff', 0, 1, 5, 2); rect(ctx, '#d8d0c0', 1, 3, 3, 1); line(ctx, '#a89880', 0, 3, 5, 0);
}

/** A wooden cage trap left by a hunter. Open: door propped up on a stick. */
function drawTrap(ctx: Context, shut: boolean): void {
  oval(ctx, '#00000044', 9, 15, 9, 2);
  rect(ctx, '#5a3a20', 1, 13, 17, 3); rect(ctx, '#8a6a3a', 1, 13, 17, 1);
  rect(ctx, '#3a3a3a', 1, 2, 17, 2); rect(ctx, '#7a7a7a', 1, 2, 17, 1);
  for (let x = 1; x < 18; x += 4) { rect(ctx, '#3a3a3a', x, 3, 1, 10); rect(ctx, '#9a9a9a', x + 1, 3, 1, 10); }
  if (shut) { rect(ctx, '#6a4a2a', 4, 4, 11, 9); for (let y = 5; y < 13; y += 3) rect(ctx, '#4a3018', 4, y, 11, 1); }
  else { line(ctx, '#8a6a3a', 9, 12, 12, 6); rect(ctx, '#6a4a2a', 9, 0, 9, 2); rect(ctx, '#8a6a3a', 10, 0, 7, 1); }
}

/** The secret scare: a hollow-eyed face in the dark, portrait-shaped to fill a phone. */
function drawShock(ctx: Context): void {
  rect(ctx, '#020203', 0, 0, 60, 90);
  for (let y = 0; y < 90; y++) for (let x = 0; x < 60; x++) {
    const edge = Math.max(Math.abs(x - 30) / 30, Math.abs(y - 45) / 45);
    if (edge > .82 && hash(x, y) < (edge - .82) * 400) rect(ctx, '#3a0606', x, y, 1, 1);
  }
  for (let x = 4; x < 56; x += 2) { const h = 20 + hash(x, 5) % 40; rect(ctx, '#0a0a0c', x, 4, 2, h); } // hair behind
  oval(ctx, '#3a4038', 30, 48, 21, 31); oval(ctx, '#8a9282', 30, 47, 19, 29); oval(ctx, '#b4bba8', 30, 44, 15, 24); oval(ctx, '#cdd3bf', 29, 40, 10, 14);
  oval(ctx, '#6a7262', 15, 58, 4, 8); oval(ctx, '#6a7262', 45, 58, 4, 8); // sunken cheeks
  for (const x of [14, 22, 28, 36, 44]) { const len = 14 + hash(x, 2) % 22; rect(ctx, '#050506', x, 14, 3 + hash(x, 7) % 3, len); } // hair over the face
  for (const x of [19, 41]) {
    oval(ctx, '#2a2e28', x, 39, 8, 9); oval(ctx, '#000000', x, 40, 7, 8);
    rect(ctx, '#ff2a1a', x - 1, 40, 2, 2); rect(ctx, '#ffffff', x, 40, 1, 1);
    for (let y = 48; y < 64 + hash(x, 1) % 10; y++) rect(ctx, '#0a0a0a', x - 1 + (y % 5 === 0 ? 1 : 0), y, 2, 1); // black tears
  }
  oval(ctx, '#2a2e28', 30, 50, 2, 3); rect(ctx, '#000000', 29, 51, 1, 2); rect(ctx, '#000000', 31, 51, 1, 2);
  oval(ctx, '#1a0606', 30, 66, 10, 12); oval(ctx, '#000000', 30, 67, 8, 10); oval(ctx, '#3a0808', 30, 71, 5, 4);
  for (let x = 23; x < 37; x += 3) { rect(ctx, '#e8e0c0', x, 57 + hash(x, 3) % 2, 2, 3); rect(ctx, '#e8e0c0', x + 1, 73 + hash(x, 4) % 2, 2, 3); }
  line(ctx, '#4a524a', 24, 22, 27, 30); line(ctx, '#4a524a', 38, 26, 35, 33); line(ctx, '#4a524a', 12, 46, 9, 54);
}

/**
 * The hidden cave: a mossy stone arch with hanging vines, glowing mushrooms and crystals deep in
 * its black mouth. (A pair of eyes blinks in there now and then: that's a separate sprite.)
 */
function drawCave(ctx: Context): void {
  oval(ctx, '#00000038', 34, 45, 32, 4);
  // Rock mound, darker at the base.
  oval(ctx, '#2e3530', 34, 30, 32, 17); oval(ctx, '#46504a', 33, 27, 29, 15); oval(ctx, '#5c6860', 31, 22, 22, 11); oval(ctx, '#74817a', 28, 17, 13, 6);
  speckle(ctx, ['#2e3530', '#86948a', '#3c463f'], 4, 12, 60, 32, 18, 11);
  for (const [x, y] of [[12, 30], [52, 26], [20, 18], [46, 16], [8, 38], [60, 37]]) { rect(ctx, '#2a302c', x, y, 4, 1); rect(ctx, '#8a988e', x, y - 1, 3, 1); }
  // Thick moss on top, dripping down the sides.
  oval(ctx, '#3f6a32', 32, 13, 22, 6); oval(ctx, '#5a8a3e', 31, 11, 18, 4); oval(ctx, '#7fb04e', 27, 10, 9, 2);
  for (const [x, len] of [[12, 7], [17, 10], [22, 5], [42, 8], [48, 11], [53, 6]]) { rect(ctx, '#3f6a32', x, 14, 2, len); rect(ctx, '#5a8a3e', x, 14, 1, len - 2); }
  speckle(ctx, ['#9ac85a', '#2f5528'], 12, 7, 40, 8, 26, 3);
  // The mouth: an arch of stones around deep darkness.
  oval(ctx, '#232824', 34, 36, 15, 13); rect(ctx, '#232824', 19, 36, 31, 10);
  oval(ctx, '#0c0d12', 34, 37, 12, 11); rect(ctx, '#0c0d12', 22, 37, 25, 9);
  oval(ctx, '#050508', 34, 39, 9, 8); rect(ctx, '#050508', 25, 39, 19, 7);
  for (let a = 0; a <= 8; a++) { const t = Math.PI * a / 8; const x = 34 - Math.cos(t) * 15, y = 37 - Math.sin(t) * 13; rect(ctx, '#7a867e', x - 1, y - 1, 3, 2); rect(ctx, '#a8b4aa', x - 1, y - 1, 2, 1); }
  // Crystals glinting deep inside.
  for (const [x, y, c] of [[29, 41, '#7a5ad8'], [38, 42, '#4ad0d0'], [33, 43, '#b08aff']] as [number, number, string][]) { rect(ctx, c, x, y - 2, 1, 3); rect(ctx, c, x - 1, y, 3, 1); rect(ctx, '#ffffff', x, y - 1, 1, 1); }
  // Vines hanging over the mouth.
  for (const [x, len] of [[24, 12], [28, 7], [37, 9], [42, 14], [46, 6]]) {
    for (let y = 22; y < 22 + len; y++) rect(ctx, y % 3 ? '#3f7a2a' : '#5a9a3a', x + (y % 4 === 0 ? 1 : 0), y, 1, 1);
    rect(ctx, '#7ac04a', x - 1, 22 + len - 1, 2, 2);
  }
  // Ferns and glowing mushrooms at the foot.
  for (const [x, flip] of [[10, 1], [58, -1]]) for (let i = 0; i < 5; i++) { rect(ctx, '#3f713c', x + flip * i, 44 - i * 2, 2, 2); rect(ctx, '#7da75c', x + flip * (i + 1), 43 - i * 2, 2, 1); }
  for (const [x, y, s] of [[17, 44, 2], [21, 46, 1], [50, 44, 2], [54, 46, 1], [47, 46, 1]]) {
    rect(ctx, '#d8f0e8', x, y - s, 1, s + 1); oval(ctx, '#2ab0a0', x, y - s - 1, s + 1, 1); rect(ctx, '#9affea', x - 1, y - s - 2, 1, 1); rect(ctx, '#e8fff8', x + 1, y - s - 1, 1, 1);
  }
}

/** Two eyes in the dark of the cave. */
function drawCaveEyes(ctx: Context): void { rect(ctx, '#ff2a1a', 0, 0, 2, 1); rect(ctx, '#ff2a1a', 6, 0, 2, 1); rect(ctx, '#ff8a6a', 0, 0, 1, 1); rect(ctx, '#ff8a6a', 6, 0, 1, 1); }

/** Little glowing mushrooms (they lead the way to the cave, if you notice them). */
function drawGlowShrooms(ctx: Context): void {
  for (const [x, h, r] of [[3, 4, 2], [7, 2, 1], [10, 3, 2]]) {
    rect(ctx, '#e0f4ec', x, 9 - h, 1, h); oval(ctx, '#1f8a80', x, 8 - h, r + 1, 1); oval(ctx, '#3ad0c0', x, 8 - h, r, 1); rect(ctx, '#c8fff4', x - 1, 8 - h, 1, 1);
  }
}

function drawShrooms(ctx: Context): void {
  for (const [x, h, r] of [[3, 3, 2], [8, 4, 3]]) { rect(ctx, '#f0e4c8', x, 9 - h, 2, h); oval(ctx, '#a02a1a', x + 1, 8 - h, r + 1, 2); rect(ctx, '#fff6dc', x, 7 - h, 1, 1); rect(ctx, '#fff6dc', x + 2, 8 - h, 1, 1); }
}

function drawRock(ctx: Context, big: boolean): void {
  if (big) {
    oval(ctx, '#00000033', 12, 15, 11, 2);
    oval(ctx, '#4a4e48', 11, 9, 10, 7); oval(ctx, '#6c726a', 10, 7, 8, 5); oval(ctx, '#8c938a', 8, 5, 4, 2);
    speckle(ctx, ['#3a3e38', '#9aa298'], 2, 3, 19, 12, 14, 2);
    oval(ctx, '#5a8a3e', 12, 3, 4, 1); rect(ctx, '#7fb04e', 10, 2, 3, 1);
  } else {
    oval(ctx, '#00000033', 6, 7, 6, 1);
    oval(ctx, '#55594f', 6, 4, 5, 3); oval(ctx, '#7c8378', 5, 3, 3, 1);
  }
}

function drawLilypad(ctx: Context, flower: boolean): void {
  oval(ctx, '#2f6a32', 6, 5, 6, 3); oval(ctx, '#4f9a3e', 6, 4, 5, 2); rect(ctx, '#2f6a32', 6, 3, 1, 2); rect(ctx, '#7ac05a', 3, 3, 2, 1);
  if (flower) { rect(ctx, '#ffffff', 7, 1, 3, 2); rect(ctx, '#ffb0d0', 6, 2, 1, 1); rect(ctx, '#ffb0d0', 10, 2, 1, 1); rect(ctx, '#ffe070', 8, 2, 1, 1); }
}

function drawReeds(ctx: Context): void {
  for (const [x, h] of [[1, 12], [3, 16], [5, 10], [7, 14], [9, 9]]) { rect(ctx, '#4a7a32', x, 18 - h, 1, h); rect(ctx, '#7aa84a', x, 18 - h + 2, 1, 2); }
  for (const x of [3, 7]) { rect(ctx, '#6a4426', x, 3, 2, 4); rect(ctx, '#8a5a32', x, 3, 1, 3); }
}

/** A plank bridge over the stream (planks run across the water). */
function drawBridge(ctx: Context): void {
  oval(ctx, '#00000030', 20, 12, 20, 2);
  for (let x = 2; x < 38; x += 3) { rect(ctx, '#6a4a2a', x, 2, 3, 9); rect(ctx, '#9a6e40', x, 2, 2, 8); rect(ctx, '#c49a62', x, 3, 1, 6); }
  rect(ctx, '#4a321c', 0, 1, 40, 2); rect(ctx, '#4a321c', 0, 10, 40, 2); rect(ctx, '#7a5430', 0, 1, 40, 1);
  for (const x of [0, 19, 38]) { rect(ctx, '#3a2614', x, 0, 2, 13); }
}

function drawStones(ctx: Context): void {
  for (const [x, y, r] of [[4, 5, 4], [13, 4, 4], [21, 6, 4], [29, 4, 3]]) { oval(ctx, '#2a3a40', x, y + 1, r, 2); oval(ctx, '#8a908a', x, y, r, 2); oval(ctx, '#b0b8b0', x - 1, y - 1, r - 2, 1); }
}

function drawLog(ctx: Context): void {
  oval(ctx, '#00000030', 15, 9, 15, 2);
  rect(ctx, '#5a3e26', 2, 2, 26, 6); rect(ctx, '#7a5634', 2, 3, 26, 2); rect(ctx, '#3e2a18', 2, 7, 26, 1);
  oval(ctx, '#c49a62', 2, 5, 2, 3); oval(ctx, '#8a6a42', 2, 5, 1, 1);
  for (const x of [8, 15, 22]) rect(ctx, '#4a321c', x, 3, 3, 1);
  oval(ctx, '#5a8a3e', 18, 2, 4, 1); rect(ctx, '#d8c070', 11, 1, 2, 1);
}

/** The research station: a little hut with a tin roof (the scientists counting frogs). */
function drawHut(ctx: Context): void {
  oval(ctx, '#00000038', 20, 33, 20, 3);
  rect(ctx, '#7a5634', 4, 14, 32, 18); rect(ctx, '#9a6e40', 5, 15, 30, 16);
  for (let y = 17; y < 31; y += 3) rect(ctx, '#7a5634', 5, y, 30, 1);
  rect(ctx, '#3a2a1c', 23, 20, 8, 12); rect(ctx, '#5a3e26', 24, 21, 6, 11); rect(ctx, '#d8b060', 29, 26, 1, 1);
  rect(ctx, '#3a2a1c', 8, 19, 10, 8); rect(ctx, '#9ad8f0', 9, 20, 8, 6); rect(ctx, '#ffffff', 10, 21, 3, 1); rect(ctx, '#3a2a1c', 12, 20, 1, 6);
  for (let i = 0; i < 9; i++) rect(ctx, i % 2 ? '#a8b0b8' : '#8a929a', 1 + i, 13 - i, 38 - i * 2, 1);
  rect(ctx, '#6a7278', 1, 13, 38, 1);
  rect(ctx, '#5a5a5a', 31, 0, 1, 7); rect(ctx, '#e04a3a', 30, 0, 3, 1);
  rect(ctx, '#3f6a4a', 12, 28, 3, 4); // a field notebook crate
}

/** A big leafy bush a frog can hide inside. */
function drawHideBush(ctx: Context): void {
  oval(ctx, '#00000033', 18, 24, 17, 3);
  oval(ctx, '#1f3a22', 18, 15, 18, 11); oval(ctx, '#2c5230', 12, 13, 11, 9); oval(ctx, '#2c5230', 25, 12, 10, 9);
  oval(ctx, '#3f6f3a', 17, 10, 13, 8); oval(ctx, '#4f8a44', 13, 8, 8, 5); oval(ctx, '#4f8a44', 24, 9, 7, 5);
  speckle(ctx, ['#6aa852', '#24442a', '#8cc464', '#36603a'], 1, 3, 35, 20, 30, 17);
  for (const [x, y] of [[6, 18], [30, 17], [15, 21], [24, 20]]) { rect(ctx, '#2c5230', x, y, 3, 3); rect(ctx, '#4f8a44', x, y, 2, 1); }
  for (const [x, y] of [[9, 6], [27, 8], [19, 4]]) { rect(ctx, '#e04a6a', x, y, 2, 2); rect(ctx, '#ffd0dc', x, y, 1, 1); }
}

/** A fallen, hollow log: frogs crawl inside. */
function drawHollowLog(ctx: Context): void {
  oval(ctx, '#00000033', 16, 12, 16, 2);
  rect(ctx, '#4a321c', 3, 2, 26, 10); rect(ctx, '#6e4a2a', 3, 3, 26, 3); rect(ctx, '#3a2614', 3, 10, 26, 2);
  for (const x of [8, 14, 20, 25]) rect(ctx, '#3a2614', x, 4, 2, 1);
  oval(ctx, '#7a5634', 3, 7, 3, 5); oval(ctx, '#140c08', 3, 7, 2, 4); // the dark hole at the front
  oval(ctx, '#8a6644', 29, 7, 3, 5); oval(ctx, '#c49a62', 29, 7, 2, 3); rect(ctx, '#8a6644', 29, 7, 1, 1);
  oval(ctx, '#4f8a44', 16, 2, 6, 1); rect(ctx, '#7ac05a', 12, 1, 4, 1); rect(ctx, '#d8c070', 22, 1, 2, 1);
}

/** A patch of tall grass. */
function drawTallGrass(ctx: Context): void {
  oval(ctx, '#3a5a2a', 20, 16, 19, 2);
  for (let x = 1; x < 39; x += 2) {
    const h = 9 + (hash(x, 3) % 8);
    const lean = hash(x, 7) % 3 - 1;
    for (let y = 0; y < h; y++) rect(ctx, y < 3 ? '#c8d070' : x % 4 ? '#5a8a3a' : '#7aa84a', x + Math.round(lean * y / h), 17 - y, 1, 1);
  }
}

function drawTent(ctx: Context): void {
  oval(ctx, '#00000038', 15, 24, 15, 2);
  for (let y = 2; y < 24; y++) { const half = Math.round((y - 2) * .62); rect(ctx, '#5a6a3a', 15 - half, y, half * 2 + 1, 1); rect(ctx, '#7a8a4a', 15 - half, y, half, 1); }
  for (let y = 10; y < 24; y++) { const half = Math.round((y - 10) * .36); rect(ctx, '#1a140e', 15 - half, y, half * 2 + 1, 1); }
  rect(ctx, '#3a2a1a', 15, 0, 1, 3); rect(ctx, '#c84a2a', 16, 0, 3, 2);
  rect(ctx, '#3a2a1a', 1, 23, 2, 2); rect(ctx, '#3a2a1a', 28, 23, 2, 2);
}

/** The hunters' wooden cage, where caught frogs wait. */
function drawJail(ctx: Context): void {
  oval(ctx, '#00000040', 17, 25, 17, 2);
  rect(ctx, '#3a2614', 1, 22, 32, 3); rect(ctx, '#6a4a2a', 1, 22, 32, 1);
  rect(ctx, '#3a2614', 1, 1, 32, 3); rect(ctx, '#8a6a3a', 1, 1, 32, 1);
  for (let x = 1; x < 34; x += 4) { rect(ctx, '#3a2614', x, 3, 2, 19); rect(ctx, '#8a6a3a', x, 3, 1, 19); }
  rect(ctx, '#3a2614', 1, 12, 32, 1);
  rect(ctx, '#9a9aa0', 16, 10, 3, 4); rect(ctx, '#d0d0d8', 16, 10, 1, 1); // padlock
}

function drawCampfire(ctx: Context, frame: number): void {
  oval(ctx, '#00000040', 9, 11, 9, 2);
  for (const [x, y] of [[2, 9], [6, 10], [11, 10], [15, 9]]) { rect(ctx, '#6a6a64', x, y, 3, 2); rect(ctx, '#9a9a90', x, y, 2, 1); }
  rect(ctx, '#5a3a20', 3, 8, 12, 2); rect(ctx, '#7a5430', 5, 7, 8, 1);
  const flames = frame ? [[6, 3, 2], [9, 1, 3], [12, 4, 2]] : [[6, 2, 3], [9, 3, 2], [11, 1, 2]];
  for (const [x, top, w] of flames) { rect(ctx, '#e8501a', x, top + 2, w + 1, 7 - top); rect(ctx, '#ffb030', x + 1, top + 3, w - 1, 5 - top); rect(ctx, '#fff0a0', x + 1, top + 5, 1, 2); }
}

/** A big black cooking pot (the frogs know what that's for). */
function drawPot(ctx: Context): void {
  rect(ctx, '#2a2a2a', 0, 3, 24, 2); // rim
  oval(ctx, '#1a1a1a', 12, 10, 11, 7); oval(ctx, '#2e2e30', 11, 9, 9, 5); rect(ctx, '#4a4a4e', 4, 7, 2, 4);
  rect(ctx, '#3a3a3a', 0, 4, 24, 1);
  oval(ctx, '#7a9a3a', 12, 3, 10, 1); rect(ctx, '#a8c860', 6, 3, 3, 1); rect(ctx, '#a8c860', 15, 3, 2, 1); // soup
  rect(ctx, '#1a1a1a', 4, 16, 2, 2); rect(ctx, '#1a1a1a', 18, 16, 2, 2);
}

/** The boulder that blocks the cave in round 1. */
function drawBoulder(ctx: Context): void {
  oval(ctx, '#00000040', 14, 20, 13, 2);
  oval(ctx, '#3e423c', 14, 12, 13, 9); oval(ctx, '#5c6258', 13, 10, 11, 7); oval(ctx, '#7a8276', 10, 7, 5, 3);
  speckle(ctx, ['#2e322c', '#8c948a'], 2, 4, 24, 16, 16, 21);
  oval(ctx, '#4f7a3a', 16, 4, 6, 1); rect(ctx, '#3a2a1a', 8, 14, 9, 1);
}

/** Hats players can put on their frog (same order as HATS in src/data/looks.ts, minus "none"). */
function drawHat(ctx: Context, kind: string): void {
  if (kind === 'crown') {
    rect(ctx, '#8a5a10', 2, 6, 12, 5); rect(ctx, '#ffd84a', 3, 6, 10, 4); rect(ctx, '#fff0a0', 3, 6, 10, 1);
    for (const x of [2, 7, 12]) { rect(ctx, '#8a5a10', x, 2, 2, 4); rect(ctx, '#ffd84a', x, 3, 2, 3); rect(ctx, '#fff0a0', x, 1, 2, 2); }
    rect(ctx, '#e0304a', 5, 8, 2, 1); rect(ctx, '#3a8ae0', 9, 8, 2, 1); rect(ctx, '#ffffff', 7, 7, 1, 1);
  } else if (kind === 'cap') {
    oval(ctx, '#7a1a1a', 8, 7, 6, 4); oval(ctx, '#d83a3a', 8, 6, 5, 3); rect(ctx, '#ff7a6a', 5, 4, 3, 1);
    rect(ctx, '#7a1a1a', 1, 9, 15, 2); rect(ctx, '#b02a2a', 2, 9, 13, 1); rect(ctx, '#ffffff', 8, 3, 1, 1);
    rect(ctx, '#ffffff', 6, 6, 4, 2); rect(ctx, '#d83a3a', 7, 6, 2, 1);
  } else if (kind === 'flower') {
    // A red Bwa Kwaib bloom (Dominica's national flower) behind a leaf.
    oval(ctx, '#2f6a2a', 4, 9, 4, 2); oval(ctx, '#5aa03a', 4, 8, 3, 1);
    for (const [x, y] of [[8, 3], [12, 5], [11, 9], [6, 8], [5, 4]]) { oval(ctx, '#a01a2a', x, y, 2, 2); oval(ctx, '#e8344a', x, y - 1, 2, 1); }
    oval(ctx, '#ffd84a', 8, 6, 2, 2); rect(ctx, '#fff6b0', 8, 5, 1, 1);
  } else if (kind === 'bow') {
    oval(ctx, '#a0205a', 4, 7, 4, 3); oval(ctx, '#a0205a', 12, 7, 4, 3); oval(ctx, '#ff5aa8', 4, 6, 3, 2); oval(ctx, '#ff5aa8', 12, 6, 3, 2);
    rect(ctx, '#ffffff', 2, 5, 2, 1); rect(ctx, '#ffffff', 10, 5, 2, 1);
    oval(ctx, '#a0205a', 8, 7, 2, 2); rect(ctx, '#ff8ac8', 7, 6, 2, 2);
    rect(ctx, '#a0205a', 5, 9, 2, 3); rect(ctx, '#a0205a', 10, 9, 2, 3);
  } else if (kind === 'party') {
    for (let y = 0; y < 11; y++) { const half = Math.floor(y / 2); rect(ctx, '#2a3a8a', 8 - half - 1, y, half * 2 + 2, 1); rect(ctx, y % 4 < 2 ? '#3ad0ff' : '#ff4ad0', 8 - half, y, half * 2, 1); }
    oval(ctx, '#ffe04a', 8, 1, 2, 1); rect(ctx, '#ffffff', 7, 0, 1, 1);
    for (const [x, y] of [[6, 6], [10, 8], [8, 4]]) rect(ctx, '#ffe04a', x, y, 1, 1);
  } else if (kind === 'tophat') {
    rect(ctx, '#0a0a10', 1, 9, 14, 2); rect(ctx, '#2a2a3a', 2, 9, 12, 1);
    rect(ctx, '#0a0a10', 3, 0, 10, 9); rect(ctx, '#24243a', 4, 0, 8, 8); rect(ctx, '#3a3a5a', 4, 0, 2, 8);
    rect(ctx, '#c83a3a', 3, 6, 10, 2); rect(ctx, '#ff6a5a', 4, 6, 3, 1);
  } else if (kind === 'leaf') {
    // A big leaf held like an umbrella: rainforest style.
    for (let x = 0; x < 16; x++) { const h = Math.round(Math.sin(x / 15 * Math.PI) * 4) + 1; rect(ctx, '#2f6a2a', x, 7 - h, 1, h + 1); rect(ctx, '#5aa03a', x, 7 - h, 1, h); }
    for (let x = 1; x < 15; x += 3) rect(ctx, '#8ad05a', x, 4, 1, 3);
    rect(ctx, '#8ad05a', 1, 6, 14, 1); rect(ctx, '#5a3a20', 8, 7, 1, 5);
  }
}

/** Boost pickups: 12×12 icons on a round badge. */
function drawBoost(ctx: Context, kind: string): void {
  const badge: Record<string, [string, string]> = { speed: ['#2a6ad8', '#6aa8ff'], tongue: ['#c43a6a', '#ff8ab0'], double: ['#c08a10', '#ffd84a'], shield: ['#2f7a2a', '#7ad04a'] };
  const [dark, light] = badge[kind];
  oval(ctx, '#1d1712', 7, 7, 7, 7); oval(ctx, dark, 7, 7, 6, 6); oval(ctx, light, 6, 5, 4, 3);
  if (kind === 'speed') { for (const [x, y, w] of [[8, 2, 2], [7, 3, 2], [6, 4, 2], [5, 5, 5], [7, 6, 2], [6, 7, 2], [5, 8, 2], [4, 9, 2]]) rect(ctx, '#fff6b0', x, y, w, 1); rect(ctx, '#fff6b0', 5, 10, 1, 1); }
  else if (kind === 'tongue') { rect(ctx, '#ffffff', 3, 6, 6, 2); oval(ctx, '#ffffff', 10, 7, 2, 2); rect(ctx, '#8a2a3a', 3, 7, 6, 1); }
  else if (kind === 'double') { for (const [x, y] of [[3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [7, 4], [6, 5], [4, 7], [3, 8]]) rect(ctx, '#ffffff', x, y, 1, 1); rect(ctx, '#ffffff', 9, 4, 2, 1); rect(ctx, '#ffffff', 10, 5, 1, 1); rect(ctx, '#ffffff', 9, 6, 2, 1); rect(ctx, '#ffffff', 9, 7, 1, 1); rect(ctx, '#ffffff', 9, 8, 3, 1); }
  else { for (let y = 3; y < 11; y++) { const half = Math.round(Math.sin((y - 3) / 7 * Math.PI) * 3) + 1; rect(ctx, '#d4ffa0', 7 - half, y, half * 2, 1); } rect(ctx, '#2f5a22', 7, 3, 1, 8); }
}

// ---------------------------------------------------------------- six degrees icons (16×16)

function drawIcon(ctx: Context, kind: string): void {
  if (kind === 'you') {
    oval(ctx, '#3f6a9a', 8, 14, 6, 3); rect(ctx, '#3f6a9a', 3, 11, 10, 4);
    oval(ctx, '#d9a87a', 8, 7, 4, 4); rect(ctx, '#2a2420', 6, 6, 1, 1); rect(ctx, '#2a2420', 9, 6, 1, 1); rect(ctx, '#a05a40', 7, 9, 2, 1);
    rect(ctx, '#d84a3a', 4, 2, 8, 3); rect(ctx, '#d84a3a', 10, 4, 4, 1); rect(ctx, '#ff7a5a', 5, 2, 4, 1);
  } else if (kind === 'shop') {
    rect(ctx, '#c9a06a', 2, 6, 12, 9); rect(ctx, '#6a4a2a', 6, 9, 4, 6); rect(ctx, '#8bb8b0', 3, 8, 2, 3); rect(ctx, '#8bb8b0', 11, 8, 2, 3);
    for (let x = 1; x < 15; x += 2) { rect(ctx, x % 4 === 1 ? '#d84a3a' : '#fff0cd', x, 3, 2, 3); }
    rect(ctx, '#4a7a3a', 11, 9, 2, 2);
  } else if (kind === 'ship') {
    rect(ctx, '#2f6aa0', 0, 13, 16, 3); rect(ctx, '#5a9ac8', 0, 13, 16, 1);
    rect(ctx, '#3a3f4a', 1, 10, 14, 3); rect(ctx, '#d84a3a', 1, 12, 14, 1);
    rect(ctx, '#e8a03a', 3, 7, 3, 3); rect(ctx, '#3a8a5a', 6, 7, 3, 3); rect(ctx, '#3a6aa0', 9, 7, 3, 3); rect(ctx, '#e8a03a', 6, 4, 3, 3);
    rect(ctx, '#e8e0d0', 12, 5, 2, 5);
  } else if (kind === 'fungus') {
    oval(ctx, '#2a3a2a', 8, 8, 7, 7); oval(ctx, '#4a7a3a', 8, 8, 6, 6);
    for (const [x, y] of [[5, 5], [10, 4], [7, 9], [11, 10], [4, 10]]) { oval(ctx, '#a6f06a', x, y, 1, 1); rect(ctx, '#e4ffb0', x, y, 1, 1); }
    rect(ctx, '#2a3a2a', 13, 1, 2, 2); rect(ctx, '#a6f06a', 1, 13, 2, 2);
  } else if (kind === 'island') {
    rect(ctx, '#2f6aa0', 0, 11, 16, 5); rect(ctx, '#5a9ac8', 1, 12, 3, 1); rect(ctx, '#5a9ac8', 11, 14, 4, 1);
    oval(ctx, '#3f7a3a', 8, 11, 7, 3); oval(ctx, '#e8d4a0', 8, 12, 7, 1);
    for (let y = 4; y < 10; y++) rect(ctx, '#5a6a4a', 9 - Math.floor((y - 4) / 2), y, 1 + (y - 4), 1);
    rect(ctx, '#8a6a42', 4, 5, 1, 6); rect(ctx, '#3f8a3a', 1, 4, 4, 1); rect(ctx, '#3f8a3a', 4, 3, 4, 1);
  } else if (kind === 'skin') {
    oval(ctx, FROG.body, 8, 8, 7, 6); oval(ctx, FROG.bodyLight, 7, 6, 4, 2);
    for (const [x, y] of [[4, 8], [9, 10], [12, 6], [6, 11]]) { rect(ctx, '#7ad04a', x, y, 2, 2); rect(ctx, '#d4ffa0', x, y, 1, 1); }
    rect(ctx, FROG.mark, 10, 4, 2, 1);
  } else if (kind === 'storm') {
    oval(ctx, '#5a6070', 8, 5, 7, 4); oval(ctx, '#7a8090', 6, 4, 5, 3); oval(ctx, '#9aa0b0', 10, 3, 4, 2);
    for (const x of [3, 7, 11]) line(ctx, '#7ab0e0', x, 10, x - 2, 15);
    rect(ctx, '#ffe04a', 9, 9, 2, 2); rect(ctx, '#ffe04a', 8, 11, 2, 2); rect(ctx, '#ffe04a', 9, 13, 2, 2);
  } else if (kind === 'frog') {
    oval(ctx, FROG.dark, 8, 10, 7, 5); oval(ctx, FROG.body, 8, 9, 6, 4); rect(ctx, FROG.cream, 3, 11, 10, 1);
    for (const x of [3, 9]) { rect(ctx, FROG.dark, x, 3, 5, 5); rect(ctx, FROG.iris, x + 1, 4, 3, 3); rect(ctx, FROG.pupil, x + 1, 5, 3, 1); }
    rect(ctx, FROG.rust, 2, 13, 2, 1); rect(ctx, FROG.rust, 12, 13, 2, 1);
  }
}


// ---------------------------------------------------------------- registry

export const simple: Record<string, [number, number, Draw]> = {
  tree: [50, 64, ctx => drawTree(ctx)],
  palm: [44, 62, drawPalm],
  bush: [32, 25, drawBush],
  fern: [20, 22, drawFern],
  flower: [10, 14, drawFlower],
  stump: [20, 15, drawStump],
  'researcher-2': [18, 26, ctx => drawPerson(ctx, '#3a6f8a', '#7aaac0', '#3f6a4a', 0, c => { rect(c, '#fff0cd', 14, 13, 4, 5); rect(c, '#8a7a5a', 15, 14, 2, 1); })],
  'frog-shadow': [20, 8, ctx => oval(ctx, '#203a2a', 10, 4, 9, 3)],
  pig: [22, 15, ctx => drawPig(ctx, 0)], 'pig-1': [22, 15, ctx => drawPig(ctx, 1)],
  volcano: [60, 40, drawVolcano],
  pool: [52, 30, drawPool],
  solar: [22, 19, drawSolar],
  cricket: [14, 10, ctx => drawCricket(ctx, 0)], 'cricket-1': [14, 10, ctx => drawCricket(ctx, 1)],
  beetle: [10, 10, drawBeetle], millipede: [16, 6, drawMillipede], snail: [10, 9, drawSnail], crab: [14, 10, drawCrab],
  portrait: [72, 52, drawPortrait],
  'portrait-open': [72, 52, ctx => drawPortraitMouth(ctx, 'open')],
  'portrait-full': [72, 52, ctx => drawPortraitMouth(ctx, 'full')],
  scare: [80, 45, drawScare],
  shock: [60, 90, drawShock],
  chicken: [24, 22, ctx => drawChicken(ctx, 0)], 'chicken-1': [24, 22, ctx => drawChicken(ctx, 1)],
  'chicken-2': [24, 22, ctx => drawChicken(ctx, 2)], 'chicken-3': [24, 22, ctx => drawChicken(ctx, 3)],
  feather: [6, 4, drawFeather],
  cave: [68, 50, drawCave],
  'cave-eyes': [8, 1, drawCaveEyes],
  'glow-shrooms': [13, 10, drawGlowShrooms],
  shrooms: [12, 10, drawShrooms],
  rock: [23, 17, ctx => drawRock(ctx, true)], 'rock-small': [12, 8, ctx => drawRock(ctx, false)],
  lilypad: [13, 8, ctx => drawLilypad(ctx, false)], 'lily-flower': [13, 8, ctx => drawLilypad(ctx, true)],
  reeds: [11, 18, drawReeds],
  bridge: [40, 13, drawBridge],
  stones: [33, 8, drawStones],
  log: [31, 11, drawLog],
  hut: [40, 35, drawHut],
  'you-arrow': [9, 6, ctx => { for (let y = 0; y < 5; y++) { rect(ctx, '#1d1712', y, y, 9 - y * 2, 1); rect(ctx, '#ffffff', y + 1, y, Math.max(0, 7 - y * 2), 1); } rect(ctx, '#1d1712', 4, 5, 1, 1); }],
  'hide-bush': [36, 26, drawHideBush],
  'hollow-log': [32, 14, drawHollowLog],
  'tall-grass': [40, 18, drawTallGrass],
  tent: [31, 26, drawTent],
  jail: [34, 26, drawJail],
  campfire: [18, 12, ctx => drawCampfire(ctx, 0)], 'campfire-1': [18, 12, ctx => drawCampfire(ctx, 1)],
  pot: [24, 18, drawPot],
  boulder: [28, 22, drawBoulder],
  raindrop: [1, 5, ctx => { rect(ctx, '#bfe0ff', 0, 0, 1, 5); rect(ctx, '#ffffff', 0, 0, 1, 1); }],
  ash: [3, 3, ctx => { rect(ctx, '#8a847c', 0, 0, 3, 3); rect(ctx, '#c8c0b8', 1, 1, 1, 1); }],
  sparkle: [5, 5, ctx => { rect(ctx, '#e8f8ff', 2, 0, 1, 5); rect(ctx, '#e8f8ff', 0, 2, 5, 1); rect(ctx, '#ffffff', 2, 2, 1, 1); }],
  'boost-speed': [14, 14, ctx => drawBoost(ctx, 'speed')], 'boost-tongue': [14, 14, ctx => drawBoost(ctx, 'tongue')],
  'boost-double': [14, 14, ctx => drawBoost(ctx, 'double')], 'boost-shield': [14, 14, ctx => drawBoost(ctx, 'shield')],
  spore: [3, 3, ctx => { rect(ctx, '#a6f06a', 0, 0, 3, 3); rect(ctx, '#e4ffb0', 1, 1, 1, 1); }],
  steam: [6, 6, ctx => { oval(ctx, '#ffffffaa', 3, 3, 2, 2); rect(ctx, '#ffffff', 2, 2, 1, 1); }],
  phone: [12, 18, ctx => {
    rect(ctx, '#2a2420', 0, 0, 12, 18); rect(ctx, '#95d06a', 1, 2, 10, 13); rect(ctx, '#4a4440', 5, 16, 2, 1);
    oval(ctx, '#fff1cb', 6, 8, 3, 3); oval(ctx, '#4f8f3a', 7, 7, 1, 1);
  }],
  trap: [19, 17, ctx => drawTrap(ctx, false)], 'trap-shut': [19, 17, ctx => drawTrap(ctx, true)],
  dust: [4, 4, ctx => { rect(ctx, '#e8dcb8', 1, 0, 2, 4); rect(ctx, '#e8dcb8', 0, 1, 4, 2); rect(ctx, '#fff6dc', 1, 1, 1, 1); }],
  hunter: [20, 26, ctx => drawHunter(ctx, 0)], 'hunter-1': [20, 26, ctx => drawHunter(ctx, 1)],
  firefly: [3, 3, ctx => { rect(ctx, '#c8f07a', 0, 0, 3, 3); rect(ctx, '#fffbd0', 1, 1, 1, 1); }],
  leaf: [5, 4, ctx => { rect(ctx, '#6a9a3a', 0, 1, 5, 2); rect(ctx, '#9ac85a', 1, 0, 3, 1); rect(ctx, '#3f6a2a', 2, 3, 1, 1); }],
};
for (const kind of ['you', 'shop', 'ship', 'fungus', 'island', 'skin', 'frog', 'storm']) simple[`icon-${kind}`] = [16, 16, ctx => drawIcon(ctx, kind)];
for (const facing of ['down', 'up', 'left', 'right']) {
  for (let frame = 0; frame < 5; frame++) {
    simple[`frog-${facing}-${frame}`] = [24, 24, ctx => drawFrog(ctx, facing, frame)];
    SKIN_IDS.forEach((skin, i) => { if (i) simple[`frog-${skin}-${facing}-${frame}`] = [24, 24, ctx => drawFrog(ctx, facing, frame, SKIN_PALETTES[i])]; });
  }
}
for (const hat of ['crown', 'cap', 'flower', 'bow', 'party', 'tophat', 'leaf']) simple[`hat-${hat}`] = [16, 12, ctx => drawHat(ctx, hat)];
simple.frog = [24, 24, ctx => drawFrog(ctx, 'down', 0)];

const urls = new Map<string, string>();
/** A crisp, upscaled PNG of any pixel drawing, for HTML cards. */
export function artUrl(key: string, scale = 6): string {
  const id = `${key}@${scale}`;
  const cached = urls.get(id);
  if (cached) return cached;
  const entry = simple[key];
  if (!entry) return '';
  const [w, h, draw] = entry;
  const small = document.createElement('canvas'); small.width = w; small.height = h;
  const sctx = small.getContext('2d')!; sctx.imageSmoothingEnabled = false; draw(sctx);
  const big = document.createElement('canvas'); big.width = w * scale; big.height = h * scale;
  const bctx = big.getContext('2d')!; bctx.imageSmoothingEnabled = false; bctx.drawImage(small, 0, 0, w * scale, h * scale);
  const url = big.toDataURL('image/png');
  urls.set(id, url);
  return url;
}

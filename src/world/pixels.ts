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

function drawFrog(ctx: Context, facing: string, frame: number): void {
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
  for (let frame = 0; frame < 5; frame++) simple[`frog-${facing}-${frame}`] = [24, 24, ctx => drawFrog(ctx, facing, frame)];
}
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

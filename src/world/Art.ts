import Phaser from 'phaser';
import { simple } from './pixels';

export { artUrl, hash, oval, rect } from './pixels';

/** Creates every pixel texture once per game. */
export function ensureArt(scene: Phaser.Scene): void {
  for (const [key, [w, h, draw]] of Object.entries(simple)) {
    if (scene.textures.exists(key)) continue;
    const canvas = scene.textures.createCanvas(key, w, h)!;
    canvas.context.imageSmoothingEnabled = false;
    draw(canvas.context); canvas.refresh();
  }
  if (!scene.textures.exists('darkness')) scene.textures.addCanvas('darkness', darknessCanvas());
  if (!scene.textures.exists('beam')) scene.textures.addCanvas('beam', beamCanvas());
  if (!scene.textures.exists('glow')) scene.textures.addCanvas('glow', glowCanvas());
}

/** Night vignette: clear around the frog, dark beyond. Drawn small and scaled up for chunky pixels. */
function darknessCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 240;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < 240; y++) for (let x = 0; x < 400; x++) {
    const d = Math.hypot(x - 200, (y - 120) * 1.1);
    const a = Math.max(0, Math.min(1, (d - 38) / 70));
    const stepped = Math.round(a * 6) / 6;
    if (stepped > 0) { ctx.fillStyle = `rgba(4,10,16,${(stepped * 0.74).toFixed(3)})`; ctx.fillRect(x, y, 1, 1); }
  }
  return canvas;
}
function beamCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  for (let x = 0; x < 64; x++) {
    const half = x * 0.24 + 1;
    for (let y = 0; y < 32; y++) {
      const dy = Math.abs(y - 16);
      if (dy > half) continue;
      const a = (1 - x / 64) * 0.55 * (1 - (dy / (half + 1)) ** 2);
      ctx.fillStyle = `rgba(255,244,190,${(Math.round(a * 8) / 8).toFixed(3)})`; ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}
function glowCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const a = Math.max(0, 1 - Math.hypot(x - 15.5, y - 15.5) / 16);
    ctx.fillStyle = `rgba(255,255,255,${(Math.round(a * a * 6) / 6).toFixed(3)})`; ctx.fillRect(x, y, 1, 1);
  }
  return canvas;
}


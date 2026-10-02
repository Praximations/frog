import qrcode from 'qrcode-generator';
import { artUrl } from '../world/Art';
import { settings, reducedMotion } from '../systems/Settings';
import { sound } from '../systems/Sound';
import { esc } from './html';

/**
 * The jump-scare: a hunter's face slams onto the screen with a loud sting. One quick zoom rather
 * than strobing, and it can be switched off in the lobby or pause menu.
 */
export function jumpscare(host: HTMLElement, caption: string, onDone: () => void): void {
  if (!settings.jumpscares) {
    const soft = document.createElement('div');
    soft.className = 'caught-soft';
    soft.innerHTML = `<b>CAUGHT!</b><span>${esc(caption)}</span>`;
    host.append(soft); sound.play('hurt');
    window.setTimeout(() => { soft.remove(); onDone(); }, 1300);
    return;
  }
  const layer = document.createElement('div');
  layer.className = `jumpscare ${reducedMotion() ? 'is-calm' : ''}`;
  layer.innerHTML = `<img class="scare-face" src="${artUrl('scare', 16)}" alt=""><div class="scare-vignette"></div><div class="scare-text"><b>CAUGHT!</b><span>${esc(caption)}</span></div>`;
  host.append(layer);
  sound.play('scare');
  window.setTimeout(() => layer.classList.add('is-fading'), 1250);
  window.setTimeout(() => { layer.remove(); onDone(); }, 1700);
}

/** Emoji reactions from phones float up the right edge of the projector. */
export function floatReaction(host: HTMLElement, emoji: string, name: string): void {
  if (host.childElementCount > 14) host.firstElementChild?.remove();
  const bubble = document.createElement('div');
  bubble.className = 'reaction';
  bubble.style.setProperty('--drift', `${Math.round(Math.random() * 70 - 35)}px`);
  bubble.style.right = `${2 + Math.random() * 8}%`;
  bubble.innerHTML = `<span class="reaction-emoji">${esc(emoji)}</span><span class="reaction-name">${esc(name)}</span>`;
  host.append(bubble);
  window.setTimeout(() => bubble.remove(), 3200);
}

/** A big centred banner, e.g. "CHAPTER COMPLETE". */
export function banner(host: HTMLElement, title: string, subtitle = '', ms = 1800, cls = ''): Promise<void> {
  const element = document.createElement('div');
  element.className = `banner ${cls}`;
  element.innerHTML = `<b>${esc(title)}</b>${subtitle ? `<span>${esc(subtitle)}</span>` : ''}`;
  host.append(element);
  return new Promise(resolve => window.setTimeout(() => { element.classList.add('is-leaving'); window.setTimeout(() => { element.remove(); resolve(); }, 300); }, ms));
}

/** Small non-blocking fact pop-up (e.g. the first time you meet a threat). */
export function toast(host: HTMLElement, tag: string, text: string, kind = '', ms = 5200): void {
  while (host.childElementCount > 1) host.firstElementChild?.remove();
  const element = document.createElement('div');
  element.className = `toast ${kind}`;
  element.innerHTML = `<b>${esc(tag)}</b><span>${esc(text)}</span>`;
  host.append(element);
  window.setTimeout(() => { element.classList.add('is-leaving'); window.setTimeout(() => element.remove(), 400); }, ms);
}

/** Pixel-crisp QR code as inline SVG. */
export function qrSvg(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text); qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

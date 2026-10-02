import Phaser from 'phaser';
import { ensureArt } from '../world/Art';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  create(): void {
    ensureArt(this);
    // Fonts are bundled with the game; wait before drawing canvas text.
    void Promise.all([document.fonts.load('16px "Pixelify"'), document.fonts.load('16px "PressStart"')])
      .catch(() => undefined)
      .then(() => this.scene.start('IntroScene'));
  }
}

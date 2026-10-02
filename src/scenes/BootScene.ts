import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  create(): void {
    // Fonts are bundled with the game; wait before drawing any canvas labels.
    void Promise.all([document.fonts.load('16px "Pixelify"'), document.fonts.load('16px "PressStart"')])
      .catch(() => undefined)
      .then(() => this.scene.start(location.hash === '#join' ? 'ControllerScene' : 'MenuScene'));
  }
}

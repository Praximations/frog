import Phaser from 'phaser';
import { showOverlay } from '../ui/ScreenOverlay';

/** Intentionally blank foundation: player movement and world design are later phases. */
export class ForestScene extends Phaser.Scene {
  constructor() { super('ForestScene'); }

  create(): void {
    const floor = this.add.graphics();
    floor.fillStyle(0x142e29).fillRect(0, 0, 1280, 720);
    floor.lineStyle(1, 0x24453b, .5);
    for (let x = 0; x <= 1280; x += 64) floor.lineBetween(x, 0, x, 720);
    for (let y = 0; y <= 720; y += 64) floor.lineBetween(0, y, 1280, y);
    floor.lineStyle(2, 0x90ab7b, .5).strokeCircle(640, 400, 28);
    floor.fillStyle(0xc9d9a6).fillRect(634, 394, 12, 12);
    this.add.text(640, 447, 'SPAWN POINT', {
      fontFamily: 'Arial', fontSize: '14px', color: '#a6bd9b', letterSpacing: 3,
    }).setOrigin(.5);
    const root = showOverlay(this, `
      <section class="screen forest-screen">
        <div>
          <div class="eyebrow">The starting clearing</div>
          <h2>The forest begins here.</h2>
          <p class="caption">The game foundation is ready.<br>Frog movement and hopping are the next development phase.</p>
        </div>
        <button type="button">← RETURN TO TITLE</button>
      </section>`);
    const returnToTitle = () => this.scene.start('MenuScene');
    root.querySelector('button')!.addEventListener('click', returnToTitle);
    this.input.keyboard?.on('keydown-ESC', returnToTitle);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown-ESC', returnToTitle));
    this.cameras.main.fadeIn(450, 0, 0, 0);
  }
}

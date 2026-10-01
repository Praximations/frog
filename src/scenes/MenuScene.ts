import Phaser from 'phaser';
import { showOverlay } from '../ui/ScreenOverlay';

/** Temporary code-drawn atmosphere. Final rainforest artwork arrives in later phases. */
export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create(): void {
    const background = this.add.graphics();
    background.fillStyle(0x102f31).fillRect(0, 0, 1280, 720);
    background.fillStyle(0x244841, .5).fillEllipse(650, 420, 830, 560);
    background.fillStyle(0x305447, .35).fillEllipse(660, 530, 720, 230);
    // Layered silhouettes frame the title without requiring any remote assets.
    for (let layer = 0; layer < 3; layer++) {
      const foliage = this.add.graphics();
      const color = [0x193d37, 0x102e2c, 0x092221][layer];
      foliage.fillStyle(color);
      for (let i = 0; i < 12; i++) {
        const left = i % 2 === 0;
        const x = left ? i * 13 - 70 : 1280 - i * 13 + 70;
        const y = i * 72 - 65;
        foliage.fillRect(x, y, 18, 270);
        foliage.fillEllipse(x, y + 45, 190 + layer * 30, 72);
        foliage.fillEllipse(x + (left ? 65 : -65), y + 95, 180, 64);
      }
    }
    const motes = Array.from({ length: 24 }, (_, i) => this.add.rectangle(
      (i * 173 + 97) % 1280, (i * 83 + 51) % 720, 3, 3, 0xc2d996, .3,
    ));
    for (const [i, mote] of motes.entries()) {
      this.tweens.add({ targets: mote, y: mote.y - 28, alpha: .05, duration: 2500 + i * 130, yoyo: true, repeat: -1 });
    }
    const root = showOverlay(this, `
      <section class="screen">
        <div class="eyebrow">A story from the forest floor</div>
        <h1><span>MOUNTAIN</span><span>CHICKEN</span></h1>
        <p class="subtitle">An Interactive Conservation Story</p>
        <button type="button">START &nbsp; →</button>
        <div class="caption">Enter the forest</div>
        <div class="foundation-tag">Phase 1 · Foundation preview</div>
      </section>`);
    let starting = false;
    root.querySelector('button')!.addEventListener('click', () => {
      if (starting) return;
      starting = true;
      root.querySelector<HTMLButtonElement>('button')!.disabled = true;
      root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        root.getAnimations().forEach(animation => animation.cancel());
        this.scene.start('ForestScene');
      });
    });
    this.cameras.main.fadeIn(450, 0, 0, 0);
  }
}

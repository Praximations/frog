import Phaser from 'phaser';
import { buildForest } from '../world/ForestWorld';
import { showOverlay } from '../ui/ScreenOverlay';
import { session } from '../systems/SessionClient';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create(): void {
    session.disconnect();
    buildForest(this, false);
    this.cameras.main.setScroll(410, 465);
    const shadow = this.add.ellipse(1400, 760, 80, 34, 0x102a21, .6).setDepth(759);
    const frog = this.add.image(1400, 738, 'frog').setScale(2.8).setDepth(770).setRotation(-.3);
    this.tweens.add({ targets: frog, y: 734, duration: 1200, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: shadow, alpha: .45, duration: 1200, yoyo: true, repeat: -1 });
    const root = showOverlay(this, `
      <section class="menu-screen">
        <header class="menu-header"><div class="brand-mark">MC<span>FIELD STORIES</span></div><span class="build-label">FOREST PREVIEW · 02</span></header>
        <div class="menu-content"><div class="eyebrow"><span class="tiny-line"></span>A story from the forest floor</div><h1><span>Mountain</span><span>Chicken<span class="title-period">.</span></span></h1><p class="subtitle">Small frog. A world worth saving.</p><p class="menu-description">Step beneath the canopy.<br>Explore a living forest, one hop at a time.</p><div class="menu-actions"><button id="play-button">PLAY SOLO <span>↗</span></button><button class="secondary" id="host-button">MAIN DEVICE</button></div><div class="caption"><button class="text-button join-link" id="join-button">HAVE A CODE? JOIN GAME →</button></div></div>
        <footer class="menu-footer"><span>AN INTERACTIVE CONSERVATION STORY</span><span>HEADPHONES OPTIONAL · LANDSCAPE RECOMMENDED</span></footer>
      </section>`);
    root.querySelector('#play-button')!.addEventListener('click', () => this.start(root));
    root.querySelector('#host-button')!.addEventListener('click', () => this.scene.start('HostScene'));
    root.querySelector('#join-button')!.addEventListener('click', () => this.scene.start('ControllerScene'));
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  private start(root: HTMLElement): void {
    const button = root.querySelector<HTMLButtonElement>('#play-button')!;
    if (button.disabled) return;
    button.disabled = true;
    root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      root.getAnimations().forEach(animation => animation.cancel()); this.scene.start('ForestScene');
    });
  }
}

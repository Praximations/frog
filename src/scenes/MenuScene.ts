import Phaser from 'phaser';
import { buildForest } from '../world/ForestWorld';
import { showOverlay } from '../ui/ScreenOverlay';
import { session } from '../systems/SessionClient';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  create(): void {
    session.disconnect();
    buildForest(this, false);
    this.cameras.main.setScroll(0, 290);
    for (const [i, [x, y, scale]] of [[635, 740, 6], [536, 755, 4], [735, 755, 4]].entries()) {
      this.add.image(x, y + 20, 'frog-shadow').setScale(scale).setDepth(y - 1).setAlpha(.45);
      const frog = this.add.image(x, y, `frog-down-${i ? 0 : 3}`).setScale(scale).setDepth(y);
      this.tweens.add({ targets: frog, y: y - 4, duration: 450, repeatDelay: 1900 + i * 600, yoyo: true, repeat: -1 });
      this.time.addEvent({ delay: 4300 + i * 700, loop: true, callback: () => {
        frog.setTexture('frog-down-3'); this.time.delayedCall(160, () => frog.setTexture('frog-down-0'));
      } });
    }
    const root = showOverlay(this, `<section class="menu-screen">
      <div class="menu-content"><h1><span>MOUNTAIN</span><span>CHICKEN</span></h1>
        <button class="arrow-play" id="play-button" aria-label="Play">
          <svg viewBox="0 0 128 52" aria-hidden="true" shape-rendering="crispEdges"><path fill="#543c35" d="M0 10H88V0H100V4H104V8H108V12H112V16H116V20H120V24H124V28H120V32H116V36H112V40H108V44H104V48H100V52H88V42H0Z"/><path fill="#bc8448" d="M4 14H92V4H98V8H102V12H106V16H110V20H114V24H118V28H114V32H110V36H106V40H102V44H98V48H92V38H4Z"/><path fill="#f7d781" d="M4 14H92V4H98V8H102V12H106V16H110V20H114V24H118V26H114V30H110V34H106V38H102V42H98V44H92V34H4Z"/><path fill="#fff0b2" d="M8 14H88V18H8Z"/></svg>
          <span>PLAY</span>
        </button>
      </div>
      <div class="menu-modes"><button class="secondary" id="host-button">MAIN DEVICE</button><button class="secondary" id="join-button">JOIN GAME</button></div>
      <button class="fullscreen-button" id="fullscreen" aria-label="Toggle fullscreen">⛶</button>
      <div class="menu-controls"><kbd>ARROWS</kbd> Move <kbd>SPACE</kbd> Hop <kbd>E</kbd> Talk</div>
    </section>`);
    root.querySelector('#play-button')!.addEventListener('click', () => this.start(root));
    root.querySelector('#host-button')!.addEventListener('click', () => this.scene.start('HostScene'));
    root.querySelector('#join-button')!.addEventListener('click', () => this.scene.start('ControllerScene'));
    root.querySelector('#fullscreen')!.addEventListener('click', () => this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen());
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }
  private start(root: HTMLElement): void {
    const button = root.querySelector<HTMLButtonElement>('#play-button')!;
    if (button.disabled) return;
    button.disabled = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('ForestScene', { fresh: true }));
  }
}

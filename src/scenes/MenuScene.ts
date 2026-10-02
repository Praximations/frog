import Phaser from 'phaser';
import { buildLevel, PALETTES, scatter, type Prop } from '../world/Terrain';
import { AmbientFrogs } from '../entities/Critters';
import { showOverlay } from '../ui/ScreenOverlay';
import { classHost } from '../systems/ClassHost';
import { sound } from '../systems/Sound';
import { settings, saveSettings } from '../systems/Settings';
import { artUrl } from '../world/Art';
import { go } from '../systems/flow';
import { showCards } from '../ui/cards';
import { JOURNAL } from '../data/journal';
import { $ } from '../ui/html';

/** Title screen: an animated rainforest, the game's name, and big friendly buttons. */
export class MenuScene extends Phaser.Scene {
  private frogs?: AmbientFrogs;
  constructor() { super('MenuScene'); }

  create(): void {
    classHost.close();
    const props: Prop[] = [
      ...scatter(['tree', 'tree', 'bush', 'palm'], 30, [0, 0, 1900, 1100], [[900, 560, 260]], 41),
      ...scatter(['fern', 'flower'], 30, [0, 0, 1900, 1100], [[900, 600, 160]], 7),
    ];
    buildLevel(this, {
      key: 'terrain-title', width: 480, height: 280, palette: PALETTES.day,
      paths: [[[0, 170], [120, 150], [225, 150], [330, 120], [480, 110]]], clearings: [[225, 148, 50, 26]],
      rivers: [{ points: [[380, 0], [372, 80], [392, 160], [380, 280]], width: 14 }],
    }, props, false);
    this.frogs = new AmbientFrogs(this, [[820, 600], [990, 610], [640, 640], [1160, 640]], 1.25);
    this.add.particles(0, 0, 'leaf', { x: { min: 0, max: 1900 }, y: -10, lifespan: 12000, speedY: { min: 30, max: 60 }, speedX: { min: -10, max: 40 }, rotate: { min: 0, max: 360 }, scale: 3, frequency: 500 }).setDepth(4000);
    this.add.particles(0, 0, 'firefly', { x: { min: 200, max: 1700 }, y: { min: 300, max: 1000 }, lifespan: 4000, speed: { min: 5, max: 20 }, scale: { start: 2.5, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 260, blendMode: 'ADD' }).setDepth(4001);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, 1920, 1120).setScroll(260, 250);
    this.tweens.add({ targets: camera, scrollX: 420, duration: 22000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sound.music('lobby');

    const root = showOverlay(this, `<section class="menu-screen">
      <div class="menu-content">
        <img class="title-frog pixel" src="${artUrl('portrait', 5)}" alt="">
        <h1><span>MOUNTAIN</span><span>CHICKEN</span></h1>
        <p class="menu-sub">Eat bugs. Don't get caught.</p>
        <button class="arrow-play" id="play-button" aria-label="Play">
          <svg viewBox="0 0 128 52" aria-hidden="true" shape-rendering="crispEdges"><path fill="#543c35" d="M0 10H88V0H100V4H104V8H108V12H112V16H116V20H120V24H124V28H120V32H116V36H112V40H108V44H104V48H100V52H88V42H0Z"/><path fill="#bc8448" d="M4 14H92V4H98V8H102V12H106V16H110V20H114V24H118V28H114V32H110V36H106V40H102V44H98V48H92V38H4Z"/><path fill="#f7d781" d="M4 14H92V4H98V8H102V12H106V16H110V20H114V24H118V26H114V30H110V34H106V38H102V42H98V44H92V34H4Z"/><path fill="#fff0b2" d="M8 14H88V18H8Z"/></svg>
          <span>PLAY</span>
        </button>
      </div>
      <div class="menu-modes"><button class="secondary" id="facts-button">📖 FACT CARDS</button><button class="secondary" id="join-button">📱 JOIN ON A PHONE</button></div>
      <div class="menu-corner"><button class="icon-button glass" id="sound-button" aria-label="Toggle sound">${settings.sound ? '♪' : '✕'}</button><button class="icon-button glass" id="fullscreen" aria-label="Toggle fullscreen">⛶</button></div>
      <div class="menu-controls">Everyone plays a frog on their phone · about 10 minutes</div>
      <div id="modal-slot"></div>
    </section>`);
    $(root, '#play-button').addEventListener('click', () => { sound.play('click'); go(this, 'IntroScene', {}, 350); });
    let cardsClosedAt = 0;
    $(root, '#facts-button').addEventListener('click', () => { sound.play('click'); showCards($(root, '#modal-slot'), JOURNAL, { closable: true, onDone: () => { cardsClosedAt = performance.now(); } }); });
    $(root, '#join-button').addEventListener('click', () => { location.hash = 'join'; location.reload(); });
    $(root, '#fullscreen').addEventListener('click', () => this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen());
    $(root, '#sound-button').addEventListener('click', () => {
      settings.sound = !settings.sound; saveSettings(); sound.unlock(); sound.applySettings();
      $(root, '#sound-button').textContent = settings.sound ? '♪' : '✕';
    });
    const enter = this.input.keyboard!.addKey('ENTER');
    enter.on('down', () => { if (!root.querySelector('.journal-card') && performance.now() - cardsClosedAt > 400) go(this, 'IntroScene', {}, 350); });
    camera.fadeIn(400, 0, 0, 0);
  }

  update(_time: number, delta: number): void { this.frogs?.update(delta); }
}

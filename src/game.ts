import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { PondScene } from './scenes/PondScene';
import { FinaleScene } from './scenes/FinaleScene';
import { sound } from './systems/Sound';

/** The projector: the full game. */
export function startGame(): void {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#081e20',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    audio: { noAudio: true },
    scene: [BootScene, MenuScene, PondScene, FinaleScene],
  });
  // Browsers only start audio after a gesture.
  for (const event of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(event, () => sound.unlock(), { capture: true, passive: true });
  (window as unknown as { mcGame: object }).mcGame = { game };
  if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
}

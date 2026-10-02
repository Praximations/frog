import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LobbyScene } from './scenes/LobbyScene';
import { MeetScene } from './scenes/MeetScene';
import { HuntScene } from './scenes/HuntScene';
import { DangerScene } from './scenes/DangerScene';
import { RescueScene } from './scenes/RescueScene';
import { ConnectScene } from './scenes/ConnectScene';
import { QuizScene } from './scenes/QuizScene';
import { OverviewScene } from './scenes/OverviewScene';
import { FinaleScene } from './scenes/FinaleScene';
import { sound } from './systems/Sound';
import { run } from './systems/run';
import { jump } from './systems/flow';

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
    scene: [BootScene, MenuScene, LobbyScene, MeetScene, HuntScene, DangerScene, RescueScene, ConnectScene, QuizScene, OverviewScene, FinaleScene],
  });
  // Browsers only start audio after a gesture.
  for (const event of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(event, () => sound.unlock(), { capture: true, passive: true });
  /** Rehearsal helper in the console: mcGame.jump(4) goes to step 4 of the run. */
  (window as unknown as { mcGame: object }).mcGame = {
    game, run,
    jump: (index: number) => { const active = game.scene.getScenes(true)[0]; if (active) jump(active, index); },
  };
  if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
}

import Phaser from 'phaser';
import { PlayerScene } from './PlayerScene';

/**
 * Starts the player's game view inside `parent` (it fills it and follows its size). Only loaded
 * once a player has joined, so the home page stays small.
 */
export async function startPlayerGame(parent: HTMLElement): Promise<Phaser.Game> {
  await Promise.all([document.fonts.load('16px "Pixelify"'), document.fonts.load('16px "PressStart"')]).catch(() => undefined);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#22331f',
    pixelArt: true,
    roundPixels: true,
    banner: false,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || 360, height: parent.clientHeight || 640 },
    // The page handles touch and keys (the joystick is plain HTML on top).
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    audio: { noAudio: true },
    scene: [PlayerScene],
  });
}

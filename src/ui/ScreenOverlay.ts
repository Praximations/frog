import Phaser from 'phaser';

/** DOM text stays sharp and keyboard accessible independently of canvas scaling. */
export function showOverlay(scene: Phaser.Scene, markup: string): HTMLElement {
  const root = document.getElementById('interface')!;
  root.innerHTML = markup;
  const button = root.querySelector<HTMLButtonElement>('button');
  button?.focus({ preventScroll: true });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => root.replaceChildren());
  return root;
}

import Phaser from 'phaser';

/** Fade out, then start another scene (ignores repeat calls while leaving). */
export function go(scene: Phaser.Scene, key: string, data: object = {}, fade = 450): void {
  if (scene.registry.get('leaving') === scene.scene.key) return;
  scene.registry.set('leaving', scene.scene.key);
  const start = () => { scene.registry.set('leaving', ''); scene.scene.start(key, data); };
  if (!fade) { start(); return; }
  scene.cameras.main.fadeOut(fade, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, start);
}

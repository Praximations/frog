import Phaser from 'phaser';
import { chapterByNumber, type Step } from '../data/chapters';
import { run } from './run';

/** Which scene shows a step of the presentation. */
export function sceneFor(step: Step): string {
  if (step.kind === 'chapter') return chapterByNumber(step.chapter).scene;
  if (step.kind === 'quiz') return 'QuizScene';
  return 'FinaleScene';
}

/** Fades out, then starts the scene for the run's current step. */
export function startCurrent(scene: Phaser.Scene, fade = 450): void {
  go(scene, sceneFor(run.current), { step: run.step }, fade);
}

export function go(scene: Phaser.Scene, key: string, data: object = {}, fade = 450): void {
  if (scene.registry.get('leaving') === scene.scene.key) return;
  scene.registry.set('leaving', scene.scene.key);
  const camera = scene.cameras.main;
  const start = () => { scene.registry.set('leaving', ''); scene.scene.start(key, data); };
  if (!fade) { start(); return; }
  camera.fadeOut(fade, 0, 0, 0);
  camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, start);
}

/** After a chapter: its quiz (if enabled) or straight to the expedition overview. */
export function afterChapter(scene: Phaser.Scene): void {
  const next = run.steps[run.step + 1];
  if (next?.kind === 'quiz') { run.advance(); startCurrent(scene); }
  else go(scene, 'OverviewScene');
}

/** From the overview: on to the next step. */
export function continueFromOverview(scene: Phaser.Scene): void {
  run.advance();
  startCurrent(scene);
}

/** Presenter jump to any step. */
export function jump(scene: Phaser.Scene, index: number): void {
  run.jumpTo(index);
  startCurrent(scene, 250);
}

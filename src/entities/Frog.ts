import Phaser from 'phaser';
import { sound } from '../systems/Sound';

import type { MovementInput } from '../systems/input';
export { EMPTY_INPUT, type MovementInput } from '../systems/input';

/** The player's mountain chicken: hopping movement, facing, and a few reactions. */
export class Frog {
  readonly collider: Phaser.Physics.Arcade.Image;
  readonly visual: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private phase = 0;
  private wasAirborne = false;
  facing: 'down' | 'up' | 'left' | 'right' = 'down';
  speed = 190;
  /** Pushes from wind etc., added to player movement. */
  push = new Phaser.Math.Vector2();
  locked = false;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number) {
    this.collider = scene.physics.add.image(x, y, 'frog').setVisible(false);
    this.collider.setSize(28, 22).setCollideWorldBounds(true);
    this.shadow = scene.add.image(x, y + 14, 'frog-shadow').setScale(3).setAlpha(.5);
    this.visual = scene.add.image(x, y, 'frog-down-0').setScale(4);
  }

  get x(): number { return this.collider.x; }
  get y(): number { return this.collider.y; }

  /** Unit vector the frog is looking along. */
  get direction(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.facing === 'left' ? -1 : this.facing === 'right' ? 1 : 0, this.facing === 'up' ? -1 : this.facing === 'down' ? 1 : 0);
  }

  update(time: number, delta: number, input: MovementInput): void {
    const direction = this.locked ? new Phaser.Math.Vector2() : new Phaser.Math.Vector2(input.x, input.y).limit(1);
    const moving = direction.lengthSq() > 0;
    this.collider.setVelocity(direction.x * this.speed + this.push.x, direction.y * this.speed + this.push.y);
    if (moving) {
      this.phase += delta / 170;
      this.facing = Math.abs(direction.x) > Math.abs(direction.y) ? direction.x > 0 ? 'right' : 'left' : direction.y > 0 ? 'down' : 'up';
    } else this.phase = 0;
    const lift = moving ? Math.round(Math.abs(Math.sin(this.phase)) * 10 / 4) * 4 : 0;
    if (lift > 0 && !this.wasAirborne) sound.play('step');
    this.wasAirborne = lift > 0;
    const frame = moving ? lift > 4 ? 2 : lift > 0 ? 0 : 1 : time % 4700 > 4500 ? 3 : 0;
    this.visual.setTexture(`frog-${this.facing}-${frame}`);
    this.visual.setPosition(this.x, this.y - lift).setDepth(this.y + 1);
    this.shadow.setPosition(this.x, this.y + 14).setDepth(this.y - 1).setAlpha(.5 - lift / 100);
  }

  stop(): void { this.collider.setVelocity(0, 0); }

  teleport(x: number, y: number): void {
    this.collider.setPosition(x, y); this.collider.setVelocity(0, 0);
    this.visual.setPosition(x, y); this.shadow.setPosition(x, y + 14);
  }

  /** Red flash and a little knock-back wobble. */
  hurt(): void {
    this.visual.setTintFill(0xff5a4a);
    this.scene.time.delayedCall(90, () => this.visual.clearTint());
    this.scene.time.delayedCall(180, () => this.visual.setTintFill(0xff5a4a));
    this.scene.time.delayedCall(270, () => this.visual.clearTint());
  }

  setHidden(hidden: boolean): void { this.visual.setAlpha(hidden ? .55 : 1); }
}

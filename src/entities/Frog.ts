import Phaser from 'phaser';

export interface MovementInput { x: number; y: number; hop: boolean; interact: boolean; pause?: boolean }
export const EMPTY_INPUT: MovementInput = { x: 0, y: 0, hop: false, interact: false };

export class Frog {
  readonly collider: Phaser.Physics.Arcade.Image;
  readonly visual: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private hopUntil = 0;
  private nextHop = 0;
  private phase = 0;
  private facing = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.collider = scene.physics.add.image(x, y, 'frog').setVisible(false);
    this.collider.setSize(28, 22).setCollideWorldBounds(true);
    this.shadow = scene.add.image(x, y + 14, 'frog-shadow').setScale(3).setAlpha(.5);
    this.visual = scene.add.image(x, y, 'frog-down-0').setScale(4);
  }

  get x(): number { return this.collider.x; }
  get y(): number { return this.collider.y; }

  update(time: number, delta: number, input: MovementInput): void {
    const direction = new Phaser.Math.Vector2(input.x, input.y).limit(1);
    const moving = direction.lengthSq() > 0;
    if (input.hop && time >= this.nextHop && moving) {
      this.hopUntil = time + 220;
      this.nextHop = time + 850;
    }
    const quick = time < this.hopUntil;
    const speed = quick ? 330 : 180;
    this.collider.setVelocity(direction.x * speed, direction.y * speed);
    if (moving) {
      this.phase += delta / (quick ? 120 : 190);
      this.facing = Math.abs(direction.x) > Math.abs(direction.y) ? direction.x > 0 ? 'right' : 'left' : direction.y > 0 ? 'down' : 'up';
    }
    const lift = moving ? Math.round(Math.abs(Math.sin(this.phase)) * (quick ? 16 : 8) / 4) * 4 : 0;
    const frame = moving ? lift > 4 ? 2 : lift > 0 ? 0 : 1 : time % 4700 > 4500 ? 3 : 0;
    this.visual.setTexture(`frog-${this.facing}-${frame}`);
    this.visual.setPosition(this.x, this.y - lift).setDepth(this.y + 1);
    this.shadow.setPosition(this.x, this.y + 14).setDepth(this.y - 1).setAlpha(.5 - lift / 100);
  }

  stop(): void { this.collider.setVelocity(0, 0); }
}

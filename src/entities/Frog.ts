import Phaser from 'phaser';

export interface MovementInput { x: number; y: number; hop: boolean; interact: boolean; pause?: boolean }
export const EMPTY_INPUT: MovementInput = { x: 0, y: 0, hop: false, interact: false };

export class Frog {
  readonly collider: Phaser.Physics.Arcade.Image;
  readonly visual: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private hopUntil = 0;
  private nextHop = 0;
  private phase = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.collider = scene.physics.add.image(x, y, 'frog').setVisible(false);
    this.collider.setSize(28, 22).setCollideWorldBounds(true);
    this.shadow = scene.add.ellipse(x, y + 8, 52, 23, 0x071f1b, .45);
    this.visual = scene.add.image(x, y, 'frog').setScale(1.7);
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
      this.visual.rotation = Math.atan2(direction.y, direction.x) + Math.PI / 2;
    }
    const lift = moving ? Math.abs(Math.sin(this.phase)) * (quick ? 15 : 7) : 0;
    this.visual.setPosition(this.x, this.y - lift).setDepth(this.y + 1);
    this.visual.setScale(1.7 + lift / 200, 1.7 - lift / 250);
    this.shadow.setPosition(this.x, this.y + 10).setDepth(this.y - 1).setAlpha(.45 - lift / 75);
  }

  stop(): void { this.collider.setVelocity(0, 0); }
}

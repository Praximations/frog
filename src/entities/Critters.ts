import Phaser from 'phaser';
import { SCALE } from '../world/Terrain';

interface Npc { sprite: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; pos: Phaser.Math.Vector2; home: Phaser.Math.Vector2; target: Phaser.Math.Vector2; wait: number; facing: string; alive: boolean; phase: number }

/** Other mountain chickens: idle, blink and hop around a home spot. */
export class AmbientFrogs {
  readonly frogs: Npc[] = [];

  constructor(private readonly scene: Phaser.Scene, homes: [number, number][], private readonly scale = 1) {
    for (const [x, y] of homes) {
      const shadow = scene.add.image(x, y + 12, 'frog-shadow').setScale(2.6 * scale).setAlpha(.45).setDepth(y - 1);
      const sprite = scene.add.image(x, y, 'frog-down-0').setScale(3.2 * scale).setDepth(y);
      this.frogs.push({ sprite, shadow, pos: new Phaser.Math.Vector2(x, y), home: new Phaser.Math.Vector2(x, y), target: new Phaser.Math.Vector2(x, y), wait: Math.random() * 3000, facing: 'down', alive: true, phase: 0 });
    }
  }

  update(delta: number): void {
    for (const frog of this.frogs) {
      if (!frog.alive) continue;
      const to = frog.target.clone().subtract(frog.pos);
      let lift = 0;
      if (to.length() < 3) {
        frog.wait -= delta; frog.phase = 0;
        frog.sprite.setTexture(`frog-${frog.facing}-${frog.wait % 3000 < 160 ? 3 : 0}`);
        if (frog.wait <= 0) {
          frog.wait = 1800 + Math.random() * 3200;
          frog.target.set(frog.home.x + Phaser.Math.Between(-70, 70), frog.home.y + Phaser.Math.Between(-50, 50));
        }
      } else {
        const stepLength = Math.min(to.length(), delta * .09);
        frog.pos.add(to.normalize().scale(stepLength));
        frog.phase += delta / 170;
        frog.facing = Math.abs(to.x) > Math.abs(to.y) ? to.x > 0 ? 'right' : 'left' : to.y > 0 ? 'down' : 'up';
        lift = Math.round(Math.abs(Math.sin(frog.phase)) * 2) * 4;
        frog.sprite.setTexture(`frog-${frog.facing}-${lift > 4 ? 2 : 0}`);
      }
      frog.sprite.setPosition(frog.pos.x, frog.pos.y - lift).setDepth(frog.pos.y);
      frog.shadow.setPosition(frog.pos.x, frog.pos.y + 12 * this.scale).setDepth(frog.pos.y - 1);
    }
  }

  /** Chytrid: frogs turn pale and disappear, one after another. */
  sicken(delayEach = 260, onEach?: (index: number) => void): void {
    this.frogs.forEach((frog, i) => {
      this.scene.time.delayedCall(i * delayEach, () => {
        frog.alive = false;
        frog.sprite.setTint(0x9fb8a0).setTexture('frog-down-3');
        this.scene.tweens.add({ targets: [frog.sprite, frog.shadow], alpha: 0, y: '+=6', duration: 900, delay: 300 });
        onEach?.(i);
      });
    });
  }
}

export type PreyKind = 'cricket' | 'beetle' | 'millipede' | 'snail' | 'crab' | 'snake' | 'golden';
export const PREY: Record<PreyKind, { points: number; speed: number; label: string; texture: string }> = {
  cricket: { points: 1, speed: 70, label: 'Cricket', texture: 'cricket' },
  beetle: { points: 1, speed: 45, label: 'Beetle', texture: 'beetle' },
  millipede: { points: 1, speed: 28, label: 'Millipede', texture: 'millipede' },
  snail: { points: 1, speed: 12, label: 'Snail', texture: 'snail' },
  crab: { points: 3, speed: 55, label: 'Land crab', texture: 'crab' },
  snake: { points: 3, speed: 60, label: 'Small snake', texture: 'snake' },
  golden: { points: 5, speed: 105, label: 'Golden cricket', texture: 'cricket' },
};

/** Something the frog can catch. Moves in short hops/wiggles inside an area. */
export class Prey {
  readonly sprite: Phaser.GameObjects.Image;
  readonly tag?: Phaser.GameObjects.Text;
  alive = true;
  private heading = Math.random() * Math.PI * 2;
  private turnIn = 0;
  private hop = 0;

  constructor(private readonly scene: Phaser.Scene, readonly kind: PreyKind, x: number, y: number, private readonly area: Phaser.Geom.Rectangle, readonly owner?: { id: string; name: string }) {
    this.sprite = scene.add.image(x, y, PREY[kind].texture).setScale(SCALE).setDepth(y);
    if (kind === 'golden') this.sprite.setTint(0xffd84a);
    if (owner) this.tag = scene.add.text(x, y - 40, owner.name, { fontFamily: 'Pixelify', fontSize: '18px', color: '#fff7d0', stroke: '#2e2a20', strokeThickness: 4 }).setOrigin(.5).setDepth(4800);
  }

  update(delta: number, fleeFrom?: { x: number; y: number }): void {
    if (!this.alive) return;
    const info = PREY[this.kind];
    this.turnIn -= delta;
    if (this.turnIn <= 0) { this.heading += (Math.random() - .5) * 2.4; this.turnIn = 600 + Math.random() * 1400; }
    let speed = info.speed;
    if (fleeFrom) {
      const d = Phaser.Math.Distance.Between(fleeFrom.x, fleeFrom.y, this.sprite.x, this.sprite.y);
      if (d < 150 && this.kind !== 'snail') { this.heading = Math.atan2(this.sprite.y - fleeFrom.y, this.sprite.x - fleeFrom.x) + (Math.random() - .5) * .6; speed *= 1.6; }
    }
    this.hop += delta;
    const hopper = this.kind === 'cricket' || this.kind === 'golden';
    const moving = hopper ? this.hop % 1100 < 380 : true;
    if (moving) {
      let x = this.sprite.x + Math.cos(this.heading) * speed * delta / 1000;
      let y = this.sprite.y + Math.sin(this.heading) * speed * delta / 1000;
      if (!this.area.contains(x, y)) { this.heading += Math.PI; x = Phaser.Math.Clamp(x, this.area.left, this.area.right); y = Phaser.Math.Clamp(y, this.area.top, this.area.bottom); }
      this.sprite.setPosition(x, y).setDepth(y).setFlipX(Math.cos(this.heading) < 0);
    }
    if (hopper) this.sprite.setTexture(moving ? 'cricket-1' : 'cricket');
    if (this.kind === 'snake') this.sprite.setTexture(Math.floor(this.hop / 160) % 2 ? 'snake-1' : 'snake');
    this.tag?.setPosition(this.sprite.x, this.sprite.y - 42);
  }

  /** Pulled into the frog's mouth by the tongue. */
  eat(toX: number, toY: number): void {
    this.alive = false;
    this.tag?.destroy();
    this.scene.tweens.add({ targets: this.sprite, x: toX, y: toY, scale: 1, duration: 130, ease: 'Quad.easeIn', onComplete: () => this.sprite.destroy() });
  }

  destroy(): void { this.alive = false; this.sprite.destroy(); this.tag?.destroy(); }
}

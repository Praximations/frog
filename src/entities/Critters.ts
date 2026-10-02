import Phaser from 'phaser';
import { SCALE } from '../world/Terrain';

interface Npc { sprite: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; pos: Phaser.Math.Vector2; home: Phaser.Math.Vector2; target: Phaser.Math.Vector2; wait: number; facing: string; hopT: number; squash: number; breath: number; blinkIn: number }

/** Other mountain chickens on the title and finale: they breathe, blink and hop about a home spot. */
export class AmbientFrogs {
  readonly frogs: Npc[] = [];

  constructor(private readonly scene: Phaser.Scene, homes: [number, number][], private readonly scale = 1) {
    for (const [x, y] of homes) {
      const shadow = scene.add.image(x, y + 12, 'frog-shadow').setScale(2.6 * scale).setAlpha(.45).setDepth(y - 1);
      const sprite = scene.add.image(x, y, 'frog-down-0').setScale(3.2 * scale).setOrigin(.5, .9).setDepth(y);
      this.frogs.push({ sprite, shadow, pos: new Phaser.Math.Vector2(x, y), home: new Phaser.Math.Vector2(x, y), target: new Phaser.Math.Vector2(x, y), wait: Math.random() * 3000, facing: 'down', hopT: 0, squash: 0, breath: Math.random() * 9, blinkIn: Math.random() * 3000 });
    }
  }

  update(delta: number): void {
    const size = 3.2 * this.scale;
    for (const frog of this.frogs) {
      const to = frog.target.clone().subtract(frog.pos);
      const moving = to.length() > 3;
      if (moving) {
        frog.pos.add(to.normalize().scale(Math.min(to.length(), delta * .11)));
        frog.facing = Math.abs(to.x) > Math.abs(to.y) ? to.x > 0 ? 'right' : 'left' : to.y > 0 ? 'down' : 'up';
      } else {
        frog.wait -= delta;
        if (frog.wait <= 0) {
          frog.wait = 1800 + Math.random() * 3200;
          frog.target.set(frog.home.x + Phaser.Math.Between(-70, 70), frog.home.y + Phaser.Math.Between(-50, 50));
        }
      }
      if (moving || frog.hopT > 0) {
        frog.hopT += delta / 300;
        if (frog.hopT >= 1) { frog.hopT = moving ? frog.hopT - 1 : 0; frog.squash = 1; }
      }
      frog.squash = Math.max(0, frog.squash - delta / 140);
      frog.breath += delta / 420;
      frog.blinkIn -= delta;
      if (frog.blinkIn < -140) frog.blinkIn = 1800 + Math.random() * 3600;
      const air = frog.hopT > 0 ? Math.sin(Math.PI * frog.hopT) : 0;
      const breathe = frog.hopT === 0 ? Math.sin(frog.breath) * .03 : 0;
      const frame = frog.hopT > 0 ? frog.hopT < .14 || frog.hopT > .88 ? 1 : 2 : frog.blinkIn < 0 ? 3 : 0;
      frog.sprite.setTexture(`frog-${frog.facing}-${frame}`)
        .setScale(size * (1 - .1 * air + .24 * frog.squash - breathe * .5), size * (1 + .18 * air - .26 * frog.squash + breathe))
        .setPosition(frog.pos.x, frog.pos.y + 31 * this.scale - air * 14 * this.scale).setDepth(frog.pos.y);
      frog.shadow.setPosition(frog.pos.x, frog.pos.y + 12 * this.scale).setDepth(frog.pos.y - 1).setScale(2.6 * this.scale * (1 - .3 * air));
    }
  }
}

export type PreyKind = 'cricket' | 'beetle' | 'millipede' | 'snail' | 'crab' | 'golden' | 'mega';
export const PREY: Record<PreyKind, { points: number; speed: number; label: string; texture: string }> = {
  cricket: { points: 1, speed: 70, label: 'Cricket', texture: 'cricket' },
  beetle: { points: 1, speed: 45, label: 'Beetle', texture: 'beetle' },
  millipede: { points: 1, speed: 28, label: 'Millipede', texture: 'millipede' },
  snail: { points: 1, speed: 12, label: 'Snail', texture: 'snail' },
  crab: { points: 3, speed: 55, label: 'Land crab', texture: 'crab' },
  golden: { points: 5, speed: 105, label: 'Golden cricket', texture: 'cricket' },
  mega: { points: 10, speed: 150, label: 'Giant golden cricket', texture: 'cricket' },
};

/**
 * Something the frog can catch. On the projector it moves in short hops/wiggles and stays where
 * `canGo` allows; on phones it glides to where the projector says it is.
 */
export class Prey {
  readonly sprite: Phaser.GameObjects.Image;
  /** Soft glow so bugs stay visible after dark. */
  readonly halo: Phaser.GameObjects.Image;
  readonly tag?: Phaser.GameObjects.Text;
  alive = true;
  private heading = Math.random() * Math.PI * 2;
  private turnIn = 0;
  private hop = 0;
  private target = { x: 0, y: 0 };

  constructor(private readonly scene: Phaser.Scene, readonly kind: PreyKind, x: number, y: number, private readonly canGo: (x: number, y: number) => boolean = () => true, readonly id = 0, readonly owner?: { id: string; name: string }) {
    this.sprite = scene.add.image(x, y, PREY[kind].texture).setScale(kind === 'mega' ? SCALE * 1.7 : SCALE).setDepth(y);
    const gold = kind === 'golden' || kind === 'mega';
    if (gold) this.sprite.setTint(0xffd84a);
    this.halo = scene.add.image(x, y, 'glow').setScale(kind === 'mega' ? 4 : gold ? 2.6 : 1.8).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(gold ? 0xffd84a : 0xc8f07a).setAlpha(gold ? .5 : 0);
    this.target = { x, y };
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
    const hopper = this.kind === 'cricket' || this.kind === 'golden' || this.kind === 'mega';
    const moving = hopper ? this.hop % 1100 < 380 : true;
    if (moving) {
      let x = this.sprite.x + Math.cos(this.heading) * speed * delta / 1000;
      let y = this.sprite.y + Math.sin(this.heading) * speed * delta / 1000;
      if (!this.canGo(x, y)) { this.heading += Math.PI * (.7 + Math.random() * .6); x = this.sprite.x; y = this.sprite.y; }
      this.sprite.setPosition(x, y).setDepth(y).setFlipX(Math.cos(this.heading) < 0);
    }
    if (hopper) this.sprite.setTexture(moving ? 'cricket-1' : 'cricket');
    this.halo.setPosition(this.sprite.x, this.sprite.y);
    this.tag?.setPosition(this.sprite.x, this.sprite.y - 42);
  }

  /** Phones: where the projector says the bug is now. */
  moveTo(x: number, y: number): void { this.target = { x, y }; }

  /** Phones: glide towards the last known spot. */
  follow(delta: number): void {
    if (!this.alive) return;
    const dx = this.target.x - this.sprite.x, dy = this.target.y - this.sprite.y;
    const far = Math.hypot(dx, dy) > 200;
    const k = far ? 1 : 1 - Math.exp(-delta / 90);
    const x = this.sprite.x + dx * k, y = this.sprite.y + dy * k;
    if (Math.abs(dx) > .5) this.sprite.setFlipX(dx < 0);
    this.hop += delta;
    const hopper = this.kind === 'cricket' || this.kind === 'golden' || this.kind === 'mega';
    if (hopper) this.sprite.setTexture(Math.abs(dx) + Math.abs(dy) > 3 ? 'cricket-1' : 'cricket');
    this.sprite.setPosition(x, y).setDepth(y);
    this.halo.setPosition(x, y);
  }

  /** How strongly the bug glows (0 in daylight). Gold bugs always shine a little. */
  setGlow(level: number): void {
    const gold = this.kind === 'golden' || this.kind === 'mega';
    this.halo.setAlpha(Math.min(1, (gold ? .5 : 0) + level * (gold ? .5 : .8)));
  }

  /** Pulled into the frog's mouth by the tongue (after `delay`, when the tongue gets there). */
  eat(toX: number, toY: number, delay = 0): void {
    this.alive = false;
    this.tag?.destroy(); this.halo.destroy();
    this.scene.tweens.add({ targets: this.sprite, x: toX, y: toY, scale: 1, delay, duration: 110, ease: 'Quad.easeIn', onComplete: () => this.sprite.destroy() });
  }

  destroy(): void { this.alive = false; this.sprite.destroy(); this.halo.destroy(); this.tag?.destroy(); }
}

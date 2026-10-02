import Phaser from 'phaser';
import { textOn } from '../systems/match';
import type { BoostKind } from '../data/game';
import { frogKey, hatKey, lookColor, type Look } from '../data/looks';
import type { Facing } from '../systems/world';

export type Control = 'phone' | 'bot';

const SIZE = 3.4;
/** The sprite's origin sits at the frog's feet, so squash and stretch keep it planted. */
const FEET = .9;
const FEET_OFFSET = (FEET - .5) * 24 * SIZE;
const HOP_MS = 290;
const LICK_OUT = 70, LICK_BACK = 110;
const MOUTH: Record<Facing, [number, number]> = { down: [0, -2], up: [0, -16], left: [-26, -4], right: [26, -4] };
/** Where a hat sits on the head (art pixels in the 24 × 24 frog). */
const HAT_X: Record<Facing, number> = { down: 12, up: 12, left: 10, right: 14 };

export interface FrogOptions {
  id: string;
  name: string;
  look: Look;
  control: Control;
  /** Name tag font size in world pixels (bigger on the zoomed-out projector). */
  tagSize?: number;
}

/**
 * One player's mountain chicken, in its chosen skin, hat and colour. Whoever owns it moves it
 * (the projector for computer frogs, the phone for its own frog, snapshots for everyone else's);
 * this is the look and the animation: squash-and-stretch hops, breathing, blinking, a tongue that
 * snaps out at bugs, being carried off when caught, and dropping back in. On the projector it also
 * keeps the frog's score and state.
 */
export class PartyFrog {
  readonly id: string;
  readonly control: Control;
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Ellipse;
  readonly hat: Phaser.GameObjects.Image;
  readonly tag: Phaser.GameObjects.Text;
  /** Small icon next to the name while a boost is active. */
  readonly badge: Phaser.GameObjects.Image;
  name: string;
  look: Look;
  x: number;
  y: number;
  facing: Facing = 'down';
  score = 0;
  roundScore = 0;
  online = true;
  /** Counts the times the projector moved this frog itself (respawns, knock-backs). */
  seq = 1;
  /** Boost name → when it runs out. */
  boosts = new Map<BoostKind, number>();
  /** Caught chytrid fungus: slow, can't eat, until it reaches a warm pool. */
  sick = false;
  /** Can't get sick again until this time (just cured). */
  immuneUntil = 0;
  /** Last time this player got the cave scare. */
  caveAt = -Infinity;
  /** Can't move until this time (caught, scared). */
  frozenUntil = 0;
  /** Can't be caught again until this time. */
  safeUntil = 0;
  /** Can't lick again until this time. */
  nextLick = 0;
  /** Called when the frog lands from a hop (for dust). */
  onLand?: (x: number, y: number, big: boolean) => void;
  private hopT = 0;
  private squash = 0;
  private breath = Math.random() * 10;
  private blinkAt = 0;
  private lickAt = -9999;
  private lickTo = { x: 0, y: 0 };
  private capturedAt = -9999;
  private capturedUntil = 0;
  private capturedTo: { x: number; y: number } | null = null;
  private dropAt = -9999;
  private pingAt = -9999;
  private dropHeight = 380;
  private hidden = false;
  private tagSize: number;

  constructor(private readonly scene: Phaser.Scene, options: FrogOptions, x: number, y: number) {
    this.id = options.id; this.name = options.name; this.look = options.look; this.control = options.control;
    this.tagSize = options.tagSize ?? 24;
    this.x = x; this.y = y;
    this.ring = scene.add.ellipse(x, y + 12, 84, 28);
    this.shadow = scene.add.image(x, y + 12, 'frog-shadow').setScale(2.6).setAlpha(.45);
    this.sprite = scene.add.image(x, y, 'frog-down-0').setScale(SIZE).setOrigin(.5, FEET);
    this.hat = scene.add.image(x, y, 'hat-crown').setOrigin(.5, 1).setScale(SIZE).setVisible(false);
    this.tag = scene.add.text(x, y - 56, this.name, { fontFamily: 'Pixelify', fontSize: `${this.tagSize}px`, fontStyle: 'bold', padding: { x: 7, y: 1 } }).setOrigin(.5).setDepth(4000);
    this.badge = scene.add.image(x, y, 'boost-speed').setScale(2.4).setDepth(4001).setVisible(false);
    this.setLook(options.look);
    this.draw(0, 1, 1, 0);
  }

  get isBot(): boolean { return this.control === 'bot'; }
  get color(): string { return lookColor(this.look).hex; }
  /** Being carried off by a hunter or shut in a trap. */
  isCaptured(now: number): boolean { return now < this.capturedUntil; }
  canAct(now: number): boolean { return this.online && now >= this.frozenUntil && !this.isCaptured(now) && !this.hidden && now - this.dropAt > 350; }
  get isHidden(): boolean { return this.hidden; }

  /** Where the tongue comes out. */
  mouth(): { x: number; y: number } { const [dx, dy] = MOUTH[this.facing]; return { x: this.x + dx, y: this.y + dy }; }

  rename(name: string): void { this.name = name; this.tag.setText(name); }

  setLook(look: Look): void {
    this.look = look;
    const hex = Phaser.Display.Color.HexStringToColor(this.color).color;
    this.ring.setStrokeStyle(6, hex, 1).setFillStyle(hex, .35);
    this.tag.setColor(textOn(this.color)).setBackgroundColor(this.color);
    this.tag.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const hat = hatKey(look.hat);
    if (hat) this.hat.setTexture(hat);
    this.hat.setVisible(!!hat);
  }

  boosted(kind: BoostKind, now: number): boolean { return (this.boosts.get(kind) ?? 0) > now; }

  /** "Find me": a big jump, and the ring and name flash for two seconds. */
  ping(now: number): void { this.pingAt = now; if (this.canAct(now)) this.drop(now, 120); }

  /** Inside the cave: invisible. */
  hide(hidden: boolean): void { this.hidden = hidden; }

  teleport(x: number, y: number): void { this.x = x; this.y = y; this.hopT = 0; }

  /** Turn to face the way it's going. */
  face(dx: number, dy: number): void {
    if (!dx && !dy) return;
    this.facing = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
  }

  /** Falls in from above and lands with a splat (joining, coming back after being caught, "find me"). */
  drop(now: number, height = 380): void { this.dropAt = now; this.dropHeight = height; this.hopT = 0; }

  /** Snap the tongue out at a bug. */
  lick(x: number, y: number, now: number): void {
    this.lickAt = now; this.lickTo = { x, y };
    this.face(x - this.x, y - this.y);
  }

  /** Grabbed: flash, then get carried towards `to` (a hunter's sack) or vanish behind bars (a trap). */
  capture(now: number, to: { x: number; y: number } | null, ms = 2600): void {
    this.capturedAt = now; this.capturedUntil = now + ms; this.capturedTo = to;
  }

  /** Ends a capture early (the projector moved the frog back). */
  release(): void { this.capturedUntil = 0; }

  /** Animates one frame. `moving` keeps it hopping; licks and blinks happen on their own. */
  update(now: number, delta: number, moving: boolean): void {
    if (this.isCaptured(now)) { this.drawCaptured(now); return; }
    if (this.capturedUntil) { this.capturedUntil = 0; this.sprite.clearTint(); }

    // Hop cycle: keep hopping while moving; finish the current hop when it stops.
    if (moving || this.hopT > 0) {
      this.hopT += delta / HOP_MS;
      if (this.hopT >= 1) { this.hopT = moving ? this.hopT - 1 : 0; this.squash = 1; this.onLand?.(this.x, this.y + 14, false); }
    }
    this.squash = Math.max(0, this.squash - delta / 140);
    this.breath += delta / 420;

    let lift = 0, air = 0;
    const dropT = (now - this.dropAt) / 420;
    if (dropT >= 0 && dropT < 1) {
      lift = (1 - dropT) ** 2 * this.dropHeight; air = 1 - dropT;
    } else if (dropT >= 1 && dropT < 1.1 && this.squash < .5) {
      this.squash = 1.5; this.onLand?.(this.x, this.y + 14, true);
    } else if (this.hopT > 0) {
      air = Math.sin(Math.PI * this.hopT);
      lift = air * 14;
    }
    const idle = !moving && this.hopT === 0;
    const breathe = idle ? Math.sin(this.breath) * .03 : 0;
    const sy = 1 + .18 * air - .26 * Math.min(1, this.squash) + breathe - (this.squash > 1 ? .1 : 0);
    const sx = 1 - .1 * air + .24 * Math.min(1.4, this.squash) - breathe * .5;

    if (!this.blinkAt || now > this.blinkAt + 140) this.blinkAt = now + 1800 + Math.random() * 3600;
    const licking = now - this.lickAt < LICK_OUT + LICK_BACK;
    let frame = 0;
    if (licking) frame = 4;
    else if (this.hopT > 0) frame = this.hopT < .14 || this.hopT > .88 ? 1 : 2;
    else if (now >= this.blinkAt) frame = 3;
    this.sprite.setTexture(frogKey(this.look.skin, this.facing, frame));
    this.draw(lift, sx, sy, air, 0, frame === 1 ? 1 : 0);

    const blink = now < this.safeUntil && Math.floor(now / 120) % 2 === 0;
    const alpha = this.hidden ? 0 : blink ? .45 : 1;
    this.sprite.setAlpha(alpha);
    this.hat.setAlpha(alpha);
    if (this.sick) this.sprite.setTint(0x9fe07a); else if (this.boosted('shield', now)) this.sprite.setTint(0xb8ffb0); else this.sprite.clearTint();
    // "Find me": the ring pulses and grows, the name tag bounces.
    const pinged = now - this.pingAt < 2200;
    const pulse = pinged ? 1 + .5 * Math.abs(Math.sin((now - this.pingAt) / 160)) : 1;
    this.ring.setScale(pulse).setAlpha(this.hidden ? 0 : 1);
    this.tag.setScale(pinged ? 1.25 : 1).setAlpha(this.hidden ? 0 : this.isBot || !this.online ? .6 : 1);
    this.shadow.setAlpha(this.hidden ? 0 : this.shadow.alpha);
    const active = [...this.boosts].find(([, until]) => until > now);
    this.badge.setVisible(!!active && !this.hidden);
    if (active) this.badge.setTexture(`boost-${active[0]}`).setPosition(this.x + this.tag.width / 2 * this.tag.scaleX + 14, this.tag.y);
  }

  /** The tongue: out to the bug, then back with it. */
  drawTongue(graphics: Phaser.GameObjects.Graphics, now: number): void {
    const t = now - this.lickAt;
    if (t > LICK_OUT + LICK_BACK || this.isCaptured(now)) return;
    const reach = t < LICK_OUT ? t / LICK_OUT : 1 - (t - LICK_OUT) / LICK_BACK;
    const from = this.mouth();
    const tip = { x: from.x + (this.lickTo.x - from.x) * reach, y: from.y + (this.lickTo.y - from.y) * reach };
    graphics.lineStyle(9, 0x8a2a3a, 1).lineBetween(from.x, from.y, tip.x, tip.y);
    graphics.lineStyle(5, 0xe86a8a, 1).lineBetween(from.x, from.y, tip.x, tip.y);
    graphics.fillStyle(0x8a2a3a, 1).fillCircle(tip.x, tip.y, 7);
    graphics.fillStyle(0xff8aa8, 1).fillCircle(tip.x, tip.y, 5);
  }

  private drawCaptured(now: number): void {
    const t = now - this.capturedAt;
    this.ring.setVisible(false);
    if (t < 280) {
      // Struggle: flash and shake.
      this.sprite.setTexture(frogKey(this.look.skin, this.facing, 4)).setTintFill(Math.floor(t / 70) % 2 ? 0xffffff : 0xff6a4a);
      this.draw(0, 1.15, .9, 0, Math.sin(t / 18) * 5);
      this.ring.setVisible(false);
      return;
    }
    this.sprite.clearTint();
    const p = Math.min(1, (t - 280) / 380);
    if (this.capturedTo) {
      // Swept up into the hunter's sack.
      const x = this.x + (this.capturedTo.x - this.x) * p, y = this.y + (this.capturedTo.y - this.y) * p;
      this.sprite.setPosition(x, y + FEET_OFFSET - Math.sin(Math.PI * p) * 60).setScale(SIZE * (1 - p), SIZE * (1 - p)).setDepth(this.y + 1).setAlpha(1);
      this.shadow.setVisible(p < 1).setScale(2.6 * (1 - p), 2.6 * (1 - p));
      this.hat.setVisible(false);
      this.tag.setPosition(this.x, this.y - 54);
    } else {
      // Shut in a cage: the frog stays put, hidden behind the bars.
      this.sprite.setAlpha(0);
      this.hat.setVisible(false);
      this.shadow.setVisible(false);
    }
  }

  private draw(lift: number, sx: number, sy: number, air: number, shake = 0, crouch = 0): void {
    const scaleX = SIZE * sx, scaleY = SIZE * sy;
    this.sprite.setVisible(true).setPosition(this.x + shake, this.y + FEET_OFFSET - lift).setScale(scaleX, scaleY).setDepth(this.y + 1);
    const hat = !!hatKey(this.look.hat);
    if (hat) {
      this.hat.setVisible(true)
        .setPosition(this.sprite.x + (HAT_X[this.facing] - 12) * scaleX, this.sprite.y + (5 + crouch - 24 * FEET) * scaleY)
        .setScale(scaleX, scaleY).setFlipX(this.facing === 'right').setDepth(this.y + 1.5);
    }
    this.shadow.setVisible(true).setPosition(this.x, this.y + 12).setDepth(this.y - 2).setScale(2.6 * (1 - .3 * air), 2.6 * (1 - .3 * air)).setAlpha(.45 * (1 - .4 * air));
    this.ring.setVisible(true).setPosition(this.x, this.y + 13).setDepth(this.y - 1);
    this.tag.setPosition(this.x, this.y - 56 - (hat ? 30 : 0) - (this.tagSize - 24) * .6 - lift * .6);
  }

  setVisible(visible: boolean): void {
    for (const part of [this.sprite, this.shadow, this.ring, this.tag]) part.setVisible(visible);
    this.hat.setVisible(visible && !!hatKey(this.look.hat));
    if (!visible) this.badge.setVisible(false);
  }

  destroy(): void {
    for (const part of [this.sprite, this.shadow, this.ring, this.hat, this.tag, this.badge]) part.destroy();
  }
}

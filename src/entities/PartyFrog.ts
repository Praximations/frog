import Phaser from 'phaser';
import { TEAMS, addPoints, type Team } from '../systems/match';

export type Control = 'phone' | 'arrows' | 'wasd' | 'bot';
type Facing = 'down' | 'up' | 'left' | 'right';

const SIZE = 3.4;
/** The sprite's origin sits at the frog's feet, so squash and stretch keep it planted. */
const FEET = .9;
const FEET_OFFSET = (FEET - .5) * 24 * SIZE;
const HOP_MS = 290;
const LICK_OUT = 70, LICK_BACK = 110;
const MOUTH: Record<Facing, [number, number]> = { down: [0, -2], up: [0, -16], left: [-26, -4], right: [26, -4] };

/**
 * One player's mountain chicken. Moves straight from a joystick vector; the look is all animation:
 * squash-and-stretch hops, breathing, blinking, a tongue that snaps out at bugs, being carried
 * off when caught, and dropping back in.
 */
export class PartyFrog {
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Ellipse;
  readonly tag: Phaser.GameObjects.Text;
  x: number;
  y: number;
  input = { x: 0, y: 0 };
  score = 0;
  online = true;
  /** Can't move until this time (caught, scared). */
  frozenUntil = 0;
  /** Can't be caught again until this time. */
  safeUntil = 0;
  /** Can't lick again until this time. */
  nextLick = 0;
  /** Called when the frog lands from a hop (for dust). */
  onLand?: (x: number, y: number, big: boolean) => void;
  private facing: Facing = 'down';
  private hopT = 0;
  private squash = 0;
  private breath = Math.random() * 10;
  private blinkAt = 0;
  private lickAt = -9999;
  private lickTo = { x: 0, y: 0 };
  private capturedAt = -9999;
  private capturedUntil = 0;
  private capturedTo: { x: number; y: number } | null = null;
  private home = { x: 0, y: 0 };
  private dropAt = -9999;

  constructor(private readonly scene: Phaser.Scene, readonly id: string, public name: string, public team: Team, readonly control: Control, x: number, y: number) {
    this.x = x; this.y = y;
    this.ring = scene.add.ellipse(x, y + 12, 78, 26).setStrokeStyle(5, TEAMS[team].hex, 1).setFillStyle(TEAMS[team].hex, .3);
    this.shadow = scene.add.image(x, y + 12, 'frog-shadow').setScale(2.6).setAlpha(.45);
    this.sprite = scene.add.image(x, y, 'frog-down-0').setScale(SIZE).setOrigin(.5, FEET);
    this.tag = scene.add.text(x, y - 52, name, { fontFamily: 'Pixelify', fontSize: '17px', color: '#fffbea', backgroundColor: TEAMS[team].color, padding: { x: 6, y: 1 } }).setOrigin(.5).setDepth(4000);
    this.tag.setStroke('#2a2018', 3);
    if (control === 'bot') this.tag.setAlpha(.75);
    this.draw(0, 1, 1, 0);
  }

  get isBot(): boolean { return this.control === 'bot'; }
  /** Being carried off by a hunter or shut in a trap. */
  isCaptured(now: number): boolean { return now < this.capturedUntil; }
  canAct(now: number): boolean { return this.online && now >= this.frozenUntil && !this.isCaptured(now) && now - this.dropAt > 350; }

  /** Where the tongue comes out. */
  mouth(): { x: number; y: number } { const [dx, dy] = MOUTH[this.facing]; return { x: this.x + dx, y: this.y + dy }; }

  setTeam(team: Team): void {
    this.team = team;
    this.ring.setStrokeStyle(5, TEAMS[team].hex, 1).setFillStyle(TEAMS[team].hex, .3);
    this.tag.setBackgroundColor(TEAMS[team].color);
  }

  rename(name: string): void { this.name = name; this.tag.setText(name); }

  /** Returns the points actually changed (never below zero). */
  addPoints(points: number): number {
    const before = this.score;
    this.score = addPoints(this.score, points);
    return this.score - before;
  }

  teleport(x: number, y: number): void { this.x = x; this.y = y; this.hopT = 0; }

  /** Falls in from above and lands with a splat (joining, or coming back after being caught). */
  drop(now: number): void { this.dropAt = now; this.hopT = 0; }

  /** Snap the tongue out at a bug. */
  lick(x: number, y: number, now: number): void {
    this.lickAt = now; this.lickTo = { x, y };
    const dx = x - this.x, dy = y - this.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
  }

  /** Grabbed: flash, get carried towards `to` (a hunter's sack) or stay put (a trap), then drop back in at `home`. */
  capture(now: number, to: { x: number; y: number } | null, home: { x: number; y: number }, ms = 2600): void {
    this.capturedAt = now; this.capturedUntil = now + ms; this.capturedTo = to; this.home = home;
    this.frozenUntil = now + ms; this.safeUntil = now + ms + 2600;
    this.input = { x: 0, y: 0 };
  }

  update(now: number, delta: number, bounds: Phaser.Geom.Rectangle, speed: number): void {
    if (this.capturedUntil && now >= this.capturedUntil) {
      this.capturedUntil = 0;
      this.teleport(this.home.x, this.home.y);
      this.drop(now);
    }
    if (this.isCaptured(now)) { this.drawCaptured(now); return; }

    const frozen = now < this.frozenUntil;
    const direction = frozen ? new Phaser.Math.Vector2() : new Phaser.Math.Vector2(this.input.x, this.input.y).limit(1);
    const moving = direction.lengthSq() > 0.01;
    const pace = speed * (this.isBot ? .72 : 1);
    this.x = Phaser.Math.Clamp(this.x + direction.x * pace * delta / 1000, bounds.left, bounds.right);
    this.y = Phaser.Math.Clamp(this.y + direction.y * pace * delta / 1000, bounds.top, bounds.bottom);
    if (moving && now - this.lickAt > LICK_OUT + LICK_BACK) this.facing = Math.abs(direction.x) > Math.abs(direction.y) ? direction.x > 0 ? 'right' : 'left' : direction.y > 0 ? 'down' : 'up';

    // Hop cycle: keep hopping while moving; finish the current hop when the stick is released.
    if (moving || this.hopT > 0) {
      this.hopT += delta / HOP_MS;
      if (this.hopT >= 1) { this.hopT = moving ? this.hopT - 1 : 0; this.squash = 1; this.onLand?.(this.x, this.y + 14, false); }
    }
    this.squash = Math.max(0, this.squash - delta / 140);
    this.breath += delta / 420;

    let lift = 0, air = 0;
    const dropT = (now - this.dropAt) / 420;
    if (dropT >= 0 && dropT < 1) {
      lift = (1 - dropT) ** 2 * 380; air = 1 - dropT;
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
    this.sprite.setTexture(`frog-${this.facing}-${frame}`);
    this.draw(lift, sx, sy, air);

    const blink = now < this.safeUntil && Math.floor(now / 120) % 2 === 0;
    this.sprite.setAlpha(blink ? .45 : 1).clearTint();
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
      this.sprite.setTexture(`frog-${this.facing}-4`).setTintFill(Math.floor(t / 70) % 2 ? 0xffffff : 0xff6a4a);
      this.draw(0, 1.15, .9, 0, Math.sin(t / 18) * 5);
      return;
    }
    this.sprite.clearTint();
    const p = Math.min(1, (t - 280) / 380);
    if (this.capturedTo) {
      // Swept up into the hunter's sack.
      const x = this.x + (this.capturedTo.x - this.x) * p, y = this.y + (this.capturedTo.y - this.y) * p;
      this.sprite.setPosition(x, y + FEET_OFFSET - Math.sin(Math.PI * p) * 60).setScale(SIZE * (1 - p), SIZE * (1 - p)).setDepth(this.y + 1);
      this.shadow.setVisible(p < 1).setScale(2.6 * (1 - p), 2.6 * (1 - p));
      this.tag.setPosition(this.x, this.y - 54);
    } else {
      // Shut in a cage: the frog stays put, hidden behind the bars.
      this.sprite.setAlpha(.0);
      this.shadow.setVisible(false);
    }
  }

  private draw(lift: number, sx: number, sy: number, air: number, shake = 0): void {
    this.sprite.setVisible(true).setPosition(this.x + shake, this.y + FEET_OFFSET - lift).setScale(SIZE * sx, SIZE * sy).setDepth(this.y + 1);
    this.shadow.setVisible(true).setPosition(this.x, this.y + 12).setDepth(this.y - 2).setScale(2.6 * (1 - .3 * air), 2.6 * (1 - .3 * air)).setAlpha(.45 * (1 - .4 * air));
    this.ring.setVisible(true).setPosition(this.x, this.y + 13).setDepth(this.y - 1);
    this.tag.setPosition(this.x, this.y - 54 - lift * .6);
  }

  setVisible(visible: boolean): void {
    for (const part of [this.sprite, this.shadow, this.ring, this.tag]) part.setVisible(visible);
  }

  destroy(): void {
    for (const part of [this.sprite, this.shadow, this.ring, this.tag]) part.destroy();
  }
}

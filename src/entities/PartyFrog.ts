import Phaser from 'phaser';
import { TEAMS, addPoints, type Team } from '../systems/match';

export type Control = 'phone' | 'arrows' | 'wasd' | 'bot';

/** One player's mountain chicken in the shared pond. Moves straight from a joystick vector. */
export class PartyFrog {
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Ellipse;
  readonly tag: Phaser.GameObjects.Text;
  x: number;
  y: number;
  input = { x: 0, y: 0 };
  score = 0;
  roundScore = 0;
  online = true;
  /** Can't move until this time (caught, stunned). */
  frozenUntil = 0;
  /** Moves at half speed until this time (chytrid). */
  slowUntil = 0;
  /** Can't be caught again until this time. */
  safeUntil = 0;
  hidden = false;
  carrying: Phaser.GameObjects.Image | null = null;
  private facing: 'down' | 'up' | 'left' | 'right' = 'down';
  private phase = Math.random() * 10;

  constructor(private readonly scene: Phaser.Scene, readonly id: string, public name: string, public team: Team, readonly control: Control, x: number, y: number) {
    this.x = x; this.y = y;
    this.ring = scene.add.ellipse(x, y + 12, 78, 26).setStrokeStyle(5, TEAMS[team].hex, 1).setFillStyle(TEAMS[team].hex, .3);
    this.shadow = scene.add.image(x, y + 12, 'frog-shadow').setScale(2.6).setAlpha(.45);
    this.sprite = scene.add.image(x, y, 'frog-down-0').setScale(3.4);
    this.tag = scene.add.text(x, y - 52, name, { fontFamily: 'Pixelify', fontSize: '17px', color: '#fffbea', backgroundColor: TEAMS[team].color, padding: { x: 6, y: 1 } }).setOrigin(.5).setDepth(4000);
    this.tag.setStroke('#2a2018', 3);
    if (control === 'bot') this.tag.setAlpha(.75);
  }

  get isBot(): boolean { return this.control === 'bot'; }

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
    this.roundScore = addPoints(this.roundScore, points);
    return this.score - before;
  }

  teleport(x: number, y: number): void { this.x = x; this.y = y; this.draw(0); }

  update(now: number, delta: number, bounds: Phaser.Geom.Rectangle, speed: number): void {
    const frozen = now < this.frozenUntil;
    const direction = frozen ? new Phaser.Math.Vector2() : new Phaser.Math.Vector2(this.input.x, this.input.y).limit(1);
    const moving = direction.lengthSq() > 0.01;
    const pace = speed * (now < this.slowUntil ? .45 : 1) * (this.isBot ? .8 : 1);
    this.x = Phaser.Math.Clamp(this.x + direction.x * pace * delta / 1000, bounds.left, bounds.right);
    this.y = Phaser.Math.Clamp(this.y + direction.y * pace * delta / 1000, bounds.top, bounds.bottom);
    if (moving) {
      this.phase += delta / 150;
      this.facing = Math.abs(direction.x) > Math.abs(direction.y) ? direction.x > 0 ? 'right' : 'left' : direction.y > 0 ? 'down' : 'up';
    }
    const lift = moving ? Math.round(Math.abs(Math.sin(this.phase)) * 2) * 4 : 0;
    const frame = moving ? lift > 4 ? 2 : lift > 0 ? 0 : 1 : (now + this.phase * 300) % 4700 > 4500 ? 3 : 0;
    this.sprite.setTexture(`frog-${this.facing}-${frame}`);
    this.draw(lift);
    const blink = now < this.safeUntil && Math.floor(now / 120) % 2 === 0;
    this.sprite.setAlpha(this.hidden ? .5 : blink ? .45 : 1);
    if (now < this.slowUntil) this.sprite.setTint(0x9fe07a); else if (!frozen) this.sprite.clearTint();
  }

  private draw(lift: number): void {
    this.sprite.setPosition(this.x, this.y - lift).setDepth(this.y + 1);
    this.shadow.setPosition(this.x, this.y + 12).setDepth(this.y - 2);
    this.ring.setPosition(this.x, this.y + 13).setDepth(this.y - 1);
    this.tag.setPosition(this.x, this.y - 54 - lift);
    this.carrying?.setPosition(this.x, this.y - 30 - lift).setDepth(this.y + 2);
  }

  setVisible(visible: boolean): void {
    for (const part of [this.sprite, this.shadow, this.ring, this.tag]) part.setVisible(visible);
    this.carrying?.setVisible(visible);
  }

  destroy(): void {
    for (const part of [this.sprite, this.shadow, this.ring, this.tag]) part.destroy();
    this.carrying?.destroy();
  }
}

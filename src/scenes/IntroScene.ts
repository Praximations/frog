import Phaser from 'phaser';
import { SPECIES } from '../data/journal';
import { sound } from '../systems/Sound';
import { go } from '../systems/flow';
import { ensureArt } from '../world/Art';
import { pondDecor, pondTerrain } from '../world/Terrain';
import { showOverlay } from '../ui/ScreenOverlay';
import { esc, $ } from '../ui/html';

const FROG_X = 930, FROG_Y = 560, FROG_SIZE = 4.4;
const CHICKEN_X = 470, CHICKEN_Y = 480, CHICKEN_SIZE = 6;
/** The front of the frog's mouth on the 'portrait' drawing (pixel 4, 33 of 72 × 52, origin .5, .95). */
const MOUTH = { x: FROG_X + (4 - 36) * FROG_SIZE, y: FROG_Y + (33 - 49.4) * FROG_SIZE };

/**
 * The opening gag: "This is a mountain chicken" — a chicken wanders in… and a giant frog leaps in
 * and eats it. Then the reveal: the mountain chicken is a frog, and it's Critically Endangered.
 * Enter or a click skips ahead; at the end it goes to the pond lobby.
 */
export class IntroScene extends Phaser.Scene {
  private root!: HTMLElement;
  private chicken!: Phaser.GameObjects.Image;
  private frog!: Phaser.GameObjects.Image;
  private frogShadow!: Phaser.GameObjects.Ellipse;
  private tongue!: Phaser.GameObjects.Graphics;
  private feathers!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private revealed = false;
  private feather?: Phaser.GameObjects.Image;
  private timers: Phaser.Time.TimerEvent[] = [];

  constructor() { super('IntroScene'); }

  create(): void {
    this.revealed = false; this.timers = [];
    ensureArt(this);
    pondTerrain(this);
    pondDecor(this);
    this.chicken = this.add.image(-90, CHICKEN_Y, 'chicken').setOrigin(.5, .9).setScale(CHICKEN_SIZE).setDepth(CHICKEN_Y);
    this.frogShadow = this.add.ellipse(FROG_X + 30, FROG_Y - 6, 260, 40, 0x203a2a, .4).setDepth(FROG_Y - 2).setVisible(false);
    this.frog = this.add.image(1520, FROG_Y, 'portrait').setOrigin(.5, .95).setScale(FROG_SIZE).setDepth(FROG_Y);
    this.tongue = this.add.graphics().setDepth(FROG_Y + 5);
    this.feathers = this.add.particles(0, 0, 'feather', { speed: { min: 90, max: 300 }, angle: { min: 190, max: 350 }, gravityY: 260, lifespan: 1600, scale: { start: 4.5, end: 3 }, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0 }, emitting: false }).setDepth(4000);
    this.dust = this.add.particles(0, 0, 'dust', { lifespan: 600, speed: { min: 60, max: 220 }, angle: { min: 190, max: 350 }, scale: { start: 4, end: 0 }, alpha: { start: .8, end: 0 }, emitting: false }).setDepth(FROG_Y + 1);

    this.root = showOverlay(this, `<section class="intro">
      <p class="intro-caption" id="caption"></p>
      <div class="intro-reveal" id="reveal" hidden>
        <h1 class="intro-title">The mountain chicken<br>is a <span>FROG!</span></h1>
        <div class="intro-plate" id="plate" hidden><b>${esc(SPECIES.commonName)}</b><i>${esc(SPECIES.scientificName)}</i><small>also called the ${esc(SPECIES.otherName.toLowerCase())}</small></div>
        <div class="intro-stamp" id="stamp" hidden>${esc(SPECIES.status.toUpperCase())}</div>
        <p class="intro-why" id="why" hidden>Why "chicken"? People used to hunt it for food and said it tastes like chicken.</p>
        <button class="start-button" id="next" hidden>LET'S PLAY ▸</button>
      </div>
      <button class="text-button intro-skip" id="skip">Skip ▸</button>
    </section>`);
    $(this.root, '#skip').addEventListener('click', () => this.advance());
    $(this.root, '#next').addEventListener('click', () => this.advance());
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || !['Enter', ' ', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); this.advance();
    };
    window.addEventListener('keydown', onKey, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', onKey, true));
    (document.activeElement as HTMLElement | null)?.blur?.();
    sound.music('forest');
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.play();
  }

  private at(ms: number, run: () => void): void { this.timers.push(this.time.delayedCall(ms, run)); }

  private caption(text: string, cls = ''): void {
    const caption = $(this.root, '#caption');
    caption.className = `intro-caption ${cls}`;
    caption.textContent = text;
    caption.hidden = !text;
    caption.style.animation = 'none'; void caption.offsetWidth; caption.style.animation = '';
  }

  private play(): void {
    this.caption('This is a MOUNTAIN CHICKEN.');
    // The chicken struts in, clucking.
    this.at(300, () => {
      sound.play('cluck');
      this.tweens.add({ targets: this.chicken, x: CHICKEN_X, duration: 2000, ease: 'Sine.easeOut' });
      for (let i = 0; i < 13; i++) this.at(300 + i * 150, () => this.chicken.setTexture(i % 2 ? 'chicken-1' : 'chicken'));
    });
    this.at(1700, () => sound.play('cluck'));
    // Peck, peck.
    [2400, 2800].forEach(t => {
      this.at(t, () => { this.chicken.setTexture('chicken-2'); sound.play('tick'); });
      this.at(t + 200, () => this.chicken.setTexture('chicken'));
    });
    // Something's coming.
    this.at(3300, () => {
      this.caption('…wait. What\'s that?', 'is-uneasy');
      sound.play('rumble');
      this.cameras.main.shake(700, .004);
      this.chicken.setTexture('chicken-3');
      this.tweens.add({ targets: this.chicken, y: CHICKEN_Y - 14, duration: 120, yoyo: true });
    });
    // The frog leaps in.
    this.at(4300, () => this.leap());
    // Tongue!
    this.at(4950, () => this.snap());
    this.at(5350, () => {
      this.frog.setTexture('portrait-full');
      sound.play('gulp');
      this.caption('GULP.', 'is-big');
      this.squash(1.12, .9, 140);
    });
    this.at(6150, () => { this.frog.setTexture('portrait'); sound.play('gulp'); this.squash(.95, 1.06, 120); });
    this.at(6750, () => this.burp());
    this.at(7700, () => this.reveal());
  }

  private leap(): void {
    sound.play('hop');
    const from = { x: 1520, y: FROG_Y };
    const state = { t: 0 };
    this.tweens.add({
      targets: state, t: 1, duration: 520, ease: 'Linear',
      onUpdate: () => {
        const x = Phaser.Math.Linear(from.x, FROG_X, state.t);
        const y = FROG_Y - Math.sin(Math.PI * state.t) * 220;
        this.frog.setPosition(x, y).setScale(FROG_SIZE * .9, FROG_SIZE * 1.12).setAngle(-8 * Math.sin(Math.PI * state.t));
      },
      onComplete: () => {
        this.frog.setPosition(FROG_X, FROG_Y).setAngle(0);
        this.frogShadow.setVisible(true);
        this.squash(1.25, .75, 160);
        sound.play('thud');
        this.cameras.main.shake(260, .01);
        this.dust.explode(18, FROG_X - 80, FROG_Y - 10);
        this.dust.explode(18, FROG_X + 100, FROG_Y - 10);
        this.caption('');
      },
    });
  }

  private squash(sx: number, sy: number, ms: number): void {
    this.frog.setScale(FROG_SIZE * sx, FROG_SIZE * sy);
    this.tweens.add({ targets: this.frog, scaleX: FROG_SIZE, scaleY: FROG_SIZE, duration: ms * 2.2, ease: 'Back.easeOut' });
  }

  /** The tongue shoots out, grabs the chicken and reels it in. */
  private snap(): void {
    this.frog.setTexture('portrait-open');
    sound.play('tongue');
    const target = { x: this.chicken.x + 6, y: this.chicken.y - 66 };
    const reach = { t: 0 };
    const draw = (tip: { x: number; y: number }) => {
      this.tongue.clear();
      this.tongue.lineStyle(18, 0x8a2a3a, 1).lineBetween(MOUTH.x, MOUTH.y, tip.x, tip.y);
      this.tongue.lineStyle(11, 0xe86a8a, 1).lineBetween(MOUTH.x, MOUTH.y, tip.x, tip.y);
      this.tongue.fillStyle(0x8a2a3a, 1).fillCircle(tip.x, tip.y, 16).fillStyle(0xff8aa8, 1).fillCircle(tip.x, tip.y, 12);
    };
    this.tweens.add({
      targets: reach, t: 1, duration: 120, ease: 'Quad.easeOut',
      onUpdate: () => draw({ x: Phaser.Math.Linear(MOUTH.x, target.x, reach.t), y: Phaser.Math.Linear(MOUTH.y, target.y, reach.t) }),
      onComplete: () => {
        sound.play('cluck');
        this.feathers.explode(16, target.x, target.y);
        this.chicken.setTexture('chicken-3');
        this.tweens.add({
          targets: this.chicken, x: MOUTH.x + 10, y: MOUTH.y + 50, scale: 1.5, angle: -200, duration: 260, ease: 'Quad.easeIn',
          onUpdate: () => draw({ x: this.chicken.x - 6, y: this.chicken.y - 40 * this.chicken.scaleY / CHICKEN_SIZE }),
          onComplete: () => { this.chicken.setVisible(false); this.tongue.clear(); this.feathers.explode(10, MOUTH.x, MOUTH.y); },
        });
      },
    });
  }

  private burp(): void {
    sound.play('burp');
    this.caption('*BURP*', 'is-big');
    this.squash(.92, 1.1, 160);
    this.frog.setTexture('portrait-open');
    this.time.delayedCall(350, () => this.frog.setTexture('portrait'));
    const feather = this.feather = this.add.image(MOUTH.x, MOUTH.y, 'feather').setScale(5).setDepth(4000);
    this.tweens.add({ targets: feather, y: MOUTH.y - 150, x: MOUTH.x - 30, duration: 500, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: feather, y: CHICKEN_Y - 10, delay: 500, duration: 2600, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: feather, x: MOUTH.x - 110, angle: 40, delay: 500, duration: 650, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
  }

  /** The punchline and the two facts that matter first: its name and how endangered it is. */
  private reveal(): void {
    if (this.revealed) return;
    this.revealed = true;
    for (const timer of this.timers) timer.remove();
    this.timers = [];
    this.tweens.killAll();
    this.feather?.destroy();
    this.chicken.setVisible(false); this.tongue.clear();
    this.frog.setTexture('portrait').setPosition(FROG_X, FROG_Y).setAngle(0).setScale(FROG_SIZE);
    this.frogShadow.setVisible(true);
    this.caption('');
    $(this.root, '#skip').hidden = true;
    $(this.root, '#reveal').hidden = false;
    sound.play('whoop');
    this.at(900, () => { $(this.root, '#plate').hidden = false; sound.play('card'); });
    this.at(1800, () => { $(this.root, '#stamp').hidden = false; sound.play('stamp'); this.cameras.main.shake(160, .006); });
    this.at(2700, () => this.finishReveal());
  }

  private finishReveal(): void {
    for (const timer of this.timers) timer.remove();
    for (const id of ['#plate', '#stamp', '#why']) $(this.root, id).hidden = false;
    const next = $(this.root, '#next'); next.hidden = false; next.focus({ preventScroll: true });
  }

  /** Enter / click: skip to the reveal, then show all of it, then go to the pond. */
  private advance(): void {
    if (!this.revealed) { this.reveal(); return; }
    if ($(this.root, '#next').hidden) { this.finishReveal(); return; }
    sound.play('click');
    go(this, 'PondScene', {}, 400);
  }
}

import Phaser from 'phaser';
import { PartyFrog } from '../entities/PartyFrog';
import { PondGame, type GameContext } from '../play/PondGame';
import { CAVE, CAVE_EXIT, MAP, clearLine, randomSpot, step, walkable, type Point } from '../world/map';
import { MapView } from '../world/mapView';
import { BOOSTS, GAME, ROUNDS, questionTimes, type BoostKind, type RoundInfo } from '../data/game';
import { formatLook, lookColor, parseLook, randomLook } from '../data/looks';
import { pickQuestions, type Question } from '../data/quiz';
import { cardByKey, type RubricKey } from '../data/journal';
import { ranking, botsNeeded, quizPoints, textOn, type Ranked } from '../systems/match';
import { classHost, type PhoneState, type PlayerEvent } from '../systems/ClassHost';
import { FACINGS, FLAG, frogPace, type FrogRow, type WorldSnapshot } from '../systems/world';
import { sound } from '../systems/Sound';
import { settings, saveSettings } from '../systems/Settings';
import { go } from '../systems/flow';
import { ensureArt, artUrl } from '../world/Art';
import { showOverlay } from '../ui/ScreenOverlay';
import { showCards, showJournal, type CardDeck } from '../ui/cards';
import { rulesHtml } from '../ui/rules';
import { banner, floatReaction, jumpscare, qrSvg } from '../ui/effects';
import { esc, $ } from '../ui/html';

type Phase = 'lobby' | 'howto' | 'roundIntro' | 'countdown' | 'play' | 'quiz' | 'reveal' | 'results' | 'info' | 'over';
const SHAPES = ['▲', '◆', '●', '■'];
/** The projector shows the whole map. */
const ZOOM = 1280 / MAP.width;
/** Text in the world is drawn bigger, because the overview is zoomed out. */
const TEXT = 1.5;

export interface MatchResult { ranks: Ranked[]; seen: RubricKey[] }

interface Quiz { question: Question; number: number; startedAt: number; answers: Map<string, { choice: number; at: number }> }
/** Where a phone's frog is heading (the phone moves it; the projector glides it there). */
interface Target { x: number; y: number; moving: boolean; at: number }

/**
 * The host's screen: an overview of the whole map for the projector. The host doesn't play; it
 * runs the game. Lobby → How to play → three rounds. In each round, quiz questions pop up in the
 * middle and a fact card follows. Players join from any phone or laptop with the code, see the
 * forest around their own frog on their own screen and move it themselves; this scene checks
 * their moves, plays out the bugs and dangers, and sends everyone snapshots of the map.
 */
export class PondScene extends Phaser.Scene {
  private frogs = new Map<string, PartyFrog>();
  private phase: Phase = 'lobby';
  private play?: PondGame;
  private roundIndex = -1;
  private paused = false;
  private holdUntil = 0;
  private scaredProjector = false;
  private questions: { question: Question; at: number }[] = [];
  private quizIndex = 0;
  private quiz?: Quiz;
  private seen: RubricKey[] = [];
  private autoNext?: Phaser.Time.TimerEvent;
  private deck?: CardDeck;
  private map!: MapView;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private root!: HTMLElement;
  private lastHud = 0;
  private lastSound = 0;
  private lastLeaders = '';
  private lastShot = 0;
  private lastReveal = 0;
  private shots = 0;
  private rosterChanged = true;
  private targets = new Map<string, Target>();
  private botTargets = new Map<string, { x: number; y: number; until: number; from: Point; check: number }>();
  private context!: GameContext;

  constructor() { super('PondScene'); }

  private get round(): RoundInfo | undefined { return ROUNDS[this.roundIndex]; }

  create(): void {
    this.frogs = new Map(); this.phase = 'lobby'; this.play = undefined; this.roundIndex = -1; this.paused = false; this.holdUntil = 0;
    this.targets = new Map(); this.botTargets = new Map(); this.lastLeaders = ''; this.scaredProjector = false; this.seen = []; this.quiz = undefined; this.deck = undefined;
    this.shots = 0; this.rosterChanged = true;
    ensureArt(this);
    this.cameras.main.setZoom(ZOOM).centerOn(MAP.width / 2, MAP.height / 2);
    this.map = new MapView(this);
    this.dust = this.add.particles(0, 0, 'dust', { lifespan: 380, speed: { min: 25, max: 80 }, angle: { min: 190, max: 350 }, scale: { start: 2.4, end: 0 }, alpha: { start: .75, end: 0 }, emitting: false }).setDepth(0);
    this.context = {
      scene: this,
      frogs: () => [...this.frogs.values()].filter(frog => frog.online),
      award: (frog, points, x, y) => this.award(frog, points, x, y),
      caught: (frog, by, grabber) => this.caught(frog, by, grabber),
      knocked: (frog, dir) => this.knocked(frog, dir),
      boost: (frog, kind) => this.boost(frog, kind),
      sick: (frog, sick) => this.sick(frog, sick),
      announce: (title, subtitle, kind) => {
        for (const old of this.root.querySelectorAll('.banner.event')) old.remove();
        void banner($(this.root, '#fx'), title, subtitle, 2200, `event ${kind ?? ''}`);
      },
      setDarkness: level => this.setDarkness(level),
    };
    this.buildHud();
    const offPlayers = classHost.subscribe(event => this.onClass(event));
    const offEvents = classHost.onEvent(event => this.onPlayerEvent(event));
    const onKey = (event: KeyboardEvent) => this.presenterKey(event);
    window.addEventListener('keydown', onKey, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKey, true);
      offPlayers(); offEvents(); this.play?.end(); this.deck?.close();
    });
    for (const player of classHost.players.values()) this.addPhoneFrog(player.id, player.name, player.look);
    sound.music('forest');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.publish({ mode: 'lobby' });
    this.renderLobby();
    void classHost.open().then(() => this.renderLobby());
    (window as unknown as { pond?: PondScene }).pond = this;
  }

  // ---------------------------------------------------------------- world

  /** Text in the world, kept smooth even though the camera is zoomed out. */
  private label(x: number, y: number, text: string, size: number, color: string, background?: string): Phaser.GameObjects.Text {
    const label = this.add.text(x, y, text, { fontFamily: 'PressStart', fontSize: `${Math.round(size * TEXT)}px`, color, stroke: '#1d1712', strokeThickness: background ? 0 : 8, backgroundColor: background, padding: background ? { x: 8, y: 6 } : undefined }).setOrigin(.5).setDepth(5000);
    label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return label;
  }

  private float(x: number, y: number, text: string, color: string, size = 20, rise = 50, ms = 900): void {
    const label = this.label(x, y, text, size, color);
    this.tweens.add({ targets: label, y: y - rise, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => label.destroy() });
  }

  /** 0 = daytime, 1 = full night. Only the ground and scenery darken, so frogs stay easy to see. */
  private setDarkness(level: number): void { this.map.setDarkness(level); }

  // ---------------------------------------------------------------- players

  private humans(): PartyFrog[] { return [...this.frogs.values()].filter(frog => !frog.isBot); }

  private addFrog(id: string, name: string, look: string, control: PartyFrog['control']): PartyFrog {
    const spot = randomSpot([...this.frogs.values()].map(frog => ({ x: frog.x, y: frog.y, r: 120 })));
    const frog = new PartyFrog(this, { id, name, look: parseLook(look), control, tagSize: 34 }, spot.x, spot.y);
    frog.onLand = (x, y, big) => this.dust.explode(big ? 12 : 3, x, y);
    frog.drop(this.time.now);
    this.frogs.set(id, frog);
    this.targets.set(id, { x: spot.x, y: spot.y, moving: false, at: 0 });
    this.rosterChanged = true;
    this.renderPlayers();
    return frog;
  }

  private addPhoneFrog(id: string, name: string, look: string): void {
    const existing = this.frogs.get(id);
    if (existing) { existing.online = true; existing.setLook(parseLook(look)); this.rosterChanged = true; }
    else { this.addFrog(id, name, look, 'phone'); sound.play('join'); }
    const frog = this.frogs.get(id)!;
    const color = lookColor(frog.look);
    classHost.sendTo(id, { kind: 'you', name: frog.name, color: color.hex, colorName: color.name });
  }

  private onClass(event: { type: 'join' | 'leave' | 'removed' | 'status'; id?: string }): void {
    if (event.type === 'status') { if (this.phase === 'lobby') this.renderLobby(); return; }
    const id = event.id!;
    if (event.type === 'join') { const player = classHost.players.get(id); if (player) this.addPhoneFrog(id, player.name, player.look); }
    else if (event.type === 'leave') { const frog = this.frogs.get(id); if (frog) frog.online = false; }
    else if (event.type === 'removed') { this.frogs.get(id)?.destroy(); this.frogs.delete(id); this.targets.delete(id); this.rosterChanged = true; }
    this.renderPlayers();
  }

  private onPlayerEvent(event: PlayerEvent): void {
    if (event.type === 'react') { floatReaction($(this.root, '#reactions'), event.emoji, event.name); sound.play('react'); }
    else if (event.type === 'ping') this.frogs.get(event.id)?.ping(this.time.now);
    else if (event.type === 'answer' && this.phase === 'quiz' && this.quiz && event.q === this.quiz.question.id && !this.quiz.answers.has(event.id) && this.frogs.has(event.id)) {
      this.quiz.answers.set(event.id, { choice: event.choice, at: this.time.now });
      sound.play('tick');
      this.renderQuizCount();
    }
  }

  /** Computer frogs join a very small game so it never feels empty. */
  private syncBots(): void {
    const bots = [...this.frogs.values()].filter(frog => frog.isBot);
    const need = botsNeeded(this.humans().filter(frog => frog.online).length);
    for (let i = bots.length; i < need; i++) this.addFrog(`bot-${i}`, `Wild Frog ${i + 1}`, formatLook(randomLook()), 'bot');
    for (const bot of bots.slice(need)) { bot.destroy(); this.frogs.delete(bot.id); this.targets.delete(bot.id); this.rosterChanged = true; }
  }

  private award(frog: PartyFrog, points: number, x: number, y: number): void {
    const before = frog.score;
    frog.score = Math.max(0, frog.score + points);
    frog.roundScore = Math.max(0, frog.roundScore + points);
    const changed = frog.score - before;
    if (points > 0 || changed) this.float(x, y - 20, points > 0 ? `+${points}` : `${changed}`, points > 0 ? '#fff6b0' : '#ff8a6a', points >= 5 ? 26 : points >= 3 ? 22 : 18);
    if (points > 0 && this.time.now - this.lastSound > 70) { this.lastSound = this.time.now; sound.play(points >= 3 ? 'catch' : 'gulp', points); }
  }

  /** Moves a frog itself (respawn, knock-back, out of the cave). Its phone follows. */
  private place(frog: PartyFrog, x: number, y: number, drop = 380): void {
    frog.teleport(x, y);
    frog.seq++;
    this.targets.set(frog.id, { x, y, moving: false, at: this.time.now });
    if (drop) frog.drop(this.time.now, drop);
  }

  private caught(frog: PartyFrog, by: 'hunter' | 'trap', grabber: { x: number; y: number } | null): void {
    const now = this.time.now, ms = 2600;
    frog.capture(now, grabber, ms);
    frog.frozenUntil = now + ms; frog.safeUntil = now + ms + 2600;
    this.time.delayedCall(ms, () => {
      if (!this.frogs.has(frog.id)) return;
      frog.release();
      const home = randomSpot([...this.frogs.values()].map(item => ({ x: item.x, y: item.y, r: 100 })));
      this.place(frog, home.x, home.y);
    });
    this.award(frog, -GAME.caughtPenalty, frog.x, frog.y - 60);
    this.float(frog.x, frog.y - 100, by === 'trap' ? 'TRAPPED!' : 'CAUGHT!', '#ff6a4a', 22, 30, 1500);
    if (grabber) this.float(grabber.x, grabber.y - 80, 'GOTCHA!', '#fff0b4', 18, 20, 1100);
    sound.play(by === 'trap' ? 'hurt' : 'spotted');
    if (frog.control === 'phone') classHost.sendTo(frog.id, { kind: 'caught', scare: settings.jumpscares, by });
    if (!this.scaredProjector) {
      // The first catch of the game gets the full-screen jump-scare on the projector.
      this.scaredProjector = true;
      this.holdUntil = now + (settings.jumpscares ? 1750 : 1350);
      jumpscare($(this.root, '#fx'), `${frog.name} got caught! People once hunted up to 36,000 of these frogs a year.`, () => undefined);
    }
  }

  private knocked(frog: PartyFrog, dir: 1 | -1): void {
    const now = this.time.now;
    frog.frozenUntil = now + 1200; frog.safeUntil = now + 2400;
    let x = frog.x;
    for (let i = 0; i < 11; i++) { const next = step(x, frog.y, dir * 10, 0); if (next.x === x) break; x = next.x; }
    this.place(frog, x, frog.y, 90);
    this.award(frog, -GAME.pigPenalty, frog.x, frog.y - 60);
    this.float(frog.x, frog.y - 100, 'OINK!', '#ffb0c0', 22, 30, 1200);
    sound.play('hurt');
    if (frog.control === 'phone') classHost.sendTo(frog.id, { kind: 'caught', scare: false, by: 'pig' });
  }

  private boost(frog: PartyFrog, kind: BoostKind): void {
    const info = BOOSTS[kind];
    frog.boosts.set(kind, this.time.now + info.seconds * 1000);
    this.float(frog.x, frog.y - 110, info.label, '#9ae0ff', 20, 40, 1300);
    sound.play('unlock');
    if (frog.control === 'phone') classHost.sendTo(frog.id, { kind: 'boost', boost: kind, seconds: info.seconds });
  }

  private sick(frog: PartyFrog, sick: boolean): void {
    this.float(frog.x, frog.y - 110, sick ? 'SICK!' : 'CURED!', sick ? '#a6f06a' : '#fff6b0', 20, 40, 1300);
    sound.play(sick ? 'wrong' : 'correct');
    if (frog.control === 'phone') classHost.sendTo(frog.id, { kind: 'sick', sick });
  }

  /** The hidden cave: hop in and something happens (on your phone). Then it spits you back out. */
  private checkCave(frog: PartyFrog, now: number): void {
    if (!frog.canAct(now) || Math.hypot(frog.x - CAVE.x, frog.y - CAVE.y) > CAVE.radius) return;
    if (now - frog.caveAt < GAME.caveCooldown * 1000) { this.place(frog, CAVE_EXIT.x, CAVE_EXIT.y, 60); this.float(frog.x, frog.y - 80, 'NOT AGAIN…', '#c8c8c8', 16, 30, 1000); return; }
    frog.caveAt = now;
    frog.hide(true);
    frog.frozenUntil = now + 4200; frog.safeUntil = now + 6500;
    this.cameras.main.shake(250, .004);
    this.time.delayedCall(2900, () => {
      this.float(CAVE.x - 40, CAVE.y - 140, 'AAAAAH!', '#ff5a3a', 26, 70, 1400);
      sound.play('hurt');
    });
    this.time.delayedCall(4200, () => { if (!this.frogs.has(frog.id)) return; frog.hide(false); this.place(frog, CAVE_EXIT.x, CAVE_EXIT.y, 140); });
    if (frog.control === 'phone' && settings.jumpscares) classHost.sendTo(frog.id, { kind: 'shock' });
  }

  // ---------------------------------------------------------------- loop

  /** Frogs can move in the lobby and while a round is on. */
  private get moving(): boolean { return !this.paused && (this.phase === 'lobby' || this.phase === 'play') && this.time.now >= this.holdUntil; }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 100);
    const moving = this.moving;
    for (const frog of this.frogs.values()) {
      let hopping = false;
      if (frog.control === 'phone') hopping = this.followPhone(frog, time, dt, moving);
      else if (moving && this.phase === 'play' && frog.canAct(time)) hopping = this.moveBot(frog, time, dt);
      frog.update(time, dt, hopping);
      const target = this.targets.get(frog.id);
      if (target) target.moving = hopping;
      if (moving) this.checkCave(frog, time);
    }
    if (time - this.lastReveal > 150) { this.lastReveal = time; this.map.reveal([...this.frogs.values()].filter(frog => !frog.isHidden)); }
    if (time - this.lastShot > (this.moving ? (classHost.kind === 'firebase' ? 150 : 100) : 400)) { this.lastShot = time; this.broadcast(time); }
    if (this.phase === 'play' && !this.paused && time >= this.holdUntil && this.play) {
      this.play.update(time, dt);
      const next = this.questions[this.quizIndex];
      if (next && this.play.elapsed >= next.at) this.startQuiz();
      else if (this.play.elapsed >= this.round!.seconds) this.endRound();
    }
    if (this.phase === 'quiz' && !this.paused && this.quiz) {
      const left = GAME.quizSeconds - (time - this.quiz.startedAt) / 1000;
      const waiting = this.humans().filter(frog => frog.online && frog.control === 'phone');
      if (left <= 0 || (waiting.length && waiting.every(frog => this.quiz!.answers.has(frog.id)) && time - this.quiz.startedAt > 1500)) this.reveal();
    }
    if (time - this.lastHud > 150) { this.lastHud = time; this.updateHud(); }
  }

  /**
   * A phone moves its own frog and says where it is. Accept the newest position (unless it's from
   * before the projector last moved the frog, or impossible), and glide there smoothly.
   */
  private followPhone(frog: PartyFrog, now: number, dt: number, moving: boolean): boolean {
    const target = this.targets.get(frog.id)!;
    const move = classHost.move(frog.id);
    if (move && move.at > target.at && moving && frog.canAct(now) && move.s === frog.seq) {
      target.at = move.at;
      if (walkable(move.x, move.y, 8)) {
        if (Math.hypot(move.x - target.x, move.y - target.y) > 700) this.place(frog, frog.x, frog.y, 0); // too far: put the phone right
        else { target.x = move.x; target.y = move.y; frog.facing = FACINGS[move.f]; }
      }
    }
    const dx = target.x - frog.x, dy = target.y - frog.y, far = Math.hypot(dx, dy);
    if (far < .5) return !!move?.m && now - move.at < 300 && moving;
    const k = 1 - Math.exp(-dt / 70);
    frog.x += dx * k; frog.y += dy * k;
    return far > 2 || (!!move?.m && moving);
  }

  /** Computer frogs head for a bug they can reach, and pick somewhere else when they get stuck. */
  private moveBot(frog: PartyFrog, now: number, dt: number): boolean {
    let target = this.botTargets.get(frog.id);
    if (!target || now > target.until) {
      const point = this.play?.botTarget(frog) ?? randomSpot();
      target = { x: point.x + Phaser.Math.Between(-12, 12), y: point.y + Phaser.Math.Between(-12, 12), until: now + 300 + Math.random() * 500, from: { x: frog.x, y: frog.y }, check: now + 700 };
      this.botTargets.set(frog.id, target);
    }
    const dx = target.x - frog.x, dy = target.y - frog.y, length = Math.hypot(dx, dy);
    if (length < 8) return false;
    const flags = (frog.boosted('speed', now) ? FLAG.speed : 0) | (frog.sick ? FLAG.sick : 0);
    const pace = frogPace(flags, true) * dt / 1000;
    const next = step(frog.x, frog.y, dx / length * pace, dy / length * pace);
    frog.face(next.x - frog.x, next.y - frog.y);
    frog.x = next.x; frog.y = next.y;
    if (now > target.check) {
      // Hardly moved: wander somewhere it can hop straight to for a while.
      if (Math.hypot(frog.x - target.from.x, frog.y - target.from.y) < 30) {
        let spot = randomSpot();
        for (let i = 0; i < 8 && !clearLine(frog, spot); i++) spot = randomSpot();
        target = { ...spot, until: now + 1800, from: { x: frog.x, y: frog.y }, check: now + 2000 };
        this.botTargets.set(frog.id, target);
      } else { target.from = { x: frog.x, y: frog.y }; target.check = now + 700; }
    }
    return true;
  }

  /** Tells every phone where everything is. */
  private broadcast(now: number): void {
    if (!classHost.connected) return;
    const frogs = [...this.frogs.values()];
    const rows: FrogRow[] = frogs.map(frog => {
      const moving = this.targets.get(frog.id)?.moving ? 1 : 0;
      let flags = 0;
      if (frog.isCaptured(now)) flags |= FLAG.captured;
      if (frog.isHidden) flags |= FLAG.hidden;
      if (now < frog.frozenUntil) flags |= FLAG.frozen;
      if (frog.sick) flags |= FLAG.sick;
      for (const kind of ['speed', 'tongue', 'double', 'shield'] as BoostKind[]) if (frog.boosted(kind, now)) flags |= FLAG[kind];
      if (frog.isBot) flags |= FLAG.bot;
      if (!frog.online) flags |= FLAG.away;
      if (now < frog.safeUntil) flags |= FLAG.safe;
      return [frog.id, Math.round(frog.x), Math.round(frog.y), FACINGS.indexOf(frog.facing) * 2 + moving, flags, frog.seq, frog.score];
    });
    const shot: WorldSnapshot = { n: ++this.shots, f: rows, b: [], ...(this.play?.snapshot() ?? {}) };
    if (this.play && this.round) shot.t = Math.max(0, Math.ceil(this.round.seconds - this.play.elapsed));
    if (this.rosterChanged || this.shots % 20 === 0) {
      this.rosterChanged = false;
      shot.r = frogs.map(frog => [frog.id, frog.name, formatLook(frog.look)]);
    }
    classHost.broadcast(shot);
  }

  /** Presenter keys: Enter / Space = next, Esc = menu. */
  private presenterKey(event: KeyboardEvent): void {
    if (event.repeat || this.root.querySelector('.journal-book') || this.deck?.open) return;
    if (event.key === 'Escape') {
      if (this.paused) this.resume(); else this.openMenu();
    } else if ((event.key === 'Enter' || event.key === ' ') && !this.paused && !$(this.root, '#menu-slot').childElementCount) {
      event.preventDefault();
      this.next();
    }
  }

  // ---------------------------------------------------------------- flow

  /** The big NEXT button (and Enter): moves on from whatever is showing. */
  private next(): void {
    if (this.phase === 'lobby') this.startMatch();
    else if (this.phase === 'howto') this.roundIntro();
    else if (this.phase === 'roundIntro') this.countdown();
    else if (this.phase === 'reveal') this.resumeAfterQuiz();
    else if (this.phase === 'results') this.info();
  }

  private setNext(label: string, autoSeconds = 0): void {
    this.autoNext?.remove(); this.autoNext = undefined;
    const bottom = $(this.root, '#pond-bottom');
    bottom.hidden = !label;
    bottom.innerHTML = label ? `<button class="start-button" id="next">${esc(label)} ▸</button>${autoSeconds ? `<div class="next-timer"><i style="animation-duration:${autoSeconds}s"></i></div>` : ''}` : '';
    if (label) $(bottom, '#next').addEventListener('click', () => this.next());
    if (autoSeconds) { const phase = this.phase; this.autoNext = this.time.delayedCall(autoSeconds * 1000, () => { if (this.phase === phase && !this.paused) this.next(); }); }
  }

  private modal(html: string): void { $(this.root, '#modal-slot').innerHTML = html; }

  private startMatch(): void {
    if (this.phase !== 'lobby') return;
    sound.play('click');
    this.phase = 'howto';
    this.syncBots();
    for (const frog of this.frogs.values()) { frog.score = 0; frog.roundScore = 0; }
    this.root.querySelector('.pond')?.classList.remove('is-lobby');
    $(this.root, '#lobby').hidden = true;
    this.publish({ mode: 'intro', title: 'How to play', goal: 'Eat bugs, grab boosts, answer the quiz!' });
    this.modal(`<div class="howto-card" role="dialog" aria-label="How to play"><h2>HOW TO PLAY</h2>${rulesHtml()}<p class="howto-note">3 rounds · quiz questions pop up during the rounds · most points wins</p></div>`);
    this.setNext('LET\'S GO', 14);
  }

  private roundIntro(): void {
    this.roundIndex++;
    const round = this.round;
    if (!round) { this.finish(); return; }
    this.phase = 'roundIntro';
    for (const frog of this.frogs.values()) {
      frog.roundScore = 0; frog.frozenUntil = 0; frog.safeUntil = 0; frog.sick = false; frog.boosts.clear(); frog.hide(false); frog.release();
      const spot = randomSpot([...this.frogs.values()].map(item => ({ x: item.x, y: item.y, r: 90 })));
      this.place(frog, spot.x, spot.y);
    }
    this.setDarkness(round.darkness);
    sound.music(null);
    this.publish({ mode: 'intro', title: `Round ${round.number}: ${round.title}`, goal: `${round.goal} ${round.twist}` });
    this.modal(`<div class="round-card round-${round.id}" role="dialog" aria-label="Round ${round.number}">
      <span class="rc-number">ROUND ${round.number} OF ${ROUNDS.length}</span>
      <h2>${esc(round.title)}</h2>
      <p class="rc-goal">${esc(round.goal)}</p>
      <p class="rc-twist">${esc(round.twist)}</p>
    </div>`);
    this.setNext('START ROUND', 8);
  }

  private countdown(): void {
    if (this.phase !== 'roundIntro' && this.phase !== 'reveal') return;
    const resuming = this.phase === 'reveal';
    this.phase = 'countdown';
    this.modal('');
    this.setNext('');
    (document.activeElement as HTMLElement | null)?.blur?.();
    const fx = $(this.root, '#fx');
    ['3', '2', '1', 'GO!'].forEach((label, i) => this.time.delayedCall(i * 650, () => {
      sound.play('tick', i === 3 ? 1 : 0);
      void banner(fx, label, '', 500, i === 3 ? 'is-win countdown' : 'countdown');
      if (i === 3) resuming ? this.continuePlay() : this.startPlay();
    }));
  }

  private startPlay(): void {
    const round = this.round!;
    this.play = new PondGame(this.context, round);
    this.play.start();
    this.questions = pickQuestions(round.id, round.questions).map((question, i) => ({ question, at: questionTimes(round)[i] }));
    this.quizIndex = 0;
    this.continuePlay();
  }

  private continuePlay(): void {
    this.phase = 'play';
    const round = this.round!;
    sound.music('game');
    this.publish({ mode: 'round', round: round.number, rounds: ROUNDS.length, title: round.title, goal: round.goal });
  }

  // ---------------------------------------------------------------- quiz

  private startQuiz(): void {
    const { question } = this.questions[this.quizIndex];
    this.quizIndex++;
    this.phase = 'quiz';
    this.quiz = { question, number: this.quizIndex, startedAt: this.time.now, answers: new Map() };
    sound.music(null);
    sound.play('whoop');
    this.publish({ mode: 'quiz', q: question.id, question: question.question, answers: question.answers, seconds: GAME.quizSeconds });
    this.modal(`<div class="quiz" role="dialog" aria-label="Quiz question">
      <div class="quiz-top"><span class="quiz-label">QUIZ TIME! · ${esc(question.topic)}</span><span class="quiz-count" id="quiz-count"></span></div>
      <h2 class="quiz-question">${esc(question.question)}</h2>
      <div class="quiz-timer"><i style="animation-duration:${GAME.quizSeconds}s"></i></div>
      <ol class="quiz-answers">${question.answers.map((answer, i) => `<li class="qa qa-${i}"><span class="qa-shape">${SHAPES[i]}</span><b>${esc(answer)}</b><em class="qa-count"></em></li>`).join('')}</ol>
      <div class="quiz-fact" id="quiz-fact" hidden></div>
      <p class="quiz-hint">Answer on your phone!</p>
    </div>`);
    this.renderQuizCount();
  }

  private renderQuizCount(): void {
    const count = this.root.querySelector('#quiz-count');
    if (!count || !this.quiz) return;
    const players = this.humans().filter(frog => frog.online && frog.control === 'phone').length;
    count.textContent = `${this.quiz.answers.size} / ${players} answered`;
  }

  private reveal(): void {
    const quiz = this.quiz;
    if (!quiz || this.phase !== 'quiz') return;
    this.phase = 'reveal';
    const { question } = quiz;
    const counts = [0, 0, 0, 0];
    for (const frog of this.humans()) {
      const answer = quiz.answers.get(frog.id);
      if (answer) counts[answer.choice]++;
      const correct = answer?.choice === question.correct;
      const points = answer ? quizPoints(correct, GAME.quizSeconds - (answer.at - quiz.startedAt) / 1000, GAME.quizSeconds) : 0;
      if (points) { frog.score += points; frog.roundScore += points; }
      if (frog.control === 'phone') classHost.sendTo(frog.id, { kind: 'result', q: question.id, correct, points });
    }
    sound.play('correct');
    this.publish({ mode: 'reveal', q: question.id, correct: question.correct, answer: question.answers[question.correct], fact: question.fact });
    const box = this.root.querySelector('.quiz');
    if (box) {
      box.classList.add('is-reveal');
      box.querySelectorAll('.qa').forEach((item, i) => {
        item.classList.toggle('is-correct', i === question.correct);
        item.querySelector('.qa-count')!.textContent = `${counts[i]}`;
      });
      const fact = $(this.root, '#quiz-fact');
      fact.hidden = false;
      fact.innerHTML = `<div class="fact-art">${question.art.map(key => `<img class="pixel" src="${artUrl(key, key === 'portrait' || key === 'volcano' ? 2 : 4)}" alt="">`).join('')}</div><p>${esc(question.fact)}</p>`;
      box.querySelector('.quiz-hint')!.textContent = '';
    }
    this.setNext('BACK TO THE GAME', GAME.revealSeconds);
  }

  private resumeAfterQuiz(): void {
    this.quiz = undefined;
    this.countdown();
  }

  // ---------------------------------------------------------------- between rounds

  private endRound(): void {
    if (this.phase !== 'play') return;
    const round = this.round!;
    this.phase = 'results';
    this.play?.end(); this.play = undefined;
    sound.music('finale');
    sound.play('whistle');
    const frogs = [...this.frogs.values()];
    const top = ranking(frogs.map(frog => ({ id: frog.id, name: frog.name, score: frog.roundScore, bot: frog.isBot }))).slice(0, 5);
    const overall = ranking(frogs.map(frog => ({ id: frog.id, name: frog.name, score: frog.score, bot: frog.isBot })))[0];
    this.publish({ mode: 'results', title: `Round ${round.number} done!` });
    const color = (id: string) => this.frogs.get(id)?.color ?? '#ffffff';
    this.modal(`<div class="results-card" role="dialog" aria-label="Round results">
      <span class="rc-number">ROUND ${round.number} OF ${ROUNDS.length} · ${esc(round.title.toUpperCase())}</span>
      <h2>ROUND OVER!</h2>
      ${top.length ? `<ol class="results-top">${top.map(item => `<li><span class="medal">${['🥇', '🥈', '🥉'][item.rank - 1] ?? item.rank}</span><i class="dot" style="background:${color(item.id)}"></i><b>${esc(item.name)}</b><span>${item.score} pts this round</span></li>`).join('')}</ol>` : '<p>No players yet.</p>'}
      ${overall ? `<p class="results-leader">Leading the game: <i class="dot" style="background:${color(overall.id)}"></i><b>${esc(overall.name)}</b> with ${overall.score} points</p>` : ''}
    </div>`);
    this.setNext('DID YOU KNOW?', 12);
  }

  /** A fact card after each round. */
  private info(): void {
    const round = this.round!;
    this.phase = 'info';
    this.modal('');
    this.setNext('');
    this.seen.push(round.info);
    const card = cardByKey(round.info);
    this.publish({ mode: 'learn', title: `Did you know? ${card.title}` });
    this.deck = showCards($(this.root, '#modal-slot'), [card], { onDone: () => { this.deck = undefined; this.roundIntro(); } });
  }

  private finish(): void {
    this.phase = 'over';
    const scored = [...this.frogs.values()].map(frog => ({ id: frog.id, name: frog.name, score: frog.score, bot: frog.isBot }));
    const ranks = ranking(scored);
    for (const entry of ranks) {
      if (this.frogs.get(entry.id)?.control === 'phone') classHost.sendTo(entry.id, { kind: 'final', rank: entry.rank, of: ranks.length, score: entry.score });
    }
    this.publish({ mode: 'final' });
    const looks = Object.fromEntries([...this.frogs.values()].map(frog => [frog.id, frog.look]));
    go(this, 'FinaleScene', { result: { ranks, seen: this.seen }, looks }, 600);
  }

  private publish(state: PhoneState): void { classHost.publish(state); }

  // ---------------------------------------------------------------- presenter menu

  private openMenu(): void {
    if (this.paused) return;
    this.paused = true;
    if (this.phase === 'play') this.publish({ mode: 'paused' });
    const toggle = (id: string, label: string, on: boolean) => `<button class="toggle ${on ? 'is-on' : ''}" id="${id}">${label}<span>${on ? 'ON' : 'OFF'}</span></button>`;
    const slot = $(this.root, '#menu-slot');
    slot.innerHTML = `<div class="modal-backdrop"><section class="field-card pause-card" role="dialog" aria-modal="true" aria-labelledby="menu-title">
      <h2 id="menu-title">Host menu</h2>
      <div class="pause-actions">
        <button id="m-resume">Resume ▸</button>
        ${this.phase === 'play' ? '<button class="secondary" id="m-end">End this round</button>' : ''}
        ${this.phase !== 'lobby' ? '<button class="secondary" id="m-finish">Skip to the end</button><button class="secondary" id="m-restart">Back to lobby</button>' : '<button class="secondary" id="m-journal">Fact cards</button>'}
      </div>
      <div class="toggles">${toggle('m-sound', 'Sound', settings.sound)}${toggle('m-scare', 'Jump-scares', settings.jumpscares)}</div>
      <button class="text-button" id="m-title">Quit to the home page</button>
    </section></div>`;
    const on = (id: string, handler: () => void) => slot.querySelector(id)?.addEventListener('click', () => { sound.play('click'); handler(); });
    on('#m-resume', () => this.resume());
    on('#m-end', () => { this.resume(); if (this.play) this.play.elapsed = this.round!.seconds; this.questions = []; });
    on('#m-finish', () => { this.resume(); this.play?.end(); this.play = undefined; this.deck?.close(); this.roundIndex = ROUNDS.length; this.finish(); });
    on('#m-journal', () => { this.resume(); this.openJournal(); });
    on('#m-restart', () => { this.resume(); this.backToLobby(); });
    on('#m-title', () => { classHost.close(); location.hash = ''; location.reload(); });
    const flip = (id: string, key: 'sound' | 'jumpscares') => on(id, () => {
      settings[key] = !settings[key]; saveSettings(); sound.applySettings();
      const button = $(slot, id); button.classList.toggle('is-on', settings[key]); button.querySelector('span')!.textContent = settings[key] ? 'ON' : 'OFF';
    });
    flip('#m-sound', 'sound'); flip('#m-scare', 'jumpscares');
    $(slot, '#m-resume').focus({ preventScroll: true });
  }

  private resume(): void {
    if (!this.paused) return;
    this.paused = false;
    if (this.phase === 'play' && this.round) this.publish({ mode: 'round', round: this.round.number, rounds: ROUNDS.length, title: this.round.title, goal: this.round.goal });
    $(this.root, '#menu-slot').replaceChildren();
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  private backToLobby(): void {
    this.play?.end(); this.play = undefined; this.deck?.close(); this.autoNext?.remove();
    this.modal(''); this.setNext('');
    for (const frog of [...this.frogs.values()]) {
      if (frog.isBot) { frog.destroy(); this.frogs.delete(frog.id); this.targets.delete(frog.id); this.rosterChanged = true; continue; }
      frog.score = 0; frog.roundScore = 0;
    }
    this.phase = 'lobby'; this.roundIndex = -1; this.quiz = undefined; this.seen = []; this.scaredProjector = false;
    this.setDarkness(0);
    sound.music('forest');
    this.publish({ mode: 'lobby' });
    $(this.root, '#lobby').hidden = false;
    this.renderLobby();
  }

  private openJournal(): void {
    this.paused = true;
    showJournal($(this.root, '#menu-slot'), () => this.resume());
  }

  // ---------------------------------------------------------------- HUD

  private buildHud(): void {
    this.root = showOverlay(this, `<section class="pond is-lobby">
      <header class="hud-top">
        <div class="hud-round" id="hud-round"></div>
        <ol class="hud-leaders" id="leaders"></ol>
      </header>
      <div class="lobby-panel" id="lobby"></div>
      <div class="reactions" id="reactions"></div>
      <footer class="pond-bottom" id="pond-bottom" hidden></footer>
      <button class="icon-button glass pond-menu" id="menu-button" aria-label="Host menu (Esc)">Ⅱ</button>
      <div id="fx"></div>
      <div id="modal-slot"></div>
      <div id="menu-slot"></div>
    </section>`);
    $(this.root, '#menu-button').addEventListener('click', () => this.openMenu());
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  private renderLobby(): void {
    if (this.phase !== 'lobby' || !this.root) return;
    const lobby = $(this.root, '#lobby');
    let join: string;
    if (classHost.connected) {
      const code = `${classHost.code.slice(0, 3)} ${classHost.code.slice(3)}`;
      join = `<div class="join-sign">
        <div class="js-text"><span>1. Go to</span><b class="js-address">${esc((classHost.joinAddress || 'this website').replace(/^https?:\/\//, '').replace(/\/$/, ''))}</b><span>2. Type the code</span><b class="js-code">${code}</b></div>
        ${classHost.joinLink ? `<div class="qr" aria-label="QR code to join">${qrSvg(classHost.joinLink)}</div>` : ''}
      </div>`;
    } else {
      join = `<div class="join-sign is-offline"><div class="js-text"><span>${classHost.available === null ? 'Opening the pond…' : 'Players can\'t join here'}</span>${classHost.available === null ? '' : `<small>${classHost.kind === 'firebase' ? esc(classHost.error) : 'Start the game with <code>npm run host</code>, or put it on Firebase (see README).'}</small>`}</div></div>`;
    }
    lobby.innerHTML = `${join}<div class="lobby-players"><b id="player-count"></b><div class="chips" id="chips"></div></div>`;
    this.setNext('START', 0);
    this.renderPlayers();
  }

  private renderPlayers(): void {
    if (!this.root || this.phase !== 'lobby') return;
    const humans = this.humans();
    const count = this.root.querySelector('#player-count');
    if (count) count.textContent = humans.length ? `${humans.length} player${humans.length === 1 ? '' : 's'} in the pond` : 'Waiting for players… (or press START to watch computer frogs)';
    const chips = this.root.querySelector('#chips');
    if (!chips) return;
    chips.innerHTML = humans.map(frog => `<button class="chip ${frog.online ? '' : 'is-away'}" data-id="${esc(frog.id)}" style="background:${frog.color};color:${textOn(frog.color)}" title="Remove player">${esc(frog.name)}</button>`).join('');
    for (const chip of chips.querySelectorAll<HTMLButtonElement>('.chip')) chip.addEventListener('click', () => this.chipMenu(chip.dataset.id!));
  }

  private chipMenu(id: string): void {
    const frog = this.frogs.get(id);
    if (!frog) return;
    const slot = $(this.root, '#menu-slot');
    slot.innerHTML = `<div class="modal-backdrop"><section class="field-card tile-menu" role="dialog" aria-modal="true" aria-label="Player options">
      <h2>${esc(frog.name)}</h2>
      <div class="pause-actions"><button id="c-kick">Remove player</button><button class="text-button" id="c-cancel">Cancel</button></div>
    </section></div>`;
    const close = () => { slot.replaceChildren(); (document.activeElement as HTMLElement | null)?.blur?.(); };
    $(slot, '#c-kick').addEventListener('click', () => { classHost.kick(id); close(); this.renderPlayers(); });
    $(slot, '#c-cancel').addEventListener('click', close);
    $(slot, '#c-kick').focus();
  }

  private updateHud(): void {
    this.root.querySelector('.pond')?.classList.toggle('is-lobby', this.phase === 'lobby');
    const round = this.round;
    const hud = $(this.root, '#hud-round');
    if (round && this.phase !== 'lobby' && this.phase !== 'howto') {
      const left = Math.max(0, Math.ceil(round.seconds - (this.play?.elapsed ?? (this.phase === 'roundIntro' || this.phase === 'countdown' ? 0 : round.seconds))));
      const html = `<span class="hud-label">ROUND ${round.number} OF ${ROUNDS.length}</span><b class="hud-title">${esc(round.title)}</b><b class="hud-timer ${left <= 10 && this.phase === 'play' ? 'is-low' : ''}">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b>`;
      if (hud.innerHTML !== html) hud.innerHTML = html;
      hud.hidden = false;
    } else hud.hidden = true;
    const frogs = [...this.frogs.values()];
    const top = this.roundIndex < 0 ? [] : ranking(frogs.map(frog => ({ id: frog.id, name: frog.name, score: frog.score, bot: frog.isBot }))).slice(0, 5);
    const leaders = top.map(item => `<li><span>${item.rank}</span><i class="dot" style="background:${this.frogs.get(item.id)?.color}"></i><b>${esc(item.name)}</b><em>${item.score}</em></li>`).join('');
    if (leaders !== this.lastLeaders) { this.lastLeaders = leaders; $(this.root, '#leaders').innerHTML = leaders; }
  }
}

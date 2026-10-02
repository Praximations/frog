import Phaser from 'phaser';
import { PartyFrog } from '../entities/PartyFrog';
import { PondGame, type GameContext } from '../play/PondGame';
import { GAME, secretScareCount } from '../data/game';
import { TEAMS, pickTeam, teamSizes, teamTotals, winner, ranking, botsNeeded, type Team, type Ranked } from '../systems/match';
import { classHost, type PhoneState } from '../systems/ClassHost';
import { sound } from '../systems/Sound';
import { settings, saveSettings } from '../systems/Settings';
import { go } from '../systems/flow';
import { pondDecor, pondTerrain } from '../world/Terrain';
import { ensureArt } from '../world/Art';
import { showOverlay } from '../ui/ScreenOverlay';
import { showJournal } from '../ui/cards';
import { rulesHtml } from '../ui/rules';
import { banner, floatReaction, jumpscare, qrSvg } from '../ui/effects';
import { esc, $ } from '../ui/html';

type Phase = 'lobby' | 'howto' | 'countdown' | 'play' | 'over';
const BOUNDS = new Phaser.Geom.Rectangle(80, 195, 1120, 445);
const SPEED = 240;
const DAY = Phaser.Display.Color.ValueToColor(0xffffff);
const NIGHT = Phaser.Display.Color.ValueToColor(0x56668a);
const PLAYING: PhoneState = { mode: 'round', title: 'Eat bugs!', goal: 'Eat bugs. Don\'t get caught!' };

export interface MatchResult { totals: [number, number]; ranks: Ranked[] }

/**
 * Everything happens in one pond: the lobby (frogs hop in as people join), a "How to play" card,
 * then one game of about two and a half minutes. Phones are joysticks; ARROWS and WASD let two
 * people play on the laptop; computer frogs fill a team that would otherwise be empty.
 */
export class PondScene extends Phaser.Scene {
  private frogs = new Map<string, PartyFrog>();
  private phase: Phase = 'lobby';
  private play?: PondGame;
  private endsAt = 0;
  private paused = false;
  private pausedAt = 0;
  private holdUntil = 0;
  private scaredProjector = false;
  private secretAt = Infinity;
  private howtoTimer?: Phaser.Time.TimerEvent;
  private darkness!: Phaser.GameObjects.Rectangle;
  private decor: Phaser.GameObjects.Image[] = [];
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private root!: HTMLElement;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private dirty = new Set<string>();
  private lastScoreSend = 0;
  private lastHud = 0;
  private lastSound = 0;
  private lastLeaders = '';
  private botTargets = new Map<string, { x: number; y: number; until: number }>();
  private context!: GameContext;

  constructor() { super('PondScene'); }

  create(): void {
    this.frogs = new Map(); this.phase = 'lobby'; this.play = undefined; this.paused = false; this.holdUntil = 0;
    this.dirty = new Set(); this.botTargets = new Map(); this.decor = []; this.lastLeaders = ''; this.scaredProjector = false; this.secretAt = Infinity;
    ensureArt(this);
    pondTerrain(this);
    this.darkness = this.add.rectangle(640, 360, 1280, 720, 0x061226, 0).setDepth(-50);
    this.decor = pondDecor(this);
    this.dust = this.add.particles(0, 0, 'dust', { lifespan: 380, speed: { min: 25, max: 80 }, angle: { min: 190, max: 350 }, scale: { start: 2.4, end: 0 }, alpha: { start: .75, end: 0 }, emitting: false }).setDepth(0);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.context = {
      scene: this, bounds: BOUNDS,
      frogs: () => [...this.frogs.values()].filter(frog => frog.online),
      award: (frog, points, x, y) => this.award(frog, points, x, y),
      caught: (frog, by, grabber) => this.caught(frog, by, grabber),
      announce: (title, subtitle, kind) => {
        for (const old of this.root.querySelectorAll('.banner.event')) old.remove();
        void banner($(this.root, '#fx'), title, subtitle, 2000, `event ${kind ?? ''}`);
      },
      home: team => this.home(team),
      setDarkness: level => this.setDarkness(level),
    };
    this.buildHud();
    const offPlayers = classHost.subscribe(event => this.onClass(event));
    const offReact = classHost.onReact(({ emoji, name }) => { floatReaction($(this.root, '#reactions'), emoji, name); sound.play('react'); });
    const onKey = (event: KeyboardEvent) => this.presenterKey(event);
    window.addEventListener('keydown', onKey, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKey, true);
      offPlayers(); offReact(); this.play?.end();
      this.input.keyboard?.removeCapture(['UP', 'DOWN', 'LEFT', 'RIGHT']);
    });
    for (const player of classHost.players.values()) this.addPhoneFrog(player.id, player.name);
    sound.music('forest');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.publish({ mode: 'lobby' });
    this.renderLobby();
    void classHost.open().then(() => this.renderLobby());
    (window as unknown as { pond?: PondScene }).pond = this;
  }

  // ---------------------------------------------------------------- world

  /** 0 = late afternoon, 1 = full night. Only the ground and scenery darken, so frogs stay easy to see. */
  private setDarkness(level: number): void {
    this.darkness.setFillStyle(0x061226, .06 + level * .5);
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(DAY, NIGHT, 100, Math.round(level * 100));
    const tint = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
    for (const item of this.decor) item.setTint(tint);
  }

  private home(team: Team): { x: number; y: number } {
    return team === 0 ? { x: 150 + Math.random() * 90, y: 215 + Math.random() * 400 } : { x: 1040 + Math.random() * 90, y: 215 + Math.random() * 400 };
  }

  // ---------------------------------------------------------------- frogs and players

  private humans(): PartyFrog[] { return [...this.frogs.values()].filter(frog => !frog.isBot); }

  private addFrog(id: string, name: string, control: PartyFrog['control'], team = pickTeam(this.humans())): PartyFrog {
    const spot = this.home(team);
    const frog = new PartyFrog(this, id, name, team, control, spot.x, spot.y);
    frog.onLand = (x, y, big) => this.dust.explode(big ? 12 : 3, x, y);
    frog.drop(this.time.now);
    this.frogs.set(id, frog);
    this.renderTeams();
    return frog;
  }

  private addPhoneFrog(id: string, name: string): void {
    const existing = this.frogs.get(id);
    if (existing) { existing.online = true; existing.tag.setAlpha(1); }
    else { this.addFrog(id, name, 'phone'); sound.play('join'); }
    const frog = this.frogs.get(id)!;
    classHost.sendTo(id, { kind: 'you', team: frog.team });
    classHost.sendTo(id, { kind: 'score', score: frog.score });
  }

  private onClass(event: { type: 'join' | 'leave' | 'removed' | 'status'; id?: string }): void {
    if (event.type === 'status') { if (this.phase === 'lobby') this.renderLobby(); return; }
    const id = event.id!;
    if (event.type === 'join') { const player = classHost.players.get(id); if (player) this.addPhoneFrog(id, player.name); }
    else if (event.type === 'leave') { const frog = this.frogs.get(id); if (frog) { frog.online = false; frog.input = { x: 0, y: 0 }; frog.tag.setAlpha(.35); } }
    else if (event.type === 'removed') { this.frogs.get(id)?.destroy(); this.frogs.delete(id); }
    this.renderTeams();
  }

  /** Computer frogs top up a team that has fewer than two frogs, so it always feels like a match. */
  private syncBots(): void {
    const need = botsNeeded(teamSizes(this.humans().filter(frog => frog.online)));
    for (const team of [0, 1] as Team[]) {
      const bots = [...this.frogs.values()].filter(frog => frog.isBot && frog.team === team);
      for (let i = bots.length; i < need[team]; i++) this.addFrog(`bot-${team}-${i}`, `Wild Frog ${team * 2 + i + 1}`, 'bot', team);
      for (const bot of bots.slice(need[team])) { bot.destroy(); this.frogs.delete(bot.id); }
    }
    this.renderTeams();
  }

  private award(frog: PartyFrog, points: number, x: number, y: number): void {
    const changed = frog.addPoints(points);
    if (points > 0 || changed) {
      const label = points > 0 ? `+${points}` : `${changed}`;
      const text = this.add.text(x, y - 20, label, { fontFamily: 'PressStart', fontSize: points >= 5 ? '24px' : points >= 3 ? '19px' : '15px', color: points > 0 ? TEAMS[frog.team].light : '#ff8a6a', stroke: '#2a2018', strokeThickness: 5 }).setOrigin(.5).setDepth(5000);
      this.tweens.add({ targets: text, y: y - 64, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => text.destroy() });
    }
    if (points > 0 && this.time.now - this.lastSound > 70) { this.lastSound = this.time.now; sound.play(points >= 3 ? 'catch' : 'gulp', points); }
    if (frog.control === 'phone') this.dirty.add(frog.id);
  }

  private caught(frog: PartyFrog, by: 'hunter' | 'trap', grabber: { x: number; y: number } | null): void {
    const now = this.time.now;
    const lost = frog.addPoints(-GAME.caughtPenalty);
    frog.capture(now, grabber, this.home(frog.team));
    const text = this.add.text(frog.x, frog.y - 70, by === 'trap' ? 'TRAPPED!' : 'CAUGHT!', { fontFamily: 'PressStart', fontSize: '18px', color: '#ff6a4a', stroke: '#000', strokeThickness: 6 }).setOrigin(.5).setDepth(5000);
    if (lost) text.setText(`${text.text} ${lost}`);
    this.tweens.add({ targets: text, y: text.y - 30, alpha: 0, duration: 1600, onComplete: () => text.destroy() });
    if (grabber) {
      const gotcha = this.add.text(grabber.x, grabber.y - 80, 'GOTCHA!', { fontFamily: 'PressStart', fontSize: '14px', color: '#fff0b4', backgroundColor: '#2a2018', padding: { x: 6, y: 4 } }).setOrigin(.5).setDepth(5000);
      this.tweens.add({ targets: gotcha, scale: { from: .4, to: 1 }, duration: 200, ease: 'Back.easeOut' });
      this.time.delayedCall(1100, () => gotcha.destroy());
    }
    sound.play(by === 'trap' ? 'hurt' : 'spotted');
    if (frog.control === 'phone') { classHost.sendTo(frog.id, { kind: 'caught', scare: settings.jumpscares }); this.dirty.add(frog.id); }
    if (!this.scaredProjector) {
      // The first catch of the game gets the full-screen jump-scare on the projector.
      this.scaredProjector = true;
      this.hold(settings.jumpscares ? 1750 : 1350);
      jumpscare($(this.root, '#fx'), `${frog.name} got caught! People once hunted up to 36,000 of these frogs a year.`, () => undefined);
    }
  }

  /** Freezes the game briefly (the projector jump-scare), pushing the timer back by the same amount. */
  private hold(ms: number): void { this.holdUntil = this.time.now + ms; this.endsAt += ms; }

  /**
   * The secret scare: 2–3 random phones (1 in a tiny group) get a fake "connection lost" screen and
   * then a screaming face. Nobody else knows it's coming. Skipped when jump-scares are switched off.
   */
  secretScare(): string[] {
    this.secretAt = Infinity;
    if (!settings.jumpscares) return [];
    const now = this.time.now;
    const phones = [...this.frogs.values()].filter(frog => frog.control === 'phone' && frog.online && !frog.isCaptured(now));
    Phaser.Utils.Array.Shuffle(phones);
    const chosen = phones.slice(0, secretScareCount(phones.length));
    for (const frog of chosen) {
      classHost.sendTo(frog.id, { kind: 'shock' });
      frog.frozenUntil = now + 7000; frog.safeUntil = now + 9000;
    }
    return chosen.map(frog => frog.name);
  }

  // ---------------------------------------------------------------- loop

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 100);
    this.readKeyboard();
    const moving = !this.paused && (this.phase === 'lobby' || this.phase === 'play') && time >= this.holdUntil;
    for (const frog of this.frogs.values()) {
      if (frog.control === 'phone') frog.input = frog.online ? classHost.input(frog.id) : { x: 0, y: 0 };
      else if (frog.isBot) frog.input = this.phase === 'play' ? this.botInput(frog, time) : { x: 0, y: 0 };
      if (!moving) frog.input = { x: 0, y: 0 };
      frog.update(time, moving ? dt : 0, BOUNDS, SPEED);
    }
    if (this.phase === 'play' && !this.paused && time >= this.holdUntil) {
      this.play?.update(time, dt);
      if (this.play && this.play.elapsed >= this.secretAt) this.secretScare();
      if (this.endsAt - time <= 0) this.endGame();
    }
    if (time - this.lastHud > 120) { this.lastHud = time; this.updateHud(time); }
    if (time - this.lastScoreSend > 600 && this.dirty.size) {
      this.lastScoreSend = time;
      for (const id of this.dirty) { const frog = this.frogs.get(id); if (frog) classHost.sendTo(id, { kind: 'score', score: frog.score }); }
      this.dirty.clear();
    }
  }

  private readKeyboard(): void {
    const down = (key: string) => this.keys[key].isDown ? 1 : 0;
    const arrows = { x: down('RIGHT') - down('LEFT'), y: down('DOWN') - down('UP') };
    const wasd = { x: down('D') - down('A'), y: down('S') - down('W') };
    const canJoin = this.phase === 'lobby' || this.phase === 'play';
    for (const [id, name, input] of [['arrows', 'Arrow Keys', arrows], ['wasd', 'WASD', wasd]] as const) {
      let frog = this.frogs.get(id);
      if (!frog && canJoin && (input.x || input.y)) frog = this.addFrog(id, name, id);
      if (frog) frog.input = input;
    }
  }

  /** Presenter keys. The journal handles its own keys while open. */
  private presenterKey(event: KeyboardEvent): void {
    if (event.repeat || this.root.querySelector('.journal-book')) return;
    if (event.key === 'Escape') {
      if (this.paused) this.resume(); else this.openMenu();
    } else if ((event.key === 'Enter' || event.key === ' ') && !this.paused && !$(this.root, '#menu-slot').childElementCount) {
      event.preventDefault();
      if (this.phase === 'lobby') this.startMatch();
      else if (this.phase === 'howto') this.countdown();
    } else if ((event.key === 'j' || event.key === 'J') && !this.paused && this.phase === 'lobby') this.openJournal();
  }

  private botInput(frog: PartyFrog, now: number): { x: number; y: number } {
    let target = this.botTargets.get(frog.id);
    if (!target || now > target.until) {
      const point = this.play?.botTarget(frog) ?? this.home(frog.team);
      target = { x: point.x + Phaser.Math.Between(-12, 12), y: point.y + Phaser.Math.Between(-12, 12), until: now + 300 + Math.random() * 500 };
      this.botTargets.set(frog.id, target);
    }
    const dx = target.x - frog.x, dy = target.y - frog.y, length = Math.hypot(dx, dy);
    return length < 8 ? { x: 0, y: 0 } : { x: dx / length, y: dy / length };
  }

  // ---------------------------------------------------------------- flow

  /** START: everyone back to their side, then the "How to play" card. */
  private startMatch(): void {
    if (this.phase !== 'lobby') return;
    sound.play('click');
    this.phase = 'howto';
    this.syncBots();
    for (const frog of this.frogs.values()) {
      frog.score = 0; frog.frozenUntil = 0; frog.safeUntil = 0;
      const spot = this.home(frog.team); frog.teleport(spot.x, spot.y); frog.drop(this.time.now);
    }
    this.publish({ mode: 'intro', title: 'How to play', goal: 'Eat bugs. Don\'t get caught!' });
    this.root.querySelector('.pond')?.classList.remove('is-lobby');
    this.renderCenter('<span class="pond-label">GET READY</span><b class="pond-title">How to play</b>');
    this.renderBottom('');
    this.renderTeams();
    const slot = $(this.root, '#modal-slot');
    slot.innerHTML = `<div class="howto-card" role="dialog" aria-label="How to play">
      <h2>HOW TO PLAY</h2>
      ${rulesHtml()}
      <p class="howto-note">Most points wins · ${GAME.seconds / 60} minutes · Caught = −${GAME.caughtPenalty} points</p>
      <button id="go">GO! ▸</button>
      <div class="howto-timer" aria-hidden="true"><i></i></div>
    </div>`;
    $(slot, '#go').addEventListener('click', () => this.countdown());
    this.howtoTimer = this.time.delayedCall(12000, () => this.countdown());
  }

  private countdown(): void {
    if (this.phase !== 'howto') return;
    this.phase = 'countdown';
    this.howtoTimer?.remove();
    $(this.root, '#modal-slot').replaceChildren();
    (document.activeElement as HTMLElement | null)?.blur?.();
    const fx = $(this.root, '#fx');
    ['3', '2', '1', 'GO!'].forEach((label, i) => this.time.delayedCall(i * 700, () => {
      sound.play('tick', i === 3 ? 1 : 0);
      void banner(fx, label, '', 550, i === 3 ? 'is-win countdown' : 'countdown');
      if (i === 3) this.startPlay();
    }));
  }

  private startPlay(): void {
    this.phase = 'play';
    this.scaredProjector = false;
    this.endsAt = this.time.now + GAME.seconds * 1000;
    this.secretAt = Phaser.Math.Between(GAME.secretScare.from, GAME.secretScare.to);
    this.play = new PondGame(this.context);
    this.play.start();
    sound.music('game');
    this.publish(PLAYING);
  }

  private endGame(): void {
    if (this.phase !== 'play') return;
    this.phase = 'over';
    this.play?.end(); this.play = undefined;
    sound.music(null);
    sound.play('whistle');
    this.publish({ mode: 'paused' });
    void banner($(this.root, '#fx'), 'TIME\'S UP!', '', 1600, 'is-win').then(() => this.finish());
  }

  private finish(): void {
    const scored = [...this.frogs.values()].map(frog => ({ id: frog.id, name: frog.name, team: frog.team, score: frog.score, bot: frog.isBot }));
    const result: MatchResult = { totals: teamTotals(scored), ranks: ranking(scored) };
    const won = winner(result.totals);
    for (const entry of result.ranks) {
      if (this.frogs.get(entry.id)?.control === 'phone') classHost.sendTo(entry.id, { kind: 'final', rank: entry.rank, of: result.ranks.length, score: entry.score, team: entry.team, won: won === entry.team });
    }
    this.publish({ mode: 'final', winner: won });
    go(this, 'FinaleScene', { result }, 600);
  }

  private publish(state: PhoneState): void { classHost.publish(state); }

  // ---------------------------------------------------------------- presenter menu

  private openMenu(): void {
    if (this.paused) return;
    this.paused = true; this.pausedAt = this.time.now;
    if (this.phase === 'play') this.publish({ mode: 'paused' });
    const toggle = (id: string, label: string, on: boolean) => `<button class="toggle ${on ? 'is-on' : ''}" id="${id}">${label}<span>${on ? 'ON' : 'OFF'}</span></button>`;
    const slot = $(this.root, '#menu-slot');
    slot.innerHTML = `<div class="modal-backdrop"><section class="field-card pause-card" role="dialog" aria-modal="true" aria-labelledby="menu-title">
      <h2 id="menu-title">Presenter menu</h2>
      <div class="pause-actions">
        <button id="m-resume">Resume ▸</button>
        ${this.phase === 'play' ? '<button class="secondary" id="m-end">End game now</button>' : ''}
        ${this.phase !== 'lobby' ? '<button class="secondary" id="m-restart">Back to lobby</button>' : '<button class="secondary" id="m-journal">Fact cards</button>'}
      </div>
      <div class="toggles">${toggle('m-sound', 'Sound', settings.sound)}${toggle('m-scare', 'Jump-scares', settings.jumpscares)}</div>
      <button class="text-button" id="m-title">Quit to title</button>
    </section></div>`;
    const on = (id: string, handler: () => void) => slot.querySelector(id)?.addEventListener('click', () => { sound.play('click'); handler(); });
    on('#m-resume', () => this.resume());
    on('#m-end', () => { this.resume(); this.endsAt = this.time.now; });
    on('#m-journal', () => { this.resume(); this.openJournal(); });
    on('#m-restart', () => { this.resume(); this.backToLobby(); });
    on('#m-title', () => go(this, 'MenuScene'));
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
    const pausedFor = this.time.now - this.pausedAt;
    if (this.phase === 'play') { this.endsAt += pausedFor; this.publish(PLAYING); }
    $(this.root, '#menu-slot').replaceChildren();
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  private backToLobby(): void {
    this.play?.end(); this.play = undefined; this.howtoTimer?.remove();
    $(this.root, '#modal-slot').replaceChildren();
    for (const frog of [...this.frogs.values()]) {
      if (frog.isBot) { frog.destroy(); this.frogs.delete(frog.id); continue; }
      frog.score = 0;
      const spot = this.home(frog.team); frog.teleport(spot.x, spot.y);
    }
    this.phase = 'lobby'; this.secretAt = Infinity;
    this.setDarkness(0);
    sound.music('forest');
    this.publish({ mode: 'lobby' });
    this.renderLobby();
  }

  private openJournal(): void {
    this.paused = true; this.pausedAt = this.time.now;
    showJournal($(this.root, '#menu-slot'), () => this.resume());
  }

  // ---------------------------------------------------------------- HUD

  private buildHud(): void {
    this.root = showOverlay(this, `<section class="pond">
      <header class="pond-top">
        ${[0, 1].map(team => `<div class="team-card team-${team}" id="team-${team}"><span class="team-name">${TEAMS[team].name.toUpperCase()}</span><b class="team-score">0</b><small class="team-count">0 frogs</small><div class="team-chips"></div></div>`).join('')}
        <div class="pond-center" id="pond-center"></div>
      </header>
      <ol class="leaders" id="leaders"></ol>
      <div class="reactions" id="reactions"></div>
      <footer class="pond-bottom" id="pond-bottom"></footer>
      <button class="icon-button glass pond-menu" id="menu-button" aria-label="Presenter menu (Esc)">Ⅱ</button>
      <div id="fx"></div>
      <div id="modal-slot"></div>
      <div id="menu-slot"></div>
    </section>`);
    $(this.root, '#menu-button').addEventListener('click', () => this.openMenu());
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  private renderCenter(html: string): void { const center = $(this.root, '#pond-center'); if (center.innerHTML !== html) center.innerHTML = html; }
  private renderBottom(html: string): void { const bottom = $(this.root, '#pond-bottom'); bottom.innerHTML = html; bottom.hidden = !html; }

  private renderLobby(): void {
    if (this.phase !== 'lobby' || !this.root) return;
    this.root.querySelector('.pond')?.classList.add('is-lobby');
    if (classHost.connected) {
      const code = `${classHost.code.slice(0, 3)} ${classHost.code.slice(3)}`;
      this.renderCenter(`<div class="join-sign">
        <div class="js-text"><span>Join on your phone</span><b class="js-address">${esc(classHost.joinAddress || 'this game\'s address')}</b><span>Code</span><b class="js-code">${code}</b></div>
        ${classHost.joinLink ? `<div class="qr" aria-label="QR code to join">${qrSvg(classHost.joinLink)}</div>` : ''}
      </div>`);
    } else {
      this.renderCenter(`<div class="join-sign is-offline"><div class="js-text"><span>${classHost.available === null ? 'Opening the pond…' : 'Phones can\'t join here'}</span><b class="js-address">Play on this keyboard: <kbd>ARROWS</kbd> + <kbd>WASD</kbd></b><small>For phones, start the game with <code>npm run host</code>.</small></div></div>`);
    }
    this.renderBottom(`${rulesHtml(true)}<button class="start-button" id="start">START ▸</button>`);
    $(this.root, '#start').addEventListener('click', () => this.startMatch());
    this.renderTeams();
  }

  private renderTeams(): void {
    if (!this.root) return;
    const frogs = [...this.frogs.values()];
    this.root.querySelector('.pond')?.classList.toggle('is-lobby', this.phase === 'lobby');
    for (const team of [0, 1] as Team[]) {
      const members = frogs.filter(frog => frog.team === team);
      const card = $(this.root, `#team-${team}`);
      card.querySelector('.team-count')!.textContent = `${members.length} frog${members.length === 1 ? '' : 's'}`;
      const chips = card.querySelector('.team-chips')!;
      chips.innerHTML = this.phase === 'lobby' ? members.filter(frog => !frog.isBot).map(frog => `<button class="chip ${frog.online ? '' : 'is-away'}" data-id="${esc(frog.id)}" title="Switch team or remove">${esc(frog.name)}</button>`).join('') : '';
      for (const chip of chips.querySelectorAll<HTMLButtonElement>('.chip')) chip.addEventListener('click', () => this.chipMenu(chip.dataset.id!));
    }
  }

  private chipMenu(id: string): void {
    const frog = this.frogs.get(id);
    if (!frog) return;
    const slot = $(this.root, '#menu-slot');
    slot.innerHTML = `<div class="modal-backdrop"><section class="field-card tile-menu" role="dialog" aria-modal="true" aria-label="Player options">
      <h2>${esc(frog.name)}</h2>
      <div class="pause-actions"><button id="c-switch">Move to ${TEAMS[frog.team ? 0 : 1].name}</button><button class="secondary" id="c-kick">${frog.control === 'phone' ? 'Remove player' : 'Remove keyboard frog'}</button><button class="text-button" id="c-cancel">Cancel</button></div>
    </section></div>`;
    const close = () => { slot.replaceChildren(); (document.activeElement as HTMLElement | null)?.blur?.(); };
    $(slot, '#c-switch').addEventListener('click', () => {
      frog.setTeam(frog.team ? 0 : 1);
      const spot = this.home(frog.team); frog.teleport(spot.x, spot.y); frog.drop(this.time.now);
      if (frog.control === 'phone') classHost.sendTo(frog.id, { kind: 'you', team: frog.team });
      close(); this.renderTeams();
    });
    $(slot, '#c-kick').addEventListener('click', () => {
      if (frog.control === 'phone') classHost.kick(id); else { frog.destroy(); this.frogs.delete(id); }
      close(); this.renderTeams();
    });
    $(slot, '#c-cancel').addEventListener('click', close);
    $(slot, '#c-switch').focus();
  }

  private updateHud(now: number): void {
    const frogs = [...this.frogs.values()];
    const totals = teamTotals(frogs);
    for (const team of [0, 1]) $(this.root, `#team-${team} .team-score`).textContent = String(totals[team]);
    if (this.phase === 'play' || this.phase === 'countdown') {
      const left = this.phase === 'play' ? Math.max(0, Math.ceil((this.endsAt - (this.paused ? this.pausedAt : Math.max(now, this.holdUntil))) / 1000)) : GAME.seconds;
      const share = totals[0] + totals[1] ? Math.round(totals[0] / (totals[0] + totals[1]) * 100) : 50;
      const tag = this.play?.double ? '<span class="pond-label is-double">DOUBLE POINTS!</span>' : '';
      this.renderCenter(`${tag}<b class="pond-timer ${left <= 10 ? 'is-low' : ''}">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b><div class="tug"><i style="width:${share}%"></i></div>`);
      const top = ranking(frogs.map(frog => ({ id: frog.id, name: frog.name, team: frog.team, score: frog.score, bot: frog.isBot }))).slice(0, 3);
      const leaders = top.filter(item => item.score > 0).map(item => `<li><span>${item.rank}</span><b style="color:${TEAMS[item.team].light}">${esc(item.name)}</b><em>${item.score}</em></li>`).join('');
      if (leaders !== this.lastLeaders) { this.lastLeaders = leaders; $(this.root, '#leaders').innerHTML = leaders; }
    } else if (this.lastLeaders) { this.lastLeaders = ''; $(this.root, '#leaders').innerHTML = ''; }
  }
}

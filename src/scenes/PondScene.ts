import Phaser from 'phaser';
import { PartyFrog } from '../entities/PartyFrog';
import { FeastRound } from '../rounds/FeastRound';
import { NightRound } from '../rounds/NightRound';
import { RescueRound, POOLS } from '../rounds/RescueRound';
import type { RoundContext, RoundMode } from '../rounds/types';
import { ROUNDS, STEPS, type RoundInfo, type Step } from '../data/rounds';
import { cardByKey, RUBRIC_KEYS, type RubricKey } from '../data/journal';
import { TEAMS, pickTeam, teamSizes, teamTotals, winner, ranking, botsNeeded, type Team } from '../systems/match';
import { classHost, type PhoneState } from '../systems/ClassHost';
import { sound, type Music } from '../systems/Sound';
import { settings, saveSettings } from '../systems/Settings';
import { go } from '../systems/flow';
import { paintTerrain, PALETTES, SCALE, type TerrainSpec } from '../world/Terrain';
import { ensureArt } from '../world/Art';
import { showOverlay } from '../ui/ScreenOverlay';
import { showCards, showJournal, type CardDeck } from '../ui/cards';
import { banner, floatReaction, jumpscare, qrSvg, toast } from '../ui/effects';
import { esc, $ } from '../ui/html';

type Phase = 'lobby' | 'learn' | 'intro' | 'countdown' | 'round' | 'results';
const BOUNDS = new Phaser.Geom.Rectangle(80, 195, 1120, 445);
const SPEED = 240;
const MUSIC: Record<string, Music> = { feast: 'lobby', night: 'night', rescue: 'rescue' };

export interface MatchResult { totals: [number, number]; ranks: { id: string; name: string; team: Team; score: number; rank: number }[] }

/**
 * The whole match happens in one pond: lobby (frogs can already hop about), learning breaks with the
 * Field Journal cards, then three team rounds. Phones are joysticks; ARROWS and WASD let two people
 * play on the laptop; computer frogs fill a team that would otherwise be empty.
 */
export class PondScene extends Phaser.Scene {
  private frogs = new Map<string, PartyFrog>();
  private phase: Phase = 'lobby';
  private stepIndex = -1;
  private round?: RoundMode;
  private info?: RoundInfo;
  private endsAt = 0;
  private factIndex = 0;
  private paused = false;
  private pausedAt = 0;
  private holdUntil = 0;
  private scaredThisRound = false;
  private terrain!: Phaser.GameObjects.Image;
  private decor: Phaser.GameObjects.Image[] = [];
  private root!: HTMLElement;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private deck?: CardDeck;
  private dirty = new Set<string>();
  private lastScoreSend = 0;
  private lastHud = 0;
  private lastSound = 0;
  private botTargets = new Map<string, { x: number; y: number; until: number }>();
  private context!: RoundContext;
  private shownJournal = new Set<string>();

  constructor() { super('PondScene'); }

  create(): void {
    this.frogs = new Map(); this.phase = 'lobby'; this.stepIndex = -1; this.round = undefined; this.paused = false;
    this.dirty = new Set(); this.botTargets = new Map(); this.shownJournal = new Set(); this.holdUntil = 0; this.decor = []; this.deck = undefined;
    ensureArt(this);
    for (const [key, palette] of [['pond-day', 'day'], ['pond-night', 'night'], ['pond-rescue', 'rescue']] as const) {
      if (!this.textures.exists(key)) this.textures.addCanvas(key, paintTerrain(this.terrainSpec(key, palette)));
    }
    this.terrain = this.add.image(0, 0, 'pond-day').setOrigin(0).setScale(SCALE).setDepth(-100);
    this.buildDecor();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.context = {
      scene: this, bounds: BOUNDS,
      frogs: () => [...this.frogs.values()].filter(frog => frog.online),
      award: (frog, points, x, y) => this.award(frog, points, x, y),
      caught: frog => this.caught(frog),
      toast: (tag, text, kind) => this.toast(tag, text, kind),
      home: team => this.home(team),
    };
    this.buildHud();
    const offPlayers = classHost.subscribe(event => this.onClass(event));
    const offReact = classHost.onReact(({ emoji, name }) => { floatReaction($(this.root, '#reactions'), emoji, name); sound.play('react'); });
    const onKey = (event: KeyboardEvent) => this.presenterKey(event);
    // Capture phase, registered before any card deck, so we see keys before a card closes itself.
    window.addEventListener('keydown', onKey, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKey, true);
      offPlayers(); offReact(); this.round?.end(); this.deck?.close();
      this.input.keyboard?.removeCapture(['UP', 'DOWN', 'LEFT', 'RIGHT']);
    });
    for (const player of classHost.players.values()) this.addPhoneFrog(player.id, player.name);
    sound.music('forest');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.renderLobby();
    void classHost.open().then(() => this.renderLobby());
    (window as unknown as { pond?: PondScene }).pond = this;
  }

  // ---------------------------------------------------------------- world

  private terrainSpec(key: string, palette: keyof typeof PALETTES): TerrainSpec {
    return {
      key, width: 320, height: 180, palette: PALETTES[palette], pathWidth: 6,
      paths: [[[0, 118], [50, 110], [110, 120], [170, 108], [230, 118], [320, 110]], [[160, 40], [150, 80], [170, 108], [158, 150], [166, 180]]],
      clearings: [[160, 105, 92, 46]],
      ponds: palette === 'rescue' ? [] : [[300, 36, 22, 9]],
    };
  }

  private buildDecor(): void {
    const place = (key: string, x: number, y: number, scale = 4) => { this.decor.push(this.add.image(x, y, key).setOrigin(.5, .9).setScale(scale).setDepth(y)); };
    for (let x = -20; x < 1320; x += 105) place(x % 2 ? 'tree' : 'palm', x + (x * 7) % 30, 150 + (x % 3) * 8);
    for (let x = 10; x < 1320; x += 120) place(x % 3 ? 'tree' : 'bush', x, 885);
    for (let y = 260; y < 700; y += 125) { place('tree', 14, y); place('tree', 1268, y + 40); }
    for (const [x, y] of [[250, 250], [1030, 600], [380, 650], [900, 240], [560, 210], [720, 660]]) place(x % 2 ? 'flower' : 'fern', x, y);
  }

  private setScenery(kind: 'day' | 'night' | 'rescue'): void {
    this.terrain.setTexture(`pond-${kind}`);
    const tint = kind === 'night' ? 0x5a6a8a : 0xffffff;
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
    this.frogs.set(id, frog);
    frog.sprite.setScale(0);
    this.tweens.add({ targets: frog.sprite, scale: 3.4, duration: 300, ease: 'Back.easeOut' });
    if (this.phase === 'learn' || this.phase === 'results') frog.setVisible(true);
    this.renderTeams();
    return frog;
  }

  private addPhoneFrog(id: string, name: string): void {
    const existing = this.frogs.get(id);
    if (existing) { existing.online = true; existing.tag.setAlpha(1); }
    else { this.addFrog(id, name, 'phone'); sound.play('join'); }
    const frog = this.frogs.get(id)!;
    classHost.sendTo(id, { kind: 'you', team: frog.team });
    classHost.sendTo(id, { kind: 'score', score: frog.score, round: frog.roundScore });
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
      const text = this.add.text(x, y - 20, label, { fontFamily: 'PressStart', fontSize: points >= 3 ? '20px' : '15px', color: points > 0 ? TEAMS[frog.team].light : '#ff8a6a', stroke: '#2a2018', strokeThickness: 5 }).setOrigin(.5).setDepth(5000);
      this.tweens.add({ targets: text, y: y - 64, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => text.destroy() });
    }
    if (points > 0 && this.time.now - this.lastSound > 70) { this.lastSound = this.time.now; sound.play(points >= 3 ? 'catch' : 'gulp', points); }
    if (frog.control === 'phone') this.dirty.add(frog.id);
  }

  private caught(frog: PartyFrog): void {
    const now = this.time.now;
    frog.frozenUntil = now + 2200;
    frog.safeUntil = now + 4400;
    frog.sprite.setTintFill(0xfff6c0);
    const lost = frog.addPoints(-3);
    const text = this.add.text(frog.x, frog.y - 80, `CAUGHT!${lost ? ` ${lost}` : ''}`, { fontFamily: 'PressStart', fontSize: '18px', color: '#ff6a4a', stroke: '#000', strokeThickness: 6 }).setOrigin(.5).setDepth(5000);
    this.tweens.add({ targets: text, y: text.y - 30, alpha: 0, duration: 1600, onComplete: () => text.destroy() });
    sound.play('spotted');
    if (frog.control === 'phone') { classHost.sendTo(frog.id, { kind: 'caught', scare: settings.jumpscares }); this.dirty.add(frog.id); }
    this.time.delayedCall(2200, () => { frog.sprite.clearTint(); const spot = this.home(frog.team); frog.teleport(spot.x, spot.y); });
    if (!this.scaredThisRound) {
      // The first catch of the night gets the full-screen jump-scare on the projector.
      this.scaredThisRound = true;
      this.hold(settings.jumpscares ? 1750 : 1350);
      jumpscare($(this.root, '#fx'), `${frog.name} was caught! Hunting took thousands of mountain chickens every year.`, () => undefined);
    }
  }

  /** Freezes the round briefly (jump-scare), pushing the timer back by the same amount. */
  private hold(ms: number): void { this.holdUntil = this.time.now + ms; this.endsAt += ms; }

  // ---------------------------------------------------------------- loop

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 100);
    this.readKeyboard();
    const moving = !this.paused && (this.phase === 'lobby' || this.phase === 'intro' || this.phase === 'round') && time >= this.holdUntil;
    for (const frog of this.frogs.values()) {
      if (frog.control === 'phone') frog.input = frog.online ? classHost.input(frog.id) : { x: 0, y: 0 };
      else if (frog.isBot) frog.input = this.phase === 'round' ? this.botInput(frog, time) : { x: 0, y: 0 };
      if (!moving) frog.input = { x: 0, y: 0 };
      frog.update(time, moving ? dt : 0, BOUNDS, SPEED);
    }
    if (this.phase === 'round' && !this.paused && time >= this.holdUntil) {
      this.round?.update(time, dt);
      const left = this.endsAt - time;
      const info = this.info!;
      const fact = info.facts[this.factIndex];
      if (fact && info.seconds * 1000 - left >= fact.at * 1000) { this.factIndex++; this.toast(fact.tag, fact.text, fact.tag.startsWith('Threat') ? 'threat' : 'good'); }
      if (left <= 0) this.endRound();
    }
    if (time - this.lastHud > 120) { this.lastHud = time; this.updateHud(time); }
    if (time - this.lastScoreSend > 600 && this.dirty.size) {
      this.lastScoreSend = time;
      for (const id of this.dirty) { const frog = this.frogs.get(id); if (frog) classHost.sendTo(id, { kind: 'score', score: frog.score, round: frog.roundScore }); }
      this.dirty.clear();
    }
  }

  private readKeyboard(): void {
    const down = (key: string) => this.keys[key].isDown ? 1 : 0;
    const arrows = { x: down('RIGHT') - down('LEFT'), y: down('DOWN') - down('UP') };
    const wasd = { x: down('D') - down('A'), y: down('S') - down('W') };
    const canJoin = this.phase === 'lobby' || this.phase === 'intro' || this.phase === 'round';
    for (const [id, name, input] of [['arrows', 'Arrow Keys', arrows], ['wasd', 'WASD', wasd]] as const) {
      let frog = this.frogs.get(id);
      if (!frog && canJoin && (input.x || input.y)) frog = this.addFrog(id, name, id);
      if (frog) frog.input = input;
    }
  }

  /** Presenter keys. Open cards and the journal handle their own keys. */
  private presenterKey(event: KeyboardEvent): void {
    if (event.repeat || this.deck?.open || this.root.querySelector('.journal-book')) return;
    if (event.key === 'Escape') {
      if (this.paused) this.resume(); else if (!this.deck?.open) this.openMenu();
    } else if ((event.key === 'Enter' || event.key === ' ') && !this.paused && !this.deck?.open && !$(this.root, '#menu-slot').childElementCount) {
      event.preventDefault();
      this.advance();
    } else if ((event.key === 'j' || event.key === 'J') && !this.paused && this.phase !== 'round' && !this.deck?.open) this.openJournal();
  }

  private botInput(frog: PartyFrog, now: number): { x: number; y: number } {
    let target = this.botTargets.get(frog.id);
    if (!target || now > target.until) {
      const point = this.round?.botTarget(frog, now) ?? this.home(frog.team);
      target = { x: point.x + Phaser.Math.Between(-12, 12), y: point.y + Phaser.Math.Between(-12, 12), until: now + 300 + Math.random() * 500 };
      this.botTargets.set(frog.id, target);
    }
    const dx = target.x - frog.x, dy = target.y - frog.y, length = Math.hypot(dx, dy);
    return length < 8 ? { x: 0, y: 0 } : { x: dx / length, y: dy / length };
  }

  // ---------------------------------------------------------------- flow

  /** Enter / Space / the big button: move the presentation forward. */
  private advance(): void {
    if (this.phase === 'lobby') this.startMatch();
    else if (this.phase === 'intro') this.countdown();
    else if (this.phase === 'results') { $(this.root, '#modal-slot').replaceChildren(); this.nextStep(); }
  }

  private startMatch(): void {
    sound.play('click');
    for (const frog of this.frogs.values()) { frog.score = 0; frog.roundScore = 0; }
    this.syncBots();
    this.stepIndex = -1;
    this.nextStep();
  }

  private nextStep(): void {
    this.stepIndex++;
    const step: Step | undefined = STEPS[this.stepIndex];
    if (!step || step.kind === 'final') { this.finish(); return; }
    if (step.kind === 'learn') this.learn(step.title, step.cards);
    else this.intro(ROUNDS[step.round]);
  }

  private learn(title: string, cards: RubricKey[]): void {
    this.phase = 'learn';
    this.setScenery('day');
    sound.music('forest');
    this.publish({ mode: 'learn', title });
    this.renderCenter(`<span class="pond-label">LEARNING BREAK</span><b class="pond-title">${esc(title)}</b>`);
    this.renderBottom('');
    void banner($(this.root, '#fx'), 'LEARNING BREAK', title, 1500).then(() => {
      const fresh = new Set<string>();
      for (const key of cards) if (!this.shownJournal.has(key)) { this.shownJournal.add(key); fresh.add(key); }
      this.deck = showCards($(this.root, '#modal-slot'), cards.map(cardByKey), {
        fresh, unlockedCount: () => this.shownJournal.size,
        onDone: () => { this.deck = undefined; this.nextStep(); },
      });
    });
  }

  private intro(info: RoundInfo): void {
    this.phase = 'intro';
    this.info = info;
    this.syncBots();
    this.setScenery(info.id === 'night' ? 'night' : info.id === 'rescue' ? 'rescue' : 'day');
    for (const frog of this.frogs.values()) {
      frog.roundScore = 0; frog.frozenUntil = 0; frog.slowUntil = 0; frog.safeUntil = 0;
      const spot = info.id === 'rescue' ? { x: POOLS[frog.team].x + (frog.team ? -110 : 110) + Math.random() * 40 - 20, y: 215 + Math.random() * 400 } : this.home(frog.team);
      frog.teleport(spot.x, spot.y);
    }
    sound.music(MUSIC[info.id]);
    this.publish({ mode: 'intro', title: info.title, goal: info.goal });
    this.renderCenter(`<span class="pond-label">ROUND ${info.number} OF 3</span><b class="pond-title">${esc(info.title)}</b>`);
    this.renderBottom(`<p class="pond-goal">${esc(info.goal)}</p>`);
    const slot = $(this.root, '#modal-slot');
    slot.innerHTML = `<div class="round-card round-${info.id}" role="dialog" aria-label="Round ${info.number}">
      <span class="rc-number">ROUND ${info.number}</span><h2>${esc(info.title)}</h2>
      <p class="rc-goal">${esc(info.goal)}</p><p class="rc-tip">${esc(info.tip)}</p>
      <p class="rc-controls">Move your frog with your <b>phone joystick</b> · or <kbd>ARROWS</kbd> / <kbd>WASD</kbd></p>
      <button id="go">Start round ▸</button>
    </div>`;
    $(slot, '#go').addEventListener('click', () => this.countdown());
  }

  private countdown(): void {
    if (this.phase !== 'intro') return;
    this.phase = 'countdown';
    $(this.root, '#modal-slot').replaceChildren();
    (document.activeElement as HTMLElement | null)?.blur?.();
    const fx = $(this.root, '#fx');
    const steps = ['3', '2', '1', 'GO!'];
    steps.forEach((label, i) => this.time.delayedCall(i * 700, () => {
      sound.play('tick', i === 3 ? 1 : 0);
      void banner(fx, label, '', 550, i === 3 ? 'is-win countdown' : 'countdown');
      if (i === 3) this.startRound();
    }));
  }

  private startRound(): void {
    const info = this.info!;
    this.phase = 'round';
    this.factIndex = 0;
    this.scaredThisRound = false;
    this.endsAt = this.time.now + info.seconds * 1000;
    this.round = info.id === 'feast' ? new FeastRound(this.context) : info.id === 'night' ? new NightRound(this.context) : new RescueRound(this.context);
    this.round.start();
    this.publish({ mode: 'round', title: info.title, goal: info.goal });
  }

  private endRound(): void {
    if (this.phase !== 'round') return;
    this.phase = 'results';
    this.round?.end(); this.round = undefined;
    const info = this.info!;
    sound.play('victory');
    sound.music('finale');
    const frogs = [...this.frogs.values()];
    const roundTotals = teamTotals(frogs.map(frog => ({ team: frog.team, score: frog.roundScore })));
    const won = winner(roundTotals);
    const top = ranking(frogs.map(frog => ({ id: frog.id, name: frog.name, team: frog.team, score: frog.roundScore, bot: frog.isBot }))).slice(0, 3);
    this.publish({ mode: 'results', title: info.title, winner: won });
    for (const frog of frogs) if (frog.control === 'phone') classHost.sendTo(frog.id, { kind: 'score', score: frog.score, round: frog.roundScore });
    const headline = won === -1 ? 'IT\'S A DRAW!' : `${TEAMS[won].name.toUpperCase()} WINS!`;
    this.renderBottom('');
    $(this.root, '#modal-slot').innerHTML = `<div class="results-card ${won === -1 ? '' : `won-${won}`}" role="dialog" aria-label="Round results">
      <span class="rc-number">ROUND ${info.number} · ${esc(info.title.toUpperCase())}</span>
      <h2>${headline}</h2>
      <div class="results-teams">${[0, 1].map(team => `<div class="rt team-${team} ${won === team ? 'is-winner' : ''}"><span>${TEAMS[team].name}</span><b>${roundTotals[team]}</b><small>points this round</small></div>`).join('<i>vs</i>')}</div>
      ${top.length ? `<ol class="results-top">${top.map(item => `<li><span class="medal">${['🥇', '🥈', '🥉'][item.rank - 1] ?? '⭐'}</span><b style="color:${TEAMS[item.team].light}">${esc(item.name)}</b><span>${item.score} ${item.score === 1 ? 'pt' : 'pts'}</span></li>`).join('')}</ol>` : ''}
      <button id="next">${this.stepIndex + 1 < STEPS.length - 1 ? 'Learning break ▸' : 'Final results ▸'}</button>
    </div>`;
    $(this.root, '#next').addEventListener('click', () => this.advance());
  }

  private finish(): void {
    const frogs = [...this.frogs.values()];
    const scored = frogs.map(frog => ({ id: frog.id, name: frog.name, team: frog.team, score: frog.score, bot: frog.isBot }));
    const result: MatchResult = { totals: teamTotals(scored), ranks: ranking(scored) };
    const won = winner(result.totals);
    for (const entry of result.ranks) {
      const frog = this.frogs.get(entry.id);
      if (frog?.control === 'phone') classHost.sendTo(entry.id, { kind: 'final', rank: entry.rank, of: result.ranks.length, score: entry.score, team: entry.team, won: won === entry.team });
    }
    this.publish({ mode: 'final', winner: won });
    go(this, 'FinaleScene', { result }, 600);
  }

  private publish(state: PhoneState): void { classHost.publish(state); }

  // ---------------------------------------------------------------- presenter menu

  private openMenu(): void {
    if (this.paused) return;
    this.paused = true; this.pausedAt = this.time.now;
    if (this.phase === 'round') this.publish({ mode: 'paused' });
    const toggle = (id: string, label: string, on: boolean) => `<button class="toggle ${on ? 'is-on' : ''}" id="${id}">${label}<span>${on ? 'ON' : 'OFF'}</span></button>`;
    const slot = $(this.root, '#menu-slot');
    slot.innerHTML = `<div class="modal-backdrop"><section class="field-card pause-card" role="dialog" aria-modal="true" aria-labelledby="menu-title">
      <h2 id="menu-title">Presenter menu</h2>
      <div class="pause-actions">
        <button id="m-resume">Resume ▸</button>
        ${this.phase === 'round' ? '<button class="secondary" id="m-end">End round now</button>' : ''}
        ${this.phase !== 'lobby' ? '<button class="secondary" id="m-skip">Skip ahead ▸</button>' : ''}
        <button class="secondary" id="m-journal">Field Journal</button>
        <button class="secondary" id="m-restart">Back to lobby</button>
      </div>
      <div class="toggles">${toggle('m-sound', 'Sound', settings.sound)}${toggle('m-scare', 'Jump-scares', settings.jumpscares)}</div>
      <button class="text-button" id="m-title">Quit to title</button>
    </section></div>`;
    const on = (id: string, handler: () => void) => slot.querySelector(id)?.addEventListener('click', () => { sound.play('click'); handler(); });
    on('#m-resume', () => this.resume());
    on('#m-end', () => { this.resume(); this.endsAt = this.time.now; });
    on('#m-skip', () => { this.resume(); this.skip(); });
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
    if (this.phase === 'round') { this.endsAt += pausedFor; this.publish({ mode: 'round', title: this.info!.title, goal: this.info!.goal }); }
    $(this.root, '#menu-slot').replaceChildren();
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  private skip(): void {
    if (this.phase === 'round') { this.endsAt = this.time.now; return; }
    this.deck?.close();
    if (this.phase === 'intro' || this.phase === 'results' || this.phase === 'learn') {
      $(this.root, '#modal-slot').replaceChildren();
      if (this.phase !== 'learn') this.nextStep();
    }
  }

  private backToLobby(): void {
    this.round?.end(); this.round = undefined; this.deck?.close();
    $(this.root, '#modal-slot').replaceChildren();
    for (const frog of [...this.frogs.values()]) {
      if (frog.isBot) { frog.destroy(); this.frogs.delete(frog.id); continue; }
      frog.score = 0; frog.roundScore = 0;
      const spot = this.home(frog.team); frog.teleport(spot.x, spot.y);
    }
    this.phase = 'lobby'; this.stepIndex = -1;
    this.setScenery('day');
    sound.music('forest');
    this.publish({ mode: 'lobby' });
    this.renderLobby();
  }

  private openJournal(): void {
    const slot = $(this.root, '#menu-slot');
    this.paused = true; this.pausedAt = this.time.now;
    showJournal(slot, new Set(this.phase === 'lobby' ? RUBRIC_KEYS : this.shownJournal), () => this.resume(), this.phase === 'lobby');
  }

  // ---------------------------------------------------------------- HUD

  private buildHud(): void {
    this.root = showOverlay(this, `<section class="pond">
      <header class="pond-top">
        ${[0, 1].map(team => `<div class="team-card team-${team}" id="team-${team}"><span class="team-name">${TEAMS[team].name.toUpperCase()}</span><b class="team-score">0</b><small class="team-count">0 frogs</small><div class="team-chips"></div></div>`).join('')}
        <div class="pond-center" id="pond-center"></div>
      </header>
      <ol class="leaders" id="leaders"></ol>
      <div class="toasts" id="toasts"></div>
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

  private renderCenter(html: string): void { $(this.root, '#pond-center').innerHTML = html; }
  private renderBottom(html: string): void { const bottom = $(this.root, '#pond-bottom'); bottom.innerHTML = html; bottom.hidden = !html; }

  private renderLobby(): void {
    if (this.phase !== 'lobby' || !this.root) return;
    this.root.querySelector('.pond')?.classList.add('is-lobby');
    if (classHost.connected) {
      const code = `${classHost.code.slice(0, 3)} ${classHost.code.slice(3)}`;
      this.renderCenter(`<div class="join-sign">
        <div class="js-text"><span>Join with your phone</span><b class="js-address">${esc(classHost.joinAddress || 'this game\'s address')}</b><span>Code</span><b class="js-code">${code}</b></div>
        ${classHost.joinLink ? `<div class="qr" aria-label="QR code to join">${qrSvg(classHost.joinLink)}</div>` : ''}
      </div>`);
    } else {
      this.renderCenter(`<div class="join-sign is-offline"><div class="js-text"><span>${classHost.available === null ? 'Opening the pond…' : 'Phones can\'t join here'}</span><b class="js-address">Play on this keyboard: <kbd>ARROWS</kbd> + <kbd>WASD</kbd></b><small>For phones, start the game with <code>npm run host</code>.</small></div></div>`);
    }
    this.renderBottom(`<p class="pond-hint">Move to warm up! Phones: joystick · Laptop: <kbd>ARROWS</kbd> and <kbd>WASD</kbd></p>
      <div class="toggles compact"><button class="toggle ${settings.sound ? 'is-on' : ''}" data-setting="sound">Sound<span>${settings.sound ? 'ON' : 'OFF'}</span></button><button class="toggle ${settings.jumpscares ? 'is-on' : ''}" data-setting="jumpscares">Jump-scares<span>${settings.jumpscares ? 'ON' : 'OFF'}</span></button></div>
      <button class="start-button" id="start">START ▸</button>`);
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-setting]')) {
      button.addEventListener('click', () => {
        const key = button.dataset.setting as 'sound' | 'jumpscares';
        settings[key] = !settings[key]; saveSettings(); sound.applySettings(); sound.play('click');
        button.classList.toggle('is-on', settings[key]); button.querySelector('span')!.textContent = settings[key] ? 'ON' : 'OFF';
        button.blur();
      });
    }
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
      <div class="pause-actions"><button id="c-switch">Move to ${TEAMS[frog.team ? 0 : 1].name}</button>${frog.control === 'phone' ? '<button class="secondary" id="c-kick">Remove player</button>' : '<button class="secondary" id="c-kick">Remove keyboard frog</button>'}<button class="text-button" id="c-cancel">Cancel</button></div>
    </section></div>`;
    const close = () => { slot.replaceChildren(); (document.activeElement as HTMLElement | null)?.blur?.(); };
    $(slot, '#c-switch').addEventListener('click', () => {
      frog.setTeam(frog.team ? 0 : 1);
      const spot = this.home(frog.team); frog.teleport(spot.x, spot.y);
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
    if (this.phase === 'round' || this.phase === 'countdown') {
      const info = this.info!;
      const left = this.phase === 'round' ? Math.max(0, Math.ceil((this.endsAt - (this.paused ? this.pausedAt : now)) / 1000)) : info.seconds;
      const share = totals[0] + totals[1] ? Math.round(totals[0] / (totals[0] + totals[1]) * 100) : 50;
      this.renderCenter(`<span class="pond-label">ROUND ${info.number} · ${esc(info.title.toUpperCase())}</span><b class="pond-timer ${left <= 10 ? 'is-low' : ''}">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b><div class="tug"><i style="width:${share}%"></i></div>`);
      const top = ranking(frogs.map(frog => ({ id: frog.id, name: frog.name, team: frog.team, score: frog.roundScore, bot: frog.isBot }))).slice(0, 3);
      $(this.root, '#leaders').innerHTML = top.filter(item => item.score > 0).map(item => `<li><span>${item.rank}</span><b style="color:${TEAMS[item.team].light}">${esc(item.name)}</b><em>${item.score}</em></li>`).join('');
    } else $(this.root, '#leaders').innerHTML = '';
  }

  private toast(tag: string, text: string, kind = ''): void { toast($(this.root, '#toasts'), tag, text, kind, 7000); }
}


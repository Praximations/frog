import Phaser from 'phaser';
import { Frog, EMPTY_INPUT, type MovementInput } from '../entities/Frog';
import { chapterByNumber, CHAPTERS, type Chapter } from '../data/chapters';
import { cardByKey, type RubricKey } from '../data/journal';
import { run } from '../systems/run';
import { classHost, type PhoneState } from '../systems/ClassHost';
import { sound, type Music } from '../systems/Sound';
import { settings, saveSettings, reducedMotion } from '../systems/Settings';
import { afterChapter, go, jump } from '../systems/flow';
import { showOverlay } from '../ui/ScreenOverlay';
import { showCards, showJournal, type CardDeck } from '../ui/cards';
import { banner, floatReaction, toast } from '../ui/effects';
import { esc, $ } from '../ui/html';
import { ensureArt } from '../world/Art';

export interface Interactable { x: number; y: number; radius: number; label: string; action: () => void; enabled?: () => boolean }
export interface WorldInfo { width: number; height: number; spawn: { x: number; y: number }; bounds?: [number, number, number, number] }

/** During play the keyboard belongs to the game: a focused HUD button would also react to Space/Enter. */
const releaseFocus = () => (document.activeElement as HTMLElement | null)?.blur?.();

const HEART = '<svg viewBox="0 0 9 8" class="heart" aria-hidden="true" shape-rendering="crispEdges"><path d="M1 0h2v1h1v1h1V1h1V0h2v1h1v3H8v1H7v1H6v1H5v1H4V7H3V6H2V5H1V4H0V1h1z"/></svg>';

/**
 * Shared machinery for the five playable chapters: frog + input, HUD, interaction prompts,
 * journal cards, hearts and checkpoints, pause/presenter menu, chapter intro and hand-off.
 */
export abstract class ChapterScene extends Phaser.Scene {
  protected abstract readonly chapterNumber: number;
  protected abstract readonly music: Music;
  protected frog!: Frog;
  protected root!: HTMLElement;
  protected modal!: HTMLElement;
  protected fx!: HTMLElement;
  protected blocks!: Phaser.Physics.Arcade.StaticGroup;
  protected world!: WorldInfo;
  protected hearts = 3;
  protected readonly maxHearts = 3;
  protected frozen = false;
  protected interactables: Interactable[] = [];
  protected checkpoint = { x: 0, y: 0 };
  protected target: { x: number; y: number } | null = null;
  protected elapsed = 0;
  protected finished = false;
  protected input2: MovementInput = { ...EMPTY_INPUT };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private previous = { action: false, pause: false, journal: false, remote: false };
  private deck?: CardDeck;
  private modalKind: 'intro' | 'card' | 'pause' | 'journal' | 'cutscene' | null = null;
  private marker!: Phaser.GameObjects.Container;
  private edgeArrow!: Phaser.GameObjects.Graphics;
  private invulnerableUntil = 0;
  private objectiveText = '';
  private objectiveKey = '';
  private pausedPhysics = false;

  protected get chapter(): Chapter { return chapterByNumber(this.chapterNumber); }

  /** Build the level; return its size and the frog's start. Reset subclass state here. */
  protected abstract buildWorld(): WorldInfo;
  /** Current objective; `target` (optional) gets a marker and an edge arrow. */
  protected abstract objective(): { step: string; text: string; target?: { x: number; y: number } | null };
  /** Per-frame chapter logic (only while not frozen). */
  protected tick(_time: number, _delta: number): void { /* optional */ }
  /** Action button with nothing nearby (e.g. the tongue). */
  protected onAction(): void { /* optional */ }
  /** Called after the chapter intro closes. */
  protected onStart(): void { /* optional */ }
  protected onRespawn(): void { /* optional */ }
  protected bugsEnabled(): boolean { return false; }

  create(): void {
    this.hearts = this.maxHearts; this.frozen = false; this.finished = false; this.interactables = []; this.elapsed = 0;
    this.previous = { action: true, pause: false, journal: false, remote: false }; this.deck = undefined; this.modalKind = null; this.target = null;
    this.invulnerableUntil = 0; this.objectiveText = ''; this.objectiveKey = ''; this.pausedPhysics = false;
    this.physics.resume();
    ensureArt(this);
    run.setPopulation(run.population);
    this.world = this.buildWorld();
    const [bx, by, bw, bh] = this.world.bounds ?? [40, 60, this.world.width - 80, this.world.height - 100];
    this.physics.world.setBounds(bx, by, bw, bh);
    this.frog = new Frog(this, this.world.spawn.x, this.world.spawn.y);
    this.physics.add.collider(this.frog.collider, this.blocks);
    this.checkpoint = { ...this.world.spawn };
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.world.width, this.world.height);
    camera.centerOn(this.frog.x, this.frog.y - 40);
    camera.startFollow(this.frog.collider, true, .08, .08, 0, 40);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,ENTER,ESC,J') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    this.buildMarkers();
    this.buildHud();
    const offReact = classHost.onReact(({ emoji, name }) => { floatReaction($(this.root, '#reactions'), emoji, name); sound.play('react'); });
    const offClass = classHost.subscribe(() => this.updateJoinHint());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offReact(); offClass();
      this.input.keyboard?.removeCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
      this.deck?.close();
    });
    sound.music(this.music);
    camera.fadeIn(500, 0, 0, 0);
    this.refreshObjective(true);
    this.showIntro();
    (window as unknown as { mc?: object }).mc = { scene: this };
  }

  // ---------------------------------------------------------------- HUD

  private buildHud(): void {
    const chapter = this.chapter;
    this.root = showOverlay(this, `
      <section class="play-screen chapter-${chapter.number}">
        <div class="hud-top">
          <div class="hud-left">
            <div class="hearts glass" id="hearts" aria-label="Health"></div>
            <button class="journal-chip glass" id="journal-button" aria-label="Open the Field Journal (J)"><span class="book"></span><span>Journal <b id="journal-count">0</b>/10</span></button>
          </div>
          <div class="objective glass" role="status"><span class="micro" id="objective-step"></span><strong id="objective-text"></strong></div>
          <div class="hud-right">
            <div class="population glass" id="population-box"><span class="micro">FROGS ALIVE</span><b id="population">100</b><small>game simulation</small></div>
            <button class="icon-button glass" id="pause-button" aria-label="Pause (Esc)">Ⅱ</button>
          </div>
        </div>
        <div class="chapter-tag"><span>Chapter ${chapter.number}</span>${esc(chapter.title)}</div>
        <div class="meter glass" id="meter" hidden></div>
        <div class="interact-prompt" id="interact-prompt" hidden><kbd>SPACE</kbd><span></span></div>
        <div class="toasts" id="toasts"></div>
        <div class="reactions" id="reactions"></div>
        <div class="play-bottom"><span><kbd>ARROWS</kbd> Move <kbd>SPACE</kbd> Action <kbd>J</kbd> Journal <kbd>ESC</kbd> Menu</span><span id="join-hint"></span></div>
        <div id="fx"></div>
        <div id="modal-slot"></div>
      </section>`);
    this.modal = $(this.root, '#modal-slot');
    this.fx = $(this.root, '#fx');
    $(this.root, '#pause-button').addEventListener('click', () => this.openPause());
    $(this.root, '#journal-button').addEventListener('click', () => this.openJournal());
    this.updateHearts(); this.updateJournalCount(); this.updatePopulation(); this.updateJoinHint();
    releaseFocus();
  }

  protected updateHearts(): void {
    $(this.root, '#hearts').innerHTML = Array.from({ length: this.maxHearts }, (_, i) => `<span class="${i < this.hearts ? 'full' : 'empty'}">${HEART}</span>`).join('');
  }
  protected updateJournalCount(): void { $(this.root, '#journal-count').textContent = String(run.journal.size); }
  protected updatePopulation(change: 'drop' | 'rise' | null = null): void {
    $(this.root, '#population').textContent = String(run.population);
    const box = $(this.root, '#population-box');
    if (change) { box.classList.remove('drop', 'rise'); void box.offsetWidth; box.classList.add(change); }
  }
  private updateJoinHint(): void {
    const hint = this.root?.querySelector('#join-hint');
    if (hint) hint.textContent = classHost.connected ? `Join: PIN ${classHost.code.slice(0, 3)} ${classHost.code.slice(3)} · ${classHost.onlineCount} playing` : '';
  }

  /** Animates the simulated population to a new value. */
  protected setPopulation(value: number, duration = 1600): void {
    const from = run.population;
    run.setPopulation(value);
    const to = run.population;
    if (from === to) return;
    this.updatePopulation(to < from ? 'drop' : 'rise');
    const counter = { value: from };
    this.tweens.add({ targets: counter, value: to, duration, ease: 'Cubic.easeOut', onUpdate: () => { $(this.root, '#population').textContent = String(Math.round(counter.value)); } });
  }

  protected showMeter(html: string | null): void {
    const meter = $(this.root, '#meter');
    meter.hidden = html === null;
    if (html !== null) meter.innerHTML = html;
  }

  protected toast(tag: string, text: string, kind = '', ms?: number): void { toast($(this.root, '#toasts'), tag, text, kind, ms); }
  protected banner(title: string, subtitle = '', ms = 1800, cls = ''): Promise<void> { return banner(this.fx, title, subtitle, ms, cls); }

  protected refreshObjective(force = false): void {
    const { step, text, target } = this.objective();
    this.target = target ?? null;
    if (!force && `${step}|${text}` === this.objectiveKey) return;
    this.objectiveKey = `${step}|${text}`;
    this.objectiveText = text;
    $(this.root, '#objective-step').textContent = step;
    $(this.root, '#objective-text').textContent = text;
    this.publishPhone();
  }

  protected publishPhone(): void {
    if (!classHost.connected) return;
    const mode = this.modalKind === 'pause' || this.modalKind === 'journal' ? 'paused' : this.modalKind === 'card' ? 'card' : 'chapter';
    const state: PhoneState = { mode, chapter: this.chapterNumber, title: this.chapter.title, objective: this.objectiveText, bugs: this.bugsEnabled() && mode === 'chapter' };
    classHost.publish(state);
  }

  private buildMarkers(): void {
    const ring = this.add.ellipse(0, 6, 64, 18).setStrokeStyle(4, 0xfff1b2, .8);
    const arrow = this.add.text(0, -86, '▼', { fontFamily: 'Pixelify', fontSize: '34px', color: '#fff4b8', stroke: '#5a4632', strokeThickness: 5 }).setOrigin(.5);
    this.tweens.add({ targets: arrow, y: -100, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: ring, scaleX: 1.2, scaleY: 1.2, alpha: .4, duration: 800, yoyo: true, repeat: -1 });
    this.marker = this.add.container(0, 0, [ring, arrow]).setDepth(4000).setVisible(false);
    this.edgeArrow = this.add.graphics().setScrollFactor(0).setDepth(4500).setVisible(false);
    this.edgeArrow.fillStyle(0x5a4632).fillTriangle(-4, -18, 26, 0, -4, 18).fillStyle(0xfff4b8).fillTriangle(0, -12, 20, 0, 0, 12);
  }

  private updateMarkers(): void {
    const target = this.target;
    this.marker.setVisible(!!target && !this.finished);
    this.edgeArrow.setVisible(false);
    if (!target || this.finished) return;
    this.marker.setPosition(target.x, target.y);
    const view = this.cameras.main.worldView;
    if (!Phaser.Geom.Rectangle.Contains(view, target.x, target.y - 40)) {
      const cx = view.centerX, cy = view.centerY;
      const angle = Math.atan2(target.y - cy, target.x - cx);
      const w = this.scale.width / 2 - 60, h = this.scale.height / 2 - 70;
      const t = Math.min(w / Math.abs(Math.cos(angle) || 1e-6), h / Math.abs(Math.sin(angle) || 1e-6));
      this.edgeArrow.setVisible(true).setPosition(this.scale.width / 2 + Math.cos(angle) * t, this.scale.height / 2 + Math.sin(angle) * t).setRotation(angle);
    }
  }

  // ---------------------------------------------------------------- loop

  private readInput(): MovementInput & { pause: boolean; journal: boolean; remote: boolean } {
    const down = (name: string) => this.keys[name].isDown ? 1 : 0;
    const remote = classHost.input();
    const remoteAction = remote.interact || remote.hop;
    return {
      x: Phaser.Math.Clamp(Math.max(down('D'), down('RIGHT')) - Math.max(down('A'), down('LEFT')) + remote.x, -1, 1),
      y: Phaser.Math.Clamp(Math.max(down('S'), down('DOWN')) - Math.max(down('W'), down('UP')) + remote.y, -1, 1),
      hop: false,
      interact: !!(down('SPACE') || down('E') || down('ENTER')) || remoteAction,
      pause: !!down('ESC') || remote.pause === true,
      journal: !!down('J'),
      remote: remoteAction,
    };
  }

  update(time: number, delta: number): void {
    if (!this.frog) return;
    const input = this.readInput();
    this.input2 = input;
    const actionPressed = input.interact && !this.previous.action;
    const remotePressed = input.remote && !this.previous.remote;
    const pausePressed = input.pause && !this.previous.pause;
    const journalPressed = input.journal && !this.previous.journal;
    this.previous = { action: input.interact, pause: input.pause, journal: input.journal, remote: input.remote };

    if (pausePressed) {
      if (this.modalKind === 'pause') this.closePause();
      else if (!this.frozen && !this.finished) this.openPause();
    }
    if (journalPressed && !this.frozen && !this.finished) this.openJournal();
    if (this.frozen) {
      this.frog.stop();
      // Keyboard continues cards via the card's own key handler; the phone pilot needs this path.
      if (remotePressed && this.deck?.open) this.deck.next();
      if (actionPressed && this.modalKind === 'intro') this.closeIntro();
      return;
    }
    const step = Math.min(delta, 50);
    this.elapsed += step;
    this.frog.update(time, step, input);
    this.tick(time, step);
    if (this.frozen) return;
    const near = this.nearest();
    const prompt = $(this.root, '#interact-prompt');
    prompt.hidden = !near || this.finished;
    if (near) prompt.querySelector('span')!.textContent = near.label;
    if (actionPressed && !this.finished) {
      if (near) near.action(); else this.onAction();
    }
    this.refreshObjective();
    this.updateMarkers();
  }

  private nearest(): Interactable | null {
    let best: Interactable | null = null, bestDistance = Infinity;
    for (const item of this.interactables) {
      if (item.enabled && !item.enabled()) continue;
      const d = Phaser.Math.Distance.Between(this.frog.x, this.frog.y, item.x, item.y);
      if (d < item.radius && d < bestDistance) { best = item; bestDistance = d; }
    }
    return best;
  }

  // ---------------------------------------------------------------- freezing, cards, intro

  protected freeze(kind: 'intro' | 'card' | 'pause' | 'journal' | 'cutscene'): void {
    this.frozen = true; this.modalKind = kind; this.frog.stop();
    if (!this.physics.world.isPaused) { this.physics.pause(); this.pausedPhysics = true; }
    $(this.root, '#interact-prompt').hidden = true;
    this.publishPhone();
  }

  protected unfreeze(): void {
    this.frozen = false; this.modalKind = null;
    if (this.pausedPhysics) { this.physics.resume(); this.pausedPhysics = false; }
    this.previous.action = true; // the key that closed a card must not also trigger an action
    releaseFocus();
    this.publishPhone();
  }

  /** Unlocks journal entries and shows their cards; gameplay waits until the last one closes. */
  protected unlockCards(keys: RubricKey[], onDone?: () => void): void {
    const fresh = new Set<string>();
    for (const key of keys) if (run.unlock(key)) fresh.add(key);
    this.updateJournalCount();
    this.freeze('card');
    this.deck = showCards(this.modal, keys.map(cardByKey), {
      fresh, unlockedCount: () => run.journal.size,
      onDone: () => { this.deck = undefined; this.unfreeze(); onDone?.(); },
    });
  }

  private showIntro(): void {
    const chapter = this.chapter;
    this.freeze('intro');
    const intro = document.createElement('div');
    intro.className = 'chapter-intro';
    intro.innerHTML = `<div class="ci-number">CHAPTER ${chapter.number}</div><h2>${esc(chapter.title)}</h2><p class="ci-tagline">${esc(chapter.tagline)}</p><p class="ci-place">${esc(chapter.place)}</p><div class="ci-dots">${CHAPTERS.map(item => `<i class="${item.number < chapter.number ? 'done' : item.number === chapter.number ? 'now' : ''}"></i>`).join('')}</div><button class="ci-go">Start ▸</button>`;
    this.modal.replaceChildren(intro);
    intro.querySelector('.ci-go')!.addEventListener('click', () => this.closeIntro());
    sound.play('chime');
    this.time.delayedCall(3400, () => this.closeIntro());
  }

  private closeIntro(): void {
    if (this.modalKind !== 'intro') return;
    const intro = this.modal.querySelector('.chapter-intro');
    intro?.classList.add('is-leaving');
    this.time.delayedCall(250, () => intro?.remove());
    this.unfreeze();
    this.onStart();
  }

  // ---------------------------------------------------------------- health and checkpoints

  protected setCheckpoint(x: number, y: number): void { this.checkpoint = { x, y }; }

  /** True briefly after a hit or a respawn. */
  protected get invulnerable(): boolean { return this.time.now < this.invulnerableUntil; }

  /** Lose a heart (with a short grace period). Returns true if the hit landed. */
  protected damage(): boolean {
    if (this.time.now < this.invulnerableUntil || this.frozen || this.finished) return false;
    this.hearts = Math.max(0, this.hearts - 1);
    this.invulnerableUntil = this.time.now + 1400;
    this.frog.hurt(); sound.play('hurt'); this.updateHearts();
    if (!reducedMotion()) this.cameras.main.shake(180, .006);
    if (this.hearts <= 0) this.faint();
    return true;
  }

  protected faint(): void {
    this.freeze('cutscene');
    sound.play('faint');
    void this.banner('Your frog needs a rest…', 'Back to the last checkpoint', 1500, 'is-sad').then(() => this.respawn());
  }

  protected respawn(restoreHearts = true): void {
    if (restoreHearts) this.hearts = this.maxHearts;
    this.updateHearts();
    this.frog.teleport(this.checkpoint.x, this.checkpoint.y);
    this.cameras.main.centerOn(this.checkpoint.x, this.checkpoint.y - 40);
    this.invulnerableUntil = this.time.now + 1500;
    this.onRespawn();
    this.unfreeze();
  }

  // ---------------------------------------------------------------- ending the chapter

  protected complete(title = 'CHAPTER COMPLETE'): void {
    if (this.finished) return;
    this.finished = true;
    this.freeze('cutscene');
    this.marker.setVisible(false); this.edgeArrow.setVisible(false);
    sound.play('victory');
    void this.banner(title, this.chapter.title, 1900, 'is-win').then(() => {
      const missing = this.chapter.journal.filter(key => !run.journal.has(key));
      if (missing.length) this.unlockCards(missing, () => this.leave());
      else this.leave();
    });
  }

  private leave(): void {
    this.freeze('cutscene');
    afterChapter(this);
  }

  // ---------------------------------------------------------------- pause and presenter menu

  protected openJournal(): void {
    if (this.frozen) return;
    this.freeze('journal');
    showJournal(this.modal, run.journal, () => this.unfreeze());
  }

  protected openPause(): void {
    if (this.frozen) return;
    this.freeze('pause');
    const steps = run.steps.map((step, i) => {
      const label = step.kind === 'chapter' ? `${step.chapter}. ${chapterByNumber(step.chapter).title}` : step.kind === 'quiz' ? `Quiz ${step.chapter}` : 'Finale';
      return `<button class="${step.kind === 'quiz' ? 'secondary small' : 'small'} ${i === run.step ? 'is-current' : ''}" data-step="${i}">${esc(label)}</button>`;
    }).join('');
    const toggle = (id: string, label: string, on: boolean) => `<button class="toggle ${on ? 'is-on' : ''}" id="${id}" aria-pressed="${on}">${label}<span>${on ? 'ON' : 'OFF'}</span></button>`;
    this.modal.innerHTML = `<div class="modal-backdrop"><section class="field-card pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <h2 id="pause-title">Paused</h2>
      <div class="pause-actions">
        <button id="resume">Resume ▸</button>
        <button class="secondary" id="restart">Restart chapter</button>
        <button class="secondary" id="skip">Skip chapter ▸</button>
        <button class="secondary" id="journal">Field Journal (${run.journal.size}/10)</button>
      </div>
      <div class="toggles">${toggle('t-sound', 'Sound', settings.sound)}${toggle('t-scare', 'Jump-scares', settings.jumpscares)}${toggle('t-quiz', 'Class quizzes', settings.quizzes)}</div>
      <details class="presenter-controls"><summary>Presenter: jump to…</summary><div class="step-grid">${steps}</div></details>
      <button class="text-button" id="title">Quit to title</button>
    </section></div>`;
    const on = (id: string, handler: () => void) => $(this.modal, id).addEventListener('click', () => { sound.play('click'); handler(); });
    on('#resume', () => this.closePause());
    on('#restart', () => { this.scene.restart(); });
    on('#skip', () => { this.modal.replaceChildren(); this.modalKind = 'cutscene'; this.complete('CHAPTER SKIPPED'); });
    on('#journal', () => { this.modal.replaceChildren(); this.modalKind = 'journal'; showJournal(this.modal, run.journal, () => { this.modalKind = 'pause'; this.closePause(); }); });
    on('#title', () => go(this, 'MenuScene'));
    const flip = (id: string, key: 'sound' | 'jumpscares' | 'quizzes') => on(id, () => {
      settings[key] = !settings[key]; saveSettings(); sound.applySettings();
      if (key === 'quizzes') run.setQuizzes(settings.quizzes);
      const button = $(this.modal, id); button.classList.toggle('is-on', settings[key]); button.setAttribute('aria-pressed', String(settings[key]));
      button.querySelector('span')!.textContent = settings[key] ? 'ON' : 'OFF';
    });
    flip('#t-sound', 'sound'); flip('#t-scare', 'jumpscares'); flip('#t-quiz', 'quizzes');
    for (const button of this.modal.querySelectorAll<HTMLButtonElement>('[data-step]')) button.addEventListener('click', () => jump(this, Number(button.dataset.step)));
    $(this.modal, '#resume').focus({ preventScroll: true });
  }

  protected closePause(): void {
    if (this.modalKind !== 'pause') return;
    this.modal.replaceChildren();
    this.unfreeze();
  }
}

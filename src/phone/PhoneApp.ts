import { classPlayer } from '../systems/ClassPlayer';
import type { PrivateMessage, PhoneState } from '../systems/ClassHost';
import type { WorldSnapshot } from '../systems/world';
import { REACTIONS } from '../../server/shared.mjs';
import { BOOSTS } from '../data/game';
import { JOURNAL } from '../data/journal';
import { HATS, SKINS, formatLook, hatKey, parseLook, randomLook, type Look } from '../data/looks';
import { COLORS, textOn } from '../systems/match';
import { sound } from '../systems/Sound';
import { artUrl } from '../world/pixels';
import { controls } from '../play/controls';
import { rulesHtml } from '../ui/rules';
import { showCards } from '../ui/cards';
import { frogHtml } from '../ui/frogArt';
import { esc, $ } from '../ui/html';

const ADJECTIVES = ['Sneaky', 'Giant', 'Brave', 'Sleepy', 'Speedy', 'Muddy', 'Mighty', 'Jolly', 'Quiet', 'Lucky', 'Bouncy', 'Soggy'];
const NOUNS = ['Cricket', 'Tadpole', 'Crapaud', 'Froglet', 'Beetle', 'Gecko', 'Snail', 'Fern', 'Crab', 'Firefly'];
const SHAPES = ['▲', '◆', '●', '■'];
const LOOK_STORE = 'mountain-chicken-look';
const STICK_RADIUS = 56;
const buzz = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* optional */ } };
const touch = () => matchMedia('(pointer: coarse)').matches;

/**
 * The home page and the player's screen, for phones and laptops alike. Pick your frog, join with
 * the code from the big screen, and then you see the forest around your own frog: drag anywhere
 * (or use the arrow keys) to hop around and eat bugs. Quiz questions and results pop up on top.
 * The home page is plain HTML; the game view (Phaser) only loads after joining.
 */
export class PhoneApp {
  private root!: HTMLElement;
  private view = '';
  private panelKey = '';
  private look: Look = randomLook();
  private keys = new Set<string>();
  private shocking = false;
  private answered: { q: string; choice: number } | null = null;
  private result: Extract<PrivateMessage, { kind: 'result' }> | null = null;
  private boostTimer?: number;
  private sick = false;
  private timeLeft: number | null = null;
  private game?: { destroy(removeCanvas: boolean): void };

  start(): void {
    document.body.classList.add('controller-mode');
    this.root = document.getElementById('interface')!;
    this.root.innerHTML = `<section class="phone-screen"><header class="phone-top" id="phone-top"><span class="phone-logo">MOUNTAIN CHICKEN</span></header><main id="phone-main"></main><div id="phone-fx"></div><div id="phone-modal"></div></section>`;
    try { const saved = localStorage.getItem(LOOK_STORE); if (saved) this.look = parseLook(saved); } catch { /* optional */ }
    classPlayer.subscribe(message => { if (message) this.onPrivate(message); this.render(); });
    classPlayer.onWorld(world => this.onWorld(world));
    for (const event of ['pointerdown', 'keydown']) window.addEventListener(event, () => sound.unlock(), { capture: true, passive: true });
    this.bindKeys();
    const seat = classPlayer.saved();
    this.home('');
    if (seat) void classPlayer.join(seat.code, seat.name, seat.look ?? formatLook(this.look), seat.token).catch(() => this.home(classPlayer.error));
    // Start downloading the game view in the background while people type.
    window.setTimeout(() => { void import('../play/playerGame').catch(() => undefined); }, 1500);
  }

  // ---------------------------------------------------------------- home: pick a frog, join or host

  private home(error: string): void {
    this.stopGame();
    this.view = 'home';
    this.root.querySelector('.phone-screen')?.classList.remove('is-playing');
    const code = (location.hash.match(/join=(\d{6})/) || [])[1] || '';
    $(this.root, '#phone-top').innerHTML = '<span class="phone-logo">MOUNTAIN CHICKEN</span>';
    $(this.root, '#phone-top').removeAttribute('style');
    $(this.root, '#phone-main').innerHTML = `<div class="home">
      <img class="pixel phone-frog bounce-slow" src="${artUrl('portrait', 4)}" alt="">
      <h1 class="home-title">MOUNTAIN<br>CHICKEN</h1>
      <div class="phone-card join-card">
        <h2>Join a game</h2>
        <form id="join-form">
          <label for="pin">Game code (on the big screen)</label>
          <input id="pin" inputmode="numeric" autocomplete="off" maxlength="7" required placeholder="123 456" value="${esc(code)}">
          <label for="nick">Your name</label>
          <div class="nick-row"><input id="nick" autocomplete="off" maxlength="16" required placeholder="Sneaky Cricket"><button type="button" class="secondary dice" id="dice" aria-label="Random name">🎲</button></div>
          <span class="look-label">Your frog</span>
          <div class="look-picker">
            <div class="look-stage" id="look-stage"></div>
            <div class="look-options">
              <div class="look-skin"><button type="button" class="secondary look-arrow" data-skin="-1" aria-label="Previous skin">◀</button><b id="skin-name"></b><button type="button" class="secondary look-arrow" data-skin="1" aria-label="Next skin">▶</button></div>
              <div class="look-hats" role="group" aria-label="Hat">${HATS.map((hat, i) => `<button type="button" class="look-chip" data-hat="${i}" aria-label="${esc(hat.name)}" title="${esc(hat.name)}">${i ? `<img class="pixel" src="${artUrl(hatKey(i)!, 3)}" alt="">` : '<span>✕</span>'}</button>`).join('')}</div>
              <div class="look-colors" role="group" aria-label="Colour">${COLORS.map((color, i) => `<button type="button" class="swatch" data-color="${i}" style="background:${color.hex}" aria-label="${esc(color.name)}" title="${esc(color.name)}"></button>`).join('')}</div>
            </div>
          </div>
          <button type="submit" id="join">JOIN ▸</button>
        </form>
        <p class="phone-error" role="alert">${esc(error)}</p>
      </div>
      <div class="home-host">
        <button class="secondary" id="host">🖥️ HOST A GAME</button>
        <p class="phone-note">For the big screen. The host shows the whole map; everyone else joins and plays.</p>
        <button class="text-button" id="facts">📖 Fact cards</button>
      </div>
    </div>`;
    const pin = $<HTMLInputElement>(this.root, '#pin'), nick = $<HTMLInputElement>(this.root, '#nick');
    pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); });
    $(this.root, '#dice').addEventListener('click', () => { nick.value = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`; });
    $(this.root, '#host').addEventListener('click', () => { location.hash = 'host'; location.reload(); });
    $(this.root, '#facts').addEventListener('click', () => showCards($(this.root, '#phone-modal'), JOURNAL, { closable: true }));
    this.bindLook();
    if (!touch()) (code ? nick : pin).focus();
    $(this.root, '#join-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (!/^\d{6}$/.test(pin.value) || !nick.value.trim()) { $(this.root, '.phone-error').textContent = 'Type the 6-digit code and your name.'; return; }
      const button = $<HTMLButtonElement>(this.root, '#join'); button.disabled = true; button.textContent = 'JOINING…';
      sound.unlock();
      try { await classPlayer.join(pin.value, nick.value, formatLook(this.look)); buzz(40); }
      catch { if (this.view === 'home') { $(this.root, '.phone-error').textContent = classPlayer.error; button.disabled = false; button.textContent = 'JOIN ▸'; } }
    });
  }

  /** The frog picker: skin arrows, hats and colours, with a live preview. */
  private bindLook(): void {
    const update = () => {
      $(this.root, '#look-stage').innerHTML = frogHtml(this.look, 'look-preview');
      $(this.root, '#skin-name').textContent = SKINS[this.look.skin].name;
      for (const chip of this.root.querySelectorAll<HTMLElement>('[data-hat]')) chip.classList.toggle('is-on', Number(chip.dataset.hat) === this.look.hat);
      for (const swatch of this.root.querySelectorAll<HTMLElement>('[data-color]')) swatch.classList.toggle('is-on', Number(swatch.dataset.color) === this.look.color);
      try { localStorage.setItem(LOOK_STORE, formatLook(this.look)); } catch { /* optional */ }
    };
    for (const arrow of this.root.querySelectorAll<HTMLElement>('[data-skin]')) arrow.addEventListener('click', () => { this.look.skin = (this.look.skin + Number(arrow.dataset.skin) + SKINS.length) % SKINS.length; update(); sound.play('click'); });
    for (const chip of this.root.querySelectorAll<HTMLElement>('[data-hat]')) chip.addEventListener('click', () => { this.look.hat = Number(chip.dataset.hat); update(); sound.play('click'); });
    for (const swatch of this.root.querySelectorAll<HTMLElement>('[data-color]')) swatch.addEventListener('click', () => { this.look.color = Number(swatch.dataset.color); update(); sound.play('click'); });
    update();
  }

  // ---------------------------------------------------------------- the game view

  private render(): void {
    if (classPlayer.ended) { this.ended(); return; }
    if (!classPlayer.connected) {
      if (this.view !== 'home' && !classPlayer.saved()) this.home(classPlayer.error);
      else if (this.view !== 'home') $(this.root, '#phone-top').innerHTML = '<span class="phone-logo">Reconnecting…</span>';
      return;
    }
    if (this.view !== 'play') this.playView();
    this.renderTop();
    this.renderHud();
    this.renderPanel();
  }

  private playView(): void {
    this.view = 'play';
    this.panelKey = '';
    this.root.querySelector('.phone-screen')?.classList.add('is-playing');
    const main = $(this.root, '#phone-main');
    main.innerHTML = `<div class="play-view">
      <div class="play-canvas" id="play-canvas"><p class="play-loading">Loading the forest…</p></div>
      <div class="touch-layer" id="touch" aria-label="Drag anywhere to move your frog"></div>
      <div class="play-hud">
        <div class="hud-pill" id="hud-status"></div>
        <canvas id="minimap" width="176" height="99" aria-label="Map"></canvas>
      </div>
      <div class="stick-float" id="stick" hidden><div class="stick-knob" id="knob"></div></div>
      <div class="play-hint" id="hint">${touch() ? '👆 Drag anywhere to hop around' : '⌨️ Arrow keys or WASD to hop around'}</div>
      <div class="boost-bar" id="boost" hidden></div>
      <div class="play-panel" id="panel" hidden></div>
    </div>`;
    this.bindTouch($(main, '#touch'));
    window.setTimeout(() => main.querySelector('#hint')?.classList.add('is-gone'), 15000);
    const parent = $(main, '#play-canvas');
    void import('../play/playerGame').then(async ({ startPlayerGame }) => {
      if (this.view !== 'play' || !parent.isConnected) return;
      const game = await startPlayerGame(parent);
      parent.querySelector('.play-loading')?.remove();
      if (this.view !== 'play' || !parent.isConnected) { game.destroy(true); return; }
      this.game = game;
    }).catch(() => { const loading = parent.querySelector('.play-loading'); if (loading) loading.textContent = 'Could not load the game. Check your connection and reload.'; });
  }

  private stopGame(): void {
    this.game?.destroy(true);
    this.game = undefined;
    controls.x = 0; controls.y = 0;
  }

  /** Your frog, name and score, always at the top. */
  private renderTop(): void {
    const top = $(this.root, '#phone-top');
    const color = classPlayer.color || COLORS[this.look.color].hex;
    const html = `${frogHtml(this.look, 'you-frog')}<span class="you-name">${esc(classPlayer.name)}</span><span class="phone-score"><b>${classPlayer.score}</b> pts</span>`;
    if (top.innerHTML !== html) top.innerHTML = html;
    top.style.background = color;
    top.style.color = textOn(color);
  }

  private renderHud(): void {
    const status = this.root.querySelector<HTMLElement>('#hud-status');
    if (!status) return;
    const state = classPlayer.state;
    const timer = this.timeLeft !== null && state.mode === 'round' ? `<b class="hud-time ${this.timeLeft <= 10 ? 'is-low' : ''}">${Math.floor(this.timeLeft / 60)}:${String(this.timeLeft % 60).padStart(2, '0')}</b>` : '';
    const html = state.mode === 'lobby' ? '<span class="micro">YOU\'RE IN!</span><b>Explore the forest while everyone joins.</b>'
      : state.mode === 'round' ? `<span class="micro">ROUND ${state.round} OF ${state.rounds} · ${esc(state.title.toUpperCase())}</span>${timer}<b>${this.sick ? '🤢 You\'re sick! Hop into a warm spring.' : esc(state.goal)}</b>`
        : '';
    if (status.innerHTML !== html) status.innerHTML = html;
    status.hidden = !html;
    status.classList.toggle('is-sick', this.sick && state.mode === 'round');
  }

  private onWorld(world: WorldSnapshot): void {
    const left = world.t ?? null;
    if (left !== this.timeLeft) { this.timeLeft = left; if (this.view === 'play') this.renderHud(); }
  }

  /** Quiz, results and other screens on top of the map. */
  private renderPanel(): void {
    const panel = this.root.querySelector<HTMLElement>('#panel');
    if (!panel) return;
    const state = classPlayer.state;
    if (state.mode === 'lobby' || state.mode === 'round') {
      if (!panel.hidden) { panel.hidden = true; panel.innerHTML = ''; this.panelKey = ''; }
      return;
    }
    const key = `${state.mode}:${JSON.stringify(state)}:${this.answered?.q ?? ''}:${this.result?.q ?? ''}:${classPlayer.final?.rank ?? ''}:${classPlayer.score}`;
    if (key === this.panelKey) return;
    this.panelKey = key;
    this.keys.clear(); controls.x = 0; controls.y = 0; this.hideStick();
    panel.hidden = false;
    panel.className = `play-panel is-${state.mode}`;
    if (state.mode === 'paused') panel.innerHTML = '<div class="phone-card center"><h2>Paused</h2><p>Look at the big screen.</p></div>';
    else if (state.mode === 'intro') panel.innerHTML = this.introView(state);
    else if (state.mode === 'quiz') { panel.innerHTML = this.quizView(state); this.bindQuiz(state); }
    else if (state.mode === 'reveal') panel.innerHTML = this.revealView(state);
    else if (state.mode === 'results') panel.innerHTML = `<div class="phone-card center"><span class="micro">${esc(state.title.toUpperCase())}</span><h2>You have ${classPlayer.score} points</h2><p>👀 Look at the big screen!</p></div>${this.reactionRow()}`;
    else if (state.mode === 'learn') panel.innerHTML = `<div class="phone-card center"><span class="micro">${esc(state.title.toUpperCase())}</span><h2>👀 Look at the big screen!</h2><p>Send a reaction:</p></div>${this.reactionRow()}`;
    else if (state.mode === 'final') {
      const final = classPlayer.final;
      const medal = final ? ['🥇', '🥈', '🥉'][final.rank - 1] ?? '🐸' : '🐸';
      panel.innerHTML = `<div class="phone-card center podium-card"><div class="medal">${medal}</div>
        <h2>${final ? `#${final.rank} of ${final.of}` : 'Thanks for playing!'}</h2>
        <p>${classPlayer.score} points</p>
        <p class="phone-note">The mountain chicken thanks you. 🐸</p></div>${this.reactionRow()}`;
      if (final && final.rank <= 3) buzz([60, 80, 60, 80, 200]);
    }
    for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-emoji]')) {
      button.addEventListener('click', () => { classPlayer.react(button.dataset.emoji!); button.classList.remove('pop'); void button.offsetWidth; button.classList.add('pop'); buzz(10); });
    }
  }

  private introView(state: Extract<PhoneState, { mode: 'intro' }>): string {
    if (state.title === 'How to play') return `<div class="phone-card center phone-rules"><span class="micro">GET READY</span><h2>How to play</h2>${rulesHtml(true)}</div>`;
    return `<div class="phone-card center round-intro"><span class="micro">GET READY</span><h2>${esc(state.title)}</h2><p>${esc(state.goal)}</p></div>`;
  }

  // ---------------------------------------------------------------- quiz

  private quizView(state: Extract<PhoneState, { mode: 'quiz' }>): string {
    const mine = this.answered?.q === state.q ? this.answered.choice : -1;
    if (mine >= 0) return `<div class="phone-card center quiz-wait"><span class="micro">ANSWER LOCKED IN</span><div class="qa-big qa-${mine}"><span>${SHAPES[mine]}</span>${esc(state.answers[mine])}</div><p>Waiting for everyone…</p></div>`;
    return `<div class="phone-quiz"><p class="pq-question">${esc(state.question)}</p>
      <div class="quiz-timer"><i style="animation-duration:${state.seconds}s"></i></div>
      <div class="pq-answers">${state.answers.map((answer, i) => `<button class="pq qa-${i}" data-choice="${i}"><span>${SHAPES[i]}</span>${esc(answer)}</button>`).join('')}</div></div>`;
  }

  private bindQuiz(state: Extract<PhoneState, { mode: 'quiz' }>): void {
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-choice]')) {
      button.addEventListener('click', () => {
        const choice = Number(button.dataset.choice);
        this.answered = { q: state.q, choice };
        classPlayer.answer(state.q, choice);
        buzz(30); sound.play('click');
        this.renderPanel();
      });
    }
  }

  private revealView(state: Extract<PhoneState, { mode: 'reveal' }>): string {
    const result = this.result?.q === state.q ? this.result : null;
    const answered = this.answered?.q === state.q;
    const headline = result?.correct ? `✓ Correct! +${result.points}` : answered ? '✗ Not quite' : '⏰ Time\'s up!';
    return `<div class="phone-card center reveal ${result?.correct ? 'is-right' : 'is-wrong'}"><h2>${headline}</h2>
      <div class="qa-big qa-${state.correct}"><span>${SHAPES[state.correct]}</span>${esc(state.answer)}</div>
      <p class="reveal-fact">${esc(state.fact)}</p></div>`;
  }

  // ---------------------------------------------------------------- messages

  private reactionRow(): string {
    return `<div class="reaction-row" aria-label="Send a reaction to the big screen">${REACTIONS.map(emoji => `<button class="react" data-emoji="${emoji}">${emoji}</button>`).join('')}</div>`;
  }

  private onPrivate(message: PrivateMessage): void {
    if (message.kind === 'caught') { if (!this.shocking) this.caught(message); }
    else if (message.kind === 'shock') this.shock();
    else if (message.kind === 'boost') this.boost(message);
    else if (message.kind === 'sick') { this.sick = message.sick; buzz(message.sick ? [100, 60, 100] : 40); this.toast(message.sick ? '🤢 You caught chytrid fungus!' : '♨️ Cured! The warm water killed the fungus.'); }
    else if (message.kind === 'result') { this.result = message; buzz(message.correct ? [40, 60, 40] : 200); sound.play(message.correct ? 'correct' : 'wrong'); }
    else if (message.kind === 'you') buzz(30);
  }

  private toast(text: string): void {
    const fx = $(this.root, '#phone-fx');
    const toast = document.createElement('div');
    toast.className = 'phone-toast';
    toast.textContent = text;
    fx.append(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  private boost(message: Extract<PrivateMessage, { kind: 'boost' }>): void {
    const info = BOOSTS[message.boost];
    buzz([30, 40, 30]);
    sound.play('unlock');
    const bar = this.root.querySelector<HTMLElement>('#boost');
    if (!bar) return;
    bar.hidden = false;
    bar.innerHTML = `<img class="pixel" src="${artUrl(info.icon, 3)}" alt=""><b>${esc(info.label)}!</b><span>${esc(info.text)}</span><i style="animation-duration:${message.seconds}s"></i>`;
    clearTimeout(this.boostTimer);
    this.boostTimer = window.setTimeout(() => { bar.hidden = true; }, message.seconds * 1000);
  }

  /** Caught by a hunter or a trap (scary), or knocked over by a pig. */
  private caught(message: Extract<PrivateMessage, { kind: 'caught' }>): void {
    const fx = $(this.root, '#phone-fx');
    const layer = document.createElement('div');
    const scary = message.scare && message.by !== 'pig';
    layer.className = scary ? 'phone-scare' : 'phone-caught';
    layer.innerHTML = scary ? `<img class="pixel" src="${artUrl('scare', 10)}" alt=""><b>CAUGHT!</b>`
      : message.by === 'pig' ? '<b>OINK!</b><span>A wild pig knocked you over! −2</span>' : '<b>CAUGHT!</b><span>−3 points</span>';
    fx.replaceChildren(layer);
    sound.play(scary ? 'scare' : 'hurt');
    buzz(scary ? [300, 80, 300] : 150);
    window.setTimeout(() => layer.remove(), scary ? 1600 : 1100);
  }

  /** You found the cave and went in… it goes quiet and dark, then a screaming face. */
  private shock(): void {
    if (this.shocking) return;
    this.shocking = true;
    controls.enabled = false;
    this.keys.clear(); controls.x = 0; controls.y = 0; this.hideStick();
    const fx = $(this.root, '#phone-fx');
    const layer = document.createElement('div');
    layer.className = 'phone-lure';
    layer.innerHTML = '<div class="lure-box"><b>It\'s very dark in here…</b><span>Did something move?</span></div>';
    fx.replaceChildren(layer);
    buzz([40, 500, 40]);
    window.setTimeout(() => {
      layer.className = 'phone-shock';
      layer.innerHTML = `<img class="pixel" src="${artUrl('shock', 8)}" alt="">`;
      sound.play('shriek');
      buzz([700, 60, 700, 60, 1000]);
    }, 2600);
    window.setTimeout(() => {
      layer.className = 'phone-secret';
      layer.innerHTML = '<div class="phone-card center"><div class="medal">😱</div><h2>YOU FOUND THE CAVE!</h2><p>Something lives in there…</p><p><b>Don\'t tell the others! 🤫</b></p><button id="shock-ok">Back to the game ▸</button></div>';
      const close = () => { layer.remove(); this.shocking = false; controls.enabled = true; };
      layer.querySelector('#shock-ok')?.addEventListener('click', close);
      window.setTimeout(() => { if (layer.isConnected) close(); }, 3500);
    }, 4300);
  }

  private ended(): void {
    if (this.view === 'ended') return;
    this.stopGame();
    this.view = 'ended';
    this.root.querySelector('.phone-screen')?.classList.remove('is-playing');
    $(this.root, '#phone-top').innerHTML = '<span class="phone-logo">MOUNTAIN CHICKEN</span>';
    $(this.root, '#phone-top').removeAttribute('style');
    $(this.root, '#phone-main').innerHTML = `<div class="phone-card center"><img class="pixel phone-frog" src="${artUrl('frog-down-3', 6)}" alt=""><h2>Game over</h2><p>${esc(classPlayer.error)}</p><button id="rejoin">Back to the home page</button></div>`;
    $(this.root, '#rejoin').addEventListener('click', () => { classPlayer.ended = false; classPlayer.error = ''; this.home(''); });
  }

  // ---------------------------------------------------------------- joystick and keys

  /** Touch (or click) anywhere and drag: a joystick appears under your finger. */
  private bindTouch(layer: HTMLElement): void {
    let pointer: number | null = null;
    let origin = { x: 0, y: 0 };
    const stick = $(this.root, '#stick'), knob = $(this.root, '#knob');
    const move = (event: PointerEvent) => {
      let x = (event.clientX - origin.x) / STICK_RADIUS, y = (event.clientY - origin.y) / STICK_RADIUS;
      const length = Math.hypot(x, y);
      if (length > 1) { x /= length; y /= length; }
      if (length < .15) { x = 0; y = 0; }
      controls.x = x; controls.y = y;
      knob.style.transform = `translate(${x * STICK_RADIUS}px, ${y * STICK_RADIUS}px)`;
    };
    layer.addEventListener('pointerdown', event => {
      if (!controls.enabled) return;
      event.preventDefault();
      pointer = event.pointerId;
      try { layer.setPointerCapture(event.pointerId); } catch { /* not every pointer can be captured */ }
      const box = layer.getBoundingClientRect();
      origin = { x: event.clientX, y: event.clientY };
      stick.hidden = false;
      stick.style.left = `${event.clientX - box.left}px`;
      stick.style.top = `${event.clientY - box.top}px`;
      this.root.querySelector('#hint')?.classList.add('is-gone');
      move(event);
    });
    layer.addEventListener('pointermove', event => { if (event.pointerId === pointer) move(event); });
    const release = (event: PointerEvent) => { if (event.pointerId !== pointer) return; pointer = null; this.hideStick(); };
    layer.addEventListener('pointerup', release); layer.addEventListener('pointercancel', release); layer.addEventListener('lostpointercapture', release);
  }

  private hideStick(): void {
    const stick = this.root.querySelector<HTMLElement>('#stick');
    if (stick) stick.hidden = true;
    const knob = this.root.querySelector<HTMLElement>('#knob');
    if (knob) knob.style.transform = '';
    if (!this.keys.size) { controls.x = 0; controls.y = 0; }
  }

  private bindKeys(): void {
    const map: Record<string, [number, number]> = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
    const update = () => {
      let x = 0, y = 0;
      for (const key of this.keys) { x += map[key][0]; y += map[key][1]; }
      const length = Math.hypot(x, y) || 1;
      controls.x = x / length; controls.y = y / length;
    };
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLInputElement) return;
      const key = map[event.key] ? event.key : event.key.toLowerCase();
      const mode = classPlayer.state.mode;
      if (map[key] && this.view === 'play' && (mode === 'lobby' || mode === 'round')) {
        event.preventDefault(); this.keys.add(key); update();
        this.root.querySelector('#hint')?.classList.add('is-gone');
      } else if (mode === 'quiz' && ['1', '2', '3', '4'].includes(event.key)) this.root.querySelector<HTMLButtonElement>(`[data-choice="${Number(event.key) - 1}"]`)?.click();
    });
    window.addEventListener('keyup', event => { const key = map[event.key] ? event.key : event.key.toLowerCase(); if (this.keys.delete(key)) update(); });
    window.addEventListener('blur', () => { this.keys.clear(); controls.x = 0; controls.y = 0; });
  }
}

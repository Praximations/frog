import { classPlayer } from '../systems/ClassPlayer';
import type { PrivateMessage, PhoneState } from '../systems/ClassHost';
import { REACTIONS } from '../../server/shared.mjs';
import { BOOSTS } from '../data/game';
import { JOURNAL } from '../data/journal';
import { textOn } from '../systems/match';
import { sound } from '../systems/Sound';
import { artUrl } from '../world/pixels';
import { rulesHtml } from '../ui/rules';
import { showCards } from '../ui/cards';
import { esc, $ } from '../ui/html';

const ADJECTIVES = ['Sneaky', 'Giant', 'Brave', 'Sleepy', 'Speedy', 'Muddy', 'Mighty', 'Jolly', 'Quiet', 'Lucky', 'Bouncy', 'Soggy'];
const NOUNS = ['Cricket', 'Tadpole', 'Crapaud', 'Froglet', 'Beetle', 'Gecko', 'Snail', 'Fern', 'Crab', 'Firefly'];
const SHAPES = ['▲', '◆', '●', '■'];
const buzz = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* optional */ } };
const touch = () => matchMedia('(pointer: coarse)').matches;

/**
 * The home page and the player's screen, for phones and laptops alike. Join with the code from the
 * big screen, then this is your controller: joystick (or arrow keys), quiz buttons, "find me".
 * Plain DOM: players never download the game engine.
 */
export class PhoneApp {
  private root!: HTMLElement;
  private view = '';
  private stick = { x: 0, y: 0 };
  private sent = { x: 0, y: 0, at: 0 };
  private keys = new Set<string>();
  private shocking = false;
  private answered: { q: string; choice: number } | null = null;
  private result: Extract<PrivateMessage, { kind: 'result' }> | null = null;
  private boostTimer?: number;
  private sick = false;

  start(): void {
    document.body.classList.add('controller-mode');
    this.root = document.getElementById('interface')!;
    this.root.innerHTML = `<section class="phone-screen"><header class="phone-top" id="phone-top"><span class="phone-logo">MOUNTAIN CHICKEN</span></header><main id="phone-main"></main><div id="phone-fx"></div><div id="phone-modal"></div></section>`;
    classPlayer.subscribe(message => { if (message) this.onPrivate(message); this.render(); });
    for (const event of ['pointerdown', 'keydown']) window.addEventListener(event, () => sound.unlock(), { capture: true, passive: true });
    this.bindKeys();
    window.setInterval(() => this.flush(), 70);
    const seat = classPlayer.saved();
    this.home('');
    if (seat) void classPlayer.join(seat.code, seat.name, seat.token).catch(() => this.home(classPlayer.error));
  }

  // ---------------------------------------------------------------- home: join or host

  private home(error: string): void {
    this.view = 'home';
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
          <button type="submit" id="join">JOIN ▸</button>
        </form>
        <p class="phone-error" role="alert">${esc(error)}</p>
      </div>
      <div class="home-host">
        <button class="secondary" id="host">🖥️ HOST A GAME</button>
        <p class="phone-note">For the big screen. The host shows the game; everyone else joins.</p>
        <button class="text-button" id="facts">📖 Fact cards</button>
      </div>
    </div>`;
    const pin = $<HTMLInputElement>(this.root, '#pin'), nick = $<HTMLInputElement>(this.root, '#nick');
    pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); });
    $(this.root, '#dice').addEventListener('click', () => { nick.value = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`; });
    $(this.root, '#host').addEventListener('click', () => { location.hash = 'host'; location.reload(); });
    $(this.root, '#facts').addEventListener('click', () => showCards($(this.root, '#phone-modal'), JOURNAL, { closable: true }));
    if (!touch()) (code ? nick : pin).focus();
    $(this.root, '#join-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (!/^\d{6}$/.test(pin.value) || !nick.value.trim()) { $(this.root, '.phone-error').textContent = 'Type the 6-digit code and your name.'; return; }
      const button = $<HTMLButtonElement>(this.root, '#join'); button.disabled = true; button.textContent = 'JOINING…';
      sound.unlock();
      try { await classPlayer.join(pin.value, nick.value); buzz(40); }
      catch { if (this.view === 'home') { $(this.root, '.phone-error').textContent = classPlayer.error; button.disabled = false; button.textContent = 'JOIN ▸'; } }
    });
  }

  // ---------------------------------------------------------------- screens

  private render(): void {
    if (classPlayer.ended) { this.ended(); return; }
    if (!classPlayer.connected) {
      if (this.view !== 'home' && !classPlayer.saved()) this.home(classPlayer.error);
      else if (this.view !== 'home') $(this.root, '#phone-top').innerHTML = '<span class="phone-logo">Reconnecting…</span>';
      return;
    }
    this.renderTop();
    const state = classPlayer.state;
    const controls = state.mode === 'lobby' || state.mode === 'round' || state.mode === 'paused';
    if (controls) {
      if (this.view !== 'stick') this.stickView();
      this.updateStatus();
      return;
    }
    const key = `${state.mode}:${JSON.stringify(state)}:${this.answered?.q ?? ''}:${this.result?.q ?? ''}:${classPlayer.final?.rank ?? ''}`;
    if (key === this.view) return;
    this.view = key;
    this.setStick(0, 0);
    const main = $(this.root, '#phone-main');
    if (state.mode === 'intro') main.innerHTML = this.introView(state);
    else if (state.mode === 'quiz') { main.innerHTML = this.quizView(state); this.bindQuiz(state); }
    else if (state.mode === 'reveal') main.innerHTML = this.revealView(state);
    else if (state.mode === 'results') main.innerHTML = `<div class="phone-card center"><span class="micro">${esc(state.title.toUpperCase())}</span><h2>You have ${classPlayer.score} points</h2><p>👀 Look at the big screen!</p></div>${this.reactionRow()}`;
    else if (state.mode === 'learn') main.innerHTML = `<div class="phone-card center"><span class="micro">${esc(state.title.toUpperCase())}</span><h2>👀 Look at the big screen!</h2><p>Send a reaction:</p></div>${this.reactionRow()}`;
    else if (state.mode === 'final') {
      const final = classPlayer.final;
      const medal = final ? ['🥇', '🥈', '🥉'][final.rank - 1] ?? '🐸' : '🐸';
      main.innerHTML = `<div class="phone-card center podium-card"><div class="medal">${medal}</div>
        <h2>${final ? `#${final.rank} of ${final.of}` : 'Thanks for playing!'}</h2>
        <p>${classPlayer.score} points</p>
        <p class="phone-note">The mountain chicken thanks you. 🐸</p></div>${this.reactionRow()}`;
      if (final && final.rank <= 3) buzz([60, 80, 60, 80, 200]);
    }
    for (const button of main.querySelectorAll<HTMLButtonElement>('[data-emoji]')) {
      button.addEventListener('click', () => { classPlayer.react(button.dataset.emoji!); button.classList.remove('pop'); void button.offsetWidth; button.classList.add('pop'); buzz(10); });
    }
  }

  /** Your colour, name and score, always at the top, so you know which frog is yours. */
  private renderTop(): void {
    const top = $(this.root, '#phone-top');
    const color = classPlayer.color || '#3d2f27';
    const html = `<span class="you-dot" style="background:${color}"></span><span class="you-name">${esc(classPlayer.name)}${classPlayer.colorName ? ` <small>· ${esc(classPlayer.colorName.toUpperCase())} FROG</small>` : ''}</span><span class="phone-score"><b>${classPlayer.score}</b> pts</span>`;
    if (top.innerHTML !== html) top.innerHTML = html;
    top.style.background = color;
    top.style.color = textOn(color);
  }

  private introView(state: Extract<PhoneState, { mode: 'intro' }>): string {
    if (state.title === 'How to play') return `<div class="phone-card center"><span class="micro">GET READY</span><h2>How to play</h2>${rulesHtml(true)}</div>`;
    return `<div class="phone-card center round-intro"><span class="micro">GET READY</span><h2>${esc(state.title)}</h2><p>${esc(state.goal)}</p></div>`;
  }

  private stickView(): void {
    this.view = 'stick';
    const main = $(this.root, '#phone-main');
    main.innerHTML = `<div class="phone-status" id="status"></div>
      <div class="boost-bar" id="boost" hidden></div>
      <div class="stick" id="stick" aria-label="Joystick: drag to move your frog"><div class="stick-ring"></div><div class="stick-knob" id="knob" style="background:${classPlayer.color || '#95d06a'}"><img class="pixel" src="${artUrl('frog-up-0', 4)}" alt=""></div></div>
      <button class="find-me" id="find-me">📍 FIND MY FROG</button>
      <p class="phone-note">${touch() ? 'Drag the circle to move.' : 'Use the arrow keys or WASD (or drag the circle).'} Get close to bugs to eat them!</p>`;
    this.bindStick($(main, '#stick'));
    $(main, '#find-me').addEventListener('click', () => { classPlayer.ping(); buzz(20); });
  }

  private updateStatus(): void {
    const status = this.root.querySelector('#status');
    if (!status) return;
    const state = classPlayer.state;
    const colorName = classPlayer.colorName ? `<span class="status-color" style="background:${classPlayer.color};color:${textOn(classPlayer.color)}">YOU ARE THE ${esc(classPlayer.colorName.toUpperCase())} FROG</span>` : '';
    const text = state.mode === 'lobby' ? `${colorName}<b>You're in! Find your frog on the big screen.</b><span>Move around while everyone joins.</span>`
      : state.mode === 'round' ? `${colorName}<span class="micro">ROUND ${state.round} OF ${state.rounds} · ${esc(state.title.toUpperCase())}</span><b>${this.sick ? '🤢 You\'re sick! Hop into a warm pool.' : esc(state.goal)}</b>`
        : '<b>Paused</b><span>Look at the big screen.</span>';
    if (status.innerHTML !== text) status.innerHTML = text;
    status.classList.toggle('is-sick', this.sick && state.mode === 'round');
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
        this.render();
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
    else if (message.kind === 'you') { buzz(30); this.view = this.view === 'stick' ? 'restick' : this.view; }
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
    window.setTimeout(() => layer.remove(), scary ? 1600 : 1300);
  }

  /** You went into the dark cave… it goes quiet and dark, then a screaming face. */
  private shock(): void {
    if (this.shocking) return;
    this.shocking = true;
    this.keys.clear(); this.setStick(0, 0);
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
      layer.innerHTML = '<div class="phone-card center"><div class="medal">😱</div><h2>YOU WENT IN THE CAVE!</h2><p>We told you not to…</p><p><b>Don\'t tell the others! 🤫</b></p><button id="shock-ok">Back to the game ▸</button></div>';
      const close = () => { layer.remove(); this.shocking = false; };
      layer.querySelector('#shock-ok')?.addEventListener('click', close);
      window.setTimeout(() => { if (layer.isConnected) close(); }, 3500);
    }, 4300);
  }

  private ended(): void {
    if (this.view === 'ended') return;
    this.view = 'ended';
    this.setStick(0, 0);
    $(this.root, '#phone-top').innerHTML = '<span class="phone-logo">MOUNTAIN CHICKEN</span>';
    $(this.root, '#phone-top').removeAttribute('style');
    $(this.root, '#phone-main').innerHTML = `<div class="phone-card center"><img class="pixel phone-frog" src="${artUrl('frog-down-3', 6)}" alt=""><h2>Game over</h2><p>${esc(classPlayer.error)}</p><button id="rejoin">Back to the home page</button></div>`;
    $(this.root, '#rejoin').addEventListener('click', () => { classPlayer.ended = false; classPlayer.error = ''; this.home(''); });
  }

  // ---------------------------------------------------------------- joystick and keys

  private bindStick(pad: HTMLElement): void {
    let pointer: number | null = null;
    const move = (event: PointerEvent) => {
      const box = pad.getBoundingClientRect();
      const radius = box.width / 2 * .78;
      let x = (event.clientX - (box.left + box.width / 2)) / radius;
      let y = (event.clientY - (box.top + box.height / 2)) / radius;
      const length = Math.hypot(x, y);
      if (length > 1) { x /= length; y /= length; }
      if (length < .18) { x = 0; y = 0; }
      this.setStick(x, y);
    };
    pad.addEventListener('pointerdown', event => {
      event.preventDefault(); pointer = event.pointerId;
      try { pad.setPointerCapture(event.pointerId); } catch { /* not every pointer can be captured */ }
      move(event);
    });
    pad.addEventListener('pointermove', event => { if (event.pointerId === pointer) move(event); });
    const release = (event: PointerEvent) => { if (event.pointerId !== pointer) return; pointer = null; this.setStick(0, 0); };
    pad.addEventListener('pointerup', release); pad.addEventListener('pointercancel', release); pad.addEventListener('lostpointercapture', release);
  }

  private setStick(x: number, y: number): void {
    if (this.shocking) { x = 0; y = 0; }
    this.stick = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
    const knob = this.root.querySelector<HTMLElement>('#knob');
    if (knob) knob.style.transform = `translate(${this.stick.x * 78}%, ${this.stick.y * 78}%)`;
    if (!x && !y) this.flush(true);
  }

  /** Sends the joystick when it changes, plus a heartbeat while held so the frog keeps moving. */
  private flush(force = false): void {
    const now = performance.now();
    const { x, y } = this.stick;
    const changed = Math.abs(x - this.sent.x) > .04 || Math.abs(y - this.sent.y) > .04;
    const holding = (x || y) && now - this.sent.at > 400;
    if (!force && !changed && !holding) return;
    if (force && !this.sent.x && !this.sent.y && !x && !y) return;
    this.sent = { x, y, at: now };
    classPlayer.steer(x, y);
  }

  private bindKeys(): void {
    const map: Record<string, [number, number]> = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
    const update = () => {
      let x = 0, y = 0;
      for (const key of this.keys) { x += map[key][0]; y += map[key][1]; }
      const length = Math.hypot(x, y) || 1;
      this.setStick(x / length, y / length);
    };
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLInputElement) return;
      const key = map[event.key] ? event.key : event.key.toLowerCase();
      if (map[key] && this.view === 'stick') { event.preventDefault(); this.keys.add(key); update(); }
      else if ((event.key === 'f' || event.key === 'F') && this.view === 'stick') classPlayer.ping();
      else if (classPlayer.state.mode === 'quiz' && ['1', '2', '3', '4'].includes(event.key)) this.root.querySelector<HTMLButtonElement>(`[data-choice="${Number(event.key) - 1}"]`)?.click();
    });
    window.addEventListener('keyup', event => { const key = map[event.key] ? event.key : event.key.toLowerCase(); if (this.keys.delete(key)) update(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.setStick(0, 0); });
  }
}

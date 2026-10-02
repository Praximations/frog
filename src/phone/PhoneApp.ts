import { classPlayer } from '../systems/ClassPlayer';
import type { PrivateMessage } from '../systems/ClassHost';
import { TEAMS } from '../systems/match';
import { sound } from '../systems/Sound';
import { artUrl } from '../world/pixels';
import { esc, $ } from '../ui/html';

const REACTIONS = ['🐸', '❤️', '😱', '👏', '🔥', '🦗'];
const ADJECTIVES = ['Sneaky', 'Giant', 'Brave', 'Sleepy', 'Speedy', 'Muddy', 'Mighty', 'Jolly', 'Quiet', 'Lucky', 'Bouncy', 'Soggy'];
const NOUNS = ['Cricket', 'Tadpole', 'Crapaud', 'Froglet', 'Beetle', 'Gecko', 'Snail', 'Fern', 'Crab', 'Firefly'];
const buzz = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* optional */ } };

/**
 * A classmate's phone: join with the code, then it is simply a joystick for your own frog.
 * Plain DOM — phones never download or run the Phaser game engine.
 */
export class PhoneApp {
  private root!: HTMLElement;
  private view = '';
  private stick = { x: 0, y: 0 };
  private sent = { x: 0, y: 0, at: 0 };
  private timer?: number;
  private keys = new Set<string>();

  start(): void {
    document.body.classList.add('controller-mode');
    this.root = document.getElementById('interface')!;
    this.root.innerHTML = `<section class="phone-screen"><header class="phone-top"><span class="phone-logo">MOUNTAIN CHICKEN</span><span class="phone-score" id="phone-score"></span></header><main id="phone-main"></main><div id="phone-fx"></div></section>`;
    classPlayer.subscribe(message => { this.render(); if (message) this.onPrivate(message); });
    for (const event of ['pointerdown', 'keydown']) window.addEventListener(event, () => sound.unlock(), { capture: true, passive: true });
    this.bindKeys();
    this.timer = window.setInterval(() => this.flush(), 70);
    const seat = classPlayer.saved();
    this.joinForm('');
    if (seat) void classPlayer.join(seat.code, seat.name, seat.token).catch(() => this.joinForm(classPlayer.error));
  }

  // ---------------------------------------------------------------- join

  private joinForm(error: string): void {
    this.view = 'join';
    const code = (location.hash.match(/join=(\d{6})/) || [])[1] || '';
    $(this.root, '#phone-score').textContent = '';
    $(this.root, '#phone-main').innerHTML = `<div class="phone-card join-card">
      <img class="pixel phone-frog" src="${artUrl('portrait', 4)}" alt="">
      <h2>Join the pond</h2>
      <form id="join-form">
        <label for="pin">Code from the big screen</label>
        <input id="pin" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" required placeholder="123456" value="${esc(code)}">
        <label for="nick">Your frog's name</label>
        <div class="nick-row"><input id="nick" autocomplete="off" maxlength="16" required placeholder="Sneaky Cricket"><button type="button" class="secondary dice" id="dice" aria-label="Random name">🎲</button></div>
        <button type="submit" id="join">JOIN ▸</button>
      </form>
      <p class="phone-error" role="alert">${esc(error)}</p>
      <p class="phone-note">Be kind with names — the host can remove players.</p>
    </div>`;
    const pin = $<HTMLInputElement>(this.root, '#pin'), nick = $<HTMLInputElement>(this.root, '#nick');
    pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); });
    $(this.root, '#dice').addEventListener('click', () => { nick.value = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`; });
    (code ? nick : pin).focus();
    $(this.root, '#join-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (!/^\d{6}$/.test(pin.value) || !nick.value.trim()) { $(this.root, '.phone-error').textContent = 'Enter the 6-digit code and a name.'; return; }
      const button = $<HTMLButtonElement>(this.root, '#join'); button.disabled = true; button.textContent = 'JOINING…';
      sound.unlock();
      try { await classPlayer.join(pin.value, nick.value); buzz(40); }
      catch { if (this.view === 'join') { $(this.root, '.phone-error').textContent = classPlayer.error; button.disabled = false; button.textContent = 'JOIN ▸'; } }
    });
  }

  // ---------------------------------------------------------------- screens

  private render(): void {
    if (classPlayer.ended) { this.ended(); return; }
    if (!classPlayer.connected) {
      if (this.view !== 'join' && !classPlayer.saved()) this.joinForm(classPlayer.error);
      else if (this.view !== 'join') $(this.root, '#phone-score').textContent = 'Reconnecting…';
      return;
    }
    const team = classPlayer.team;
    $(this.root, '#phone-score').innerHTML = `${esc(classPlayer.name)}${team !== null ? ` · <i class="team-dot" style="background:${TEAMS[team].color}"></i>` : ''} · <b>${classPlayer.score}</b> pts`;
    const state = classPlayer.state;
    const controls = state.mode === 'lobby' || state.mode === 'intro' || state.mode === 'round' || state.mode === 'paused';
    const key = controls ? 'stick' : `${state.mode}:${JSON.stringify(state)}:${classPlayer.final?.rank ?? ''}`;
    if (controls) {
      if (this.view !== 'stick') this.stickView();
      this.updateStatus();
      return;
    }
    if (key === this.view) return;
    this.view = key;
    this.setStick(0, 0);
    const main = $(this.root, '#phone-main');
    if (state.mode === 'learn') {
      main.innerHTML = `<div class="phone-card center"><span class="micro">LEARNING BREAK</span><h2>${esc(state.title)}</h2><p>👀 Watch the big screen!</p></div>${this.reactionRow()}`;
    } else if (state.mode === 'results') {
      const mine = team !== null && state.winner === team;
      main.innerHTML = `<div class="phone-card center result ${state.winner === -1 ? '' : mine ? 'is-right' : 'is-wrong'}"><span class="micro">${esc(state.title.toUpperCase())}</span>
        <h2>${state.winner === -1 ? 'A draw!' : mine ? 'Your team won!' : `${esc(TEAMS[state.winner].name)} won`}</h2>
        <p>You have <b>${classPlayer.score}</b> points</p></div>${this.reactionRow()}`;
      buzz(mine ? [40, 60, 40] : 120);
    } else if (state.mode === 'final') {
      const final = classPlayer.final;
      const medal = final ? ['🥇', '🥈', '🥉'][final.rank - 1] ?? '🐸' : '🐸';
      main.innerHTML = `<div class="phone-card center podium-card"><div class="medal">${medal}</div>
        <h2>${final ? `#${final.rank} of ${final.of}` : 'Thanks for playing!'}</h2>
        <p>${classPlayer.score} points${final ? ` · ${final.won ? 'your team won! 🎉' : state.winner === -1 ? 'a draw' : 'good effort!'}` : ''}</p>
        <p class="phone-note">The mountain chicken thanks you. 🐸</p></div>${this.reactionRow()}`;
      if (final && final.rank <= 3) buzz([60, 80, 60, 80, 200]);
    }
    for (const button of main.querySelectorAll<HTMLButtonElement>('[data-emoji]')) {
      button.addEventListener('click', () => { classPlayer.react(button.dataset.emoji!); button.classList.remove('pop'); void button.offsetWidth; button.classList.add('pop'); buzz(10); });
    }
  }

  private stickView(): void {
    this.view = 'stick';
    const main = $(this.root, '#phone-main');
    main.innerHTML = `<div class="phone-status" id="status"></div>
      <div class="stick" id="stick" aria-label="Joystick: drag to move your frog"><div class="stick-ring"></div><div class="stick-knob" id="knob"><img class="pixel" src="${artUrl('frog-up-0', 4)}" alt=""></div></div>
      <p class="phone-note">Drag to move your frog. It eats and grabs things by touching them.</p>`;
    this.bindStick($(main, '#stick'));
  }

  private updateStatus(): void {
    const status = this.root.querySelector('#status');
    if (!status) return;
    const state = classPlayer.state;
    const team = classPlayer.team;
    const teamLine = team !== null ? `<span class="status-team" style="background:${TEAMS[team].color}">${TEAMS[team].name.toUpperCase()}</span>` : '';
    const text = state.mode === 'lobby' ? `${teamLine}<b>Find your frog on the big screen!</b><span>Move around to warm up.</span>`
      : state.mode === 'intro' ? `${teamLine}<b>${esc(state.title)}</b><span>${esc(state.goal)}</span>`
        : state.mode === 'round' ? `${teamLine}<b>${esc(state.goal)}</b><span>Your points: ${classPlayer.score}</span>`
          : `<b>Paused</b><span>The presenter paused the game.</span>`;
    if (status.innerHTML !== text) status.innerHTML = text;
    status.classList.toggle('is-round', state.mode === 'round');
  }

  private reactionRow(): string {
    return `<div class="reaction-row" aria-label="Send a reaction to the big screen">${REACTIONS.map(emoji => `<button class="react" data-emoji="${emoji}">${emoji}</button>`).join('')}</div>`;
  }

  private onPrivate(message: PrivateMessage): void {
    if (message.kind === 'caught') this.caught(message.scare);
    else if (message.kind === 'you') { buzz(30); this.updateStatus(); }
  }

  /** A hunter caught your frog: your own little jump-scare. */
  private caught(scare: boolean): void {
    const fx = $(this.root, '#phone-fx');
    const layer = document.createElement('div');
    layer.className = scare ? 'phone-scare' : 'phone-caught';
    layer.innerHTML = scare ? `<img class="pixel" src="${artUrl('scare', 10)}" alt=""><b>CAUGHT!</b>` : '<b>CAUGHT!</b><span>−3 points</span>';
    fx.replaceChildren(layer);
    sound.play(scare ? 'scare' : 'hurt');
    buzz(scare ? [300, 80, 300] : 150);
    window.setTimeout(() => layer.remove(), scare ? 1600 : 1200);
  }

  private ended(): void {
    if (this.view === 'ended') return;
    this.view = 'ended';
    this.setStick(0, 0);
    $(this.root, '#phone-score').textContent = '';
    $(this.root, '#phone-main').innerHTML = `<div class="phone-card center"><img class="pixel phone-frog" src="${artUrl('frog-down-3', 6)}" alt=""><h2>Game over</h2><p>${esc(classPlayer.error)}</p><button id="rejoin">Join a new game</button></div>`;
    $(this.root, '#rejoin').addEventListener('click', () => { classPlayer.ended = false; classPlayer.error = ''; this.joinForm(''); });
  }

  // ---------------------------------------------------------------- joystick

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
    window.addEventListener('keydown', event => { const key = map[event.key] ? event.key : event.key.toLowerCase(); if (map[key] && this.view === 'stick' && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); this.keys.add(key); update(); } });
    window.addEventListener('keyup', event => { const key = map[event.key] ? event.key : event.key.toLowerCase(); if (this.keys.delete(key)) update(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.setStick(0, 0); });
  }
}

import { classPlayer } from '../systems/ClassPlayer';
import { sound } from '../systems/Sound';
import { artUrl } from '../world/pixels';
import { SHAPES } from '../ui/shapes';
import { esc, $ } from '../ui/html';
import { EMPTY_INPUT, type MovementInput } from '../systems/input';

const REACTIONS = ['🐸', '❤️', '😱', '👏', '🔥', '🦗'];
const ADJECTIVES = ['Sneaky', 'Giant', 'Brave', 'Sleepy', 'Speedy', 'Muddy', 'Mighty', 'Jolly', 'Quiet', 'Lucky', 'Bouncy', 'Soggy'];
const NOUNS = ['Cricket', 'Tadpole', 'Crapaud', 'Froglet', 'Beetle', 'Gecko', 'Snail', 'Fern', 'Crab', 'Firefly'];
const COLORS = ['red', 'blue', 'yellow', 'green'];
const buzz = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* optional */ } };

/**
 * A classmate's phone: join with the PIN, then answer, react, drop crickets, or pilot the frog.
 * Plain DOM — phones never download or run the Phaser game engine.
 */
export class PhoneApp {
  private root!: HTMLElement;
  private view = '';
  private held = new Set<string>();
  private interval?: number;
  private cleanupKeys?: () => void;
  private bugReadyAt = 0;
  private lastResultRound = -1;

  start(): void {
    document.body.classList.add('controller-mode');
    this.view = '';
    this.root = document.getElementById('interface')!;
    this.root.innerHTML = `<section class="phone-screen"><header class="phone-top"><span class="phone-logo">MOUNTAIN CHICKEN</span><span class="phone-score" id="phone-score"></span></header><main id="phone-main"></main></section>`;
    classPlayer.subscribe(() => this.render());
    for (const event of ['pointerdown', 'keydown']) window.addEventListener(event, () => sound.unlock(), { capture: true, passive: true });
    const seat = classPlayer.saved();
    if (classPlayer.connected) this.render();
    else if (seat) { this.joinForm(''); void classPlayer.join(seat.code, seat.name, seat.token).catch(() => this.joinForm(classPlayer.error)); }
    else this.joinForm('');
  }

  private joinForm(error: string): void {
    this.view = 'join'; this.stopPilot();
    const code = (location.hash.match(/join=(\d{6})/) || [])[1] || '';
    $(this.root, '#phone-score').textContent = '';
    $(this.root, '#phone-main').innerHTML = `<div class="phone-card join-card">
      <img class="pixel phone-frog" src="${artUrl('portrait', 4)}" alt="">
      <h2>Join the game</h2>
      <form id="join-form">
        <label for="pin">Game PIN</label>
        <input id="pin" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" required placeholder="123456" value="${esc(code)}">
        <label for="nick">Nickname</label>
        <div class="nick-row"><input id="nick" autocomplete="off" maxlength="16" required placeholder="Sneaky Cricket"><button type="button" class="secondary dice" id="dice" aria-label="Random nickname">🎲</button></div>
        <button type="submit" id="join">JOIN ▸</button>
      </form>
      <p class="phone-error" role="alert">${esc(error)}</p>
      <p class="phone-note">Look at the big screen for the PIN. Be kind with nicknames — the host can remove players.</p>
    </div>`;
    const pin = $<HTMLInputElement>(this.root, '#pin'), nick = $<HTMLInputElement>(this.root, '#nick');
    pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); });
    $(this.root, '#dice').addEventListener('click', () => { nick.value = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`; });
    (code ? nick : pin).focus();
    $(this.root, '#join-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (!/^\d{6}$/.test(pin.value) || !nick.value.trim()) { $(this.root, '.phone-error').textContent = 'Enter the 6-digit PIN and a nickname.'; return; }
      const button = $<HTMLButtonElement>(this.root, '#join'); button.disabled = true; button.textContent = 'JOINING…';
      sound.unlock();
      try { await classPlayer.join(pin.value, nick.value); buzz(40); }
      catch { if (this.view === 'join') { $(this.root, '.phone-error').textContent = classPlayer.error; button.disabled = false; button.textContent = 'JOIN ▸'; } }
    });
  }

  private render(): void {
    if (classPlayer.ended || (!classPlayer.connected && classPlayer.error && this.view !== 'join')) {
      if (classPlayer.ended) { this.ended(); return; }
      if (this.view !== 'join' && !classPlayer.saved()) { this.joinForm(classPlayer.error); return; }
    }
    if (!classPlayer.connected) {
      if (this.view && this.view !== 'join') $(this.root, '#phone-score').textContent = 'Reconnecting…';
      return;
    }
    $(this.root, '#phone-score').innerHTML = `${esc(classPlayer.name)} · <b>${classPlayer.score}</b>${classPlayer.rank ? ` · #${classPlayer.rank}` : ''}`;
    const state = classPlayer.state;
    const key = `${state.mode}:${'round' in state ? state.round : ''}:${'chapter' in state ? state.chapter : ''}:${classPlayer.pilot}:${'bugs' in state ? state.bugs : ''}:${classPlayer.answeredRound}`;
    if (state.mode === 'reveal' && classPlayer.last?.kind === 'result' && classPlayer.last.round !== this.lastResultRound) { this.view = ''; }
    if (key === this.view) return;
    this.view = key;
    if (!(classPlayer.pilot && (state.mode === 'chapter' || state.mode === 'card' || state.mode === 'paused'))) this.stopPilot();
    const main = $(this.root, '#phone-main');
    if (state.mode === 'lobby') {
      main.innerHTML = `<div class="phone-card center"><img class="pixel phone-frog bounce" src="${artUrl('frog-down-0', 6)}" alt=""><h2>You're in!</h2><p>See <b>${esc(classPlayer.name)}</b> on the big screen?</p><p class="phone-note">Get ready to answer questions and help the frog.</p></div>${this.reactionRow()}`;
    } else if (state.mode === 'chapter' || state.mode === 'card' || state.mode === 'paused') {
      if (classPlayer.pilot) { this.pilotPad(state.title, state.objective); return; }
      const hint = state.mode === 'card' ? 'Learning time — watch the big screen!' : state.mode === 'paused' ? 'Paused' : esc(state.objective);
      main.innerHTML = `<div class="phone-card center"><span class="micro">CHAPTER ${state.chapter}</span><h2>${esc(state.title)}</h2><p>${hint}</p></div>
        ${state.bugs ? `<button class="bug-button" id="bug">🦗<b>DROP A CRICKET</b><small>+150 if the frog eats yours</small><i id="bug-cool"></i></button>` : ''}
        ${this.reactionRow()}`;
      main.querySelector('#bug')?.addEventListener('click', () => this.dropBug());
    } else if (state.mode === 'quiz') {
      if (classPlayer.answeredRound === state.round) {
        main.innerHTML = `<div class="phone-card center"><div class="spinner"></div><h2>Answer locked in!</h2><p>Waiting for everyone…</p></div>`;
      } else {
        main.innerHTML = `<p class="phone-question">${esc(state.question)}</p><div class="phone-answers">${state.options.map((option, i) => `<button class="answer answer-${COLORS[i]}" data-choice="${i}"><span class="shape">${SHAPES[i]}</span><span class="answer-text">${esc(option)}</span></button>`).join('')}</div>`;
        for (const button of main.querySelectorAll<HTMLButtonElement>('[data-choice]')) button.addEventListener('click', () => { classPlayer.answer(state.round, Number(button.dataset.choice)); buzz(30); sound.play('click'); });
      }
    } else if (state.mode === 'reveal') {
      const result = classPlayer.last?.kind === 'result' && classPlayer.last.round === state.round ? classPlayer.last : undefined;
      if (result) this.lastResultRound = state.round;
      const right = result?.correct;
      if (result) { sound.play(right ? 'correct' : 'wrong'); buzz(right ? [40, 60, 40] : 200); }
      main.innerHTML = `<div class="phone-card center result ${result ? right ? 'is-right' : 'is-wrong' : ''}">
        <h2>${!result ? 'Answer revealed' : !result.answered ? 'Too slow!' : right ? 'Correct!' : 'Not quite!'}</h2>
        ${result ? `<b class="gain">+${result.gain ?? 0}</b>${(result.streak ?? 0) >= 2 ? `<p>🔥 ${result.streak} in a row!</p>` : ''}<p>You're <b>#${result.rank}</b> of ${result.of}</p>` : ''}
        <p class="phone-note">Correct answer: <b>${esc(state.options[state.correct])}</b></p></div>`;
    } else if (state.mode === 'overview') {
      main.innerHTML = `<div class="phone-card center"><span class="micro">UP NEXT</span><h2>${esc(state.next)}</h2>${classPlayer.rank ? `<p>You're <b>#${classPlayer.rank}</b> with ${classPlayer.score} points</p>` : ''}</div>${this.reactionRow()}`;
    } else if (state.mode === 'podium') {
      const rank = classPlayer.rank;
      main.innerHTML = `<div class="phone-card center podium-card"><div class="medal">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🐸'}</div><h2>${rank ? `#${rank} of ${classPlayer.of}` : 'Thanks for playing!'}</h2><p>${classPlayer.score} points</p><p class="phone-note">The mountain chicken thanks you. 🐸</p></div>${this.reactionRow()}`;
      if (rank && rank <= 3) buzz([60, 80, 60, 80, 200]);
    }
    for (const button of main.querySelectorAll<HTMLButtonElement>('[data-emoji]')) {
      button.addEventListener('click', () => { classPlayer.react(button.dataset.emoji!); button.classList.remove('pop'); void button.offsetWidth; button.classList.add('pop'); buzz(10); });
    }
  }

  private reactionRow(): string {
    return `<div class="reaction-row" aria-label="Send a reaction to the big screen">${REACTIONS.map(emoji => `<button class="react" data-emoji="${emoji}">${emoji}</button>`).join('')}</div>`;
  }

  private dropBug(): void {
    const now = performance.now();
    if (now < this.bugReadyAt) return;
    this.bugReadyAt = now + 4000;
    classPlayer.bug(); buzz(25); sound.play('hop');
    const cool = this.root.querySelector<HTMLElement>('#bug-cool');
    const button = this.root.querySelector<HTMLButtonElement>('#bug');
    if (cool && button) { button.disabled = true; cool.style.animation = 'none'; void cool.offsetWidth; cool.style.animation = ''; cool.classList.add('cooling'); window.setTimeout(() => { if (button.isConnected) { button.disabled = false; cool.classList.remove('cooling'); } }, 4000); }
  }

  private ended(): void {
    this.view = 'ended'; this.stopPilot();
    $(this.root, '#phone-score').textContent = '';
    $(this.root, '#phone-main').innerHTML = `<div class="phone-card center"><img class="pixel phone-frog" src="${artUrl('frog-down-3', 6)}" alt=""><h2>Game over</h2><p>${esc(classPlayer.error)}</p><button id="rejoin">Join a new game</button></div>`;
    $(this.root, '#rejoin').addEventListener('click', () => { classPlayer.ended = false; classPlayer.error = ''; this.joinForm(''); });
  }

  // ---------------------------------------------------------------- pilot

  private pilotPad(title: string, objective: string): void {
    const main = $(this.root, '#phone-main');
    main.innerHTML = `<div class="phone-card center pilot-head"><span class="micro">🎮 YOU ARE THE FROG PILOT</span><h2>${esc(title)}</h2><p>${esc(objective)}</p></div>
      <div class="pilot-pad"><div class="direction-pad"><button data-control="up" class="pad-up" aria-label="Up">▲</button><button data-control="left" class="pad-left" aria-label="Left">◀</button><span class="pad-center"></span><button data-control="right" class="pad-right" aria-label="Right">▶</button><button data-control="down" class="pad-down" aria-label="Down">▼</button></div>
      <div class="action-pad"><button data-control="interact" class="action-big">ACTION</button><button data-control="pause" class="secondary">PAUSE</button></div></div>`;
    for (const button of main.querySelectorAll<HTMLButtonElement>('[data-control]')) {
      const control = button.dataset.control!;
      button.addEventListener('pointerdown', event => { event.preventDefault(); this.held.add(control); this.sendPilot(); buzz(8); try { button.setPointerCapture(event.pointerId); } catch { /* not every pointer can be captured */ } });
      const release = () => { this.held.delete(control); this.sendPilot(); };
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    }
    if (!this.interval) {
      const keys: Record<string, string> = { w: 'up', ArrowUp: 'up', a: 'left', ArrowLeft: 'left', s: 'down', ArrowDown: 'down', d: 'right', ArrowRight: 'right', ' ': 'interact', e: 'interact', Enter: 'interact', Escape: 'pause' };
      const press = (event: KeyboardEvent) => { const control = keys[event.key] || keys[event.key.toLowerCase()]; if (control) { event.preventDefault(); this.held.add(control); this.sendPilot(); } };
      const release = (event: KeyboardEvent) => { const control = keys[event.key] || keys[event.key.toLowerCase()]; if (control) { event.preventDefault(); this.held.delete(control); this.sendPilot(); } };
      const reset = () => { this.held.clear(); this.sendPilot(); };
      window.addEventListener('keydown', press); window.addEventListener('keyup', release); window.addEventListener('blur', reset);
      this.cleanupKeys = () => { window.removeEventListener('keydown', press); window.removeEventListener('keyup', release); window.removeEventListener('blur', reset); };
      this.interval = window.setInterval(() => this.sendPilot(), 1000 / 30);
    }
  }

  private sendPilot(): void {
    const input: MovementInput = { ...EMPTY_INPUT, x: Number(this.held.has('right')) - Number(this.held.has('left')), y: Number(this.held.has('down')) - Number(this.held.has('up')), interact: this.held.has('interact'), pause: this.held.has('pause') };
    classPlayer.sendInput(input);
  }

  private stopPilot(): void {
    if (this.interval) window.clearInterval(this.interval);
    this.interval = undefined;
    this.cleanupKeys?.(); this.cleanupKeys = undefined;
    if (this.held.size) { this.held.clear(); this.sendPilot(); }
  }
}

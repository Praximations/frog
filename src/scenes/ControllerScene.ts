import Phaser from 'phaser';
import { showOverlay } from '../ui/ScreenOverlay';
import { session } from '../systems/SessionClient';
import { EMPTY_INPUT, MovementInput } from '../entities/Frog';

export class ControllerScene extends Phaser.Scene {
  private root!: HTMLElement;
  private inputs: MovementInput = { ...EMPTY_INPUT };
  private held = new Set<string>();
  private interval?: number;
  private leave?: () => void;
  constructor() { super('ControllerScene'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b211b');
    document.body.classList.add('controller-mode');
    this.root = showOverlay(this, `<section class="controller-screen"><header class="session-header"><button class="text-button" id="back">← BACK</button><span class="micro">YOUR PLAY SCREEN</span></header><div id="controller-content"></div></section>`);
    this.root.querySelector('#back')!.addEventListener('click', () => { session.disconnect(); location.hash = ''; this.scene.start('MenuScene'); });
    this.joinForm();
    this.leave = session.subscribe(() => {
      if (session.role !== 'controller') return;
      if (session.connected && !this.root.querySelector('#control-pad')) this.controlScreen();
      else if (session.connected) this.updateStatus();
      else if (this.root.querySelector('#control-pad')) this.joinForm(session.error || 'Connection lost. Rejoin with the main-screen code.');
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.leave?.(); this.stopControls(); document.body.classList.remove('controller-mode');
    });
  }

  private joinForm(error = ''): void {
    this.stopControls();
    this.root.querySelector('#controller-content')!.innerHTML = `<div class="join-panel"><div class="eyebrow">ROOM CODE</div><h2>Join game</h2><p class="session-description">Enter the code from the main screen.</p><form id="join-form"><label class="micro" for="code-input">FOREST CODE</label><input id="code-input" name="code" type="text" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" required placeholder="000000" aria-describedby="join-error"><button id="join-button" type="submit">Join ▸</button></form><div class="session-error" id="join-error" role="alert"></div><p class="session-note">The game stays on the main screen.</p></div>`;
    this.root.querySelector('#join-error')!.textContent = error;
    const form = this.root.querySelector<HTMLFormElement>('#join-form')!;
    const input = this.root.querySelector<HTMLInputElement>('#code-input')!;
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 6); });
    input.focus();
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const button = this.root.querySelector<HTMLButtonElement>('#join-button')!;
      button.disabled = true; button.textContent = 'CONNECTING…';
      try { await session.connect('controller', input.value); }
      catch {
        if (this.root.querySelector('#join-error')) this.root.querySelector('#join-error')!.textContent = session.error;
        if (button.isConnected) { button.disabled = false; button.textContent = 'Join ▸'; }
      }
    });
  }

  private controlScreen(): void {
    this.root.querySelector('#controller-content')!.innerHTML = `<div class="control-layout"><div class="controller-heading"><span class="micro">ROOM <span id="connected-code"></span></span><h2>Controller</h2><p id="remote-objective" role="status"></p></div><div class="controller-message" id="controller-message"></div><div id="control-pad"><div class="direction-pad"><button data-control="up" class="pad-up" aria-label="Move up">↑</button><button data-control="left" class="pad-left" aria-label="Move left">←</button><span class="pad-center">✦</span><button data-control="right" class="pad-right" aria-label="Move right">→</button><button data-control="down" class="pad-down" aria-label="Move down">↓</button></div><div class="action-pad"><button data-control="hop" class="hop-control">HOP<span>SPACE</span></button><button data-control="interact" class="interact-control" id="remote-interact">INTERACT<span>E / ENTER</span></button><button data-control="pause" class="secondary pause-control">PAUSE / RESUME</button></div></div><p class="session-note">Touch and hold to move. Keyboard: WASD / arrows, Space, E, Escape.</p></div>`;
    this.inputs = { ...EMPTY_INPUT }; this.held.clear();
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-control]')) {
      const control = button.dataset.control!;
      button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); this.held.add(control); this.sendControls(); });
      const release = () => { this.held.delete(control); this.sendControls(); };
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    }
    const controls: Record<string, string> = { w: 'up', ArrowUp: 'up', a: 'left', ArrowLeft: 'left', s: 'down', ArrowDown: 'down', d: 'right', ArrowRight: 'right', ' ': 'hop', e: 'interact', Enter: 'interact', Escape: 'pause' };
    const press = (event: KeyboardEvent) => {
      const control = controls[event.key] || controls[event.key.toLowerCase()];
      if (control) { event.preventDefault(); this.held.add(control); this.sendControls(); }
    };
    const release = (event: KeyboardEvent) => {
      const control = controls[event.key] || controls[event.key.toLowerCase()];
      if (control) { event.preventDefault(); this.held.delete(control); this.sendControls(); }
    };
    const reset = () => { this.held.clear(); this.sendControls(); };
    const visibility = () => { if (document.hidden) reset(); };
    window.addEventListener('keydown', press); window.addEventListener('keyup', release); window.addEventListener('blur', reset); document.addEventListener('visibilitychange', visibility);
    this.cleanupInput = () => {
      window.removeEventListener('keydown', press); window.removeEventListener('keyup', release); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', visibility); reset();
    };
    this.interval = window.setInterval(() => this.sendControls(), 1000 / 30);
    this.updateStatus();
  }
  private cleanupInput?: () => void;

  private sendControls(): void {
    this.inputs = { x: Number(this.held.has('right')) - Number(this.held.has('left')), y: Number(this.held.has('down')) - Number(this.held.has('up')), hop: this.held.has('hop'), interact: this.held.has('interact'), pause: this.held.has('pause') };
    session.sendInput(this.inputs);
  }

  private updateStatus(): void {
    this.root.querySelector('#connected-code')!.textContent = session.code;
    this.root.querySelector('#remote-objective')!.textContent = session.state.objective;
    const messages = { lobby: 'Waiting for the host to start.', playing: 'Watch the main screen.', paused: 'Paused. Press Resume to play.', card: 'Press Continue when ready.' };
    this.root.querySelector('#controller-message')!.textContent = messages[session.state.mode];
    this.root.querySelector('#remote-interact')!.innerHTML = session.state.mode === 'card' ? 'CONTINUE<span>E / ENTER</span>' : 'INTERACT<span>E / ENTER</span>';
  }

  private stopControls(): void {
    if (this.interval) window.clearInterval(this.interval); this.interval = undefined;
    this.cleanupInput?.(); this.cleanupInput = undefined; this.held.clear();
  }
}

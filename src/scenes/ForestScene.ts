import Phaser from 'phaser';
import { Frog, MovementInput } from '../entities/Frog';
import { buildForest, LANDMARKS, WORLD } from '../world/ForestWorld';
import { showOverlay } from '../ui/ScreenOverlay';
import { session } from '../systems/SessionClient';

export class ForestScene extends Phaser.Scene {
  private frog!: Frog;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private root!: HTMLElement;
  private stage = 0;
  private eaten = 0;
  private energy = 100;
  private frozen = false;
  private insects: { sprite: Phaser.GameObjects.Image; x: number; y: number; alive: boolean }[] = [];
  private target!: Phaser.GameObjects.Container;
  private previousInteract = false;
  private previousPause = false;
  private elapsed = 0;
  private onContinue?: () => void;
  private modalKind: 'card' | 'pause' | null = null;

  constructor() { super('ForestScene'); }

  create(): void {
    this.stage = 0; this.eaten = 0; this.energy = 100; this.frozen = false;
    this.insects = []; this.elapsed = 0; this.previousInteract = false; this.previousPause = false; this.onContinue = undefined;
    this.modalKind = null;
    this.physics.resume();
    const obstacles = buildForest(this);
    this.physics.world.setBounds(130, 150, WORLD.width - 260, WORLD.height - 280);
    this.frog = new Frog(this, 560, 880);
    this.physics.add.collider(this.frog.collider, obstacles);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.centerOn(this.frog.x, this.frog.y - 55);
    this.cameras.main.startFollow(this.frog.collider, true, .075, .075, 0, 55);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    for (let i = 0; i < 5; i++) {
      const x = 800 + (i % 3) * 65, y = 475 + Math.floor(i / 3) * 78;
      const sprite = this.add.image(x, y, 'insect').setScale(2.3).setDepth(y);
      this.insects.push({ sprite, x, y, alive: true });
    }
    for (const [x, y] of [[680, 1040], [760, 630], [1790, 880]]) {
      const npc = this.add.image(x, y, 'frog').setScale(1.25).setDepth(y).setTint(0xc8c895);
      this.tweens.add({ targets: npc, y: y - 5, duration: 500, yoyo: true, repeat: -1, repeatDelay: 2400 });
    }
    const ring = this.add.ellipse(0, 0, 62, 27).setStrokeStyle(2, 0xead5a0, .65);
    const arrow = this.add.text(0, -68, '◆', { fontSize: '23px', color: '#ead5a0' }).setOrigin(.5);
    this.target = this.add.container(LANDMARKS.board.x, LANDMARKS.board.y, [ring, arrow]).setDepth(3100);
    this.tweens.add({ targets: arrow, y: -80, duration: 800, yoyo: true, repeat: -1 });
    this.root = showOverlay(this, `
      <section class="play-screen">
        <div class="hud-top">
          <div class="vitals glass"><span class="micro">MOUNTAIN CHICKEN</span><div class="vital-row"><span>Energy</span><span id="energy-value">100</span></div><div class="energy-track"><div id="energy-fill"></div></div></div>
          <div class="objective glass"><span class="micro" id="objective-step">01 / FIELD NOTES</span><strong id="objective-text">Inspect the clearing board</strong></div>
          <button class="icon-button glass" id="pause-button" aria-label="Pause game">Ⅱ</button>
        </div>
        <div class="location"><span class="location-line"></span><span id="location-name">THE STARTING CLEARING</span></div>
        <div class="interact-prompt" id="interact-prompt" hidden><kbd>E</kbd><span>Inspect field board</span></div>
        <div class="wayfinding" id="wayfinding">◆ Follow the gold marker</div>
        <div class="play-bottom"><span><kbd>W A S D</kbd> move &nbsp; <kbd>SPACE</kbd> hop &nbsp; <kbd>E</kbd> interact</span><span id="connection-label">PLAYABLE FOREST PREVIEW</span></div>
        <div id="modal-slot"></div>
      </section>`);
    this.root.querySelector('#pause-button')!.addEventListener('click', () => this.openPause());
    const updateConnection = () => {
      this.root.querySelector('#connection-label')!.textContent = session.role === 'host' ? session.connected ? `FOREST ${session.code} · ${session.controllerConnected ? 'CONTROLLER CONNECTED' : 'KEYBOARD READY · CONTROLLER OFFLINE'}` : 'CONNECTION LOST · LOCAL PLAY AVAILABLE' : 'PLAYABLE FOREST PREVIEW';
    };
    updateConnection();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, session.subscribe(updateConnection));
    this.publishState();
    this.cameras.main.fadeIn(650, 0, 0, 0);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']));
  }

  private localInput(): MovementInput {
    const down = (name: string) => this.keys[name].isDown ? 1 : 0;
    return {
      x: Math.max(down('D'), down('RIGHT')) - Math.max(down('A'), down('LEFT')),
      y: Math.max(down('S'), down('DOWN')) - Math.max(down('W'), down('UP')),
      hop: !!down('SPACE'), interact: !!down('E'),
    };
  }

  update(time: number, delta: number): void {
    if (!this.frog) return;
    const local = this.localInput(), remote = session.input();
    const input: MovementInput = { x: Phaser.Math.Clamp(local.x + remote.x, -1, 1), y: Phaser.Math.Clamp(local.y + remote.y, -1, 1), hop: local.hop || remote.hop, interact: local.interact || remote.interact };
    const pause = this.keys.ESC.isDown || remote.pause === true;
    if (pause && !this.previousPause) {
      if (this.frozen) this.closeModal(); else this.openPause();
    }
    this.previousPause = pause;
    if (this.frozen) {
      if (input.interact && !this.previousInteract && this.modalKind === 'card') this.closeModal();
      this.previousInteract = input.interact; return;
    }
    this.elapsed += Math.min(delta, 50);
    this.frog.update(time, Math.min(delta, 50), input);
    if (input.x !== 0 || input.y !== 0) this.energy = Math.max(15, this.energy - delta * .0005);
    for (const [i, insect] of this.insects.entries()) {
      if (!insect.alive) continue;
      insect.sprite.setPosition(insect.x + Math.sin(this.elapsed / 950 + i * 3) * 22, insect.y + Math.cos(this.elapsed / 1200 + i * 2) * 18).setDepth(insect.sprite.y);
    }
    const near = this.nearby();
    const prompt = this.root.querySelector<HTMLElement>('#interact-prompt')!;
    prompt.hidden = !near;
    if (near) prompt.querySelector('span')!.textContent = near.label;
    if (input.interact && !this.previousInteract && near) this.interact(near.kind, near.index);
    this.previousInteract = input.interact;
    this.root.querySelector('#energy-value')!.textContent = `${Math.round(this.energy)}`;
    this.root.querySelector<HTMLElement>('#energy-fill')!.style.width = `${this.energy}%`;
    this.root.querySelector('#location-name')!.textContent = this.frog.x > 1330 ? 'THE STREAM LOOKOUT' : this.frog.y < 630 ? 'THE FEEDING CLEARING' : 'THE STARTING CLEARING';
    const direction = Math.round(Math.atan2(this.target.y - this.frog.y, this.target.x - this.frog.x) / (Math.PI / 4));
    const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
    const guide = this.root.querySelector<HTMLElement>('#wayfinding')!;
    guide.hidden = this.stage === 3;
    guide.textContent = `${arrows[(direction + 8) % 8]} Follow the gold marker`;
  }

  private nearby(): { kind: string; label: string; index?: number } | null {
    const distance = (x: number, y: number) => Phaser.Math.Distance.Between(this.frog.x, this.frog.y, x, y);
    if (distance(LANDMARKS.board.x, LANDMARKS.board.y + 20) < 105) return { kind: 'board', label: 'Inspect field board' };
    if (distance(LANDMARKS.lookout.x, LANDMARKS.lookout.y + 20) < 110) return { kind: 'lookout', label: 'Inspect the stream lookout' };
    if (this.stage >= 1) {
      const index = this.insects.findIndex(insect => insect.alive && distance(insect.sprite.x, insect.sprite.y) < 76);
      if (index >= 0) return { kind: 'food', label: 'Catch insect', index };
    }
    return null;
  }

  private interact(kind: string, index?: number): void {
    if (kind === 'board') {
      this.openCard('FIELD NOTE 01', 'A world at frog height.', 'Follow the trail into the clearing. Move close to an insect and press E to catch it. Then cross the wooden bridge to the stream lookout.', 'This is a playable movement and environment preview. The researched species story will be added in a later update.', () => {
        if (this.stage === 0) { this.stage = 1; this.setObjective('02 / FIND FOOD', 'Catch 3 insects in the clearing', LANDMARKS.feeding); }
      });
    } else if (kind === 'food' && index !== undefined) {
      const insect = this.insects[index]; insect.alive = false;
      this.tweens.add({ targets: insect.sprite, scale: 0, alpha: 0, duration: 180, onComplete: () => insect.sprite.destroy() });
      this.energy = Math.min(100, this.energy + 20); this.eaten++;
      const puff = this.add.text(this.frog.x, this.frog.y - 65, '+ ENERGY', { fontFamily: 'Arial', fontSize: '16px', color: '#e0d79e' }).setOrigin(.5).setDepth(3200);
      this.tweens.add({ targets: puff, y: puff.y - 35, alpha: 0, duration: 850, onComplete: () => puff.destroy() });
      if (this.stage === 1) {
        if (this.eaten >= 3) { this.stage = 2; this.setObjective('03 / FOLLOW THE STREAM', 'Cross the bridge to the lookout', LANDMARKS.lookout); }
        else { this.root.querySelector('#objective-text')!.textContent = `Catch insects · ${this.eaten} / 3`; this.publishState(); }
      }
    } else if (kind === 'lookout') {
      if (this.stage < 2) this.openCard('THE STREAM LOOKOUT', 'There is more to discover.', 'Visit the field board in the starting clearing, then try catching insects before returning here.', 'Follow the gold marker to your current objective.');
      else this.openCard('FOREST PREVIEW COMPLETE', 'A little closer to the forest.', 'You explored the clearing, caught food, and followed the stream. Stay here to explore, or use the pause menu to begin again.', 'This preview demonstrates the play experience. The decline, conservation story, and six connections are still to come.', () => {
        this.stage = 3; this.target.setVisible(false); this.setObjective('FREE EXPLORATION', 'Explore the forest at your own pace');
      });
    }
  }

  private setObjective(step: string, title: string, target?: { x: number; y: number }): void {
    this.root.querySelector('#objective-step')!.textContent = step; this.root.querySelector('#objective-text')!.textContent = title;
    if (target) this.target.setPosition(target.x, target.y);
    this.publishState();
  }

  private freeze(): void {
    this.frozen = true; this.frog.stop(); this.physics.pause(); this.tweens.pauseAll();
    this.root.querySelector<HTMLElement>('#interact-prompt')!.hidden = true;
    this.root.querySelector<HTMLButtonElement>('#pause-button')!.disabled = true;
  }

  private closeModal(): void {
    const onContinue = this.onContinue; this.onContinue = undefined;
    this.root.querySelector('#modal-slot')!.replaceChildren();
    this.frozen = false; this.modalKind = null; this.physics.resume(); this.tweens.resumeAll(); onContinue?.();
    this.root.querySelector<HTMLButtonElement>('#pause-button')!.disabled = false;
    this.root.querySelector<HTMLButtonElement>('#pause-button')!.focus({ preventScroll: true });
    this.publishState();
  }

  private openCard(kicker: string, title: string, text: string, footnote: string, onContinue?: () => void): void {
    this.freeze(); this.onContinue = onContinue; this.modalKind = 'card';
    this.root.querySelector('#modal-slot')!.innerHTML = `<div class="modal-backdrop"><section class="field-card" role="dialog" aria-modal="true" aria-labelledby="card-title"><div class="micro">${kicker}</div><h2 id="card-title">${title}</h2><p>${text}</p><div class="field-divider"></div><p class="card-note">${footnote}</p><button id="continue-button">CONTINUE →</button></section></div>`;
    const button = this.root.querySelector<HTMLButtonElement>('#continue-button')!;
    button.addEventListener('click', () => this.closeModal()); button.focus();
    this.trapModalFocus(); this.publishState();
  }

  private openPause(): void {
    if (this.frozen) return;
    this.freeze(); this.onContinue = undefined; this.modalKind = 'pause';
    this.root.querySelector('#modal-slot')!.innerHTML = `<div class="modal-backdrop"><section class="field-card pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title"><div class="micro">TAKE A BREATH</div><h2 id="pause-title">Under the canopy.</h2><p>Your forest is paused.</p><div class="pause-actions"><button id="resume">RESUME →</button><button class="secondary" id="restart">RESTART FOREST</button><button class="text-button" id="title">RETURN TO TITLE</button></div></section></div>`;
    const resume = this.root.querySelector<HTMLButtonElement>('#resume')!;
    resume.addEventListener('click', () => this.closeModal()); resume.focus();
    this.root.querySelector('#restart')!.addEventListener('click', () => this.scene.restart());
    this.root.querySelector('#title')!.addEventListener('click', () => this.scene.start('MenuScene'));
    this.trapModalFocus(); this.publishState();
  }

  private publishState(): void {
    if (session.role === 'host') session.publish({ mode: this.modalKind === 'card' ? 'card' : this.frozen ? 'paused' : 'playing', objective: this.root.querySelector('#objective-text')?.textContent || 'Explore the forest' });
  }

  private trapModalFocus(): void {
    const backdrop = this.root.querySelector<HTMLElement>('.modal-backdrop')!;
    backdrop.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const buttons = [...backdrop.querySelectorAll<HTMLButtonElement>('button')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault(); buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length].focus();
    });
  }
}

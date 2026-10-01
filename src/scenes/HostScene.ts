import Phaser from 'phaser';
import { buildForest } from '../world/ForestWorld';
import { showOverlay } from '../ui/ScreenOverlay';
import { session } from '../systems/SessionClient';

export class HostScene extends Phaser.Scene {
  constructor() { super('HostScene'); }
  create(): void {
    buildForest(this, false); this.cameras.main.setScroll(410, 465);
    const root = showOverlay(this, `<section class="session-screen"><header class="session-header"><button class="text-button" id="back">← BACK</button><span class="micro">MAIN DEVICE</span></header><div class="lobby-panel"><div class="eyebrow">ONE FOREST · TWO SCREENS</div><h2>The forest starts here.</h2><p class="session-description">Keep this screen on your laptop or projector.<br>Connect a second device to control your frog.</p><div class="room-code" id="room-code" aria-label="Room code" aria-live="polite">··· ···</div><div class="session-status" id="session-status" role="status">Creating your forest…</div><div class="join-instructions"><span class="step-number">1</span><span>On your other device, open this game's address.</span><span class="step-number">2</span><span>Choose <strong>JOIN GAME</strong> and enter the code above.</span></div><div class="invite-address" id="invite-address"></div><div class="lobby-actions"><button id="start" disabled>START FOREST ↗</button><button class="secondary" id="copy" disabled>COPY CODE</button></div><div class="session-error" id="session-error" role="alert"></div><p class="session-note">One controller per forest. Both devices must reach the same hosting computer.</p></div></section>`);
    const update = () => {
      root.querySelector('#room-code')!.textContent = session.code ? `${session.code.slice(0, 3)} ${session.code.slice(3)}` : '··· ···';
      root.querySelector('#session-status')!.textContent = session.connected ? session.controllerConnected ? '● Controller connected · Ready to play' : '○ Waiting for a controller' : '○ Not connected';
      root.querySelector('#session-status')!.classList.toggle('is-connected', session.controllerConnected);
      root.querySelector('#session-error')!.textContent = session.error;
      root.querySelector<HTMLButtonElement>('#start')!.disabled = !session.connected;
      root.querySelector<HTMLButtonElement>('#copy')!.disabled = !session.connected;
    };
    const unsubscribe = session.subscribe(update);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    root.querySelector('#back')!.addEventListener('click', () => { session.disconnect(); this.scene.start('MenuScene'); });
    root.querySelector('#start')!.addEventListener('click', () => { session.publish({ mode: 'playing', objective: 'Inspect the clearing board' }); this.scene.start('ForestScene'); });
    root.querySelector('#copy')!.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(session.code); root.querySelector('#copy')!.textContent = 'COPIED ✓'; }
      catch { root.querySelector('#session-error')!.textContent = 'Select the displayed code and copy it manually.'; }
    });
    const invite = root.querySelector('#invite-address')!;
    invite.textContent = ['localhost', '127.0.0.1'].includes(location.hostname) ? 'Use the same-network address printed by npm run host on your second device.' : `${location.origin}${location.pathname}#join`;
    void session.connect('host').then(update).catch(update);
  }
}

import Phaser from 'phaser';
import { buildLevel, PALETTES, scatter } from '../world/Terrain';
import { AmbientFrogs } from '../entities/Critters';
import { showOverlay } from '../ui/ScreenOverlay';
import { classHost } from '../systems/ClassHost';
import { sound } from '../systems/Sound';
import { settings, saveSettings } from '../systems/Settings';
import { run } from '../systems/run';
import { go, startCurrent } from '../systems/flow';
import { CHAPTERS } from '../data/chapters';
import { artUrl } from '../world/Art';
import { qrSvg } from '../ui/effects';
import { esc, $ } from '../ui/html';

const CHAPTER_ICON: Record<string, string> = { frog: 'icon-frog', cricket: 'cricket', flashlight: 'hunter', pool: 'pool', link: 'icon-ship' };

/** The projector's "main screen": PIN, QR code, players popping in, the expedition overview, START. */
export class LobbyScene extends Phaser.Scene {
  private frogs?: AmbientFrogs;
  private root!: HTMLElement;
  private known = new Set<string>();
  constructor() { super('LobbyScene'); }

  create(): void {
    this.known = new Set(classHost.players.keys());
    buildLevel(this, {
      key: 'terrain-title', width: 480, height: 280, palette: PALETTES.day,
      paths: [[[0, 170], [120, 150], [225, 150], [330, 120], [480, 110]]], clearings: [[225, 148, 50, 26]],
      rivers: [{ points: [[380, 0], [372, 80], [392, 160], [380, 280]], width: 14 }],
    }, scatter(['tree', 'bush', 'palm', 'fern'], 40, [0, 0, 1900, 1100], [], 41), false);
    this.frogs = new AmbientFrogs(this, [[700, 500], [900, 620], [1100, 520], [500, 640], [1300, 640]], 1.1);
    this.cameras.main.setBounds(0, 0, 1920, 1120).setScroll(300, 200);
    this.tweens.add({ targets: this.cameras.main, scrollX: 380, duration: 20000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sound.music('lobby');

    this.root = showOverlay(this, `<section class="lobby-screen">
      <header class="lobby-banner" id="lobby-banner"></header>
      <div class="lobby-main">
        <div class="lobby-hero">
          <img class="pixel lobby-frog" src="${artUrl('portrait', 3)}" alt="">
          <div><h1 class="lobby-title">MOUNTAIN CHICKEN</h1><p>Survive as a giant frog. Discover why it is disappearing. Then test the whole class!</p></div>
        </div>
        <ol class="expedition" aria-label="Expedition overview">
          ${CHAPTERS.map(chapter => `<li><span class="exp-icon"><img class="pixel" src="${artUrl(CHAPTER_ICON[chapter.icon], chapter.icon === 'pool' ? 2 : chapter.icon === 'flashlight' ? 2 : 3)}" alt=""></span><b>${chapter.number}. ${esc(chapter.title)}</b><small>${esc(chapter.tagline)}</small></li>`).join('')}
          <li class="exp-finale"><span class="exp-icon">🏆</span><b>Podium</b><small>Field Journal 10/10</small></li>
        </ol>
      </div>
      <footer class="lobby-footer">
        <div class="player-count"><b id="player-count">0</b><span>players</span></div>
        <div class="player-tiles" id="player-tiles" aria-live="polite"></div>
        <div class="lobby-controls">
          <div class="toggles compact">
            <button class="toggle ${settings.sound ? 'is-on' : ''}" data-setting="sound">Sound<span>${settings.sound ? 'ON' : 'OFF'}</span></button>
            <button class="toggle ${settings.jumpscares ? 'is-on' : ''}" data-setting="jumpscares">Jump-scares<span>${settings.jumpscares ? 'ON' : 'OFF'}</span></button>
            <button class="toggle ${settings.quizzes ? 'is-on' : ''}" data-setting="quizzes">Quizzes<span>${settings.quizzes ? 'ON' : 'OFF'}</span></button>
          </div>
          <div class="lobby-buttons"><button class="text-button" id="back">← Title</button><button class="start-button" id="start">START ▸</button></div>
        </div>
      </footer>
      <div id="tile-menu-slot"></div>
    </section>`);
    $(this.root, '#start').addEventListener('click', () => this.start());
    $(this.root, '#back').addEventListener('click', () => go(this, 'MenuScene'));
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-setting]')) {
      button.addEventListener('click', () => {
        const key = button.dataset.setting as 'sound' | 'jumpscares' | 'quizzes';
        settings[key] = !settings[key]; saveSettings(); sound.applySettings(); sound.play('click');
        button.classList.toggle('is-on', settings[key]); button.querySelector('span')!.textContent = settings[key] ? 'ON' : 'OFF';
      });
    }
    const off = classHost.subscribe(() => this.render());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
    this.input.keyboard!.addKey('ENTER').on('down', () => { if (document.activeElement === document.body || !document.activeElement) this.start(); });
    this.render();
    void classHost.open().then(() => this.render());
    $(this.root, '#start').focus({ preventScroll: true });
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  private render(): void {
    const banner = $(this.root, '#lobby-banner');
    if (classHost.connected) {
      const pin = `${classHost.code.slice(0, 3)} ${classHost.code.slice(3)}`;
      const link = classHost.joinLink;
      banner.className = 'lobby-banner is-live';
      banner.innerHTML = `<div class="join-at"><span>Join on your phone at</span><b>${esc(classHost.joinAddress || 'this game\'s network address')}</b><small>${classHost.joinAddress ? 'Same Wi-Fi as this computer' : 'Start with npm run host to show the address'}</small></div>
        <div class="game-pin"><span>Game PIN:</span><b>${pin}</b></div>
        ${link ? `<div class="qr" aria-label="QR code to join">${qrSvg(link)}</div>` : ''}`;
    } else {
      banner.className = 'lobby-banner is-offline';
      banner.innerHTML = classHost.available === null
        ? `<div class="join-at"><span>Setting up class mode…</span></div>`
        : `<div class="join-at"><span>Presenter mode</span><b>The class answers quizzes out loud</b><small>To let phones join with a PIN, start the game with <code>npm run host</code> and open the address it prints.</small></div><button class="secondary small" id="retry">Retry</button>`;
      banner.querySelector('#retry')?.addEventListener('click', () => { classHost.available = null; this.render(); void classHost.open().then(() => this.render()); });
    }
    const players = [...classHost.players.values()];
    $(this.root, '#player-count').textContent = String(players.filter(player => player.online).length);
    const tiles = $(this.root, '#player-tiles');
    tiles.innerHTML = players.length
      ? players.map(player => `<button class="player-tile ${player.online ? '' : 'is-away'} ${classHost.pilot === player.id ? 'is-pilot' : ''} ${this.known.has(player.id) ? '' : 'is-new'}" data-id="${esc(player.id)}">${classHost.pilot === player.id ? '<i>🎮</i>' : ''}${esc(player.name)}</button>`).join('')
      : `<p class="waiting">${classHost.connected ? 'Waiting for players…' : 'No phones needed — just press START.'}</p>`;
    for (const player of players) if (!this.known.has(player.id)) { this.known.add(player.id); sound.play('join'); }
    for (const tile of tiles.querySelectorAll<HTMLButtonElement>('.player-tile')) tile.addEventListener('click', () => this.tileMenu(tile.dataset.id!));
  }

  private tileMenu(id: string): void {
    const player = classHost.players.get(id);
    if (!player) return;
    const slot = $(this.root, '#tile-menu-slot');
    const pilot = classHost.pilot === id;
    slot.innerHTML = `<div class="modal-backdrop"><section class="field-card tile-menu" role="dialog" aria-modal="true" aria-label="Player options">
      <h2>${esc(player.name)}</h2>
      <p>The <b>pilot</b> drives the frog from their phone. Everyone else answers quizzes and sends reactions.</p>
      <div class="pause-actions"><button id="pilot">${pilot ? 'Stop piloting' : '🎮 Make frog pilot'}</button><button class="secondary" id="kick">Remove player</button><button class="text-button" id="cancel">Cancel</button></div>
    </section></div>`;
    const close = () => slot.replaceChildren();
    $(slot, '#pilot').addEventListener('click', () => { classHost.setPilot(pilot ? null : id); close(); });
    $(slot, '#kick').addEventListener('click', () => { classHost.kick(id); close(); });
    $(slot, '#cancel').addEventListener('click', close);
    $(slot, '#pilot').focus();
  }

  private start(): void {
    sound.play('click');
    run.reset(settings.quizzes);
    classHost.resetScores();
    startCurrent(this, 400);
  }

  update(_time: number, delta: number): void { this.frogs?.update(delta); }
}

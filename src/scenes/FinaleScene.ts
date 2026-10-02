import Phaser from 'phaser';
import { buildLevel, PALETTES, scatter } from '../world/Terrain';
import { AmbientFrogs } from '../entities/Critters';
import { showOverlay } from '../ui/ScreenOverlay';
import { showCards, type CardDeck } from '../ui/cards';
import { JOURNAL, SPECIES } from '../data/journal';
import { SOURCES } from '../data/sources';
import { classHost } from '../systems/ClassHost';
import { sound } from '../systems/Sound';
import { go } from '../systems/flow';
import { TEAMS, winner } from '../systems/match';
import type { MatchResult } from './PondScene';
import { artUrl } from '../world/Art';
import { esc, $ } from '../ui/html';

/**
 * The ending, in three steps: the winning team and the top three frogs; "The real story" (the ten
 * fact cards, one for each rubric item); and a thank-you screen with sources for questions.
 */
export class FinaleScene extends Phaser.Scene {
  private frogs?: AmbientFrogs;
  private root!: HTMLElement;
  private result: MatchResult = { totals: [0, 0], ranks: [] };
  private step: 'results' | 'story' | 'end' = 'results';
  private deck?: CardDeck;
  constructor() { super('FinaleScene'); }

  create(data: { result?: MatchResult }): void {
    this.result = data.result ?? { totals: [0, 0], ranks: [] };
    this.step = 'results'; this.deck = undefined;
    buildLevel(this, {
      key: 'terrain-title', width: 480, height: 280, palette: PALETTES.day,
      paths: [[[0, 170], [120, 150], [225, 150], [330, 120], [480, 110]]], clearings: [[225, 148, 50, 26]],
      rivers: [{ points: [[380, 0], [372, 80], [392, 160], [380, 280]], width: 14 }],
    }, scatter(['tree', 'bush', 'palm', 'fern'], 40, [0, 0, 1900, 1100], [[900, 600, 300]], 41), false);
    this.frogs = new AmbientFrogs(this, [[700, 560], [860, 640], [1000, 560], [1140, 640], [780, 720], [1060, 720], [920, 500]], 1.15);
    this.add.particles(0, 0, 'firefly', { x: { min: 300, max: 1600 }, y: { min: 300, max: 1000 }, lifespan: 4000, speed: { min: 5, max: 20 }, scale: { start: 2.5, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 120, blendMode: 'ADD' }).setDepth(4001);
    this.cameras.main.setBounds(0, 0, 1920, 1120).setScroll(290, 250);
    sound.music('finale');

    this.root = showOverlay(this, `<section class="finale-screen">
      <div class="finale-main" id="results">
        <div class="podium-area" id="podium"></div>
        <footer class="finale-foot"><button class="start-button" id="story">THE REAL STORY ▸</button><button class="secondary" id="again">Play again</button></footer>
      </div>
      <div class="finale-end" id="end" hidden>
        <img class="pixel end-frog" src="${artUrl('portrait', 5)}" alt="">
        <h2>THANK YOU!</h2>
        <p>Save the ${esc(SPECIES.commonName.toLowerCase())}: never release pet frogs outdoors, and clean muddy boots before exploring new wild places.</p>
        <div class="mini-journal">${JOURNAL.map(card => `<button class="mini-entry" data-key="${card.key}"><span>${card.number}</span>${esc(card.rubric)}</button>`).join('')}</div>
        <footer class="finale-foot"><button class="secondary" id="sources">Sources</button><button id="again-2">Play again ▸</button><button class="text-button" id="title">Title screen</button></footer>
      </div>
      <div id="modal-slot"></div>
    </section>`);
    this.renderPodium();
    $(this.root, '#story').addEventListener('click', () => this.story());
    $(this.root, '#again').addEventListener('click', () => go(this, 'PondScene'));
    $(this.root, '#again-2').addEventListener('click', () => go(this, 'PondScene'));
    $(this.root, '#title').addEventListener('click', () => go(this, 'MenuScene'));
    $(this.root, '#sources').addEventListener('click', () => this.sources());
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('.mini-entry')) {
      button.addEventListener('click', () => {
        this.deck = showCards($(this.root, '#modal-slot'), [JOURNAL.find(card => card.key === button.dataset.key)!], { closable: true, onDone: () => button.focus() });
      });
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || this.deck?.open || event.key !== 'Enter' || this.step !== 'results') return;
      event.preventDefault(); this.story();
    };
    window.addEventListener('keydown', onKey, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { window.removeEventListener('keydown', onKey, true); this.deck?.close(); });
    $(this.root, '#story').focus({ preventScroll: true });
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  private renderPodium(): void {
    const podium = $(this.root, '#podium');
    const { totals, ranks } = this.result;
    const won = winner(totals);
    const teams = `<div class="final-teams">${[0, 1].map(team => `<div class="rt team-${team} ${won === team ? 'is-winner' : ''}"><span>${TEAMS[team].name}</span><b>${totals[team]}</b></div>`).join('<i>vs</i>')}</div>`;
    const headline = `<h2 class="final-headline">${won === -1 ? 'IT\'S A DRAW!' : `${esc(TEAMS[won].name.toUpperCase())} WINS!`}</h2>`;
    const places = [ranks[1], ranks[0], ranks[2]];
    const blocks = ranks.length ? `<div class="podium">${places.map((rank, column) => {
      const place = [2, 1, 3][column];
      return rank ? `<div class="podium-col place-${place}" style="--delay:${[1.4, 2.8, 0][column]}s"><div class="podium-player"><img class="pixel" src="${artUrl('frog-down-0', 5)}" alt=""><b style="color:${TEAMS[rank.team].light}">${esc(rank.name)}</b><span>${rank.score} pts</span></div><div class="podium-block"><span>${place}</span></div></div>` : `<div class="podium-col place-${place} empty"></div>`;
    }).join('')}</div>` : `<div class="solo-win"><img class="pixel" src="${artUrl('portrait', 4)}" alt=""></div>`;
    podium.innerHTML = `${headline}${teams}${blocks}<div class="confetti" aria-hidden="true">${Array.from({ length: 40 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * .35}s;--c:${['#c94b3c', '#3f6fb5', '#d9a02a', '#4f8f3a', '#fff0b4'][i % 5]}"></i>`).join('')}</div>`;
    sound.play('tick');
    this.time.delayedCall(1400, () => sound.play('catch', 2));
    this.time.delayedCall(2800, () => sound.play('victory'));
  }

  /** The ten fact cards, back to back. */
  private story(): void {
    if (this.step !== 'results') return;
    this.step = 'story';
    sound.play('click');
    classHost.publish({ mode: 'learn', title: 'The real story' });
    $(this.root, '#results').hidden = true;
    this.deck = showCards($(this.root, '#modal-slot'), JOURNAL, { onDone: () => this.end() });
  }

  private end(): void {
    this.step = 'end';
    this.deck = undefined;
    classHost.publish({ mode: 'final', winner: winner(this.result.totals) });
    $(this.root, '#end').hidden = false;
    sound.play('whoop');
    $(this.root, '#again-2').focus({ preventScroll: true });
  }

  private sources(): void {
    const slot = $(this.root, '#modal-slot');
    slot.innerHTML = `<div class="modal-backdrop"><section class="field-card sources-card" role="dialog" aria-modal="true" aria-labelledby="sources-title">
      <h2 id="sources-title">Sources &amp; credits</h2>
      <ol class="source-list">${SOURCES.map(source => `<li><b>${esc(source.title)}</b> — ${esc(source.publisher)}<br><a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.url)}</a></li>`).join('')}</ol>
      <p class="card-note">All art and sound are original and generated in code. Fonts: Press Start 2P (CodeMan38) and Pixelify Sans, SIL Open Font License. Points in the game are just for fun; real numbers are on the fact cards.</p>
      <button id="close-sources">Close</button>
    </section></div>`;
    $(slot, '#close-sources').addEventListener('click', () => slot.replaceChildren());
    $(slot, '#close-sources').focus();
  }

  update(_time: number, delta: number): void { this.frogs?.update(delta); }
}

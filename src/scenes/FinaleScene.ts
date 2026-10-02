import Phaser from 'phaser';
import { buildLevel, PALETTES, scatter } from '../world/Terrain';
import { AmbientFrogs } from '../entities/Critters';
import { showOverlay } from '../ui/ScreenOverlay';
import { showCards } from '../ui/cards';
import { JOURNAL, SPECIES } from '../data/journal';
import { SOURCES } from '../data/sources';
import { sound } from '../systems/Sound';
import { go } from '../systems/flow';
import { TEAMS, winner } from '../systems/match';
import type { MatchResult } from './PondScene';
import { artUrl } from '../world/Art';
import { esc, $ } from '../ui/html';

/** The ending: a closing message, the winning team and top frogs, and the completed Field Journal. */
export class FinaleScene extends Phaser.Scene {
  private frogs?: AmbientFrogs;
  private root!: HTMLElement;
  private result: MatchResult = { totals: [0, 0], ranks: [] };
  constructor() { super('FinaleScene'); }

  create(data: { result?: MatchResult }): void {
    this.result = data.result ?? { totals: [0, 0], ranks: [] };
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
      <div class="finale-quote" id="quote"><p>The future of a species can depend on what happens next.</p></div>
      <div class="finale-main" id="finale-main" hidden>
        <header class="finale-title"><h2>${esc(SPECIES.commonName.toUpperCase())}</h2><p><i>${esc(SPECIES.scientificName)}</i> · ${esc(SPECIES.status)}</p></header>
        <div class="finale-body">
          <div class="podium-area" id="podium"></div>
          <div class="finale-journal">
            <div class="micro">FIELD JOURNAL COMPLETE · 10/10 RUBRIC ENTRIES</div>
            <div class="mini-journal">${JOURNAL.map(card => `<button class="mini-entry" data-key="${card.key}"><span>${card.number}</span>${esc(card.rubric.split(' (')[0])}</button>`).join('')}</div>
            <p class="finale-message">Disease, hunting, lost forest, invasive animals and storms pushed this frog to the edge. People are fighting back — and every choice we make is connected.</p>
          </div>
        </div>
        <footer class="finale-foot"><button class="secondary" id="sources">Sources &amp; credits</button><button id="again">Play again ▸</button><button class="text-button" id="title">Title screen</button></footer>
      </div>
      <div id="modal-slot"></div>
    </section>`);
    this.time.delayedCall(3400, () => this.reveal());
    $(this.root, '#quote').addEventListener('click', () => this.reveal());
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  private revealed = false;
  private reveal(): void {
    if (this.revealed) return;
    this.revealed = true;
    $(this.root, '#quote').hidden = true;
    $(this.root, '#finale-main').hidden = false;
    this.renderPodium();
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('.mini-entry')) {
      button.addEventListener('click', () => {
        const holder = $(this.root, '#modal-slot');
        showCards(holder, [JOURNAL.find(card => card.key === button.dataset.key)!], { closable: true, onDone: () => button.focus() });
      });
    }
    $(this.root, '#sources').addEventListener('click', () => this.sources());
    $(this.root, '#again').addEventListener('click', () => go(this, 'PondScene'));
    $(this.root, '#title').addEventListener('click', () => go(this, 'MenuScene'));
    $(this.root, '#again').focus({ preventScroll: true });
  }

  private renderPodium(): void {
    const podium = $(this.root, '#podium');
    const { totals, ranks } = this.result;
    const won = winner(totals);
    const teams = `<div class="final-teams">${[0, 1].map(team => `<div class="rt team-${team} ${won === team ? 'is-winner' : ''}"><span>${TEAMS[team].name}</span><b>${totals[team]}</b></div>`).join('<i>vs</i>')}</div>`;
    const headline = `<h3 class="final-headline">${won === -1 ? 'A perfect draw!' : `${esc(TEAMS[won].name)} wins!`}</h3>`;
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

  private sources(): void {
    const slot = $(this.root, '#modal-slot');
    slot.innerHTML = `<div class="modal-backdrop"><section class="field-card sources-card" role="dialog" aria-modal="true" aria-labelledby="sources-title">
      <h2 id="sources-title">Sources &amp; credits</h2>
      <ol class="source-list">${SOURCES.map(source => `<li><b>${esc(source.title)}</b> — ${esc(source.publisher)}<br><a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.url)}</a></li>`).join('')}</ol>
      <p class="card-note">All art and sound are original and generated in code. Fonts: Press Start 2P (CodeMan38) and Pixelify Sans, SIL Open Font License. Population numbers in the game are a simulation; real figures appear on the journal cards.</p>
      <button id="close-sources">Close</button>
    </section></div>`;
    $(slot, '#close-sources').addEventListener('click', () => slot.replaceChildren());
    $(slot, '#close-sources').focus();
  }

  update(_time: number, delta: number): void { this.frogs?.update(delta); }

  init(): void { this.revealed = false; }
}

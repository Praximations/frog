import Phaser from 'phaser';
import { showOverlay } from '../ui/ScreenOverlay';
import { CHAPTERS, chapterByNumber } from '../data/chapters';
import { classHost } from '../systems/ClassHost';
import { sound } from '../systems/Sound';
import { run } from '../systems/run';
import { continueFromOverview } from '../systems/flow';
import { artUrl } from '../world/Art';
import { showJournal } from '../ui/cards';
import { esc, $ } from '../ui/html';

const ICON: Record<string, [string, number]> = { frog: ['icon-frog', 4], cricket: ['cricket', 4], flashlight: ['hunter', 2], pool: ['pool', 1.6], link: ['icon-ship', 4] };

/** Between chapters: the expedition map (where we are), journal progress, frogs alive and the class leaderboard. */
export class OverviewScene extends Phaser.Scene {
  private root!: HTMLElement;
  constructor() { super('OverviewScene'); }

  create(): void {
    this.leaving = false;
    const done = run.current.kind === 'finale' ? 5 : run.current.chapter;
    const nextStep = run.steps[run.step + 1];
    const nextTitle = !nextStep ? 'Finale' : nextStep.kind === 'chapter' ? `Chapter ${nextStep.chapter}: ${chapterByNumber(nextStep.chapter).title}` : nextStep.kind === 'quiz' ? `Quiz ${nextStep.chapter}` : 'Final results';
    this.cameras.main.setBackgroundColor('#16302a');
    sound.music('lobby');
    classHost.publish({ mode: 'overview', next: nextTitle });
    const ranks = classHost.ranked().slice(0, 5);
    this.root = showOverlay(this, `<section class="overview-screen">
      <header><span class="micro">EXPEDITION MAP</span><h2>Chapter ${done} complete!</h2></header>
      <ol class="trail-map">${CHAPTERS.map(chapter => {
        const state = chapter.number <= done ? 'done' : chapter.number === done + 1 ? 'next' : '';
        const [key, scale] = ICON[chapter.icon];
        return `<li class="${state}" style="--i:${chapter.number}"><span class="tm-node"><img class="pixel" src="${artUrl(key, Math.round(scale))}" alt="">${state === 'done' ? '<i class="tm-check">✓</i>' : ''}</span><b>${chapter.number}. ${esc(chapter.title)}</b><small>${esc(chapter.tagline)}</small></li>`;
      }).join('')}<li class="${done >= 5 ? 'next' : ''}"><span class="tm-node">🏆</span><b>Podium</b><small>Final scores</small></li></ol>
      <div class="overview-stats">
        <button class="stat glass" id="open-journal"><span class="micro">FIELD JOURNAL</span><b>${run.journal.size}<small>/10</small></b><span>rubric entries · click to review</span></button>
        <div class="stat glass"><span class="micro">FROGS ALIVE</span><b class="${run.population < 20 ? 'low' : ''}">${run.population}</b><span>game simulation</span></div>
        ${classHost.hasClass ? `<div class="stat glass leaders"><span class="micro">TOP PLAYERS</span><ol>${ranks.map(rank => `<li><span>${rank.rank}</span>${esc(rank.name)}<b>${rank.score}</b></li>`).join('')}</ol></div>` : ''}
      </div>
      <footer><span>Next: <b>${esc(nextTitle)}</b></span><button id="next">Continue ▸</button></footer>
      <div id="modal-slot"></div>
    </section>`);
    $(this.root, '#next').addEventListener('click', () => this.next());
    $(this.root, '#open-journal').addEventListener('click', () => showJournal($(this.root, '#modal-slot'), run.journal, () => $(this.root, '#next').focus()));
    const key = (event: KeyboardEvent) => { if ((event.key === 'Enter' || event.key === ' ') && !this.root.querySelector('.modal-backdrop') && document.activeElement?.id !== 'open-journal') { event.preventDefault(); this.next(); } };
    window.addEventListener('keydown', key);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', key));
    $(this.root, '#next').focus({ preventScroll: true });
    sound.play('stamp');
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private leaving = false;
  private next(): void {
    if (this.leaving) return;
    this.leaving = true;
    sound.play('click');
    continueFromOverview(this);
    this.time.delayedCall(800, () => { this.leaving = false; });
  }
}

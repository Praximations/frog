import Phaser from 'phaser';
import { showOverlay } from '../ui/ScreenOverlay';
import { SHAPES } from '../ui/shapes';
import { questionFor, QUESTIONS, type Question } from '../data/quiz';
import { chapterByNumber } from '../data/chapters';
import { classHost, type QuizResult } from '../systems/ClassHost';
import { sound } from '../systems/Sound';
import { run } from '../systems/run';
import { go } from '../systems/flow';
import { esc, $ } from '../ui/html';
import { artUrl } from '../world/Art';

const ART: Record<number, [string, number]> = { 1: ['portrait', 4], 2: ['cricket', 14], 3: ['icon-fungus', 11], 4: ['pool', 5], 5: ['icon-ship', 11] };

const COLORS = ['red', 'blue', 'yellow', 'green'];

/** Kahoot-style checkpoint question after each chapter. */
export class QuizScene extends Phaser.Scene {
  private root!: HTMLElement;
  private question!: Question;
  private round = 0;
  private phase: 'ready' | 'answer' | 'reveal' | 'scores' | 'leaving' = 'ready';
  private endsAt = 0;
  private lastTick = 0;
  private result?: QuizResult;
  private presenterChoice: number | null = null;
  private keyHandler?: (event: KeyboardEvent) => void;

  constructor() { super('QuizScene'); }

  create(): void {
    const step = run.current;
    const chapter = step.kind === 'finale' ? 5 : step.chapter;
    this.question = questionFor(chapter) ?? QUESTIONS[0];
    this.round = QUESTIONS.indexOf(this.question) + 1 + run.step * 10;
    this.phase = 'ready'; this.result = undefined; this.presenterChoice = null; this.lastTick = 0;
    this.cameras.main.setBackgroundColor('#16302a');
    sound.music('quiz');
    this.root = showOverlay(this, `<section class="quiz-screen">
      <header class="quiz-top"><span class="quiz-badge">QUIZ ${QUESTIONS.indexOf(this.question) + 1} / ${QUESTIONS.length}</span><span class="quiz-chapter">After chapter ${chapter}: ${esc(chapterByNumber(chapter).title)}</span><span class="quiz-mode">${classHost.hasClass ? `📱 ${classHost.onlineCount} players` : '🗣️ Class answers out loud'}</span></header>
      <h2 class="quiz-question">${esc(this.question.question)}</h2>
      <div class="quiz-middle" id="quiz-middle"></div>
      <div class="quiz-answers" id="quiz-answers">${this.question.options.map((option, i) => `<button class="answer answer-${COLORS[i]}" data-choice="${i}" disabled><span class="shape">${SHAPES[i]}</span><span class="answer-text">${esc(option)}</span><kbd>${i + 1}</kbd></button>`).join('')}</div>
      <footer class="quiz-foot" id="quiz-foot"></footer>
    </section>`);
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-choice]')) button.addEventListener('click', () => this.presenterAnswer(Number(button.dataset.choice)));
    this.keyHandler = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (['1', '2', '3', '4'].includes(event.key)) this.presenterAnswer(Number(event.key) - 1);
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.advance(); }
    };
    window.addEventListener('keydown', this.keyHandler);
    const offClass = classHost.subscribe(() => this.updateCount());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { window.removeEventListener('keydown', this.keyHandler!); offClass(); });
    this.showReady();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private showReady(): void {
    $(this.root, '#quiz-middle').innerHTML = `<div class="ready-bar"><i></i></div>`;
    $(this.root, '#quiz-foot').innerHTML = `<span>Get ready…</span>`;
    this.time.delayedCall(2600, () => this.startAnswering());
  }

  private startAnswering(): void {
    if (this.phase !== 'ready') return;
    this.phase = 'answer';
    const limit = this.question.seconds * 1000;
    this.endsAt = this.time.now + limit;
    const live = classHost.hasClass;
    if (live) classHost.startQuiz(this.round, limit, this.question.correct);
    classHost.publish({ mode: 'quiz', round: this.round, question: this.question.question, options: this.question.options, remaining: limit });
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-choice]')) { button.disabled = live; button.classList.add('is-live'); }
    $(this.root, '#quiz-middle').innerHTML = `<div class="timer" id="timer"><b id="seconds">${this.question.seconds}</b></div><div class="quiz-art"><img class="pixel" src="${artUrl(...(ART[this.question.chapter] ?? ART[1]))}" alt=""></div><div class="answer-count"><b id="answer-count">0</b><span>${live ? 'answers' : 'shout it out!'}</span></div>`;
    $(this.root, '#quiz-foot').innerHTML = live ? `<button class="secondary small" id="skip">Reveal now ▸</button>` : `<span>Presenter: click the class's answer (or press 1–4)</span>`;
    this.root.querySelector('#skip')?.addEventListener('click', () => this.reveal());
    this.updateCount();
  }

  private updateCount(): void {
    if (this.phase !== 'answer') return;
    const count = this.root.querySelector('#answer-count');
    if (count) count.textContent = String(classHost.answerCount);
    if (classHost.hasClass && classHost.onlineCount > 0 && classHost.answerCount >= classHost.onlineCount) this.time.delayedCall(400, () => this.reveal());
  }

  update(time: number): void {
    if (this.phase !== 'answer') return;
    const left = Math.max(0, this.endsAt - time);
    const seconds = Math.ceil(left / 1000);
    const label = this.root.querySelector('#seconds');
    if (label && label.textContent !== String(seconds)) {
      label.textContent = String(seconds);
      $(this.root, '#timer').style.setProperty('--p', String(left / (this.question.seconds * 1000)));
      if (seconds <= 5 && seconds !== this.lastTick) { this.lastTick = seconds; sound.play('tick', 1); }
    }
    if (left <= 0) this.reveal();
  }

  private presenterAnswer(choice: number): void {
    if (this.phase !== 'answer' || classHost.hasClass) return;
    this.presenterChoice = choice;
    this.reveal();
  }

  private reveal(): void {
    if (this.phase !== 'answer') return;
    this.phase = 'reveal';
    sound.music(null);
    const live = classHost.hasClass;
    this.result = live ? classHost.finishQuiz() : undefined;
    classHost.publish({ mode: 'reveal', round: this.round, correct: this.question.correct, options: this.question.options });
    const correct = this.question.correct;
    const counts = this.result?.counts ?? [0, 0, 0, 0];
    const max = Math.max(1, ...counts);
    const presenterRight = this.presenterChoice === correct;
    sound.play(live ? 'correct' : presenterRight ? 'correct' : 'wrong');
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-choice]')) {
      const i = Number(button.dataset.choice);
      button.disabled = true; button.classList.remove('is-live');
      button.classList.add(i === correct ? 'is-correct' : 'is-wrong');
      if (i === this.presenterChoice) button.classList.add('is-picked');
    }
    $(this.root, '#quiz-middle').innerHTML = live
      ? `<div class="answer-bars">${counts.map((count, i) => `<div class="abar abar-${COLORS[i]} ${i === correct ? 'is-correct' : ''}"><b>${count}</b><i style="--h:${(count / max) * 100}%"></i><span class="shape">${SHAPES[i]}</span>${i === correct ? '<em>✓</em>' : ''}</div>`).join('')}</div><p class="explain">${esc(this.question.explain)}</p>`
      : `<div class="presenter-verdict ${presenterRight ? 'is-right' : 'is-wrong'}"><b>${presenterRight ? 'CORRECT!' : this.presenterChoice === null ? 'TIME!' : 'NOT QUITE!'}</b></div><p class="explain">${esc(this.question.explain)}</p>`;
    $(this.root, '#quiz-foot').innerHTML = `<button id="next">${live ? 'Scoreboard ▸' : 'Next ▸'}</button>`;
    $(this.root, '#next').addEventListener('click', () => this.advance());
    $(this.root, '#next').focus({ preventScroll: true });
  }

  private showScores(): void {
    this.phase = 'scores';
    sound.music('lobby');
    const ranks = classHost.ranked().slice(0, 5);
    const top = Math.max(1, ...ranks.map(rank => rank.score));
    const gains = this.result?.gains ?? new Map<string, number>();
    const streaks = new Map([...classHost.players.values()].map(player => [player.id, player.streak]));
    $(this.root, '.quiz-question').textContent = 'Scoreboard';
    $(this.root, '#quiz-answers').innerHTML = '';
    $(this.root, '#quiz-middle').innerHTML = `<ol class="scoreboard">${ranks.map((rank, i) => `<li style="--i:${i}"><span class="sb-rank">${rank.rank}</span><span class="sb-name">${esc(rank.name)}${(streaks.get(rank.id) ?? 0) >= 2 ? ` <i class="streak">🔥${streaks.get(rank.id)}</i>` : ''}</span><span class="sb-bar"><i style="--w:${(rank.score / top) * 100}%"></i></span><b class="sb-score">${rank.score}</b>${gains.get(rank.id) ? `<small>+${gains.get(rank.id)}</small>` : ''}</li>`).join('') || '<li class="empty">No answers yet</li>'}</ol>`;
    $(this.root, '#quiz-foot').innerHTML = `<button id="next">Continue ▸</button>`;
    $(this.root, '#next').addEventListener('click', () => this.advance());
    $(this.root, '#next').focus({ preventScroll: true });
  }

  private advance(): void {
    if (this.phase === 'ready') { this.startAnswering(); return; }
    if (this.phase === 'answer') { if (classHost.hasClass) this.reveal(); return; }
    if (this.phase === 'reveal' && classHost.hasClass) { this.showScores(); return; }
    if (this.phase === 'reveal' || this.phase === 'scores') {
      this.phase = 'leaving';
      go(this, 'OverviewScene', {}, 300);
    }
  }
}

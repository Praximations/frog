import { buildSteps, chapterByNumber, type Step } from '../data/chapters.ts';
import { RUBRIC_KEYS, type RubricKey } from '../data/journal.ts';

/**
 * Progress through one presentation. Pure data (no Phaser) so it can be unit tested.
 * Population is a GAME SIMULATION value; real counts are only quoted on journal cards.
 */
export class Run {
  steps: Step[] = buildSteps(true);
  step = 0;
  journal = new Set<RubricKey>();
  population = 100;
  quizzes = true;

  reset(quizzes = this.quizzes): void {
    this.quizzes = quizzes;
    this.steps = buildSteps(quizzes);
    this.step = 0;
    this.journal.clear();
    this.population = 100;
  }

  get current(): Step { return this.steps[this.step]; }

  /** Moves forward one step and returns it (the finale is the last step). */
  advance(): Step {
    this.step = Math.min(this.steps.length - 1, this.step + 1);
    return this.current;
  }

  /** Presenter jump. Earlier chapters' cards are unlocked so the journal stays complete. */
  jumpTo(index: number): Step {
    this.step = Math.max(0, Math.min(this.steps.length - 1, index));
    for (const step of this.steps.slice(0, this.step)) {
      if (step.kind === 'chapter') for (const key of chaptersCards(step.chapter)) this.journal.add(key);
    }
    this.population = POPULATION_AT[this.chapterNumber] ?? this.population;
    return this.current;
  }

  /** Changing the quiz setting keeps your place in the story. */
  setQuizzes(quizzes: boolean): void {
    const here = this.current;
    this.quizzes = quizzes;
    this.steps = buildSteps(quizzes);
    const index = this.steps.findIndex(step => step.kind === here.kind && (step.kind === 'finale' || ('chapter' in here && step.chapter === here.chapter)));
    this.step = index >= 0 ? index : this.steps.findIndex(step => step.kind === 'chapter' && 'chapter' in here && step.chapter === here.chapter);
    if (this.step < 0) this.step = 0;
  }

  get chapterNumber(): number {
    const step = this.current;
    return step.kind === 'finale' ? 6 : step.chapter;
  }

  unlock(key: RubricKey): boolean {
    if (this.journal.has(key)) return false;
    this.journal.add(key); return true;
  }

  get complete(): boolean { return RUBRIC_KEYS.every(key => this.journal.has(key)); }

  setPopulation(value: number): void { this.population = Math.max(0, Math.min(100, Math.round(value))); }
}

const chaptersCards = (chapter: number): RubricKey[] => chapterByNumber(chapter)?.journal || [];

/** Simulated population when a chapter starts (100 = healthy forest). */
export const POPULATION_AT: Record<number, number> = { 1: 100, 2: 100, 3: 100, 4: 3, 5: 24, 6: 24 };

export const run = new Run();

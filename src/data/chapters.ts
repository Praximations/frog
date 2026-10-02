import type { RubricKey } from './journal.ts';

/** The ~10 minute presentation: five short playable chapters, each followed by a class quiz. */
export interface Chapter {
  number: number;
  scene: string;
  title: string;
  tagline: string;
  place: string;
  icon: string;
  journal: RubricKey[];
}

export const CHAPTERS: Chapter[] = [
  { number: 1, scene: 'MeetScene', title: 'Meet the Frog', tagline: '"I am a mountain chicken."', place: 'Morning · Dominica rainforest', icon: 'frog', journal: ['name', 'status', 'habitat', 'physical', 'picture'] },
  { number: 2, scene: 'HuntScene', title: 'The Hunt', tagline: '"This is how I survive."', place: 'Dusk · Forest floor', icon: 'cricket', journal: ['niche'] },
  { number: 3, scene: 'DangerScene', title: 'Night of Danger', tagline: '"Something is changing."', place: 'Night · 2002 onward', icon: 'flashlight', journal: ['threats'] },
  { number: 4, scene: 'RescueScene', title: 'The Rescue', tagline: '"People are trying to help."', place: 'Morning · Montserrat enclosure', icon: 'pool', journal: ['importance', 'support'] },
  { number: 5, scene: 'ConnectScene', title: 'Six Degrees', tagline: '"I am connected to this frog too."', place: 'Twilight · The connection trail', icon: 'link', journal: ['sixDegrees'] },
];

export type Step = { kind: 'chapter'; chapter: number } | { kind: 'quiz'; chapter: number } | { kind: 'finale' };

export function buildSteps(quizzes: boolean): Step[] {
  const steps: Step[] = [];
  for (const chapter of CHAPTERS) {
    steps.push({ kind: 'chapter', chapter: chapter.number });
    if (quizzes) steps.push({ kind: 'quiz', chapter: chapter.number });
  }
  steps.push({ kind: 'finale' });
  return steps;
}

export const chapterByNumber = (number: number): Chapter => CHAPTERS.find(chapter => chapter.number === number)!;

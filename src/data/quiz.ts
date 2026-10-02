/** Kahoot-style checkpoint questions, one after each chapter. Answers come from the Field Journal. */
export interface Question {
  chapter: number;
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explain: string;
  seconds: number;
}

export const QUESTIONS: Question[] = [
  {
    chapter: 1,
    question: 'What is the mountain chicken\'s conservation status?',
    options: ['Least Concern', 'Vulnerable', 'Critically Endangered', 'Extinct'],
    correct: 2,
    explain: 'IUCN lists it as Critically Endangered — the last step before "Extinct in the Wild".',
    seconds: 20,
  },
  {
    chapter: 2,
    question: 'It eats crickets… and sometimes snakes! What is its niche?',
    options: ['Producer', 'Predator (secondary / tertiary consumer)', 'Decomposer', 'Herbivore (primary consumer)'],
    correct: 1,
    explain: 'A carnivore: secondary consumer when eating insects, tertiary when eating other predators.',
    seconds: 20,
  },
  {
    chapter: 3,
    question: 'What caused the fastest crash in mountain chicken numbers?',
    options: ['Chytrid fungus disease', 'Cold winters', 'Too many crickets', 'Plastic straws'],
    correct: 0,
    explain: 'Chytrid killed about 85% of Dominica\'s frogs within 18 months of arriving in 2002.',
    seconds: 20,
  },
  {
    chapter: 4,
    question: 'Why do the rescue enclosures on Montserrat have solar-heated pools?',
    options: ['So frogs can have a spa day', 'To grow bigger frogs', 'To attract tourists', 'Chytrid can\'t survive above 30 °C'],
    correct: 3,
    explain: 'Warm water makes a chytrid-free refuge inside the semi-wild enclosure.',
    seconds: 20,
  },
  {
    chapter: 5,
    question: 'How can buying a pet frog connect YOU to the mountain chicken?',
    options: ['Pet frogs eat their food', 'Pet shops are on Dominica', 'The global frog trade spread chytrid', 'It can\'t — we\'re not connected'],
    correct: 2,
    explain: 'Scientists link the worldwide spread of chytrid to the global trade in amphibians.',
    seconds: 20,
  },
];

export const questionFor = (chapter: number): Question | undefined => QUESTIONS.find(item => item.chapter === chapter);

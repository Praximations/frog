import type { RoundId } from './game.ts';

/**
 * Kahoot-style questions that pop up in the middle of the rounds. Each round asks about its own
 * topic, and every answer reveals a short fact (checked against src/data/sources.ts).
 */
export interface Question {
  id: string;
  round: RoundId;
  topic: string;
  question: string;
  answers: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  /** Shown when the answer is revealed. */
  fact: string;
  /** Pixel art shown with the fact. */
  art: string[];
  sources: string[];
}

export const QUESTIONS: Question[] = [
  // Round 1, Bug Feast: who it is and what it eats.
  {
    id: 'what-is-it', round: 'feast', topic: 'Name',
    question: 'Despite its name, what is a mountain chicken?',
    answers: ['A bird', 'A frog', 'A lizard', 'A snake'], correct: 1,
    fact: 'It\'s a giant frog! People called it "chicken" because they said it tasted like one.',
    art: ['frog-down-0'], sources: ['wikipedia', 'biographic'],
  },
  {
    id: 'latin-name', round: 'feast', topic: 'Name',
    question: 'What is the mountain chicken\'s scientific name?',
    answers: ['Gallus montanus', 'Rana gigantea', 'Leptodactylus fallax', 'Bufo marinus'], correct: 2,
    fact: 'Leptodactylus fallax. On Dominica it\'s also called "crapaud".',
    art: ['portrait'], sources: ['wikipedia'],
  },
  {
    id: 'size', round: 'feast', topic: 'Physical description',
    question: 'How big can a mountain chicken grow?',
    answers: ['5 cm, like a grape', '22 cm and 1 kg', '1 metre long', '2 cm, like a fly'], correct: 1,
    fact: 'Up to 22 cm and 1 kg: the largest frog native to the Caribbean. It\'s chocolate-brown with dark spots.',
    art: ['portrait'], sources: ['wikipedia', 'darwin-factsheet'],
  },
  {
    id: 'main-food', round: 'feast', topic: 'Niche',
    question: 'What does the mountain chicken eat the most?',
    answers: ['Leaves and fruit', 'Seeds', 'Crickets and grasshoppers', 'Fish'], correct: 2,
    fact: 'Mostly crickets and grasshoppers. It also eats beetles, spiders, millipedes, snails and land crabs.',
    art: ['cricket', 'beetle', 'millipede', 'snail', 'crab'], sources: ['diet-2019'],
  },
  {
    id: 'not-food', round: 'feast', topic: 'Niche',
    question: 'Which of these does the mountain chicken NOT eat?',
    answers: ['Land crabs', 'Snails', 'Leaves', 'Small snakes'], correct: 2,
    fact: 'It\'s a carnivore, so no plants. It even eats small snakes, lizards, frogs, bats and birds!',
    art: ['crab', 'snail', 'cricket'], sources: ['diet-2019'],
  },
  {
    id: 'food-web', round: 'feast', topic: 'Niche',
    question: 'What is the mountain chicken\'s job in the food web?',
    answers: ['Producer', 'Herbivore', 'Decomposer', 'Top predator'], correct: 3,
    fact: 'A carnivore (secondary or tertiary consumer). It\'s the top native land predator on Montserrat.',
    art: ['frog-down-4', 'cricket'], sources: ['zjb-2018', 'diet-2019'],
  },
  {
    id: 'predators', round: 'feast', topic: 'Reasons it is endangered',
    question: 'Which invasive animals eat mountain chickens?',
    answers: ['Sharks', 'Pigs, cats, dogs and opossums', 'Eagles', 'Nothing eats them'], correct: 1,
    fact: 'Animals brought to the islands by people, like feral pigs, cats, dogs and opossums, eat the frogs.',
    art: ['pig'], sources: ['darwin-factsheet'],
  },
  // Round 2, Hunter Night: status, habitat and threats.
  {
    id: 'status', round: 'night', topic: 'Status',
    question: 'What is the mountain chicken\'s conservation status?',
    answers: ['Least Concern', 'Vulnerable', 'Critically Endangered', 'Extinct'], correct: 2,
    fact: 'Critically Endangered since 2004: one step away from Extinct in the Wild.',
    art: ['icon-frog'], sources: ['wikipedia'],
  },
  {
    id: 'how-many', round: 'night', topic: 'Status',
    question: 'How many wild mountain chickens were found on Dominica in 2023?',
    answers: ['21', '2,100', '21,000', '210,000'], correct: 0,
    fact: 'Only 21! Experts searched for 26 nights. The population is down more than 99% since 2002.',
    art: ['icon-frog'], sources: ['survey-2023', 'zsl-2023'],
  },
  {
    id: 'islands', round: 'night', topic: 'Habitat',
    question: 'Which two islands are home to the mountain chicken?',
    answers: ['Jamaica and Cuba', 'Hawaii and Fiji', 'Dominica and Montserrat', 'Iceland and Ireland'], correct: 2,
    fact: 'Two small, rainy Caribbean islands. It has already disappeared from 5 other islands.',
    art: ['icon-island'], sources: ['wikipedia', 'amphibiaweb'],
  },
  {
    id: 'habitat', round: 'night', topic: 'Habitat',
    question: 'Where does the mountain chicken live?',
    answers: ['Hot, dry desert', 'Damp forest near streams', 'Snowy mountain tops', 'The open ocean'], correct: 1,
    fact: 'Warm, wet tropical forest near streams (about 26–32 °C all year). It comes out at night.',
    art: ['tree', 'fern'], sources: ['amphibiaweb', 'dominica-climate', 'darwin-factsheet'],
  },
  {
    id: 'hunting', round: 'night', topic: 'Reasons it is endangered',
    question: 'Why were so many mountain chickens hunted?',
    answers: ['For their skins', 'They were eaten as a national dish', 'To keep as pets', 'For fun'], correct: 1,
    fact: '"Crapaud" was Dominica\'s national dish: 8,000–36,000 frogs were caught a year until hunting was banned in 2004.',
    art: ['hunter'], sources: ['biographic'],
  },
  {
    id: 'volcano', round: 'night', topic: 'Reasons it is endangered',
    question: 'What destroyed part of the frog\'s forest on Montserrat in 1995?',
    answers: ['A volcano', 'A tsunami', 'A blizzard', 'A meteor'], correct: 0,
    fact: 'The Soufrière Hills volcano erupted. Lava destroyed about 10% of the habitat and ash covered much more.',
    art: ['volcano'], sources: ['reptiles'],
  },
  {
    id: 'hurricane', round: 'night', topic: 'Reasons it is endangered',
    question: 'Which hurricane hit Dominica\'s last wild frogs in 2017?',
    answers: ['Katrina', 'Sandy', 'Andrew', 'Maria'], correct: 3,
    fact: 'Category 5 Hurricane Maria hit the already tiny population hard.',
    art: ['icon-storm'], sources: ['maria-2023'],
  },
  // Round 3, Fungus Outbreak: the disease, the rescue and why it matters.
  {
    id: 'disease', round: 'fungus', topic: 'Reasons it is endangered',
    question: 'What disease killed most mountain chickens?',
    answers: ['Bird flu', 'Chytrid fungus', 'Rabies', 'A cold'], correct: 1,
    fact: 'Chytrid fungus reached Dominica in 2002. About 85% of the frogs there died in just 18 months.',
    art: ['icon-fungus'], sources: ['durrell-chytrid'],
  },
  {
    id: 'warm-pools', round: 'fungus', topic: 'Support',
    question: 'How do rescuers protect frogs from chytrid fungus?',
    answers: ['Ice baths', 'Pools warmed by the sun', 'Spraying perfume', 'Painting them'], correct: 1,
    fact: 'Chytrid can\'t survive above 30 °C. In 2019, 27 frogs were released on Montserrat with solar-heated pools.',
    art: ['pool', 'solar'], sources: ['durrell-2019'],
  },
  {
    id: 'airlift', round: 'fungus', topic: 'Support',
    question: 'In 2009, how were 50 mountain chickens saved from the fungus?',
    answers: ['Flown to zoos in Europe', 'Hidden in caves', 'Moved to the desert', 'Given umbrellas'], correct: 0,
    fact: 'They were airlifted to European zoos to breed safely. In 2025, 24 more frogs were flown to Montserrat.',
    art: ['icon-ship'], sources: ['mongabay-2009', 'durrell-2025'],
  },
  {
    id: 'why-matters', round: 'fungus', topic: 'Importance',
    question: 'Why does the mountain chicken matter?',
    answers: ['It eats crop pests', 'Its skin makes a germ-killer', 'It\'s on Dominica\'s coat of arms', 'All of these'], correct: 3,
    fact: 'All of them! Its skin makes fallaxin, which stops bacteria like E. coli, and it\'s a national symbol of Dominica.',
    art: ['icon-skin'], sources: ['zjb-2018', 'fallaxin', 'dominica-arms'],
  },
  {
    id: 'six-degrees', round: 'fungus', topic: 'Six degrees of separation',
    question: 'How could buying a pet frog be linked to the mountain chicken?',
    answers: ['Pet frogs eat its food', 'The frog trade spread chytrid fungus', 'Pet frogs are mountain chickens', 'It isn\'t linked'], correct: 1,
    fact: 'Chytrid spread around the world with the global frog trade. Never release a pet frog outdoors!',
    art: ['icon-you', 'icon-ship', 'icon-fungus'], sources: ['ohanlon-2018'],
  },
];

/** Picks `count` different questions for a round. */
export function pickQuestions(round: RoundId, count: number, random = Math.random): Question[] {
  const pool = QUESTIONS.filter(question => question.round === round);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, count);
}

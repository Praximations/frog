/**
 * The fact cards: one per rubric bullet (10 × 2 pts). Kept deliberately short: a title, one line
 * and at most four quick points, big enough to read from the back of a classroom.
 * Every fact cites src/data/sources.ts.
 */
export type RubricKey = 'name' | 'status' | 'habitat' | 'physical' | 'picture' | 'niche' | 'threats' | 'importance' | 'support' | 'sixDegrees';
export type Visual = 'nameplate' | 'redlist' | 'map' | 'anatomy' | 'plate' | 'foodweb' | 'threats' | 'importance' | 'timeline' | 'chain';

export interface JournalCard {
  key: RubricKey;
  number: number;
  /** The rubric bullet this card answers. */
  rubric: string;
  title: string;
  line: string;
  points: string[];
  visual: Visual;
  sources: string[];
}

export const SPECIES = {
  commonName: 'Mountain chicken',
  otherName: 'Giant ditch frog',
  scientificName: 'Leptodactylus fallax',
  status: 'Critically Endangered',
  statusSince: 2004,
  wildCount2023: 21,
};

export const SIX_DEGREES = [
  { step: 'YOU', icon: 'you', title: 'You want a pet frog' },
  { step: '1', icon: 'shop', title: 'Pet shops sell frogs from abroad' },
  { step: '2', icon: 'ship', title: 'The global frog trade ships them worldwide' },
  { step: '3', icon: 'fungus', title: 'Chytrid fungus hitchhikes along' },
  { step: '4', icon: 'island', title: 'It reaches Dominica (2002)' },
  { step: '5', icon: 'skin', title: 'It infects the frogs\' skin' },
  { step: 'FROG', icon: 'frog', title: 'Mountain chickens die' },
];

/** Extra credit: a second chain. Says "storms like Maria" rather than blaming one storm on climate change. */
export const BONUS_CHAIN = ['You use energy', 'CO₂ warms the oceans', 'More hurricanes become major storms', 'Storms like Hurricane Maria (2017)', 'The frog\'s forest is wrecked'];

export const JOURNAL: JournalCard[] = [
  {
    key: 'name', number: 1, rubric: 'Name',
    title: 'Mountain chicken',
    line: 'Scientific name: Leptodactylus fallax',
    points: ['It\'s a frog, not a chicken!', 'Also called the giant ditch frog', 'Called "crapaud" on Dominica', 'Named "chicken" because people said it tasted like one'],
    visual: 'nameplate',
    sources: ['wikipedia', 'biographic'],
  },
  {
    key: 'status', number: 2, rubric: 'Status',
    title: 'Critically Endangered',
    line: 'One step away from extinct in the wild.',
    points: ['Only 21 wild frogs were found in 2023', 'Down more than 99% since 2002'],
    visual: 'redlist',
    sources: ['wikipedia', 'zsl-2023', 'survey-2023'],
  },
  {
    key: 'habitat', number: 3, rubric: 'Habitat',
    title: 'Dominica & Montserrat',
    line: 'Two small, rainy islands in the Caribbean.',
    points: ['Damp tropical forest near streams', 'Warm all year: about 26–32 °C', 'Already gone from 5 other islands'],
    visual: 'map',
    sources: ['wikipedia', 'amphibiaweb', 'dominica-climate'],
  },
  {
    key: 'physical', number: 4, rubric: 'Physical description',
    title: 'A giant brown frog',
    line: 'The largest frog native to the Caribbean.',
    points: ['Up to 22 cm long and 1 kg', 'Chocolate-brown with dark spots', 'Males have huge arms and black thumb spurs'],
    visual: 'anatomy',
    sources: ['wikipedia', 'darwin-factsheet'],
  },
  {
    key: 'picture', number: 5, rubric: 'Illustration',
    title: 'Meet the frog',
    line: 'Our own pixel art, drawn from field-guide descriptions.',
    points: ['Comes out at night and calls "whoop!"', 'Mums feed their tadpoles thousands of eggs'],
    visual: 'plate',
    sources: ['wikipedia', 'darwin-factsheet', 'durrell'],
  },
  {
    key: 'niche', number: 6, rubric: 'Niche',
    title: 'Top predator',
    line: 'A carnivore: a secondary or tertiary consumer.',
    points: ['Eats crickets, crabs, even snakes', 'Top native land predator on Montserrat', 'Eaten by pigs, cats, dogs and people'],
    visual: 'foodweb',
    sources: ['diet-2019', 'zjb-2018', 'darwin-factsheet'],
  },
  {
    key: 'threats', number: 7, rubric: 'Why it is endangered',
    title: 'Why it\'s disappearing',
    line: 'One of the fastest crashes ever recorded.',
    points: ['Chytrid fungus: 85% died in 18 months', 'Hunting: up to 36,000 caught a year', 'Also volcanoes, hurricanes, lost forest and pigs'],
    visual: 'threats',
    sources: ['durrell-chytrid', 'biographic', 'reptiles', 'amphibiaweb', 'darwin-factsheet', 'maria-2023'],
  },
  {
    key: 'importance', number: 8, rubric: 'Importance',
    title: 'Why it matters',
    line: 'Lose the top predator and the whole island changes.',
    points: ['Eats insects that damage crops', 'Its skin makes a germ-killer studied for medicine', 'It\'s on Dominica\'s coat of arms'],
    visual: 'importance',
    sources: ['zjb-2018', 'fallaxin', 'dominica-arms'],
  },
  {
    key: 'support', number: 9, rubric: 'Support',
    title: 'Who\'s helping',
    line: 'Durrell, ZSL, zoos and the governments of both islands.',
    points: ['2004: hunting banned', '2009: 50 frogs rescued to zoos to breed', '2019: frogs released with warm pools that kill the fungus', '2025: 24 more frogs flown to Montserrat'],
    visual: 'timeline',
    sources: ['durrell', 'zsl', 'mongabay-2009', 'durrell-2019', 'durrell-2025'],
  },
  {
    key: 'sixDegrees', number: 10, rubric: 'Six degrees of separation',
    title: 'Connected to you',
    line: 'From a pet frog to the mountain chicken in six steps.',
    points: [],
    visual: 'chain',
    sources: ['ohanlon-2018', 'durrell-chytrid', 'ipcc-2021', 'maria-2023'],
  },
];

export const RUBRIC_KEYS: RubricKey[] = ['name', 'status', 'habitat', 'physical', 'picture', 'niche', 'threats', 'importance', 'support', 'sixDegrees'];
export const cardByKey = (key: RubricKey): JournalCard => JOURNAL.find(card => card.key === key)!;

/**
 * The Field Journal: one card per rubric bullet (10 × 2 pts). Every fact cites src/data/sources.ts.
 * Keep wording short enough to read from the back of a classroom.
 */
export type RubricKey = 'name' | 'status' | 'habitat' | 'physical' | 'picture' | 'niche' | 'threats' | 'importance' | 'support' | 'sixDegrees';
export type Visual = 'nameplate' | 'redlist' | 'map' | 'anatomy' | 'plate' | 'foodweb' | 'threats' | 'importance' | 'timeline' | 'chain';

export interface Fact { tag: string; text: string }
export interface JournalCard {
  key: RubricKey;
  number: number;
  rubric: string;
  kicker: string;
  title: string;
  lead: string;
  visual: Visual;
  facts: Fact[];
  note?: string;
  sources: string[];
}

export const SPECIES = {
  commonName: 'Mountain chicken',
  otherNames: ['Crapaud (Dominica)', 'Giant ditch frog'],
  scientificName: 'Leptodactylus fallax',
  status: 'Critically Endangered',
  statusSince: 2004,
  wildCount2023: 21,
};

export const SIX_DEGREES = [
  { step: 'YOU', icon: 'you', title: 'You', text: 'You (or someone you know) wants a cool pet frog.' },
  { step: '1', icon: 'shop', title: 'Pet shop', text: 'Pet shops and websites sell frogs shipped from other countries.' },
  { step: '2', icon: 'ship', title: 'Global frog trade', text: 'The global amphibian trade moves huge numbers of frogs between continents.' },
  { step: '3', icon: 'fungus', title: 'Chytrid hitchhikes', text: 'Scientists traced chytrid fungus to East Asia; it spread worldwide as that trade grew.' },
  { step: '4', icon: 'island', title: 'Reaches the islands', text: 'Chytrid reached Dominica in 2002 and Montserrat in 2009.' },
  { step: '5', icon: 'skin', title: 'Through the skin', text: 'The fungus infects frog skin. About 85% of Dominica\'s mountain chickens died within 18 months.' },
  { step: 'FROG', icon: 'frog', title: 'Mountain chicken', text: 'A frog thousands of kilometres away is affected by choices about pets.' },
];

/** Extra-credit second chain, shown on the six-degrees card. Wording avoids blaming one storm on climate change. */
export const BONUS_CHAIN = [
  'You use energy (cars, electricity)',
  'Burning fossil fuels releases CO₂',
  'The planet and oceans warm',
  'A larger share of hurricanes become major storms (IPCC)',
  'Storms like Category 5 Hurricane Maria (2017) hit Dominica',
  'The last wild frogs\' forest is damaged',
];

export const JOURNAL: JournalCard[] = [
  {
    key: 'name', number: 1, rubric: 'Name (common and scientific)',
    kicker: 'Field Journal · Who am I?', title: 'Mountain chicken',
    lead: 'Not a chicken at all — one of the biggest frogs on Earth.',
    visual: 'nameplate',
    facts: [
      { tag: 'Common name', text: 'Mountain chicken (mountain chicken frog)' },
      { tag: 'Scientific name', text: 'Leptodactylus fallax' },
      { tag: 'Also called', text: '"Crapaud" in Dominica, and the giant ditch frog' },
      { tag: 'Why "chicken"?', text: 'It was hunted as food and people said it tastes like chicken.' },
    ],
    sources: ['wikipedia', 'biographic', 'darwin-factsheet'],
  },
  {
    key: 'status', number: 2, rubric: 'Status (threatened / endangered / critically endangered)',
    kicker: 'Field Journal · How much trouble?', title: 'Critically Endangered',
    lead: 'The highest risk level before "Extinct in the Wild" on the IUCN Red List.',
    visual: 'redlist',
    facts: [
      { tag: 'IUCN Red List', text: 'Critically Endangered (listed since 2004)' },
      { tag: 'Decline', text: 'The population has fallen by more than 99% since 2002.' },
      { tag: '2023 survey', text: 'Only 21 living wild frogs were found on Dominica.' },
    ],
    sources: ['wikipedia', 'amphibiaweb', 'survey-2023'],
  },
  {
    key: 'habitat', number: 3, rubric: 'Habitat (name and description)',
    kicker: 'Field Journal · Where do I live?', title: 'Dominica & Montserrat',
    lead: 'Two small volcanic islands in the Eastern Caribbean (Lesser Antilles).',
    visual: 'map',
    facts: [
      { tag: 'Where', text: 'Wild frogs remain on Dominica. Montserrat\'s frogs now live in a protected semi-wild enclosure.' },
      { tag: 'Lost from', text: 'Once lived on 5 more islands: St Kitts, Antigua, Guadeloupe, Martinique and St Lucia.' },
      { tag: 'Description', text: 'Moist tropical forest near streams and springs, forest edges, clearings and plantations.' },
      { tag: 'Climate', text: 'Warm all year (about 26–32 °C), humid and very rainy; wet season June–October.' },
    ],
    sources: ['wikipedia', 'amphibiaweb', 'dominica-climate', 'montserrat-2022', 'durrell-2025'],
  },
  {
    key: 'physical', number: 4, rubric: 'Physical description',
    kicker: 'Field Journal · What do I look like?', title: 'A giant brown frog',
    lead: 'The largest frog native to the Caribbean.',
    visual: 'anatomy',
    facts: [
      { tag: 'Size', text: 'Up to 22 cm long (snout to vent) and up to 1 kg (2.2 lb). Adults are usually 17–18 cm.' },
      { tag: 'Colour', text: 'Chocolate-brown head, back and legs with darker markings on the head and sides — every pattern is unique.' },
      { tag: 'Flash of red', text: 'The groin is often rusty-brown or red.' },
      { tag: 'Males vs females', text: 'Males are smaller, with big forearms and a black spur on each thumb.' },
    ],
    sources: ['wikipedia', 'darwin-factsheet'],
  },
  {
    key: 'picture', number: 5, rubric: 'Illustration / picture',
    kicker: 'Field Journal · Field-guide plate', title: 'Portrait of a mountain chicken',
    lead: 'An original pixel illustration based on descriptions from ZSL, Durrell and the Darwin Initiative fact sheet.',
    visual: 'plate',
    facts: [
      { tag: 'Night life', text: 'Lives on the ground and is active at night, giving a loud "whoop" call.' },
      { tag: 'Nursery', text: 'Breeds in burrows about 50 cm deep, inside a foam nest.' },
      { tag: 'Super mum', text: 'The mother guards the nest and feeds her tadpoles up to 25,000 unfertilised eggs.' },
    ],
    note: 'Bonus facts for extra credit. Add a real photo at public/assets/images/mountain-chicken.jpg and it appears on this card.',
    sources: ['wikipedia', 'darwin-factsheet', 'durrell'],
  },
  {
    key: 'niche', number: 6, rubric: 'Niche (producer, primary consumer, etc.)',
    kicker: 'Field Journal · My job in the ecosystem', title: 'Carnivore & top predator',
    lead: 'A secondary consumer when it eats plant-eating insects — a tertiary consumer when it eats other predators.',
    visual: 'foodweb',
    facts: [
      { tag: 'Diet', text: 'Mostly crickets and grasshoppers, plus spiders, millipedes, snails and land crabs.' },
      { tag: 'Big prey', text: 'Sometimes small frogs, lizards, snakes, bats, birds and mammals.' },
      { tag: 'Top predator', text: 'The top native land predator on Montserrat, which has no native land mammals.' },
      { tag: 'Eaten by', text: 'Invasive feral pigs, opossums, dogs and cats — and people.' },
    ],
    sources: ['diet-2019', 'wikipedia', 'zjb-2018', 'darwin-factsheet', 'mcrp-feeding'],
  },
  {
    key: 'threats', number: 7, rubric: 'Major reasons why the species is listed',
    kicker: 'Field Journal · Why am I disappearing?', title: 'Six threats',
    lead: 'One of the fastest collapses of any species ever recorded.',
    visual: 'threats',
    facts: [
      { tag: 'Chytrid fungus', text: 'Arrived on Dominica in 2002: about 85% of frogs died within 18 months. Montserrat\'s frogs crashed after 2009.' },
      { tag: 'Hunting', text: '"Crapaud" was Dominica\'s national dish — an estimated 8,000–36,000 frogs taken each year. Banned in 2004.' },
      { tag: 'Volcano', text: 'Montserrat\'s Soufrière Hills volcano erupted in 1995; lava destroyed about 10% of the habitat and ash covered much more.' },
      { tag: 'Habitat loss', text: 'Forest cleared and degraded by people.' },
      { tag: 'Invasive animals', text: 'Feral pigs, opossums, dogs and cats eat the frogs.' },
      { tag: 'Hurricanes', text: 'Category 5 Hurricane Maria hit Dominica in 2017, hitting the already tiny population hard.' },
    ],
    sources: ['durrell-chytrid', 'biographic', 'reptiles', 'amphibiaweb', 'darwin-factsheet', 'maria-2023'],
  },
  {
    key: 'importance', number: 8, rubric: 'Importance of the species',
    kicker: 'Field Journal · Why save me?', title: 'Why it matters',
    lead: 'Losing a top predator ripples through a whole island.',
    visual: 'importance',
    facts: [
      { tag: 'Ecosystem', text: 'As a top predator it keeps insects in check — researchers link losing the frog to more crop pests.' },
      { tag: 'Medicine', text: 'Its skin makes fallaxin, a natural antibiotic peptide that stops bacteria such as E. coli — studied for new drugs.' },
      { tag: 'Culture', text: 'A national symbol: the crapaud is on Dominica\'s coat of arms (1961) and in songs and calypsos.' },
      { tag: 'Science', text: 'A test case for beating chytrid, which has driven declines in over 500 amphibian species.' },
    ],
    sources: ['zjb-2018', 'fallaxin', 'dominica-arms', 'biographic', 'mongabay-2023'],
  },
  {
    key: 'support', number: 9, rubric: 'Support being given to the species',
    kicker: 'Field Journal · Who is helping?', title: 'The rescue mission',
    lead: 'The Mountain Chicken Recovery Programme: Durrell, ZSL, Chester Zoo, Nordens Ark, Paignton Zoo and the governments of Montserrat and Dominica.',
    visual: 'timeline',
    facts: [
      { tag: '2004', text: 'Dominica bans hunting mountain chickens.' },
      { tag: '2009', text: '50 frogs airlifted from Montserrat to zoos in Europe as a safety net, then bred in biosecure rooms.' },
      { tag: '2019', text: 'World first: 27 captive-bred frogs released into a semi-wild enclosure on Montserrat with solar-heated pools — chytrid cannot survive above 30 °C.' },
      { tag: '2023', text: '28 experts searched Dominica for 26 nights and swabbed survivors to study disease resistance.' },
      { tag: '2025', text: '24 frogs flown from Nordens Ark (Sweden) to Montserrat\'s predator-proof enclosure.' },
    ],
    sources: ['durrell', 'biographic', 'mongabay-2009', 'durrell-2019', 'survey-2023', 'mongabay-2023', 'durrell-2025'],
  },
  {
    key: 'sixDegrees', number: 10, rubric: 'Six degrees of separation',
    kicker: 'Field Journal · How am I connected to you?', title: 'Everything is connected',
    lead: 'From a pet-shop frog to a giant frog in the Caribbean — in six steps.',
    visual: 'chain',
    facts: SIX_DEGREES.map(link => ({ tag: link.title, text: link.text })),
    note: 'Never release a pet frog outdoors, and clean muddy boots and gear before exploring a new wild place.',
    sources: ['ohanlon-2018', 'durrell-chytrid', 'mongabay-2023', 'ipcc-2021', 'maria-2023'],
  },
];

export const RUBRIC_KEYS: RubricKey[] = ['name', 'status', 'habitat', 'physical', 'picture', 'niche', 'threats', 'importance', 'support', 'sixDegrees'];
export const cardByKey = (key: RubricKey): JournalCard => JOURNAL.find(card => card.key === key)!;

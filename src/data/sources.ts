/** Every fact shown in the game cites one of these. Checked 2 October 2026 unless noted. */
export interface Source { id: string; title: string; publisher: string; url: string }

export const SOURCES: Source[] = [
  { id: 'zsl', title: 'Mountain chicken frog conservation', publisher: 'ZSL (Zoological Society of London)', url: 'https://www.zsl.org/what-we-do/projects/mountain-chicken-frog-conservation' },
  { id: 'durrell', title: 'Mountain chicken (species profile)', publisher: 'Durrell Wildlife Conservation Trust', url: 'https://www.durrell.org/wildlife/species-index/mountain-chicken/' },
  { id: 'durrell-chytrid', title: 'Chytrid responsible for one of fastest species declines ever recorded', publisher: 'Durrell Wildlife Conservation Trust', url: 'https://www.durrell.org/news/chytrid-responsible-for-one-of-fastest-species-declines-ever-recorded/' },
  { id: 'durrell-2019', title: 'World first for Critically Endangered frog (2019 semi-wild release)', publisher: 'Durrell Wildlife Conservation Trust', url: 'https://www.durrell.org/wildlife/amphibian-blog/frogs-in-the-fog/' },
  { id: 'durrell-2025', title: 'Mountain chicken frogs arrive in Montserrat from Sweden (2025)', publisher: 'Durrell Wildlife Conservation Trust', url: 'https://www.durrell.org/news/mountain-chicken-frogs-arrive-in-montserrat-from-sweden/' },
  { id: 'wikipedia', title: 'Leptodactylus fallax', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Leptodactylus_fallax' },
  { id: 'amphibiaweb', title: 'Leptodactylus fallax', publisher: 'AmphibiaWeb', url: 'https://amphibiaweb.org/species/3322' },
  { id: 'darwin-factsheet', title: 'Mountain chicken fact sheet (Darwin Initiative project 13-032)', publisher: 'Darwin Initiative', url: 'https://www.darwininitiative.org.uk/documents/DAR13032/14084/13-032%20FR%20App19%20Mountain%20chicken%20fact%20sheet.pdf' },
  { id: 'diet-2019', title: 'Wild diet of the critically endangered mountain chicken (Herpetological Journal 29(4), 2019)', publisher: 'British Herpetological Society', url: 'https://thebhs.org/publications/the-herpetological-journal/volume-29-number-4-october-2019/1984-13-wild-diet-of-the-critically-endangered-mountain-chicken-i-leptodactylus-fallax-i' },
  { id: 'biographic', title: 'Song of the mountain chicken', publisher: 'bioGraphic', url: 'https://www.biographic.com/song-of-the-mountain-chicken/' },
  { id: 'reptiles', title: 'The plight of the mountain chicken frog', publisher: 'Reptiles Magazine', url: 'https://reptilesmagazine.com/the-plight-of-the-mountain-chicken-frog/' },
  { id: 'dominica-arms', title: 'National symbols: Coat of Arms', publisher: 'Government of the Commonwealth of Dominica', url: 'https://www.dominica.gov.dm/about-dominica/national-symbols/coat-of-arms' },
  { id: 'dominica-climate', title: 'Geography of Dominica (climate)', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Geography_of_Dominica' },
  { id: 'fallaxin', title: 'An antimicrobial peptide from the skin secretions of the mountain chicken frog Leptodactylus fallax', publisher: 'United Arab Emirates University (research record)', url: 'https://research.uaeu.ac.ae/en/publications/an-antimicrobial-peptide-from-the-skin-secretions-of-the-mountain/' },
  { id: 'zjb-2018', title: 'Mountain chicken critical to Montserrat\'s ecosystem, says researcher (2018)', publisher: 'ZJB Radio Montserrat', url: 'https://www.zjbradio.com/news/2018/8/28/mountain-chicken-critical-to-montserrats-ecosystem-says-researcher' },
  { id: 'mongabay-2009', title: 'After disease engulfs island, rare mountain chicken frogs airlifted to safety (2009)', publisher: 'Mongabay', url: 'https://news.mongabay.com/2009/04/after-disease-engulfs-island-rare-mountain-chicken-frogs-airlifted-to-safety' },
  { id: 'mongabay-2023', title: 'Sliver of hope as mountain chicken frog shows resistance to deadly disease (2023)', publisher: 'Mongabay', url: 'https://news.mongabay.com/2023/10/sliver-of-hope-as-mountain-chicken-frog-shows-resistance-to-deadly-disease/' },
  { id: 'zsl-2023', title: '"Giant chicken" on brink of extinction: population down over 99% since 2002 (16 October 2023)', publisher: 'ZSL (Zoological Society of London)', url: 'https://www.zsl.org/news-and-events/news/giant-chicken-brink-extinction' },
  { id: 'survey-2023', title: 'An island frog became a national delicacy. Now there are only 21 left in the wild, scientists say (2023)', publisher: 'CNN, via Citizen Digital', url: 'https://www.citizen.digital/news/an-island-frog-became-a-national-delicacy-now-there-are-only-21-left-in-the-wild-scientists-say-n329883' },
  { id: 'maria-2023', title: 'Surviving the unthinkable: the mountain chicken frog\'s odyssey to existence (2023)', publisher: 'Discover Montserrat', url: 'https://discovermni.com/2023/11/21/surviving-the-unthinkable-the-mountain-chicken-frogs-odyssey-to-existence/' },
  { id: 'montserrat-2022', title: 'No mountain chickens sighted in the wild on latest annual survey (2022)', publisher: 'Discover Montserrat', url: 'https://discovermni.com/2022/06/14/no-mountain-chickens-sighted-in-the-wild-on-latest-annual-survey/' },
  { id: 'ohanlon-2018', title: 'Recent Asian origin of chytrid fungi causing global amphibian declines (Science 360:621–627, 2018)', publisher: 'O\'Hanlon et al., via Imperial College London', url: 'https://spiral.imperial.ac.uk/entities/publication/dde5ca35-1928-4a37-905f-e5bf96e03fc4' },
  { id: 'ipcc-2021', title: 'IPCC Sixth Assessment Report, Working Group I, Summary for Policymakers (A.3.4)', publisher: 'IPCC', url: 'https://www.ipcc.ch/report/ar6/wg1/chapter/summary-for-policymakers/' },
  { id: 'mcrp-feeding', title: 'Trick or treat! Spooky snacks for our mountain chickens (2020)', publisher: 'Mountain Chicken Recovery Programme', url: 'https://www.mountainchicken.org/blog/trick-or-treat-spooky-snacks-for-our-mountain-chickens/' },
];

export const sourceById = (id: string): Source | undefined => SOURCES.find(source => source.id === id);

import type { RubricKey } from './journal.ts';

/**
 * The ~10 minute match: short learning breaks (the Field Journal cards, for the rubric) between
 * three competitive rounds. Team Dominica vs Team Montserrat — the frog's two home islands.
 */
export type RoundId = 'feast' | 'night' | 'rescue';

export interface RoundInfo {
  id: RoundId;
  number: number;
  title: string;
  goal: string;
  tip: string;
  seconds: number;
  facts: { at: number; tag: string; text: string }[];
}

export const ROUNDS: Record<RoundId, RoundInfo> = {
  feast: {
    id: 'feast', number: 1, title: 'Feeding Frenzy', seconds: 60,
    goal: 'Eat as many bugs as you can!',
    tip: 'Cricket 1 · Land crab 3 · Golden cricket 5',
    facts: [
      { at: 6, tag: 'Real frog fact', text: 'Mountain chickens are predators. They mostly eat crickets and grasshoppers.' },
      { at: 32, tag: 'Real frog fact', text: 'They also eat land crabs, snails, millipedes — even small snakes!' },
    ],
  },
  night: {
    id: 'night', number: 2, title: 'Night of Danger', seconds: 70,
    goal: 'Grab glowing bugs. Stay out of the flashlights!',
    tip: 'Hide in bushes · Avoid the green chytrid pools',
    facts: [
      { at: 5, tag: 'Threat · Hunting', text: '"Crapaud" was Dominica\'s national dish: 8,000–36,000 frogs were taken each year until hunting was banned in 2004.' },
      { at: 30, tag: 'Threat · Chytrid fungus', text: 'Chytrid arrived in 2002. About 85% of Dominica\'s frogs died within 18 months.' },
      { at: 52, tag: 'More threats', text: 'Volcanoes, hurricanes, lost forest and invasive animals hit the survivors too.' },
    ],
  },
  rescue: {
    id: 'rescue', number: 3, title: 'Rescue Relay', seconds: 60,
    goal: 'Carry lost frogs to your team\'s warm pool!',
    tip: 'One frog at a time · Dodge the feral pig',
    facts: [
      { at: 6, tag: 'Real rescue', text: 'On Montserrat, rescue pools are solar-heated above 30 °C — too hot for chytrid fungus.' },
      { at: 33, tag: 'Real rescue', text: 'In 2019, 27 captive-bred mountain chickens were released into a protected enclosure there.' },
    ],
  },
};

export type Step =
  | { kind: 'learn'; title: string; cards: RubricKey[] }
  | { kind: 'round'; round: RoundId }
  | { kind: 'final' };

export const STEPS: Step[] = [
  { kind: 'learn', title: 'Meet the mountain chicken', cards: ['name', 'status', 'habitat'] },
  { kind: 'round', round: 'feast' },
  { kind: 'learn', title: 'The frog you just played', cards: ['physical', 'picture', 'niche'] },
  { kind: 'round', round: 'night' },
  { kind: 'learn', title: 'Why it is disappearing', cards: ['threats'] },
  { kind: 'round', round: 'rescue' },
  { kind: 'learn', title: 'Saving the mountain chicken', cards: ['importance', 'support', 'sixDegrees'] },
  { kind: 'final' },
];

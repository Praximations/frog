import test from 'node:test';
import assert from 'node:assert/strict';
import { JOURNAL, RUBRIC_KEYS, SIX_DEGREES } from '../src/data/journal.ts';
import { SOURCES } from '../src/data/sources.ts';
import { STEPS, ROUNDS } from '../src/data/rounds.ts';

test('every rubric bullet has exactly one complete, sourced Field Journal card', () => {
  assert.equal(RUBRIC_KEYS.length, 10, 'the assignment has 10 information bullets');
  const ids = new Set(SOURCES.map(source => source.id));
  for (const key of RUBRIC_KEYS) {
    const cards = JOURNAL.filter(card => card.key === key);
    assert.equal(cards.length, 1, `${key} has one card`);
    const [card] = cards;
    assert.ok(card.title && card.lead && card.rubric, `${key} has a title, lead and rubric label`);
    assert.ok(card.facts.length >= 3, `${key} shows at least three facts`);
    assert.ok(card.sources.length > 0 && card.sources.every(id => ids.has(id)), `${key} cites known sources`);
    assert.doesNotMatch(JSON.stringify(card), /VERIFIED CONTENT NEEDED|TODO|lorem/i);
  }
  assert.deepEqual(JOURNAL.map(card => card.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('the learning breaks show every card exactly once, between the rounds', () => {
  const shown = STEPS.flatMap(step => step.kind === 'learn' ? step.cards : []);
  assert.deepEqual([...shown].sort(), [...RUBRIC_KEYS].sort());
  assert.equal(new Set(shown).size, shown.length);
  assert.deepEqual(STEPS.map(step => step.kind), ['learn', 'round', 'learn', 'round', 'learn', 'round', 'learn', 'final']);
});

test('name card states both the common and scientific name; status names the category', () => {
  const name = JOURNAL.find(card => card.key === 'name');
  assert.match(JSON.stringify(name), /Mountain chicken/);
  assert.match(JSON.stringify(name), /Leptodactylus fallax/);
  assert.match(JSON.stringify(JOURNAL.find(card => card.key === 'status')), /Critically Endangered/);
  const habitat = JSON.stringify(JOURNAL.find(card => card.key === 'habitat'));
  assert.match(habitat, /Dominica/); assert.match(habitat, /Description/);
});

test('six degrees runs from YOU to the frog through five connections', () => {
  assert.equal(SIX_DEGREES.length, 7);
  assert.equal(SIX_DEGREES[0].step, 'YOU');
  assert.equal(SIX_DEGREES.at(-1).step, 'FROG');
});

test('three short rounds fit a 10-minute presentation', () => {
  const rounds = STEPS.filter(step => step.kind === 'round').map(step => ROUNDS[step.round]);
  assert.deepEqual(rounds.map(round => round.number), [1, 2, 3]);
  const seconds = rounds.reduce((sum, round) => sum + round.seconds, 0);
  assert.ok(seconds >= 150 && seconds <= 240, `rounds take ${seconds}s`);
  for (const round of rounds) {
    assert.ok(round.goal && round.tip && round.title);
    for (const fact of round.facts) assert.ok(fact.at > 0 && fact.at < round.seconds);
  }
});

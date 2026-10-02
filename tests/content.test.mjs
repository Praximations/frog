import test from 'node:test';
import assert from 'node:assert/strict';
import { JOURNAL, RUBRIC_KEYS, SIX_DEGREES, BONUS_CHAIN } from '../src/data/journal.ts';
import { SOURCES } from '../src/data/sources.ts';
import { GAME, secretScareCount } from '../src/data/game.ts';

test('every rubric bullet has exactly one short, sourced fact card', () => {
  assert.equal(RUBRIC_KEYS.length, 10, 'the assignment has 10 information bullets');
  const ids = new Set(SOURCES.map(source => source.id));
  for (const key of RUBRIC_KEYS) {
    const cards = JOURNAL.filter(card => card.key === key);
    assert.equal(cards.length, 1, `${key} has one card`);
    const [card] = cards;
    assert.ok(card.title && card.line && card.rubric, `${key} has a title, a line and a rubric label`);
    assert.ok(card.points.length <= 4, `${key} keeps to four points or fewer`);
    for (const point of card.points) assert.ok(point.length <= 60, `"${point}" is short enough to read from the back`);
    assert.ok(card.line.length <= 80, `${key}'s line is short`);
    assert.ok(card.sources.length > 0 && card.sources.every(id => ids.has(id)), `${key} cites known sources`);
    assert.doesNotMatch(JSON.stringify(card), /TODO|lorem/i);
  }
  assert.deepEqual(JOURNAL.map(card => card.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('the cards name the species, its status and its habitat', () => {
  const text = key => JSON.stringify(JOURNAL.find(card => card.key === key));
  assert.match(text('name'), /Mountain chicken/);
  assert.match(text('name'), /Leptodactylus fallax/);
  assert.match(text('status'), /Critically Endangered/);
  assert.match(text('habitat'), /Dominica/);
  assert.match(text('habitat'), /forest/);
  assert.match(text('niche'), /consumer/);
});

test('six degrees runs from YOU to the frog through five connections, plus a bonus chain', () => {
  assert.equal(SIX_DEGREES.length, 7);
  assert.equal(SIX_DEGREES[0].step, 'YOU');
  assert.equal(SIX_DEGREES.at(-1).step, 'FROG');
  assert.ok(BONUS_CHAIN.length >= 4);
});

test('one game mode that fits a 10-minute presentation', () => {
  assert.ok(GAME.seconds >= 120 && GAME.seconds <= 180, `the game lasts ${GAME.seconds}s`);
  assert.equal(GAME.rules.length, 3, 'three simple rules');
  let last = 0;
  for (const event of GAME.events) {
    assert.ok(event.at > last && event.at < GAME.seconds, `${event.title} happens in order, during the game`);
    last = event.at;
  }
  assert.ok(GAME.events.some(event => event.kind === 'hunter' && event.at < 15), 'humans show up early');
  assert.ok(GAME.secretScare.from > 0 && GAME.secretScare.to < GAME.seconds - 20, 'the secret scare happens mid-game');
});

test('the secret scare only ever reaches a handful of phones', () => {
  assert.equal(secretScareCount(0), 0);
  assert.equal(secretScareCount(1), 1);
  assert.equal(secretScareCount(3), 1);
  assert.equal(secretScareCount(5), 2);
  for (const phones of [9, 20, 30, 60]) assert.equal(secretScareCount(phones), 3);
});

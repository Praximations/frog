import test from 'node:test';
import assert from 'node:assert/strict';
import { JOURNAL, RUBRIC_KEYS, SIX_DEGREES, BONUS_CHAIN } from '../src/data/journal.ts';
import { SOURCES } from '../src/data/sources.ts';
import { GAME, ROUNDS, BOOSTS, questionTimes } from '../src/data/game.ts';
import { QUESTIONS, pickQuestions } from '../src/data/quiz.ts';

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

test('three short rounds, each with its own danger and a fact card after it', () => {
  assert.deepEqual(ROUNDS.map(round => round.number), [1, 2, 3]);
  const total = ROUNDS.reduce((sum, round) => sum + round.seconds + round.questions * (GAME.quizSeconds + GAME.revealSeconds), 0);
  assert.ok(total >= 240 && total <= 420, `the rounds with their quizzes take ${total}s`);
  assert.ok(ROUNDS[0].pigs && ROUNDS[1].hunters.length && ROUNDS[1].traps && ROUNDS[2].fungus, 'pigs, then hunters, then fungus');
  const keys = new Set(RUBRIC_KEYS);
  for (const round of ROUNDS) assert.ok(keys.has(round.info), `${round.title} shows a real fact card`);
  assert.equal(new Set(ROUNDS.map(round => round.info)).size, ROUNDS.length);
  assert.equal(GAME.rules.length, 4);
  for (const boost of Object.values(BOOSTS)) assert.ok(boost.seconds > 0 && boost.label && boost.text);
});

test('quiz questions: four answers, one right, a sourced fact, enough for every round', () => {
  const ids = new Set(SOURCES.map(source => source.id));
  assert.equal(new Set(QUESTIONS.map(question => question.id)).size, QUESTIONS.length, 'unique ids');
  for (const question of QUESTIONS) {
    assert.match(question.id, /^[a-z0-9-]{1,24}$/);
    assert.equal(question.answers.length, 4);
    assert.equal(new Set(question.answers).size, 4, `${question.id} has four different answers`);
    assert.ok(question.correct >= 0 && question.correct <= 3);
    assert.ok(question.fact.length > 20 && question.fact.length <= 140, `${question.id}'s fact is short`);
    assert.ok(question.sources.every(id => ids.has(id)), `${question.id} cites known sources`);
  }
  for (const round of ROUNDS) {
    const pool = QUESTIONS.filter(question => question.round === round.id);
    assert.ok(pool.length >= round.questions + 2, `${round.id} has enough questions to vary between games`);
    const picked = pickQuestions(round.id, round.questions);
    assert.equal(new Set(picked.map(question => question.id)).size, round.questions);
  }
  const topics = new Set(QUESTIONS.map(question => question.topic));
  for (const topic of ['Name', 'Status', 'Habitat', 'Physical description', 'Niche', 'Reasons it is endangered', 'Importance', 'Support', 'Six degrees of separation']) assert.ok(topics.has(topic), `a question about ${topic}`);
  // The right answer isn't always in the same place.
  assert.ok(new Set(QUESTIONS.map(question => question.correct)).size === 4);
});

test('quiz questions pop up in the middle of a round, spread out', () => {
  for (const round of ROUNDS) {
    for (const random of [() => 0, () => .5, () => .999]) {
      const times = questionTimes(round, random);
      assert.equal(times.length, round.questions);
      assert.ok(times.every(time => time > 5 && time < round.seconds - 5), `${round.id}: ${times}`);
      assert.ok(times.every((time, i) => i === 0 || time - times[i - 1] >= 10), 'questions are spread out');
    }
  }
});

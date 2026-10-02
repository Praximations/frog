import test from 'node:test';
import assert from 'node:assert/strict';
import { JOURNAL, RUBRIC_KEYS, SIX_DEGREES } from '../src/data/journal.ts';
import { SOURCES } from '../src/data/sources.ts';
import { CHAPTERS, buildSteps } from '../src/data/chapters.ts';
import { QUESTIONS } from '../src/data/quiz.ts';

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

test('each card is presented by the chapter that claims it', () => {
  const claimed = CHAPTERS.flatMap(chapter => chapter.journal);
  assert.deepEqual([...claimed].sort(), [...RUBRIC_KEYS].sort(), 'chapters present every card once');
  for (const card of JOURNAL) assert.ok(CHAPTERS.find(chapter => chapter.number === card.chapter).journal.includes(card.key));
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

test('one quiz per chapter with valid, varied answers', () => {
  assert.deepEqual(QUESTIONS.map(item => item.chapter), [1, 2, 3, 4, 5]);
  for (const item of QUESTIONS) {
    assert.equal(item.options.length, 4);
    assert.ok(item.correct >= 0 && item.correct <= 3);
    assert.ok(item.seconds >= 10);
  }
  assert.ok(new Set(QUESTIONS.map(item => item.correct)).size >= 3, 'the right answer is not always in the same spot');
  assert.equal(buildSteps(true).length, 11);
  assert.deepEqual(buildSteps(false).map(step => step.kind), ['chapter', 'chapter', 'chapter', 'chapter', 'chapter', 'finale']);
});

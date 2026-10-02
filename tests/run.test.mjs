import test from 'node:test';
import assert from 'node:assert/strict';
import { Run } from '../src/systems/run.ts';
import { quizPoints, leaderboard } from '../src/systems/scoring.ts';

test('the run advances chapter → quiz → … → finale and stops there', () => {
  const run = new Run();
  run.reset(true);
  assert.deepEqual(run.current, { kind: 'chapter', chapter: 1 });
  assert.deepEqual(run.advance(), { kind: 'quiz', chapter: 1 });
  for (let i = 0; i < 20; i++) run.advance();
  assert.equal(run.current.kind, 'finale');
  assert.equal(run.chapterNumber, 6);
});

test('presenter jumps keep the journal complete for skipped chapters', () => {
  const run = new Run();
  run.reset(true);
  run.jumpTo(run.steps.findIndex(step => step.kind === 'chapter' && step.chapter === 4));
  for (const key of ['name', 'status', 'habitat', 'physical', 'picture', 'niche', 'threats']) assert.ok(run.journal.has(key), key);
  assert.ok(!run.journal.has('support'));
  assert.ok(!run.complete);
  assert.equal(run.unlock('support'), true);
  assert.equal(run.unlock('support'), false);
});

test('turning quizzes off keeps the current chapter', () => {
  const run = new Run();
  run.reset(true);
  run.jumpTo(4); // chapter 3
  run.setQuizzes(false);
  assert.deepEqual(run.current, { kind: 'chapter', chapter: 3 });
  run.setQuizzes(true);
  assert.deepEqual(run.current, { kind: 'chapter', chapter: 3 });
});

test('quiz points reward correct, fast answers and streaks', () => {
  assert.equal(quizPoints(false, 0, 20000, 3), 0);
  assert.equal(quizPoints(true, 0, 20000, 1), 1000);
  assert.equal(quizPoints(true, 20000, 20000, 1), 500);
  assert.equal(quizPoints(true, 99999, 20000, 1), 500);
  assert.equal(quizPoints(true, 10000, 20000, 3), 950);
  assert.equal(quizPoints(true, 0, 20000, 50), 1500);
});

test('leaderboard ranks by score and shares ranks on ties', () => {
  const players = [
    { id: 'a', name: 'Zoe', score: 900 }, { id: 'b', name: 'Ali', score: 900 }, { id: 'c', name: 'Max', score: 1200 }, { id: 'd', name: 'Ivy', score: 0 },
  ];
  assert.deepEqual(leaderboard(players).map(item => [item.name, item.rank]), [['Max', 1], ['Ali', 2], ['Zoe', 2], ['Ivy', 4]]);
});

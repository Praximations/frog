import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, pickColor, textOn, ranking, botsNeeded, addPoints, quizPoints } from '../src/systems/match.ts';

test('the first 20 players all get different colours, then colours are shared evenly', () => {
  const used = [];
  for (let i = 0; i < COLORS.length; i++) used.push(pickColor(used));
  assert.equal(new Set(used).size, COLORS.length);
  const next = pickColor(used);
  assert.ok(next >= 0 && next < COLORS.length);
  assert.equal(new Set(COLORS.map(color => color.name)).size, COLORS.length, 'colour names are unique');
});

test('name tags pick readable text colours', () => {
  assert.equal(textOn('#ffffff'), '#1d1712');
  assert.equal(textOn('#2a2a2a'), '#ffffff');
});

test('ranking shares tied places and leaves computer frogs off the podium', () => {
  const ranks = ranking([
    { id: 'a', name: 'Zoe', score: 9 }, { id: 'b', name: 'Ali', score: 9 },
    { id: 'c', name: 'Max', score: 12 }, { id: 'w', name: 'Wild Frog', score: 50, bot: true },
  ]);
  assert.deepEqual(ranks.map(item => [item.name, item.rank]), [['Max', 1], ['Ali', 2], ['Zoe', 2]]);
});

test('computer frogs only join small games, and scores never go negative', () => {
  assert.equal(botsNeeded(0), 3);
  assert.equal(botsNeeded(2), 1);
  assert.equal(botsNeeded(30), 0);
  assert.equal(addPoints(2, -3), 0);
  assert.equal(addPoints(2, 5), 7);
});

test('quiz answers score 10 plus a speed bonus of up to 5', () => {
  assert.equal(quizPoints(false, 14, 15), 0);
  assert.equal(quizPoints(true, 15, 15), 15);
  assert.equal(quizPoints(true, 0, 15), 10);
  assert.equal(quizPoints(true, 7.5, 15), 13);
});

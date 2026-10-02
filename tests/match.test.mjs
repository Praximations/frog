import test from 'node:test';
import assert from 'node:assert/strict';
import { pickTeam, teamSizes, teamTotals, winner, ranking, botsNeeded, addPoints } from '../src/systems/match.ts';

test('new players balance the two teams', () => {
  const members = [];
  for (let i = 0; i < 7; i++) members.push({ team: pickTeam(members) });
  assert.deepEqual(teamSizes(members), [4, 3]);
  assert.equal(pickTeam([{ team: 0 }, { team: 0 }]), 1);
  assert.equal(pickTeam([]), 0);
});

test('team totals, winners and draws', () => {
  const members = [{ team: 0, score: 5 }, { team: 1, score: 9 }, { team: 0, score: 6 }];
  assert.deepEqual(teamTotals(members), [11, 9]);
  assert.equal(winner([11, 9]), 0);
  assert.equal(winner([3, 8]), 1);
  assert.equal(winner([4, 4]), -1);
});

test('ranking shares tied places and leaves computer frogs off the podium', () => {
  const ranks = ranking([
    { id: 'a', name: 'Zoe', team: 0, score: 9 }, { id: 'b', name: 'Ali', team: 1, score: 9 },
    { id: 'c', name: 'Max', team: 0, score: 12 }, { id: 'w', name: 'Wild Frog', team: 1, score: 50, bot: true },
  ]);
  assert.deepEqual(ranks.map(item => [item.name, item.rank]), [['Max', 1], ['Ali', 2], ['Zoe', 2]]);
});

test('computer frogs only fill empty teams, and scores never go negative', () => {
  assert.deepEqual(botsNeeded([0, 0]), [2, 2]);
  assert.deepEqual(botsNeeded([1, 3]), [1, 0]);
  assert.deepEqual(botsNeeded([12, 11]), [0, 0]);
  assert.equal(addPoints(2, -3), 0);
  assert.equal(addPoints(2, 5), 7);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { CheckpointSystem } from '../src/systems/CheckpointSystem.ts';

test('retry restores position, energy and captured prey without sharing mutable state', () => {
  const checkpoints = new CheckpointSystem();
  const snapshot = { stage: 2, eaten: 3, energy: 87, position: { x: 880, y: 550 }, caught: [0, 2, 4] };
  checkpoints.capture(snapshot); snapshot.position.x = 1; snapshot.caught.push(1);
  const restored = checkpoints.restore();
  assert.deepEqual(restored, { stage: 2, eaten: 3, energy: 87, position: { x: 880, y: 550 }, caught: [0, 2, 4] });
  restored.position.y = 0; restored.caught.length = 0;
  assert.equal(checkpoints.restore().position.y, 550); assert.equal(checkpoints.restore().caught.length, 3);
});
test('presenter navigation bounds checkpoints and restores completed prerequisites', () => {
  const checkpoints = new CheckpointSystem();
  assert.equal(checkpoints.move(-1).stage, 0);
  checkpoints.move(1);
  const stream = checkpoints.move(1);
  assert.equal(stream.eaten, 3); assert.deepEqual(stream.caught, [0, 1, 2]);
  checkpoints.move(1); checkpoints.move(1);
  assert.equal(checkpoints.move(1).stage, 4); assert.equal(checkpoints.name, 'Explore');
  assert.throws(() => checkpoints.capture({ stage: 50 }), /Invalid checkpoint/);
});

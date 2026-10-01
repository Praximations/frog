import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createHostServer } from './index.mjs';

function peer(url) {
  const socket = new WebSocket(url);
  const queue = [], waiting = [];
  socket.on('message', data => {
    const message = JSON.parse(data);
    const index = waiting.findIndex(item => item.type === message.type);
    if (index < 0) queue.push(message);
    else { const [item] = waiting.splice(index, 1); clearTimeout(item.timer); item.resolve(message); }
  });
  return {
    socket,
    send: value => socket.send(JSON.stringify(value)),
    next: type => {
      const index = queue.findIndex(message => message.type === type);
      if (index >= 0) return Promise.resolve(queue.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 2000);
        waiting.push({ type, resolve, timer });
      });
    },
  };
}

test('real code pairing, input relay, one-controller limit, state and disconnect recovery', async t => {
  const server = createHostServer();
  await new Promise(resolve => server.http.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const url = `ws://127.0.0.1:${server.http.address().port}/session`;
  const host = peer(url), controller = peer(url), replacement = peer(url);
  await Promise.all([host, controller, replacement].map(item => once(item.socket, 'open')));

  host.send({ type: 'host' });
  const { code } = await host.next('hosted');
  assert.match(code, /^\d{6}$/);
  controller.send({ type: 'join', code: 'bad-code' });
  assert.match((await controller.next('error')).message, /not active/);
  controller.send({ type: 'join', code });
  assert.equal((await controller.next('joined')).state.mode, 'lobby');
  assert.equal((await host.next('controller')).connected, true);
  replacement.send({ type: 'join', code });
  assert.match((await replacement.next('error')).message, /already has a controller/);

  controller.send({ type: 'input', input: { x: 1, y: -1, hop: true, interact: false, pause: false } });
  assert.deepEqual((await host.next('input')).input, { x: 1, y: -1, hop: true, interact: false, pause: false });
  // A controller cannot overwrite the authoritative game state.
  controller.send({ type: 'state', state: { mode: 'paused', objective: 'Invalid controller update' } });
  host.send({ type: 'state', state: { mode: 'playing', objective: 'Inspect the clearing board' } });
  assert.deepEqual((await controller.next('state')).state, { mode: 'playing', objective: 'Inspect the clearing board' });
  assert.equal(server.rooms.get(code).state.mode, 'playing');

  controller.socket.close(); await once(controller.socket, 'close');
  assert.equal((await host.next('controller')).connected, false);
  assert.deepEqual((await host.next('input')).input, { x: 0, y: 0, hop: false, interact: false, pause: false });
  replacement.send({ type: 'join', code });
  assert.equal((await replacement.next('joined')).state.mode, 'playing');
  assert.equal((await host.next('controller')).connected, true);
  host.socket.close(); await once(host.socket, 'close');
  assert.equal((await replacement.next('ended')).type, 'ended');
  assert.equal(server.rooms.size, 0);
});

test('serves the production game and refuses paths outside dist', async t => {
  const server = createHostServer();
  await new Promise(resolve => server.http.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.http.address().port}`;
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Mountain Chicken/);
  assert.equal((await fetch(`${base}/%2e%2e%2fpackage.json`)).status, 403);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});

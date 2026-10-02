import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createHostServer } from './index.mjs';
import { cleanName } from './relay.mjs';

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
    /** Resolves true when no message of this type arrives within the window. */
    quiet: async (type, ms = 150) => {
      await new Promise(resolve => setTimeout(resolve, ms));
      return !queue.some(message => message.type === type);
    },
  };
}

async function start(t) {
  const server = createHostServer();
  await new Promise(resolve => server.http.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return { server, url: `ws://127.0.0.1:${server.http.address().port}/session`, base: `http://127.0.0.1:${server.http.address().port}` };
}

async function connect(url, count) {
  const peers = Array.from({ length: count }, () => peer(url));
  await Promise.all(peers.map(item => once(item.socket, 'open')));
  return peers;
}

test('a class joins with a code and nicknames; joysticks and reactions reach the host', async t => {
  const { server, url } = await start(t);
  const [host, ana, ben, twin] = await connect(url, 4);
  host.send({ type: 'host' });
  const { code } = await host.next('hosted');
  assert.match(code, /^\d{6}$/);

  ana.send({ type: 'join', code: '000000', name: 'Ana' });
  assert.match((await ana.next('error')).message, /not active/);
  ana.send({ type: 'join', code, name: '   ' });
  assert.match((await ana.next('error')).message, /nickname/);
  ana.send({ type: 'join', code, name: '  Ana\u0000 <b>Frog</b>  ' });
  const joined = await ana.next('joined');
  assert.equal(joined.name, 'Ana bFrog/b');
  assert.equal(joined.state.mode, 'lobby');
  assert.deepEqual(await host.next('player'), { type: 'player', event: 'join', id: joined.id, name: 'Ana bFrog/b' });

  ben.send({ type: 'join', code, name: 'Ben' });
  const benJoined = await ben.next('joined');
  await host.next('player');
  twin.send({ type: 'join', code, name: 'BEN' });
  assert.equal((await twin.next('joined')).name, 'BEN 2', 'duplicate nicknames get a number');
  await host.next('player');

  host.send({ type: 'state', state: { mode: 'round', round: 'feast', title: 'Feeding frenzy' } });
  assert.equal((await ana.next('state')).state.round, 'feast');
  assert.equal((await ben.next('state')).state.mode, 'round');
  // Players cannot overwrite the host's state, and unknown modes are refused.
  ana.send({ type: 'state', state: { mode: 'final' } });
  host.send({ type: 'state', state: { mode: 'quiz' } });
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(server.rooms.get(code).state.mode, 'round');

  // Every player steers their own frog.
  ana.send({ type: 'input', input: { x: 0.70711, y: -0.70711 } });
  assert.deepEqual(await host.next('input'), { type: 'input', id: joined.id, input: { x: 0.71, y: -0.71 } });
  ben.send({ type: 'input', input: { x: -1, y: 0 } });
  assert.deepEqual(await host.next('input'), { type: 'input', id: benJoined.id, input: { x: -1, y: 0 } });
  ben.send({ type: 'input', input: { x: 3, y: 0 } });
  ben.send({ type: 'input', input: 'left' });
  assert.ok(await host.quiet('input'), 'out-of-range or malformed input is dropped');

  ben.send({ type: 'react', emoji: '🐸' });
  assert.deepEqual(await host.next('react'), { type: 'react', id: benJoined.id, emoji: '🐸' });
  ben.send({ type: 'react', emoji: '<script>' });
  assert.ok(await host.quiet('react'), 'unknown reactions are dropped');

  host.send({ type: 'to', id: joined.id, data: { kind: 'caught' } });
  assert.deepEqual((await ana.next('private')).data, { kind: 'caught' });
  assert.ok(await ben.quiet('private'), 'private messages only reach their player');
});

test('rejoin with token keeps the same frog; kick and host shutdown', async t => {
  const { server, url } = await start(t);
  const [host, ana, other] = await connect(url, 3);
  host.send({ type: 'host' });
  const { code } = await host.next('hosted');
  ana.send({ type: 'join', code, name: 'Ana' });
  const anaJoin = await ana.next('joined');
  other.send({ type: 'join', code, name: 'Other' });
  const otherJoin = await other.next('joined');
  await host.next('player'); await host.next('player');

  // A locked phone drops and rejoins with its token: same id, so the host keeps its frog and score.
  ana.socket.close(); await once(ana.socket, 'close');
  assert.equal((await host.next('player')).event, 'leave');
  const [back] = await connect(url, 1);
  back.send({ type: 'join', code, token: anaJoin.token });
  const rejoined = await back.next('joined');
  assert.equal(rejoined.id, anaJoin.id);
  assert.equal((await host.next('player')).id, anaJoin.id);

  host.send({ type: 'kick', id: otherJoin.id });
  assert.equal((await other.next('kicked')).type, 'kicked');
  assert.deepEqual(await host.next('player'), { type: 'player', event: 'removed', id: otherJoin.id });
  assert.equal(server.rooms.get(code).players.size, 1);

  host.socket.close(); await once(host.socket, 'close');
  assert.equal((await back.next('ended')).type, 'ended');
  await once(back.socket, 'close');
  assert.equal(server.rooms.size, 0);
});

test('nickname cleaning', () => {
  assert.equal(cleanName('  Sneaky   Cricket  '), 'Sneaky Cricket');
  assert.equal(cleanName('a'.repeat(40)).length, 16);
  assert.equal(cleanName('🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸'), '🐸'.repeat(16));
  assert.equal(cleanName('\u202eevil'), 'evil');
  assert.equal(cleanName(42), '');
});

test('serves the production game, reports join addresses, and refuses paths outside dist', async t => {
  const { base } = await start(t);
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Mountain Chicken/);
  const info = await (await fetch(`${base}/api/info`)).json();
  assert.ok(Array.isArray(info.addresses));
  assert.equal((await fetch(`${base}/%2e%2e%2fpackage.json`)).status, 403);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});

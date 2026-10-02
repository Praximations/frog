import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createHostServer } from './index.mjs';
import { cleanName } from './relay.mjs';
import { validLook, cleanMove } from './shared.mjs';

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

test('a class joins with a code, nicknames and frog looks; moves, snapshots and reactions flow', async t => {
  const { server, url } = await start(t);
  const [host, ana, ben, twin] = await connect(url, 4);
  host.send({ type: 'host' });
  const { code } = await host.next('hosted');
  assert.match(code, /^\d{6}$/);

  ana.send({ type: 'join', code: '000000', name: 'Ana' });
  assert.match((await ana.next('error')).message, /not active/);
  ana.send({ type: 'join', code, name: '   ' });
  assert.match((await ana.next('error')).message, /nickname/);
  ana.send({ type: 'join', code, name: '  Ana\u0000 <b>Frog</b>  ', look: '2.5.13' });
  const joined = await ana.next('joined');
  assert.equal(joined.name, 'Ana bFrog/b');
  assert.equal(joined.state.mode, 'lobby');
  assert.deepEqual(await host.next('player'), { type: 'player', event: 'join', id: joined.id, name: 'Ana bFrog/b', look: '2.5.13' });

  ben.send({ type: 'join', code, name: 'Ben', look: '9.9.99' });
  const benJoined = await ben.next('joined');
  assert.equal((await host.next('player')).look, '0.0.0', 'an unknown look falls back to the classic frog');
  twin.send({ type: 'join', code, name: 'BEN' });
  assert.equal((await twin.next('joined')).name, 'BEN 2', 'duplicate nicknames get a number');
  await host.next('player');

  host.send({ type: 'state', state: { mode: 'round', round: 'feast', title: 'Feeding frenzy' } });
  assert.equal((await ana.next('state')).state.round, 'feast');
  assert.equal((await ben.next('state')).state.mode, 'round');
  // Players cannot overwrite the host's state, and unknown modes are refused.
  ana.send({ type: 'state', state: { mode: 'final' } });
  host.send({ type: 'state', state: { mode: 'dance' } });
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(server.rooms.get(code).state.mode, 'round');

  // Every player moves their own frog and says where it is.
  ana.send({ type: 'move', x: 812.4, y: 400.6, f: 3, m: 1, s: 2 });
  assert.deepEqual(await host.next('move'), { type: 'move', id: joined.id, x: 812, y: 401, f: 3, m: 1, s: 2 });
  ben.send({ type: 'move', x: 100, y: 1300, f: 0, m: 0, s: 1, extra: 'ignored' });
  assert.deepEqual(await host.next('move'), { type: 'move', id: benJoined.id, x: 100, y: 1300, f: 0, m: 0, s: 1 });
  ben.send({ type: 'move', x: 99999, y: 0, f: 0, m: 0, s: 1 });
  ben.send({ type: 'move', x: 10, y: 10, f: 7, m: 0, s: 1 });
  ben.send({ type: 'move', x: 'left' });
  assert.ok(await host.quiet('move'), 'out-of-range or malformed moves are dropped');

  // The host's world snapshots reach every player, but players can't send them.
  const world = { f: [[joined.id, 812, 401, 7, 0, 2, 5]], b: [[1, 0, 300, 300]] };
  host.send({ type: 'world', w: world });
  assert.deepEqual((await ana.next('world')).w, world);
  assert.deepEqual((await ben.next('world')).w, world);
  ana.send({ type: 'world', w: { f: [] } });
  host.send({ type: 'world', w: { junk: 'x'.repeat(30000) } });
  assert.ok(await ben.quiet('world'), 'players and oversized snapshots are refused');

  ben.send({ type: 'react', emoji: '🐸' });
  assert.deepEqual(await host.next('react'), { type: 'react', id: benJoined.id, emoji: '🐸' });
  ben.send({ type: 'react', emoji: '<script>' });
  assert.ok(await host.quiet('react'), 'unknown reactions are dropped');

  // Quiz answers and "find me" taps reach the host; malformed answers don't.
  ana.send({ type: 'answer', q: 'main-food', choice: 2 });
  assert.deepEqual(await host.next('answer'), { type: 'answer', id: joined.id, q: 'main-food', choice: 2 });
  await new Promise(resolve => setTimeout(resolve, 220));
  ana.send({ type: 'answer', q: 'main-food', choice: 7 });
  ana.send({ type: 'answer', q: '<b>', choice: 1 });
  assert.ok(await host.quiet('answer', 250), 'invalid answers are dropped');
  ben.send({ type: 'ping' });
  assert.deepEqual(await host.next('ping'), { type: 'ping', id: benJoined.id });
  ben.send({ type: 'ping' });
  assert.ok(await host.quiet('ping'), '"find me" is rate-limited');

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

test('frog looks and moves are checked', () => {
  assert.ok(validLook('0.0.0') && validLook('5.7.19'));
  for (const look of ['6.0.0', '0.8.0', '0.0.20', '1.2', 'a.b.c', 3, null]) assert.ok(!validLook(look), `${look} is refused`);
  assert.deepEqual(cleanMove({ x: 1.6, y: 2, f: 1, m: 0, s: 0 }), { x: 2, y: 2, f: 1, m: 0, s: 0 });
  for (const move of [{ x: -1, y: 0, f: 0, m: 0, s: 0 }, { x: 0, y: 0, f: 0, m: 2, s: 0 }, { x: 0, y: 0, f: 0, m: 0, s: 1.5 }, { x: NaN, y: 0, f: 0, m: 0, s: 0 }]) assert.equal(cleanMove(move), null);
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

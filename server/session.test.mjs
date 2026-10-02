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

test('a class joins with a PIN and nicknames; answers, reactions and bugs reach the host', async t => {
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

  host.send({ type: 'state', state: { mode: 'quiz', round: 1, options: ['a', 'b', 'c', 'd'] } });
  assert.equal((await ana.next('state')).state.round, 1);
  assert.equal((await ben.next('state')).state.mode, 'quiz');
  // Players cannot overwrite the host's state.
  ana.send({ type: 'state', state: { mode: 'podium' } });
  assert.equal(server.rooms.get(code).state.mode, 'quiz');

  ana.send({ type: 'answer', round: 1, choice: 2 });
  assert.deepEqual(await host.next('answer'), { type: 'answer', id: joined.id, round: 1, choice: 2 });
  ana.send({ type: 'answer', round: 1, choice: 9 });
  assert.ok(await host.quiet('answer'), 'out-of-range choices are dropped');

  ben.send({ type: 'react', emoji: '🐸' });
  assert.deepEqual(await host.next('react'), { type: 'react', id: benJoined.id, emoji: '🐸' });
  ben.send({ type: 'react', emoji: '<script>' });
  ben.send({ type: 'bug' });
  assert.deepEqual(await host.next('bug'), { type: 'bug', id: benJoined.id });
  assert.ok(await host.quiet('react'), 'unknown reactions and rapid repeats are dropped');

  host.send({ type: 'to', id: joined.id, data: { correct: true, points: 950 } });
  assert.deepEqual((await ana.next('private')).data, { correct: true, points: 950 });
  assert.ok(await ben.quiet('private'), 'private results only reach their player');
});

test('pilot input, rejoin with token, kick, and host shutdown', async t => {
  const { server, url } = await start(t);
  const [host, pilot, other] = await connect(url, 3);
  host.send({ type: 'host' });
  const { code } = await host.next('hosted');
  pilot.send({ type: 'join', code, name: 'Pilot' });
  const pilotJoin = await pilot.next('joined');
  other.send({ type: 'join', code, name: 'Other' });
  const otherJoin = await other.next('joined');
  await host.next('player'); await host.next('player');

  pilot.send({ type: 'input', input: { x: 1, y: 0, hop: true, interact: false } });
  assert.ok(await host.quiet('input'), 'non-pilots cannot drive the frog');
  host.send({ type: 'pilot', id: pilotJoin.id });
  assert.equal((await pilot.next('pilot')).active, true);
  pilot.send({ type: 'input', input: { x: 1, y: -1, hop: true, interact: false, pause: false } });
  assert.deepEqual((await host.next('input')).input, { x: 1, y: -1, hop: true, interact: false, pause: false });
  other.send({ type: 'input', input: { x: -1, y: 0 } });
  assert.ok(await host.quiet('input'));

  // A dropped phone keeps its identity and pilot seat when it rejoins with its token.
  pilot.socket.close(); await once(pilot.socket, 'close');
  assert.deepEqual((await host.next('input')).input, { x: 0, y: 0, hop: false, interact: false, pause: false });
  assert.equal((await host.next('player')).event, 'leave');
  const [back] = await connect(url, 1);
  back.send({ type: 'join', code, token: pilotJoin.token });
  const rejoined = await back.next('joined');
  assert.equal(rejoined.id, pilotJoin.id);
  assert.equal(rejoined.pilot, true);
  assert.equal((await host.next('player')).id, pilotJoin.id);

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

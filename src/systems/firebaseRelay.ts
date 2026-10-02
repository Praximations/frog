import { initializeApp, getApps } from '@firebase/app';
import {
  getDatabase, goOffline, goOnline, ref, get, set, update, remove, push, runTransaction, onDisconnect,
  onValue, onChildAdded, onChildChanged, type Database, type DataSnapshot, type Unsubscribe,
} from '@firebase/database';
import { cleanName, uniqueName, validAnswer, validLook, cleanMove, PLAYERS_PER_ROOM, REACTIONS, WORLD_BYTES } from '../../server/shared.mjs';
import { FIREBASE_PROJECT } from './link';

/**
 * The class relay on top of the Firebase Realtime Database, for when the game runs on Firebase
 * Hosting. It speaks exactly the same messages as server/relay.mjs and looks like a WebSocket,
 * so ClassHost and ClassPlayer don't need to know which one they have. The projector does the
 * relay's checks itself (names, limits, kicking). Data lives under rooms/<code>/:
 *
 *   host       {at}               claimed by the projector; removed when it disconnects
 *   state      PhoneState         what every phone shows
 *   world      string (JSON)      the projector's latest snapshot of the map (several times a second)
 *   players/id {name, online, look} written by each phone; the projector may fix the name
 *   moves/id   {x, y, f, m, s}    where each phone's own frog is
 *   inbox/id/* PrivateMessage     projector → one phone
 *   events/*   {id, type, …}      phone → projector: reactions, quiz answers, "find me"
 *   kicked/id  true               projector removed this phone
 */
type Message = { type: string; [key: string]: unknown };

const CONNECTING = 0, OPEN = 1, CLOSED = 3;
const STATE_BYTES = 3000;
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), byte => byte.toString(16).padStart(2, '0')).join('');

/** Writes only the newest value: while one write is on its way, later ones wait and replace each other. */
class Latest<T> {
  private busy = false;
  private waiting: { value: T } | null = null;
  constructor(private readonly write: (value: T) => Promise<unknown>) {}
  push(value: T): void { this.waiting = { value }; if (!this.busy) void this.flush(); }
  private async flush(): Promise<void> {
    this.busy = true;
    while (this.waiting) {
      const { value } = this.waiting; this.waiting = null;
      try { await this.write(value); } catch { /* the next value replaces it */ }
    }
    this.busy = false;
  }
}

function database(databaseURL: string): Database {
  const app = getApps().find(item => item.name === 'frog') ?? initializeApp({ databaseURL, projectId: FIREBASE_PROJECT }, 'frog');
  const db = getDatabase(app);
  goOnline(db);
  return db;
}

/** Fails if the database doesn't answer in time (for example, it was never created). */
function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

abstract class FirebaseSocket extends EventTarget {
  readyState = CONNECTING;
  protected listeners: Unsubscribe[] = [];
  private connected = false;

  constructor(protected readonly db: Database) {
    super();
    // Like a real WebSocket: "open" fires after the caller has attached its listeners.
    setTimeout(() => { if (this.readyState !== CONNECTING) return; this.readyState = OPEN; this.dispatchEvent(new Event('open')); }, 0);
    this.listeners.push(onValue(ref(db, '.info/connected'), snapshot => { this.connected = snapshot.val() === true; if (this.connected) this.onConnected(); }));
  }

  protected emit(message: Message): void {
    if (this.readyState === OPEN) this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
  }

  send(text: string): void {
    if (this.readyState !== OPEN) return;
    let message: Message;
    try { message = JSON.parse(text); } catch { return; }
    this.handle(message).catch(() => this.emit({ type: 'error', message: this.connected ? 'Something went wrong. Try again.' : 'Could not reach the game. Check your internet connection.' }));
  }

  close(): void {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    for (const off of this.listeners) off();
    this.listeners = [];
    // Offline (or the database doesn't exist): stop retrying. Otherwise tidy up our data.
    if (this.connected) void this.cleanup(); else goOffline(this.db);
    this.dispatchEvent(new Event('close'));
  }

  protected onConnected(): void { /* subclasses re-register presence */ }
  protected abstract handle(message: Message): Promise<void>;
  protected abstract cleanup(): Promise<void>;
}

/** The projector's side: owns the room. */
class HostSocket extends FirebaseSocket {
  private code = '';
  private players = new Map<string, { name: string; online: boolean; look: string }>();
  private lastEvent = new Map<string, number>();
  private world = new Latest<string>(text => set(ref(this.db, this.path('world')), text));
  private path(sub = ''): string { return `rooms/${this.code}${sub ? `/${sub}` : ''}`; }

  protected async handle(message: Message): Promise<void> {
    if (message.type === 'host' && !this.code) await this.claim();
    if (!this.code) return;
    if (message.type === 'world') {
      const text = JSON.stringify(message.w ?? null);
      if (message.w && typeof message.w === 'object' && text.length <= WORLD_BYTES) this.world.push(text);
    } else if (message.type === 'state') {
      if (JSON.stringify(message.state ?? null).length <= STATE_BYTES) await set(ref(this.db, this.path('state')), message.state);
    } else if (message.type === 'to') {
      const id = String(message.id);
      if (this.players.has(id) && message.data && typeof message.data === 'object') await push(ref(this.db, this.path(`inbox/${id}`)), message.data);
    } else if (message.type === 'kick') await this.kick(String(message.id));
  }

  /** Picks a free six-digit code and claims it. */
  private async claim(): Promise<void> {
    for (let tries = 0; tries < 20 && !this.code; tries++) {
      const code = String(100000 + Math.floor(Math.random() * 900000));
      const result = await within(runTransaction(ref(this.db, `rooms/${code}/host`), current => current === null ? { at: Date.now() } : undefined, { applyLocally: false }), 10000);
      if (result.committed) this.code = code;
    }
    if (!this.code) throw new Error('No free code');
    if (this.readyState !== OPEN) { await remove(ref(this.db, this.path())); return; }
    await onDisconnect(ref(this.db, this.path())).remove();
    await set(ref(this.db, this.path('state')), { mode: 'lobby' });
    const players = ref(this.db, this.path('players'));
    this.listeners.push(
      onChildAdded(players, snapshot => this.player(snapshot)),
      onChildChanged(players, snapshot => this.player(snapshot)),
      onChildAdded(ref(this.db, this.path('moves')), snapshot => this.move(snapshot)),
      onChildChanged(ref(this.db, this.path('moves')), snapshot => this.move(snapshot)),
      onChildAdded(ref(this.db, this.path('events')), snapshot => this.event(snapshot)),
    );
    this.emit({ type: 'hosted', code: this.code });
  }

  private player(snapshot: DataSnapshot): void {
    const id = snapshot.key!;
    const value = snapshot.val() as { name?: unknown; online?: unknown; look?: unknown } | null;
    if (!value || typeof value.name !== 'string') return;
    const online = value.online === true;
    const known = this.players.get(id);
    if (!known) {
      if (this.players.size >= PLAYERS_PER_ROOM) { void this.kick(id, false); return; }
      const name = uniqueName([...this.players.values()].map(player => player.name), cleanName(value.name) || 'Frog');
      const look = validLook(value.look) ? value.look : '0.0.0';
      this.players.set(id, { name, online, look });
      if (name !== value.name) void update(ref(this.db, this.path(`players/${id}`)), { name });
      if (online) this.emit({ type: 'player', event: 'join', id, name, look });
      return;
    }
    if (value.name !== known.name) void update(ref(this.db, this.path(`players/${id}`)), { name: known.name });
    if (online !== known.online) {
      known.online = online;
      this.emit(online ? { type: 'player', event: 'join', id, name: known.name, look: known.look } : { type: 'player', event: 'leave', id });
    }
  }

  private move(snapshot: DataSnapshot): void {
    const id = snapshot.key!;
    const move = cleanMove(snapshot.val());
    if (move && this.players.has(id)) this.emit({ type: 'move', id, ...move });
  }

  /** Reactions, quiz answers and "find me" taps, checked like the class server checks them. */
  private event(snapshot: DataSnapshot): void {
    const value = (snapshot.val() ?? {}) as { id?: unknown; type?: unknown; emoji?: unknown; q?: unknown; choice?: unknown };
    void remove(snapshot.ref);
    const id = String(value.id ?? ''), type = String(value.type ?? '');
    if (!this.players.has(id)) return;
    const key = `${id}:${type}`, now = Date.now();
    if (now - (this.lastEvent.get(key) ?? 0) < (type === 'ping' ? 1000 : 200)) return;
    if (type === 'react' && REACTIONS.includes(String(value.emoji))) this.emit({ type: 'react', id, emoji: String(value.emoji) });
    else if (type === 'answer' && validAnswer(value)) this.emit({ type: 'answer', id, q: value.q, choice: value.choice });
    else if (type === 'ping') this.emit({ type: 'ping', id });
    else return;
    this.lastEvent.set(key, now);
  }

  private async kick(id: string, announce = true): Promise<void> {
    this.players.delete(id);
    await update(ref(this.db, this.path()), { [`kicked/${id}`]: true, [`players/${id}`]: null, [`moves/${id}`]: null, [`inbox/${id}`]: null });
    if (announce) this.emit({ type: 'player', event: 'removed', id });
  }

  protected async cleanup(): Promise<void> {
    if (!this.code) return;
    await onDisconnect(ref(this.db, this.path())).cancel().catch(() => undefined);
    await remove(ref(this.db, this.path())).catch(() => undefined);
  }
}

/** A phone's side: joins a room, receives the map and moves its frog. */
class PlayerSocket extends FirebaseSocket {
  private code = '';
  private id = '';
  private name = '';
  private look = '0.0.0';
  private state: unknown = { mode: 'lobby' };
  private gone = false;
  private moves = new Latest<object>(move => set(ref(this.db, this.path(`moves/${this.id}`)), move));
  private path(sub: string): string { return `rooms/${this.code}/${sub}`; }

  protected async handle(message: Message): Promise<void> {
    if (message.type === 'join' && !this.id) await this.join(String(message.code ?? ''), message.name, message.look, typeof message.token === 'string' ? message.token : '');
    if (!this.id) return;
    if (message.type === 'move') {
      const move = cleanMove(message);
      if (move) this.moves.push(move);
    } else if (message.type === 'react' && REACTIONS.includes(String(message.emoji))) {
      await push(ref(this.db, this.path('events')), { id: this.id, type: 'react', emoji: String(message.emoji) });
    } else if (message.type === 'answer' && validAnswer(message)) {
      await push(ref(this.db, this.path('events')), { id: this.id, type: 'answer', q: message.q, choice: message.choice });
    } else if (message.type === 'ping') {
      await push(ref(this.db, this.path('events')), { id: this.id, type: 'ping' });
    }
  }

  private async join(code: string, rawName: unknown, look: unknown, token: string): Promise<void> {
    if (!/^\d{6}$/.test(code) || !(await within(get(ref(this.db, `rooms/${code}/host`)), 10000)).exists()) {
      this.emit({ type: 'error', message: 'That code is not active. Check the big screen.' });
      return;
    }
    this.code = code;
    const rejoin = /^[0-9a-f]{12}$/.test(token) ? await get(ref(this.db, this.path(`players/${token}`))) : null;
    if (rejoin?.exists()) {
      this.id = token;
      this.name = String(rejoin.val().name);
      this.look = validLook(rejoin.val().look) ? rejoin.val().look : '0.0.0';
    } else {
      this.look = validLook(look) ? look : '0.0.0';
      this.name = cleanName(rawName);
      if (!this.name) { this.code = ''; this.emit({ type: 'error', message: 'Type a nickname first.' }); return; }
      this.id = randomId();
    }
    await this.present();
    this.state = (await get(ref(this.db, this.path('state')))).val() ?? { mode: 'lobby' };
    const joined = () => this.emit({ type: 'joined', code, id: this.id, name: this.name, token: this.id, state: this.state });
    joined();
    const leave = (type: 'kicked' | 'ended') => { if (this.gone) return; this.gone = true; this.emit({ type }); this.close(); };
    this.listeners.push(
      onValue(ref(this.db, this.path('state')), snapshot => { if (snapshot.exists()) { this.state = snapshot.val(); this.emit({ type: 'state', state: this.state }); } }),
      onValue(ref(this.db, this.path('world')), snapshot => {
        if (typeof snapshot.val() !== 'string') return;
        try { this.emit({ type: 'world', w: JSON.parse(snapshot.val()) }); } catch { /* ignored */ }
      }),
      onValue(ref(this.db, this.path(`players/${this.id}/name`)), snapshot => {
        // The projector may add " 2" to a name that's already taken.
        if (typeof snapshot.val() === 'string' && snapshot.val() !== this.name) { this.name = snapshot.val(); joined(); }
      }),
      onChildAdded(ref(this.db, this.path(`inbox/${this.id}`)), snapshot => { this.emit({ type: 'private', data: snapshot.val() }); void remove(snapshot.ref); }),
      onValue(ref(this.db, this.path(`kicked/${this.id}`)), snapshot => { if (snapshot.val() === true) leave('kicked'); }),
      onValue(ref(this.db, this.path('host')), snapshot => { if (!snapshot.exists()) leave('ended'); }),
    );
  }

  /** Marks this phone online now, and offline automatically if it disconnects. */
  private async present(): Promise<void> {
    // The record must exist first: the rules check disconnect writes when they're registered.
    await update(ref(this.db, this.path(`players/${this.id}`)), { name: this.name, online: true, look: this.look });
    await onDisconnect(ref(this.db, this.path(`players/${this.id}/online`))).set(false);
    await onDisconnect(ref(this.db, this.path(`moves/${this.id}`))).remove();
  }

  protected onConnected(): void {
    // Back from a dropped connection (a locked phone, a Wi-Fi blip): say we're here again.
    if (this.id && this.readyState === OPEN) void this.present().catch(() => undefined);
  }

  protected async cleanup(): Promise<void> {
    if (!this.id) return;
    await onDisconnect(ref(this.db, this.path(`players/${this.id}/online`))).cancel().catch(() => undefined);
    await onDisconnect(ref(this.db, this.path(`moves/${this.id}`))).cancel().catch(() => undefined);
    if (!this.gone) await update(ref(this.db, this.path(`players/${this.id}`)), { online: false }).catch(() => undefined);
  }
}

export function firebaseSocket(role: 'host' | 'player', databaseURL: string): WebSocket {
  const db = database(databaseURL);
  return (role === 'host' ? new HostSocket(db) : new PlayerSocket(db)) as unknown as WebSocket;
}

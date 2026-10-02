import { initializeApp, getApps } from '@firebase/app';
import {
  getDatabase, goOffline, goOnline, ref, get, set, update, remove, push, runTransaction, onDisconnect,
  onValue, onChildAdded, onChildChanged, type Database, type DataSnapshot, type Unsubscribe,
} from '@firebase/database';
import { cleanName, uniqueName, PLAYERS_PER_ROOM, REACTIONS } from '../../server/shared.mjs';
import { FIREBASE_PROJECT } from './link';

/**
 * The class relay on top of the Firebase Realtime Database, for when the game runs on Firebase
 * Hosting. It speaks exactly the same messages as server/relay.mjs and looks like a WebSocket,
 * so ClassHost and ClassPlayer don't need to know which one they have. The projector does the
 * relay's checks itself (names, limits, kicking). Data lives under rooms/<code>/:
 *
 *   host       {at}               claimed by the projector; removed when it disconnects
 *   state      PhoneState         what every phone shows
 *   players/id {name, online}     written by each phone; the projector may fix the name
 *   inputs/id  {x, y, n}          each phone's joystick (n changes every send)
 *   inbox/id/* PrivateMessage     projector → one phone
 *   reactions/*{id, emoji}        phone → projector
 *   kicked/id  true               projector removed this phone
 */
type Message = { type: string; [key: string]: unknown };

const CONNECTING = 0, OPEN = 1, CLOSED = 3;
const STATE_BYTES = 3000;
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), byte => byte.toString(16).padStart(2, '0')).join('');
const round = (value: unknown) => Math.round(Math.max(-1, Math.min(1, Number(value) || 0)) * 100) / 100;

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
  private players = new Map<string, { name: string; online: boolean }>();
  private lastReact = new Map<string, number>();
  private path(sub = ''): string { return `rooms/${this.code}${sub ? `/${sub}` : ''}`; }

  protected async handle(message: Message): Promise<void> {
    if (message.type === 'host' && !this.code) await this.claim();
    if (!this.code) return;
    if (message.type === 'state') {
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
      onChildAdded(ref(this.db, this.path('inputs')), snapshot => this.input(snapshot)),
      onChildChanged(ref(this.db, this.path('inputs')), snapshot => this.input(snapshot)),
      onChildAdded(ref(this.db, this.path('reactions')), snapshot => this.reaction(snapshot)),
    );
    this.emit({ type: 'hosted', code: this.code });
  }

  private player(snapshot: DataSnapshot): void {
    const id = snapshot.key!;
    const value = snapshot.val() as { name?: unknown; online?: unknown } | null;
    if (!value || typeof value.name !== 'string') return;
    const online = value.online === true;
    const known = this.players.get(id);
    if (!known) {
      if (this.players.size >= PLAYERS_PER_ROOM) { void this.kick(id, false); return; }
      const name = uniqueName([...this.players.values()].map(player => player.name), cleanName(value.name) || 'Frog');
      this.players.set(id, { name, online });
      if (name !== value.name) void update(ref(this.db, this.path(`players/${id}`)), { name });
      if (online) this.emit({ type: 'player', event: 'join', id, name });
      return;
    }
    if (value.name !== known.name) void update(ref(this.db, this.path(`players/${id}`)), { name: known.name });
    if (online !== known.online) {
      known.online = online;
      this.emit(online ? { type: 'player', event: 'join', id, name: known.name } : { type: 'player', event: 'leave', id });
    }
  }

  private input(snapshot: DataSnapshot): void {
    const id = snapshot.key!;
    const value = snapshot.val() as { x?: unknown; y?: unknown } | null;
    if (value && this.players.has(id)) this.emit({ type: 'input', id, input: { x: round(value.x), y: round(value.y) } });
  }

  private reaction(snapshot: DataSnapshot): void {
    const value = snapshot.val() as { id?: unknown; emoji?: unknown } | null;
    void remove(snapshot.ref);
    const id = String(value?.id ?? '');
    if (!this.players.has(id) || !REACTIONS.includes(String(value?.emoji)) || Date.now() - (this.lastReact.get(id) ?? 0) < 250) return;
    this.lastReact.set(id, Date.now());
    this.emit({ type: 'react', id, emoji: String(value!.emoji) });
  }

  private async kick(id: string, announce = true): Promise<void> {
    this.players.delete(id);
    await update(ref(this.db, this.path()), { [`kicked/${id}`]: true, [`players/${id}`]: null, [`inputs/${id}`]: null, [`inbox/${id}`]: null });
    if (announce) this.emit({ type: 'player', event: 'removed', id });
  }

  protected async cleanup(): Promise<void> {
    if (!this.code) return;
    await onDisconnect(ref(this.db, this.path())).cancel().catch(() => undefined);
    await remove(ref(this.db, this.path())).catch(() => undefined);
  }
}

/** A phone's side: joins a room and steers its frog. */
class PlayerSocket extends FirebaseSocket {
  private code = '';
  private id = '';
  private name = '';
  private state: unknown = { mode: 'lobby' };
  private gone = false;
  private sent = 0;
  private lastReact = 0;
  private path(sub: string): string { return `rooms/${this.code}/${sub}`; }

  protected async handle(message: Message): Promise<void> {
    if (message.type === 'join' && !this.id) await this.join(String(message.code ?? ''), message.name, typeof message.token === 'string' ? message.token : '');
    if (!this.id) return;
    if (message.type === 'input') {
      const input = (message.input ?? {}) as { x?: unknown; y?: unknown };
      await set(ref(this.db, this.path(`inputs/${this.id}`)), { x: round(input.x), y: round(input.y), n: ++this.sent });
    } else if (message.type === 'react') {
      if (!REACTIONS.includes(String(message.emoji)) || Date.now() - this.lastReact < 250) return;
      this.lastReact = Date.now();
      await push(ref(this.db, this.path('reactions')), { id: this.id, emoji: String(message.emoji) });
    }
  }

  private async join(code: string, rawName: unknown, token: string): Promise<void> {
    if (!/^\d{6}$/.test(code) || !(await within(get(ref(this.db, `rooms/${code}/host`)), 10000)).exists()) {
      this.emit({ type: 'error', message: 'That code is not active. Check the big screen.' });
      return;
    }
    this.code = code;
    const rejoin = /^[0-9a-f]{12}$/.test(token) ? await get(ref(this.db, this.path(`players/${token}`))) : null;
    if (rejoin?.exists()) {
      this.id = token;
      this.name = String(rejoin.val().name);
    } else {
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
    await update(ref(this.db, this.path(`players/${this.id}`)), { name: this.name, online: true });
    await onDisconnect(ref(this.db, this.path(`players/${this.id}/online`))).set(false);
    await onDisconnect(ref(this.db, this.path(`inputs/${this.id}`))).remove();
  }

  protected onConnected(): void {
    // Back from a dropped connection (a locked phone, a Wi-Fi blip): say we're here again.
    if (this.id && this.readyState === OPEN) void this.present().catch(() => undefined);
  }

  protected async cleanup(): Promise<void> {
    if (!this.id) return;
    await onDisconnect(ref(this.db, this.path(`players/${this.id}/online`))).cancel().catch(() => undefined);
    await onDisconnect(ref(this.db, this.path(`inputs/${this.id}`))).cancel().catch(() => undefined);
    if (!this.gone) await update(ref(this.db, this.path(`players/${this.id}`)), { online: false }).catch(() => undefined);
  }
}

export function firebaseSocket(role: 'host' | 'player', databaseURL: string): WebSocket {
  const db = database(databaseURL);
  return (role === 'host' ? new HostSocket(db) : new PlayerSocket(db)) as unknown as WebSocket;
}

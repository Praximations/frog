import { openLink, type Link, type LinkKind } from './link';

/** A quiz question as phones see it (the right answer is only sent at the reveal). */
export interface QuizView { q: string; question: string; answers: string[]; seconds: number }

/**
 * What every phone shows. The relay forwards this object unchanged.
 * intro = "how to play"; round = playing; quiz/reveal = a question; results = between rounds;
 * learn = the host is showing fact cards; final = the end.
 */
export type PhoneState =
  | { mode: 'lobby' }
  | { mode: 'intro'; title: string; goal: string }
  | { mode: 'round'; round: number; rounds: number; title: string; goal: string }
  | ({ mode: 'quiz' } & QuizView)
  | { mode: 'reveal'; q: string; correct: number; answer: string; fact: string }
  | { mode: 'results'; title: string }
  | { mode: 'learn'; title: string }
  | { mode: 'final' }
  | { mode: 'paused' };

export type BoostKind = 'speed' | 'tongue' | 'double' | 'shield';

/** One-player messages. */
export type PrivateMessage =
  | { kind: 'you'; name: string; color: string; colorName: string }
  | { kind: 'score'; score: number }
  | { kind: 'caught'; scare: boolean; by: 'hunter' | 'trap' | 'pig' }
  | { kind: 'shock' }
  | { kind: 'boost'; boost: BoostKind; seconds: number }
  | { kind: 'sick'; sick: boolean }
  | { kind: 'result'; q: string; correct: boolean; points: number }
  | { kind: 'final'; rank: number; of: number; score: number };

/** Things a player does that reach the projector. */
export type PlayerEvent =
  | { type: 'react'; id: string; name: string; emoji: string }
  | { type: 'answer'; id: string; q: string; choice: number }
  | { type: 'ping'; id: string };

export interface ClassPlayerInfo { id: string; name: string; online: boolean }
type Listener = (event: { type: 'join' | 'leave' | 'removed' | 'status'; id?: string }) => void;
type EventHandler = (event: PlayerEvent) => void;

/** The projector's side of class mode: join code, roster and every phone's joystick. */
class ClassHost {
  code = '';
  connected = false;
  /** null until we know whether a class server exists here. */
  available: boolean | null = null;
  error = '';
  joinAddress = '';
  players = new Map<string, ClassPlayerInfo>();
  /** Class server or Firebase, once connected. */
  kind: LinkKind = 'server';
  private generation = 0;
  private opening = false;
  private inputs = new Map<string, { x: number; y: number; at: number }>();
  private socket?: WebSocket;
  private listeners = new Set<Listener>();
  private eventHandlers = new Set<EventHandler>();

  subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onEvent(handler: EventHandler): () => void { this.eventHandlers.add(handler); return () => this.eventHandlers.delete(handler); }
  private emit(type: 'join' | 'leave' | 'removed' | 'status', id?: string): void { this.listeners.forEach(listener => listener({ type, id })); }

  /** Creates a room if a class server (or Firebase) is reachable; otherwise the game runs on this computer only. */
  async open(): Promise<void> {
    if (this.connected || this.socket || this.opening) return;
    this.error = '';
    this.opening = true;
    const generation = ++this.generation;
    let link: Link;
    try { link = await openLink('host'); }
    catch { this.opening = false; this.available = false; this.error = 'No class server here.'; this.emit('status'); return; }
    this.opening = false;
    if (generation !== this.generation) { link.socket.close(); return; } // closed while connecting
    const { socket, kind } = link;
    this.socket = socket; this.kind = kind;
    const unreachable = kind === 'firebase' ? 'Phones can\'t join yet: the Firebase Realtime Database isn\'t set up (see README).' : 'No class server here.';
    await new Promise<void>(resolve => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; clearTimeout(timeout); resolve(); } };
      const timeout = window.setTimeout(() => { this.fail(socket, unreachable); socket.close(); finish(); }, kind === 'firebase' ? 12000 : 5000);
      socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'host' })));
      socket.addEventListener('error', () => { this.fail(socket, unreachable); finish(); });
      socket.addEventListener('close', () => {
        if (this.socket !== socket) return;
        this.fail(socket, this.connected ? 'Lost the connection. Phones can no longer join; the game keeps running.' : unreachable);
        finish();
      });
      socket.addEventListener('message', event => {
        if (this.socket !== socket) return;
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        this.handle(message);
        if (message.type === 'hosted' || message.type === 'error') finish();
      });
    });
    if (!this.connected && this.socket === socket) { this.fail(socket, kind === 'firebase' ? unreachable : this.error || unreachable); socket.close(); }
    if (this.connected) await this.findJoinAddress();
    this.emit('status');
  }

  private fail(socket: WebSocket, message: string): void {
    if (this.socket !== socket) return;
    this.socket = undefined;
    this.available = !!this.code;
    this.connected = false;
    this.error = message;
    this.inputs.clear();
    for (const player of this.players.values()) player.online = false;
    this.emit('status');
  }

  private async findJoinAddress(): Promise<void> {
    const path = location.pathname.replace(/index\.html$/, '');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) { this.joinAddress = `${location.origin}${path}`; return; }
    try {
      const info = await (await fetch('/api/info', { cache: 'no-store' })).json();
      this.joinAddress = Array.isArray(info.addresses) && typeof info.addresses[0] === 'string' ? `${info.addresses[0]}${path}` : '';
    } catch { this.joinAddress = ''; }
  }

  get joinLink(): string { return this.joinAddress ? `${this.joinAddress}#join=${this.code}` : ''; }

  private handle(message: { type: string; [key: string]: unknown }): void {
    if (message.type === 'hosted') {
      this.code = String(message.code); this.connected = true; this.available = true;
      this.emit('status');
    } else if (message.type === 'error') {
      this.error = String(message.message || 'Class server error.');
      this.emit('status');
    } else if (message.type === 'player') {
      const id = String(message.id);
      if (message.event === 'join') {
        const existing = this.players.get(id);
        if (existing) existing.online = true;
        else this.players.set(id, { id, name: String(message.name), online: true });
        this.emit('join', id);
      } else if (message.event === 'leave') {
        const player = this.players.get(id); if (player) player.online = false;
        this.inputs.delete(id);
        this.emit('leave', id);
      } else if (message.event === 'removed') {
        this.players.delete(id); this.inputs.delete(id);
        this.emit('removed', id);
      }
    } else if (message.type === 'input') {
      const input = message.input as { x: number; y: number };
      this.inputs.set(String(message.id), { x: input.x, y: input.y, at: performance.now() });
    } else if (message.type === 'react' || message.type === 'answer' || message.type === 'ping') {
      const player = this.players.get(String(message.id));
      if (!player) return;
      const event: PlayerEvent = message.type === 'react' ? { type: 'react', id: player.id, name: player.name, emoji: String(message.emoji) }
        : message.type === 'answer' ? { type: 'answer', id: player.id, q: String(message.q), choice: Number(message.choice) }
          : { type: 'ping', id: player.id };
      this.eventHandlers.forEach(handler => handler(event));
    }
  }

  /** The joystick direction for a phone, or zero if it has gone quiet (locked screen, dropped Wi-Fi). */
  input(id: string): { x: number; y: number } {
    const input = this.inputs.get(id);
    if (!input || performance.now() - input.at > 1500) return { x: 0, y: 0 };
    return input;
  }

  private send(value: unknown): void { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(value)); }
  publish(state: PhoneState): void { this.send({ type: 'state', state }); }
  sendTo(id: string, data: PrivateMessage): void { this.send({ type: 'to', id, data }); }
  kick(id: string): void { this.send({ type: 'kick', id }); this.players.delete(id); this.inputs.delete(id); this.emit('removed', id); }

  close(): void {
    this.generation++; this.opening = false;
    const socket = this.socket; this.socket = undefined;
    socket?.close();
    this.connected = false; this.code = ''; this.players.clear(); this.inputs.clear(); this.available = null;
    this.emit('status');
  }
}

export const classHost = new ClassHost();

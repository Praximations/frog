import type { Team } from './match';

/** What phones are told to show. The relay forwards this object unchanged. */
export type PhoneState =
  | { mode: 'lobby' }
  | { mode: 'learn'; title: string }
  | { mode: 'intro' | 'round'; title: string; goal: string }
  | { mode: 'results'; title: string; winner: Team | -1 }
  | { mode: 'final'; winner: Team | -1 }
  | { mode: 'paused' };

/** One-player messages: your team, your score, "you were caught", final placing. */
export type PrivateMessage =
  | { kind: 'you'; team: Team }
  | { kind: 'score'; score: number; round: number }
  | { kind: 'caught'; scare: boolean }
  | { kind: 'final'; rank: number; of: number; score: number; team: Team; won: boolean };

export interface ClassPlayerInfo { id: string; name: string; online: boolean }
type Listener = (event: { type: 'join' | 'leave' | 'removed' | 'status'; id?: string }) => void;
type ReactHandler = (value: { id: string; name: string; emoji: string }) => void;

export const socketUrl = (): string => `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/session`;

/** The projector's side of class mode: join code, roster and every phone's joystick. */
class ClassHost {
  code = '';
  connected = false;
  /** null until we know whether a class server exists here. */
  available: boolean | null = null;
  error = '';
  joinAddress = '';
  players = new Map<string, ClassPlayerInfo>();
  private inputs = new Map<string, { x: number; y: number; at: number }>();
  private socket?: WebSocket;
  private listeners = new Set<Listener>();
  private reactHandlers = new Set<ReactHandler>();

  subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onReact(handler: ReactHandler): () => void { this.reactHandlers.add(handler); return () => this.reactHandlers.delete(handler); }
  private emit(type: 'join' | 'leave' | 'removed' | 'status', id?: string): void { this.listeners.forEach(listener => listener({ type, id })); }

  /** Creates a room if a class server is reachable; otherwise the game runs on this computer only. */
  async open(): Promise<void> {
    if (this.connected || this.socket) return;
    this.error = '';
    const socket = new WebSocket(socketUrl());
    this.socket = socket;
    await new Promise<void>(resolve => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; clearTimeout(timeout); resolve(); } };
      const timeout = window.setTimeout(() => { this.fail(socket, 'No class server here.'); socket.close(); finish(); }, 5000);
      socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'host' })));
      socket.addEventListener('error', () => { this.fail(socket, 'No class server here.'); finish(); });
      socket.addEventListener('close', () => {
        if (this.socket !== socket) return;
        this.fail(socket, this.connected ? 'Lost the class server. Phones can no longer join; the game keeps running.' : 'No class server here.');
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
    } else if (message.type === 'react') {
      const player = this.players.get(String(message.id));
      if (player) this.reactHandlers.forEach(handler => handler({ id: player.id, name: player.name, emoji: String(message.emoji) }));
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
    const socket = this.socket; this.socket = undefined;
    socket?.close();
    this.connected = false; this.code = ''; this.players.clear(); this.inputs.clear(); this.available = null;
    this.emit('status');
  }
}

export const classHost = new ClassHost();

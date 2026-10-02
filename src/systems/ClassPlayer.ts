import type { PhoneState, PrivateMessage } from './ClassHost';
import { openLink, type Link } from './link';
import type { Team } from './match';

type Listener = (message?: PrivateMessage) => void;
const STORE = 'mountain-chicken-player';

/** A classmate's phone: joins with the code and nickname, then steers its own frog. */
class ClassPlayer {
  id = '';
  name = '';
  code = '';
  connected = false;
  error = '';
  ended = false;
  state: PhoneState = { mode: 'lobby' };
  team: Team | null = null;
  score = 0;
  final?: Extract<PrivateMessage, { kind: 'final' }>;
  private token = '';
  private socket?: WebSocket;
  private listeners = new Set<Listener>();
  private retry?: number;
  private generation = 0;

  subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit(message?: PrivateMessage): void { this.listeners.forEach(listener => listener(message)); }

  /** A saved seat from this tab, so a locked phone can rejoin and keep its frog. */
  saved(): { code: string; token: string; name: string } | null {
    try { const value = JSON.parse(sessionStorage.getItem(STORE) || 'null'); return value?.code && value?.token ? value : null; } catch { return null; }
  }

  async join(code: string, name: string, token = ''): Promise<void> {
    this.close(false);
    this.error = ''; this.ended = false;
    const generation = ++this.generation;
    let link: Link;
    try { link = await openLink('player'); }
    catch { this.error = 'Could not load the game. Check your internet connection.'; this.emit(); throw new Error(this.error); }
    if (generation !== this.generation) { link.socket.close(); throw new Error('Cancelled'); }
    const { socket, kind } = link;
    this.socket = socket;
    const unreachable = kind === 'firebase' ? 'Could not reach the game. Check your internet connection.' : 'Could not reach the game. Are you on the same Wi-Fi as the projector?';
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (message: string) => {
        if (this.socket !== socket) return;
        this.error = message; this.connected = false; this.emit();
        if (!settled) { settled = true; clearTimeout(timeout); reject(new Error(message)); }
      };
      const timeout = window.setTimeout(() => { fail(unreachable); socket.close(); }, kind === 'firebase' ? 12000 : 7000);
      socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'join', code, name, token: token || undefined })));
      socket.addEventListener('error', () => fail(kind === 'firebase' ? unreachable : 'Could not reach the game. Check the address on the big screen.'));
      socket.addEventListener('close', () => {
        if (this.socket !== socket) return;
        const was = this.connected;
        fail(this.ended ? this.error : 'Connection lost. Reconnecting…');
        if (was && !this.ended) this.scheduleRejoin();
      });
      socket.addEventListener('message', event => {
        if (this.socket !== socket) return;
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'joined') {
          this.id = message.id; this.name = message.name; this.code = message.code; this.token = message.token;
          this.state = message.state; this.connected = true; this.error = '';
          try { sessionStorage.setItem(STORE, JSON.stringify({ code: this.code, token: this.token, name: this.name })); } catch { /* optional */ }
          if (!settled) { settled = true; clearTimeout(timeout); resolve(); }
          this.emit();
        } else if (message.type === 'error') {
          if (!this.connected) { fail(message.message); socket.close(); }
        } else if (message.type === 'state') {
          this.state = message.state; this.emit();
        } else if (message.type === 'private') {
          const data = message.data as PrivateMessage;
          if (data.kind === 'you') this.team = data.team;
          if (data.kind === 'score') this.score = data.score;
          if (data.kind === 'final') { this.final = data; this.score = data.score; this.team = data.team; }
          this.emit(data);
        } else if (message.type === 'kicked' || message.type === 'ended') {
          this.ended = true;
          this.error = message.type === 'kicked' ? 'The host removed you from this game.' : message.reason === 'replaced' ? 'You joined from another tab.' : 'The game has ended. Thanks for playing!';
          try { sessionStorage.removeItem(STORE); } catch { /* optional */ }
          this.emit();
        }
      });
    });
  }

  private scheduleRejoin(): void {
    clearTimeout(this.retry);
    const seat = this.saved();
    if (!seat) return;
    this.retry = window.setTimeout(() => { void this.join(seat.code, seat.name, seat.token).catch(() => this.scheduleRejoin()); }, 2500);
  }

  private send(value: unknown): void { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(value)); }
  steer(x: number, y: number): void { this.send({ type: 'input', input: { x, y } }); }
  react(emoji: string): void { this.send({ type: 'react', emoji }); }

  close(forget = true): void {
    this.generation++;
    clearTimeout(this.retry);
    const socket = this.socket; this.socket = undefined; socket?.close();
    this.connected = false;
    if (forget) try { sessionStorage.removeItem(STORE); } catch { /* optional */ }
  }
}

export const classPlayer = new ClassPlayer();

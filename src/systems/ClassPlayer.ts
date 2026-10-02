import type { MovementInput } from './input';
import { socketUrl, type PhoneState } from './ClassHost';

export interface PrivateMessage { kind: 'summary' | 'locked' | 'result' | 'bug' | 'final'; round?: number; answered?: boolean; correct?: boolean; gain?: number; streak?: number; score?: number; rank?: number; of?: number }
type Listener = () => void;
const STORE = 'mountain-chicken-player';

/** A classmate's phone: joins with PIN + nickname, then answers, reacts and (if chosen) pilots the frog. */
class ClassPlayer {
  id = '';
  name = '';
  code = '';
  connected = false;
  pilot = false;
  error = '';
  ended = false;
  state: PhoneState = { mode: 'lobby' };
  last?: PrivateMessage;
  score = 0;
  rank = 0;
  of = 0;
  answeredRound = -1;
  private token = '';
  private socket?: WebSocket;
  private listeners = new Set<Listener>();
  private retry?: number;

  subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit(): void { this.listeners.forEach(listener => listener()); }

  /** A saved seat from this tab, so a locked phone can rejoin and keep its score. */
  saved(): { code: string; token: string; name: string } | null {
    try { const value = JSON.parse(sessionStorage.getItem(STORE) || 'null'); return value?.code && value?.token ? value : null; } catch { return null; }
  }

  join(code: string, name: string, token = ''): Promise<void> {
    this.close(false);
    this.error = ''; this.ended = false;
    const socket = new WebSocket(socketUrl());
    this.socket = socket;
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (message: string) => {
        if (this.socket !== socket) return;
        this.error = message; this.connected = false; this.emit();
        if (!settled) { settled = true; clearTimeout(timeout); reject(new Error(message)); }
      };
      const timeout = window.setTimeout(() => { fail('Could not reach the game. Are you on the same Wi-Fi as the projector?'); socket.close(); }, 7000);
      socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'join', code, name, token: token || undefined })));
      socket.addEventListener('error', () => fail('Could not reach the game. Check the address on the big screen.'));
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
          this.pilot = !!message.pilot; this.state = message.state; this.connected = true; this.error = '';
          try { sessionStorage.setItem(STORE, JSON.stringify({ code: this.code, token: this.token, name: this.name })); } catch { /* optional */ }
          if (!settled) { settled = true; clearTimeout(timeout); resolve(); }
        } else if (message.type === 'error') {
          if (!this.connected) { fail(message.message); socket.close(); }
        } else if (message.type === 'state') {
          this.state = message.state;
        } else if (message.type === 'private') {
          const data = message.data as PrivateMessage;
          this.last = data;
          if (typeof data.score === 'number') this.score = data.score;
          if (typeof data.rank === 'number') this.rank = data.rank;
          if (typeof data.of === 'number') this.of = data.of;
        } else if (message.type === 'pilot') {
          this.pilot = !!message.active;
        } else if (message.type === 'kicked' || message.type === 'ended') {
          this.ended = true;
          this.error = message.type === 'kicked' ? 'The host removed you from this game.' : message.reason === 'replaced' ? 'You joined from another tab.' : 'The game has ended. Thanks for playing!';
          try { sessionStorage.removeItem(STORE); } catch { /* optional */ }
        }
        this.emit();
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
  answer(round: number, choice: number): void { this.answeredRound = round; this.send({ type: 'answer', round, choice }); this.emit(); }
  react(emoji: string): void { this.send({ type: 'react', emoji }); }
  bug(): void { this.send({ type: 'bug' }); }
  sendInput(input: MovementInput): void { this.send({ type: 'input', input }); }

  close(forget = true): void {
    clearTimeout(this.retry);
    const socket = this.socket; this.socket = undefined; socket?.close();
    this.connected = false; this.pilot = false;
    if (forget) try { sessionStorage.removeItem(STORE); } catch { /* optional */ }
  }
}

export const classPlayer = new ClassPlayer();

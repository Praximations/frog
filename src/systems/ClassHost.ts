import { EMPTY_INPUT, type MovementInput } from './input';
import { BUG_POINTS, leaderboard, quizPoints, type PlayerScore, type Ranked } from './scoring';

/** What phones are told to show. The relay forwards this object unchanged. */
export type PhoneState =
  | { mode: 'lobby' }
  | { mode: 'chapter' | 'card' | 'paused'; chapter: number; title: string; objective: string; bugs?: boolean }
  | { mode: 'quiz'; round: number; question: string; options: string[]; remaining: number }
  | { mode: 'reveal'; round: number; correct: number; options: string[] }
  | { mode: 'overview'; next: string }
  | { mode: 'podium' };

export interface QuizResult { counts: number[]; answered: number; correct: number; gains: Map<string, number> }
type Listener = () => void;
type Handler<T> = (value: T) => void;

export const socketUrl = (): string => `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/session`;

/** The projector's side of class mode: room PIN, roster, scores and pilot input. */
class ClassHost {
  code = '';
  connected = false;
  /** null until we know whether a relay exists here. */
  available: boolean | null = null;
  error = '';
  players = new Map<string, PlayerScore>();
  pilot: string | null = null;
  joinAddress = '';
  private socket?: WebSocket;
  private listeners = new Set<Listener>();
  private reactHandlers = new Set<Handler<{ id: string; name: string; emoji: string }>>();
  private bugHandlers = new Set<Handler<{ id: string; name: string }>>();
  private remoteInput: MovementInput = { ...EMPTY_INPUT };
  private receivedAt = 0;
  private pending = { interact: false, hop: false, pause: false };
  private quiz?: { round: number; startedAt: number; limitMs: number; correct: number; answers: Map<string, { choice: number; ms: number }> };
  private lastState: PhoneState = { mode: 'lobby' };

  subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onReact(handler: Handler<{ id: string; name: string; emoji: string }>): () => void { this.reactHandlers.add(handler); return () => this.reactHandlers.delete(handler); }
  onBug(handler: Handler<{ id: string; name: string }>): () => void { this.bugHandlers.add(handler); return () => this.bugHandlers.delete(handler); }
  private emit(): void { this.listeners.forEach(listener => listener()); }

  get onlineCount(): number { return [...this.players.values()].filter(player => player.online).length; }
  get hasClass(): boolean { return this.connected && this.players.size > 0; }

  /** Creates a room if a relay is reachable; otherwise the game runs in presenter-only mode. */
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
        const wasConnected = this.connected;
        this.fail(socket, wasConnected ? 'Lost the class server. Phones can no longer join; the game keeps running.' : 'No class server here.');
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
    this.emit();
  }

  private fail(socket: WebSocket, message: string): void {
    if (this.socket !== socket) return;
    this.socket = undefined;
    this.connected = false;
    this.available = this.available === true && this.code ? true : false;
    this.error = message;
    this.remoteInput = { ...EMPTY_INPUT };
    for (const player of this.players.values()) player.online = false;
    this.emit();
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
    } else if (message.type === 'error') {
      this.error = String(message.message || 'Class server error.');
    } else if (message.type === 'player') {
      const id = String(message.id);
      if (message.event === 'join') {
        const existing = this.players.get(id);
        if (existing) existing.online = true;
        else this.players.set(id, { id, name: String(message.name), score: 0, streak: 0, online: true, correct: 0, bugs: 0 });
        // Bring a (re)joining phone up to date.
        this.send({ type: 'to', id, data: this.privateSummary(id) });
      } else if (message.event === 'leave') {
        const player = this.players.get(id); if (player) player.online = false;
      } else if (message.event === 'removed') {
        this.players.delete(id); if (this.pilot === id) this.pilot = null;
      }
    } else if (message.type === 'answer') {
      const id = String(message.id), quiz = this.quiz;
      if (!quiz || message.round !== quiz.round || quiz.answers.has(id) || !this.players.has(id)) return;
      quiz.answers.set(id, { choice: Number(message.choice), ms: performance.now() - quiz.startedAt });
      this.send({ type: 'to', id, data: { kind: 'locked', round: quiz.round } });
    } else if (message.type === 'react') {
      const player = this.players.get(String(message.id));
      if (player) this.reactHandlers.forEach(handler => handler({ id: player.id, name: player.name, emoji: String(message.emoji) }));
      return;
    } else if (message.type === 'bug') {
      const player = this.players.get(String(message.id));
      if (player) this.bugHandlers.forEach(handler => handler({ id: player.id, name: player.name }));
      return;
    } else if (message.type === 'input') {
      const input = message.input as MovementInput;
      if (input.interact && !this.remoteInput.interact) this.pending.interact = true;
      if (input.hop && !this.remoteInput.hop) this.pending.hop = true;
      if (input.pause && !this.remoteInput.pause) this.pending.pause = true;
      this.remoteInput = input; this.receivedAt = performance.now();
      return;
    }
    this.emit();
  }

  private send(value: unknown): void { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(value)); }

  publish(state: PhoneState): void { this.lastState = state; this.send({ type: 'state', state }); }
  get phoneState(): PhoneState { return this.lastState; }

  kick(id: string): void { this.send({ type: 'kick', id }); this.players.delete(id); if (this.pilot === id) this.pilot = null; this.emit(); }

  setPilot(id: string | null): void {
    this.pilot = id; this.remoteInput = { ...EMPTY_INPUT };
    this.send({ type: 'pilot', id }); this.emit();
  }

  /** Pilot phone input, merged with the keyboard every frame. */
  input(): MovementInput {
    if (!this.connected || !this.pilot || performance.now() - this.receivedAt >= 750) {
      this.pending = { interact: false, hop: false, pause: false };
      return { ...EMPTY_INPUT };
    }
    const input = { ...this.remoteInput, interact: this.pending.interact || this.remoteInput.interact, hop: this.pending.hop || this.remoteInput.hop, pause: this.pending.pause || this.remoteInput.pause };
    this.pending = { interact: false, hop: false, pause: false };
    return input;
  }

  startQuiz(round: number, limitMs: number, correct: number): void {
    this.quiz = { round, startedAt: performance.now(), limitMs, correct, answers: new Map() };
  }

  get answerCount(): number { return this.quiz?.answers.size ?? 0; }

  /** Scores the round and tells each phone how it did. */
  finishQuiz(): QuizResult {
    const quiz = this.quiz;
    const result: QuizResult = { counts: [0, 0, 0, 0], answered: 0, correct: 0, gains: new Map() };
    if (!quiz) return result;
    this.quiz = undefined;
    for (const player of this.players.values()) {
      const answer = quiz.answers.get(player.id);
      const right = answer?.choice === quiz.correct;
      if (answer) { result.counts[answer.choice]++; result.answered++; }
      player.streak = right ? player.streak + 1 : 0;
      const gain = quizPoints(right, answer?.ms ?? quiz.limitMs, quiz.limitMs, player.streak);
      if (right) { result.correct++; player.correct++; }
      player.score += gain; result.gains.set(player.id, gain);
    }
    const ranks = this.ranked();
    for (const player of this.players.values()) {
      const answer = quiz.answers.get(player.id);
      this.send({ type: 'to', id: player.id, data: { kind: 'result', round: quiz.round, answered: !!answer, correct: answer?.choice === quiz.correct, gain: result.gains.get(player.id), streak: player.streak, ...this.rankOf(player.id, ranks) } });
    }
    this.emit();
    return result;
  }

  awardBug(id: string): number {
    const player = this.players.get(id);
    if (!player) return 0;
    player.score += BUG_POINTS; player.bugs++;
    this.send({ type: 'to', id, data: { kind: 'bug', gain: BUG_POINTS, ...this.rankOf(id) } });
    this.emit();
    return BUG_POINTS;
  }

  ranked(): Ranked[] { return leaderboard(this.players.values()); }

  private rankOf(id: string, ranks = this.ranked()): { score: number; rank: number; of: number } {
    const entry = ranks.find(item => item.id === id);
    return { score: entry?.score ?? 0, rank: entry?.rank ?? ranks.length, of: ranks.length };
  }

  private privateSummary(id: string): Record<string, unknown> {
    return { kind: 'summary', ...this.rankOf(id) };
  }

  /** Sends everyone their final placing. */
  announcePodium(): void {
    const ranks = this.ranked();
    for (const entry of ranks) this.send({ type: 'to', id: entry.id, data: { kind: 'final', ...this.rankOf(entry.id, ranks) } });
  }

  /** New presentation: keep the room and roster, reset scores. */
  resetScores(): void {
    for (const player of this.players.values()) { player.score = 0; player.streak = 0; player.correct = 0; player.bugs = 0; }
    this.quiz = undefined; this.emit();
  }

  close(): void {
    const socket = this.socket; this.socket = undefined;
    socket?.close();
    this.connected = false; this.code = ''; this.players.clear(); this.pilot = null; this.available = null;
    this.emit();
  }
}

export const classHost = new ClassHost();

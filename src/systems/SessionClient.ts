import { EMPTY_INPUT, MovementInput } from '../entities/Frog';

export interface GameStatus { mode: 'lobby' | 'playing' | 'paused' | 'card'; objective: string }
type Listener = () => void;

class SessionClient {
  code = '';
  role: 'host' | 'controller' | null = null;
  connected = false;
  controllerConnected = false;
  error = '';
  state: GameStatus = { mode: 'lobby', objective: 'Waiting for the main screen to start.' };
  private socket?: WebSocket;
  private listeners = new Set<Listener>();
  private remoteInput: MovementInput = { ...EMPTY_INPUT };
  private receivedAt = 0;
  private pendingInteract = false;
  private pendingHop = false;
  private pendingPause = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }
  private emit(): void { this.listeners.forEach(listener => listener()); }

  async connect(role: 'host' | 'controller', code = ''): Promise<void> {
    this.disconnect(); this.error = ''; this.role = role;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${location.host}/session`);
    this.socket = socket;
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (message: string) => {
        if (this.socket !== socket) return;
        this.error = message; this.connected = false; this.emit();
        if (!settled) { settled = true; clearTimeout(timeout); reject(new Error(message)); }
      };
      const timeout = window.setTimeout(() => { fail('No connection server found. Run npm run host on the main computer, then open its port 3000 address.'); socket.close(); }, 6000);
      socket.addEventListener('open', () => socket.send(JSON.stringify(role === 'host' ? { type: 'host' } : { type: 'join', code })));
      socket.addEventListener('message', event => {
        if (this.socket !== socket) return;
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'hosted' || message.type === 'joined') {
          this.code = message.code; this.connected = true;
          if (message.state) this.state = message.state;
          if (!settled) { settled = true; clearTimeout(timeout); resolve(); }
        } else if (message.type === 'controller') {
          this.controllerConnected = message.connected;
          if (!message.connected) this.remoteInput = { ...EMPTY_INPUT };
        } else if (message.type === 'input') {
          if (message.input.interact && !this.remoteInput.interact) this.pendingInteract = true;
          if (message.input.hop && !this.remoteInput.hop) this.pendingHop = true;
          if (message.input.pause && !this.remoteInput.pause) this.pendingPause = true;
          this.remoteInput = message.input; this.receivedAt = performance.now();
        } else if (message.type === 'state') this.state = message.state;
        else if (message.type === 'error') { fail(message.message); socket.close(); }
        else if (message.type === 'ended') { this.error = 'The main device ended this session. Enter a new code to reconnect.'; this.connected = false; }
        this.emit();
      });
      socket.addEventListener('error', () => fail('Cannot reach the main-device server. Use npm run host and open the address shown in that terminal.'));
      socket.addEventListener('close', () => { if (this.socket === socket) fail(this.error || 'Connection lost. Reconnect to the main device.'); });
    });
  }

  input(): MovementInput {
    if (!this.connected || !this.controllerConnected || performance.now() - this.receivedAt >= 750) {
      this.pendingInteract = this.pendingHop = this.pendingPause = false;
      return { ...EMPTY_INPUT };
    }
    const input = { ...this.remoteInput, interact: this.pendingInteract || this.remoteInput.interact, hop: this.pendingHop || this.remoteInput.hop, pause: this.pendingPause || this.remoteInput.pause };
    this.pendingInteract = this.pendingHop = this.pendingPause = false;
    return input;
  }
  sendInput(input: MovementInput): void { this.send({ type: 'input', input }); }
  publish(state: GameStatus): void { this.state = state; this.send({ type: 'state', state }); }
  private send(value: unknown): void { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(value)); }

  disconnect(): void {
    const previous = this.socket; this.socket = undefined; previous?.close();
    this.connected = false; this.controllerConnected = false; this.role = null; this.code = ''; this.error = '';
    this.remoteInput = { ...EMPTY_INPUT }; this.state = { mode: 'lobby', objective: 'Waiting for the main screen to start.' };
    this.pendingInteract = this.pendingHop = this.pendingPause = false;
    this.emit();
  }
}

export const session = new SessionClient();

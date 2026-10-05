import { settings } from './Settings';

/**
 * All audio is synthesized with Web Audio: no files to download, works offline, and silently does
 * nothing if audio is blocked. Browsers only allow sound after a click or key press (unlock()).
 */
export type Sfx = 'click' | 'hop' | 'tongue' | 'gulp' | 'catch' | 'card' | 'stamp' | 'unlock' | 'hurt' | 'spotted' | 'scare'
  | 'correct' | 'wrong' | 'tick' | 'join' | 'react' | 'whoop' | 'victory' | 'chime' | 'cluck' | 'burp' | 'thud' | 'rumble' | 'trap' | 'shriek' | 'whistle'
  | 'heartbeat' | 'thunder' | 'clank' | 'growl' | 'bubble';
export type Music = 'lobby' | 'forest' | 'game' | 'hunt' | 'finale' | null;

const midi = (note: number) => 440 * 2 ** ((note - 69) / 12);
const chance = (p: number) => Math.random() < p;
const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

interface ToneOptions { type?: OscillatorType; gain?: number; attack?: number; slide?: number; filter?: number; vibrato?: number; dest?: AudioNode; detune?: number }
interface NoiseOptions { gain?: number; type?: BiquadFilterType; freq?: number; slide?: number; q?: number; dest?: AudioNode; attack?: number }

class SoundSystem {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicBus?: GainNode;
  private sfxBus?: GainNode;
  private noiseBuffer?: AudioBuffer;
  private current: Music = null;
  private wanted: Music = null;
  private timer?: number;
  private step = 0;
  private nextTime = 0;
  private beds: { stop(): void }[] = [];

  /** Call from any user gesture. Safe to call repeatedly. */
  unlock(): void {
    try {
      if (!this.ctx) {
        // iPhones: play through the silent switch, like a game would.
        try { const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession; if (session) session.type = 'playback'; } catch { /* optional */ }
        const Context = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Context) return;
        this.ctx = new Context();
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -14; compressor.ratio.value = 6;
        compressor.connect(this.ctx.destination);
        this.master = this.ctx.createGain(); this.master.connect(compressor);
        this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.55; this.musicBus.connect(this.master);
        this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
        const length = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        this.applySettings();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      if (this.wanted !== this.current) this.music(this.wanted);
    } catch { this.ctx = undefined; }
  }

  applySettings(): void {
    if (!this.ctx || !this.master) return;
    const target = settings.sound ? settings.volume : 0;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  get ready(): boolean { return !!this.ctx && this.ctx.state === 'running'; }

  private tone(when: number, freq: number, duration: number, options: ToneOptions = {}): void {
    const ctx = this.ctx!; const t = Math.max(when, ctx.currentTime);
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = options.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (options.detune) osc.detune.value = options.detune;
    if (options.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.slide), t + duration);
    if (options.vibrato) {
      const lfo = ctx.createOscillator(); const depth = ctx.createGain();
      lfo.frequency.value = 7; depth.gain.value = options.vibrato;
      lfo.connect(depth); depth.connect(osc.frequency); lfo.start(t); lfo.stop(t + duration + 0.05);
    }
    const peak = options.gain ?? 0.08; const attack = options.attack ?? 0.005;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    let node: AudioNode = osc;
    if (options.filter) { const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = options.filter; osc.connect(filter); node = filter; }
    node.connect(gain); gain.connect(options.dest || this.sfxBus!);
    osc.start(t); osc.stop(t + duration + 0.02);
  }

  private noise(when: number, duration: number, options: NoiseOptions = {}): void {
    const ctx = this.ctx!; const t = Math.max(when, ctx.currentTime);
    const source = ctx.createBufferSource(); source.buffer = this.noiseBuffer!; source.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = options.type || 'bandpass';
    filter.frequency.setValueAtTime(options.freq || 2000, t);
    if (options.slide) filter.frequency.exponentialRampToValueAtTime(options.slide, t + duration);
    filter.Q.value = options.q ?? 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(options.gain ?? 0.08, t + (options.attack ?? 0.004));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(filter); filter.connect(gain); gain.connect(options.dest || this.sfxBus!);
    source.start(t, Math.random()); source.stop(t + duration + 0.02);
  }

  play(name: Sfx, level = 0): void {
    if (!this.ctx || !settings.sound) return;
    try { this.sfx(name, level, this.ctx.currentTime); } catch { /* audio is optional */ }
  }

  private sfx(name: Sfx, level: number, t: number): void {
    switch (name) {
      case 'click': this.tone(t, 880, 0.05, { gain: 0.05 }); break;
      case 'hop': this.tone(t, 300, 0.08, { type: 'triangle', slide: 560, gain: 0.05 }); break;
      case 'tongue': this.tone(t, 700, 0.07, { slide: 1800, gain: 0.05 }); this.noise(t, 0.05, { type: 'highpass', freq: 4000, gain: 0.04 }); break;
      case 'gulp': this.tone(t, 420, 0.14, { type: 'sine', slide: 110, gain: 0.18 }); break;
      case 'catch': {
        const base = 660 * 1.06 ** Math.min(level, 12);
        this.tone(t, base, 0.08, { type: 'triangle', gain: 0.08 }); this.tone(t + 0.07, base * 1.5, 0.12, { type: 'triangle', gain: 0.08 });
        break;
      }
      case 'card': this.noise(t, 0.16, { freq: 2600, slide: 900, gain: 0.05, q: 0.8 }); this.tone(t + 0.04, 1047, 0.3, { type: 'sine', gain: 0.05 }); this.tone(t + 0.1, 1568, 0.35, { type: 'sine', gain: 0.04 }); break;
      case 'stamp': this.tone(t, 160, 0.14, { type: 'sine', slide: 50, gain: 0.3 }); this.noise(t, 0.08, { type: 'lowpass', freq: 1400, gain: 0.12 }); this.tone(t + 0.12, 1319, 0.35, { type: 'triangle', gain: 0.06 }); break;
      case 'unlock': [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(t + i * 0.06, f, 0.22, { type: 'sine', gain: 0.07 })); break;
      case 'chime': [784, 1175].forEach((f, i) => this.tone(t + i * 0.09, f, 0.4, { type: 'sine', gain: 0.06 })); break;
      case 'hurt': this.tone(t, 260, 0.28, { slide: 90, gain: 0.12 }); this.noise(t, 0.2, { type: 'lowpass', freq: 900, gain: 0.1 }); break;
      case 'spotted': this.tone(t, 1250, 0.1, { type: 'sawtooth', gain: 0.1 }); this.tone(t + 0.11, 1650, 0.25, { type: 'sawtooth', gain: 0.12 }); break;
      case 'scare': {
        // Sudden layered sting: blast of noise, a sliding shriek, and a low hit.
        this.noise(t, 0.9, { type: 'bandpass', freq: 3200, slide: 500, gain: 0.55, q: 0.6 });
        this.tone(t, 980, 0.9, { type: 'sawtooth', slide: 210, gain: 0.32, vibrato: 60 });
        this.tone(t, 1460, 0.75, { type: 'square', slide: 330, gain: 0.16, vibrato: 90, detune: 25 });
        this.tone(t, 90, 0.7, { type: 'sine', slide: 35, gain: 0.6 });
        this.noise(t + 0.05, 1.3, { type: 'lowpass', freq: 400, gain: 0.25 });
        break;
      }
      case 'correct': [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.08, f, 0.25, { type: 'triangle', gain: 0.09 })); break;
      case 'wrong': this.tone(t, 196, 0.45, { type: 'sawtooth', slide: 150, gain: 0.08, filter: 900 }); this.tone(t, 202, 0.45, { type: 'sawtooth', slide: 155, gain: 0.08, filter: 900 }); break;
      case 'tick': this.tone(t, level ? 1700 : 1200, 0.04, { type: 'sine', gain: 0.06 }); break;
      case 'join': this.tone(t, 520 + Math.random() * 200, 0.09, { type: 'sine', slide: 1300, gain: 0.08 }); break;
      case 'react': this.tone(t, 900 + Math.random() * 500, 0.06, { type: 'triangle', gain: 0.035 }); break;
      case 'whoop': this.whoop(t, this.sfxBus!, 0.12); break;
      case 'cluck': {
        // "buk-buk-BAWK"
        [0, 0.11].forEach(dt => this.tone(t + dt, 520 + Math.random() * 60, 0.06, { type: 'square', slide: 380, gain: 0.07, filter: 2200 }));
        this.tone(t + 0.24, 760, 0.2, { type: 'square', slide: 520, gain: 0.08, filter: 2600, vibrato: 30 });
        break;
      }
      case 'burp': this.tone(t, 120, 0.55, { type: 'sawtooth', slide: 70, gain: 0.22, filter: 700, vibrato: 14 }); this.noise(t, 0.4, { type: 'lowpass', freq: 500, gain: 0.08 }); break;
      case 'thud': this.tone(t, 110, 0.3, { type: 'sine', slide: 38, gain: 0.5 }); this.noise(t, 0.18, { type: 'lowpass', freq: 500, gain: 0.25 }); break;
      case 'rumble': this.noise(t, 1.4, { type: 'lowpass', freq: 160, gain: 0.35, attack: 0.35 }); this.tone(t, 46, 1.4, { type: 'sine', gain: 0.3, attack: 0.3, vibrato: 3 }); break;
      case 'trap':
        if (level) { this.tone(t, 1900, 0.04, { type: 'square', gain: 0.08 }); this.noise(t, 0.12, { type: 'highpass', freq: 3000, gain: 0.12 }); this.tone(t, 150, 0.2, { type: 'sine', slide: 60, gain: 0.3 }); }
        else this.noise(t, 0.1, { type: 'bandpass', freq: 900, gain: 0.1, q: 3 });
        break;
      case 'shriek': {
        // The secret scare: as loud and harsh as Web Audio gets, then it cuts off.
        this.noise(t, 1.5, { type: 'bandpass', freq: 2600, slide: 1300, gain: 1, q: 0.5 });
        this.tone(t, 1250, 1.5, { type: 'sawtooth', slide: 820, gain: 0.6, vibrato: 55 });
        this.tone(t, 1330, 1.4, { type: 'sawtooth', slide: 870, gain: 0.5, vibrato: 70, detune: 30 });
        this.tone(t, 640, 1.3, { type: 'square', slide: 400, gain: 0.35, vibrato: 40 });
        this.tone(t, 70, 0.9, { type: 'sine', slide: 34, gain: 1 });
        break;
      }
      case 'whistle': this.tone(t, 1800, 0.18, { type: 'sine', gain: 0.1, vibrato: 60 }); this.tone(t + 0.22, 1800, 0.5, { type: 'sine', gain: 0.1, vibrato: 60 }); break;
      case 'victory': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(t + i * 0.11, f, i === 5 ? 0.8 : 0.16, { type: 'square', gain: 0.06, filter: 3500 })); break;
      case 'heartbeat': this.tone(t, 62, 0.12, { type: 'sine', slide: 40, gain: 0.5 }); this.tone(t + 0.18, 56, 0.14, { type: 'sine', slide: 36, gain: 0.4 }); break;
      case 'thunder': this.noise(t, 0.12, { type: 'highpass', freq: 2000, gain: 0.25 }); this.noise(t + 0.05, 2.4, { type: 'lowpass', freq: 220, slide: 90, gain: 0.5, attack: 0.08 }); break;
      case 'clank': this.tone(t, 330, 0.18, { type: 'square', slide: 220, gain: 0.08, filter: 1600 }); this.noise(t, 0.12, { freq: 3000, gain: 0.1, q: 2 }); this.tone(t + 0.1, 180, 0.3, { type: 'square', gain: 0.06, filter: 900 }); break;
      case 'growl': this.tone(t, 70, 1.2, { type: 'sawtooth', slide: 52, gain: 0.25, filter: 380, vibrato: 18, attack: 0.15 }); this.noise(t, 1.1, { type: 'lowpass', freq: 300, gain: 0.2, attack: 0.2 }); break;
      case 'bubble': for (let i = 0; i < 4; i++) this.tone(t + i * 0.09 + Math.random() * 0.05, 300 + Math.random() * 300, 0.07, { type: 'sine', slide: 900, gain: 0.08 }); break;
    }
  }

  /** The mountain chicken's loud, rising "whoop". */
  private whoop(t: number, dest: AudioNode, gain: number): void {
    this.tone(t, 260, 0.22, { type: 'sine', slide: 540, gain, vibrato: 12, dest, attack: 0.03 });
    this.tone(t + 0.26, 280, 0.2, { type: 'sine', slide: 560, gain: gain * 0.8, vibrato: 12, dest, attack: 0.03 });
  }

  music(name: Music): void {
    this.wanted = name;
    if (!this.ctx || name === this.current) return;
    this.stopMusic();
    this.current = name;
    if (!name) return;
    this.step = 0; this.nextTime = this.ctx.currentTime + 0.08;
    if (name === 'forest') this.startBed(900, 0.022);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private stopMusic(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = undefined;
    for (const bed of this.beds) bed.stop();
    this.beds = [];
    this.current = null;
  }

  private startBed(freq: number, gain: number): void {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource(); source.buffer = this.noiseBuffer!; source.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = freq;
    const level = ctx.createGain(); level.gain.value = 0.0001;
    level.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 1.5);
    source.connect(filter); filter.connect(level); level.connect(this.musicBus!);
    source.start();
    this.beds.push({ stop: () => { try { level.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3); source.stop(ctx.currentTime + 1.2); } catch { /* stopped */ } } });
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.current) return;
    const bpm = { lobby: 124, finale: 118, forest: 84, game: 136, hunt: 70 }[this.current];
    const sixteenth = 60 / bpm / 4;
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05; // tab was hidden
    while (this.nextTime < ctx.currentTime + 0.12) {
      try { this.playStep(this.current, this.step, this.nextTime, sixteenth); } catch { /* audio is optional */ }
      this.nextTime += sixteenth; this.step++;
    }
  }

  private drum(kind: 'kick' | 'snare' | 'hat', t: number, gain = 1): void {
    const dest = this.musicBus!;
    if (kind === 'kick') this.tone(t, 130, 0.16, { type: 'sine', slide: 42, gain: 0.32 * gain, dest });
    else if (kind === 'snare') this.noise(t, 0.12, { freq: 1900, gain: 0.09 * gain, dest, q: 0.7 });
    else this.noise(t, 0.035, { type: 'highpass', freq: 7500, gain: 0.04 * gain, dest });
  }

  private playStep(track: Exclude<Music, null>, step: number, t: number, sixteenth: number): void {
    const dest = this.musicBus!;
    const pluck = (note: number, gain = 0.05, length = 0.35, type: OscillatorType = 'triangle', to: AudioNode = dest) => this.tone(t, midi(note), length, { type, gain, dest: to });
    if (track === 'lobby' || track === 'finale') {
      const bar = Math.floor(step / 16) % 4, s = step % 16;
      const chords = [[48, [0, 4, 7]], [45, [0, 3, 7]], [41, [0, 4, 7]], [43, [0, 4, 7]]] as const;
      const [root, shape] = chords[bar];
      if ([0, 6, 8, 14].includes(s)) this.tone(t, midi(root - 12 + (s === 6 || s === 14 ? 12 : 0)), sixteenth * 1.8, { gain: 0.07, filter: 700, dest });
      if (s % 2 === 0) pluck(root + 12 + [...shape, 12][(s / 2) % 4], 0.03, 0.18);
      const melody: Record<number, number> = { 0: 76, 2: 79, 4: 81, 6: 79, 8: 76, 12: 72, 14: 74, 16: 76, 18: 76, 20: 74, 22: 72, 24: 69, 28: 72, 30: 74, 32: 72, 34: 77, 36: 81, 38: 79, 40: 77, 44: 76, 46: 77, 48: 79, 52: 74, 54: 71, 56: 67, 60: 69, 62: 71 };
      const note = melody[step % 64];
      if (note && (track === 'lobby' || step >= 64)) this.tone(t, midi(note), sixteenth * 1.7, { gain: 0.035, filter: 2600, dest });
      if (track === 'finale' && step < 64 && s === 0) [60, 64, 67, 72].forEach((n, i) => this.tone(t + i * 0.08, midi(n + 12), 0.5, { gain: 0.04, filter: 3000, dest }));
      if (s === 0 || s === 8) this.drum('kick', t);
      if (s === 4 || s === 12) this.drum('snare', t);
      if (s % 4 === 2) this.drum('hat', t);
    } else if (track === 'forest') {
      const scale = [60, 62, 64, 67, 69, 72, 74, 76];
      if (step % 2 === 0 && chance(0.13)) pluck(pick(scale), 0.035, 0.6, 'sine');
      if (step % 32 === 0) pluck(scale[0] - 12, 0.03, 1.8, 'sine');
      if (chance(0.025)) [2600, 3100, 2800].forEach((f, i) => this.tone(t + i * 0.07, f, 0.06, { type: 'sine', slide: f * 1.25, gain: 0.015, dest }));
      if (chance(0.012)) this.whoop(t, dest, 0.05);
    } else if (track === 'hunt') {
      // Hide From Humans: a low drone, a heartbeat kick, creepy high notes and an owl now and then.
      const s = step % 16;
      if (step % 64 === 0) this.tone(t, midi(33), sixteenth * 64, { type: 'sawtooth', gain: 0.05, filter: 240, attack: 1.2, dest });
      if (s === 0) this.tone(t, 62, 0.12, { type: 'sine', slide: 40, gain: 0.22, dest });
      if (s === 3) this.tone(t, 56, 0.14, { type: 'sine', slide: 36, gain: 0.16, dest });
      if (s % 4 === 2 && chance(0.18)) this.tone(t, midi(pick([82, 83, 87, 88, 94])), 0.9, { type: 'sine', gain: 0.012, vibrato: 7, attack: 0.3, dest });
      if (chance(0.01)) [440, 392].forEach((f, i) => this.tone(t + i * 0.35, f, 0.3, { type: 'sine', gain: 0.03, vibrato: 4, attack: 0.05, dest })); // hoo-hoo
      if (chance(0.03)) this.noise(t, 0.25, { type: 'bandpass', freq: 1800, gain: 0.02, q: 3, dest }); // rustling
    } else if (track === 'game') {
      // Sneaky, driving minor-key groove: A minor, F, G, E.
      const bar = Math.floor(step / 16) % 4, s = step % 16;
      const root = [45, 41, 43, 40][bar];
      if (s % 2 === 0) this.tone(t, midi(root - 12 + (s % 4 === 2 ? 12 : 0)), sixteenth * 1.6, { type: 'sawtooth', gain: 0.05, filter: 600, dest });
      if (s % 4 === 0) this.drum('kick', t);
      if (s === 4 || s === 12) this.drum('snare', t, .8);
      if (s % 2 === 1) this.drum('hat', t, .7);
      const riff: Record<number, number> = { 0: 69, 3: 72, 6: 69, 8: 76, 10: 75, 12: 72, 14: 69 };
      const note = riff[s];
      if (note && step % 64 < 32) this.tone(t, midi(note + (root - 45)), sixteenth * 1.4, { type: 'square', gain: 0.022, filter: 1800, dest });
      if (step % 64 >= 32 && s % 4 === 2 && chance(0.5)) pluck(pick([81, 84, 88, 86]) + (root - 45), 0.02, 0.25, 'triangle');
    }
  }
}

export const sound = new SoundSystem();

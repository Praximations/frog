/** Presenter preferences. Stored per browser; the game works the same if storage is blocked. */
export interface Settings {
  sound: boolean;
  volume: number;
  jumpscares: boolean;
}

const KEY = 'mountain-chicken-settings-v2';
const DEFAULTS: Settings = { sound: true, volume: 0.8, jumpscares: true };

function load(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      sound: typeof saved.sound === 'boolean' ? saved.sound : DEFAULTS.sound,
      volume: typeof saved.volume === 'number' ? Math.max(0, Math.min(1, saved.volume)) : DEFAULTS.volume,
      jumpscares: typeof saved.jumpscares === 'boolean' ? saved.jumpscares : DEFAULTS.jumpscares,
    };
  } catch { return { ...DEFAULTS }; }
}

export const settings: Settings = load();

export function saveSettings(): void {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode */ }
}

export const reducedMotion = (): boolean => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

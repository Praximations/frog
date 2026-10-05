/**
 * Rules shared by the class server (relay.mjs) and the Firebase relay in the browser.
 * Plain JavaScript with no Node imports so both can use it.
 */
export const NAME_LENGTH = 16;
export const PLAYERS_PER_ROOM = 60;
export const REACTIONS = ['🐸', '❤️', '😱', '👏', '🔥', '🦗'];
/** How many frog skins, hats and colours a player can pick from (src/data/looks.ts names them). */
export const LOOKS = { skins: 6, hats: 8, colors: 20 };
/** The map size: player positions must be inside it. */
export const WORLD_SIZE = { width: 3840, height: 2160 };
/** Biggest world snapshot the projector may send (characters of JSON). */
export const WORLD_BYTES = 24000;

/** A quiz answer from a player: the question's id and one of four choices. */
export function validAnswer(message) {
  return !!message && typeof message.q === 'string' && /^[a-z0-9-]{1,24}$/.test(message.q) && Number.isInteger(message.choice) && message.choice >= 0 && message.choice <= 3;
}

/** A frog look: "skin.hat.colour" as numbers, for example "2.5.13". */
export function validLook(look) {
  if (typeof look !== 'string' || !/^\d\.\d\.\d{1,2}$/.test(look)) return false;
  const [skin, hat, color] = look.split('.').map(Number);
  return skin < LOOKS.skins && hat < LOOKS.hats && color < LOOKS.colors;
}

/**
 * Where a player's own frog is: x, y in the world; f = facing (0 down, 1 up, 2 left, 3 right);
 * m = 1 while moving; s = the last time the projector moved this frog itself (so old positions
 * from before a respawn are ignored). Returns a clean copy, or null.
 */
export function cleanMove(message) {
  if (!message || typeof message !== 'object') return null;
  const { x, y, f, m, s } = message;
  if (![x, y].every(Number.isFinite) || x < 0 || y < 0 || x > WORLD_SIZE.width || y > WORLD_SIZE.height) return null;
  if (!Number.isInteger(f) || f < 0 || f > 3 || (m !== 0 && m !== 1) || !Number.isInteger(s) || s < 0 || s > 1e6) return null;
  return { x: Math.round(x), y: Math.round(y), f, m, s };
}

/** Nicknames: printable, single-spaced, at most 16 characters (counted as code points). */
export function cleanName(value) {
  if (typeof value !== 'string') return '';
  const printable = value.normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ').trim();
  return Array.from(printable).slice(0, NAME_LENGTH).join('').trim();
}

/** Adds " 2", " 3"… when a name is already taken in the room. */
export function uniqueName(names, name) {
  const taken = new Set([...names].map(item => item.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; n < 1000; n++) {
    const suffix = ` ${n}`;
    const candidate = Array.from(name).slice(0, NAME_LENGTH - suffix.length).join('').trim() + suffix;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `Frog ${1000 + Math.floor(Math.random() * 9000)}`;
}

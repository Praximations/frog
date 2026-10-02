/**
 * Rules shared by the class server (relay.mjs) and the Firebase relay in the browser.
 * Plain JavaScript with no Node imports so both can use it.
 */
export const NAME_LENGTH = 16;
export const PLAYERS_PER_ROOM = 60;
export const REACTIONS = ['🐸', '❤️', '😱', '👏', '🔥', '🦗'];

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

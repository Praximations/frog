/**
 * How the projector and phones talk. Two options, same messages:
 * - 'server': a WebSocket to the class server (npm run host, or the Vite dev server).
 * - 'firebase': the Firebase Realtime Database, used when the game is on Firebase Hosting
 *   (there's no server there). Its code is only downloaded in that case.
 */
export type LinkKind = 'server' | 'firebase';
export interface Link { socket: WebSocket; kind: LinkKind }

/** The Firebase project in .firebaserc. Its default database lives at this address. */
export const FIREBASE_PROJECT = 'frog-94c78';
const DEFAULT_DATABASE_URL = `https://${FIREBASE_PROJECT}-default-rtdb.firebaseio.com`;

export const socketUrl = (): string => `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/session`;

let target: Promise<string | null> | undefined;

/** The Realtime Database to use, or null to use the class server. */
export function firebaseDatabase(): Promise<string | null> {
  target ??= (async () => {
    const forced = import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined;
    if (forced) return forced;
    if (!/\.(web\.app|firebaseapp\.com)$/.test(location.hostname)) return null;
    try {
      // Firebase Hosting describes its own project here, including the database address and region.
      const config = await (await fetch('/__/firebase/init.json', { cache: 'no-store' })).json();
      if (typeof config.databaseURL === 'string' && config.databaseURL) return config.databaseURL;
    } catch { /* fall back to the default address */ }
    return DEFAULT_DATABASE_URL;
  })();
  return target;
}

/** Opens a connection that behaves like a WebSocket to the class server. */
export async function openLink(role: 'host' | 'player'): Promise<Link> {
  const databaseURL = await firebaseDatabase();
  if (!databaseURL) return { socket: new WebSocket(socketUrl()), kind: 'server' };
  const { firebaseSocket } = await import('./firebaseRelay');
  return { socket: firebaseSocket(role, databaseURL), kind: 'firebase' };
}

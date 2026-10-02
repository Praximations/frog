import { LOOKS } from '../../server/shared.mjs';
import { COLORS } from '../systems/match.ts';

/**
 * Custom frogs: every player picks a skin, a hat and a colour (the ring under the frog and its
 * name tag) before joining. Sent as "skin.hat.colour", for example "2.5.13".
 */
export const SKINS = [
  { id: 'classic', name: 'Classic' },
  { id: 'golden', name: 'Golden' },
  { id: 'midnight', name: 'Midnight' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'mint', name: 'Mint' },
  { id: 'snow', name: 'Snow' },
] as const;

export const HATS = [
  { id: 'none', name: 'No hat' },
  { id: 'crown', name: 'Crown' },
  { id: 'cap', name: 'Cap' },
  { id: 'flower', name: 'Flower' },
  { id: 'bow', name: 'Bow' },
  { id: 'party', name: 'Party hat' },
  { id: 'tophat', name: 'Top hat' },
  { id: 'leaf', name: 'Leaf' },
] as const;

export type SkinId = (typeof SKINS)[number]['id'];
export type HatId = (typeof HATS)[number]['id'];
export interface Look { skin: number; hat: number; color: number }

export const DEFAULT_LOOK: Look = { skin: 0, hat: 0, color: 0 };

export function parseLook(value: unknown): Look {
  if (typeof value !== 'string' || !/^\d\.\d\.\d{1,2}$/.test(value)) return { ...DEFAULT_LOOK };
  const [skin, hat, color] = value.split('.').map(Number);
  return skin < LOOKS.skins && hat < LOOKS.hats && color < LOOKS.colors ? { skin, hat, color } : { ...DEFAULT_LOOK };
}

export const formatLook = (look: Look): string => `${look.skin}.${look.hat}.${look.color}`;

/** Texture key of a frog frame in a skin (the classic skin keeps the plain names). */
export const frogKey = (skin: number, facing: string, frame: number): string => skin ? `frog-${SKINS[skin].id}-${facing}-${frame}` : `frog-${facing}-${frame}`;
export const hatKey = (hat: number): string | null => hat ? `hat-${HATS[hat].id}` : null;
export const lookColor = (look: Look): { name: string; hex: string } => COLORS[look.color] ?? COLORS[0];

/** A random look for computer frogs and first-time players. */
export function randomLook(random = Math.random): Look {
  return { skin: Math.floor(random() * SKINS.length), hat: Math.floor(random() * HATS.length), color: Math.floor(random() * COLORS.length) };
}

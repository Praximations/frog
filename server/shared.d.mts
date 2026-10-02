/** Types for the rules shared by the class server and the Firebase relay. */
export declare const NAME_LENGTH: number;
export declare const PLAYERS_PER_ROOM: number;
export declare const REACTIONS: string[];
export declare const LOOKS: { skins: number; hats: number; colors: number };
export declare const WORLD_SIZE: { width: number; height: number };
export declare const WORLD_BYTES: number;
export interface Move { x: number; y: number; f: number; m: 0 | 1; s: number }
export declare function cleanName(value: unknown): string;
export declare function uniqueName(names: Iterable<string>, name: string): string;
export declare function validAnswer(message: unknown): boolean;
export declare function validLook(look: unknown): look is string;
export declare function cleanMove(message: unknown): Move | null;

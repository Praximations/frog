/** Types for the rules shared by the class server and the Firebase relay. */
export declare const NAME_LENGTH: number;
export declare const PLAYERS_PER_ROOM: number;
export declare const REACTIONS: string[];
export declare function cleanName(value: unknown): string;
export declare function uniqueName(names: Iterable<string>, name: string): string;

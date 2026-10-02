/** Types for the class relay used by vite.config.ts. */
export interface Relay { rooms: Map<string, unknown>; close(): Promise<void> }
export declare function attachRelay(http: object, options?: { path?: string }): Relay;
export declare function lanAddresses(port: number): string[];
export declare function cleanName(value: unknown): string;

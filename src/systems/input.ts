/** Controller input shared by the keyboard, the frog and phone pilots (no Phaser dependency). */
export interface MovementInput { x: number; y: number; hop: boolean; interact: boolean; pause?: boolean }
export const EMPTY_INPUT: MovementInput = { x: 0, y: 0, hop: false, interact: false };

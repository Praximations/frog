import Phaser from 'phaser';

/**
 * The pond map. The camera is zoomed out to 0.75, so the 1280×720 screen shows a 1707×960 world:
 * room for about 30 frogs. Every pixel-art pixel (drawn at 4×) lands on exactly 3 screen pixels.
 */
export const ZOOM = .75;
export const WORLD = { width: 1280 / ZOOM, height: 720 / ZOOM };
/** Where frogs can hop. The top strip stays clear for the scoreboard. */
export const BOUNDS = new Phaser.Geom.Rectangle(110, 250, WORLD.width - 220, WORLD.height - 320);
/** The dark cave in the top-right corner: hop in and something happens. */
export const CAVE = { x: BOUNDS.right - 30, y: BOUNDS.top + 40, radius: 46 };
/** Sun-warmed pools (fungus round): too hot for chytrid, so sick frogs get better there. */
export const POOLS = [{ x: BOUNDS.left + 170, y: BOUNDS.bottom - 90 }, { x: BOUNDS.right - 170, y: BOUNDS.bottom - 90 }];

export const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

/** A random spot in the pond, away from the cave and the given dangers. */
export function openSpot(avoid: { x: number; y: number; r: number }[] = []): { x: number; y: number } {
  for (let tries = 0; tries < 30; tries++) {
    const spot = { x: Phaser.Math.Between(BOUNDS.left + 40, BOUNDS.right - 40), y: Phaser.Math.Between(BOUNDS.top + 30, BOUNDS.bottom - 10) };
    if (distance(spot, CAVE) < 180) continue;
    if (avoid.every(item => distance(spot, item) > item.r)) return spot;
  }
  return { x: BOUNDS.centerX, y: BOUNDS.centerY };
}

/** Escapes text for safe insertion into HTML (player nicknames are user input). */
export function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[char]!));
}

export const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T => root.querySelector<T>(selector)!;

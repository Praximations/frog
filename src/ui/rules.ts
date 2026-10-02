import { GAME } from '../data/game';
import { artUrl } from '../world/pixels';
import { esc } from './html';

const ICONS: Record<string, string[]> = { stick: ['phone'], cricket: ['cricket'], hunter: ['hunter', 'trap'] };

/** The three "How to play" rules with pixel icons. Shared by the projector and phones (no Phaser). */
export function rulesHtml(short = false): string {
  const words = ['Move with your phone', 'Eat bugs', 'Don\'t get caught!'];
  return `<ol class="rules ${short ? 'is-short' : ''}">${GAME.rules.map((rule, i) => `<li><span class="rule-num">${i + 1}</span><span class="rule-icons">${ICONS[rule.icon].map(key => `<img class="pixel" src="${artUrl(key, 4)}" alt="">`).join('')}</span><b>${esc(short ? words[i] : rule.text)}</b></li>`).join('')}</ol>`;
}

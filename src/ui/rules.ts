import { GAME } from '../data/game';
import { artUrl } from '../world/pixels';
import { esc } from './html';

const ICONS: Record<string, string[]> = { stick: ['phone'], cricket: ['cricket', 'boost-speed'], cave: ['cave'] };
const SHORT = ['Move your frog', 'Eat bugs, grab boosts', 'Answer the quiz', 'Don\'t go in the cave!'];

function icon(name: string): string {
  if (name === 'quiz') return '<span class="rule-quiz"><i class="qa-0">▲</i><i class="qa-1">◆</i><i class="qa-2">●</i><i class="qa-3">■</i></span>';
  return (ICONS[name] ?? []).map(key => `<img class="pixel" src="${artUrl(key, key === 'cave' ? 2 : 4)}" alt="">`).join('');
}

/** The "How to play" rules with pixel icons. Shared by the host and players (no Phaser). */
export function rulesHtml(short = false): string {
  return `<ol class="rules ${short ? 'is-short' : ''}">${GAME.rules.map((rule, i) => `<li><span class="rule-num">${i + 1}</span><span class="rule-icons">${icon(rule.icon)}</span><b>${esc(short ? SHORT[i] : rule.text)}</b></li>`).join('')}</ol>`;
}

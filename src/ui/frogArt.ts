import { artUrl } from '../world/pixels';
import { frogKey, hatKey, lookColor, type Look } from '../data/looks';

/** A player's frog (skin, hat and colour ring) as HTML, for the home page and the podium. */
export function frogHtml(look: Look, className = '', facing = 'down'): string {
  const hat = hatKey(look.hat);
  return `<span class="frog-pic ${className}" style="--ring:${lookColor(look).hex}"><img class="pixel fp-frog" src="${artUrl(frogKey(look.skin, facing, 0), 6)}" alt="">${hat ? `<img class="pixel fp-hat" src="${artUrl(hat, 6)}" alt="">` : ''}</span>`;
}

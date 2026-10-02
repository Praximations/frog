import { JOURNAL, type JournalCard } from '../data/journal';
import { sourceById } from '../data/sources';
import { sound } from '../systems/Sound';
import { esc } from './html';
import { visualFor } from './visuals';

export interface CardDeck { next(): void; close(): void; readonly open: boolean }

function cardHtml(card: JournalCard, index: number, total: number): string {
  const sources = card.sources.map(id => sourceById(id)?.publisher).filter((name, i, all) => name && all.indexOf(name) === i);
  const wide = card.visual === 'chain';
  return `<article class="journal-card visual-${card.visual} ${wide ? 'is-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="card-title">
    <header class="jc-head">
      <div class="jc-number">${card.number}</div>
      <div class="jc-titles"><span class="jc-rubric">${esc(card.rubric)}</span><h2 id="card-title">${esc(card.title)}</h2><p class="jc-line">${esc(card.line)}</p></div>
    </header>
    <div class="jc-body">
      <div class="jc-visual">${visualFor(card)}</div>
      ${card.points.length ? `<ul class="jc-points">${card.points.map(point => `<li>${esc(point)}</li>`).join('')}</ul>` : ''}
    </div>
    <footer class="jc-foot">
      <p class="jc-sources">Sources: ${sources.map(esc).join(' · ')}</p>
      <div class="jc-actions">${total > 1 ? `<span class="jc-count">${index + 1} / ${total}</span>` : ''}<button class="jc-continue">${index + 1 < total ? 'Next ▸' : 'Done ▸'}</button></div>
    </footer>
  </article>`;
}

/** Shows one or more fact cards in a dimmed modal. Keyboard: Enter / Space / → next, ← back. */
export function showCards(slot: HTMLElement, cards: JournalCard[], options: { onDone?: () => void; closable?: boolean } = {}): CardDeck {
  let index = 0, open = true;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop card-backdrop';
  slot.replaceChildren(backdrop);
  const render = () => {
    backdrop.innerHTML = cardHtml(cards[index], index, cards.length);
    backdrop.querySelector<HTMLButtonElement>('.jc-continue')!.addEventListener('click', () => deck.next());
    backdrop.querySelector<HTMLButtonElement>('.jc-continue')!.focus({ preventScroll: true });
    sound.play('card');
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (['Enter', ' ', 'ArrowRight'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); deck.next(); }
    else if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); index--; render(); }
    else if (event.key === 'Escape' && options.closable) { event.preventDefault(); event.stopPropagation(); deck.close(); }
  };
  const deck: CardDeck = {
    get open() { return open; },
    next() {
      if (!open) return;
      if (index + 1 < cards.length) { index++; render(); return; }
      deck.close();
    },
    close() {
      if (!open) return;
      open = false;
      window.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      options.onDone?.();
    },
  };
  // Capture phase, after the key that opened the cards has finished.
  window.setTimeout(() => { if (open) window.addEventListener('keydown', onKey, true); }, 120);
  render();
  return deck;
}

/** All ten fact cards as a grid, to reopen any of them (e.g. for questions). */
export function showJournal(slot: HTMLElement, onClose: () => void): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop journal-backdrop';
  backdrop.innerHTML = `<section class="journal-book" role="dialog" aria-modal="true" aria-labelledby="journal-title">
    <header><h2 id="journal-title">Fact cards</h2><span class="journal-progress"></span><button class="text-button journal-close">Close ✕</button></header>
    <div class="journal-grid">${JOURNAL.map(card => `<button class="journal-entry" data-key="${card.key}"><span class="je-number">${card.number}</span><b>${esc(card.title)}</b><small>${esc(card.rubric)}</small></button>`).join('')}</div>
  </section>`;
  slot.replaceChildren(backdrop);
  let deck: CardDeck | undefined;
  const close = () => { window.removeEventListener('keydown', onKey, true); backdrop.remove(); onClose(); };
  const onKey = (event: KeyboardEvent) => {
    if (deck?.open) return;
    if (event.key === 'Escape' || event.key === 'j' || event.key === 'J') { event.preventDefault(); event.stopPropagation(); close(); }
  };
  window.setTimeout(() => window.addEventListener('keydown', onKey, true), 120);
  backdrop.querySelector('.journal-close')!.addEventListener('click', close);
  backdrop.querySelector<HTMLButtonElement>('.journal-close')!.focus({ preventScroll: true });
  for (const button of backdrop.querySelectorAll<HTMLButtonElement>('.journal-entry')) {
    button.addEventListener('click', () => {
      const card = JOURNAL.find(item => item.key === button.dataset.key)!;
      const holder = document.createElement('div'); holder.className = 'journal-holder'; backdrop.append(holder);
      deck = showCards(holder, [card], { closable: true, onDone: () => { holder.remove(); button.focus({ preventScroll: true }); } });
    });
  }
}

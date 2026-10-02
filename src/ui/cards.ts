import { JOURNAL, type JournalCard } from '../data/journal';
import { sourceById } from '../data/sources';
import { sound } from '../systems/Sound';
import { esc } from './html';
import { visualFor } from './visuals';

export interface CardDeck { next(): void; close(): void; readonly open: boolean }

function cardHtml(card: JournalCard, index: number, total: number, fresh: boolean, unlocked: number): string {
  const sources = card.sources.map(id => sourceById(id)?.publisher).filter((name, i, all) => name && all.indexOf(name) === i).slice(0, 4);
  return `<article class="journal-card visual-${card.visual}" role="dialog" aria-modal="true" aria-labelledby="card-title">
    <header class="jc-head">
      <div class="jc-number"><span>No.</span>${card.number}<small>/10</small></div>
      <div class="jc-titles"><div class="micro">${esc(card.kicker)}</div><h2 id="card-title">${esc(card.title)}</h2><p class="jc-lead">${esc(card.lead)}</p></div>
      <div class="jc-rubric" title="Rubric item">✓ ${esc(card.rubric)}</div>
    </header>
    <div class="jc-body">
      <div class="jc-visual">${visualFor(card)}</div>
      <dl class="jc-facts">${card.facts.map(fact => `<div><dt>${esc(fact.tag)}</dt><dd>${esc(fact.text)}</dd></div>`).join('')}</dl>
    </div>
    <footer class="jc-foot">
      <div class="jc-meta">${card.note ? `<p class="jc-note">${esc(card.note)}</p>` : ''}<p class="jc-sources">Sources: ${sources.map(esc).join(' · ')}</p></div>
      <div class="jc-actions">${total > 1 ? `<span class="jc-count">${index + 1} / ${total}</span>` : ''}<button class="jc-continue">${index + 1 < total ? 'Next card ▸' : 'Continue ▸'}</button></div>
    </footer>
    ${fresh ? `<div class="jc-stamp" aria-hidden="true">NEW ENTRY<small>Journal ${unlocked}/10</small></div>` : ''}
  </article>`;
}

/**
 * Shows one or more journal cards in a dimmed modal. Keyboard: Enter / Space / E / → continue.
 * `fresh` marks cards that were just unlocked so they get a stamp.
 */
export function showCards(slot: HTMLElement, cards: JournalCard[], options: { fresh?: Set<string>; unlockedCount?: () => number; onDone?: () => void; closable?: boolean } = {}): CardDeck {
  let index = 0, open = true;
  const before = (options.unlockedCount?.() ?? 0) - (options.fresh?.size ?? 0);
  const countAt = (i: number) => before + cards.slice(0, i + 1).filter(card => options.fresh?.has(card.key)).length;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop card-backdrop';
  slot.replaceChildren(backdrop);
  const render = () => {
    const card = cards[index];
    const fresh = !!options.fresh?.has(card.key);
    backdrop.innerHTML = cardHtml(card, index, cards.length, fresh, countAt(index));
    backdrop.querySelector<HTMLButtonElement>('.jc-continue')!.addEventListener('click', () => deck.next());
    backdrop.querySelector<HTMLButtonElement>('.jc-continue')!.focus({ preventScroll: true });
    sound.play(fresh ? 'stamp' : 'card');
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (['Enter', ' ', 'e', 'E', 'ArrowRight'].includes(event.key)) { event.preventDefault(); deck.next(); }
    else if (event.key === 'Escape' && options.closable) { event.preventDefault(); deck.close(); }
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
  // Capture phase, after the key that opened the card has finished.
  window.setTimeout(() => { if (open) window.addEventListener('keydown', onKey, true); }, 120);
  render();
  return deck;
}

/** The Field Journal grid: all ten rubric cards, locked ones greyed out. */
export function showJournal(slot: HTMLElement, unlocked: Set<string>, onClose: () => void, revealAll = false): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop journal-backdrop';
  backdrop.innerHTML = `<section class="journal-book" role="dialog" aria-modal="true" aria-labelledby="journal-title">
    <header><h2 id="journal-title">Field Journal</h2><span class="journal-progress">${unlocked.size}/10 entries</span><button class="text-button journal-close">Close ✕</button></header>
    <div class="journal-grid">${JOURNAL.map(card => {
      const open = revealAll || unlocked.has(card.key);
      return `<button class="journal-entry ${open ? '' : 'is-locked'}" data-key="${card.key}" ${open ? '' : 'disabled'}><span class="je-number">${card.number}</span><b>${open ? esc(card.title) : '???'}</b><small>${esc(card.rubric)}</small></button>`;
    }).join('')}</div>
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
  for (const button of backdrop.querySelectorAll<HTMLButtonElement>('.journal-entry:not(.is-locked)')) {
    button.addEventListener('click', () => {
      const card = JOURNAL.find(item => item.key === button.dataset.key)!;
      const holder = document.createElement('div'); holder.className = 'journal-holder'; backdrop.append(holder);
      deck = showCards(holder, [card], { closable: true, onDone: () => { holder.remove(); button.focus({ preventScroll: true }); } });
    });
  }
}

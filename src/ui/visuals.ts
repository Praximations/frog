import { artUrl } from '../world/pixels';
import { SIX_DEGREES, BONUS_CHAIN, type JournalCard } from '../data/journal';
import { esc } from './html';

/** The illustration column of each Field Journal card. */
export function visualFor(card: JournalCard): string {
  switch (card.visual) {
    case 'nameplate': return nameplate();
    case 'redlist': return redList();
    case 'map': return islandMap();
    case 'anatomy': return anatomy();
    case 'plate': return plate();
    case 'foodweb': return foodWeb();
    case 'threats': return crashChart();
    case 'importance': return importance();
    case 'timeline': return timeline();
    case 'chain': return chain();
  }
}

const img = (key: string, scale = 6, cls = '') => `<img class="pixel ${cls}" src="${artUrl(key, scale)}" alt="">`;

function nameplate(): string {
  return `<figure class="v-nameplate">
    ${img('portrait', 6, 'v-portrait')}
    <figcaption><span class="plaque-common">MOUNTAIN CHICKEN</span><span class="latin">Leptodactylus fallax</span></figcaption>
  </figure>`;
}

function redList(): string {
  const levels = [['LC', 'Least Concern'], ['NT', 'Near Threatened'], ['VU', 'Vulnerable'], ['EN', 'Endangered'], ['CR', 'Critically Endangered'], ['EW', 'Extinct in the Wild'], ['EX', 'Extinct']];
  return `<figure class="v-redlist" aria-label="IUCN Red List scale with Critically Endangered highlighted">
    <div class="redlist-title">IUCN RED LIST</div>
    <div class="redlist-scale">${levels.map(([code, name], i) => `<div class="rl rl-${code.toLowerCase()} ${code === 'CR' ? 'is-here' : ''}" style="--i:${i}"><b>${code}</b><span>${name}</span>${code === 'CR' ? `<i class="rl-pin">${img('icon-frog', 4)}</i>` : ''}</div>`).join('')}</div>
    <div class="redlist-groups"><span>Lower risk</span><span class="threatened">Threatened</span><span>Extinct</span></div>
  </figure>`;
}

function islandMap(): string {
  // Approximate positions: x = (lon + 63.2) / 2.6 × 300, y = (17.6 − lat) / 4 × 260.
  const island = (cx: number, cy: number, rx: number, ry: number, cls: string, rotate = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="${cls}" transform="rotate(${rotate} ${cx} ${cy})"/>`;
  const gone = (x: number, y: number, label: string, anchor = 'end', dx = -10) => `<text x="${x + dx}" y="${y + 4}" text-anchor="${anchor}" class="map-label gone-label">${label}</text><path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" class="gone-x"/>`;
  return `<figure class="v-map">
    <svg viewBox="0 0 300 262" role="img" aria-label="Map of the Eastern Caribbean showing Dominica and Montserrat, and five islands where the frog has disappeared">
      <defs><pattern id="sea" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#5b88b5"/><rect width="4" height="1" fill="#6f9ac2"/></pattern></defs>
      <rect width="300" height="262" fill="url(#sea)"/>
      <text x="20" y="200" class="sea-label">CARIBBEAN</text><text x="20" y="214" class="sea-label">SEA</text>
      <text x="226" y="112" class="sea-label">ATLANTIC</text><text x="226" y="126" class="sea-label">OCEAN</text>
      ${island(52, 20, 8, 3, 'land gone', -35)}${island(70, 29, 3, 3, 'land other')}
      ${island(162, 35, 8, 6, 'land gone')}
      ${island(175, 95, 6, 10, 'land gone', 10)}${island(205, 83, 11, 6, 'land gone', -10)}
      ${island(252, 192, 7, 12, 'land gone', -15)}${island(257, 240, 5, 9, 'land gone', 10)}
      ${island(117, 56, 4, 6, 'land home', 10)}${island(211, 142, 7, 13, 'land home', 5)}
      ${gone(52, 20, 'St Kitts', 'end', -12)}${gone(162, 35, 'Antigua', 'start', 12)}${gone(190, 89, 'Guadeloupe', 'start', 26)}${gone(252, 192, 'Martinique', 'end', -12)}${gone(257, 240, 'St Lucia', 'end', -10)}
      <circle cx="117" cy="56" r="13" class="home-ring"/><circle cx="211" cy="142" r="20" class="home-ring"/>
      <text x="96" y="58" text-anchor="end" class="map-label home-label">MONTSERRAT</text>
      <text x="187" y="146" text-anchor="end" class="map-label home-label">DOMINICA</text>
      <g transform="translate(270 70)"><path d="M0 -14 L5 0 L0 -3 L-5 0Z" fill="#fff0cd"/><text y="12" text-anchor="middle" class="map-label">N</text></g>
    </svg>
    <figcaption><span class="key home">●</span> Home today <span class="key gone">✕</span> Lost</figcaption>
  </figure>`;
}

function anatomy(): string {
  return `<figure class="v-anatomy">
    ${img('portrait', 6, 'v-portrait')}
    <div class="ruler"><span></span><b>up to 22 cm</b><span></span></div>
  </figure>`;
}

function plate(): string {
  return `<figure class="v-plate">
    <div class="plate-frame">${img('portrait', 6, 'v-portrait')}<img class="plate-photo" src="assets/images/mountain-chicken.jpg" alt="Photograph of a mountain chicken frog" onerror="this.remove()"></div>
    <figcaption><b>PLATE I</b> · <i>Leptodactylus fallax</i> Müller, 1926 · Mountain chicken</figcaption>
  </figure>`;
}

function foodWeb(): string {
  const node = (keys: string[], text: string, cls = '') => `<div class="fw-node ${cls}"><span class="fw-icons">${keys.map(key => img(key, 3)).join('')}</span><b>${text}</b></div>`;
  const arrow = '<span class="fw-arrow" aria-label="is eaten by">▲</span>';
  return `<figure class="v-foodweb" aria-label="Food chain: plants, insects, the mountain chicken and its predators">
    ${node(['pig', 'hunter'], 'Pigs, cats, dogs, people', 'fw-danger')}${arrow}
    ${node(['frog-down-0'], 'MOUNTAIN CHICKEN', 'fw-hero')}${arrow}
    ${node(['cricket', 'crab'], 'Crickets, crabs, snakes')}${arrow}
    ${node(['fern', 'flower'], 'Plants', 'fw-plant')}
  </figure>`;
}

function crashChart(): string {
  const bars = [['Before 2002', 100], ['2004', 15], ['2023', 1]] as const;
  const threats: [string, string, number][] = [['icon-fungus', 'Fungus', 2], ['hunter', 'Hunting', 2], ['volcano', 'Volcano', 1], ['icon-storm', 'Storms', 2], ['stump', 'Lost forest', 2], ['pig', 'Pigs', 2]];
  return `<figure class="v-crash" aria-label="Bar chart: Dominica's mountain chickens fell from 100% before 2002 to 15% by 2004 and under 1% by 2023">
    <div class="crash-title">Frogs left on Dominica</div>
    <div class="crash-bars">${bars.map(([year, value]) => `<div class="crash-col"><span class="crash-value">${value === 1 ? '&lt;1%' : `${value}%`}</span><div class="crash-bar" style="--h:${Math.max(2, value)}%"></div><b>${year}</b></div>`).join('')}</div>
    <div class="threat-icons">${threats.map(([key, label, scale]) => `<span>${img(key, scale)}<small>${label}</small></span>`).join('')}</div>
  </figure>`;
}

function importance(): string {
  return `<figure class="v-importance">
    <svg viewBox="0 0 120 130" class="arms" role="img" aria-label="Simplified coat of arms of Dominica with the crapaud in the second quarter">
      <path d="M10 10H110V70Q110 112 60 126Q10 112 10 70Z" fill="#fff0cd" stroke="#6b513b" stroke-width="5"/>
      <path d="M60 12V122M12 66H108" stroke="#6b513b" stroke-width="4"/>
      <rect x="14" y="14" width="42" height="49" fill="#e8d4a0"/><rect x="64" y="14" width="42" height="49" fill="#9ac0d8"/>
      <rect x="14" y="70" width="42" height="40" fill="#9ac0d8"/><path d="M64 70H106V80Q100 104 64 116Z" fill="#e8d4a0"/>
      <path d="M34 58V30" stroke="#6b4a2a" stroke-width="4"/><path d="M34 30l-12 6M34 30l12 6M34 30l-8-10M34 30l8-10" stroke="#3f8a3a" stroke-width="4"/>
      <ellipse cx="85" cy="44" rx="14" ry="9" fill="#7b5034"/><circle cx="78" cy="34" r="4" fill="#d39a45" stroke="#3b281c" stroke-width="2"/><circle cx="92" cy="34" r="4" fill="#d39a45" stroke="#3b281c" stroke-width="2"/><path d="M74 48H96" stroke="#ecd2a0" stroke-width="2"/>
      <path d="M20 92H50L44 100H26Z" fill="#6b4a2a"/><path d="M35 92V76L46 90Z" fill="#fff"/>
      <path d="M84 76v30" stroke="#5a7a3a" stroke-width="3"/><path d="M84 82q10 2 12 12M84 82q-10 2 -10 10" stroke="#3f8a3a" stroke-width="4" fill="none"/><path d="M80 94h8v8h-8z" fill="#e8c040"/>
    </svg>
    <figcaption>Dominica's coat of arms: the frog is top right</figcaption>
  </figure>`;
}

function timeline(): string {
  return `<figure class="v-timeline">
    <div class="pool-scene">${img('pool', 4)}${img('solar', 4)}${img('researcher-2', 4)}<span class="pool-temp">31 °C</span></div>
    <figcaption>Sun-warmed pools: too hot for the fungus</figcaption>
  </figure>`;
}

function chain(): string {
  return `<figure class="v-chain">
    <ol class="chain-nodes">${SIX_DEGREES.map((link, i) => `<li style="--i:${i}"><span class="chain-icon">${img(`icon-${link.icon}`, 4)}</span><b>${esc(link.title)}</b></li>`).join('')}</ol>
    <p class="bonus-chain"><b>Bonus chain:</b> ${BONUS_CHAIN.map(esc).join(' → ')}</p>
  </figure>`;
}

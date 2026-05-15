/**
 * Pokémon TCG data & Cardmarket EUR pricing via TCGdex API
 * @see https://tcgdex.dev/markets-prices
 */
const API_BASE = 'https://api.tcgdex.net/v2/en';

/** @param {string} base e.g. https://assets.tcgdex.net/en/swsh/swsh3/136 */
export function getCardImageUrl(base, quality = 'low', ext = 'webp') {
  if (!base) return null;
  if (base.includes('.')) return base;
  return `${base}/${quality}.${ext}`;
}

/** Cardmarket EUR — trend / 7d / 30d avg per TCGdex docs */
export function extractPrice(card) {
  const cm = card?.pricing?.cardmarket;
  if (!cm) return null;
  return cm.trend ?? cm.avg7 ?? cm.avg30 ?? cm.avg ?? cm.low ?? null;
}

export function formatCardNumber(card) {
  if (!card?.localId) return '';
  const official = card.set?.cardCount?.official;
  return official ? `${card.localId}/${official}` : String(card.localId);
}

/** Map TCGdex card → fields used by the app */
export function normalizeCard(card) {
  if (!card) return null;
  return {
    id: card.id,
    name: card.name || '',
    set: card.set?.name || '',
    number: formatCardNumber(card),
    rarity: card.rarity || '',
    image: getCardImageUrl(card.image, 'low'),
    imageLarge: getCardImageUrl(card.image, 'high'),
    price: extractPrice(card),
  };
}

export async function searchCards(query, signal) {
  const params = new URLSearchParams({
    name: query.trim(),
    'pagination:itemsPerPage': '12',
  });
  const res = await fetch(`${API_BASE}/cards?${params}`, { signal });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export async function fetchCard(apiId, signal) {
  const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(apiId)}`, { signal });
  if (!res.ok) throw new Error('Lookup failed');
  return res.json();
}

/**
 * Pokémon TCG data & Cardmarket EUR pricing via TCGdex API.
 * @see https://tcgdex.dev/
 */
const API_ROOT = 'https://api.tcgdex.net/v2';

/** App language code → TCGdex REST locale */
export const LANG_TO_LOCALE = {
  EN: 'en',
  JP: 'ja',
  CN: 'zh-tw',
  KR: 'ko',
  ES: 'es',
};

export function getLocaleForLang(lang) {
  return LANG_TO_LOCALE[lang] || 'en';
}

/** Non-EN: discover cards by English name; card numbers use each locale’s catalog. */
export function usesEnglishSearch(lang) {
  return lang !== 'EN';
}

export function getSearchLang(lang) {
  return usesEnglishSearch(lang) ? 'EN' : lang;
}

/** Catalog used for number lookups (physical card numbers match this locale). */
export function getNumberSearchLang(lang) {
  return lang;
}

function apiBase(lang) {
  return `${API_ROOT}/${getLocaleForLang(lang)}`;
}

const NUMBER_QUERY = /^\d+[a-zA-Z]?(\s*\/\s*\d+)?$/;

export function isNumberQuery(query) {
  return NUMBER_QUERY.test(String(query).trim());
}

/** @returns {{ localId: string, official?: string } | null} */
export function parseCardNumberInput(input) {
  const m = String(input).trim().match(/^(\d+[a-zA-Z]?)\s*(?:\/\s*(\d+))?$/);
  if (!m) return null;
  return { localId: m[1], official: m[2] };
}

/** @param {string} base e.g. https://assets.tcgdex.net/en/swsh/swsh3/136 */
export function getCardImageUrl(base, quality = 'low', ext = 'webp') {
  if (!base) return null;
  const trimmed = String(base).replace(/\/$/, '');
  if (/\.(webp|png|jpe?g|gif|avif)(\?.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/${quality}.${ext}`;
}

function cardmarketFrom(obj) {
  const cm = obj?.cardmarket;
  if (!cm || typeof cm !== 'object') return null;
  const trend = cm.trend ?? cm.avg7 ?? cm.avg30 ?? cm.avg ?? cm.low;
  return trend != null ? trend : null;
}

/** Cardmarket EUR — trend / 7d / 30d avg; also checks variant-level pricing */
export function extractPrice(card) {
  if (!card) return null;
  const top = cardmarketFrom(card.pricing);
  if (top != null) return top;
  for (const v of card.variants_detailed || []) {
    const p = cardmarketFrom(v.pricing);
    if (p != null) return p;
  }
  return null;
}

export function formatCardNumber(card) {
  if (!card?.localId) return '';
  const official = card.set?.cardCount?.official;
  return official ? `${card.localId}/${official}` : String(card.localId);
}

/** Set code + number for autocomplete rows when set object is missing. */
export function formatSearchResultMeta(card) {
  const number = formatCardNumber(card) || card.localId;
  const setLabel = card.set?.name || card.set?.id;
  const setFromId =
    !setLabel && card.id?.includes('-') ? card.id.replace(/-[^-]+$/, '') : '';
  const parts = [number, setLabel || setFromId].filter(Boolean);
  return parts.join(' · ') || 'Tap to load';
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

export async function searchCards(query, options = {}) {
  const { lang = 'EN', signal } = options;
  const searchLang = getSearchLang(lang);
  const params = new URLSearchParams({
    name: query.trim(),
    'pagination:itemsPerPage': '12',
  });
  const res = await fetch(`${apiBase(searchLang)}/cards?${params}`, { signal });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export async function searchCardsByNumber(numberInput, options = {}) {
  const parsed = parseCardNumberInput(numberInput);
  if (!parsed) return [];
  const { lang = 'EN', setQuery = '', signal } = options;
  const catalogLang = getNumberSearchLang(lang);
  const params = new URLSearchParams({
    localId: parsed.localId,
    'pagination:itemsPerPage': '20',
  });
  const set = setQuery.trim();
  if (set) params.set('set.name', set);
  const res = await fetch(`${apiBase(catalogLang)}/cards?${params}`, { signal });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

/** Run name or card-number search for the selected portfolio language. */
export async function searchCardsSmart(query, options = {}) {
  const q = query.trim();
  if (q.length < 2) return [];
  if (isNumberQuery(q)) {
    return searchCardsByNumber(q, options);
  }
  return searchCards(q, options);
}

/** Load card for portfolio language; English catalog pick → EN data (+ locale when same id exists). */
export async function fetchCardForPortfolio(apiId, portfolioLang, signal) {
  const searchLang = getSearchLang(portfolioLang);
  if (portfolioLang === searchLang) {
    return fetchCard(apiId, { lang: portfolioLang, signal });
  }

  const enCard = await fetchCard(apiId, { lang: 'EN', signal });
  try {
    const localized = await fetchCard(apiId, { lang: portfolioLang, signal });
    if (localized?.name || localized?.image) {
      return {
        ...enCard,
        ...localized,
        image: localized.image || enCard.image,
        pricing: localized.pricing?.cardmarket ? localized.pricing : enCard.pricing,
      };
    }
  } catch {
    /* EN catalog id often has no row in JP/CN/KR */
  }
  return enCard;
}

export async function fetchCard(apiId, options = {}) {
  const { lang = 'EN', signal } = options;
  const res = await fetch(
    `${apiBase(lang)}/cards/${encodeURIComponent(apiId)}`,
    { signal },
  );
  if (!res.ok) throw new Error('Lookup failed');
  return res.json();
}

/** Whether TCGdex typically returns Cardmarket EUR for this language */
export function langHasAutoPricing(lang) {
  return lang === 'EN' || lang === 'ES';
}

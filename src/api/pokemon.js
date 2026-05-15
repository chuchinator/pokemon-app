const API_BASE = 'https://pokemon-tcg-api.p.rapidapi.com';

function getHeaders() {
  const key = import.meta.env.VITE_RAPIDAPI_KEY;
  if (!key) throw new Error('Missing VITE_RAPIDAPI_KEY');
  return {
    'X-Rapidapi-Key': key,
    'X-Rapidapi-Host': 'pokemon-tcg-api.p.rapidapi.com',
  };
}

export function extractPrice(card) {
  if (!card?.prices?.cardmarket) return null;
  const p = card.prices.cardmarket;
  return p['7d_average'] || p['30d_average'] || p.lowest_near_mint || null;
}

export async function searchCards(query, signal) {
  const url = `${API_BASE}/cards?name=${encodeURIComponent(query)}&pageSize=12`;
  const res = await fetch(url, { signal, headers: getHeaders() });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchCard(apiId) {
  const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(apiId)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Lookup failed');
  const json = await res.json();
  return json.data;
}

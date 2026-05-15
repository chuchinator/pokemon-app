import { STORAGE_KEY } from '../constants';

export function loadCardsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((c) => c && typeof c === 'object' && c.id && c.name);
  } catch {
    return [];
  }
}

export function saveCardsToStorage(cards) {
  if (!Array.isArray(cards)) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  return true;
}

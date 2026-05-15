import { useCallback, useState } from 'react';
import { STORAGE_KEY } from '../constants';

function loadCards() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function useCards(toast) {
  const [cards, setCards] = useState(loadCards);

  const save = useCallback(
    (nextCards) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCards));
        setCards(nextCards);
        return true;
      } catch (e) {
        if (
          e.name === 'QuotaExceededError' ||
          (e.message || '').toLowerCase().includes('quota')
        ) {
          toast('Storage full — try removing some photos', 'error');
        }
        return false;
      }
    },
    [toast],
  );

  const updateCards = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(cards) : updater;
      if (save(next)) return next;
      return cards;
    },
    [cards, save],
  );

  return { cards, setCards: updateCards, save };
}

import { useCallback, useState } from 'react';
import { loadCardsFromStorage, saveCardsToStorage } from '../utils/storage';

export function useCards(toast) {
  const [cards, setCards] = useState(loadCardsFromStorage);

  const persist = useCallback(
    (nextCards) => {
      const safe = Array.isArray(nextCards) ? nextCards : [];
      try {
        saveCardsToStorage(safe);
        setCards(safe);
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
      setCards((prev) => {
        const prevSafe = Array.isArray(prev) ? prev : [];
        const next = typeof updater === 'function' ? updater(prevSafe) : updater;
        const safe = Array.isArray(next) ? next : [];
        try {
          saveCardsToStorage(safe);
        } catch (e) {
          if (
            e.name === 'QuotaExceededError' ||
            (e.message || '').toLowerCase().includes('quota')
          ) {
            toast('Storage full — try removing some photos', 'error');
          }
          return prevSafe;
        }
        return safe;
      });
    },
    [toast],
  );

  return { cards, setCards: updateCards, save: persist };
}

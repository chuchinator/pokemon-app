import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isSyncEnabled,
  loadCardsFromServer,
  saveCardsToServer,
} from '../api/sync';
import { loadCardsFromStorage, saveCardsToStorage } from '../utils/storage';

const SAVE_DEBOUNCE_MS = 600;

export function useCards(toast) {
  const [cards, setCards] = useState(loadCardsFromStorage);
  const [syncReady, setSyncReady] = useState(!isSyncEnabled());
  const saveTimer = useRef(null);
  const syncWarned = useRef(false);

  const persistLocal = useCallback((safe) => {
    try {
      saveCardsToStorage(safe);
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
  }, [toast]);

  const scheduleServerSave = useCallback(
    (safe) => {
      if (!isSyncEnabled()) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await saveCardsToServer(safe);
        } catch (e) {
          if (!syncWarned.current) {
            syncWarned.current = true;
            toast(e.message || 'Could not save to server', 'error');
          }
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [toast],
  );

  useEffect(() => {
    if (!isSyncEnabled()) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const remote = await loadCardsFromServer();
        if (cancelled) return;
        const safe = Array.isArray(remote) ? remote : [];
        persistLocal(safe);
        setCards(safe);
      } catch (e) {
        if (!cancelled) {
          toast(e.message || 'Could not load from server — using local copy', 'error');
        }
      } finally {
        if (!cancelled) setSyncReady(true);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(saveTimer.current);
    };
  }, [toast, persistLocal]);

  const persist = useCallback(
    (nextCards) => {
      const safe = Array.isArray(nextCards) ? nextCards : [];
      if (!persistLocal(safe)) return false;
      setCards(safe);
      scheduleServerSave(safe);
      return true;
    },
    [persistLocal, scheduleServerSave],
  );

  const updateCards = useCallback(
    (updater) => {
      setCards((prev) => {
        const prevSafe = Array.isArray(prev) ? prev : [];
        const next = typeof updater === 'function' ? updater(prevSafe) : updater;
        const safe = Array.isArray(next) ? next : [];
        if (!persistLocal(safe)) return prevSafe;
        scheduleServerSave(safe);
        return safe;
      });
    },
    [persistLocal, scheduleServerSave],
  );

  return { cards, setCards: updateCards, save: persist, syncReady };
}

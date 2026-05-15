import { useCallback, useEffect, useState } from 'react';
import { checkSyncConnection, isSyncEnabled } from '../api/sync';

const POLL_MS = 30_000;

export function useSyncStatus() {
  const [status, setStatus] = useState(() =>
    isSyncEnabled() ? 'checking' : 'disabled',
  );
  const [error, setError] = useState(null);
  const [lastOk, setLastOk] = useState(null);

  const check = useCallback(async (silent = false) => {
    if (!isSyncEnabled()) {
      setStatus('disabled');
      setError(null);
      return;
    }
    if (!silent) setStatus('checking');
    try {
      await checkSyncConnection();
      setStatus('online');
      setError(null);
      setLastOk(Date.now());
    } catch (e) {
      setStatus('offline');
      setError(e.message || 'Connection failed');
    }
  }, []);

  useEffect(() => {
    if (!isSyncEnabled()) return undefined;
    check(false);
    const id = setInterval(() => check(true), POLL_MS);
    return () => clearInterval(id);
  }, [check]);

  const retry = useCallback(() => check(false), [check]);

  return { status, error, lastOk, check: retry, enabled: isSyncEnabled() };
}

import { useCallback, useEffect, useState } from 'react';
import {
  fetchMe,
  getSessionToken,
  getStoredUser,
  hasSyncServer,
  login,
  logout as clearAuth,
  signup,
} from '../api/auth';

export function useAuth() {
  const [user, setUser] = useState(getStoredUser);
  const [ready, setReady] = useState(!hasSyncServer());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hasSyncServer()) return undefined;
    const token = getSessionToken();
    if (!token) {
      setReady(true);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          clearAuth();
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const doSignup = useCallback(async (email, password) => {
    setBusy(true);
    try {
      const { user: u } = await signup(email, password);
      setUser(u);
      return u;
    } finally {
      setBusy(false);
    }
  }, []);

  const doLogin = useCallback(async (email, password) => {
    setBusy(true);
    try {
      const { user: u } = await login(email, password);
      setUser(u);
      return u;
    } finally {
      setBusy(false);
    }
  }, []);

  const doLogout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  return {
    user,
    ready,
    busy,
    needsAuth: hasSyncServer(),
    isLoggedIn: Boolean(user),
    signup: doSignup,
    login: doLogin,
    logout: doLogout,
  };
}

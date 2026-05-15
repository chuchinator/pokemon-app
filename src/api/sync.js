import { getSessionToken, hasSyncServer } from './auth';

const SYNC_URL = (import.meta.env.VITE_SYNC_URL || '').replace(/\/$/, '');

/** Cloud server URL is set (login required for sync). */
export function isSyncEnabled() {
  return hasSyncServer() && Boolean(getSessionToken());
}

export function isSyncConfigured() {
  return hasSyncServer();
}

export function getSyncInfo() {
  if (!hasSyncServer()) return null;
  if (!SYNC_URL) return { label: 'your server', url: '' };
  try {
    return { label: new URL(SYNC_URL).host, url: SYNC_URL };
  } catch {
    return { label: SYNC_URL, url: SYNC_URL };
  }
}

function apiPath(path) {
  return `${SYNC_URL}${path}`;
}

function authHeaders() {
  const token = getSessionToken();
  if (!token) throw new Error('Not logged in');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function loadCardsFromServer() {
  const res = await fetch(apiPath('/api/cards'), {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Load failed (${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function checkSyncConnection() {
  const health = await fetch(apiPath('/api/health'), { method: 'GET' });
  if (!health.ok) throw new Error('Server not reachable');

  const res = await fetch(apiPath('/api/auth/me'), { headers: authHeaders() });
  if (res.status === 401) throw new Error('Session expired — sign in again');
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  return true;
}

export async function saveCardsToServer(cards) {
  const res = await fetch(apiPath('/api/cards'), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(cards),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Save failed (${res.status})`);
  }
}

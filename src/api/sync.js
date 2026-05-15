const SYNC_URL = (import.meta.env.VITE_SYNC_URL || '').replace(/\/$/, '');
const SYNC_TOKEN = import.meta.env.VITE_SYNC_TOKEN || '';

/** Enabled when VITE_SYNC_TOKEN is set. Empty VITE_SYNC_URL = same host (/api). */
export function isSyncEnabled() {
  return Boolean(SYNC_TOKEN);
}

/** Shown in menu when sync is baked into the GitHub Pages build. */
export function getSyncInfo() {
  if (!isSyncEnabled()) return null;
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
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SYNC_TOKEN}`,
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

/** Ping server + verify auth (for connection indicator). */
export async function checkSyncConnection() {
  const health = await fetch(apiPath('/api/health'), { method: 'GET' });
  if (!health.ok) throw new Error('Server not reachable');

  const res = await fetch(apiPath('/api/cards'), { headers: authHeaders() });
  if (res.status === 401) throw new Error('Invalid sync token');
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

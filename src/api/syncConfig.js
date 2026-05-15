let syncUrl = (import.meta.env.VITE_SYNC_URL || '').replace(/\/$/, '');
let ready = false;

/** Load sync URL from sync-config.json (cache-busted) so tunnel changes work without clearing browser cache. */
export async function initSyncConfig() {
  const base = import.meta.env.BASE_URL || '/';
  try {
    const res = await fetch(`${base}sync-config.json?${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.syncUrl) {
        syncUrl = String(data.syncUrl).replace(/\/$/, '');
      }
    }
  } catch {
    /* use build-time fallback */
  }
  ready = true;
  return syncUrl;
}

export function getSyncUrl() {
  return syncUrl;
}

export function isSyncConfigReady() {
  return ready;
}

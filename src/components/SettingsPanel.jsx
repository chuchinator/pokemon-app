import { useMemo, useRef } from 'react';
import { getSyncInfo, isSyncConfigured, isSyncEnabled } from '../api/sync';

const BASE_MENU_ITEMS = [
  {
    action: 'refresh',
    icon: '↻',
    title: 'Refresh prices',
    sub: 'Fetches latest from TCGdex (source updates ~every 24h)',
  },
  {
    action: 'copyOther',
    icon: '⎘',
    title: 'Copy non-EN cards',
    sub: 'Get a list to paste for manual lookup',
  },
  {
    action: 'export',
    icon: '↓',
    title: 'Export backup (JSON)',
    sub: 'Save your collection as a file',
  },
  {
    action: 'import',
    icon: '↑',
    title: 'Import backup',
    sub: 'Restore from a saved JSON file',
  },
  {
    action: 'storage',
    icon: '◫',
    title: 'Storage usage',
    sub: 'Check how much space is used',
  },
];

export default function SettingsPanel({
  onAction,
  syncStatus,
  syncError,
  userEmail,
  onLogout,
}) {
  const importRef = useRef(null);

  const menuItems = useMemo(() => {
    const items = [...BASE_MENU_ITEMS];
    const sync = getSyncInfo();
    if (onLogout && userEmail) {
      items.unshift({
        action: 'logout',
        icon: '⎋',
        title: 'Sign out',
        sub: userEmail,
      });
    }
    if (isSyncConfigured() && isSyncEnabled() && sync) {
      const statusSub =
        syncStatus === 'online'
          ? `Connected to ${sync.label}`
          : syncStatus === 'checking'
            ? 'Checking connection…'
            : syncError || `Offline — ${sync.label}`;
      items.unshift({
        action: 'syncInfo',
        icon: syncStatus === 'online' ? '☁' : syncStatus === 'checking' ? '◌' : '☁',
        title: 'Server connection',
        sub: statusSub,
      });
    }
    return items;
  }, [syncStatus, syncError, onLogout, userEmail]);

  const handleClick = (action) => {
    if (action === 'import') {
      importRef.current?.click();
      return;
    }
    onAction(action);
  };

  return (
    <div className="settings-panel">
      <div className="tab-page-header">
        <h1 className="tab-page-title">Settings</h1>
        <p className="tab-page-sub">Backup, sync, and portfolio tools</p>
      </div>
      <div className="settings-list">
        {menuItems.map((item) => (
          <button
            key={item.action}
            type="button"
            className="settings-item"
            onClick={() => handleClick(item.action)}
          >
            <span className="settings-item-icon">{item.icon}</span>
            <span className="settings-item-text">
              <span className="settings-item-title">{item.title}</span>
              <span className="settings-item-sub">{item.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <input
        ref={importRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAction('importFile', file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

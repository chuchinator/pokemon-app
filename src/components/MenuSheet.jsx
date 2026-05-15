import { useMemo, useRef } from 'react';
import { getSyncInfo, isSyncEnabled } from '../api/sync';
import { STORAGE_KEY } from '../constants';

const BASE_MENU_ITEMS = [
  {
    action: 'refresh',
    icon: '↻',
    title: 'Refresh English prices',
    sub: 'Refresh EN prices from TCGdex / Cardmarket',
  },
  {
    action: 'copyOther',
    icon: '⎘',
    title: 'Copy non-EN cards',
    sub: 'Get a list to paste to Claude for manual lookup',
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

export default function MenuSheet({ open, onClose, onAction, syncStatus, syncError }) {
  const importRef = useRef(null);

  const menuItems = useMemo(() => {
    const items = [...BASE_MENU_ITEMS];
    const sync = getSyncInfo();
    if (isSyncEnabled() && sync) {
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
  }, [syncStatus, syncError]);

  const handleClick = (action) => {
    if (action === 'import') {
      importRef.current?.click();
      return;
    }
    onAction(action);
    onClose();
  };

  return (
    <>
      <div
        className={`menu-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        role="presentation"
      />
      <div className={`menu-sheet ${open ? 'open' : ''}`}>
        <div className="sheet-handle" />
        <div className="sheet-title">Tools</div>
        {menuItems.map((item) => (
          <div
            key={item.action}
            className="menu-item"
            onClick={() => handleClick(item.action)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick(item.action)}
          >
            <div className="menu-item-icon">{item.icon}</div>
            <div className="menu-item-text">
              <div className="menu-item-title">{item.title}</div>
              <div className="menu-item-sub">{item.sub}</div>
            </div>
          </div>
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
    </>
  );
}

export function showStorageUsage(cards) {
  try {
    const used = (localStorage.getItem(STORAGE_KEY) || '').length;
    const kb = Math.round(used / 1024);
    const mb = (used / (1024 * 1024)).toFixed(2);
    const photoCount = cards.filter((c) => c.photo).length;
    const apiPhotoCount = cards.filter((c) => !c.photo && c.imageSmall).length;
    alert(
      `Storage used: ${mb} MB (${kb} KB)\n\nCards: ${cards.length}\nYour photos: ${photoCount}\nAPI images (don't count): ${apiPhotoCount}\n\nSafari limit ≈ 5 MB. Plenty of room for hundreds of cards at this size.`,
    );
  } catch {
    /* caller shows toast */
  }
}

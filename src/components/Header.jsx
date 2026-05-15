import SyncStatus from './SyncStatus';

export default function Header({ onMenuOpen, syncStatus, syncError, syncLastOk, onSyncRetry }) {
  return (
    <header>
      <div className="brand">
        <div className="wallet-avatar">⚡</div>
        <div className="brand-text">
          <span className="brand-name">PokéFolio</span>
          <span className="brand-sub">Card portfolio</span>
        </div>
      </div>
      <div className="header-actions">
        <SyncStatus
          status={syncStatus}
          error={syncError}
          lastOk={syncLastOk}
          onRetry={onSyncRetry}
        />
        <button type="button" className="header-btn" onClick={onMenuOpen} aria-label="Settings">
          ⚙
        </button>
      </div>
    </header>
  );
}

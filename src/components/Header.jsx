import SyncStatus from './SyncStatus';

export default function Header({
  syncStatus,
  syncError,
  syncLastOk,
  onSyncRetry,
  userEmail,
}) {
  return (
    <header>
      <div className="brand">
        <div className="wallet-avatar">⚡</div>
        <div className="brand-text">
          <span className="brand-name">PokéFolio</span>
          <span className="brand-sub">{userEmail || 'Card portfolio'}</span>
        </div>
      </div>
      <div className="header-actions">
        <SyncStatus
          status={syncStatus}
          error={syncError}
          lastOk={syncLastOk}
          onRetry={onSyncRetry}
        />
      </div>
    </header>
  );
}

import { getSyncInfo } from '../api/sync';

function formatLastOk(ts) {
  if (!ts) return '';
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

export default function SyncStatus({ status, error, lastOk, onRetry }) {
  const info = getSyncInfo();

  if (status === 'disabled') {
    return (
      <div
        className="sync-status sync-status--local"
        title="Cloud sync not configured in this build. Data stays on this device."
      >
        <span className="sync-status-label">Local</span>
      </div>
    );
  }

  const label =
    status === 'checking'
      ? 'Checking…'
      : status === 'online'
        ? 'Connected'
        : 'Offline';

  const title = [
    info?.label ? `Server: ${info.label}` : 'Home server sync',
    status === 'online' && lastOk ? `Last OK ${formatLastOk(lastOk)}` : null,
    error,
    'Tap to check again',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      className={`sync-status sync-status--${status}`}
      onClick={onRetry}
      title={title}
      aria-label={`Sync status: ${label}. ${title}`}
    >
      <span className="sync-status-label">{label}</span>
    </button>
  );
}

export function getSyncStatusDetail(status, error, lastOk) {
  const info = getSyncInfo();
  if (status === 'disabled') return 'Sync is not configured in this build.';
  const lines = [
    info?.url ? `Server: ${info.url}` : info?.label ? `Server: ${info.label}` : '',
    `Status: ${
      status === 'online'
        ? 'Connected'
        : status === 'checking'
          ? 'Checking…'
          : 'Offline'
    }`,
  ];
  if (lastOk && status === 'online') lines.push(`Last check: ${formatLastOk(lastOk)}`);
  if (error) lines.push(`Error: ${error}`);
  if (status === 'offline') {
    lines.push('', 'Start on your Mac: npm run sync:tunnel');
  }
  return lines.filter((l) => l !== '').join('\n');
}

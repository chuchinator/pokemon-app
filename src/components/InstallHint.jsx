import { HINT_DISMISSED_KEY } from '../constants';

export default function InstallHint({ visible, onDismiss }) {
  if (!visible) return null;

  return (
    <div className="install-hint show">
      <button type="button" className="install-close" onClick={onDismiss} aria-label="Close">
        ×
      </button>
      <b>Add to Home Screen:</b> Tap the share button in Safari, then &quot;Add to Home
      Screen&quot; for the full app experience.
    </div>
  );
}

export function shouldShowInstallHint() {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (!isIos || isStandalone) return false;
  try {
    return localStorage.getItem(HINT_DISMISSED_KEY) !== '1';
  } catch {
    return false;
  }
}

export function dismissInstallHint() {
  try {
    localStorage.setItem(HINT_DISMISSED_KEY, '1');
  } catch {
    /* ignore */
  }
}

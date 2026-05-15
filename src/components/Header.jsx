export default function Header({ onMenuOpen }) {
  return (
    <header>
      <div className="brand">
        <div className="wallet-avatar">⚡</div>
        <div className="brand-text">
          <span className="brand-name">PokéFolio</span>
          <span className="brand-sub">Card portfolio</span>
        </div>
      </div>
      <button type="button" className="header-btn" onClick={onMenuOpen} aria-label="Settings">
        ⚙
      </button>
    </header>
  );
}

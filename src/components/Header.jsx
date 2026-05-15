export default function Header({ onMenuOpen }) {
  return (
    <header>
      <div className="brand">
        <div className="pokeball" />
        <span>PokéFolio</span>
      </div>
      <button type="button" className="header-btn" onClick={onMenuOpen} aria-label="Menu">
        ⋯
      </button>
    </header>
  );
}

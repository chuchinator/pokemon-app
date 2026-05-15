import { LANGS, PRICE_API_NOTE } from '../constants';
import { computePortfolio } from './WalletHero';

export default function Filters({ cards, filterLang, onFilterChange }) {
  const { counts } = computePortfolio(cards);

  return (
    <>
      <div className="holdings-header">
        <h2 className="section-hdr">Holdings</h2>
        <span className="holdings-count">{counts.ALL} assets</span>
      </div>
      <div className="filters">
        {LANGS.map((lang) => (
          <button
            key={lang}
            type="button"
            className={`chip ${filterLang === lang ? 'active' : ''}`}
            onClick={() => onFilterChange(lang)}
          >
            {lang === 'ALL' ? 'All' : lang}
            <span className="chip-count">{counts[lang]}</span>
          </button>
        ))}
      </div>
      <p className="price-api-note">{PRICE_API_NOTE}</p>
    </>
  );
}

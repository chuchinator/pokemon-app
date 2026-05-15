import { fmt } from '../utils/format';

export function computePortfolio(cards) {
  const counts = { ALL: 0, EN: 0, JP: 0, CN: 0, KR: 0, ES: 0 };
  let totalValue = 0;
  let totalCost = 0;
  let totalCards = 0;

  for (const c of cards) {
    const q = c.qty || 1;
    counts.ALL += q;
    if (counts[c.lang] !== undefined) counts[c.lang] += q;
    totalValue += (c.currentValue || 0) * q;
    totalCost += (c.purchasePrice || 0) * q;
    totalCards += q;
  }

  const pnl = totalValue - totalCost;

  return { counts, totalValue, totalCost, totalCards, pnl };
}

export default function WalletHero({ cards }) {
  const { totalValue, totalCost, totalCards, pnl } = computePortfolio(cards);

  const pnlStatClass = pnl > 0 ? 'up' : pnl < 0 ? 'down' : '';

  return (
    <div className="wallet-hero">
      <div className="hero-label">Total balance</div>
      <div className="hero-balance">{fmt(totalValue)}</div>
      {totalCards > 0 && (
        <span className="hero-assets">
          {totalCards} asset{totalCards !== 1 ? 's' : ''}
        </span>
      )}
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-label">Cost basis</div>
          <div className="hero-stat-value">{fmt(totalCost)}</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-label">Unrealized P&amp;L</div>
          <div className={`hero-stat-value ${pnlStatClass}`}>
            {(pnl >= 0 ? '+' : '') + fmt(pnl)}
          </div>
        </div>
      </div>
    </div>
  );
}

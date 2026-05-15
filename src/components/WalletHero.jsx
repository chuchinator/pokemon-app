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
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

  return { counts, totalValue, totalCost, totalCards, pnl, pnlPct };
}

export default function WalletHero({ cards }) {
  const { totalValue, totalCost, totalCards, pnl, pnlPct } = computePortfolio(cards);

  let changeClass = 'flat';
  let changeText = '—';
  if (pnl > 0) {
    changeClass = 'up';
    changeText =
      '↑ +' +
      fmt(pnl) +
      (totalCost > 0 ? ` (${pnlPct.toFixed(1)}%)` : '');
  } else if (pnl < 0) {
    changeClass = 'down';
    changeText =
      '↓ ' + fmt(pnl) + (totalCost > 0 ? ` (${pnlPct.toFixed(1)}%)` : '');
  } else if (totalCards > 0) {
    changeText = 'No change';
  }

  const sub =
    totalCards +
    ' card' +
    (totalCards !== 1 ? 's' : '') +
    ' · ' +
    fmt(totalCost) +
    ' cost basis';

  return (
    <div className="wallet-hero">
      <div className="hero-label">Portfolio value</div>
      <div className="hero-balance">{fmt(totalValue)}</div>
      <div className={`hero-change ${changeClass}`}>{changeText}</div>
      <span className="hero-sub">{sub}</span>
    </div>
  );
}

import { extractPrice, fetchCardForPortfolio, getCardImageUrl } from '../api/pokemon';
import { fmt } from '../utils/format';

export default function CardItem({
  card,
  expanded,
  onToggle,
  onInc,
  onDec,
  onEdit,
  onDelete,
  onViewPhoto,
  onRefreshPrice,
  toast,
}) {
  const q = card.qty || 1;
  const val = (card.currentValue || 0) * q;
  const cost = (card.purchasePrice || 0) * q;
  const delta = val - cost;
  const deltaPct = cost > 0 ? (delta / cost) * 100 : 0;
  const meta = [card.set, card.number, card.condition].filter(Boolean).join(' · ');
  const isLive = Boolean(card.apiId);
  const imgSrc = card.photo || getCardImageUrl(card.imageSmall) || '';

  const handleRefresh = async (e) => {
    e.stopPropagation();
    toast('Fetching price…');
    try {
      const data = await fetchCardForPortfolio(card.apiId, card.lang);
      const price = extractPrice(data);
      if (price) {
        onRefreshPrice(card.id, price);
        toast(`Updated to ${fmt(price)} (TCGdex daily)`, 'success');
      } else {
        toast('No price available', 'error');
      }
    } catch {
      toast('Refresh failed', 'error');
    }
  };

  return (
    <div
      className={`card-item ${expanded ? 'expanded' : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
    >
      {imgSrc ? (
        <div
          className="card-thumb-wrap"
          onClick={(e) => {
            e.stopPropagation();
            onViewPhoto(card);
          }}
          role="presentation"
        >
          <img className="card-thumb" src={imgSrc} alt="" loading="lazy" />
        </div>
      ) : (
        <div className="card-thumb-wrap">
          <div className={`card-thumb-placeholder lang-${card.lang}`}>{card.lang}</div>
        </div>
      )}
      <div className="card-body">
        <div className="card-name">{card.name}</div>
        <div className="card-meta">
          {isLive && <span className="live-dot" />}
          {card.lang}
          {meta ? ` · ${meta}` : ''}
          {q > 1 ? ` · ×${q}` : ''}
        </div>
      </div>
      <div className="card-value-col">
        <div className="card-value">{fmt(val)}</div>
        <div className={`card-pnl ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
          {cost > 0 ? `${delta >= 0 ? '+' : ''}${deltaPct.toFixed(2)}%` : '—'}
        </div>
      </div>
      {expanded && (
        <div className="expanded-detail" onClick={(e) => e.stopPropagation()}>
          <div className="detail-row">
            <span className="detail-label">Quantity</span>
            <div className="qty-controls">
              <button type="button" className="qty-btn" onClick={onDec}>
                −
              </button>
              <span className="detail-value">{q}</span>
              <button type="button" className="qty-btn" onClick={onInc}>
                +
              </button>
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-label">Paid per card</span>
            <span className="detail-value">{fmt(card.purchasePrice || 0)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Current per card</span>
            <span className="detail-value">{fmt(card.currentValue || 0)}</span>
          </div>
          {card.lastPriceUpdate && (
            <div className="detail-row">
              <span className="detail-label">Last fetched</span>
              <span className="detail-value">
                {new Date(card.lastPriceUpdate).toLocaleDateString('es-ES')}
              </span>
            </div>
          )}
          {isLive && (
            <p className="price-api-note detail-price-note">
              Market data refreshes on TCGdex about every 24 hours.
            </p>
          )}
          <div className="detail-row">
            <span className="detail-label">Position P&amp;L</span>
            <span
              className={`detail-value ${delta >= 0 ? 'card-delta-up' : 'card-delta-down'}`}
            >
              {delta >= 0 ? '+' : ''}
              {fmt(delta)}
              {cost > 0 &&
                ` (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)`}
            </span>
          </div>
          <div className="detail-actions">
            {isLive && (
              <button type="button" className="action-btn primary" onClick={handleRefresh}>
                Refresh price
              </button>
            )}
            <button
              type="button"
              className="action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(card);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="action-btn danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

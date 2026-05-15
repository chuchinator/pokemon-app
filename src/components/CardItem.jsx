import { extractPrice, fetchCard, getCardImageUrl } from '../api/pokemon';
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
  const isLive = card.lang === 'EN' && card.apiId;
  const imgSrc =
    card.photo ||
    getCardImageUrl(card.imageLarge, 'high') ||
    getCardImageUrl(card.imageSmall, 'high') ||
    '';

  const handleRefresh = async (e) => {
    e.stopPropagation();
    toast('Fetching price…');
    try {
      const data = await fetchCard(card.apiId);
      const price = extractPrice(data);
      if (price) {
        onRefreshPrice(card.id, price);
        toast(`Updated to ${fmt(price)}`, 'success');
      } else {
        toast('No price available', 'error');
      }
    } catch {
      toast('Refresh failed', 'error');
    }
  };

  return (
    <article className={`card-tile ${expanded ? 'expanded' : ''}`}>
      <button
        type="button"
        className="card-art"
        onClick={(e) => {
          e.stopPropagation();
          if (imgSrc) onViewPhoto(card);
        }}
        aria-label={imgSrc ? `View ${card.name}` : undefined}
      >
        {imgSrc ? (
          <img className="card-art-img" src={imgSrc} alt={card.name} loading="lazy" />
        ) : (
          <div className={`card-art-placeholder lang-${card.lang}`}>
            <span>{card.lang}</span>
          </div>
        )}
        {q > 1 && <span className="card-qty-badge">×{q}</span>}
        {isLive && <span className="card-live-badge">LIVE</span>}
      </button>

      <button
        type="button"
        className="card-tile-info"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <h3 className="card-name">{card.name}</h3>
        <p className="card-meta">
          {card.lang}
          {meta ? ` · ${meta}` : ''}
        </p>
        <div className="card-tile-values">
          <span className="card-value">{fmt(val)}</span>
          <span className={`card-pnl ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
            {cost > 0 ? `${delta >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%` : '—'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="card-tile-detail" onClick={(e) => e.stopPropagation()}>
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
            <span className="detail-label">Paid / card</span>
            <span className="detail-value">{fmt(card.purchasePrice || 0)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Market / card</span>
            <span className="detail-value">{fmt(card.currentValue || 0)}</span>
          </div>
          {card.lastPriceUpdate && (
            <div className="detail-row">
              <span className="detail-label">Price updated</span>
              <span className="detail-value">
                {new Date(card.lastPriceUpdate).toLocaleDateString('es-ES')}
              </span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">Position P&amp;L</span>
            <span
              className={`detail-value ${delta >= 0 ? 'card-delta-up' : 'card-delta-down'}`}
            >
              {delta >= 0 ? '+' : ''}
              {fmt(delta)}
            </span>
          </div>
          <div className="detail-actions">
            {isLive && (
              <button type="button" className="action-btn primary" onClick={handleRefresh}>
                Refresh price
              </button>
            )}
            <button type="button" className="action-btn" onClick={() => onEdit(card)}>
              Edit
            </button>
            <button type="button" className="action-btn danger" onClick={() => onDelete(card.id)}>
              Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

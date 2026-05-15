import CardItem from './CardItem';

export default function CardList({
  cards,
  allCards,
  filterLang,
  expandedId,
  onToggle,
  onInc,
  onDec,
  onEdit,
  onDelete,
  onViewPhoto,
  onRefreshPrice,
  toast,
}) {
  const filtered =
    filterLang === 'ALL' ? cards : cards.filter((c) => c.lang === filterLang);

  if (filtered.length === 0) {
    return (
      <div className="cards">
        <div className="empty">
          <div className="empty-icon">🎴</div>
          <div className="empty-title">
            {allCards.length === 0 ? 'No cards yet' : 'No cards in this language'}
          </div>
          <div className="empty-sub">
            {allCards.length === 0
              ? 'Tap Add asset to get started'
              : 'Try a different filter'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cards">
      {filtered.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          expanded={expandedId === card.id}
          onToggle={() => onToggle(card.id)}
          onInc={() => onInc(card.id)}
          onDec={() => onDec(card.id)}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewPhoto={onViewPhoto}
          onRefreshPrice={onRefreshPrice}
          toast={toast}
        />
      ))}
    </div>
  );
}

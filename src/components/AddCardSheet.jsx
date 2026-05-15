import { useEffect, useRef, useState } from 'react';
import {
  fetchCard,
  formatCardNumber,
  getCardImageUrl,
  normalizeCard,
  searchCards,
} from '../api/pokemon';
import { CONDITIONS } from '../constants';
import { fmt } from '../utils/format';
import { resizeImage } from '../utils/image';

const LANG_OPTIONS = [
  { value: 'EN', label: 'EN', sub: 'Auto-price' },
  { value: 'JP', label: 'JP', sub: '' },
  { value: 'CN', label: 'CN', sub: '' },
  { value: 'KR', label: 'KR', sub: '' },
  { value: 'ES', label: 'ES', sub: '' },
];

const emptyForm = () => ({
  name: '',
  set: '',
  lang: 'EN',
  number: '',
  condition: 'NM',
  qty: '1',
  purchasePrice: '',
  currentValue: '',
  apiId: '',
  imageSmall: '',
  imageLarge: '',
});

export default function AddCardSheet({
  open,
  editingCard,
  onClose,
  onSave,
  onPhotoPreview,
  toast,
}) {
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [acState, setAcState] = useState({ show: false, loading: false, results: [], error: null });
  const suppressAcRef = useRef(false);
  const acAbortRef = useRef(null);
  const debounceRef = useRef(null);
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (editingCard) {
      setForm({
        name: editingCard.name,
        set: editingCard.set || '',
        lang: editingCard.lang,
        number: editingCard.number || '',
        condition: editingCard.condition || 'NM',
        qty: String(editingCard.qty || 1),
        purchasePrice: editingCard.purchasePrice ? String(editingCard.purchasePrice) : '',
        currentValue: editingCard.currentValue ? String(editingCard.currentValue) : '',
        apiId: editingCard.apiId || '',
        imageSmall: editingCard.imageSmall || '',
        imageLarge: editingCard.imageLarge || '',
      });
      setPhoto(editingCard.photo || null);
    } else {
      setForm(emptyForm());
      setPhoto(null);
    }
    setAcState({ show: false, loading: false, results: [], error: null });
    setTimeout(() => nameInputRef.current?.focus(), 300);
  }, [open, editingCard]);

  const previewSrc =
    photo ||
    getCardImageUrl(form.imageLarge, 'high') ||
    getCardImageUrl(form.imageSmall, 'high') ||
    null;
  const isLive = form.lang === 'EN' && form.apiId;
  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const hideAc = () => setAcState((s) => ({ ...s, show: false }));

  const handleNameChange = (value) => {
    setField('name', value);
    if (suppressAcRef.current) {
      suppressAcRef.current = false;
      return;
    }
    if (form.lang !== 'EN' || value.trim().length < 2) {
      hideAc();
      return;
    }
    clearTimeout(debounceRef.current);
    setAcState({ show: true, loading: true, results: [], error: null });
    debounceRef.current = setTimeout(async () => {
      if (acAbortRef.current) acAbortRef.current.abort();
      acAbortRef.current = new AbortController();
      try {
        const results = await searchCards(value.trim(), acAbortRef.current.signal);
        setAcState({ show: true, loading: false, results, error: null });
      } catch (e) {
        if (e.name === 'AbortError') return;
        setAcState({
          show: true,
          loading: false,
          results: [],
          error: 'Search failed. Check your connection.',
        });
      }
    }, 280);
  };

  const selectAcItem = async (apiId) => {
    hideAc();
    try {
      const raw = await fetchCard(apiId);
      const card = normalizeCard(raw);
      suppressAcRef.current = true;
      setForm((f) => ({
        ...f,
        name: card.name,
        set: card.set,
        number: card.number,
        currentValue:
          f.currentValue || (card.price != null ? card.price.toFixed(2) : ''),
        apiId: card.id,
        imageSmall: card.image || '',
        imageLarge: card.imageLarge || card.image || '',
      }));
      toast('Cardmarket price loaded (TCGdex)', 'success');
    } catch {
      toast('Could not load card details', 'error');
    }
  };

  const handlePhotoFile = async (file) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast('Image too large (15MB max)', 'error');
      return;
    }
    toast('Processing photo…');
    try {
      const dataUrl = await resizeImage(file);
      setPhoto(dataUrl);
      toast('Photo added', 'success');
    } catch {
      toast('Could not process image', 'error');
    }
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    if (!name) {
      nameInputRef.current?.focus();
      return;
    }
    const data = {
      name,
      set: form.set.trim(),
      lang: form.lang,
      number: form.number.trim(),
      condition: form.condition,
      qty: Math.max(1, parseInt(form.qty, 10) || 1),
      purchasePrice: parseFloat(form.purchasePrice) || 0,
      currentValue: parseFloat(form.currentValue) || 0,
      apiId: form.apiId || null,
      imageSmall: form.imageSmall || null,
      imageLarge: form.imageLarge || null,
      photo: photo || null,
    };
    if (data.apiId && data.currentValue) data.lastPriceUpdate = Date.now();
    onSave(data, editingCard?.id);
  };

  return (
    <>
      <div
        className={`sheet-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        role="presentation"
      />

      <div className={`sheet add-sheet ${open ? 'open' : ''}`}>
        <div className="add-sheet-header">
          <button type="button" className="add-close" onClick={onClose} aria-label="Close">
            ×
          </button>
          <div className="add-sheet-titles">
            <h2 className="add-sheet-title">{editingCard ? 'Edit asset' : 'Add asset'}</h2>
            <p className="add-sheet-sub">
              {editingCard ? 'Update this holding' : 'Add a card to your portfolio'}
            </p>
          </div>
          <div className="add-header-spacer" />
        </div>

        <div className="add-sheet-body">
          {/* Card preview */}
          <div className="add-card-hero">
            <button
              type="button"
              className={`add-card-frame ${previewSrc ? 'has-image' : 'empty'}`}
              onClick={() => previewSrc && onPhotoPreview?.(previewSrc)}
              aria-label="Preview card"
            >
              {previewSrc ? (
                <img src={previewSrc} alt={form.name || 'Card'} />
              ) : (
                <span className="add-card-placeholder">Search or add a photo</span>
              )}
              {isLive && <span className="add-live-badge">LIVE</span>}
            </button>
            <div className="add-media-btns">
              <button type="button" className="add-media-btn" onClick={() => cameraRef.current?.click()}>
                <span className="add-media-icon">📷</span>
                Camera
              </button>
              <button type="button" className="add-media-btn" onClick={() => libraryRef.current?.click()}>
                <span className="add-media-icon">🖼</span>
                Gallery
              </button>
              {previewSrc && (
                <button type="button" className="add-media-btn danger" onClick={() => setPhoto(null)}>
                  <span className="add-media-icon">✕</span>
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Language */}
          <div className="add-section">
            <div className="add-section-label">Network</div>
            <div className="add-lang-row">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`add-lang-pill ${form.lang === opt.value ? 'active' : ''}`}
                  onClick={() => {
                    setField('lang', opt.value);
                    hideAc();
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="add-hint">
              {form.lang === 'EN'
                ? 'English cards — search uses TCGdex Cardmarket EUR prices'
                : 'Enter details manually for this language'}
            </p>
          </div>

          {/* Search */}
          <div className="add-section">
            <div className="add-section-label">Asset</div>
            <div className="add-search-wrap">
              <span className="add-search-icon">⌕</span>
              <input
                ref={nameInputRef}
                id="f-name"
                type="text"
                className="add-search-input"
                placeholder={form.lang === 'EN' ? 'Search card… e.g. Charizard' : 'Card name'}
                autoComplete="off"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => setTimeout(hideAc, 200)}
              />
            </div>
            {acState.show && (
              <div className="add-ac-list">
                {acState.loading && (
                  <div className="ac-loading">
                    <span className="spinner" />
                    Searching…
                  </div>
                )}
                {!acState.loading && acState.error && (
                  <div className="ac-empty">{acState.error}</div>
                )}
                {!acState.loading &&
                  !acState.error &&
                  acState.results.length === 0 && (
                    <div className="ac-empty">No cards found</div>
                  )}
                {!acState.loading &&
                  acState.results.map((card) => {
                    const thumb = getCardImageUrl(card.image, 'high');
                    const number = formatCardNumber(card);
                    return (
                      <div
                        key={card.id}
                        className="ac-item"
                        onMouseDown={() => selectAcItem(card.id)}
                        role="button"
                        tabIndex={0}
                      >
                        {thumb ? (
                          <img className="ac-thumb" src={thumb} alt="" loading="lazy" />
                        ) : (
                          <div className="ac-thumb" />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div className="ac-name">{card.name}</div>
                          <div className="ac-meta">
                            {number || card.localId || 'Tap to load price'}
                          </div>
                        </div>
                        <div className="ac-price ac-price-hint">↵</div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Details card */}
          <div className="add-card-group">
            <div className="add-section-label">Details</div>
            <div className="add-field-stack">
              <div className="add-field">
                <label className="add-field-label" htmlFor="f-set">Set</label>
                <input
                  id="f-set"
                  type="text"
                  className="add-input"
                  placeholder="Surging Sparks"
                  value={form.set}
                  onChange={(e) => setField('set', e.target.value)}
                />
              </div>
              <div className="add-field-row">
                <div className="add-field">
                  <label className="add-field-label" htmlFor="f-number">Number</label>
                  <input
                    id="f-number"
                    type="text"
                    className="add-input"
                    placeholder="199/191"
                    value={form.number}
                    onChange={(e) => setField('number', e.target.value)}
                  />
                </div>
                <div className="add-field">
                  <label className="add-field-label" htmlFor="f-cond">Condition</label>
                  <select
                    id="f-cond"
                    className="add-input add-select"
                    value={form.condition}
                    onChange={(e) => setField('condition', e.target.value)}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Position / amounts */}
          <div className="add-card-group">
            <div className="add-section-label">Position</div>
            <div className="add-amount-grid">
              <div className="add-amount-cell">
                <label className="add-field-label" htmlFor="f-qty">Amount</label>
                <input
                  id="f-qty"
                  type="number"
                  inputMode="numeric"
                  className="add-input add-input-mono"
                  min={1}
                  value={form.qty}
                  onChange={(e) => setField('qty', e.target.value)}
                />
              </div>
              <div className="add-amount-cell">
                <label className="add-field-label" htmlFor="f-price">Cost (€)</label>
                <input
                  id="f-price"
                  type="number"
                  inputMode="decimal"
                  className="add-input add-input-mono"
                  placeholder="0.00"
                  min={0}
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(e) => setField('purchasePrice', e.target.value)}
                />
              </div>
              <div className="add-amount-cell add-amount-highlight">
                <label className="add-field-label" htmlFor="f-value">Value (€)</label>
                <input
                  id="f-value"
                  type="number"
                  inputMode="decimal"
                  className="add-input add-input-mono add-input-value"
                  placeholder="0.00"
                  min={0}
                  step="0.01"
                  value={form.currentValue}
                  onChange={(e) => setField('currentValue', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="add-sheet-footer">
          <button type="button" className="add-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="add-btn-primary" onClick={handleSubmit}>
            {editingCard ? 'Save' : 'Add asset'}
          </button>
        </div>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          handlePhotoFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          handlePhotoFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </>
  );
}

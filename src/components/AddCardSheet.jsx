import { useEffect, useRef, useState } from 'react';
import { extractPrice, fetchCard, searchCards } from '../api/pokemon';
import { CONDITIONS } from '../constants';
import { fmt } from '../utils/format';
import { resizeImage } from '../utils/image';

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

  const previewSrc = photo || form.imageSmall || null;
  const langHint =
    form.lang === 'EN'
      ? {
          text: 'Type a card name — autocomplete suggests cards with Cardmarket EUR prices.',
          color: 'rgba(74,222,128,0.6)',
        }
      : {
          text: 'Enter details manually. Take a photo of the card for your records.',
          color: 'rgba(232,232,240,0.4)',
        };

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
      const card = await fetchCard(apiId);
      const price = extractPrice(card);
      suppressAcRef.current = true;
      setForm((f) => ({
        ...f,
        name: card.name || '',
        set: card.episode?.name || '',
        number: card.card_code_number || '',
        currentValue:
          f.currentValue || (price != null ? price.toFixed(2) : ''),
        apiId: card.id,
        imageSmall: card.image || '',
        imageLarge: card.image || '',
      }));
      toast('Card found — price loaded', 'success');
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

  if (!open && !editingCard) {
    /* keep mounted for transitions — controlled by open class */
  }

  return (
    <>
      <div
        className={`sheet-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        role="presentation"
      />
      <div className={`sheet ${open ? 'open' : ''}`}>
        <div className="sheet-handle" />
        <div className="sheet-title">{editingCard ? 'Edit card' : 'Add card'}</div>

        <div className="photo-section">
          <div
            className="photo-preview"
            onClick={() => previewSrc && onPhotoPreview?.(previewSrc)}
            role="presentation"
          >
            {previewSrc ? (
              <img src={previewSrc} alt="" />
            ) : (
              <span className="photo-preview-icon">▢</span>
            )}
          </div>
          <div className="photo-actions">
            <button
              type="button"
              className="photo-btn"
              onClick={() => cameraRef.current?.click()}
            >
              📷 Take photo
            </button>
            <button
              type="button"
              className="photo-btn"
              onClick={() => libraryRef.current?.click()}
            >
              🖼 Choose from library
            </button>
            {photo && (
              <button
                type="button"
                className="photo-btn danger"
                onClick={() => setPhoto(null)}
              >
                ✕ Remove photo
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="f-lang">
            Language
          </label>
          <select
            id="f-lang"
            className="field-select"
            value={form.lang}
            onChange={(e) => {
              setField('lang', e.target.value);
              hideAc();
            }}
          >
            <option value="EN">English (auto-priced)</option>
            <option value="JP">Japanese</option>
            <option value="CN">Chinese</option>
            <option value="KR">Korean</option>
            <option value="ES">Spanish</option>
          </select>
          <div className="field-hint" style={{ color: langHint.color }}>
            {langHint.text}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="f-name">
            Card name
          </label>
          <input
            ref={nameInputRef}
            id="f-name"
            type="text"
            className="field-input"
            placeholder="Start typing... e.g. Charizard"
            autoComplete="off"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={() => setTimeout(hideAc, 200)}
          />
          {acState.show && (
            <div className="autocomplete show">
              {acState.loading && (
                <div className="ac-loading">
                  <span className="spinner" />
                  Searching Pokémon TCG…
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
                  const price = extractPrice(card);
                  const setName = card.episode?.name || '';
                  const number = card.card_code_number || '';
                  return (
                    <div
                      key={card.id}
                      className="ac-item"
                      onMouseDown={() => selectAcItem(card.id)}
                      role="button"
                      tabIndex={0}
                    >
                      {card.image ? (
                        <img className="ac-thumb" src={card.image} alt="" loading="lazy" />
                      ) : (
                        <div className="ac-thumb" />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div className="ac-name">{card.name}</div>
                        <div className="ac-meta">
                          {setName} {number} · {card.rarity || ''}
                        </div>
                      </div>
                      <div className="ac-price">{price ? fmt(price) : '—'}</div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="f-set">
            Set
          </label>
          <input
            id="f-set"
            type="text"
            className="field-input"
            placeholder="Surging Sparks"
            value={form.set}
            onChange={(e) => setField('set', e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="f-number">
              Number
            </label>
            <input
              id="f-number"
              type="text"
              className="field-input"
              placeholder="199/191"
              value={form.number}
              onChange={(e) => setField('number', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="f-cond">
              Condition
            </label>
            <select
              id="f-cond"
              className="field-select"
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

        <div className="field-row-3">
          <div className="field">
            <label className="field-label" htmlFor="f-qty">
              Qty
            </label>
            <input
              id="f-qty"
              type="number"
              inputMode="numeric"
              className="field-input"
              min={1}
              value={form.qty}
              onChange={(e) => setField('qty', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="f-price">
              Paid (€)
            </label>
            <input
              id="f-price"
              type="number"
              inputMode="decimal"
              className="field-input"
              placeholder="0.00"
              min={0}
              step="0.01"
              value={form.purchasePrice}
              onChange={(e) => setField('purchasePrice', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="f-value">
              Value (€)
            </label>
            <input
              id="f-value"
              type="number"
              inputMode="decimal"
              className="field-input"
              placeholder="0.00"
              min={0}
              step="0.01"
              value={form.currentValue}
              onChange={(e) => setField('currentValue', e.target.value)}
            />
          </div>
        </div>

        <button type="button" className="submit-btn" onClick={handleSubmit}>
          {editingCard ? 'Save changes' : 'Add to portfolio'}
        </button>
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

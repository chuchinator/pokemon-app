import { useCallback, useEffect, useState } from 'react';
import { extractPrice, fetchCard } from './api/pokemon';
import { initSyncConfig } from './api/syncConfig';
import AuthScreen from './components/AuthScreen';
import AddCardSheet from './components/AddCardSheet';
import CardList from './components/CardList';
import Filters from './components/Filters';
import Header from './components/Header';
import InstallHint, {
  dismissInstallHint,
  shouldShowInstallHint,
} from './components/InstallHint';
import Lightbox from './components/Lightbox';
import MenuSheet, { showStorageUsage } from './components/MenuSheet';
import Toast from './components/Toast';
import WalletHero from './components/WalletHero';
import { useAuth } from './hooks/useAuth';
import { useCards } from './hooks/useCards';
import { useSyncStatus } from './hooks/useSyncStatus';
import { useToast } from './hooks/useToast';
import { getSyncStatusDetail } from './components/SyncStatus';
import './App.css';

export default function App() {
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    initSyncConfig().then(() => setConfigReady(true));
  }, []);

  if (!configReady) {
    return <div className="auth-screen auth-screen--loading">Loading…</div>;
  }

  return <AppWithAuth />;
}

function AppWithAuth() {
  const auth = useAuth();

  if (!auth.ready) {
    return <div className="auth-screen auth-screen--loading">Loading…</div>;
  }

  if (auth.needsAuth && !auth.isLoggedIn) {
    return (
      <AuthScreen onLogin={auth.login} onSignup={auth.signup} busy={auth.busy} />
    );
  }

  return <PortfolioApp auth={auth} />;
}

function PortfolioApp({ auth }) {
  const { toast, showToast } = useToast();
  const { cards, setCards } = useCards(showToast);
  const { status: syncStatus, error: syncError, lastOk: syncLastOk, check: checkSync } =
    useSyncStatus();

  const [filterLang, setFilterLang] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [installHint, setInstallHint] = useState(shouldShowInstallHint);

  const openSheet = useCallback((card = null) => {
    setEditingCard(card);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingCard(null);
  }, []);

  const handleSaveCard = useCallback(
    (data, editingId) => {
      if (editingId) {
        setCards((prev) =>
          prev.map((c) => (c.id === editingId ? { ...c, ...data } : c)),
        );
      } else {
        const newCard = {
          ...data,
          id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          added: Date.now(),
        };
        setCards((prev) => [newCard, ...prev]);
      }
      closeSheet();
    },
    [setCards, closeSheet],
  );

  const handleToggle = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleInc = useCallback(
    (id) => {
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, qty: (c.qty || 1) + 1 } : c)),
      );
    },
    [setCards],
  );

  const handleDec = useCallback(
    (id) => {
      setCards((prev) => {
        const card = prev.find((c) => c.id === id);
        if (!card) return prev;
        const nextQty = (card.qty || 1) - 1;
        if (nextQty <= 0) {
          setExpandedId((e) => (e === id ? null : e));
          return prev.filter((c) => c.id !== id);
        }
        return prev.map((c) => (c.id === id ? { ...c, qty: nextQty } : c));
      });
    },
    [setCards],
  );

  const handleDelete = useCallback(
    (id) => {
      if (!confirm('Delete this card?')) return;
      setCards((prev) => prev.filter((c) => c.id !== id));
      setExpandedId((e) => (e === id ? null : e));
    },
    [setCards],
  );

  const handleRefreshPrice = useCallback(
    (id, price) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, currentValue: price, lastPriceUpdate: Date.now() }
            : c,
        ),
      );
    },
    [setCards],
  );

  const handleViewPhoto = useCallback((card) => {
    const src = card.imageLarge || card.photo || card.imageSmall;
    if (src) setLightboxSrc(src);
  }, []);

  const refreshAllPrices = useCallback(async () => {
    const enCards = cards.filter((c) => c.lang === 'EN' && c.apiId);
    if (enCards.length === 0) {
      showToast('No English cards with auto-pricing yet');
      return;
    }
    showToast(`Refreshing ${enCards.length} card${enCards.length > 1 ? 's' : ''}…`);
    let ok = 0;
    let fail = 0;
    const updates = [...cards];

    for (const c of enCards) {
      try {
        const data = await fetchCard(c.apiId);
        const price = extractPrice(data);
        const idx = updates.findIndex((x) => x.id === c.id);
        if (price && idx !== -1) {
          updates[idx] = {
            ...updates[idx],
            currentValue: price,
            lastPriceUpdate: Date.now(),
          };
          ok++;
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    setCards(updates);
    showToast(
      `Updated ${ok}${fail ? `, ${fail} failed` : ''}`,
      ok > 0 ? 'success' : 'error',
    );
  }, [cards, setCards, showToast]);

  const copyNonEnglish = useCallback(() => {
    const others = cards.filter((c) => c.lang !== 'EN');
    if (others.length === 0) {
      showToast('No non-English cards to copy');
      return;
    }
    const lines = [
      'Please look up current Cardmarket EUR prices for these Pokemon cards:',
      '',
    ];
    others.forEach((c, i) => {
      const meta = [c.set, c.number, c.condition].filter(Boolean).join(' · ');
      lines.push(
        `${i + 1}. [${c.lang}] ${c.name}${meta ? ' — ' + meta : ''} (qty ${c.qty || 1})`,
      );
    });
    const text = lines.join('\n');
    navigator.clipboard
      ?.writeText(text)
      .then(
        () => showToast(`Copied ${others.length} cards`, 'success'),
        () => showToast('Copy failed', 'error'),
      )
      .catch(() => showToast('Copy failed', 'error'));
  }, [cards, showToast]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(cards, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokefolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup downloaded', 'success');
  }, [cards, showToast]);

  const importJson = useCallback(
    (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) throw new Error('Not valid');
          if (
            cards.length > 0 &&
            !confirm(
              `Replace your current ${cards.length} cards with ${imported.length} from backup?`,
            )
          ) {
            return;
          }
          setCards(imported);
          showToast('Imported successfully', 'success');
        } catch {
          showToast('Invalid backup file', 'error');
        }
      };
      reader.readAsText(file);
    },
    [cards.length, setCards, showToast],
  );

  const handleMenuAction = useCallback(
    (action, file) => {
      if (action === 'refresh') refreshAllPrices();
      else if (action === 'copyOther') copyNonEnglish();
      else if (action === 'export') exportJson();
      else if (action === 'importFile' && file) importJson(file);
      else if (action === 'storage') showStorageUsage(cards);
      else if (action === 'syncInfo') {
        checkSync();
        alert(getSyncStatusDetail(syncStatus, syncError, syncLastOk));
      } else if (action === 'logout') {
        auth.logout();
        window.location.reload();
      }
    },
    [
      refreshAllPrices,
      copyNonEnglish,
      exportJson,
      importJson,
      cards,
      syncStatus,
      syncError,
      syncLastOk,
      checkSync,
      auth,
    ],
  );

  const handleFilterChange = useCallback((lang) => {
    setFilterLang(lang);
    setExpandedId(null);
  }, []);

  const dismissHint = useCallback(() => {
    dismissInstallHint();
    setInstallHint(false);
  }, []);

  return (
    <>
      <div className="app">
        <Header
          onMenuOpen={() => setMenuOpen(true)}
          syncStatus={syncStatus}
          syncError={syncError}
          syncLastOk={syncLastOk}
          onSyncRetry={checkSync}
          userEmail={auth.user?.email}
        />
        <InstallHint visible={installHint} onDismiss={dismissHint} />
        <WalletHero cards={cards} />
        <div className="holdings-panel">
          <Filters cards={cards} filterLang={filterLang} onFilterChange={handleFilterChange} />
          <CardList
            cards={cards}
            allCards={cards}
            filterLang={filterLang}
            expandedId={expandedId}
            onToggle={handleToggle}
            onInc={handleInc}
            onDec={handleDec}
            onEdit={openSheet}
            onDelete={handleDelete}
            onViewPhoto={handleViewPhoto}
            onRefreshPrice={handleRefreshPrice}
            toast={showToast}
          />
        </div>
      </div>

      <button
        type="button"
        className="fab"
        aria-label="Add card"
        onClick={() => openSheet(null)}
      >
        + Add asset
      </button>

      <Toast toast={toast} />

      <AddCardSheet
        open={sheetOpen}
        editingCard={editingCard}
        onClose={closeSheet}
        onSave={handleSaveCard}
        onPhotoPreview={setLightboxSrc}
        toast={showToast}
      />

      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onAction={handleMenuAction}
        syncStatus={syncStatus}
        syncError={syncError}
        userEmail={auth.user?.email}
        onLogout={auth.needsAuth ? auth.logout : null}
      />

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  );
}

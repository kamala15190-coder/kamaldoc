import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, LayoutDashboard, Archive, DollarSign, Landmark, Stethoscope, Upload as UploadIcon, User, Settings, HelpCircle, Rocket, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDocuments } from '../api';

const ACTION_ICON_SIZE = 18;

export default function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Global keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (open && e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
    else { setQuery(''); setDocs([]); setActive(0); }
  }, [open]);

  // Debounced document search
  useEffect(() => {
    if (!open || !query || query.length < 2) { setDocs([]); return undefined; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getDocuments({ search: query, limit: 6 });
        setDocs(res.documents || res || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 200);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, open]);

  const actions = useMemo(() => [
    { id: 'dash', icon: LayoutDashboard, label: t('nav.dashboard'), to: '/' },
    { id: 'upload', icon: UploadIcon, label: t('nav.upload'), to: '/upload' },
    { id: 'archiv', icon: Archive, label: t('nav.archiv'), to: '/archiv' },
    { id: 'ausgaben', icon: DollarSign, label: t('nav.ausgaben', 'Ausgaben'), to: '/ausgaben' },
    { id: 'behoerde', icon: Landmark, label: t('nav.behoerde'), to: '/behoerde' },
    { id: 'befund', icon: Stethoscope, label: t('nav.befund'), to: '/befund' },
    { id: 'email', icon: Mail, label: 'E-Mail', to: '/email' },
    { id: 'profil', icon: User, label: t('nav.profil'), to: '/profil' },
    { id: 'pricing', icon: Rocket, label: t('pricing.title', 'Abo'), to: '/pricing' },
    { id: 'support', icon: HelpCircle, label: t('nav.support'), to: '/support' },
    { id: 'settings', icon: Settings, label: t('settings.title', 'Einstellungen'), to: '/profil' },
  ], [t]);

  const filteredActions = useMemo(() => {
    if (!query) return actions;
    const q = query.toLowerCase();
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [actions, query]);

  const items = useMemo(() => [
    ...filteredActions.map((a) => ({ kind: 'action', ...a })),
    ...docs.map((d) => ({ kind: 'doc', id: `doc-${d.id}`, docId: d.id, label: d.absender || d.dateiname, sub: d.kategorie })),
  ], [filteredActions, docs]);

  useEffect(() => { setActive(0); }, [query, items.length]);

  const select = useCallback((item) => {
    if (!item) return;
    if (item.kind === 'action') navigate(item.to);
    else if (item.kind === 'doc') navigate(`/documents/${item.docId}`);
    setOpen(false);
  }, [navigate]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); select(items[active]); }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '10vh 16px 16px',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        animation: 'fadeIn 120ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          background: 'var(--surface-elevated, var(--bg-secondary))',
          border: '1px solid var(--border-glass-strong)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
          animation: 'pop-in 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border-glass)' }}>
          <Search style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('search.commandPalettePlaceholder', 'Suchen oder Befehl eingeben…')}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 'var(--fs-body, 15px)',
            }}
          />
          <kbd style={{
            fontSize: 11, padding: '3px 6px',
            borderRadius: 5, background: 'var(--bg-glass)',
            color: 'var(--text-muted)', border: '1px solid var(--border-glass)',
          }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: 'min(60vh, 420px)', overflowY: 'auto', padding: '6px 0' }}>
          {items.length === 0 && !loading && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--fs-body-sm, 13px)' }}>
              {query ? t('search.noResults', 'Keine Treffer') : t('search.emptyHint', 'Tippe oder wähle einen Befehl')}
            </div>
          )}
          {loading && (
            <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 'var(--fs-body-sm, 13px)' }}>
              {t('common.searching', 'Suche…')}
            </div>
          )}
          {items.map((item, idx) => {
            const ItemIcon = item.kind === 'action' ? item.icon : FileText;
            const isActive = idx === active;
            return (
              <button
                key={item.id}
                onMouseEnter={() => setActive(idx)}
                onClick={() => select(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '10px 14px',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  transition: 'background 120ms ease',
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: isActive ? 'var(--accent-solid)' : 'var(--bg-glass)',
                  color: isActive ? '#fff' : 'var(--accent-solid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <ItemIcon style={{ width: ACTION_ICON_SIZE, height: ACTION_ICON_SIZE }} />
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 'var(--fs-body, 15px)', fontWeight: 500 }}>{item.label}</span>
                  {item.sub && (
                    <span style={{ display: 'block', fontSize: 'var(--fs-caption, 11px)', color: 'var(--text-muted)' }}>{item.sub}</span>
                  )}
                </span>
                <span style={{ fontSize: 'var(--fs-caption, 11px)', color: 'var(--text-muted)' }}>
                  {item.kind === 'action' ? t('search.go', 'Gehe zu') : t('search.open', 'Öffnen')}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{
          padding: '8px 14px', borderTop: '1px solid var(--border-glass)',
          display: 'flex', justifyContent: 'space-between',
          fontSize: 'var(--fs-caption, 11px)', color: 'var(--text-muted)',
        }}>
          <span>↑↓ {t('search.navigate', 'navigieren')} · ↵ {t('search.open', 'Öffnen')}</span>
          <span><kbd>⌘</kbd> + <kbd>K</kbd></span>
        </div>
      </div>
    </div>
  );
}

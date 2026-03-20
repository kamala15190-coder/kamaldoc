import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDocuments } from '../api';
import { useTheme } from '../hooks/useTheme';

const KATEGORIE_ICON = {
  behoerde: { bg: 'rgba(99,89,255,0.12)', color: '#6359FF' },
  brief: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
  rechnung: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  lohnzettel: { bg: 'rgba(0,200,150,0.12)', color: '#00C896' },
  kontoauszug: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  vertrag: { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  sonstiges: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
};

const PAGE_SIZE = 30;

export default function DokumenteListe() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [kategorie, setKategorie] = useState('');

  const tc = {
    bg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    text: isDark ? 'rgba(255,255,255,0.85)' : '#111827',
    textMuted: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.35)',
    textHint: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.20)',
    shadow: isDark ? 'none' : '0 1px 8px rgba(0,0,0,0.05)',
    divider: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
  };

  const glassCard = {
    background: tc.bg, border: `0.5px solid ${tc.border}`, borderRadius: 18,
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: tc.shadow, overflow: 'hidden',
  };

  const fetchDocs = async (append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const params = {};
      if (search) { params.search = search; } else { params.limit = PAGE_SIZE; params.offset = append ? documents.length : 0; }
      if (kategorie) params.kategorie = kategorie;
      const data = await getDocuments(params);
      const docs = data.documents || data;
      const tot = data.total ?? docs.length;
      if (append) setDocuments(prev => [...prev, ...docs]); else setDocuments(docs);
      setTotal(tot);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  const hasMore = !search && documents.length < total;

  useEffect(() => { fetchDocs(); }, [kategorie]);
  useEffect(() => { const t = setTimeout(fetchDocs, 400); return () => clearTimeout(t); }, [search]);

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, animation: 'fadeUp 0.4s ease both' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: tc.bg, border: `0.5px solid ${tc.border}`, textDecoration: 'none' }}>
          <ArrowLeft style={{ width: 16, height: 16, color: tc.text }} />
        </Link>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: tc.text, margin: 0 }}>{t('dashboard.allDocuments', 'Alle Dokumente')}</h1>
          <p style={{ fontSize: 12, color: tc.textMuted, margin: '2px 0 0' }}>{total} {t('dashboard.documentsTotal', 'Dokumente')}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ marginBottom: 16, animation: 'fadeUp 0.4s ease both', animationDelay: '0.05s' }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: tc.textMuted }} />
          <input type="text" placeholder={t('dashboard.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} style={{
            width: '100%', padding: '11px 14px 11px 40px', fontSize: 13, borderRadius: 14,
            background: tc.bg, border: `0.5px solid ${tc.border}`, color: tc.text, outline: 'none',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: tc.shadow,
            transition: 'border-color 0.2s',
          }} onFocus={e => e.target.style.borderColor = '#6359FF'} onBlur={e => e.target.style.borderColor = tc.border} />
        </div>
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[{ value: '', labelKey: 'dashboard.allCategories' },
            ...['brief','rechnung','lohnzettel','kontoauszug','vertrag','behoerde','sonstiges'].map(k => ({ value: k, labelKey: `categories.${k}` }))
          ].map(opt => (
            <button key={opt.value} onClick={() => setKategorie(opt.value)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
              transition: 'all 0.15s ease', border: '0.5px solid',
              background: kategorie === opt.value ? 'rgba(99,89,255,0.12)' : 'transparent',
              color: kategorie === opt.value ? '#6359FF' : tc.textMuted,
              borderColor: kategorie === opt.value ? 'rgba(99,89,255,0.3)' : tc.border,
            }}>{t(opt.labelKey)}</button>
          ))}
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(99,89,255,0.15)', borderTopColor: '#6359FF', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText style={{ width: 48, height: 48, color: tc.textHint, margin: '0 auto 16px' }} />
          <p style={{ color: tc.textMuted, fontSize: 16, margin: 0 }}>{t('dashboard.noDocuments')}</p>
        </div>
      ) : (
        <>
          <div style={{ ...glassCard, animation: 'fadeUp 0.4s ease both', animationDelay: '0.1s' }}>
            {documents.map((doc, idx) => {
              const catIcon = KATEGORIE_ICON[doc.kategorie] || KATEGORIE_ICON.sonstiges;
              return (
                <Link key={doc.id} to={`/documents/${doc.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', textDecoration: 'none',
                  borderBottom: idx < documents.length - 1 ? `0.5px solid ${tc.divider}` : 'none',
                  animation: 'slideInLeft 0.3s ease both', animationDelay: `${Math.min(idx, 15) * 0.03}s`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: catIcon.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText style={{ width: 16, height: 16, color: catIcon.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: tc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{doc.absender || doc.dateiname}</span>
                      {doc.handlung_erforderlich && !doc.handlung_erledigt && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF5F6D', flexShrink: 0 }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {doc.kategorie && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: catIcon.bg, color: catIcon.color }}>{t(`categories.${doc.kategorie}`, doc.kategorie)}</span>}
                      {doc.datum && <span style={{ fontSize: 11, color: tc.textMuted }}>{new Date(doc.datum).toLocaleDateString('de-DE')}</span>}
                      {doc.betrag != null && doc.betrag > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: tc.text, marginLeft: 'auto' }}>{Number(doc.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>}
                    </div>
                  </div>
                  <ChevronRight style={{ width: 14, height: 14, color: tc.textHint, flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => fetchDocs(true)} disabled={loadingMore} style={{
                padding: '10px 24px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
                background: tc.bg, border: `0.5px solid ${tc.border}`, borderRadius: 12, color: tc.text, cursor: 'pointer',
                backdropFilter: 'blur(20px)',
              }}>
                {loadingMore && <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />}
                {loadingMore ? t('common.loading') : t('dashboard.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
